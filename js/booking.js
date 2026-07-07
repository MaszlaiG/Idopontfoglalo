// ============================================================
// IDŐPONTFOGLALÓ WIDGET — booking.js
// A businessId-t az URL ?business=XYZ paraméterből olvassa ki,
// hogy egyetlen widget több különböző vállalkozáshoz is
// használható legyen (multi-tenant).
// ============================================================

const HU_HONAPOK = ["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"];
const HU_NAPOK = ["V","H","K","Sze","Cs","P","Szo"];

const state = {
  businessId: null,
  business: null,
  step: 1, // 1: szolgáltatás, 2: időpont, 3: adatok, 4: kész
  selectedService: null,
  calMonth: new Date().getMonth(),
  calYear: new Date().getFullYear(),
  selectedDate: null, // "YYYY-MM-DD"
  selectedTime: null, // "HH:MM"
  lockedTimes: new Set(), // az adott napra zárolt (slotInterval-granularitású) blokk-időpontok
};

// Az adott kezdő időponthoz és időtartamhoz tartozó "blokk-időpontok" listája,
// a slotInterval rácshoz igazítva. Ezek alapján zárolunk/ellenőrzünk ütközést —
// ez a rács minden szolgáltatásra ugyanaz, függetlenül azok időtartamától.
function blockTimesFor(startTime, duration) {
  const interval = state.business.slotInterval || 30;
  const [h, m] = startTime.split(':').map(Number);
  let t = h * 60 + m;
  const end = t + duration;
  const times = [];
  for (; t < end; t += interval) {
    times.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
  }
  return times;
}

