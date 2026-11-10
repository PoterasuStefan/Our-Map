import L from 'leaflet';
import exifr from 'exifr';
import { createPinFromData, setMapClickOverride } from './map.js';
import { validateImageFile } from './security.js';

let mapInstance = null;

export function initQuickAdd(map) {
  mapInstance = map;

  const btn = document.createElement('button');
  btn.className = 'quickadd-btn';
  btn.setAttribute('aria-label', 'Adauga poze rapid');
  btn.innerHTML = '+';
  document.body.appendChild(btn);

  btn.addEventListener('click', openQuickAddModal);
}

// ---------- Modal de incarcare ----------

function openQuickAddModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal quickadd-modal">
      <div class="quickadd-header">
        <h3>Adaugă poze rapid</h3>
        <div class="quickadd-help-wrap">
          <span class="quickadd-help-btn">?</span>
         <div class="quickadd-help-tooltip">
            <strong>Transfer poze cu locație</strong><br><br>
            Recomandăm puternic transferul pozelor prin <strong>cablu USB</strong>
            — alte metode (WhatsApp, Messenger, compresie cloud) pot elimina
            datele GPS din fișiere.<br><br>
            <a href="https://tinytoolshub.com/blog/photo-privacy-exif-guide/"
               target="_blank" rel="noopener" class="exif-link">
              Află mai multe despre datele EXIF →
            </a>
          </div>
        </div>
      </div>

      <div class="quickadd-upload-area">
        <label class="file-upload-btn quickadd-upload-btn" for="quickadd-photos">
          Alege poze
        </label>
        <span class="file-upload-count" id="quickadd-count"></span>
        <input id="quickadd-photos" type="file" accept="image/*" multiple style="display:none" />
      </div>

      <div class="quickadd-options">
        <label class="quickadd-merge-label">
          <input type="checkbox" id="quickadd-merge" checked />
          <strong>Grupează pozele apropiate</strong>
        </label>
        <div class="quickadd-slider-row" id="quickadd-slider-row">
          <span class="slider-label">10m</span>
          <input type="range" id="quickadd-radius" min="10" max="100" step="5" value="30"
                 class="quickadd-slider" />
          <span class="slider-label" id="quickadd-radius-val">30m</span>
        </div>
      </div>

      <div class="modal-buttons">
        <button id="quickadd-cancel">Anulează</button>
        <button id="quickadd-submit" class="quickadd-submit-btn">Continuă</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const photosInput = overlay.querySelector('#quickadd-photos');
  const countEl     = overlay.querySelector('#quickadd-count');
  const mergeCheck  = overlay.querySelector('#quickadd-merge');
  const sliderRow   = overlay.querySelector('#quickadd-slider-row');
  const radiusSlider= overlay.querySelector('#quickadd-radius');
  const radiusVal   = overlay.querySelector('#quickadd-radius-val');

  photosInput.addEventListener('change', () => {
    const n = photosInput.files.length;
    countEl.style.color = '';
    countEl.textContent = n ? `${n} ${n === 1 ? 'poză selectată' : 'poze selectate'}` : '';
  });

  mergeCheck.addEventListener('change', () => {
    sliderRow.style.opacity = mergeCheck.checked ? '1' : '0.4';
    sliderRow.style.pointerEvents = mergeCheck.checked ? 'auto' : 'none';
  });

  radiusSlider.addEventListener('input', () => {
    radiusVal.textContent = `${radiusSlider.value}m`;
  });

  overlay.querySelector('#quickadd-cancel').addEventListener('click', () => overlay.remove());

  overlay.querySelector('#quickadd-submit').addEventListener('click', async () => {
    const files = Array.from(photosInput.files);
    if (!files.length) {
      countEl.textContent = 'Selectează cel puțin o poză.';
      countEl.style.color = '#e05770';
      return;
    }

    // Validare securitate fișiere (format și mărime)
    for (const file of files) {
      const check = validateImageFile(file, 10);
      if (!check.valid) {
        countEl.textContent = check.error;
        countEl.style.color = '#e05770';
        return;
      }
    }

    const merge  = mergeCheck.checked;
    const radius = Number(radiusSlider.value);

    overlay.querySelector('.quickadd-modal').innerHTML = `
      <div style="padding:24px;text-align:center">
        <p>Se citesc datele GPS din poze…</p>
        <p style="font-size:12px;color:#999" id="qa-prog">0 / ${files.length}</p>
      </div>
    `;

    try {
      const withMeta = await readExifFromFiles(files, (i) => {
        const el = overlay.querySelector('#qa-prog');
        if (el) el.textContent = `${i + 1} / ${files.length}`;
      });

      const groups = groupByProximity(withMeta, merge ? radius : 0);
      overlay.remove();
      startReviewFlow(groups);
    } catch (e) {
      alert('Eroare la citirea pozelor: ' + e.message);
      overlay.remove();
    }
  });
}

