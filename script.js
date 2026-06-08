const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
let calYear = 2026, calMonth = 4;
let selectedRoom = null;
let currentStatusFilter = 'all';

const BOOKED_DATES = [
  '2026-05-18','2026-05-19','2026-05-20',
  '2026-05-25','2026-05-26',
  '2026-06-05','2026-06-06','2026-06-12'
];

let reservations = JSON.parse(localStorage.getItem("reservations")) || [];
let nextId = reservations.length
  ? Math.max(...reservations.map(r => r.id)) + 1
  : 1;

function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  const btns = document.querySelectorAll('.nav-btn');
  const map = { home: 0, reserve: 1, list: 2 };
  if (map[page] !== undefined) btns[map[page]].classList.add('active');
  if (page === 'list') renderList();
  if (page === 'reserve') renderCalendar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderCalendar() {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('calTitle').textContent = months[calMonth] + ' ' + calYear;
  const dayNames = document.getElementById('calDayNames');
  dayNames.innerHTML = DAYS.map(d => `<div class="cal-day-name">${d}</div>`).join('');
  const grid = document.getElementById('calDates');
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date();
  let html = '';
  for (let i = 0; i < firstDay; i++) html += `<div class="cal-date empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = calYear + '-' + String(calMonth+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    const isBooked = BOOKED_DATES.includes(ds);
    const isToday = today.getFullYear()===calYear && today.getMonth()===calMonth && today.getDate()===d;
    const ci = document.getElementById('checkIn')?.value;
    const co = document.getElementById('checkOut')?.value;
    const isSel = ds===ci || ds===co;
    let cls = 'cal-date';
    if (isBooked) cls += ' booked';
    else if (isSel) cls += ' selected';
    else if (isToday) cls += ' today';
    const click = !isBooked ? `onclick="calClick('${ds}')"` : '';
    html += `<div class="${cls}" ${click}>${d}</div>`;
  }
  grid.innerHTML = html;
}

function calClick(ds) {
  const ci = document.getElementById('checkIn');
  const co = document.getElementById('checkOut');
  if (!ci.value || (ci.value && co.value)) { ci.value = ds; co.value = ''; }
  else if (ds > ci.value) { co.value = ds; }
  else { ci.value = ds; }
  updateSummary(); renderCalendar();
}

function changeMonth(dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
}

function selectRoom(el, name, type, rate) {
  document.querySelectorAll('.room-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  selectedRoom = { name, type, rate };
  updateSummary();
}

function updateSummary() {
  const ci = document.getElementById('checkIn')?.value;
  const co = document.getElementById('checkOut')?.value;
  document.getElementById('sumRoom').textContent = selectedRoom ? selectedRoom.name : '— Select above';
  document.getElementById('sumRate').textContent = selectedRoom ? '₱' + selectedRoom.rate.toLocaleString() + '/night' : '—';
  document.getElementById('sumIn').textContent = ci ? formatDate(ci) : '—';
  document.getElementById('sumOut').textContent = co ? formatDate(co) : '—';
  if (ci && co && selectedRoom) {
    const diff = Math.round((new Date(co) - new Date(ci)) / 86400000);
    if (diff > 0) {
      document.getElementById('sumDays').textContent = diff + (diff === 1 ? ' night' : ' nights');
      document.getElementById('sumTotal').textContent = '₱' + (diff * selectedRoom.rate).toLocaleString();
      return;
    }
  }
  document.getElementById('sumDays').textContent = '—';
  document.getElementById('sumTotal').textContent = '₱ —';
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function submitReservation() {
  const name = document.getElementById('guestName').value.trim();
  const email = document.getElementById('guestEmail').value.trim();
  const phone = document.getElementById('guestPhone').value.trim();
  const ci = document.getElementById('checkIn').value;
  const co = document.getElementById('checkOut').value;
  if (!name || !email || !phone || !selectedRoom || !ci || !co) {
    showToast('⚠️ Please fill in all required fields.'); return;
  }
  const diff = Math.round((new Date(co) - new Date(ci)) / 86400000);
  if (diff <= 0) { showToast('⚠️ Check-out must be after check-in.'); return; }
  const hasConflict = reservations.some(r =>
    r.room === selectedRoom.name &&
    r.status !== 'Cancelled' &&
    !(co <= r.checkIn || ci >= r.checkOut)
  );
  if (hasConflict) { showToast('❌ Conflict detected! Those dates are already reserved for this room.'); return; }
  reservations.push({
    id: nextId++, name, email, phone,
    room: selectedRoom.name, roomType: selectedRoom.type,
    checkIn: ci, checkOut: co,
    guests: document.getElementById('guests').value,
    requests: document.getElementById('requests').value,
    status: 'Pending',
    total: diff * selectedRoom.rate
  });
  showToast('✅ Reservation submitted! Status: Pending review.');
  document.getElementById('guestName').value = '';
  document.getElementById('guestEmail').value = '';
  document.getElementById('guestPhone').value = '';
  document.getElementById('checkIn').value = '';
  document.getElementById('checkOut').value = '';
  document.getElementById('requests').value = '';
  document.querySelectorAll('.room-opt').forEach(o => o.classList.remove('selected'));
  selectedRoom = null;
  updateSummary();
  setTimeout(() => showPage('list'), 1500);
}

function filterStatus(status, el) {
  currentStatusFilter = status;
  document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderList();
}

function renderList() {
  const roomFilter = document.getElementById('roomFilter').value;
  const dateFilter = document.getElementById('dateFilter').value;
  const today = new Date().toISOString().split('T')[0];

  const filtered = reservations.filter(r => {
    if (currentStatusFilter !== 'all' && r.status !== currentStatusFilter) return false;
    if (roomFilter && r.room !== roomFilter) return false;
    if (dateFilter === 'upcoming' && r.checkIn < today) return false;
    if (dateFilter === 'past' && r.checkIn >= today) return false;
    return true;
  });

  document.getElementById('count-all').textContent = reservations.length;
  ['Pending','Approved','Completed'].forEach(s => {
    document.getElementById('count-'+s.toLowerCase()).textContent = reservations.filter(r => r.status === s).length;
  });

  const icons = { ocean:'🌊', garden:'🌿', villa:'🏛️', hall:'✨' };
  const statusClass = { Pending:'status-pending', Approved:'status-approved', Completed:'status-completed', Cancelled:'status-cancelled' };

  if (filtered.length === 0) {
    document.getElementById('reservationList').innerHTML =
      `<div class="empty-state"><div class="empty-state-icon">🏖️</div><p>No reservations found for the selected filters.</p></div>`;
    return;
  }

  document.getElementById('reservationList').innerHTML = filtered.map(r => `
    <div class="reservation-card" id="card-${r.id}">
      <div class="res-icon ${r.roomType}">${icons[r.roomType] || '🏨'}</div>
      <div class="res-info">
        <div class="res-name">${r.room} — ${r.name}</div>
        <div class="res-meta">
          <span>📅 ${formatDate(r.checkIn)} → ${formatDate(r.checkOut)}</span>
          <span>👥 ${r.guests}</span>
          <span>💰 ₱${r.total.toLocaleString()}</span>
          ${r.requests ? `<span>📝 ${r.requests}</span>` : ''}
        </div>
      </div>
      <div class="res-status"><span class="status-pill ${statusClass[r.status]}">${r.status}</span></div>
      <div class="res-actions">
        ${r.status === 'Pending' ? `<button class="action-btn" onclick="approveRes(${r.id})">✓ Approve</button>` : ''}
        ${r.status !== 'Completed' && r.status !== 'Cancelled' ? `<button class="action-btn success" onclick="markDone(${r.id})">✔ Done</button>` : ''}
        ${r.status !== 'Cancelled' && r.status !== 'Completed' ? `<button class="action-btn danger" onclick="promptCancel(${r.id})">✕ Cancel</button>` : ''}
      </div>
    </div>`).join('');
}

function promptCancel(id) {
  const r = reservations.find(x => x.id === id);
  openModal(
    'Cancel Reservation',
    `Cancel the booking for <strong>${r.room}</strong> for <strong>${r.name}</strong>? This cannot be undone.`,
    () => { r.status = 'Cancelled'; closeModal(); renderList(); showToast('Reservation cancelled.'); },
    'Cancel Booking', false
  );
}

function markDone(id) {
  const r = reservations.find(x => x.id === id);
  openModal(
    'Mark as Completed',
    `Mark <strong>${r.name}</strong>'s stay at <strong>${r.room}</strong> as completed?`,
    () => { r.status = 'Completed'; closeModal(); renderList(); showToast('✅ Marked as completed!'); },
    'Mark Complete', true
  );
}

function approveRes(id) {
  const r = reservations.find(x => x.id === id);
  r.status = 'Approved'; renderList(); showToast('✅ Reservation approved!');
}

function openModal(title, msg, action, btnLabel, isOk) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalMsg').innerHTML = msg;
  const btn = document.getElementById('modalConfirm');
  btn.textContent = btnLabel || 'Confirm';
  btn.className = 'modal-confirm' + (isOk ? ' ok' : '');
  btn.onclick = action;
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

function registerUser() {
  const name = regName.value;
  const email = regEmail.value;
  const pass = regPass.value;

  if (!name || !email || !pass) {
    alert("Please fill in all fields");
    return;
  }

  let users = JSON.parse(localStorage.getItem("users")) || [];

  if (users.find(u => u.email === email)) {
    alert("Email already registered");
    return;
  }

  users.push({ name, email, pass });
  localStorage.setItem("users", JSON.stringify(users));

  alert("Account created successfully!");
  showPage('home');
}

// Init
renderCalendar();
renderList();