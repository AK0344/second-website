export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/checkout' && request.method === 'POST') {
      return handleCheckout(request, env);
    }
    if (url.pathname === '/api/reservation' && request.method === 'POST') {
      return handleReservation(request, env);
    }
    if (url.pathname === '/api/reservation/respond' && request.method === 'GET') {
      return handleReservationRespond(request, env);
    }
    if (url.pathname === '/api/reservation/reject-form' && request.method === 'GET') {
      return handleRejectForm(request, env);
    }
    if (url.pathname === '/api/reservation/reject-form' && request.method === 'POST') {
      return handleRejectFormSubmit(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

/* ── STRIPE CHECKOUT ─────────────────────────────────────────────── */
async function handleCheckout(request, env) {
  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey) return json({ error: 'Stripe niet geconfigureerd' }, 500);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Ongeldig verzoek' }, 400); }

  const origin = new URL(request.url).origin;
  const params = new URLSearchParams();

  params.set('mode',        'payment');
  params.set('success_url', `${origin}/bedankt.html?session_id={CHECKOUT_SESSION_ID}`);
  params.set('cancel_url',  `${origin}/order.html`);

  const pm = body.paymentMethod === 'card' ? 'card' : 'ideal';
  params.set('payment_method_types[0]', pm);

  if (body.customer_email) params.set('customer_email', body.customer_email);

  (body.items || []).forEach((item, i) => {
    params.set(`line_items[${i}][price_data][currency]`,           'eur');
    params.set(`line_items[${i}][price_data][product_data][name]`, item.name);
    params.set(`line_items[${i}][price_data][unit_amount]`,        String(Math.round(item.price * 100)));
    params.set(`line_items[${i}][quantity]`,                       String(item.qty ?? 1));
  });

  Object.entries(body.metadata || {}).forEach(([k, v]) => {
    params.set(`metadata[${k}]`, String(v).slice(0, 500));
  });

  const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params.toString(),
  });

  const session = await resp.json();
  if (!resp.ok) return json({ error: session.error?.message || 'Stripe fout' }, 502);
  return json({ url: session.url });
}

/* ── RESERVATION SUBMIT ──────────────────────────────────────────── */
async function handleReservation(request, env) {
  if (!env.RESEND_API_KEY)    return json({ error: 'E-mail niet geconfigureerd' }, 500);
  if (!env.RESERVATIONS_KV)   return json({ error: 'Opslag niet geconfigureerd' }, 500);
  if (!env.RESTAURANT_EMAIL)  return json({ error: 'Restaurant e-mail niet geconfigureerd' }, 500);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Ongeldig verzoek' }, 400); }

  const { datum, tijd, personen, naam, tel, email, note, restaurantNaam } = body;
  if (!datum || !tijd || !personen || !naam || !tel || !email) {
    return json({ error: 'Verplichte velden ontbreken' }, 400);
  }

  const id        = crypto.randomUUID();
  const token     = crypto.randomUUID();
  const fromEmail = env.RESEND_FROM || 'reservering@webserveert.com';
  const origin    = new URL(request.url).origin;

  await env.RESERVATIONS_KV.put(
    `reservation:${id}`,
    JSON.stringify({ id, token, status: 'pending', datum, tijd, personen, naam, tel, email, note: note || '', restaurantNaam, createdAt: new Date().toISOString() }),
    { expirationTtl: 60 * 60 * 24 * 30 }
  );

  const dateLabel   = formatDate(datum);
  const personLabel = formatPersonen(personen);
  const approveUrl  = `${origin}/api/reservation/respond?id=${id}&token=${token}&action=approve`;
  const rejectUrl   = `${origin}/api/reservation/reject-form?id=${id}&token=${token}`;

  await sendEmail(env.RESEND_API_KEY, {
    from:    `${restaurantNaam} <${fromEmail}>`,
    to:      email,
    subject: `Reserveringsverzoek ontvangen — ${restaurantNaam}`,
    html:    emailCustomerPending({ naam, restaurantNaam, dateLabel, tijd, personLabel, note }),
  });

  await sendEmail(env.RESEND_API_KEY, {
    from:    `Reserveringen <${fromEmail}>`,
    to:      env.RESTAURANT_EMAIL,
    subject: `Nieuw reserveringsverzoek — ${naam} — ${dateLabel} ${tijd}`,
    html:    emailRestaurantNotification({ naam, tel, email, dateLabel, tijd, personLabel, note, approveUrl, rejectUrl }),
  });

  return json({ success: true });
}

