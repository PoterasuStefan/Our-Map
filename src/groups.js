import { db, auth } from './firebase.js';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { generateSecureCode } from './security.js';

export async function fetchGroups() {
  const snapshot = await getDocs(collection(db, 'groups'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchMyGroups() {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];

  const q = query(collection(db, 'groupMembers'), where('uid', '==', uid));
  const snapshot = await getDocs(q);
  const memberships = snapshot.docs.map(d => d.data());

  const groups = await fetchGroups();
  return groups
    .filter(g => memberships.some(m => m.groupId === g.id))
    .map(g => ({ ...g, role: memberships.find(m => m.groupId === g.id).role }));
}

export async function createGroup(name, color) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Trebuie să fii autentificat pentru a crea un grup.');

  const cleanName = (name || '').trim();
  if (!cleanName) {
    throw new Error('Numele grupului nu poate fi gol.');
  }
  if (cleanName.length > 50) {
    throw new Error('Numele grupului nu poate depăși 50 de caractere.');
  }

  // Validare culoare hex (#RRGGBB sau #RGB)
  const validColor = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color) ? color : '#f291b9';

  // Generare coduri criptografic sigure prin Web Crypto API
  const viewCode = generateSecureCode(6);
  const editCode = generateSecureCode(6);

  const docRef = await addDoc(collection(db, 'groups'), {
    name: cleanName,
    color: validColor,
    ownerUid: uid,
    viewCode,
    editCode,
    createdAt: serverTimestamp()
  });

  await addDoc(collection(db, 'groupMembers'), {
    groupId: docRef.id,
    uid,
    role: 'owner'
  });

  return { id: docRef.id, name: cleanName, color: validColor, ownerUid: uid };
}

export async function joinGroupByCode(code) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Trebuie să fii autentificat pentru a te alătura unui grup.');

  if (!code || typeof code !== 'string') {
    throw new Error('Te rugăm să introduci un cod valid.');
  }

  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{5,10}$/.test(normalized)) {
    throw new Error('Format cod invalid. Codul conține între 5 și 10 caractere alfanumerice.');
  }

  const groups = await fetchGroups();
  const group = groups.find(g => g.viewCode === normalized || g.editCode === normalized);
  if (!group) throw new Error('Cod invalid — niciun grup nu corespunde acestui cod.');

  const role = group.editCode === normalized ? 'editor' : 'viewer';

  // Verifică dacă utilizatorul este deja membru pentru a evita duplicate
  const memberQuery = query(
    collection(db, 'groupMembers'),
    where('groupId', '==', group.id),
    where('uid', '==', uid)
  );
  const memberSnapshot = await getDocs(memberQuery);
  if (!memberSnapshot.empty) {
    return { group, role: memberSnapshot.docs[0].data().role };
  }

  await addDoc(collection(db, 'groupMembers'), { groupId: group.id, uid, role });

  return { group, role };
}