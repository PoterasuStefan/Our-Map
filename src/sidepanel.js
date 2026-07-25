import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { fetchMyGroups, joinGroupByCode } from './groups.js';
import { filterMarkersByGroups } from './map.js';
import { openLoginModal } from './auth-ui.js';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase.js';
let map = null;
let selectedGroupIds = null;

export function initSidepanel(mapInstance) {
  map = mapInstance;

  const menuBtn = document.createElement('button');
  menuBtn.className = 'menu-btn';
  menuBtn.innerHTML = '&#9776;';
  document.body.appendChild(menuBtn);

  const panel = document.createElement('div');
  panel.className = 'sidepanel';
  document.body.appendChild(panel);

  const backdrop = document.createElement('div');
  backdrop.className = 'sidepanel-backdrop';
  document.body.appendChild(backdrop);

  function openPanel() {
    panel.classList.add('open');
    backdrop.classList.add('open');
    renderPanel(panel);
  }
  function closePanel() {
    panel.classList.remove('open');
    backdrop.classList.remove('open');
  }

  menuBtn.addEventListener('click', openPanel);
  backdrop.addEventListener('click', closePanel);

  onAuthStateChanged(auth, () => {
    if (panel.classList.contains('open')) renderPanel(panel);
  });

  checkJoinCodeFromUrl();
}

// ---------- Alaturare automata la grup printr-un link ----------

function checkJoinCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('joinCode');
  if (!code) return;

  // curatam URL-ul ca sa nu ramana codul vizibil si sa nu se reincerce la refresh
  window.history.replaceState({}, '', window.location.pathname);

  const tryJoin = async () => {
    try {
      const { group, role } = await joinGroupByCode(code);
      alert(`Te-ai alaturat grupului "${group.name}" ca ${role === 'editor' ? 'editor' : 'vizitator'}.`);
      selectedGroupIds = null;
    } catch (e) {
      alert(e.message);
    }
  };

  if (auth.currentUser) {
    tryJoin();
  } else {
    openLoginModal();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        tryJoin();
        unsubscribe();
      }
    });
  }
}

// ---------- Panoul lateral ----------

async function renderPanel(panel) {
  const user = auth.currentUser;

  if (!user) {
    panel.innerHTML = `
      <div class="sidepanel-header"><h3>Meniu</h3></div>
      <div class="sidepanel-body">
        <button id="login-btn" class="sidepanel-primary-btn">Login</button>
        <p class="sidepanel-hint">Log in to start creating and sharing maps with your friends</p>
      </div>
    `;
    panel.querySelector('#login-btn').addEventListener('click', () => openLoginModal());
    return;
  }

  panel.innerHTML = `
    <div class="sidepanel-header">
      <h3>Meniu</h3>
      <span class="sidepanel-user">${user.email}</span>
    </div>
    <div class="sidepanel-body">
      <h4>Filtreaza dupa grup</h4>
      <div id="sidepanel-groups"><p>Se incarca...</p></div>
      <button id="import-group-btn" class="sidepanel-secondary-btn">Importa un grup</button>
      <button id="settings-panel-btn" class="sidepanel-secondary-btn">⚙️ Setări</button>
      <button id="logout-btn" class="sidepanel-logout-btn">Log out</button>
    </div>
  `;

  panel.querySelector('#logout-btn').addEventListener('click', async () => {
    await signOut(auth);
  });

  panel.querySelector('#import-group-btn').addEventListener('click', () => openImportGroupModal(panel));
  panel.querySelector('#settings-panel-btn').addEventListener('click', () => openAppSettings(panel));
  const groups = await fetchMyGroups();
  renderGroupFilters(panel, groups);
}

