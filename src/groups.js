import { db, auth } from './firebase.js';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

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
  if (!uid) throw new Error('Trebuie sa fii logat ca sa creezi un grup.');

  const docRef = await addDoc(collection(db, 'groups'), {
    name,
    color,
    ownerUid: uid,
    viewCode: randomCode(),
    editCode: randomCode(),
    createdAt: serverTimestamp()
  });

  await addDoc(collection(db, 'groupMembers'), {
    groupId: docRef.id,
    uid,
    role: 'owner'
  });

  return { id: docRef.id, name, color, ownerUid: uid };
}

export async function joinGroupByCode(code) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Trebuie sa fii logat ca sa te alaturi unui grup.');

  const groups = await fetchGroups();
  const normalized = code.trim().toUpperCase();
  const group = groups.find(g => g.viewCode === normalized || g.editCode === normalized);
  if (!group) throw new Error('Cod invalid - niciun grup nu are codul asta.');

  const role = group.editCode === normalized ? 'editor' : 'viewer';

  await addDoc(collection(db, 'groupMembers'), { groupId: group.id, uid, role });

  return { group, role };
}