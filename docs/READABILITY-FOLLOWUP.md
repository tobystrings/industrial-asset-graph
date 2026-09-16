# Readability follow-up — September 16, 2026

Reviewed against freshly fetched `origin/main` at `e11bf2db9f88277d963ddd7a73c4de7c3bb5f097`. The published Pages HTML referenced the same baseline CSS bundle (`index-uawGH86u.css`) as the local production build.

Browser measurements at 1366 × 768 and 390 × 844 found that the shared 20 px reading / 22 px action / 56 px control system was not consistently applied:

- Map toolbar buttons were 44 px high because a more specific `!important` rule overrode the shared minimum. Floating map buttons were only 52 px wide.
- Equipment metadata, mobile header text, and Slate status/repair metadata explicitly used 18 px.
- Document headings and cabinet panel titles used 19 px.
- Wulftec's asset-graph and Map Studio panel headings used 18 px; connection delete buttons used 19 px text in a 42 px column.
- The document preview close button remained only 44 px wide. The shared button minimum width now has the same cascade protection as its minimum height.

These rules now use the shared size tokens, and connection/evidence rows reserve enough width for the larger delete control. Technical drawings retain their own coordinates and contained zoom.

On phones, manual cards stack their category below the title rather than compressing two text columns. Long card text and IDs can wrap without creating horizontal page overflow.

`scripts/large_print_visual.py` now checks direct text nodes throughout the app shell, including spans, links, IDs, headings, and metadata, against a 20 px minimum. It also measures buttons, disclosure controls, and header/navigation links against 56 × 56 px. The previous assertion checked a subset of elements against 18 px and did not measure workspace buttons.

Measurements wait for finite entrance animations to finish, so their temporary scale transforms are not mistaken for final control sizes. Size thresholds remain unchanged by that wait.

The measurements do not establish that text embedded in photographs, drawings, PDFs, or a separate viewer is readable at overview scale. Those surfaces require visual review and appropriate local zoom. Passing these checks is a regression floor, not a substitute for the owner's assessment of readability on their device.
