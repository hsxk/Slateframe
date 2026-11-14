# Slateframe release verification matrix

This is a maintainer-facing verification contract, not a claim that a release is ready. A green badge or an artifact name alone is not visual approval. Record the exact source SHA, workflow run IDs, job conclusions, screenshot file paths, viewport, and reviewer observations in the release PR.

## Source and packaging gates

- Verify the release candidate is an ancestor of the target `main` commit; do not validate a different SHA and transfer its result.
- Require successful Theme quality and Photography runtime workflows for the exact PR HEAD, including static budgets, WPCS, Theme Check, PHP/WordPress matrix, real-browser smoke, and distributable packaging.
- Compare the ZIP manifest with the distributable allowlist; reject symlinks, tests, private configuration, credentials, and machine-local paths.
- Rebuild the same source twice and compare normalized archive entries and content hashes. A ZIP created for a different commit is not evidence.
- Confirm `style.css` identifies Theme Name `Slateframe`, Text Domain `slateframe`, and a release-compatible WordPress/PHP baseline.
- Search packaged source for deprecated Time2Log-specific identifiers, personal domains, hardcoded user content, license gates, premium upsells, and third-party runtime dependencies. Record findings; do not assume absence from a successful build.

## Real WordPress + Chromium visual matrix

For each row, capture the actual screenshot file, run ID, source SHA, viewport and observed result. Capture at 320, 375, 390, 412, 768, 1440 and 1920 CSS px where applicable; verify 200% text zoom and RTL/CJK content, not only Latin placeholders.

| Surface | Compact | Default | Spacious | Mandatory observation |
| --- | --- | --- | --- | --- |
| Header, navigation and search | mobile + desktop | mobile + desktop | mobile + desktop | No clipping; 44px minimum targets; keyboard menu and search focus |
| Article and Knowledge | mobile + desktop | mobile + desktop | mobile + desktop | Reading measure, headings, tables, lists, code, captions, print |
| Photography and Core lightbox | mobile + desktop | mobile + desktop | mobile + desktop | Natural aspect ratio; focus return; viewport containment |
| Portfolio native Query Loop | mobile + desktop | mobile + desktop | mobile + desktop | Card/empty state, pagination, long titles, editor parity |
| Forms, comments and footer | mobile + desktop | mobile + desktop | mobile + desktop | Labels, error/focus states, wrapped controls, no horizontal overflow |

At minimum, explicitly inspect light/dark/system modes, LTR/RTL, Japanese/Chinese long strings, reduced motion, forced colors, 200% zoom, keyboard-only operation, and axe results. Record genuine browser failures as blockers; do not infer visual success from CSS source, screenshot existence, or skipped browser jobs.

## Merge and release decision

1. Keep a PR in Draft while any required job fails, is skipped due to failure, or lacks exact-SHA evidence.
2. Fix the actual cause, commit a new SHA, and revalidate that SHA. Never relax budgets, delete tests, or repeatedly rerun the same failing SHA to manufacture a pass.
3. Review the full PR diff and exact-SHA screenshots, confirm clean/mergeable, then squash merge.
4. Verify required `main` workflows for the resulting merge SHA. Fast-forward or safely recreate `automation/continuous-development` only after checking for independent commits.
5. Release only after packaging, documentation, screenshot PNG validity, accessibility, localization and license review are recorded. If evidence is missing, mark **not verified** rather than **PASS**.