// ---------- EXIF ----------
async function readExifFromFiles(files, onProgress) {
  const out = [];
  for (let i = 0; i < files.length; i++) {
    let lat = null, lng = null;
    try {
      const gps = await exifr.gps(files[i]);
      if (
        gps?.latitude != null &&
        gps?.longitude != null &&
        isFinite(gps.latitude) &&       // ← asta era problema: NaN e "not finite"
        isFinite(gps.longitude) &&
        !(gps.latitude === 0 && gps.longitude === 0)  // 0,0 = date corupte
      ) {
        lat = gps.latitude;
        lng = gps.longitude;
      }
    } catch { /* fara EXIF */ }
    out.push({ file: files[i], lat, lng, url: URL.createObjectURL(files[i]) });
    onProgress?.(i);
  }
  return out;
}

// ---------- Grupare ----------

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000, r = d => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2
    + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function groupByProximity(photos, radius) {
  const groups = [];
  const withGps = photos.filter(p => p.lat !== null);
  const noGps   = photos.filter(p => p.lat === null);

  for (const photo of withGps) {
    let placed = false;
    if (radius > 0) {
      for (const g of groups) {
        if (!g.hasGps) continue;
        if (haversine(photo.lat, photo.lng, g.centerLat, g.centerLng) <= radius) {
          g.photos.push(photo);
          g.centerLat = g.photos.reduce((s, p) => s + p.lat, 0) / g.photos.length;
          g.centerLng = g.photos.reduce((s, p) => s + p.lng, 0) / g.photos.length;
          placed = true; break;
        }
      }
    }
    if (!placed) groups.push({ photos: [photo], centerLat: photo.lat, centerLng: photo.lng, hasGps: true });
  }

  if (noGps.length) groups.push({ photos: noGps, centerLat: null, centerLng: null, hasGps: false });
  return groups;
}

// ---------- Review flow ----------

let reviewGroups = [];
let reviewIndex  = 0;
let tempMarker   = null;
let reviewPanel  = null;

function startReviewFlow(groups) {
  reviewGroups = groups;
  reviewIndex  = 0;
  if (!groups.length) { showToast('Nicio poză procesabilă.'); return; }
  showReviewStep();
}
function showReviewStep() {
  cleanupTemp();
  if (reviewPanel) { reviewPanel.remove(); reviewPanel = null; }

  if (reviewIndex >= reviewGroups.length) {
    showToast('✓ Toate pozele au fost procesate!');
    return;
  }

  const group = reviewGroups[reviewIndex];

  // siguranta suplimentara - daca cumva coordonatele sunt invalide, tratam ca fara GPS
  if (group.hasGps && (!isFinite(group.centerLat) || !isFinite(group.centerLng))) {
    group.hasGps = false;
    group.centerLat = null;
    group.centerLng = null;
  }

  if (group.hasGps) {
    tempMarker = L.marker([group.centerLat, group.centerLng], {
      icon: L.divIcon({
        html: `<div class="temp-pin-pulse">📍</div>`,
        className: 'temp-pin-wrapper',
        iconSize: [32, 32], iconAnchor: [16, 32]
      })
    }).addTo(mapInstance);
    mapInstance.flyTo([group.centerLat, group.centerLng], 16, { duration: 0.9 });
  }

  buildReviewPanel(group);
}

function buildReviewPanel(group) {
  const panel = document.createElement('div');
  panel.className = 'review-panel';
  reviewPanel = panel;

  const MAX = 5;
  const thumbs = group.photos.slice(0, MAX).map(p => `<img src="${p.url}" class="review-thumb" />`).join('');
  const extra  = group.photos.length - MAX;

  panel.innerHTML = `
    <div class="review-top">
      <div class="review-meta">
        <span class="review-counter">Grup ${reviewIndex + 1} / ${reviewGroups.length}</span>
        ${group.hasGps
          ? '<span class="review-badge gps-ok">GPS ✓</span>'
          : '<span class="review-badge gps-no">Fără GPS</span>'}
        <span class="review-photocount">${group.photos.length} poză(e)</span>
      </div>
      <div class="review-thumbs">
        ${thumbs}
        ${extra > 0 ? `<span class="review-more">+${extra}</span>` : ''}
      </div>
      <p class="review-question">
        ${group.hasGps
          ? '📍 Plasezi pozele chiar aici pe hartă?'
          : '⚠️ Aceste poze nu au date GPS. Unde le plasezi?'}
      </p>
    </div>
    <div class="review-actions">
      ${group.hasGps ? '<button class="review-btn r-yes">Da, pune-le aici</button>' : ''}
      <button class="review-btn r-move">Mută cursorul</button>
      <button class="review-btn r-no">Nu, șterge</button>
      <button class="review-btn r-skip">Skip all</button>
    </div>
  `;
  document.body.appendChild(panel);
  requestAnimationFrame(() => panel.classList.add('review-panel-visible'));

  panel.querySelector('.r-yes')?.addEventListener('click', () =>
    openDescPrompt(group, group.centerLat, group.centerLng));

  panel.querySelector('.r-move').addEventListener('click', () => startMoveCursor(group));

  panel.querySelector('.r-no').addEventListener('click', () => {
    group.photos.forEach(p => URL.revokeObjectURL(p.url));
    reviewIndex++;
    showReviewStep();
  });

  panel.querySelector('.r-skip').addEventListener('click', skipAll);
}

