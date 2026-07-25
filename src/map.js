import L from 'leaflet';
import { db, auth } from './firebase.js';
import {
  collection, addDoc, getDocs, doc,
  updateDoc, deleteDoc, serverTimestamp, query, where
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { fetchGroups, createGroup, fetchMyGroups } from './groups.js';

const CLOUD_NAME = 'xstotnnf';
const UPLOAD_PRESET = 'Upload Photos Unsigned';
const DEFAULT_PIN_COLOR = '#f291b9';

let openPinRef = null;
let mapClickOverride = null;
export function setMapClickOverride(fn) { mapClickOverride = fn; }
const allPins = [];
let mapInstance = null;

export function filterMarkersByGroups(map, selectedGroupIds) {
  allPins.forEach((pin) => {
    const visible =
      !selectedGroupIds ||
      selectedGroupIds.size === 0 ||
      !pin.groupIds ||
      pin.groupIds.length === 0 ||
      pin.groupIds.some((id) => selectedGroupIds.has(id));

    if (visible) {
      if (!map.hasLayer(pin._marker)) pin._marker.addTo(map);
    } else {
      if (pin._isOpen) closePin(map, pin);
      if (map.hasLayer(pin._marker)) map.removeLayer(pin._marker);
    }
  });
}

// ---------- Icon custom ----------

function pinSvg(color, size) {
  const w = size;
  const h = size * 1.64;
  return `
    <!-- Am adăugat style="overflow: visible;" aici -->
    <svg width="${w}" height="${h}" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg" style="overflow: visible;">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5s12.5-19.1 12.5-28.5C25 5.6 19.4 0 12.5 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="12.5" cy="12.5" r="5" fill="white" opacity="0.9"/>
    </svg>
  `;
}

function createPinIcon(color) {
  return L.divIcon({
    html: pinSvg(color || DEFAULT_PIN_COLOR, 25),
    className: 'custom-pin-icon',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
  });
}

// ---------- Init hartă ----------

export function initMap() {
  const map = L.map('map').setView([44.4268, 26.1025], 13);
  mapInstance = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // ascultam schimbarile de auth - reincarcam pinurile la login/logout
  onAuthStateChanged(auth, (user) => {
    clearAllMarkers(map);
    if (user) {
      loadPins(map);
      showMapHint(false);
    } else {
      showMapHint(true);
    }
  });

  // click pe harta = pin nou, DAR doar daca esti logat
 map.on('click', (e) => {
    if (mapClickOverride) {
      const fn = mapClickOverride;
      mapClickOverride = null; // auto-clear dupa un singur click
      fn(e);
      return;
    }
    if (!auth.currentUser) {
      showLoginRequired();
      return;
    }
    openNewPinForm(map, e.latlng);
  });

  return map;
}

function clearAllMarkers(map) {
  allPins.forEach(pin => {
    closePin(map, pin);
    if (map.hasLayer(pin._marker)) map.removeLayer(pin._marker);
  });
  allPins.length = 0;
  openPinRef = null;
}

// mesaj centrat pe harta cand nu esti logat
let hintEl = null;
function showMapHint(show) {
  if (show) {
    if (hintEl) return;
    hintEl = document.createElement('div');
    hintEl.className = 'map-login-hint';
    hintEl.innerHTML = `
      <div class="map-hint-box">
        <span>&#128205;</span>
        <p>Loghează-te pentru a vedea și adăuga locuri</p>
      </div>
    `;
    document.body.appendChild(hintEl);
  } else {
    if (hintEl) { hintEl.remove(); hintEl = null; }
  }
}

function showLoginRequired() {
  const toast = document.createElement('div');
  toast.className = 'map-toast';
  toast.textContent = 'Trebuie să te loghezi ca să adaugi un loc.';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ---------- Formular pentru pin nou ----------

function openNewPinForm(map, latlng) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="settings-modal">
      <div class="settings-header" style="background: linear-gradient(180deg, color-mix(in srgb, ${currentColor} 55%, white), ${currentColor})">
        <span class="settings-close">&times;</span>
      </div>
      <div class="settings-body">
        <div class="settings-pin-col">
          <div class="settings-pin-preview" id="settings-pin-preview">${pinSvg(currentColor, 48)}</div>
          <button id="settings-color-btn" class="settings-color-edit-btn">✏️ Culoare</button>
          <input id="settings-color" type="color" value="${currentColor}" style="display:none" />
        </div>
        <div class="settings-fields">
          <label>Titlu</label>
          <input id="settings-title" value="${(pin.title || '').replace(/"/g, '&quot;')}" />
          <label>Descriere</label>
          <textarea id="settings-desc" rows="6">${pin.description || ''}</textarea>
          <label>Poze</label>
          <div class="settings-photos-grid">${photosHtml}</div>
          <div class="file-upload-row">
            <label class="file-upload-btn" for="settings-add-photos">Adauga poze</label>
            <span class="file-upload-count" id="settings-photos-count"></span>
          </div>
          <input id="settings-add-photos" type="file" accept="image/*" multiple style="display:none" />
          <button id="settings-group">+ Adauga la grup de pinuri</button>
        </div>
      </div>
      <div class="settings-footer">
        <button id="settings-delete" class="delete-pin-btn">🗑 Șterge</button>
        <div class="settings-buttons">
          <button id="settings-cancel">Anulează</button>
          <button id="settings-save">Salvează</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#pin-photos').addEventListener('change', (e) => {
    const n = e.target.files.length;
    overlay.querySelector('#pin-photos-count').textContent = n ? `${n} poza(e) alese` : '';
  });

  overlay.querySelector('#pin-cancel').addEventListener('click', () => overlay.remove());

  overlay.querySelector('#pin-save').addEventListener('click', async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) { alert('Sesiunea a expirat. Te rog sa te loghezi din nou.'); overlay.remove(); return; }

    const title = overlay.querySelector('#pin-title').value || 'Fara titlu';
    const description = overlay.querySelector('#pin-desc').value;
    const files = overlay.querySelector('#pin-photos').files;

    overlay.querySelector('.modal').innerHTML = '<p>Se salveaza...</p>';

    try {
      const photoUrls = await uploadPhotos(files);

      const docRef = await addDoc(collection(db, 'pins'), {
        ownerUid: uid,       // <-- cheia pentru privacy
        lat: latlng.lat,
        lng: latlng.lng,
        title,
        description,
        photoUrls,
        color: DEFAULT_PIN_COLOR,
        groupIds: [],
        createdAt: serverTimestamp()
      });

      addMarker(map, {
        id: docRef.id,
        ownerUid: uid,
        lat: latlng.lat,
        lng: latlng.lng,
        title,
        description,
        photoUrls,
        color: DEFAULT_PIN_COLOR,
        groupIds: []
      });
      overlay.remove();
    } catch (e) {
      alert('Eroare la salvare: ' + e.message);
      overlay.remove();
    }
  });
}

