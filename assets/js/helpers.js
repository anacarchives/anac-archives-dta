// helpers.js - petites fonctions partagées entre les pages
// (formatage des dates, toast, classement par type, etc.)

// affiche un message en haut a droite, disparait apres ~4 sec
export function showToast(message, type = 'success', title = null) {
    // si y'a deja un toast, on l'enleve avant
    const old = document.querySelector('.toast');
    if (old) old.remove();

    const titles = {
        success: 'Succès',
        error:   'Erreur',
        info:    'Information',
        warning: 'Attention'
    };

    // les icones SVG (j'ai pris ceux de feather icons)
    const icons = {
        success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
        error:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        info:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    };

    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">
            <div class="toast-title">${title || titles[type]}</div>
            <div class="toast-msg">${message}</div>
        </div>
    `;
    document.body.appendChild(t);

    // petit delai pour que la transition CSS se voit
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 300);
    }, 4000);
}

// On stocke les dates en JJ/MM/AAAA dans Firestore.
// Pour les <input type="date"> il faut convertir en AAAA-MM-JJ.

export function formatDate(dateStr) {
    if (!dateStr) return '—';
    if (typeof dateStr === 'string' && dateStr.includes('/')) return dateStr; // déjà OK
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
}

// JJ/MM/AAAA -> AAAA-MM-JJ
export function toISODate(dateStr) {
    if (!dateStr) return '';
    // si c'est déjà au format ISO court, on garde
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return '';
    return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
}

// AAAA-MM-JJ -> JJ/MM/AAAA
export function fromISODate(isoStr) {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length !== 3) return isoStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// taille fichier en o / Ko / Mo
export function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(2) + ' Mo';
}

// Calcule le statut de l'autorisation a la date du jour.
// soon = expire dans <= 7 jours (M. AHMED a demandé 7 jours d'avance)
export function getStatus(startDate, endDate) {
    const unknown = { code: 'unknown', label: 'Inconnu', class: 'badge-other' };
    if (!startDate || !endDate) return unknown;

    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (!start || !end) return unknown;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (today < start) return { code: 'future',  label: 'À venir',         class: 'badge-future' };
    if (today > end)   return { code: 'expired', label: 'Expirée',         class: 'badge-expired' };

    const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 7) return { code: 'soon',    label: 'Expire bientôt',  class: 'badge-soon' };

    return { code: 'active', label: 'Active', class: 'badge-active' };
}

// Parse JJ/MM/AAAA ou AAAA-MM-JJ en Date()
export function parseDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    if (typeof dateStr !== 'string') return null;

    let d;
    if (dateStr.includes('/')) {
        const [dd, mm, yyyy] = dateStr.split('/');
        if (!dd || !mm || !yyyy) return null;
        d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
    } else {
        d = new Date(dateStr);
    }
    return isNaN(d.getTime()) ? null : d;
}

// Pour la couleur du badge dans la liste
export function getTypeBadgeClass(type) {
    if (!type) return 'badge-other';
    const t = String(type).toUpperCase();
    if (t.startsWith('SAT')) return 'badge-sat';
    if (t.startsWith('SUR')) return 'badge-sur';
    if (t.startsWith('ATT')) return 'badge-att';
    return 'badge-other';
}

// Mois en français (utilisé pour les graphiques du dashboard)
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin',
              'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

export function getMonthName(idx) {
    return MOIS[idx] || '';
}

// Construit le chemin de stockage Firebase a partir des données
// Ex: archives/2026/04/SAT/SAT-0303-26.pdf
//
// /!\ IMPORTANT : on utilise typeCode et PAS type, sinon
// "Survol et Atterrissage" donnait "SUR" au lieu de "SAT"
// (corrigé apres test du 28/04)
export function buildStoragePath(authData) {
    const date = parseDate(authData.dateEmission) || new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // typeCode est déjà SAT/SUR/ATT/AUTRE - sinon on essaye d'inférer du numéro
    let type = (authData.typeCode || '').toUpperCase();
    if (!type) {
        const num = (authData.numero || '').toUpperCase();
        if (num.startsWith('SAT')) type = 'SAT';
        else if (num.startsWith('SUR')) type = 'SUR';
        else if (num.startsWith('ATT')) type = 'ATT';
        else type = 'AUTRE';
    }

    const num = (authData.numero || 'SANS-NUMERO').replace(/[^a-zA-Z0-9-]/g, '_');
    return `archives/${year}/${month}/${type}/${num}.pdf`;
}

// utilitaire pour generer un id (pas vraiment utilisé, Firestore le fait tout seul,
// mais ca traine dans le code au cas ou)
export function generateId() {
    return 'AUTH_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}