function startMoveCursor(group) {
  if (reviewPanel) reviewPanel.style.display = 'none';
  cleanupTemp();
  document.body.classList.add('cursor-pin');

  const toast = document.createElement('div');
  toast.className = 'map-toast cursor-pin-toast';
  toast.innerHTML = '🗺️ Click pe hartă pentru a plasa &nbsp;·&nbsp; <strong>Esc</strong> anulare';
  document.body.appendChild(toast);

  const cleanup = () => {
    document.body.classList.remove('cursor-pin');
    toast.remove();
    if (reviewPanel) reviewPanel.style.display = '';
    document.removeEventListener('keydown', onEsc);
  };

  const onEsc = (e) => {
    if (e.key === 'Escape') { setMapClickOverride(null); cleanup(); }
  };
  document.addEventListener('keydown', onEsc);

  setMapClickOverride((e) => {
    cleanup();
    group.centerLat = e.latlng.lat;
    group.centerLng = e.latlng.lng;
    group.hasGps = true;

    tempMarker = L.marker([e.latlng.lat, e.latlng.lng], {
      icon: L.divIcon({
        html: `<div class="temp-pin-pulse">📍</div>`,
        className: 'temp-pin-wrapper',
        iconSize: [32, 32], iconAnchor: [16, 32]
      })
    }).addTo(mapInstance);

    openDescPrompt(group, e.latlng.lat, e.latlng.lng);
  });
}
function openDescPrompt(group, lat, lng) {
  if (reviewPanel) reviewPanel.style.display = 'none';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>Detalii loc</h3>
      <p style="font-size:12px;color:#888;margin:0">${group.photos.length} poză(e) la această locație</p>
      <input id="rdesc-title" placeholder="Titlu (ex: Parcul Herăstrău)" />
      <input id="rdesc" placeholder="Descriere (opțional)" />
      <div class="modal-buttons">
        <button id="rdesc-skip">Fără detalii</button>
        <button id="rdesc-save">Salvează</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const titleInput = overlay.querySelector('#rdesc-title');
  const descInput  = overlay.querySelector('#rdesc');
  titleInput.focus();

  const save = async (title, desc) => {
    overlay.querySelector('.modal').innerHTML = '<p>Se încarcă pozele…</p>';
    try {
      await createPinFromData(mapInstance, lat, lng, group.photos.map(p => p.file), title || 'Loc vizitat', desc || '');
      group.photos.forEach(p => URL.revokeObjectURL(p.url));
    } catch (err) {
      alert('Eroare: ' + err.message);
    }
    overlay.remove();
    reviewIndex++;
    showReviewStep();
  };

  overlay.querySelector('#rdesc-save').addEventListener('click', () =>
    save(titleInput.value, descInput.value));
  overlay.querySelector('#rdesc-skip').addEventListener('click', () => save('', ''));
}
async function skipAll() {
  cleanupTemp();
  if (reviewPanel) { reviewPanel.remove(); reviewPanel = null; }

  const remaining = reviewGroups.slice(reviewIndex);
  const gpsGroups = remaining.filter(g => g.hasGps);

  if (!gpsGroups.length) {
    remaining.forEach(g => g.photos.forEach(p => URL.revokeObjectURL(p.url)));
    showToast('Skip all: nicio poză cu GPS rămasă.');
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="text-align:center">
      <p>Se plasează automat ${gpsGroups.length} grup(uri) cu GPS…</p>
      <p style="font-size:12px;color:#999" id="skip-prog">0 / ${gpsGroups.length}</p>
    </div>
  `;
  document.body.appendChild(overlay);

  let done = 0;
  for (let i = reviewIndex; i < reviewGroups.length; i++) {
    const g = reviewGroups[i];
    if (g.hasGps) {
      try {
        await createPinFromData(mapInstance, g.centerLat, g.centerLng, g.photos.map(p => p.file), 'Loc vizitat', '');
        done++;
        const el = overlay.querySelector('#skip-prog');
        if (el) el.textContent = `${done} / ${gpsGroups.length}`;
      } catch (e) { console.error(e); }
    }
    g.photos.forEach(p => URL.revokeObjectURL(p.url));
  }

  overlay.remove();
  showToast(`✓ ${done} grup(uri) plasate automat!`);
}

function cleanupTemp() {
  if (tempMarker) { mapInstance.removeLayer(tempMarker); tempMarker = null; }
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'map-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}