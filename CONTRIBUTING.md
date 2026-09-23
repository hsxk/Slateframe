# Contributing to Slateframe

Thanks for helping improve Slateframe. The repository is public, and its code, documentation, pull requests, and commit history are all treated as part of the product.

## Before you start

Slateframe is a general-purpose WordPress theme. Contributions must not introduce site-specific branding, fixed personal content, hard-coded locale paths, private configuration, production data, or a required dependency on a multilingual or page-builder plugin.

Prefer WordPress core APIs, semantic HTML, logical CSS properties, lightweight JavaScript, portable blocks and patterns, and changes that remain useful when the theme is installed on an unrelated site.

For substantial behavior changes, opening an issue first is useful when the intended product direction is not already clear.

## Development workflow

1. Start from the current development line unless a maintainer asks for a different base.
2. Keep the change focused on one coherent problem or feature.
3. Add or update tests for behavior that can regress.
4. Update README, changelog, or developer documentation when the public behavior changes.
5. Run the checks relevant to the change.
6. Review the final diff for generated files, debug output, secrets, private data, and unrelated formatting.
7. Open a pull request that explains the reason for the change and the validation performed.

The public CI validates PHP and JavaScript syntax, theme metadata, namespace and locale guards, frontend asset budgets, theme-pattern metadata, a real WordPress installation/activation flow, runtime pattern registration, navigation fallback markup, responsive Chromium browser smoke coverage, and the distributable package.

For browser tests, install the development dependency and point Playwright at a local WordPress site running Slateframe:

```bash
npm install
PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:8080 npm run test:browser
```

The browser fixture in CI covers a 1440×900 desktop viewport and a 390×844 touch viewport. It checks core routes, mobile menu behavior, horizontal overflow, theme-asset failures, and wide/full block layout behavior.

## Commit quality

Use clear, scoped commit messages that explain the actual change. Conventional-Commit style is preferred when it fits:

- `feat(patterns): add editorial starter layouts`
- `fix(header): avoid duplicate brand links`
- `a11y(navigation): preserve keyboard access in mobile menu`
- `perf(images): avoid eager loading non-critical media`
- `docs(readme): document multilingual extension boundary`
- `test(runtime): cover clean WordPress activation`
- `ci: validate distributable package`

Avoid messages such as `update`, `misc changes`, `continue`, `fix stuff`, or automation timestamps.

A commit should be understandable, reviewable, and reversible on its own. Do not create empty commits or meaningless file churn for the sake of activity. Implementation, its tests, and directly required documentation can belong in the same commit when they form one logical change.

Do not rewrite already shared public history casually. Maintainers may choose to squash a reviewed development batch when it enters `main` so the stable history stays concise.

## Pull requests

A useful pull request explains:

- **What** changed.
- **Why** the change belongs in Slateframe.
- **Validation** that was actually run.
- **Scope and risks**, especially for template, accessibility, compatibility, or performance changes.
- **Screenshots** for meaningful visual changes on both desktop and mobile when applicable.

Do not claim tests, browsers, devices, or accessibility checks that were not actually run.

## Internationalization

All user-visible PHP strings must use the `slateframe` text domain. Do not hard-code locale lists, language URL prefixes, or plugin-specific multilingual behavior into core.

Layouts should tolerate Latin, CJK, RTL, and long translated strings. Prefer logical CSS properties where direction matters.

## Accessibility

Do not remove visible focus styles, semantic landmarks, labels, skip-link behavior, keyboard interaction, reduced-motion handling, or resilient no-JavaScript behavior without an equivalent or better replacement.

When a change affects interaction, test keyboard behavior rather than relying only on static markup checks.

## Public namespaces

Keep public identifiers within the Slateframe namespace:

- PHP functions/hooks: `slateframe_`
- CSS classes: `slateframe-`
- CSS custom properties: `--slateframe-`
- block styles/pattern slugs: `slateframe-*` / `slateframe/*`

## Security and privacy

Never commit credentials, database dumps, analytics identifiers, private configuration, personal media, user data, or production secrets.

Security vulnerabilities should follow [SECURITY.md](SECURITY.md) rather than being disclosed prematurely in a public issue.