// ---------- Upload poze ----------

async function uploadPhotos(fileList) {
  const urls = [];
  for (const file of fileList) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Upload esuat: ' + await response.text());
    const data = await response.json();
    urls.push(data.secure_url);
  }
  return urls;
}

// ---------- Incarcare pinuri (cu filtrare pe server) ----------

export async function loadPins(map) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const myPinIds = new Set();

  // 1. pinurile proprii
  const myPinsQ = query(collection(db, 'pins'), where('ownerUid', '==', uid));
  const mySnap = await getDocs(myPinsQ);
  mySnap.forEach((d) => {
    myPinIds.add(d.id);
    addMarker(map, { id: d.id, groupIds: [], ...d.data() });
  });

  // 2. pinurile din grupurile in care sunt membru
  const myGroups = await fetchMyGroups();
  const myGroupIds = myGroups.map(g => g.id);

  if (myGroupIds.length > 0) {
    const chunks = chunkArray(myGroupIds, 30);
    for (const chunk of chunks) {
      const groupPinsQ = query(
        collection(db, 'pins'),
        where('groupIds', 'array-contains-any', chunk)
      );
      const groupSnap = await getDocs(groupPinsQ);
      groupSnap.forEach((d) => {
        if (!myPinIds.has(d.id)) {
          myPinIds.add(d.id);
          addMarker(map, { id: d.id, groupIds: [], ...d.data() });
        }
      });
    }
  }
}

