"""Core-owned audiovisual blocks must remain responsive without custom players."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreAudiovisualParity(unittest.TestCase):
    def test_scoped_block_styles_and_editor_parity(self):
        php = (ROOT / "functions.php").read_text(encoding="utf-8")
        self.assertIn("function slateframe_register_core_av_styles()", php)
        self.assertIn("foreach ( array( 'video', 'audio' ) as $block )", php)
        self.assertIn("'core/' . $block", php)
        self.assertIn("'handle' => 'slateframe-core-' . $block", php)
        self.assertIn("add_action( 'init', 'slateframe_register_core_av_styles', 20 );", php)
        for name in ("video", "audio"):
            self.assertIn(f"'assets/css/core-{name}.css'", php)
            css = (ROOT / f"assets/css/core-{name}.css").read_text(encoding="utf-8")
            self.assertIn(f".wp-block-{name}", css)
            self.assertIn("min-inline-size:0", css)
            self.assertIn("max-inline-size:100%", css)
            self.assertIn("overflow-wrap:anywhere", css)
            self.assertIn("text-align:start", css)
            self.assertLessEqual(len(css.encode("utf-8")), 350)
            for forbidden in ("!important", "javascript", "time2log_", "wpcode_"):
                self.assertNotIn(forbidden, css)
        self.assertNotIn("render_block_core/video", php)
        self.assertNotIn("render_block_core/audio", php)

    def test_real_wordpress_keyboard_and_visual_evidence(self):
        spec = (ROOT / "tests/browser/core-av-parity.spec.js").read_text(encoding="utf-8")
        for needle in ("wp('post', 'create'", "wp('post', 'delete'", "finally",
                       "320, 375, 390, 412, 768, 1440, 1920",
                       "'ltr', 'rtl'", "style.fontSize = '32px'",
                       "forcedColors: 'active'", "new AxeBuilder",
                       "await media.focus()", "core-av-390-rtl-200-forced-colors.png",
                       "core-video.css", "core-audio.css", "figcaption"):
            self.assertIn(needle, spec)


if __name__ == "__main__":
    unittest.main()