const root = document.getElementById('if-root');

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function pad(n) { return String(n).padStart(2, '0'); }
function dateKey(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function todayKey() {
  const t = new Date();
  return dateKey(t.getFullYear(), t.getMonth(), t.getDate());
}

async function init() {
  state.businessId = getParam('business') || document.body.dataset.business;
  if (!state.businessId) {
    renderError('Hiányzik a "business" azonosító. A beágyazó kódban add meg: ?business=AZONOSITO');
    return;
  }
  renderLoading('Adatok betöltése…');
  try {
    const doc = await db.collection('businesses').doc(state.businessId).get();
    if (!doc.exists) {
      renderError('Nem található ilyen azonosítójú vállalkozás.');
      return;
    }
    state.business = doc.data();
    applyTheme(state.business.theme);
    render();
  } catch (err) {
    console.error(err);
    renderError('Hiba történt az adatok betöltésekor. Próbáld újra később.');
  }
}

function applyTheme(theme) {
  if (!theme) return;
  const r = document.documentElement.style;
  if (theme.primary) r.setProperty('--if-primary', theme.primary);
  if (theme.primaryDark) r.setProperty('--if-primary-dark', theme.primaryDark);
  if (theme.accent) r.setProperty('--if-accent', theme.accent);
  if (theme.font) r.setProperty('--if-font', theme.font);
}

function renderLoading(msg) {
  root.innerHTML = `<div class="if-container"><div class="if-loading"><div class="if-spinner"></div>${msg}</div></div>`;
}

function renderError(msg) {
  root.innerHTML = `<div class="if-container"><div class="if-error-box">${msg}</div></div>`;
}

function stepsHtml() {
  let dots = '';
  for (let i = 1; i <= 4; i++) {
    let cls = '';
    if (i === state.step) cls = 'if-active';
    else if (i < state.step) cls = 'if-done';
    dots += `<div class="if-step-dot ${cls}"></div>`;
  }
  return `<div class="if-steps">${dots}</div>`;
}

function render() {
  const b = state.business;
  let body = '';
  if (state.step === 1) body = renderServiceStep();
  else if (state.step === 2) body = renderDateTimeStep();
  else if (state.step === 3) body = renderDetailsStep();
  else if (state.step === 4) body = renderConfirmStep();

  root.innerHTML = `
    <div class="if-container">
      <div class="if-header">
        <p class="if-business-name">${escapeHtml(b.name || 'Időpontfoglalás')}</p>
        <p class="if-business-sub">${state.step === 4 ? 'Foglalás visszaigazolva' : 'Foglalj időpontot néhány kattintással'}</p>
      </div>
      ${stepsHtml()}
      <div class="if-card">${body}</div>
      <p class="if-footer-note">Powered by Időpontfoglaló</p>
    </div>
  `;
  attachStepHandlers();
}

// ---------- 1. lépés: szolgáltatás ----------
function renderServiceStep() {
  const services = state.business.services || [];
  if (services.length === 0) {
    return `<p class="if-no-slots">Jelenleg nincs elérhető szolgáltatás.</p>`;
  }
  const items = services.map(s => `
    <div class="if-service-item ${state.selectedService && state.selectedService.id === s.id ? 'if-selected' : ''}" data-service-id="${s.id}">
      <div>
        <div class="if-service-name">${escapeHtml(s.name)}</div>
        <div class="if-service-meta">${s.duration} perc</div>
      </div>
      <div class="if-service-price">${formatPrice(s.price)}</div>
    </div>
  `).join('');
  return `
    <p class="if-section-title">Válassz szolgáltatást</p>
    <div class="if-service-list">${items}</div>
    <div class="if-nav-row">
      <button class="if-btn if-btn-primary if-btn-block" id="if-next-1" ${state.selectedService ? '' : 'disabled'}>Tovább</button>
    </div>
  `;
}

// ---------- 2. lépés: dátum + időpont ----------
function renderDateTimeStep() {
  const cal = renderCalendar();
  const slots = state.selectedDate ? renderSlots() : `<p class="if-no-slots">Válassz egy dátumot a naptárban</p>`;
  return `
    <p class="if-section-title">Válassz dátumot</p>
    ${cal}
    <p class="if-section-title" style="margin-top:20px;">Elérhető időpontok</p>
    <div id="if-slots-wrap">${slots}</div>
    <div class="if-nav-row">
      <button class="if-btn if-btn-ghost" id="if-back-2">Vissza</button>
      <button class="if-btn if-btn-primary" id="if-next-2" ${state.selectedTime ? '' : 'disabled'}>Tovább</button>
    </div>
  `;
}

function renderCalendar() {
  const y = state.calYear, m = state.calMonth;
  const first = new Date(y, m, 1);
  const startDow = first.getDay(); // 0=Sun
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = todayKey();

  let cells = '';
  for (let i = 0; i < startDow; i++) cells += `<div class="if-cal-day if-empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const key = dateKey(y, m, d);
    const dow = new Date(y, m, d).getDay();
    const wh = (state.business.workingHours || {})[dow];
    const closedDates = state.business.closedDates || [];
    const isPast = key < today;
    const isClosed = !wh || wh.closed || closedDates.includes(key);
    const disabled = isPast || isClosed;
    let cls = 'if-cal-day';
    if (disabled) cls += ' if-disabled';
    else cls += ' if-available';
    if (key === today) cls += ' if-today';
    if (key === state.selectedDate) cls += ' if-selected';
    cells += `<div class="${cls}" ${disabled ? '' : `data-date="${key}"`}>${d}</div>`;
  }

  const canGoPrev = !(y === new Date().getFullYear() && m === new Date().getMonth());

  return `
    <div class="if-cal-header">
      <button class="if-cal-nav" id="if-cal-prev" ${canGoPrev ? '' : 'disabled'}>‹</button>
      <span class="if-cal-month">${HU_HONAPOK[m]} ${y}</span>
      <button class="if-cal-nav" id="if-cal-next">›</button>
    </div>
    <div class="if-cal-grid">
      ${HU_NAPOK.map(d => `<div class="if-cal-dow">${d}</div>`).join('')}
      ${cells}
    </div>
  `;
}

function generateDaySlots() {
  const dow = new Date(state.selectedDate + 'T00:00:00').getDay();
  const wh = (state.business.workingHours || {})[dow];
  if (!wh || wh.closed) return [];
  const interval = state.business.slotInterval || 30;
  const duration = state.selectedService.duration;

  const [openH, openM] = wh.open.split(':').map(Number);
  const [closeH, closeM] = wh.close.split(':').map(Number);
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;

  const slots = [];
  for (let t = openMin; t + duration <= closeMin; t += interval) {
    const h = Math.floor(t / 60), mi = t % 60;
    slots.push(`${pad(h)}:${pad(mi)}`);
  }
  return slots;
}

function isSlotTaken(slot) {
  const duration = state.selectedService.duration;
  return blockTimesFor(slot, duration).some(t => state.lockedTimes.has(t));
}

function renderSlots() {
  const slots = generateDaySlots();
  if (slots.length === 0) return `<p class="if-no-slots">Ezen a napon nincs elérhető időpont</p>`;
  const items = slots.map(s => {
    const taken = isSlotTaken(s);
    const selected = s === state.selectedTime;
    return `<div class="if-slot ${taken ? 'if-taken' : ''} ${selected ? 'if-selected' : ''}" ${taken ? '' : `data-time="${s}"`}>${s}</div>`;
  }).join('');
  return `<div class="if-slot-grid">${items}</div>`;
}

// ---------- 3. lépés: adatok ----------
function renderDetailsStep() {
  return `
    <p class="if-section-title">Foglalás összegzése</p>
    <div class="if-summary-row"><span class="if-summary-label">Szolgáltatás</span><span class="if-summary-value">${escapeHtml(state.selectedService.name)}</span></div>
    <div class="if-summary-row"><span class="if-summary-label">Dátum</span><span class="if-summary-value">${formatDateHu(state.selectedDate)}</span></div>
    <div class="if-summary-row"><span class="if-summary-label">Időpont</span><span class="if-summary-value">${state.selectedTime}</span></div>
    <div class="if-summary-row"><span class="if-summary-label">Ár</span><span class="if-summary-value">${formatPrice(state.selectedService.price)}</span></div>

    <p class="if-section-title" style="margin-top:20px;">Elérhetőségeid</p>
    <div id="if-form-error"></div>
    <div class="if-field">
      <label class="if-label">Teljes név *</label>
      <input class="if-input" id="if-name" type="text" placeholder="Kovács Anna" required>
    </div>
    <div class="if-field">
      <label class="if-label">Telefonszám *</label>
      <input class="if-input" id="if-phone" type="tel" placeholder="+36 30 123 4567" required>
    </div>
    <div class="if-field">
      <label class="if-label">E-mail cím</label>
      <input class="if-input" id="if-email" type="email" placeholder="nev@pelda.hu">
    </div>
    <div class="if-field">
      <label class="if-label">Megjegyzés</label>
      <textarea class="if-textarea" id="if-note" placeholder="Bármi, amit tudnunk kell (opcionális)"></textarea>
    </div>

    <div class="if-nav-row">
      <button class="if-btn if-btn-ghost" id="if-back-3">Vissza</button>
      <button class="if-btn if-btn-primary" id="if-submit">Foglalás véglegesítése</button>
    </div>
  `;
}

// ---------- 4. lépés: visszaigazolás ----------
function renderConfirmStep() {
  return `
    <div class="if-confirm-icon">✓</div>
    <p class="if-confirm-title">Foglalás megerősítve!</p>
    <p class="if-confirm-sub">Hamarosan felvesszük veled a kapcsolatot a megadott elérhetőségen.</p>
    <div class="if-summary-row"><span class="if-summary-label">Szolgáltatás</span><span class="if-summary-value">${escapeHtml(state.selectedService.name)}</span></div>
    <div class="if-summary-row"><span class="if-summary-label">Dátum</span><span class="if-summary-value">${formatDateHu(state.selectedDate)}</span></div>
    <div class="if-summary-row"><span class="if-summary-label">Időpont</span><span class="if-summary-value">${state.selectedTime}</span></div>
    <div class="if-nav-row">
      <button class="if-btn if-btn-primary if-btn-block" id="if-new-booking">Új foglalás</button>
    </div>
  `;
}

// ---------- Eseménykezelők ----------
function attachStepHandlers() {
  if (state.step === 1) {
    root.querySelectorAll('[data-service-id]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.serviceId;
        state.selectedService = state.business.services.find(s => s.id === id);
        render();
      });
    });
    const nextBtn = document.getElementById('if-next-1');
    if (nextBtn) nextBtn.addEventListener('click', () => { state.step = 2; render(); });
  }

  if (state.step === 2) {
    const prev = document.getElementById('if-cal-prev');
    const next = document.getElementById('if-cal-next');
    if (prev) prev.addEventListener('click', () => { shiftMonth(-1); });
    if (next) next.addEventListener('click', () => { shiftMonth(1); });

    root.querySelectorAll('[data-date]').forEach(el => {
      el.addEventListener('click', async () => {
        state.selectedDate = el.dataset.date;
        state.selectedTime = null;
        render();
        await loadLockedSlotsForDate(state.selectedDate);
        renderSlotsInPlace();
      });
    });

    root.querySelectorAll('[data-time]').forEach(el => {
      el.addEventListener('click', () => {
        state.selectedTime = el.dataset.time;
        render();
      });
    });

    document.getElementById('if-back-2').addEventListener('click', () => { state.step = 1; render(); });
    const nextBtn = document.getElementById('if-next-2');
    if (nextBtn) nextBtn.addEventListener('click', () => { state.step = 3; render(); });
  }

  if (state.step === 3) {
    document.getElementById('if-back-3').addEventListener('click', () => { state.step = 2; render(); });
    document.getElementById('if-submit').addEventListener('click', submitBooking);
  }

  if (state.step === 4) {
    document.getElementById('if-new-booking').addEventListener('click', () => {
      state.step = 1;
      state.selectedService = null;
      state.selectedDate = null;
      state.selectedTime = null;
      render();
    });
  }
}

function shiftMonth(delta) {
  let m = state.calMonth + delta;
  let y = state.calYear;
  if (m < 0) { m = 11; y--; }
  if (m > 11) { m = 0; y++; }
  state.calMonth = m;
  state.calYear = y;
  state.selectedDate = null;
  state.selectedTime = null;
  render();
}

async function loadLockedSlotsForDate(dateKeyStr) {
  const wrap = document.getElementById('if-slots-wrap');
  if (wrap) wrap.innerHTML = `<div class="if-loading" style="padding:20px;"><div class="if-spinner"></div>Betöltés…</div>`;
  try {
    // A slotLocks gyűjtemény csak dátum/idő "zárakat" tartalmaz, semmilyen
    // személyes ügyféladatot nem — ez teszi lehetővé, hogy az elérhetőség
    // nyilvánosan, biztonságosan lekérdezhető legyen.
    const snap = await db.collection('businesses').doc(state.businessId)
      .collection('slotLocks')
      .where('date', '==', dateKeyStr)
      .get();
    state.lockedTimes = new Set(snap.docs.map(d => d.data().time));
  } catch (err) {
    console.error(err);
    state.lockedTimes = new Set();
  }
}

function renderSlotsInPlace() {
  const wrap = document.getElementById('if-slots-wrap');
  if (!wrap) return;
  wrap.innerHTML = state.selectedDate ? renderSlots() : `<p class="if-no-slots">Válassz egy dátumot a naptárban</p>`;
  wrap.querySelectorAll('[data-time]').forEach(el => {
    el.addEventListener('click', () => {
      state.selectedTime = el.dataset.time;
      render();
    });
  });
}

async function submitBooking() {
  const name = document.getElementById('if-name').value.trim();
  const phone = document.getElementById('if-phone').value.trim();
  const email = document.getElementById('if-email').value.trim();
  const note = document.getElementById('if-note').value.trim();
  const errBox = document.getElementById('if-form-error');

  if (!name || !phone) {
    errBox.innerHTML = `<div class="if-error-box">Kérjük, add meg a neved és telefonszámod.</div>`;
    return;
  }

  const submitBtn = document.getElementById('if-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Küldés…';

  const businessRef = db.collection('businesses').doc(state.businessId);
  const blockTimes = blockTimesFor(state.selectedTime, state.selectedService.duration);
  const apptRef = businessRef.collection('appointments').doc();
  const lockRefs = blockTimes.map(t => businessRef.collection('slotLocks').doc(`${state.selectedDate}_${t}`));

  try {
    // Atomi tranzakció: egyetlen "mindent vagy semmit" műveletben ellenőrzi,
    // hogy egyik szükséges időblokk sincs még lefoglalva, és ha nincs,
    // egyszerre zárolja mindet + létrehozza a foglalást. Ez a Firestore
    // szerveroldali garanciája miatt akkor is kizárja a dupla foglalást,
    // ha két ember teljesen egyszerre küldi be ugyanazt az időpontot.
    await db.runTransaction(async (tx) => {
      for (const ref of lockRefs) {
        const snap = await tx.get(ref);
        if (snap.exists) {
          throw new Error('SLOT_TAKEN');
        }
      }
      lockRefs.forEach((ref, i) => {
        tx.set(ref, { date: state.selectedDate, time: blockTimes[i], appointmentId: apptRef.id });
      });
      tx.set(apptRef, {
        serviceId: state.selectedService.id,
        serviceName: state.selectedService.name,
        duration: state.selectedService.duration,
        price: state.selectedService.price,
        date: state.selectedDate,
        time: state.selectedTime,
        blockTimes: blockTimes,
        customerName: name,
        customerPhone: phone,
        customerEmail: email || null,
        note: note || null,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    state.step = 4;
    render();
  } catch (err) {
    console.error(err);
    if (err.message === 'SLOT_TAKEN') {
      errBox.innerHTML = `<div class="if-error-box">Sajnos ezt az időpontot időközben lefoglalták. Válassz másikat.</div>`;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Foglalás véglegesítése';
      state.step = 2;
      state.selectedTime = null;
      render();
      return;
    }
    errBox.innerHTML = `<div class="if-error-box">Hiba történt a foglalás mentésekor. Próbáld újra.</div>`;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Foglalás véglegesítése';
  }
}

// ---------- Segédfüggvények ----------
function formatPrice(p) {
  if (p === undefined || p === null) return '';
  return new Intl.NumberFormat('hu-HU').format(p) + ' Ft';
}
function formatDateHu(key) {
  const [y, m, d] = key.split('-').map(Number);
  return `${y}. ${HU_HONAPOK[m - 1]} ${d}.`;
}
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

init();