/* ── RESERVATION APPROVE / REJECT ────────────────────────────────── */
async function handleReservationRespond(request, env) {
  const { searchParams } = new URL(request.url);
  const id     = searchParams.get('id');
  const token  = searchParams.get('token');
  const action = searchParams.get('action');

  if (!id || !token || !['approve', 'reject'].includes(action)) {
    return htmlPage('Ongeldige link', '<p>Deze link is ongeldig of onvolledig.</p>');
  }
  if (!env.RESERVATIONS_KV) {
    return htmlPage('Fout', '<p>Opslag niet geconfigureerd.</p>');
  }

  const raw = await env.RESERVATIONS_KV.get(`reservation:${id}`);
  if (!raw) {
    return htmlPage('Niet gevonden', '<p>Deze reservering bestaat niet of de link is verlopen.</p>');
  }

  const r = JSON.parse(raw);
  if (r.token !== token) {
    return htmlPage('Ongeldige link', '<p>Deze link is ongeldig.</p>');
  }
  if (r.status !== 'pending') {
    const done = r.status === 'approved' ? 'al bevestigd' : 'al afgewezen';
    return htmlPage('Al verwerkt', `<p>Deze reservering is ${done}.</p>`);
  }

  r.status = action === 'approve' ? 'approved' : 'rejected';
  await env.RESERVATIONS_KV.put(`reservation:${id}`, JSON.stringify(r), { expirationTtl: 60 * 60 * 24 * 30 });

  const dateLabel   = formatDate(r.datum);
  const personLabel = formatPersonen(r.personen);
  const fromEmail   = env.RESEND_FROM || 'reservering@webserveert.com';

  await sendEmail(env.RESEND_API_KEY, {
    from:    `${r.restaurantNaam} <${fromEmail}>`,
    to:      r.email,
    subject: action === 'approve'
      ? `Reservering bevestigd — ${r.restaurantNaam}`
      : `Reservering niet beschikbaar — ${r.restaurantNaam}`,
    html: emailCustomerOutcome({ ...r, dateLabel, personLabel, action }),
  });

  const msg = action === 'approve'
    ? `✅ Reservering bevestigd — ${r.naam}, ${dateLabel} om ${r.tijd}`
    : `❌ Reservering afgewezen — ${r.naam}, ${dateLabel} om ${r.tijd}`;

  return htmlPage(
    action === 'approve' ? 'Bevestigd' : 'Afgewezen',
    `<p style="font-size:1.1rem">${msg}</p>`
  );
}

