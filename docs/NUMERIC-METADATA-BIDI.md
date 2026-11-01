# Mixed-direction dates, counts and media details

Slateframe uses native HTML `bdi` only around text it owns in classic PHP templates. This prevents a localized date, number, media dimension or mixed-script parent title from rearranging surrounding punctuation in RTL layouts. WordPress still controls dates, comment count pluralization, translated strings, `datetime` attributes, attachment metadata and link destinations.

- `slateframe_posted_on()` isolates the visible localized date inside the existing semantic `<time datetime="…">` element; ISO timestamps are unchanged.
- Related Reading and 404 recovery links isolate their visible dates without changing the original permalink or semantic time value.
- The classic comments heading isolates only the formatted count inside the original localized singular/plural text. Core discussion blocks remain authoritative when present.
- Attachment details isolate the escaped metadata value independently of its label. The parent recovery link isolates its escaped post title without changing its translation or URL.

No forced LTR, CSS, JavaScript, extra queries, third-party dependencies or Gutenberg Core block markup are introduced. The Python fixture executes real PHP for dates and singular/plural comments, guards escaping and checks changed PHP files. The real WordPress/Chromium browser test exercises listing and article dates at seven widths, LTR/RTL, 100%/400%, Axe and forced colors; six screenshots must be reviewed at the exact Actions HEAD before merge. Attachment and comment fixture execution are separately covered by PHP tests; their real WordPress visual verification remains part of the wider Browser smoke suite.
