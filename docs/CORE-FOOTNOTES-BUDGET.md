# Core Footnotes within existing runtime budgets

A first implementation added approximately 1.6 KB of shared CSS. Although `style.css` itself stayed below its 16 KB cap, it exceeded the stricter *combined* forms, search and empty-state runtime budgets. This is a real gate failure, not a reason to raise thresholds.

The final rule uses one Core Footnotes selector, native inline-grid centering, the existing `--slateframe-control` and `--slateframe-header-height` tokens, and a screen-only touch target. The source and destination `:target` outlines remain visible under forced colors. Footer widget superscript references and ordinary citations are explicitly restored to inline flow, while backreferences retain the bounded control. No new JavaScript, framework, asset dependency or WordPress block replacement is added.

`tests/test_core_footnotes_budget.py` guards the same critical shared runtime sums as the Actions quality workflow, with no relaxed caps. This is a tight envelope: a future larger feature should use intentional conditional asset loading with updated *accounted* runtime budgets, not silently inflate global CSS or weaken CI. The test does not replace exact-HEAD WordPress/PHP/Theme Check/Playwright Actions.
