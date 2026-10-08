# Interspace backgrounds

Approved artwork from the 2026-10-09 design session, copied unchanged from the generated PNGs.

| Asset | Page | Motif |
| --- | --- | --- |
| home.png | Home | Near-black blue space, partial planet |
| chat.png | Bruce conversation | Stepping stones connecting two worlds |
| explore.png | Directory and character details | Rain, sunset and night fragments |
| space.png | My characters and private space | Wooden floor and an empty chair in warm light |
| studio.png | Character creator | A seedling growing a ringed planet |

`web/interspace.css` is the shared presentation layer. `platform.js` assigns
`data-scene` as hash routes change; Bruce declares its scene in the HTML.
Settings and unknown routes use a quiet solid background. No external image
hosts, new portraits, payment changes, backend changes or storage migrations.
Original layouts and browser storage keys remain intact.

Validation: existing browser regression suite (including a mocked chat stream),
asset HTTP checks, desktop page review and 390px mobile overflow checks.
Live provider credentials and production deployment were not exercised.
