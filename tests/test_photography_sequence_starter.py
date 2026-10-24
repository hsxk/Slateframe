"""Guard the real native Photography sequence starter, not empty gallery placeholders."""
import json
from pathlib import Path
import re
import unittest
ROOT = Path(__file__).resolve().parents[1]
class PhotographySequenceStarter(unittest.TestCase):
    def setUp(self):
        self.source=(ROOT/'patterns/photography-sequence.php').read_text(encoding='utf-8')
    def test_three_local_core_images_and_serialized_attributes(self):
        s=self.source
        self.assertEqual(s.count('<!-- wp:image {'),3)
        self.assertEqual(s.count('<!-- /wp:image -->'),3)
        self.assertNotRegex(s,r'<!-- wp:image[^\n]*?/-->')
        self.assertEqual(s.count('<img src='),3)
        self.assertEqual(s.count('alt=""'),3)
        blocks=[json.loads(raw) for raw in re.findall(r'<!-- wp:image (\{[^\n]+\}) -->',s)]
        self.assertEqual(len(blocks),3)
        self.assertTrue(all(b['alt']=='' and b['lightbox']['enabled'] is True and b['linkDestination']=='none' for b in blocks))
        for name in ('landscape','portrait','square'):
            self.assertEqual(s.count('/assets/images/pattern-placeholder-'+name+'.svg'),2)
            self.assertTrue((ROOT/('assets/images/pattern-placeholder-'+name+'.svg')).is_file())
    def test_core_first_localized_natural_ratio_and_boundary(self):
        s=self.source
        for token in ('"imageCrop":false','"columns":2','"linkTo":"none"','"align":"wide"',
                      'slateframe-pattern slateframe-photography-sequence',
                      'is-style-slateframe-photo-sequence',
                      "'Pattern introduction', 'slateframe'",'alternative text and captions',
                      'get_theme_file_uri('):
            self.assertIn(token,s)
        self.assertEqual(s.count('"lightbox":{"enabled":true}'),3)
        self.assertNotRegex(s,r'https?://')
        self.assertNotIn('time2log',s.lower())
        self.assertNotIn('wp_remote_',s)
    def test_real_wordpress_chromium_and_gutenberg_coverage(self):
        s=(ROOT/'tests/browser/core-photography-sequence.spec.js').read_text()
        for width in (320,375,390,412,768,1440,1920):
            self.assertIn(str(width),s)
        for token in ('WP_Block_Patterns_Registry',"'ltr','rtl'",'200%','400%',
                      "forcedColors:'active'",'AxeBuilder','naturalWidth','LongUnbrokenCaption',
                      'core-photography-sequence-390-rtl-200-forced-colors.png',
                      'openAuthenticatedEditor','blocks.parse(markup)','data.valid',
                      'data.stable','data.lightboxes',"wp('post','delete',id,'--force')"):
            self.assertIn(token,s)
        runtime=(ROOT/'bin/check-pattern-runtime.php').read_text()
        self.assertIn("'slateframe/photography-sequence'      => 3",runtime)
        self.assertIn("'slateframe-gallery-sequence is-style-slateframe-photo-sequence'",runtime)
        quality=(ROOT/'.github/workflows/quality.yml').read_text()
        self.assertIn('core-photography-sequence-390-rtl-200-forced-colors.png',quality)
if __name__=='__main__':
    unittest.main()
