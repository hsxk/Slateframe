"""Run the 51 original PHP assertions without adding WordPress API stubs to production PHP lint scope."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SyncedPresentationPhpContract(unittest.TestCase):
    def test_original_51_php_assertions(self):
        source = (ROOT / "tests/fixtures/synced-presentation-source.txt").read_text(encoding="utf-8")
        self.assertTrue(source.startswith("<?php"))
        result = subprocess.run(
            ["php", "-r", source.removeprefix("<?php")],
            cwd=ROOT, capture_output=True, text=True, timeout=30, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("PASS 51 isolated PHP presentation assertions", result.stdout)
