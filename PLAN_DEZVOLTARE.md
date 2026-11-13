# Plan de Dezvoltare Our-Map (Roadmap & Sarcini)

Acest document este sursa unică de adevăr pentru dezvoltarea proiectului **Our-Map**. Sarcinile marcate cu `[ ]` sunt executate automat de agentul de optimizare săptămânal (sau la cerere), validate cu `npm run build` și comise pe Git, după care sunt marcate cu `[x]`.

---

## 📌 Checklist de Dezvoltare

### 🎯 Sprint 1: Fixuri Vizuale & Experiență Utilizator (Prioritate Imediată)
- [x] **Corectare Mockup Demo de pe Landing Page:**
  - Înlocuire tile de background cu Marea Ionică / Zakynthos (Grecia) în loc de sudul României.
  - Afișare a minimum 2 pinuri (Pin 1: Plaja Navagio cu fereastră compactă; Pin 2: Blue Caves / Keri).
  - Aliniere fină a etichetelor flotante fără obstrucționarea vizuală a hărții.
- [ ] **Remediere Prompt Login Persistent (`.map-login-hint`):**
  - Ascundere forțată a elementului `.map-login-hint` când utilizatorul revine pe landing page (`body.view-landing`).
  - Curățare sau apel de demontare a mesajului la revenirea pe vizualizarea principală.
- [ ] **Înfrumusețare Pagina cu Harta — Design „Smart & Friendly” (Fără Bloat):**
  - Bara plutitoare de control (*Acasă*, *Meniu*, *Quick Add +*) unificată și rafinată cu efect subtil de glassmorphism (`backdrop-filter: blur(12px)`), colțuri rotunjite armonios și controale Leaflet de zoom/atribuire restilizate modern.
  - Design „smart & friendly” pentru modale (`.settings-modal`, `.quickadd-modal`, `.modal`), panoul lateral (`.sidepanel`) și popup-urile pinurilor: tipografie coerentă (`Plus Jakarta Sans`), input-uri cu focus ring curat, butoane în paletă caldă coral/crem cu micro-interacțiuni și tranziții fluide, plus stare de bun-venit prietenoasă (`.map-hint-box` cu buton direct de autentificare).
  - Rafinare vizuală a pinurilor și umbrelor în Leaflet fără adăugarea de pachete npm grele.

### 🚀 Sprint 2: Performanță & Colaborare (Următorul Ciclu)
- [ ] **Code Splitting & Minificare:**
  - Optimizare chunk-uri mari Vite (`rolldownOptions.output.codeSplitting` / dynamic imports pentru a reduce bundle-ul sub 500kB).
- [ ] **Experiență Mobilă:**
  - Optimizare gesturi touch pentru adăugarea rapidă de pinuri și caruselul foto pe ecrane mici.
- [ ] **Filtrare Avansată Pinuri:**
  - Căutare rapidă de pinuri după titlu sau etichete în panoul lateral.

---

## 🔄 Mecanism de Autopropunere
Dacă în momentul execuției toate sarcinile de mai sus sunt bifate cu `[x]`, agentul va adăuga un nou **Sprint** cu minim 3 propuneri inovatoare de funcționalități (ex: mod offline, export album amintiri în format PDF/carte poștală, statistici de călătorie) și va trimite raportul către utilizator.
