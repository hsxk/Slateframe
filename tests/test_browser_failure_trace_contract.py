"""Keep the first failing Browser smoke trace available for diagnosis."""
from pathlib import Path
import unittest

WORKFLOW = Path(__file__).resolve().parents[1] / '.github/workflows/quality.yml'

class BrowserFailureTraceContract(unittest.TestCase):
    def test_failed_suite_preserves_trace_before_exit(self):
        content = WORKFLOW.read_text()
        self.assertIn("trap 'status=$?;", content)
        self.assertIn('cp -a test-results test-artifacts/browser-failure/responsive', content)
        self.assertIn('npx playwright test "${readonly_specs[@]}"', content)
        self.assertLess(content.index("trap 'status=$?;"), content.index('npx playwright test "${readonly_specs[@]}"'))

    def test_artifact_upload_includes_preserved_trace(self):
        content = WORKFLOW.read_text()
        self.assertIn('test-artifacts/browser-failure/', content)

    def test_no_coverage_reduction(self):
        content = WORKFLOW.read_text()
        self.assertIn('npx playwright test "${stateful_specs[@]}" --workers=1', content)
        self.assertIn('npx playwright test "${authenticated_specs[@]}" --workers=1', content)

if __name__ == '__main__':
    unittest.main()
