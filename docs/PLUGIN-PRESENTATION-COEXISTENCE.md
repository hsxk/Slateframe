# Dynamic plugin presentation coexistence

WordPress plugins can render shortcodes or server-side blocks after the theme
has selected its styles. Stored post content may contain only a shortcode, so
scanning it cannot discover the final Gallery, project grid or form. Slateframe
now provides additive, site-neutral filters for the three contextual visual
layers; see `docs/EXTENSIONS.md`.

## Real WordPress acceptance

The disposable Playwright fixture writes a temporary MU plugin only into the
CI WordPress installation, creates five temporary public Pages, and removes
both the plugin and the Pages in a `finally` block. The plugin owns all
shortcode markup and never changes theme data or production WordPress sites.

- A plain Page loads none of the optional layers.
- A plugin-rendered form opts into the existing shared and authored form CSS.
- A plugin-rendered Photography sequence opts into Photography only.
- A plugin-rendered Portfolio grid opts into Query Loop plus its required
  content-mode dependency, but not Photography or form CSS.
- A native saved Photography marker still loads its CSS even if the plugin
  filter returns false.

The form is exercised at 320/375/390/412/768/1440/1920px, both directions,
200% text, 44px controls, 400% RTL forced colors, keyboard focus and Axe.
Genuine WordPress/Chromium screenshots cover 390/1440 forms, 390 Photography,
390/1440 RTL Portfolio and the 400% forced-colors form. No extra runtime CSS,
JavaScript, custom content type, remote media, or plugin dependency ships.

Acceptance requires all exact-head Theme quality and Photography GitHub Actions
jobs to succeed and the screenshots to be downloaded and visually reviewed.
