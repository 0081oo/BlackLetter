'use strict';

// ── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'blackletter_memos';

function loadMemos() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveMemos(memos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
}

// ── State ─────────────────────────────────────────────────────────────────────

let memos = loadMemos();          // [{ id, title, body, size, createdAt, updatedAt }]
let editingId = null;             // null = creating new
let pendingDeleteId = null;

// ── DOM refs ─────────────────────────────────────────────────────────────────

const grid            = document.getElementById('memo-grid');
const btnNew          = document.getElementById('btn-new');
const modalOverlay    = document.getElementById('modal-overlay');
const modalTitle      = document.getElementById('modal-title');
const modalClose      = document.getElementById('modal-close');
const titleInput      = document.getElementById('memo-title-input');
const bodyInput       = document.getElementById('memo-body-input');
const btnSave         = document.getElementById('btn-save');
const btnCancel       = document.getElementById('btn-cancel');
const confirmOverlay  = document.getElementById('confirm-overlay');
const btnConfirmDel   = document.getElementById('btn-confirm-delete');
const btnConfirmCan   = document.getElementById('btn-confirm-cancel');

// ── Render ────────────────────────────────────────────────────────────────────

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
       + '  '
       + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function renderGrid() {
  grid.innerHTML = '';

  if (memos.length === 0) {
    grid.innerHTML = '<p class="memo-empty">The scriptorium is empty. Begin thy writing.</p>';
    return;
  }

  // newest first
  [...memos].reverse().forEach(memo => {
    const card = document.createElement('article');
    card.className = 'memo-card';
    card.dataset.id = memo.id;

    const size = memo.size || 'm';

    card.innerHTML = `
      ${memo.title ? `<h3 class="memo-card-title">${escHtml(memo.title)}</h3>` : ''}
      <p class="memo-card-body font-${size}">${escHtml(memo.body)}</p>
      <span class="memo-card-date">${formatDate(memo.updatedAt || memo.createdAt)}</span>
      <div class="memo-card-footer">
        <div class="size-controls">
          <button class="btn-size ${size === 's' ? 'active' : ''}" data-size="s" data-id="${memo.id}">S</button>
          <button class="btn-size ${size === 'm' ? 'active' : ''}" data-size="m" data-id="${memo.id}">M</button>
          <button class="btn-size ${size === 'l' ? 'active' : ''}" data-size="l" data-id="${memo.id}">L</button>
        </div>
        <div class="card-actions">
          <button class="btn-icon btn-icon--edit" data-id="${memo.id}">Edit</button>
          <button class="btn-icon btn-icon--delete" data-id="${memo.id}">Delete</button>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getMemo(id) {
  return memos.find(m => m.id === id);
}

// ── Modal helpers ─────────────────────────────────────────────────────────────

function openModal(memo = null) {
  editingId = memo ? memo.id : null;
  modalTitle.textContent = memo ? 'Edit Memo' : 'New Memo';
  titleInput.value = memo ? memo.title : '';
  bodyInput.value  = memo ? memo.body  : '';
  modalOverlay.classList.remove('hidden');
  bodyInput.focus();
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  editingId = null;
}

function openConfirm(id) {
  pendingDeleteId = id;
  confirmOverlay.classList.remove('hidden');
}

function closeConfirm() {
  confirmOverlay.classList.add('hidden');
  pendingDeleteId = null;
}

// ── Actions ───────────────────────────────────────────────────────────────────

function createMemo(title, body) {
  const now = new Date().toISOString();
  memos.push({ id: crypto.randomUUID(), title: title.trim(), body: body.trim(), size: 'm', createdAt: now, updatedAt: now });
  saveMemos(memos);
  renderGrid();
}

function updateMemo(id, title, body) {
  const memo = getMemo(id);
  if (!memo) return;
  memo.title     = title.trim();
  memo.body      = body.trim();
  memo.updatedAt = new Date().toISOString();
  saveMemos(memos);
  renderGrid();
}

function deleteMemo(id) {
  memos = memos.filter(m => m.id !== id);
  saveMemos(memos);
  renderGrid();
}

function setSize(id, size) {
  const memo = getMemo(id);
  if (!memo) return;
  memo.size = size;
  saveMemos(memos);
  renderGrid();
}

function handleSave() {
  const title = titleInput.value;
  const body  = bodyInput.value.trim();
  if (!body) { bodyInput.focus(); return; }

  if (editingId) {
    updateMemo(editingId, title, body);
  } else {
    createMemo(title, body);
  }
  closeModal();
}

// ── Event delegation ──────────────────────────────────────────────────────────

grid.addEventListener('click', e => {
  const editBtn   = e.target.closest('.btn-icon--edit');
  const deleteBtn = e.target.closest('.btn-icon--delete');
  const sizeBtn   = e.target.closest('.btn-size');

  if (editBtn) {
    const memo = getMemo(editBtn.dataset.id);
    if (memo) openModal(memo);
    return;
  }

  if (deleteBtn) {
    openConfirm(deleteBtn.dataset.id);
    return;
  }

  if (sizeBtn) {
    setSize(sizeBtn.dataset.id, sizeBtn.dataset.size);
    return;
  }
});

// ── Button listeners ──────────────────────────────────────────────────────────

btnNew.addEventListener('click', () => openModal());
modalClose.addEventListener('click', closeModal);
btnCancel.addEventListener('click', closeModal);
btnSave.addEventListener('click', handleSave);

modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
});

btnConfirmDel.addEventListener('click', () => {
  if (pendingDeleteId) deleteMemo(pendingDeleteId);
  closeConfirm();
});

btnConfirmCan.addEventListener('click', closeConfirm);

confirmOverlay.addEventListener('click', e => {
  if (e.target === confirmOverlay) closeConfirm();
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!confirmOverlay.classList.contains('hidden')) { closeConfirm(); return; }
    if (!modalOverlay.classList.contains('hidden'))   { closeModal();   return; }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    if (!modalOverlay.classList.contains('hidden')) handleSave();
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────

renderGrid();
