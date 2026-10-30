"""Guard authored Core List counters without weakening existing budgets."""
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
class NativeStepsAuthoredNumbering(unittest.TestCase):
    def test_native_counter_fallback_and_budgets(self):
        reading=(ROOT/'assets/css/reading.css').read_text(encoding='utf-8')
        core=(ROOT/'assets/css/core-list.css').read_text(encoding='utf-8')
        modes=(ROOT/'assets/css/content-modes.css').read_text(encoding='utf-8')
        self.assertIn('ol.is-style-slateframe-steps:is([start],[reversed],[type]){list-style-type:revert;list-style-type:revert-layer;list-style-position:inside;&>li{padding-inline-start:0;&::before{content:none}}}',modes)
        self.assertNotIn('ol.is-style-slateframe-steps:is([start],[reversed],[type]){list-style-type:revert;list-style-type:revert-layer;list-style-position:inside;&>li{padding-inline-start:0;&::before{content:none}}}',reading)
        self.assertIn('is-style-slateframe-steps', (ROOT/'functions.php').read_text(encoding='utf-8'))
        self.assertIn('ol.is-style-slateframe-steps:is([start],[reversed],[type])>li::marker{font-size:.72rem}',core)
        self.assertIn('counter(slateframe-step,decimal-leading-zero)',modes)
        self.assertLessEqual(len(reading.encode()),7000)
        self.assertLessEqual(len(core.encode()),350)
        self.assertLessEqual(len(modes.encode()),7000)
    def test_wordpress_browser_editor_and_evidence_gate(self):
        spec=(ROOT/'tests/browser/knowledge-nested-lists.spec.js').read_text(encoding='utf-8')
        workflow=(ROOT/'.github/workflows/quality.yml').read_text(encoding='utf-8')
        for token in ("[320,375,390,412,768,1440,1920]","['ltr','rtl']","[16,32,64]",
                      'Accessibility.getFullAXTree','upper-alpha','lower-roman',
                      'new AxeBuilder',"forcedColors:'active'",'openAuthenticatedEditor',
                      'core/missing',"media:'print'"):
            with self.subTest(token=token): self.assertIn(token,spec)
        for name in ('knowledge-native-start-390-rtl-400.png',
                     'knowledge-native-start-1440-ltr.png',
                     'knowledge-native-start-390-rtl-400-forced-colors.png'):
            self.assertIn(name,spec)
            self.assertIn(name,workflow)
