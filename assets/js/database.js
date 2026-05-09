// database.js
// toutes les opérations Firestore et Storage pour le système d'archives
//
// Note : Firestore n'a pas de full-text search, du coup pour la recherche
// on charge tout puis on filtre côté client. Pour ~10k docs ca passe encore.
// Si un jour on dépasse il faudra brancher un Algolia ou autre.

import { auth, db, storage } from './firebase-config.js';
import {
    collection, doc, addDoc, getDoc, getDocs, deleteDoc, updateDoc,
    query, where, orderBy, limit as fsLimit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { parseDate, buildStoragePath } from './helpers.js';

const COL = 'authorizations';

// --- CRÉATION -------------------------------------------------------

export async function createAuthorization(data, pdfFile = null) {
    let pdfUrl = null;
    let pdfPath = null;

    // upload du PDF dans Firebase Storage
    if (pdfFile) {
        try {
            pdfPath = buildStoragePath(data);
            const sref = ref(storage, pdfPath);
            await uploadBytes(sref, pdfFile);
            pdfUrl = await getDownloadURL(sref);
        } catch (e) {
            console.warn('Upload PDF échoué (Storage activé ?):', e.message);
            // continue sans PDF — l'autorisation reste créée dans Firestore
        }
    }

    const payload = {
        ...data,
        pdfUrl,
        pdfPath,
        statut: 'en_attente',
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.email || 'unknown',
        createdByUid: auth.currentUser?.uid || null,
        year: extractYear(data.dateEmission),
        month: extractMonth(data.dateEmission),
        searchIndex: buildSearchIndex(data)
    };

    const docRef = await addDoc(collection(db, COL), payload);
    return { id: docRef.id, ...payload };
}

// --- APPROBATION DIRECTEUR ------------------------------------------

export async function approveAuthorization(id, directeurUid, directeurEmail, signatureDataUrl) {
    await updateDoc(doc(db, COL, id), {
        statut: 'approuve',
        approvedBy: directeurEmail,
        approvedByUid: directeurUid,
        approvedAt: serverTimestamp(),
        signatureUrl: signatureDataUrl || null
    });
}

// met à jour tous les champs (directeur seulement)
export async function updateAuthorization(id, data) {
    const updated = {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'unknown',
        searchIndex: buildSearchIndex(data)
    };
    // on ne touche pas aux champs système
    delete updated.id;
    delete updated.createdAt;
    delete updated.createdBy;
    delete updated.createdByUid;
    await updateDoc(doc(db, COL, id), updated);
}

// --- LECTURE --------------------------------------------------------

export async function getAuthorization(id) {
    const snap = await getDoc(doc(db, COL, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

export async function getAllAuthorizations(options = {}) {
    const constraints = [];

    if (options.year)      constraints.push(where('year', '==', options.year));
    if (options.month)     constraints.push(where('month', '==', options.month));
    if (options.typeCode)  constraints.push(where('typeCode', '==', options.typeCode));
    if (options.operateur) constraints.push(where('operateur', '==', options.operateur));

    constraints.push(orderBy('createdAt', 'desc'));
    if (options.limit) constraints.push(fsLimit(options.limit));

    const q = query(collection(db, COL), ...constraints);
    const snap = await getDocs(q);

    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --- SUPPRESSION ----------------------------------------------------

export async function deleteAuthorization(id) {
    // attention : on a renommé la variable en "record" parce que "auth"
    // entrait en conflit avec l'import auth de firebase-config (chiant a debugger)
    const record = await getAuthorization(id);
    if (!record) throw new Error('Autorisation introuvable');

    // on essaie de supprimer le PDF mais on bloque pas si ca foire
    // (peut arriver si le fichier a deja été supprimé manuellement)
    if (record.pdfPath) {
        try {
            await deleteObject(ref(storage, record.pdfPath));
        } catch (e) {
            console.warn('Suppression PDF échouée (pas bloquant):', e.message);
        }
    }

    await deleteDoc(doc(db, COL, id));
}

// --- STATS POUR LE DASHBOARD ----------------------------------------

export async function getStats() {
    const snap = await getDocs(collection(db, COL));
    const list = snap.docs.map(d => d.data());

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7days = new Date(today);
    in7days.setDate(in7days.getDate() + 7);

    let active = 0, expired = 0, expiringSoon = 0, future = 0;
    const byType = {};
    const byMonth = {};
    const byOperator = {};

    for (const a of list) {
        // statut courant
        const start = parseDate(a.dateDebutValidite);
        const end = parseDate(a.dateFinValidite);
        if (start && end) {
            if (today > end)        expired++;
            else if (today < start) future++;
            else if (end <= in7days) expiringSoon++;
            else                    active++;
        }

        // par type
        const t = a.typeCode || 'AUTRE';
        byType[t] = (byType[t] || 0) + 1;

        // par mois
        if (a.year && a.month) {
            const key = `${a.year}-${String(a.month).padStart(2,'0')}`;
            byMonth[key] = (byMonth[key] || 0) + 1;
        }

        // par opérateur
        if (a.operateur) {
            byOperator[a.operateur] = (byOperator[a.operateur] || 0) + 1;
        }
    }

    return {
        total: list.length,
        active, expired, expiringSoon, future,
        byType, byMonth, byOperator,
        recentActivity: list.slice(0, 5)
    };
}

// --- FILTRAGE EN MÉMOIRE --------------------------------------------
// Cette fonction prend un tableau déjà chargé et applique les filtres.
// Plus rapide / moins coûteux que de re-fetch a chaque frappe.

export function filterAuthorizations(list, filters) {
    return list.filter(a => {
        if (filters.search) {
            const s = filters.search.toLowerCase().trim();
            // chercher dans TOUS les champs textuels du record
            let found = false;
            for (const key in a) {
                const v = a[key];
                if (v !== null && v !== undefined && typeof v !== 'object') {
                    if (String(v).toLowerCase().includes(s)) {
                        found = true;
                        break;
                    }
                }
            }
            if (!found) return false;
        }
        if (filters.typeCode && a.typeCode !== filters.typeCode) return false;
        if (filters.year && a.year != filters.year) return false;
        if (filters.month && a.month != filters.month) return false;

        if (filters.operateur) {
            const op = (a.operateur || '').toLowerCase();
            if (!op.includes(filters.operateur.toLowerCase())) return false;
        }
        if (filters.immatriculation) {
            const im = (a.immatriculation || '').toLowerCase();
            if (!im.includes(filters.immatriculation.toLowerCase())) return false;
        }

        if (filters.statut) {
            const status = computeStatus(a);
            if (status !== filters.statut) return false;
        }
        return true;
    });
}

// utilitaire interne
function computeStatus(a) {
    const start = parseDate(a.dateDebutValidite);
    const end = parseDate(a.dateFinValidite);
    if (!start || !end) return 'unknown';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7days = new Date(today);
    in7days.setDate(in7days.getDate() + 7);

    if (today > end) return 'expired';
    if (today < start) return 'future';
    if (end <= in7days) return 'soon';
    return 'active';
}

// version "online" (re-fetch a chaque appel) - gardée pour compatibilité
// mais on préfère filterAuthorizations() avec un cache local.
export async function searchAuthorizations(filters) {
    const all = await getAllAuthorizations({ limit: 1000 });
    return filterAuthorizations(all, filters);
}

// --- HELPERS INDEX --------------------------------------------------

function extractYear(dateStr) {
    const d = parseDate(dateStr);
    return d ? d.getFullYear() : null;
}

function extractMonth(dateStr) {
    const d = parseDate(dateStr);
    return d ? d.getMonth() + 1 : null;
}

function buildSearchIndex(data) {
    // tous les champs concaténés pour la recherche full-text basique
    return [
        data.numero, data.type, data.typeCode,
        data.operateur, data.destinataire,
        data.aeronefType, data.immatriculation,
        data.motif, data.route,
        data.signataire, data.reference
    ].filter(Boolean).join(' ').toLowerCase();
}

// --- USERS (admin only) ---------------------------------------------

export async function getAllUsers() {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteUser(uid) {
    // note : ca supprime juste le doc Firestore.
    // le compte Firebase Auth doit etre supprimé manuellement depuis la console.
    await deleteDoc(doc(db, 'users', uid));
}

export async function updateUserRole(uid, role) {
    await updateDoc(doc(db, 'users', uid), { role });
}

// --- IMPORT EN MASSE ------------------------------------------------

export async function bulkCreateAuthorizations(rows, onProgress) {
    const result = { success: 0, errors: 0, errorDetails: [] };

    for (let i = 0; i < rows.length; i++) {
        try {
            await createAuthorization(rows[i]);
            result.success++;
        } catch (e) {
            result.errors++;
            result.errorDetails.push({
                index: i,
                numero: rows[i].numero || `Ligne ${i+1}`,
                error: e.message
            });
        }
        if (onProgress) onProgress(i + 1, rows.length);
    }

    return result;
}
