# dvs-lab: how to build and run a smoke test

This repo holds public landing pages that test demand for DVS opportunities and ventures. The system of record is the DVS database (Supabase project `tgnbqlfqbevtdyrviule`); the console is https://claude.ai/artifact/KXUvuPQX7Ntaa9u43QAR22 (Smoke tests page).

## Rules

1. **Nothing goes live without Abdulla's approval.** A new page is always a draft: `site/<slug>/index.html` plus an empty `site/<slug>/.draft`. Drafts are excluded from the deploy. Only remove `.draft` after the test's status in the database is `approved`.
2. **Honest pages.** A smoke test describes a service being tested, under a working brand name we own. Never imitate a real company, regulator or government body, never use their logos, never invent customers, testimonials, partner logos, ratings or user counts, and never claim the service exists if it doesn't. The FAQ must say plainly whether it is available now. Regulatory facts must come from official sources.
3. **No payments, no outreach.** Pages collect interest only (email, optional name and company, one qualifying question). No payment forms, no auto-emails. Any ad spend is logged as cash against the linked experiment and must fit the Operating Mandate.
4. **Minimum data.** Keep the consent checkbox and the footer data line. Don't add trackers, pixels or third-party analytics; `lab.js` already measures visits, CTA clicks and signups.
5. **Keep the hooks**: `<body data-lab="<slug>">`, `data-cta` on every call to action, `form[data-waitlist]` with `email`, `consent` and the `website` honeypot, `data-lab-open` / `data-lab-closed` around the form, and `<script src="../assets/lab.js" defer>`.

## Procedure

1. **Register the test** in the database (from chat, via the Supabase connector):
   `select dvs_lab_act('save_test', '{"slug":"…","title":"…","hypothesis":"…","audience":"…","offer":"…","price_point":"…","success_threshold":"…","min_visitors":150,"target_conversion":8,"opportunity_id":"…","venture_id":"…","experiment_id":"…","source":"chat"}'::jsonb);`
   Slug: lowercase, digits and hyphens, 3–61 characters. Link the opportunity or venture, and the experiment if one exists (create one with `dvs_act('create_experiment', …)` when ad spend is planned; the mandate's per-experiment limit applies).
2. **Write the page**: copy `templates/smoke-test/index.html` to `site/<slug>/index.html`, create `site/<slug>/.draft`, and fill every `{{TOKEN}}`. Delete sections that don't help the test. One offer, one audience, one price point. Choose an accent colour that suits the brand. For an Arabic page use `lang="ar" dir="rtl"`; consider an English and an Arabic variant as two slugs. Ask Abdulla which contact email the footer shows; never publish his personal address without asking.
3. **Check it**: no `{{` left (the deploy fails if any remain), reads well on a 390px-wide phone, and works in preview: open the file with `?preview` (or from disk) and nothing is recorded.
4. **Commit and push** the draft. It is not deployed. Tell Abdulla it is ready to review in the repo (or send a screenshot), and that he can approve it in the console.
5. **After approval** (`status = 'approved'` in `smoke_tests`): delete `site/<slug>/.draft`, push, wait for the "Deploy DVS Lab pages" workflow, then set it live:
   `select dvs_lab_act('set_test_status', '{"id":"…","status":"live","page_url":"https://abbraik.github.io/dvs-lab/<slug>/"}'::jsonb);`
6. **Drive traffic** only as Abdulla decides (his own channels, communities, small ad budgets). Use `?utm_source=<channel>` links so the console can show where visitors came from.
7. **Close**: when `min_visitors` is reached or the deadline passes, compare the conversion with `target_conversion`, then `set_test_status` to `closed` with a `result`, revise the linked claim and record the decision it leads to. Pausing (`paused`) stops signups immediately without a deploy.

## Layout

- `site/assets/lab.js`, `site/assets/lab.css`: shared runtime and base styles
- `site/<slug>/index.html`: one folder per test
- `templates/smoke-test/index.html`: the starting template
- `.github/workflows/pages.yml`: deploys `site/` (minus drafts) to GitHub Pages on every push to `main`
