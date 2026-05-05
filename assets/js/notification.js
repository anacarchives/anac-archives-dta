// notification.js
// Envoi d'emails aux directeurs via EmailJS quand une autorisation est créée.
// Service SMTP Gmail : anac.archives@gmail.com

const EMAILJS_SERVICE_ID  = 'service_hg7l9be';
const EMAILJS_TEMPLATE_ID = 'template_d2r5wsj';
const EMAILJS_PUBLIC_KEY  = '3spVV4ft_UYNg9_WF';

// charge le SDK EmailJS depuis CDN (une seule fois)
function loadEmailJS() {
    return new Promise((resolve) => {
        if (window.emailjs) return resolve();
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
        s.onload = () => {
            window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
            resolve();
        };
        document.head.appendChild(s);
    });
}

// Notifie tous les directeurs qu'une autorisation est en attente.
// directors = tableau d'objets { name, email }
export async function notifyDirectors(directors, authData, createdBy) {
    if (!directors || directors.length === 0) return;

    try {
        await loadEmailJS();
    } catch (e) {
        console.warn('EmailJS non chargé:', e);
        return;
    }

    for (const dir of directors) {
        if (!dir.email) continue;
        try {
            await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
                to_email:   dir.email,
                to_name:    dir.name || 'Directeur',
                numero:     authData.numero || '',
                type:       authData.type || '',
                operateur:  authData.operateur || '',
                created_by: createdBy || '',
                name:       'ANAC Archives DTA'
            });
            console.log(`Email envoyé à ${dir.email}`);
        } catch (e) {
            console.warn(`Erreur envoi email à ${dir.email}:`, e);
        }
    }
}
