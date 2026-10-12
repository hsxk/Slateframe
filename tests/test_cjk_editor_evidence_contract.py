"""Real-editor screenshot evidence must not be obscured by Gutenberg onboarding."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CjkEditorEvidenceContract(unittest.TestCase):
    def test_modal_is_dismissed_before_screenshot(self):
        script = (ROOT / 'tests/browser/cjk-heading-editor.spec.js').read_text(encoding='utf-8')
        for needle in ('Welcome to the editor', 'closeButton.click()', 'toBeHidden()',
                       'scrollIntoViewIfNeeded()', 'fixture.screenshot('):
            self.assertIn(needle, script)
        self.assertLess(script.index('closeButton.click()'), script.index('fixture.screenshot('))
        self.assertLess(script.rindex('toBeHidden()'), script.index('fixture.screenshot('))

    def test_inherited_cjk_and_latin_override(self):
        script = (ROOT / 'tests/browser/cjk-heading-editor.spec.js').read_text(encoding='utf-8')
        for needle in ('<div lang="ja">', 'inheritedJapanese', 'lang="zh-Hant"',
                       'lang="ko-KR"', 'English override', 'toHaveCount(3)',
                       'toHaveCount(2)', 'forcedColors', 'rtl', '200%'):
            self.assertIn(needle, script)
        # Explicit English descendants must not be counted as inherited Japanese.
        self.assertEqual(script.count('> .wp-block-post-title:not([lang])'), 2)


if __name__ == '__main__':
    unittest.main()
