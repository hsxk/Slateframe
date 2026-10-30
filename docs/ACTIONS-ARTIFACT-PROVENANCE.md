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
