// ============================================================
// IDŐPONTFOGLALÓ — admin.js
// Bejelentkezés, vállalkozás beállítása, szolgáltatások,
// nyitvatartás és a beérkezett foglalások kezelése.
// ============================================================

const DOW_NAMES = ['Vasárnap','Hétfő','Kedd','Szerda','Csütörtök','Péntek','Szombat'];
const root = document.getElementById('if-root');

const adminState = {
  user: null,
  businessId: null,
  business: null,
  tab: 'foglalasok', // foglalasok | szolgaltatasok | nyitvatartas | beagyazas
  appointments: [],
  apptFilter: 'upcoming', // upcoming | all | pending
};

auth.onAuthStateChanged(async (user) => {
  adminState.user = user;
  if (!user) {
    renderLogin();
    return;
  }
  await loadBusinessForUser();
});

// ---------- Bejelentkezés / regisztráció ----------
function renderLogin(mode = 'login', errorMsg = '') {
  root.innerHTML = `
    <div class="if-container" style="max-width:400px; padding-top:60px;">
      <div class="if-header" style="text-align:center;">
        <p class="if-business-name">Admin belépés</p>
        <p class="if-business-sub">Kezeld a foglalásaidat</p>
      </div>
      <div class="if-card">
        ${errorMsg ? `<div class="if-error-box">${errorMsg}</div>` : ''}
        <div class="if-field">
          <label class="if-label">E-mail cím</label>
          <input class="if-input" id="if-login-email" type="email" placeholder="te@vallalkozasod.hu">
        </div>
        <div class="if-field">
          <label class="if-label">Jelszó</label>
          <input class="if-input" id="if-login-pass" type="password" placeholder="••••••••">
        </div>
        <button class="if-btn if-btn-primary if-btn-block" id="if-login-btn">${mode === 'login' ? 'Belépés' : 'Regisztráció'}</button>
        <p style="text-align:center; margin-top:14px; font-size:13px; color:var(--if-text-muted);">
          ${mode === 'login' ? 'Még nincs fiókod?' : 'Van már fiókod?'}
          <a href="#" id="if-toggle-mode" style="color:var(--if-primary); font-weight:600; text-decoration:none;">${mode === 'login' ? 'Regisztrálj' : 'Lépj be'}</a>
        </p>
      </div>
    </div>
  `;
  document.getElementById('if-toggle-mode').addEventListener('click', (e) => {
    e.preventDefault();
    renderLogin(mode === 'login' ? 'register' : 'login');
  });
  document.getElementById('if-login-btn').addEventListener('click', async () => {
    const email = document.getElementById('if-login-email').value.trim();
    const pass = document.getElementById('if-login-pass').value;
    if (!email || !pass) { renderLogin(mode, 'Add meg az e-mail címet és jelszót.'); return; }
    try {
      if (mode === 'login') {
        await auth.signInWithEmailAndPassword(email, pass);
      } else {
        await auth.createUserWithEmailAndPassword(email, pass);
      }
    } catch (err) {
      renderLogin(mode, mappedAuthError(err));
    }
  });
}

function mappedAuthError(err) {
  const map = {
    'auth/invalid-email': 'Érvénytelen e-mail cím.',
    'auth/user-not-found': 'Nincs ilyen felhasználó.',
    'auth/wrong-password': 'Hibás jelszó.',
    'auth/email-already-in-use': 'Ez az e-mail cím már regisztrálva van.',
    'auth/weak-password': 'A jelszó legalább 6 karakter legyen.',
    'auth/invalid-credential': 'Hibás e-mail vagy jelszó.',
  };
  return map[err.code] || 'Hiba történt. Próbáld újra.';
}

// ---------- Vállalkozás betöltése ----------
async function loadBusinessForUser() {
  renderLoadingScreen();
  const snap = await db.collection('businesses').where('ownerUid', '==', adminState.user.uid).limit(1).get();
  if (snap.empty) {
    renderSetupWizard();
    return;
  }
  adminState.businessId = snap.docs[0].id;
  adminState.business = snap.docs[0].data();
  await loadAppointments();
  renderDashboard();
}