export async function createPinFromData(map, lat, lng, files, title, description) {  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Trebuie să fii logat.');

  const photoUrls = await uploadPhotos(files);

  const docRef = await addDoc(collection(db, 'pins'), {
    ownerUid: uid,
    lat, lng,
    title: title || 'Loc vizitat',
    description: description || '',
    photoUrls,
    color: DEFAULT_PIN_COLOR,
    groupIds: [],
    createdAt: serverTimestamp()
  });

  addMarker(map, {
    id: docRef.id, ownerUid: uid,
    lat, lng,
    title: 'Loc vizitat',
    description, photoUrls,
    color: DEFAULT_PIN_COLOR,
    groupIds: []
  });
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// ---------- Markeri ----------

function addMarker(map, pin) {
  const marker = L.marker([pin.lat, pin.lng], { icon: createPinIcon(pin.color) }).addTo(map);
  pin._marker = marker;
  pin._isOpen = false;
  pin._popup = null;
  pin._tooltip = null;
  allPins.push(pin);

  marker.on('click', () => {
    if (pin._isOpen) { closePin(map, pin); return; }
    if (openPinRef && openPinRef !== pin) closePin(map, openPinRef);
    openPin(map, pin);
    openPinRef = pin;
  });
}

function openPin(map, pin) {
  const latlng = pin._marker.getLatLng();

  if (pin.photoUrls && pin.photoUrls.length > 0) {
    const popup = L.popup({
      className: 'photo-popup',
      closeButton: false,
      autoClose: false,
      closeOnClick: false,
      offset: L.point(0, -42)
    })
      .setLatLng(latlng)
      .setContent(buildCarouselContent(pin))
      .openOn(map);
    pin._popup = popup;
  }

  const tooltip = L.tooltip({
    direction: 'bottom',
    offset: L.point(0, 8),
    permanent: true,
    interactive: true,
    className: 'pin-desc-tooltip'
  })
    .setLatLng(latlng)
    .setContent(buildWindowContent(pin, map));
  tooltip.addTo(map);
  pin._tooltip = tooltip;
  pin._isOpen = true;
}

function closePin(map, pin) {
  if (pin._popup) { map.closePopup(pin._popup); pin._popup = null; }
  if (pin._tooltip) { map.removeLayer(pin._tooltip); pin._tooltip = null; }
  pin._isOpen = false;
  if (openPinRef === pin) openPinRef = null;
}

function buildCarouselContent(pin) {
  const container = document.createElement('div');
  container.style.setProperty('--pin-color', pin.color || DEFAULT_PIN_COLOR);
  let currentIndex = 0;

  container.innerHTML = `
    <div class="carousel">
      <button class="carousel-prev">&#8592;</button>
      <img class="carousel-img" src="${pin.photoUrls[0]}" />
      <button class="carousel-next">&#8594;</button>
    </div>
  `;

  const img = container.querySelector('.carousel-img');
  img.addEventListener('click', () => openLightbox(pin.photoUrls[currentIndex]));
  container.querySelector('.carousel-prev').addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + pin.photoUrls.length) % pin.photoUrls.length;
    img.src = pin.photoUrls[currentIndex];
  });
  container.querySelector('.carousel-next').addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % pin.photoUrls.length;
    img.src = pin.photoUrls[currentIndex];
  });

  return container;
}