/* ── REJECT FORM (GET — show form) ──────────────────────────────── */
async function handleRejectForm(request, env) {
  const { searchParams } = new URL(request.url);
  const id    = searchParams.get('id');
  const token = searchParams.get('token');

  if (!id || !token) {
    return htmlPage('Ongeldige link', '<p>Deze link is ongeldig of onvolledig.</p>');
  }
  if (!env.RESERVATIONS_KV) {
    return htmlPage('Fout', '<p>Opslag niet geconfigureerd.</p>');
  }

  const raw = await env.RESERVATIONS_KV.get(`reservation:${id}`);
  if (!raw) {
    return htmlPage('Niet gevonden', '<p>Deze reservering bestaat niet of de link is verlopen.</p>');
  }

  const r = JSON.parse(raw);
  if (r.token !== token) {
    return htmlPage('Ongeldige link', '<p>Deze link is ongeldig.</p>');
  }
  if (r.status !== 'pending') {
    const done = r.status === 'approved' ? 'al bevestigd' : 'al afgewezen';
    return htmlPage('Al verwerkt', `<p>Deze reservering is ${done}.</p>`);
  }

  const dateLabel   = formatDate(r.datum);
  const personLabel = formatPersonen(r.personen);

  return new Response(`<!DOCTYPE html><html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reservering afwijzen</title>
<style>
  body{font-family:sans-serif;background:#f5f5f5;margin:0;padding:40px 20px}
  .card{background:#fff;max-width:540px;margin:0 auto;border-radius:8px;padding:40px}
  h1{margin:0 0 8px;font-size:22px;color:#111}
  .sub{color:#666;margin:0 0 28px;font-size:15px}
  table{width:100%;border-collapse:collapse;margin:0 0 24px}
  td{padding:10px 0;border-bottom:1px solid #eee;vertical-align:top}
  td:first-child{color:#666;width:38%}
  label{display:block;font-size:14px;font-weight:600;color:#555;margin-bottom:6px}
  textarea{width:100%;box-sizing:border-box;padding:12px;border:1px solid #ddd;border-radius:6px;font-size:15px;font-family:inherit;resize:vertical;min-height:100px}
  .btn{display:block;width:100%;box-sizing:border-box;padding:14px;border-radius:6px;font-weight:bold;font-size:15px;cursor:pointer;border:none;background:#c0392b;color:#fff;margin-top:20px}
  .btn:hover{background:#a93226}
  .note{color:#aaa;font-size:12px;margin-top:12px;text-align:center}
</style></head><body>
<div class="card">
  <h1>Reservering afwijzen</h1>
  <p class="sub">Optioneel kunt u een reden meegeven aan de klant.</p>
  <table>
    <tr><td>Naam</td><td><strong>${r.naam}</strong></td></tr>
    <tr><td>Datum</td><td>${dateLabel}</td></tr>
    <tr><td>Tijd</td><td>${r.tijd}</td></tr>
    <tr><td>Personen</td><td>${personLabel}</td></tr>
  </table>
  <form method="POST" action="/api/reservation/reject-form">
    <input type="hidden" name="id" value="${id}">
    <input type="hidden" name="token" value="${token}">
    <label for="msg">Reden voor afwijzing (optioneel)</label>
    <textarea id="msg" name="message" placeholder="Bijv. het gevraagde tijdstip is helaas niet beschikbaar…"></textarea>
    <button type="submit" class="btn">Reservering afwijzen</button>
  </form>
  <p class="note">De klant ontvangt automatisch een e-mail met uw beslissing.</p>
</div>
</body></html>`, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
}

/* ── REJECT FORM (POST — process submission) ─────────────────────── */
async function handleRejectFormSubmit(request, env) {
  if (!env.RESERVATIONS_KV) {
    return htmlPage('Fout', '<p>Opslag niet geconfigureerd.</p>');
  }

  let formData;
  try { formData = await request.formData(); } catch { return htmlPage('Fout', '<p>Ongeldig verzoek.</p>'); }

  const id      = formData.get('id');
  const token   = formData.get('token');
  const message = (formData.get('message') || '').trim();

  if (!id || !token) {
    return htmlPage('Ongeldige link', '<p>Deze link is ongeldig of onvolledig.</p>');
  }

  const raw = await env.RESERVATIONS_KV.get(`reservation:${id}`);
  if (!raw) {
    return htmlPage('Niet gevonden', '<p>Deze reservering bestaat niet of de link is verlopen.</p>');
  }

  const r = JSON.parse(raw);
  if (r.token !== token) {
    return htmlPage('Ongeldige link', '<p>Deze link is ongeldig.</p>');
  }
  if (r.status !== 'pending') {
    const done = r.status === 'approved' ? 'al bevestigd' : 'al afgewezen';
    return htmlPage('Al verwerkt', `<p>Deze reservering is ${done}.</p>`);
  }

  r.status = 'rejected';
  await env.RESERVATIONS_KV.put(`reservation:${id}`, JSON.stringify(r), { expirationTtl: 60 * 60 * 24 * 30 });

  const dateLabel   = formatDate(r.datum);
  const personLabel = formatPersonen(r.personen);
  const fromEmail   = env.RESEND_FROM || 'reservering@webserveert.com';

  await sendEmail(env.RESEND_API_KEY, {
    from:    `${r.restaurantNaam} <${fromEmail}>`,
    to:      r.email,
    subject: `Reservering niet beschikbaar — ${r.restaurantNaam}`,
    html:    emailCustomerOutcome({ ...r, dateLabel, personLabel, action: 'reject', message }),
  });

  return htmlPage('Afgewezen', `<p style="font-size:1.1rem">❌ Reservering afgewezen — ${r.naam}, ${dateLabel} om ${r.tijd}</p>`);
}

/* ── EMAIL SENDING ───────────────────────────────────────────────── */
async function sendEmail(apiKey, { from, to, subject, html }) {
  return fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ from, to, subject, html }),
  });
}

