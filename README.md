# dvs-lab

Smoke-test pages for the Digital Venture Studio (DVS). Each page tests one offer with real people: does anyone click, and does anyone leave their email?

- Pages live in `site/<slug>/` and are served by GitHub Pages at `https://abbraik.github.io/dvs-lab/<slug>/`.
- `site/assets/lab.js` records anonymous visits and CTA clicks and takes waitlist signups into the DVS database (Supabase). It only talks to three narrow public functions; nothing private is readable from a page.
- A folder with a `.draft` file is never deployed. Removing `.draft` (after approval in the DVS console) publishes the page on the next push.
- The test's status in the DVS console (live / paused / closed) controls whether the page takes signups, without redeploying.
- Results (visitors, CTA clicks, signups, conversion, sources) show on the **Smoke tests** page of the DVS console.

How to build a page: see `CLAUDE.md`.
