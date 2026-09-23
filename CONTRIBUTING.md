# Contributing to Slateframe

Thanks for helping improve Slateframe.

## Development principles

Slateframe is a general-purpose WordPress theme. Contributions must not introduce site-specific branding, fixed personal content, hard-coded locale paths, private configuration, production data, or a required dependency on a multilingual/page-builder plugin.

Prefer WordPress core APIs, semantic HTML, logical CSS properties, lightweight JavaScript, and portable block/pattern content.

## Workflow

1. Branch from the latest development line.
2. Keep changes focused and explain user-visible behavior in the pull request.
3. Run the checks relevant to your change.
4. Verify keyboard behavior and responsive layouts for UI changes.
5. Keep public identifiers in the `slateframe_`, `slateframe-`, or `--slateframe-` namespaces as appropriate.

The public CI currently validates PHP and JavaScript syntax, theme metadata, namespace and locale guards, asset budgets, a real WordPress installation/activation flow, content-path smoke tests, and the distributable package.

## Internationalization

All user-visible PHP strings must use the `slateframe` text domain. Do not hard-code locale lists, language URL prefixes, or plugin-specific multilingual behavior into core.

## Accessibility

Do not remove visible focus styles, semantic landmarks, labels, skip-link behavior, keyboard interaction, or reduced-motion handling without an equivalent or better replacement.

## Security and privacy

Never commit credentials, database dumps, personal media, analytics identifiers, production configuration, or private user data.
