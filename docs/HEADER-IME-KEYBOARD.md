# Header keyboard interaction: IME-safe Escape

Slateframe uses the native WordPress navigation menu and a compact disclosure button, not a modal menu. When the disclosure is open, ordinary `Escape` closes it, restores focus to the toggle, and makes the hidden menu inert. `Tab` may leave the header naturally; the menu then closes without trapping focus.

## Japanese and Chinese input

The header's document-level Escape listener must **not** consume a keyboard event already handled by another widget, an event with `isComposing === true`, or a legacy IME event with `keyCode === 229`. During candidate selection, `Escape` can cancel a composition or dismiss the IME candidate window without dismissing the navigation. Once composition ends, an ordinary Escape still closes the disclosure and restores focus.

The browser regression exercises LTR and RTL at compact widths, checks `aria-expanded`, `inert`, native focus restoration, active composition, legacy IME keyCode 229, and an already-prevented Escape. It is intentionally limited to the existing 3.5 KB header script; no input-method detection library or global keyboard shortcut framework is added.

This behavior is not an assertion that every IME and OS behaves identically. A manual verification pass should cover Japanese conversion and Chinese candidate selection in at least one desktop and one mobile browser before release. The test suite's synthetic composition events protect the listener contract but do not replace actual IME testing.

## QA note

The compact menu's `Escape` handling is intentionally non-modal. This change leaves the native WordPress menu hierarchy, focus order, dark-mode toggle, and link navigation unchanged. A genuine Japanese/Chinese IME manual pass remains necessary because synthetic `KeyboardEvent` instances cannot reproduce every OS candidate window.
