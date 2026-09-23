# Slateframe

**A clean frame for whatever you publish.**

Slateframe is a fast, accessible, multilingual-ready WordPress theme for publishing, photography, blogs, portfolios, and personal websites.

## Development status

Slateframe is under active development. The stable `main` branch remains intentionally minimal while work proceeds on `automation/continuous-development`.

The current development line already installs and activates in a clean WordPress environment through public CI, but it is not yet a release candidate.

## Principles

- Content-first editorial design without page-builder runtime dependencies.
- Native WordPress hybrid architecture: `theme.json`, PHP template hierarchy, Gutenberg patterns and block styles.
- Language-agnostic by default: WordPress i18n APIs, logical CSS properties, RTL-ready architecture, and optional multilingual integrations through public hooks.
- Accessibility and keyboard behavior are product requirements.
- Performance by architecture: system fonts, contextual assets, lightweight native JavaScript.
- Theme presentation stays portable; site business logic belongs in plugins.
- Public releases are built from a reproducible package and tested in a clean WordPress installation.

## Development

The long-lived development branch is `automation/continuous-development`. Pull request #1 tracks the public baseline until a reviewed release milestone is ready.

Run the packaging script from the repository root:

```bash
./bin/build-theme-zip.sh
```

The resulting distributable is written to `dist/slateframe.zip`.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
