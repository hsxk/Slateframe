"""Run real theme PHP with malformed Core synced references and widget IDs."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreIdBoundaries(unittest.TestCase):
    def test_php_runtime(self):
        fixture = ROOT / "tests/fixtures/core-id-boundaries.php.fixture"
        result = subprocess.run(
            ["php", str(fixture)], cwd=ROOT, capture_output=True,
            text=True, check=False, timeout=20,
        )
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn("Core ID boundaries: 46 assertions passed", result.stdout)


if __name__ == "__main__":
    unittest.main()
