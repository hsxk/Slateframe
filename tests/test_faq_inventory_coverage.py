"""Exact-HEAD FAQ screenshot inventory coverage and no weaker legacy gates."""
import ast
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'tests/verify_browser_inventory.py'


class FaqInventoryCoverage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = SOURCE.read_text(encoding='utf-8')

    def test_nine_unique_mandatory_faq_images(self):
        tree = ast.parse(self.source)
        assignments = [node for node in tree.body if isinstance(node, ast.Assign)
                       and any(isinstance(t, ast.Name) and t.id == 'REQUIRED_FAQ' for t in node.targets)]
        self.assertEqual(len(assignments), 1)
        values = ast.literal_eval(assignments[0].value.args[0])
        self.assertEqual(len(values), 9)
        self.assertEqual(len(set(values)), 9)
        self.assertTrue(all(name.endswith('.png') for name in values))
        self.assertTrue(all('/' not in name for name in values))

    def test_inventory_enforces_names_not_total_count(self):
        self.assertIn('REQUIRED_APPEARANCE | REQUIRED_RESPONSIVE | REQUIRED_FAQ', self.source)
        self.assertIn('REQUIRED_SCREENSHOTS.difference(records)', self.source)
        self.assertIn('check_coverage(records)', self.source)

    def test_missing_faq_cannot_be_replaced_by_extra_images(self):
        tree = ast.parse(self.source)
        faq_assignment = next(node for node in tree.body if isinstance(node, ast.Assign)
                              and any(isinstance(t, ast.Name) and t.id == 'REQUIRED_FAQ' for t in node.targets))
        required = frozenset(ast.literal_eval(faq_assignment.value.args[0]))
        coverage = next(node for node in tree.body if isinstance(node, ast.FunctionDef)
                        and node.name == 'check_coverage')
        code = compile(ast.Module(body=[coverage], type_ignores=[]), str(SOURCE), 'exec')
        namespace = {'REQUIRED_SCREENSHOTS': required}
        exec(code, namespace)
        namespace['check_coverage']({name: {} for name in required})
        missing = next(iter(required))
        records = {name: {} for name in required if name != missing}
        records.update({f'extra-{index}.png': {} for index in range(50)})
        with self.assertRaisesRegex(ValueError, 'Missing required visual coverage'):
            namespace['check_coverage'](records)

    def test_legacy_screenshot_security_remains(self):
        for needle in ('reject_linked_ancestors(root)', 'validate_png(path, width)',
                       'read_bounded_regular_file(path, 20 * 1024 * 1024)',
                       "'SLATEFRAME_EVIDENCE_SHA'", 'check_legacy(root, sha, records)'):
            with self.subTest(needle=needle):
                self.assertIn(needle, self.source)


if __name__ == '__main__':
    unittest.main()