function renderLoadingScreen() {
  root.innerHTML = `<div class="if-container"><div class="if-loading"><div class="if-spinner"></div>Betöltés…</div></div>`;
}

// ---------- Első belépés: vállalkozás létrehozása ----------
function renderSetupWizard() {
  root.innerHTML = `
    <div class="if-container" style="max-width:480px;">
      <div class="if-header">
        <p class="if-business-name">Vállalkozásod beállítása</p>
        <p class="if-business-sub">Ez pár másodperc, utána bármikor módosíthatod</p>
      </div>
      <div class="if-card">
        <div class="if-field">
          <label class="if-label">Vállalkozás neve *</label>
          <input class="if-input" id="if-setup-name" type="text" placeholder="pl. Anna Fodrászat">
        </div>
        <div class="if-field">
          <label class="if-label">Azonosító (URL-ben, ékezet és szóköz nélkül) *</label>
          <input class="if-input" id="if-setup-id" type="text" placeholder="pl. anna-fodraszat">
        </div>
        <div id="if-setup-error"></div>
        <button class="if-btn if-btn-primary if-btn-block" id="if-setup-btn">Vállalkozás létrehozása</button>
      </div>
      <p class="if-footer-note" style="margin-top:16px;">
        <a href="#" id="if-logout-link" style="color:var(--if-text-muted);">Kijelentkezés</a>
      </p>
    </div>
  `;
  document.getElementById('if-logout-link').addEventListener('click', (e) => { e.preventDefault(); auth.signOut(); });

  document.getElementById('if-setup-id').addEventListener('input', (e) => {
    e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  });

  document.getElementById('if-setup-btn').addEventListener('click', async () => {
    const name = document.getElementById('if-setup-name').value.trim();
    const id = document.getElementById('if-setup-id').value.trim();
    const errBox = document.getElementById('if-setup-error');
    if (!name || !id) {
      errBox.innerHTML = `<div class="if-error-box">Töltsd ki mindkét mezőt.</div>`;
      return;
    }
    const existing = await db.collection('businesses').doc(id).get();
    if (existing.exists) {
      errBox.innerHTML = `<div class="if-error-box">Ez az azonosító már foglalt, válassz másikat.</div>`;
      return;
    }
    const defaultHours = {};
    for (let i = 0; i < 7; i++) {
      defaultHours[i] = (i === 0) ? { closed: true } : { open: '09:00', close: '17:00', closed: false };
    }
    const newBusiness = {
      name,
      ownerUid: adminState.user.uid,
      services: [{ id: 'svc1', name: 'Alap szolgáltatás', duration: 30, price: 5000 }],
      workingHours: defaultHours,
      slotInterval: 30,
      closedDates: [],
      theme: {},
    };
    await db.collection('businesses').doc(id).set(newBusiness);
    adminState.businessId = id;
    adminState.business = newBusiness;
    await loadAppointments();
    renderDashboard();
  });
}

// ---------- Foglalások betöltése ----------
async function loadAppointments() {
  const snap = await db.collection('businesses').doc(adminState.businessId)
    .collection('appointments').orderBy('date').orderBy('time').get();
  adminState.appointments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---------- Dashboard váz ----------
function renderDashboard() {
  const tabs = [
    ['foglalasok', 'Foglalások'],
    ['szolgaltatasok', 'Szolgáltatások'],
    ['nyitvatartas', 'Nyitvatartás'],
    ['beagyazas', 'Beágyazás'],
  ];
  root.innerHTML = `
    <div class="if-container" style="max-width:720px;">
      <div class="if-header" style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <p class="if-business-name">${escapeHtml(adminState.business.name)}</p>
          <p class="if-business-sub">Admin felület</p>
        </div>
        <button class="if-btn if-btn-ghost" id="if-logout-btn">Kijelentkezés</button>
      </div>
      <div style="display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap;">
        ${tabs.map(([key, label]) => `
          <button class="if-btn ${adminState.tab === key ? 'if-btn-primary' : 'if-btn-ghost'}" data-tab="${key}">${label}</button>
        `).join('')}
      </div>
      <div id="if-tab-content" class="if-card"></div>
    </div>
  `;
  document.getElementById('if-logout-btn').addEventListener('click', () => auth.signOut());
  root.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => { adminState.tab = btn.dataset.tab; renderDashboard(); });
  });
  renderTabContent();
}

