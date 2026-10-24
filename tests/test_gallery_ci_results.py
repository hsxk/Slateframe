"""Negative tests for real Playwright Gallery execution evidence."""
import copy
import importlib.util
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('gallery_ci', Path(__file__).with_name('verify_gallery_ci_results.py'))
validator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(validator)


def passing_report():
    by_file = {}
    for filename, title, project in validator.REQUIRED:
        specs = by_file.setdefault(filename, {})
        specs.setdefault(title, []).append({'projectName': project, 'status': 'expected', 'results': [{'status': 'passed'}]})
    suites = [{'file': f'tests/browser/{filename}', 'specs': [{'title': title, 'tests': tests} for title, tests in specs.items()]} for filename, specs in by_file.items()]
    return {'suites': suites, 'stats': {'expected': len(validator.REQUIRED), 'skipped': 0, 'unexpected': 0, 'flaky': 0}, 'errors': []}


def first_test(report):
    return report['suites'][0]['specs'][0]['tests'][0]


class GalleryCiEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.report = passing_report()

    def reject(self, needle):
        with self.assertRaisesRegex(ValueError, needle):
            validator.verify(self.report)

    def test_good_report(self):
        validator.verify(self.report)

    def test_real_report_contract_includes_seven_viewports(self):
        for filename in list(validator.SUITES)[:3]:
            for width in validator.VIEWPORTS:
                self.assertIn((filename, validator.SUITES[filename], f'viewport-{width}'), validator.REQUIRED)

    def test_missing_suite(self):
        self.report['suites'] = []
        self.reject('Missing Playwright suites')

    def test_missing_required_test(self):
        self.report['suites'][0]['specs'][0]['tests'].pop()
        self.reject('Required Gallery test not executed')

    def test_duplicate_identity(self):
        tests = self.report['suites'][0]['specs'][0]['tests']
        tests.append(copy.deepcopy(tests[0]))
        self.reject('Duplicate Gallery test identity')

    def test_retry_rejected(self):
        first_test(self.report)['results'].append({'status': 'passed'})
        self.reject('retried Gallery test')

    def test_skipped_required_rejected(self):
        first_test(self.report).update(status='skipped', results=[{'status': 'skipped'}])
        self.report['stats'].update(expected=len(validator.REQUIRED)-1, skipped=1)
        self.reject('Required Gallery test skipped')

    def test_failed_result_rejected(self):
        first_test(self.report)['results'][0]['status'] = 'failed'
        self.reject('Inconsistent Gallery test outcome')

    def test_unexpected_test_status_rejected(self):
        first_test(self.report)['status'] = 'unexpected'
        self.reject('Unexpected, missing or retried')

    def test_top_level_error_rejected(self):
        self.report['errors'] = [{'message': 'fixture crashed'}]
        self.reject('top-level errors')

    def test_execution_error_rejected(self):
        first_test(self.report)['results'][0]['errors'] = [{'message': 'boom'}]
        self.reject('execution errors')

    def test_forged_summary_rejected(self):
        self.report['stats']['expected'] += 1
        self.reject('statistics disagree')

    def test_missing_summary_rejected(self):
        del self.report['stats']
        self.reject('Missing Playwright statistics')

    def test_flaky_summary_rejected(self):
        self.report['stats']['flaky'] = 1
        self.reject('flaky tests')

    def test_boolean_statistic_rejected(self):
        self.report['stats']['expected'] = True
        self.reject('Invalid Playwright statistic')

    def test_intentional_skip_allowed_outside_required(self):
        self.report['suites'][0]['specs'].append({'title': 'representative-only screenshot', 'tests': [
            {'projectName': 'viewport-375', 'status': 'skipped', 'results': [{'status': 'skipped'}]}]})
        self.report['stats']['skipped'] = 1
        validator.verify(self.report)


if __name__ == '__main__':
    unittest.main()
