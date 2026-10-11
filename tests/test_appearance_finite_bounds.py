"""Prevent non-finite Appearance settings from escaping bounded CSS tokens."""
import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PHP = r'''
define('ABSPATH', __DIR__);
$GLOBALS['mods'] = array();
function __($text, $domain) { return $text; }
function add_action() {}
function add_filter() {}
function get_theme_mod($name, $default = false) { return $GLOBALS['mods'][$name] ?? $default; }
require_once getcwd() . '/inc/customizer.php';
$cases = array(
  'nan' => NAN, 'positive_inf' => INF, 'negative_inf' => -INF,
  'huge_exponent' => '1e309', 'bad_string' => 'invalid',
  'below_min' => -100, 'above_max' => 1000, 'minimum' => 44,
  'decimal' => 48.5,
);
$output = array();
foreach ($cases as $name => $value) {
  $GLOBALS['mods']['slateframe_control_size'] = $value;
  $setting = (object) array('id' => 'slateframe_control_size', 'default' => 44);
  $output[$name] = array(
    slateframe_layout_value('slateframe_control_size'),
    slateframe_sanitize_bounded_number($value, $setting),
  );
}
$GLOBALS['mods'] = array(
  'slateframe_control_size' => NAN,
  'slateframe_spacing_scale' => INF,
  'slateframe_section_scale' => -INF,
  'slateframe_content_width' => '1e309',
);
$output['css'] = slateframe_customizer_spatial_css();
$output['format'] = array(
  slateframe_format_css_number(NAN),
  slateframe_format_css_number(INF),
  slateframe_format_css_number(-INF),
  slateframe_format_css_number(0),
  slateframe_format_css_number(0.95),
);
$output['unknown'] = slateframe_layout_value('nonexistent');
echo json_encode($output);
'''


class FiniteAppearanceBounds(unittest.TestCase):
    def test_nonfinite_and_out_of_range_values(self):
        result = subprocess.run(
            ["php", "-r", PHP], cwd=ROOT, capture_output=True, text=True, timeout=10
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        data = json.loads(result.stdout)
        for name in ["nan", "positive_inf", "negative_inf", "huge_exponent", "bad_string"]:
            self.assertEqual(data[name], [44, 44], name)
        self.assertEqual(data["below_min"], [44, 44])
        self.assertEqual(data["above_max"], [56, 56])
        self.assertEqual(data["minimum"], [44, 44])
        self.assertEqual(data["decimal"], [48.5, 48.5])
        self.assertEqual(data["css"], "")
        self.assertEqual(data["format"], ["0", "0", "0", "0", "0.95"])
        self.assertEqual(data["unknown"], 0)


if __name__ == "__main__":
    unittest.main()