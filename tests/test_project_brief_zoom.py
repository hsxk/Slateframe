"""Contract for bounded native Project Brief/Case Study spacing and evidence."""
from pathlib import Path
import tempfile
import unittest

from test_content_feature_spacing import png
from verify_project_brief_zoom_evidence import CAPTURES, verify

ROOT = Path(__file__).resolve().parents[1]

class ProjectBriefZoomContract(unittest.TestCase):
    def test_core_presentation_and_unchanged_css_budget(self):
        css = (ROOT / 'assets/css/content-modes.css').read_text()
        self.assertIn('padding-block:min(clamp(1.25rem,3vw,2rem),64px)', css)
        self.assertIn('padding-block:min(clamp(1.25rem,3vw,2rem),40px)', css)
        self.assertIn('margin-block-start:min(clamp(1.75rem,4vw,3rem),64px)', css)
        self.assertIn('margin-block-start:min(clamp(1.75rem,4vw,3rem),40px)', css)
        self.assertNotIn('padding-block:clamp(1.25rem,3vw,2rem);border-block', css)
        self.assertNotIn('.slateframe-project-sections{margin-block-start:clamp(1.75rem,4vw,3rem)}', css)
        self.assertLessEqual(len(css.encode('utf-8')), 7000)
        for path, token in [('patterns/project-brief.php', 'is-style-slateframe-project-brief'),
                            ('patterns/project-case-study.php', 'slateframe-project-sections')]:
            source = (ROOT / path).read_text()
            self.assertIn(token, source)
            self.assertIn('wp:columns', source)
            self.assertNotIn('wp:html', source)

    def test_real_wordpress_matrix_editor_accessibility_and_evidence(self):
        source = (ROOT / 'tests/browser/project-brief-zoom.spec.js').read_text()
        workflow = (ROOT / '.github/workflows/quality.yml').read_text()
        for token in ('WP_Block_Patterns_Registry', 'openAuthenticatedEditor',
                      '[320,375,390,412,768,1440,1920]', "['ltr','rtl']",
                      '[16,32,64]', 'setRootTextScale', 'new AxeBuilder',
                      "forcedColors:'active'", 'core/missing', '44px floor',
                      '56px ceiling'):
            self.assertIn(token, source)
        for name in CAPTURES:
            self.assertIn(name, source)
        self.assertIn('python3 tests/verify_project_brief_zoom_evidence.py', workflow)

    def test_evidence_rejects_missing_wrong_size_truncated_and_symlink(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in CAPTURES:
                (root / name).write_bytes(png())
            verify(root)
            target = root / CAPTURES[0]
            target.unlink()
            with self.assertRaises(FileNotFoundError):
                verify(root)
            target.write_bytes(png(320))
            with self.assertRaisesRegex(ValueError, '390x900'):
                verify(root)
            target.write_bytes(png()[:-12])
            with self.assertRaisesRegex(ValueError, 'incomplete PNG'):
                verify(root)
            target.write_bytes(png())
            target.unlink()
            (root / 'real.png').write_bytes(png())
            target.symlink_to(root / 'real.png')
            with self.assertRaisesRegex(ValueError, 'linked screenshot'):
                verify(root)

if __name__ == '__main__':
    unittest.main()
