"""Keep real Gutenberg Core serialization read-only and part of browser CI."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / 'tests/browser/core-block-roundtrip.spec.js'


class CoreBlockRoundtripContract(unittest.TestCase):
    def test_real_editor_and_native_apis(self):
        source = SPEC.read_text(encoding='utf-8')
        for needle in ('openAuthenticatedEditor(page, postId)', "'core/file'", "'core/verse'", "'core/code'",
                       'blocks.createBlock', 'blocks.serialize', 'blocks.parse', 'blocks.getSaveContent',
                       'parsedValid', '日本語', '中文', 'العربية', '[390, 1440]'):
            with self.subTest(needle=needle):
                self.assertIn(needle, source)

    def test_never_dispatches_or_saves_editor_changes(self):
        source = SPEC.read_text(encoding='utf-8')
        self.assertIn('expect(evidence.after).toEqual(evidence.before)', source)
        self.assertIn('isEditedPostDirty', source)
        for forbidden in ('data.dispatch(', 'savePost(', 'insertBlocks(', 'removeBlocks(', 'editPost('):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, source)

    def test_browser_workflow_discovers_authenticated_spec(self):
        workflow = (ROOT / '.github/workflows/quality.yml').read_text(encoding='utf-8')
        self.assertIn('support/editor-login', workflow)
        self.assertIn('authenticated_specs+=("$spec")', workflow)
        self.assertIn('npx playwright test "${authenticated_specs[@]}" --workers=1', workflow)


if __name__ == '__main__':
    unittest.main()