function renderTabContent() {
  const c = document.getElementById('if-tab-content');
  if (adminState.tab === 'foglalasok') c.innerHTML = appointmentsTabHtml();
  else if (adminState.tab === 'szolgaltatasok') c.innerHTML = servicesTabHtml();
  else if (adminState.tab === 'nyitvatartas') c.innerHTML = hoursTabHtml();
  else if (adminState.tab === 'beagyazas') c.innerHTML = embedTabHtml();
  attachTabHandlers();
}

// ---------- Foglalások tab ----------
function appointmentsTabHtml() {
  const today = new Date().toISOString().slice(0, 10);
  let list = adminState.appointments;
  if (adminState.apptFilter === 'upcoming') list = list.filter(a => a.date >= today && a.status !== 'cancelled');
  if (adminState.apptFilter === 'pending') list = list.filter(a => a.status === 'pending');

  const statusLabel = { pending: 'Függőben', confirmed: 'Megerősítve', cancelled: 'Lemondva' };
  const statusColor = { pending: 'var(--if-accent)', confirmed: 'var(--if-success)', cancelled: 'var(--if-danger)' };

  const rows = list.map(a => `
    <div class="if-service-item" style="cursor:default;">
      <div>
        <div class="if-service-name">${formatDateHuShort(a.date)} · ${a.time} — ${escapeHtml(a.serviceName)}</div>
        <div class="if-service-meta">${escapeHtml(a.customerName)} · ${escapeHtml(a.customerPhone)}${a.customerEmail ? ' · ' + escapeHtml(a.customerEmail) : ''}</div>
        ${a.note ? `<div class="if-service-meta" style="font-style:italic;">„${escapeHtml(a.note)}"</div>` : ''}
        <div style="margin-top:6px; font-size:12px; font-weight:700; color:${statusColor[a.status] || '#999'};">${statusLabel[a.status] || a.status}</div>
      </div>
      <div style="display:flex; flex-direction:column; gap:6px;">
        ${a.status !== 'confirmed' ? `<button class="if-btn if-btn-ghost" data-confirm="${a.id}" style="font-size:12px; padding:6px 10px;">Megerősít</button>` : ''}
        ${a.status !== 'cancelled' ? `<button class="if-btn if-btn-ghost" data-cancel="${a.id}" style="font-size:12px; padding:6px 10px;">Lemond</button>` : ''}
        <button class="if-btn if-btn-danger" data-delete="${a.id}" style="font-size:12px; padding:6px 10px;">Törlés</button>
      </div>
    </div>
  `).join('');

  return `
    <p class="if-section-title">Foglalások</p>
    <div style="display:flex; gap:8px; margin-bottom:14px;">
      <button class="if-btn ${adminState.apptFilter === 'upcoming' ? 'if-btn-primary' : 'if-btn-ghost'}" data-filter="upcoming" style="font-size:13px; padding:8px 12px;">Közelgő</button>
      <button class="if-btn ${adminState.apptFilter === 'pending' ? 'if-btn-primary' : 'if-btn-ghost'}" data-filter="pending" style="font-size:13px; padding:8px 12px;">Függőben</button>
      <button class="if-btn ${adminState.apptFilter === 'all' ? 'if-btn-primary' : 'if-btn-ghost'}" data-filter="all" style="font-size:13px; padding:8px 12px;">Összes</button>
    </div>
    <div class="if-service-list">${rows || '<p class="if-no-slots">Nincs megjeleníthető foglalás</p>'}</div>
  `;
}

// ---------- Szolgáltatások tab ----------
function servicesTabHtml() {
  const services = adminState.business.services || [];
  const rows = services.map(s => `
    <div class="if-service-item" style="cursor:default;">
      <div>
        <div class="if-service-name">${escapeHtml(s.name)}</div>
        <div class="if-service-meta">${s.duration} perc · ${formatPrice(s.price)}</div>
      </div>
      <button class="if-btn if-btn-danger" data-remove-service="${s.id}" style="font-size:12px; padding:6px 10px;">Törlés</button>
    </div>
  `).join('');

  return `
    <p class="if-section-title">Szolgáltatások</p>
    <div class="if-service-list">${rows || '<p class="if-no-slots">Még nincs felvett szolgáltatás</p>'}</div>
    <p class="if-section-title" style="margin-top:20px;">Új szolgáltatás</p>
    <div class="if-field"><label class="if-label">Név</label><input class="if-input" id="if-new-svc-name" placeholder="pl. Hajvágás"></div>
    <div style="display:flex; gap:10px;">
      <div class="if-field" style="flex:1;"><label class="if-label">Időtartam (perc)</label><input class="if-input" id="if-new-svc-dur" type="number" min="5" step="5" value="30"></div>
      <div class="if-field" style="flex:1;"><label class="if-label">Ár (Ft)</label><input class="if-input" id="if-new-svc-price" type="number" min="0" step="500" value="5000"></div>
    </div>
    <button class="if-btn if-btn-primary if-btn-block" id="if-add-service">Szolgáltatás hozzáadása</button>
  `;
}

// ---------- Nyitvatartás tab ----------
function hoursTabHtml() {
  const wh = adminState.business.workingHours || {};
  const rows = DOW_NAMES.map((name, i) => {
    const d = wh[i] || { closed: true };
    return `
      <div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--if-border);">
        <label style="width:90px; font-size:13px; font-weight:600;">
          <input type="checkbox" data-dow-open="${i}" ${!d.closed ? 'checked' : ''}> ${name}
        </label>
        <input class="if-input" type="time" data-dow-start="${i}" value="${d.open || '09:00'}" ${d.closed ? 'disabled' : ''} style="max-width:110px;">
        <span>–</span>
        <input class="if-input" type="time" data-dow-end="${i}" value="${d.close || '17:00'}" ${d.closed ? 'disabled' : ''} style="max-width:110px;">
      </div>
    `;
  }).join('');

  return `
    <p class="if-section-title">Nyitvatartás</p>
    ${rows}
    <div class="if-field" style="margin-top:16px;">
      <label class="if-label">Időpontok gyakorisága (perc)</label>
      <input class="if-input" id="if-slot-interval" type="number" min="5" step="5" value="${adminState.business.slotInterval || 30}" style="max-width:150px;">
    </div>
    <button class="if-btn if-btn-primary if-btn-block" id="if-save-hours" style="margin-top:14px;">Mentés</button>
  `;
}

// ---------- Beágyazás tab ----------
function embedTabHtml() {
  const bookingUrl = new URL('booking.html', window.location.href).toString() + `?business=${adminState.businessId}`;
  const iframeCode = `<iframe src="${bookingUrl}" width="100%" height="720" style="border:none; max-width:600px;" title="Időpontfoglalás"></iframe>`;
  return `
    <p class="if-section-title">Beágyazó kód</p>
    <p style="font-size:14px; color:var(--if-text-muted); margin-bottom:12px;">
      Illeszd be ezt a kódot bármelyik weboldalad HTML-jébe (pl. a landing oldaladba), ahol meg szeretnéd jeleníteni a foglalási felületet.
    </p>
    <textarea class="if-textarea" readonly style="min-height:100px; font-family:var(--if-font-mono); font-size:12px;" id="if-embed-code">${escapeHtml(iframeCode)}</textarea>
    <button class="if-btn if-btn-ghost if-btn-block" id="if-copy-embed" style="margin-top:10px;">Kód másolása</button>
    <p class="if-section-title" style="margin-top:20px;">Közvetlen link</p>
    <textarea class="if-textarea" readonly style="min-height:50px; font-family:var(--if-font-mono); font-size:12px;">${escapeHtml(bookingUrl)}</textarea>
  `;
}

// ---------- Eseménykezelők ----------
function attachTabHandlers() {
  if (adminState.tab === 'foglalasok') {
    root.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => { adminState.apptFilter = b.dataset.filter; renderTabContent(); }));
    root.querySelectorAll('[data-confirm]').forEach(b => b.addEventListener('click', () => updateAppointmentStatus(b.dataset.confirm, 'confirmed')));
    root.querySelectorAll('[data-cancel]').forEach(b => b.addEventListener('click', () => updateAppointmentStatus(b.dataset.cancel, 'cancelled')));
    root.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => deleteAppointment(b.dataset.delete)));
  }
  if (adminState.tab === 'szolgaltatasok') {
    root.querySelectorAll('[data-remove-service]').forEach(b => b.addEventListener('click', () => removeService(b.dataset.removeService)));
    document.getElementById('if-add-service').addEventListener('click', addService);
  }
  if (adminState.tab === 'nyitvatartas') {
    root.querySelectorAll('[data-dow-open]').forEach(cb => {
      cb.addEventListener('change', () => {
        const i = cb.dataset.dowOpen;
        const startEl = root.querySelector(`[data-dow-start="${i}"]`);
        const endEl = root.querySelector(`[data-dow-end="${i}"]`);
        startEl.disabled = !cb.checked;
        endEl.disabled = !cb.checked;
      });
    });
    document.getElementById('if-save-hours').addEventListener('click', saveHours);
  }
  if (adminState.tab === 'beagyazas') {
    document.getElementById('if-copy-embed').addEventListener('click', () => {
      const ta = document.getElementById('if-embed-code');
      ta.select();
      navigator.clipboard.writeText(ta.value);
      const btn = document.getElementById('if-copy-embed');
      const original = btn.textContent;
      btn.textContent = 'Vágólapra másolva ✓';
      setTimeout(() => { btn.textContent = original; }, 1800);
    });
  }
}

async function updateAppointmentStatus(id, status) {
  await db.collection('businesses').doc(adminState.businessId).collection('appointments').doc(id).update({ status });
  await loadAppointments();
  renderTabContent();
}

async function deleteAppointment(id) {
  if (!confirm('Biztosan törlöd ezt a foglalást?')) return;
  await db.collection('businesses').doc(adminState.businessId).collection('appointments').doc(id).delete();
  await loadAppointments();
  renderTabContent();
}

async function addService() {
  const name = document.getElementById('if-new-svc-name').value.trim();
  const duration = parseInt(document.getElementById('if-new-svc-dur').value, 10);
  const price = parseInt(document.getElementById('if-new-svc-price').value, 10);
  if (!name || !duration) return;
  const services = adminState.business.services || [];
  const id = 'svc' + Date.now();
  services.push({ id, name, duration, price: price || 0 });
  await db.collection('businesses').doc(adminState.businessId).update({ services });
  adminState.business.services = services;
  renderTabContent();
}

async function removeService(id) {
  if (!confirm('Biztosan törlöd ezt a szolgáltatást?')) return;
  const services = (adminState.business.services || []).filter(s => s.id !== id);
  await db.collection('businesses').doc(adminState.businessId).update({ services });
  adminState.business.services = services;
  renderTabContent();
}

async function saveHours() {
  const wh = {};
  for (let i = 0; i < 7; i++) {
    const open = root.querySelector(`[data-dow-open="${i}"]`).checked;
    const start = root.querySelector(`[data-dow-start="${i}"]`).value;
    const end = root.querySelector(`[data-dow-end="${i}"]`).value;
    wh[i] = open ? { closed: false, open: start, close: end } : { closed: true };
  }
  const slotInterval = parseInt(document.getElementById('if-slot-interval').value, 10) || 30;
  await db.collection('businesses').doc(adminState.businessId).update({ workingHours: wh, slotInterval });
  adminState.business.workingHours = wh;
  adminState.business.slotInterval = slotInterval;
  const btn = document.getElementById('if-save-hours');
  btn.textContent = 'Mentve ✓';
  setTimeout(() => { btn.textContent = 'Mentés'; }, 1500);
}

// ---------- Segédfüggvények ----------
function formatPrice(p) {
  if (p === undefined || p === null) return '';
  return new Intl.NumberFormat('hu-HU').format(p) + ' Ft';
}
function formatDateHuShort(key) {
  const [y, m, d] = key.split('-').map(Number);
  return `${pad2(m)}.${pad2(d)}.`;
}
function pad2(n) { return String(n).padStart(2, '0'); }
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}
