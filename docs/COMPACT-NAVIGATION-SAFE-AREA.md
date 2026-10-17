# Compact navigation: short landscape and bottom safe areas

The compact header menu is a scrollable, Core-first presentation surface. On a short landscape viewport, its height cap must reserve the bottom safe area so the final links do not overlap a home indicator.

Both 70dvh and 55dvh height caps subtract `env(safe-area-inset-bottom,0px)` without changing the shared 44px control token, desktop navigation, or introducing JavaScript.

The existing design-system Playwright suite now covers 568×320, 667×375, and 812×375 in LTR and RTL, checking viewport containment, scrolling, focus on the last link, and no horizontal overflow. A Python contract prevents the safe-area term or browser scenario from being silently removed.

Synthetic Chromium verification (not real WordPress): 60 before/after geometry cases, with 0/24/34px modeled bottom insets. The baseline overlapped the safe region in two 568×320 / 34px cases; the corrected formula overlapped in none.

Release gate: exact-HEAD Theme quality and Browser smoke, followed by actual inspection of WordPress+Chromium screenshots. No production deployment.
