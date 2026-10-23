# Native Gutenberg Core block serialization acceptance

Slateframe's existing editor parity suite verifies the real WordPress canvas and presentation. The additional read-only regression uses the **installed WordPress Gutenberg** `wp.blocks` registry, not a mocked serializer, to create and round-trip native `core/file`, `core/verse`, and `core/code` blocks containing Japanese, Chinese, Arabic and Korean text.

The test executes at 390px and 1440px using the disposable loopback WordPress editor fixture. It checks native registration, parsed block validity, exact deterministic reserialization and availability of Core's save element. It snapshots the existing editor's client IDs, serialized block markup and dirty state before and after. It never dispatches edits, inserts blocks, clicks Update, or writes to the database. This deliberately **does not** claim persistence/save-reload parity or visual insertion parity.

CI must run the authenticated spec serially with the existing editor tests. Passing local syntax or static contracts is insufficient: acceptance requires all necessary Actions to succeed at the exact PR HEAD SHA. Inspect the actual WordPress+Chromium screenshot artifacts for visual changes; the serialization test itself is DOM-free and does not produce a new screenshot.
