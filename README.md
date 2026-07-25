# 🗺️ Our Map

> A collaborative, private map for saving and sharing the places that matter to you.

**Our Map** is a Progressive Web App (PWA) built with vanilla JavaScript, Leaflet.js, and Firebase. It lets you and the people you choose pin locations on a map, attach photos, write descriptions, and share memories — privately, beautifully, and for free.

---

## ✨ Features

### 📍 Interactive Map
- Built on **OpenStreetMap** via **Leaflet.js** — no API key, no billing required
- Click anywhere on the map to add a new pin
- Custom colored pin markers with photo previews floating above them

### 🖼️ Photos
- Attach multiple photos to any pin
- Swipeable photo carousel in the pin popup
- Click any photo to view it full-size (original resolution)
- Photos hosted on **Cloudinary** (free tier, no credit card)

### 🔒 Privacy First
- No account = read-only empty map
- Logged in users see only **their own pins** and pins from **groups they've joined**
- Pins without a group cannot be shared with anyone
- Firestore security rules enforce access server-side

### 👥 Groups & Sharing
- Create named groups with custom colors
- Add pins to one or more groups
- Share groups via a generated link — choose **Viewer** or **Editor** access
- Join a group via link or invite code
- Filter the map by group from the side panel

### ⚡ Quick Add
- Bulk-upload photos from your device
- Reads **GPS EXIF data** automatically and groups nearby photos by proximity (configurable radius: 10–100m)
- Step-by-step review flow: confirm location, move cursor to place manually, skip, or auto-place all
- For photos without GPS: click anywhere on the map to place them manually

### ⚙️ Settings
- Adjust photo preview size (small / medium / large)
- Edit group colors (updates for all members)
- Delete groups or leave groups you've joined
- Pin settings: edit title, description, photos, color

### 📱 Works on Mobile
- Installable as a PWA on iOS and Android (Add to Home Screen)
- No App Store required — just open the link in Safari or Chrome

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Map | [Leaflet.js](https://leafletjs.com/) + OpenStreetMap tiles |
| Frontend | Vanilla JavaScript (ES Modules) + Vite |
| Auth | Firebase Authentication (email/password) |
| Database | Firebase Firestore |
| Photo storage | [Cloudinary](https://cloudinary.com/) (unsigned upload) |
| EXIF reading | [exifr](https://github.com/MikeKovarik/exifr) |
| Hosting | GitHub Pages |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS)
- A [Firebase](https://firebase.google.com/) project with Authentication and Firestore enabled
- A [Cloudinary](https://cloudinary.com/) account with an unsigned upload preset

### Installation

```bash
git clone https://github.com/PoterasuStefan/Our-Map.git
cd Our-Map
npm install
```

### Configuration

Create `src/firebase.js` with your Firebase project credentials:

```js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

In `src/map.js` and `src/quickadd.js`, set your Cloudinary credentials:

```js
const CLOUD_NAME = 'your-cloud-name';
const UPLOAD_PRESET = 'your-unsigned-preset-name';
```

### Run locally

```bash
npm run dev
```

### Deploy to GitHub Pages

```bash
npm run deploy
```

> Make sure to add your GitHub Pages domain (`yourusername.github.io`) to **Authorized domains** in Firebase Console → Authentication → Settings.

---

## 📁 Project Structure

```
src/
├── main.js          # Entry point — wires everything together
├── firebase.js      # Firebase init & exports
├── map.js           # Leaflet map, markers, pin UI, settings modal
├── quickadd.js      # Bulk photo upload, EXIF reading, review flow
├── sidepanel.js     # Side menu, group filters, app settings, sharing
├── auth-ui.js       # Login / signup modal
├── groups.js        # Group CRUD, join by code logic
└── style.css        # All styles
```

---

## 📸 Photo Transfer Tips

To preserve GPS data in your photos when transferring between devices:

- ✅ **USB cable** — always preserves EXIF
- ✅ **AirDrop** (iOS → iOS or iOS → Mac)
- ✅ **Email** (as attachment, not inline)
- ✅ **Google Photos** → download as *original*
- ❌ **WhatsApp** — strips GPS data
- ❌ **Facebook / Instagram** — strips GPS data
- ❌ **Screenshot** — no EXIF at all

[Learn more about EXIF metadata →](https://tinytoolshub.com/blog/photo-privacy-exif-guide/)

---

## 🗺️ Live Demo

**[poterasustefan.github.io/Our-Map](https://poterasustefan.github.io/Our-Map/)**

---

## 📄 License

MIT — feel free to fork and build your own version.
