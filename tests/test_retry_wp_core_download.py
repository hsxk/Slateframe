"""Keep WP-CLI installation failures visible while tolerating transient DNS outages."""
from pathlib import Path
import os
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'bin' / 'retry-wp-core-download.sh'


class WordPressDownloadRetryTests(unittest.TestCase):
    def run_case(self, errors, expected_status):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'errors').write_text('\n'.join(message.replace('\n', r'\n') for message in errors) + '\n')
            (root / 'wp').write_text('''#!/bin/sh
printf '%s\\n' "$*" >> "$TEST_LOG"
count=$(wc -l < "$TEST_LOG")
message=$(sed -n "${count}p" "$TEST_ERRORS")
if [ "$message" = 'SUCCESS' ]; then exit 0; fi
printf '%b\\n' "$message" >&2
exit 1
''')
            (root / 'sleep').write_text('#!/bin/sh\nprintf "%s\\n" "$*" >> "$TEST_SLEEP"\n')
            (root / 'wp').chmod(0o755)
            (root / 'sleep').chmod(0o755)
            env = os.environ.copy()
            env.update(PATH=str(root) + os.pathsep + env['PATH'], TEST_LOG=str(root / 'log'),
                       TEST_ERRORS=str(root / 'errors'), TEST_SLEEP=str(root / 'sleep-log'))
            result = subprocess.run(['bash', str(SCRIPT), '--path=/tmp/ci-wp', '--version=latest'],
                                    env=env, text=True, capture_output=True, timeout=15)
            calls = (root / 'log').read_text().splitlines()
            self.assertEqual(result.returncode, expected_status, result.stderr)
            self.assertTrue(all('core download --force --path=/tmp/ci-wp --version=latest' == c for c in calls))
            return calls, (root / 'sleep-log').read_text().splitlines() if (root / 'sleep-log').exists() else [], result

    def test_immediate_success_has_no_retry(self):
        calls, sleeps, _ = self.run_case(['SUCCESS'], 0)
        self.assertEqual((len(calls), sleeps), (1, []))

    def test_dns_failure_recovers_without_changing_wordpress_version(self):
        calls, sleeps, _ = self.run_case(['cURL error 28: Resolving timed out after 10000 milliseconds.', 'SUCCESS'], 0)
        self.assertEqual((len(calls), sleeps), (2, ['5']))

    def test_nontransient_checksum_failure_is_not_retried(self):
        calls, sleeps, _ = self.run_case(['Checksum mismatch'], 1)
        self.assertEqual((len(calls), sleeps), (1, []))

    def test_persistent_network_failure_stops_after_three(self):
        calls, sleeps, result = self.run_case(['cURL error 6: Could not resolve host'] * 3, 1)
        self.assertEqual((len(calls), sleeps), (3, ['5', '10']))
        self.assertIn('after three bounded attempts', result.stderr)

    def test_http_404_is_not_hidden(self):
        calls, sleeps, _ = self.run_case(['Error: 404 Not Found'], 1)
        self.assertEqual((len(calls), sleeps), (1, []))


    def test_mixed_transient_and_fatal_checksum_is_not_retried(self):
        calls, sleeps, result = self.run_case(['cURL error 28: timeout\\nChecksum mismatch'], 1)
        self.assertEqual((len(calls), sleeps), (1, []))
        self.assertIn('fatal validation/configuration', result.stderr)

    def test_mixed_transient_and_fatal_certificate_is_not_retried(self):
        calls, sleeps, _ = self.run_case(['cURL error 6: Could not resolve host\\nSSL certificate problem'], 1)
        self.assertEqual((len(calls), sleeps), (1, []))

    def test_unrecognized_curl_error_is_not_retried(self):
        calls, sleeps, _ = self.run_case(['cURL error 280: Unknown failure'], 1)
        self.assertEqual((len(calls), sleeps), (1, []))

    def test_two_transient_errors_then_success(self):
        calls, sleeps, _ = self.run_case(['cURL error 7: Connection timed out',
                                           'cURL error 28: Resolving timed out', 'SUCCESS'], 0)
        self.assertEqual((len(calls), sleeps), (3, ['5', '10']))

    def test_mixed_transient_and_invalid_version_is_not_retried(self):
        calls, sleeps, _ = self.run_case(['cURL error 28: timeout\\nInvalid version'], 1)
        self.assertEqual((len(calls), sleeps), (1, []))

    def test_no_arguments_returns_usage_without_network(self):
        with tempfile.TemporaryDirectory() as folder:
            result = subprocess.run(['bash', str(SCRIPT)], capture_output=True, text=True,
                                    env={**os.environ, 'TMPDIR': folder}, timeout=5)
            self.assertEqual(result.returncode, 2)
            self.assertIn('Usage:', result.stderr)


if __name__ == '__main__':
    unittest.main()
