/* DVS Lab — shared runtime for smoke-test pages.
 * Records anonymous visits and CTA clicks, takes waitlist signups, and honours the test's
 * status from the DVS database (live / paused / closed), so a test can be stopped from the
 * DVS console without redeploying the page.
 *
 * A page opts in with <body data-lab="<slug>">. Elements:
 *   [data-cta]            any click is counted as a CTA click
 *   form[data-waitlist]   email (required), name, company, consent (required), website (honeypot),
 *                         any other named field is stored as an answer
 *   [data-lab-closed]     shown when the test is paused or closed (hidden otherwise)
 *   [data-lab-open]       hidden when the test is paused or closed
 *
 * The publishable key below is public by design: it can only call dvs_lab_status,
 * dvs_lab_track and dvs_lab_signup, which accept data for live tests and return nothing private.
 */
(() => {
  'use strict';
  const API = 'https://tgnbqlfqbevtdyrviule.supabase.co/rest/v1/rpc/';
  const KEY = 'sb_publishable_evD4DppuHyaqfau_uJTsZA_4Vl6g0Cw';
  const slug = document.body && document.body.dataset.lab;
  if (!slug) return;
  const preview = new URLSearchParams(location.search).has('preview') || location.protocol === 'file:';

  const rpc = (fn, body) => fetch(API + fn, {
    method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true,
  }).then((r) => (r.ok ? r.json().catch(() => null) : Promise.reject(new Error('HTTP ' + r.status))));

  const visitor = (() => {
    try {
      let v = localStorage.getItem('dvs-lab-visitor');
      if (!v) { v = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)).slice(0, 36); localStorage.setItem('dvs-lab-visitor', v); }
      return v;
    } catch (_) { return null; }
  })();
  const ref = (() => {
    const q = new URLSearchParams(location.search);
    const utm = q.get('utm_source') || q.get('ref');
    if (utm) return utm.slice(0, 80);
    try { const h = document.referrer ? new URL(document.referrer).hostname : ''; return h && h !== location.hostname ? h : null; } catch (_) { return null; }
  })();

  const setState = (status) => {
    const open = status === 'live' || preview;
    document.documentElement.dataset.labStatus = preview && status !== 'live' ? 'preview' : status;
    document.querySelectorAll('[data-lab-open]').forEach((el) => { el.hidden = !open; });
    document.querySelectorAll('[data-lab-closed]').forEach((el) => { el.hidden = open; });
    document.querySelectorAll('form[data-waitlist] button[type=submit]').forEach((b) => { b.disabled = !open; });
  };

  let status = 'live';
  rpc('dvs_lab_status', { p_slug: slug })
    .then((r) => { status = (r && r.status) || 'unavailable'; setState(status); if (status === 'live' && !preview) rpc('dvs_lab_track', { p_slug: slug, p_kind: 'view', p_visitor: visitor, p_ref: ref }).catch(() => {}); })
    .catch(() => setState('live')); // if the status check fails, keep the page usable

  document.addEventListener('click', (e) => {
    const cta = e.target.closest && e.target.closest('[data-cta]');
    if (cta && status === 'live' && !preview) rpc('dvs_lab_track', { p_slug: slug, p_kind: 'cta', p_visitor: visitor, p_ref: ref }).catch(() => {});
  });

  document.querySelectorAll('form[data-waitlist]').forEach((form) => {
    const msg = form.querySelector('[data-msg]') || form.appendChild(Object.assign(document.createElement('p'), { className: 'lab-msg' }));
    msg.setAttribute('role', 'status');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const known = ['email', 'name', 'company', 'consent', 'website'];
      const answers = {};
      for (const [k, v] of fd.entries()) if (!known.includes(k) && String(v).trim()) answers[k] = String(v).slice(0, 500);
      const email = String(fd.get('email') || '').trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) { msg.textContent = form.dataset.msgEmail || 'Please enter a valid email address.'; msg.dataset.tone = 'bad'; return; }
      if (!fd.get('consent')) { msg.textContent = form.dataset.msgConsent || 'Please tick the box so we can contact you.'; msg.dataset.tone = 'bad'; return; }
      if (preview) { msg.textContent = 'Preview mode: nothing was sent.'; msg.dataset.tone = 'ok'; return; }
      const btn = form.querySelector('button[type=submit]'); if (btn) btn.disabled = true;
      msg.textContent = form.dataset.msgSending || 'Sending…'; msg.dataset.tone = '';
      try {
        const r = await rpc('dvs_lab_signup', { p: { slug, email, name: fd.get('name') || null, company: fd.get('company') || null, consent: true, website: fd.get('website') || '', visitor, ref, answers } });
        if (r && r.ok) {
          form.reset(); form.classList.add('done');
          msg.textContent = form.dataset.msgDone || 'You’re on the list. We’ll be in touch soon.'; msg.dataset.tone = 'ok';
        } else {
          const reason = r && r.reason;
          msg.textContent = reason === 'closed' ? (form.dataset.msgClosed || 'This list is closed for now.') : reason === 'email' ? (form.dataset.msgEmail || 'Please enter a valid email address.') : (form.dataset.msgError || 'Something went wrong. Please try again in a moment.');
          msg.dataset.tone = 'bad'; if (btn) btn.disabled = false;
        }
      } catch (_) { msg.textContent = form.dataset.msgError || 'Something went wrong. Please try again in a moment.'; msg.dataset.tone = 'bad'; if (btn) btn.disabled = false; }
    });
  });
})();