function buildWindowContent(pin, map) {
  const uid = auth.currentUser?.uid;
  const isOwner = pin.ownerUid === uid;

  const container = document.createElement('div');
  container.className = 'pin-popup-window';
  container.style.setProperty('--pin-color', pin.color || DEFAULT_PIN_COLOR);
  container.innerHTML = `
    <div class="pin-popup-header">
      ${isOwner ? '<span class="gear">&#9881;</span>' : ''}
      <span class="btn-close">&times;</span>
    </div>
    <div class="pin-popup-body">
      <h4>${pin.title || 'Fara titlu'}</h4>
      <div class="pin-popup-desc">${pin.description || ''}</div>
    </div>
  `;

  L.DomEvent.disableClickPropagation(container);
  container.querySelector('.btn-close').addEventListener('click', () => closePin(map, pin));
  if (isOwner) {
    container.querySelector('.gear').addEventListener('click', () => openSettingsModal(map, pin));
  }

  return container;
}

function openLightbox(url) {
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `<img src="${url}" />`;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}

// ---------- Modal setari ----------

function openSettingsModal(map, pin) {
  const overlay = document.createElement('div');
  overlay.className = 'settings-overlay';
  const currentColor = pin.color || DEFAULT_PIN_COLOR;

  const photosHtml = (pin.photoUrls || []).map((url, i) => `
    <div class="settings-photo" data-index="${i}">
      <img src="${url}" />
      <span class="remove-photo" data-index="${i}">&times;</span>
    </div>
  `).join('');

  overlay.innerHTML = `
    <!-- Am schimbat align-items la 'center' pentru a centra ferestrele vertical una față de cealaltă -->
    <div style="display: flex; gap: 20px; align-items: center; max-width: 95vw;">
    
      <!-- 1. FEREASTRA MICĂ (Din stânga) - Pin + Edit transparent -->
      <!-- Am eliminat clasa .settings-modal și am folosit un flex-column simplu -->
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 0 0 auto;">
      
        <!-- Am mărit mărimea pinului la 100 -->
        <div class="settings-pin-preview" id="settings-pin-preview">${pinSvg(currentColor, 100)}</div>
        
        <!-- Am adăugat padding și font-size mai mare pentru a mări butonul, plus o mică umbră -->
        <button id="settings-color-btn" class="settings-color-edit-btn" type="button" style="margin-top: 20px; padding: 10px 18px; font-size: 15px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">✏️ Edit</button>
        <input id="settings-color" type="color" value="${currentColor}" style="display:none" />
      </div>
      
      <!-- 2. FEREASTRA PRINCIPALĂ (Din dreapta) - Formularul complet -->
      <div class="settings-modal">
      
        <!-- Header colorat -->
        <div class="settings-header" style="background: linear-gradient(180deg, color-mix(in srgb, ${currentColor} 55%, white), ${currentColor}); justify-content: flex-end;">
          <span class="settings-close">&times;</span>
        </div>
        
        <!-- Corpul formularului -->
        <div class="settings-body" style="flex-grow: 1;">
          <div class="settings-fields">
            <label>Titlu</label>
            <input id="settings-title" value="${(pin.title || '').replace(/"/g, '&quot;')}" />
            
            <label>Descriere</label>
            <textarea id="settings-desc" rows="6">${pin.description || ''}</textarea>
            
            <label>Poze</label>
            <div class="settings-photos-grid">${photosHtml}</div>
            <div class="file-upload-row">
              <label class="file-upload-btn" for="settings-add-photos">Adauga poze</label>
              <span class="file-upload-count" id="settings-photos-count"></span>
            </div>
            <input id="settings-add-photos" type="file" accept="image/*" multiple style="display:none" />
            
            <button id="settings-group" type="button">+ Adauga la grup de pinuri</button>
          </div>
        </div>
        
        <!-- Footer-ul cu acțiuni -->
        <div class="settings-footer">
          <button id="settings-delete" class="delete-pin-btn" type="button">&#128465; Sterge locul</button>
          <div class="settings-buttons">
            <button id="settings-cancel" type="button">Anuleaza</button>
            <button id="settings-save" type="button">Salveaza</button>
          </div>
        </div>
        
      </div>
      
    </div>
  `;
  document.body.appendChild(overlay);

  let removedIndexes = new Set();
  let newFiles = null;

  overlay.querySelector('.settings-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#settings-cancel').addEventListener('click', () => overlay.remove());

 overlay.querySelector('#settings-color-btn').addEventListener('click', () => {
    overlay.querySelector('#settings-color').click();
  });

  overlay.querySelector('#settings-color').addEventListener('input', (e) => {
    const c = e.target.value;
    overlay.querySelector('#settings-pin-preview').innerHTML = pinSvg(c, 48);
    overlay.querySelector('.settings-header').style.background =
      `linear-gradient(180deg, color-mix(in srgb, ${c} 55%, white), ${c})`;
  });
  

  overlay.querySelectorAll('.remove-photo').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const i = Number(e.target.dataset.index);
      removedIndexes.add(i);
      e.target.closest('.settings-photo').style.opacity = '0.3';
    });
  });

  overlay.querySelector('#settings-add-photos').addEventListener('change', (e) => {
    newFiles = e.target.files;
    overlay.querySelector('#settings-photos-count').textContent =
      newFiles.length ? `${newFiles.length} poza(e) noi` : '';
  });

  overlay.querySelector('#settings-group').addEventListener('click', () => {
    overlay.remove();
    openGroupModal(map, pin);
  });

  overlay.querySelector('#settings-delete').addEventListener('click', async () => {
    if (!confirm(`Sigur vrei sa stergi "${pin.title || 'Fara titlu'}"?`)) return;
    try {
      await deleteDoc(doc(db, 'pins', pin.id));
      closePin(map, pin);
      map.removeLayer(pin._marker);
      const idx = allPins.indexOf(pin);
      if (idx !== -1) allPins.splice(idx, 1);
      overlay.remove();
    } catch (e) {
      alert('Eroare la stergere: ' + e.message);
    }
  });

  overlay.querySelector('#settings-save').addEventListener('click', async () => {
    const title = overlay.querySelector('#settings-title').value || 'Fara titlu';
    const description = overlay.querySelector('#settings-desc').value;
    const color = overlay.querySelector('#settings-color').value;
    overlay.querySelector('.settings-body').innerHTML = '<p>Se salveaza...</p>';

    try {
      let photoUrls = (pin.photoUrls || []).filter((_, i) => !removedIndexes.has(i));
      if (newFiles && newFiles.length > 0) {
        const uploaded = await uploadPhotos(newFiles);
        photoUrls = [...photoUrls, ...uploaded];
      }
      await updateDoc(doc(db, 'pins', pin.id), { title, description, photoUrls, color });
      pin.title = title;
      pin.description = description;
      pin.photoUrls = photoUrls;
      pin.color = color;
      pin._marker.setIcon(createPinIcon(color));
      closePin(map, pin);
      overlay.remove();
    } catch (e) {
      alert('Eroare la salvare: ' + e.message);
      overlay.remove();
    }
  });
}

