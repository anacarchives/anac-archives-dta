// params.js
// Gestion des paramètres configurables stockés dans Firestore.
// Collection "params", document unique "config".

import { db } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const DOC_REF = doc(db, 'params', 'config');

// valeurs par défaut si aucune config n'existe encore
const DEFAULTS = {
    operateurs: [],
    aeronefs: [],
    immatriculations: [],
    motifs: [],
    routes: [],
    destinataires: [],
    visaSRT: 'A',
    signataire: 'AHMED BABA AHMED',
    titreSignataire: 'Directeur Général',
    references: []
};

// charge la config depuis Firestore
export async function loadParams() {
    try {
        const snap = await getDoc(DOC_REF);
        if (!snap.exists()) return { ...DEFAULTS };
        return { ...DEFAULTS, ...snap.data() };
    } catch (e) {
        console.error('Erreur chargement params:', e);
        return { ...DEFAULTS };
    }
}

// sauvegarde la config complète
export async function saveParams(params) {
    await setDoc(DOC_REF, params, { merge: true });
}

// ajoute une valeur à une liste (si pas déjà dedans)
export async function addToList(field, value) {
    const params = await loadParams();
    const list = params[field] || [];
    if (!list.includes(value)) {
        list.push(value);
        params[field] = list;
        await saveParams(params);
    }
    return params;
}

// supprime une valeur d'une liste
export async function removeFromList(field, value) {
    const params = await loadParams();
    params[field] = (params[field] || []).filter(v => v !== value);
    await saveParams(params);
    return params;
}
