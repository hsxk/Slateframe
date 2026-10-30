# Offline Actions artifact provenance audit

The release reviewer must verify three **downloaded GitHub Actions ZIP artifacts**
from the **same exact pull-request HEAD SHA** before inspecting the actual
WordPress/Chromium screenshots and merging. This offline utility does not call
GitHub, deploy a site, or change theme runtime assets.

Download the slateframe-browser, slateframe-photography-runtime, and
slateframe-distribution artifacts from the successful HEAD-specific
Theme quality and Photography runs. Run:

    python3 bin/audit-actions-artifacts.py \
      --head FULL_40_CHARACTER_COMMIT_SHA \
      --browser browser.zip \
      --photography photography.zip \
      --distribution distribution.zip

The utility validates all ZIP CRCs, unsafe entries and duplicate paths,
manifest/HEAD identity, the exact screenshot inventory, per-PNG SHA-256,
PNG CRC, IHDR legality, critical chunk and palette ordering, consecutive IDAT, bounded full zlib scanline decompression (including Adam7), scanline filter bytes and dimensions, the nested theme checksum, Theme Name/Text Domain,
the 1200×900 WordPress.org screenshot, and absence of symlink/path traversal
inside the distributable. It also rejects hidden files, unexpected directories,
source maps, executables in image folders, and files outside the explicit
WordPress theme distribution layout. Normal Core PHP templates, conditional
CSS, vanilla JS, placeholder images, and translation catalogs remain allowed.
The Browser and Photography evidence archives bind every screenshot to the
exact manifest directory, and require review HTML, reports, logs, and manifests
at their expected fixture-relative locations. A renamed secret cannot bypass
the check merely by using a whitelisted basename. Non-canonical ZIP paths
(including redundant separators and dot segments) are also rejected. They
likewise reject unexpected non-PNG files outside the reviewed locations;
this prevents stray private files from being silently included in artifacts.
New distributable file types, directories, or evidence metadata require an
intentional auditor contract update with positive and negative tests. It fails closed on missing,
stale, or tampered evidence. Unit tests cover malicious and corrupted fixtures.

**Passing this tool does not mean visual approval.** Reviewers must still
actually open genuine WordPress/Chromium screenshots for Appearance
compact/default/spacious, mobile/desktop, Photography/Lightbox, Portfolio,
Knowledge, article, header, search, forms, footer, RTL/CJK, forced colors,
and Gutenberg. Verify that all required Actions Jobs succeeded on the
same HEAD SHA; then merge and independently verify the new main merge SHA.
Never treat an isolated browser preview or a PR success as proof of
main merge-SHA success. The tool only checks artifact integrity, not
pixel semantics, accessibility tree, Safari/VoiceOver, or user-device behavior.

The PNG inflate limit is 128 MiB per image; oversized or incomplete compressed streams, trailing compressed garbage, and invalid filter bytes are rejected even if an attacker recalculates both PNG CRCs and manifest SHA-256. This validates image decodability, not visual quality or assistive technology behavior.

## Public theme distribution boundary

The package job runs `python3 bin/check-distribution-boundary.py dist/slateframe.zip`
against the **actual WordPress.org distributable**, before uploading it. The
standard-library checker rejects legacy personal project identifiers,
paid-feature/license activation prompts, recognizable private key or cloud
credential markers, remote CSS imports/assets, browser fetch/XHR and PHP
server-side HTTP clients. This enforces the free, self-contained,
plugin-neutral theme boundary without scanning development tests or falsely
rejecting the legitimate GitHub author and GPL metadata. Seventeen positive
and adversarial tests guard this contract. It complements Theme Check,
WPCS, ZIP path checks, package reproducibility and the exact-SHA artifact
provenance auditor; it is not a substitute for secret scanning or review.

## Mandatory visual-state coverage

The Browser smoke job now checks its exact-HEAD screenshot inventory with
`bin/check-visual-coverage.py` **after** generating and verifying the inventory
and **before** uploading the artifact. The 98 required screenshot states cover
compact/default/spacious Appearance, all seven 320–1920px breakpoints,
LTR and RTL forced colors, Portfolio, Knowledge, Photography and Core Lightbox,
Search/empty results, Gutenberg, Article, Header, Core Forms, Footer and CJK.
Full-viewport screenshots must have their named viewport width; Core element
screenshots may be narrower. Missing states, stale HEADs, invalid heights and
wrong viewport widths fail the job. The script uses only the standard library.

For a downloaded Browser artifact, extract its `BROWSER_SCREENSHOT_INVENTORY.json`
and run `python3 bin/check-visual-coverage.py --manifest INVENTORY.json --head FULL_SHA`.
This check supplements, never replaces, the complete ZIP/PNG provenance audit,
Axe/keyboard/zoom/forced-colors assertions or manual review of real screenshots.
