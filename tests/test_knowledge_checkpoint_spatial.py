"""Guard Core-first Knowledge checkpoint spatial bounds and visual evidence."""
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]

class KnowledgeCheckpointSpatialContract(unittest.TestCase):
    def test_native_core_pattern_and_bounded_mobile_parity(self):
        css=(ROOT/'assets/css/content-modes.css').read_text()
        pattern=(ROOT/'patterns/knowledge-checklist.php').read_text()
        self.assertIn('Slug: slateframe/knowledge-checklist',pattern)
        for block in ('wp:group','wp:columns','wp:column','wp:list','wp:quote'):
            self.assertIn(block,pattern)
        self.assertNotIn('wp:html',pattern)
        self.assertIn('.slateframe-knowledge-checklist .slateframe-learning-checkpoint>.wp-block-column{min-inline-size:0;padding:min(1rem,20px);border-inline-start:var(--slateframe-rule);overflow-wrap:anywhere}',css)
        self.assertIn('.slateframe-learning-checkpoint:not(.is-not-stacked-on-mobile)>.wp-block-column{padding-inline:0;',css)
        self.assertNotIn('padding:clamp(1rem,2.5vw,1.5rem)',css)
        self.assertLessEqual(len(css.encode('utf-8')),7000)

    def test_real_wordpress_matrix_a11y_editor_and_screenshots(self):
        source=(ROOT/'tests/browser/knowledge-checkpoint-spatial.spec.js').read_text()
        for needle in ('WP_Block_Patterns_Registry','openAuthenticatedEditor',
                       '[320,375,390,412,768,1440,1920]',"['ltr','rtl']",
                       '[16,32,64]','setRootTextScale','Math.min(font,20)',
                       "forcedColors:'active'",'AxeBuilder',
                       'knowledge-checkpoint-390-rtl-400-forced-colors.png',
                       'knowledge-checkpoint-1440-ltr.png','core/missing'):
            with self.subTest(needle=needle):
                self.assertIn(needle,source)

if __name__=='__main__':
    unittest.main()