/* ── EMAIL TEMPLATES ─────────────────────────────────────────────── */
function emailWrapper(title, content) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{font-family:sans-serif;background:#f5f5f5;margin:0;padding:40px 20px}
  .card{background:#fff;max-width:540px;margin:0 auto;border-radius:8px;padding:40px}
  h1{margin:0 0 24px;font-size:22px;color:#111}
  table{width:100%;border-collapse:collapse;margin:20px 0}
  td{padding:10px 0;border-bottom:1px solid #eee;vertical-align:top}
  td:first-child{color:#666;width:38%}
  .btn{display:inline-block;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;margin:8px 8px 8px 0}
  .btn-green{background:#2d9e4f;color:#fff}
  .btn-red{background:#c0392b;color:#fff}
  .footer{color:#aaa;font-size:12px;margin-top:32px;text-align:center}
</style></head><body>
<div class="card"><h1>${title}</h1>${content}</div>
</body></html>`;
}

function emailCustomerPending({ naam, restaurantNaam, dateLabel, tijd, personLabel, note }) {
  return emailWrapper('Reserveringsverzoek ontvangen', `
    <p>Beste ${naam},</p>
    <p>Wij hebben uw reserveringsverzoek ontvangen en bevestigen zo spoedig mogelijk per e-mail.</p>
    <table>
      <tr><td>Restaurant</td><td><strong>${restaurantNaam}</strong></td></tr>
      <tr><td>Datum</td><td>${dateLabel}</td></tr>
      <tr><td>Tijd</td><td>${tijd}</td></tr>
      <tr><td>Personen</td><td>${personLabel}</td></tr>
      ${note ? `<tr><td>Opmerking</td><td>${note}</td></tr>` : ''}
    </table>
    <p>U ontvangt een bevestiging zodra uw reservering is goedgekeurd.</p>
    <div class="footer">Automatisch bericht van ${restaurantNaam}</div>`
  );
}

function emailRestaurantNotification({ naam, tel, email, dateLabel, tijd, personLabel, note, approveUrl, rejectUrl }) {
  return emailWrapper('Nieuw reserveringsverzoek', `
    <table>
      <tr><td>Naam</td><td><strong>${naam}</strong></td></tr>
      <tr><td>Telefoon</td><td>${tel}</td></tr>
      <tr><td>E-mail</td><td>${email}</td></tr>
      <tr><td>Datum</td><td>${dateLabel}</td></tr>
      <tr><td>Tijd</td><td>${tijd}</td></tr>
      <tr><td>Personen</td><td>${personLabel}</td></tr>
      ${note ? `<tr><td>Opmerking</td><td>${note}</td></tr>` : ''}
    </table>
    <a href="${approveUrl}" class="btn btn-green">✓ Bevestigen</a>
    <a href="${rejectUrl}"  class="btn btn-red">✗ Afwijzen</a>
    <div class="footer">Klik op een knop om de klant automatisch per e-mail te informeren.</div>`
  );
}

function emailCustomerOutcome({ naam, restaurantNaam, dateLabel, tijd, personLabel, action, message }) {
  const approved = action === 'approve';
  return emailWrapper(
    approved ? 'Reservering bevestigd ✓' : 'Reservering niet beschikbaar',
    approved
      ? `<p>Beste ${naam},</p>
         <p>Uw reservering is bevestigd. Wij verwachten u op het onderstaande tijdstip.</p>
         <table>
           <tr><td>Restaurant</td><td><strong>${restaurantNaam}</strong></td></tr>
           <tr><td>Datum</td><td>${dateLabel}</td></tr>
           <tr><td>Tijd</td><td>${tijd}</td></tr>
           <tr><td>Personen</td><td>${personLabel}</td></tr>
         </table>
         <p>Tot dan!</p>
         <div class="footer">Automatisch bericht van ${restaurantNaam}</div>`
      : `<p>Beste ${naam},</p>
         <p>Helaas kunnen wij uw reservering voor ${dateLabel} om ${tijd} niet bevestigen.</p>
         ${message ? `<p><strong>Bericht van het restaurant:</strong><br>${message}</p>` : '<p>Het gevraagde tijdstip is niet meer beschikbaar.</p>'}
         <p>Neem gerust contact met ons op voor een andere datum of tijd.</p>
         <div class="footer">Automatisch bericht van ${restaurantNaam}</div>`
  );
}

/* ── HELPERS ─────────────────────────────────────────────────────── */
function formatDate(datum) {
  return new Date(datum).toLocaleDateString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatPersonen(personen) {
  return personen === '16+' ? '16 of meer personen'
    : `${personen} ${parseInt(personen) === 1 ? 'persoon' : 'personen'}`;
}

function htmlPage(title, body) {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title></head><body style="font-family:sans-serif;padding:3rem;max-width:500px;margin:0 auto"><h2>${title}</h2>${body}</body></html>`,
    { headers: { 'Content-Type': 'text/html;charset=UTF-8' } }
  );
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
