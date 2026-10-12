# Search controls: mobile action parity

Slateframe's classic search template and WordPress Core Search use the same bounded control system. Below 641 CSS pixels, both present input and submit action as one-column controls with a full-width submit target. Desktop retains compact inline controls. This is presentation-only: form methods, search query parameters, labels, and Core markup are unchanged.

Previously, the classic submit button was constrained to 45% even after the form became a mobile grid. Native Core Search retained an intrinsic-width button. Both were unnecessarily small mobile targets.

tests/browser/search-mobile-action.spec.js covers 320, 375, 390, 412, 640, 768, 1440 and 1920 CSS pixels, LTR/RTL, bounded action geometry, no page overflow, 200% text sizing, long translated labels, forced colors, focus-visible, GET form semantics, and per-project screenshots. tests/test_search_mobile_action_contract.py checks the stylesheet contract and CSS budget.

No JavaScript, new translations, plugin dependency, or site-specific content is added. This is not a release acceptance claim until the exact new SHA has successful WordPress/Chromium Actions and reviewed screenshots.