function renderGroupFilters(panel, groups) {
  const container = panel.querySelector('#sidepanel-groups');
  if (!container) return;

  if (groups.length === 0) {
    container.innerHTML = '<p class="group-empty">Nu esti inca in niciun grup.</p>';
    return;
  }

  if (selectedGroupIds === null) {
    selectedGroupIds = new Set(groups.map(g => g.id));
  }

  container.innerHTML = groups.map(g => `
    <label class="group-row">
      <input type="checkbox" class="sidepanel-group-checkbox" data-id="${g.id}" ${selectedGroupIds.has(g.id) ? 'checked' : ''} />
      <span class="group-swatch" style="background:${g.color}"></span>
      <span>${g.name}</span>
      ${g.role === 'owner' ? `<span class="group-share-icon" data-id="${g.id}" title="Share">&#128279;</span>` : ''}
      <span class="group-role">${g.role}</span>
    </label>
  `).join('');

  container.querySelectorAll('.sidepanel-group-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      if (e.target.checked) selectedGroupIds.add(id);
      else selectedGroupIds.delete(id);
      filterMarkersByGroups(map, selectedGroupIds);
    });
  });

  container.querySelectorAll('.group-share-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.preventDefault();  // altfel clickul "trece" prin label si bifeaza checkbox-ul
      e.stopPropagation();
      const group = groups.find(g => g.id === icon.dataset.id);
      if (group) openShareModal(group);
    });
  });

  filterMarkersByGroups(map, selectedGroupIds);
}

// ---------- Fereastra de share (stil Google Docs) ----------

function openShareModal(group) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal share-modal">
      <h3>Persoane cu acces</h3>
      <div class="share-owner-row">
        <span class="share-avatar">${(auth.currentUser.email || '?')[0].toUpperCase()}</span>
        <div>${auth.currentUser.email} (tu)</div>
        <span class="share-role-label">Owner</span>
      </div>
      <h4>Acces general</h4>
      <div class="share-general-row">
        <span class="share-link-icon">&#128279;</span>
        <div class="share-general-text">
          <div>Oricine are linkul</div>
          <div class="share-general-desc" id="share-desc">Poate doar vizualiza</div>
        </div>
        <select id="share-role-select">
          <option value="view" selected>Vizualizator</option>
          <option value="edit">Editor</option>
        </select>
      </div>
      <div class="modal-buttons">
        <button id="share-copy">Copiaza linkul</button>
        <button id="share-done">Gata</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  function currentLink() {
    const role = overlay.querySelector('#share-role-select').value;
    const code = role === 'edit' ? group.editCode : group.viewCode;
    return `${window.location.origin}${window.location.pathname}?joinCode=${code}`;
  }

  overlay.querySelector('#share-role-select').addEventListener('change', (e) => {
    overlay.querySelector('#share-desc').textContent =
      e.target.value === 'edit' ? 'Poate vizualiza si edita' : 'Poate doar vizualiza';
  });

  overlay.querySelector('#share-copy').addEventListener('click', async () => {
    const btn = overlay.querySelector('#share-copy');
    try {
      await navigator.clipboard.writeText(currentLink());
      btn.textContent = 'Copiat!';
      setTimeout(() => { btn.textContent = 'Copiaza linkul'; }, 1500);
    } catch (e) {
      alert('Linkul: ' + currentLink());
    }
  });

  overlay.querySelector('#share-done').addEventListener('click', () => overlay.remove());
}

// ---------- Import manual de grup (cod introdus de mana) ----------

function openImportGroupModal(panel) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>Importa un grup</h3>
      <input id="import-code" placeholder="Codul primit de la prieten" />
      <div class="modal-buttons">
        <button id="import-cancel">Anuleaza</button>
        <button id="import-confirm">Alatura-te</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#import-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#import-confirm').addEventListener('click', async () => {
    const code = overlay.querySelector('#import-code').value;
    if (!code) return;
    try {
      const { group, role } = await joinGroupByCode(code);
      alert(`Te-ai alaturat grupului "${group.name}" ca ${role === 'editor' ? 'editor' : 'vizitator'}.`);
      overlay.remove();
      selectedGroupIds = null;
      renderPanel(panel);
    } catch (e) {
      alert(e.message);
    }
  });
}
// ---------- Setări aplicație ----------

async function openAppSettings(panel) {
  const overlay = document.createElement('div');
  overlay.className = 'settings-overlay';

  const myGroups = await fetchMyGroups();

  const groupRowsHtml = myGroups.map(g => `
    <div class="app-settings-group-row">
      <span class="group-swatch" style="background:${g.color}"></span>
      <span>${g.name}</span>
      <span class="group-role">${g.role}</span>
      <div class="app-settings-group-actions">
        ${g.role === 'owner'
          ? `<button class="asga-color" data-id="${g.id}" data-color="${g.color}" title="Schimbă culoarea">🎨</button>
             <button class="asga-delete" data-id="${g.id}" title="Șterge grupul">🗑</button>`
          : `<button class="asga-leave" data-id="${g.id}" title="Ieși din grup">↩ Ieși</button>`
        }
      </div>
    </div>
  `).join('') || '<p class="group-empty">Nu ești în niciun grup.</p>';

  overlay.innerHTML = `
    <div class="settings-modal">
      <div class="settings-header">
        <span style="font-weight:700;color:#5b2c42">Setări</span>
        <span class="settings-close">&times;</span>
      </div>
      <div class="settings-body">

        <label>Dimensiune previzualizare poze</label>
        <div class="app-settings-size-row">
          <button class="size-opt" data-size="small">Mică<br><span>160px</span></button>
          <button class="size-opt" data-size="medium">Medie<br><span>240px</span></button>
          <button class="size-opt" data-size="large">Mare<br><span>320px</span></button>
        </div>

        <label style="margin-top:20px">Grupurile mele</label>
        <div id="app-groups-list">${groupRowsHtml}</div>

        <label style="margin-top:20px">Cont</label>
        <button id="delete-account-btn" class="delete-account-btn" disabled title="În curând">
          🗑 Șterge contul
        </button>
        <p style="font-size:11px;color:#bbb;margin:0">Această funcție va fi disponibilă în curând.</p>

      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.settings-close').addEventListener('click', () => overlay.remove());

  // --- Dimensiune poze ---
  const currentSize = localStorage.getItem('previewSize') || 'small';
  overlay.querySelectorAll('.size-opt').forEach(btn => {
    if (btn.dataset.size === currentSize) btn.classList.add('size-opt-active');
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.size-opt').forEach(b => b.classList.remove('size-opt-active'));
      btn.classList.add('size-opt-active');
      const size = btn.dataset.size;
      localStorage.setItem('previewSize', size);
      applyPreviewSize(size);
    });
  });

  // --- Culoare grup ---
  overlay.querySelectorAll('.asga-color').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'color';
      input.value = btn.dataset.color;
      input.style.display = 'none';
      document.body.appendChild(input);
      input.click();
      input.addEventListener('change', async () => {
        const newColor = input.value;
        try {
          await updateDoc(doc(db, 'groups', btn.dataset.id), { color: newColor });
          showToastPanel('Culoare actualizată! Reîncarcă pagina pentru a vedea schimbările pe toți pinii.');
        } catch(e) { alert(e.message); }
        input.remove();
      });
    });
  });

  // --- Șterge grup ---
  overlay.querySelectorAll('.asga-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Sigur vrei să ștergi grupul? Pinii din el vor rămâne, dar vor pierde apartenența la grup.')) return;
      try {
        await deleteDoc(doc(db, 'groups', btn.dataset.id));
        showToastPanel('Grup șters.');
        overlay.remove();
        openAppSettings(panel);
      } catch(e) { alert(e.message); }
    });
  });

  // --- Ieși din grup ---
  overlay.querySelectorAll('.asga-leave').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Sigur vrei să ieși din acest grup?')) return;
      try {
        const uid = auth.currentUser.uid;
        const q = query(
          collection(db, 'groupMembers'),
          where('groupId', '==', btn.dataset.id),
          where('uid', '==', uid)
        );
        const snap = await getDocs(q);
        for (const d of snap.docs) await deleteDoc(d.ref);
        showToastPanel('Ai ieșit din grup.');
        overlay.remove();
        openAppSettings(panel);
      } catch(e) { alert(e.message); }
    });
  });
}

function showToastPanel(msg) {
  const t = document.createElement('div');
  t.className = 'map-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function applyPreviewSize(size) {
  const sizes = { small: '160px', medium: '240px', large: '320px' };
  document.documentElement.style.setProperty('--carousel-img-size', sizes[size] || '160px');
}

// aplica dimensiunea salvata la incarcare
applyPreviewSize(localStorage.getItem('previewSize') || 'small');