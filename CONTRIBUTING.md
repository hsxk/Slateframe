# Contributing to Slateframe

Thanks for helping improve Slateframe. Code, documentation, tests, issues, pull requests, and commit history are all treated as part of the public product.

## Project boundaries

Slateframe is a general-purpose WordPress theme. Contributions must not introduce:

- site-specific branding or personal copy;
- fixed projects, courses, authors, galleries, or production content;
- hard-coded locale lists or language URL prefixes;
- private configuration, credentials, analytics IDs, database dumps, or user data;
- a required dependency on a multilingual plugin or page builder;
- SEO/analytics/cache/business features that should remain plugin or service responsibilities.

Prefer WordPress core APIs, semantic HTML, logical CSS properties, lightweight progressive enhancement, and portable blocks/patterns.

## Development workflow

1. Start from the latest `main`, then work against the active development line unless a maintainer requests otherwise.
2. Keep each change focused on a coherent feature, bug, test, or documentation concern.
3. Add or update regression coverage when behavior can break.
4. Update README/readme/changelog/developer docs when public behavior changes.
5. Run the checks relevant to the change.
6. Review the final diff for generated junk, debug code, secrets, private data, and unrelated formatting.
7. Open a pull request describing What, Why, Validation, Scope/Risks, and Screenshots for visual changes.

Validated development batches are periodically merged into `main`; do not assume an unvalidated development SHA is release-ready.

## Quality checks

Public CI covers PHP syntax, WPCS/PHPCS, theme metadata, `theme.json`, namespace/i18n guards, asset budgets, real WordPress + MariaDB activation, pattern registration, responsive Chromium regression, and distributable ZIP contents.

The browser matrix covers **320, 375, 390, 412, 768, 1440, and 1920 px**. Tests include navigation/focus behavior, core routes, horizontal overflow, comments, wide/full blocks, long mixed-script titles, reduced motion, and screenshot artifacts.

For local browser testing:

```bash
npm install
PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:8080 npm run test:browser
```

Build the release-style ZIP with:

```bash
./bin/build-theme-zip.sh
```

## Commit quality

Prefer clear, scoped Conventional-Commit style messages:

- `feat(patterns): add editorial starter layouts`
- `fix(header): avoid duplicate brand links`
- `a11y(navigation): preserve keyboard focus containment`
- `perf(images): avoid eager loading non-critical media`
- `docs(readme): document multilingual extension boundary`
- `test(runtime): cover clean WordPress activation`
- `ci: validate distributable package`

Avoid `update`, `misc changes`, `continue`, `fix stuff`, timestamps, empty commits, or formatting-only churn presented as product progress.

## Internationalization

All user-visible PHP strings must use the `slateframe` text domain. Do not hard-code locale lists, language URL prefixes, or multilingual-plugin behavior into core.

Use locale-aware WordPress APIs for dates, numbers, time, and pluralization. Layouts should tolerate Latin, CJK, RTL, and long translated strings.

## Accessibility

Do not remove skip-link behavior, visible focus, semantic landmarks, labels, keyboard interaction, reduced-motion support, touch-target resilience, or no-JavaScript fallbacks without an equivalent or better replacement.

Interaction changes require real keyboard/browser verification; a Lighthouse score alone is not acceptance criteria.

## Public namespaces

- PHP functions/hooks: `slateframe_`
- CSS classes: `slateframe-`
- CSS custom properties: `--slateframe-`
- Pattern category/slugs: `slateframe` / `slateframe/*`
- Block style names: `slateframe-*`
- Text Domain: `slateframe`

Stable public hooks should be treated as compatibility surfaces.

## Security and privacy

Never commit credentials, database dumps, production configuration, analytics identifiers, private media, user data, or secrets.

Follow [SECURITY.md](SECURITY.md) for vulnerability reporting.