// ---------- Modal grupuri ----------

async function openGroupModal(map, pin) {
  const overlay = document.createElement('div');
  overlay.className = 'settings-overlay';
  overlay.innerHTML = `
    <div class="settings-modal group-modal">
      <div class="settings-header">
        <span class="group-modal-title">Grupuri de pinuri</span>
        <span class="settings-close">&times;</span>
      </div>
      <div class="settings-body" id="group-list-body"><p>Se incarca...</p></div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.settings-close').addEventListener('click', () => overlay.remove());

  const groups = await fetchGroups();
  // aratam doar grupurile in care userul e owner sau editor
  const myGroups = await fetchMyGroups();
  const editableGroupIds = new Set(myGroups.filter(g => g.role !== 'viewer').map(g => g.id));
  const editableGroups = groups.filter(g => editableGroupIds.has(g.id));

  renderGroupList(map, pin, editableGroups, overlay);
}

function renderGroupList(map, pin, groups, overlay) {
  const body = overlay.querySelector('#group-list-body');
  const pinHadNoGroups = !pin.groupIds || pin.groupIds.length === 0;

  const rowsHtml = groups.map(g => `
    <label class="group-row">
      <input type="checkbox" class="group-checkbox" data-id="${g.id}"
        ${pin.groupIds && pin.groupIds.includes(g.id) ? 'checked' : ''} />
      <span class="group-swatch" style="background:${g.color}"></span>
      <span>${g.name}</span>
    </label>
  `).join('');

  body.innerHTML = `
    <div class="group-list">
      ${rowsHtml || '<p class="group-empty">Nu ai niciun grup editabil inca.</p>'}
    </div>
    ${pinHadNoGroups ? `
      <label class="use-group-settings-row">
        <input type="checkbox" id="use-group-settings" checked />
        Foloseste setarile grupului
      </label>
    ` : ''}
    <button id="new-group-btn" class="new-group-btn" type="button">+ Grup nou</button>
    <div id="new-group-form" class="new-group-form" style="display:none">
      <input id="new-group-name" placeholder="Numele grupului" />
      <input id="new-group-color" type="color" value="${DEFAULT_PIN_COLOR}" />
      <div class="modal-buttons">
        <button id="new-group-cancel" type="button">Anuleaza</button>
        <button id="new-group-create" type="button">Creeaza</button>
      </div>
    </div>
    <div class="settings-footer" style="justify-content: flex-end; border-top: none; padding-top: 16px; background: transparent;">
      <div class="settings-buttons">
        <button id="group-cancel" style="background: #eee;">Inapoi</button>
        <button id="group-save" style="background: #4CAF50; color: white;">Salveaza</button>
      </div>
    </div>
  `;

  body.querySelector('#new-group-btn').addEventListener('click', () => {
    body.querySelector('#new-group-form').style.display = 'flex';
    body.querySelector('#new-group-btn').style.display = 'none';
  });
  body.querySelector('#new-group-cancel').addEventListener('click', () => {
    body.querySelector('#new-group-form').style.display = 'none';
    body.querySelector('#new-group-btn').style.display = 'block';
  });
  body.querySelector('#new-group-create').addEventListener('click', async () => {
    const name = body.querySelector('#new-group-name').value.trim();
    if (!name) { alert('Pune un nume grupului.'); return; }
    const color = body.querySelector('#new-group-color').value;
    try {
      const newGroup = await createGroup(name, color);
      groups.push(newGroup);
      renderGroupList(map, pin, groups, overlay);
    } catch (e) {
      alert(e.message);
    }
  });

  body.querySelector('#group-cancel').addEventListener('click', () => {
    overlay.remove();
    openSettingsModal(map, pin);
  });

  body.querySelector('#group-save').addEventListener('click', async () => {
    const checked = Array.from(body.querySelectorAll('.group-checkbox:checked')).map(cb => cb.dataset.id);
    const useGroupSettingsBox = body.querySelector('#use-group-settings');
    const useGroupSettings = pinHadNoGroups && useGroupSettingsBox?.checked;

    body.innerHTML = '<p>Se salveaza...</p>';

    try {
      let newColor = pin.color;
      if (useGroupSettings && checked.length > 0) {
        const firstGroup = groups.find(g => g.id === checked[0]);
        if (firstGroup) newColor = firstGroup.color;
      }

      await updateDoc(doc(db, 'pins', pin.id), { groupIds: checked, color: newColor });
      pin.groupIds = checked;
      pin.color = newColor;
      pin._marker.setIcon(createPinIcon(pin.color));
      closePin(map, pin);
      overlay.remove();
    } catch (e) {
      alert('Eroare la salvare: ' + e.message);
      overlay.remove();
    }
  });
}