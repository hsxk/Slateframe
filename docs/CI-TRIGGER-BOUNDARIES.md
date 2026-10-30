# CI trigger boundaries and exact-SHA merge gate

The fixed development branch is `automation/continuous-development`. Before this change, each push to an open pull request ran **both** the development-branch push workflows and the pull-request workflows. Both ran the same full Theme quality and Photography suites against the same source SHA, using separate concurrency refs. That doubled expensive WordPress/Chromium execution without adding independent coverage.

## Required execution

- **Pull request to `main`**: run full Theme quality (static tests, WPCS, Theme Check, WP install, WP/PHP matrix, Browser smoke and distribution) and Photography against the **exact PR HEAD SHA**.
- **Push to `main`**: run both workflows again against the **actual main merge SHA**. This is not interchangeable with the successful PR run.
- **Push to the long-lived development branch**: do not launch redundant suites while the same commit is already tested by its open PR. The PR is created or updated each round, and merging is blocked until all its exact-SHA jobs succeed.
- **Pull requests targeting the development branch**: Theme quality retains its existing target coverage. Photography's existing `main` target is unchanged.
- **Other branch pushes**: no new workflow triggers or skipped gates are introduced.

Both workflows keep the exact-HEAD checkout expression, `persist-credentials: false`, concurrency cancellation for superseded runs, and every existing job. The Python regression in `tests/test_workflow_trigger_boundaries.py` guards both triggers and the critical checks.

## Release acceptance

The branch may be merged only after all PR HEAD jobs succeed and the corresponding genuine WordPress/Chromium screenshot artifacts and distribution ZIP are inspected. After squash merge, wait for successful main push workflows, verify reproducible distribution bytes and resynchronize the long-lived branch. No change to runtime theme assets, CSS budgets, WordPress support, accessibility assertions, or release thresholds is authorized by this CI optimization.
