// pdf-gen.js
// Génère le PDF avec 6 rectangles. R1 toujours vide (entête papier).
// R2-R6 : remplis avec les textes définis dans le modèle Firestore (params/modeles).
// Les données du formulaire (numéro, dates, opérateur...) sont injectées séparément
// si le modèle contient des placeholders {{numero}}, {{dateEmission}}, etc.

import { jsPDF } from "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm";
import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const PAGE_W = 210;
const PAGE_H = 297;
const M_L    = 3;
const M_R    = PAGE_W - 3;
const CW     = M_R - M_L;

// Hauteurs fixes des rectangles
const R1_H = 45;
const R2_H = 34;
const R3_H = 33;
const R4_H = 43;
const R6_H = 52;

let cachedModels = null;
let cinzelLoaded = false;
let cinzelBase64 = null;
let cinzelBoldBase64 = null;

// Charge la police Cinzel depuis Google Fonts via le CDN jsdelivr
async function loadCinzel(pdoc) {
    if (cinzelBase64) {
        // déjà téléchargée, juste l'enregistrer dans cette instance jsPDF
        try {
            pdoc.addFileToVFS('Cinzel-Regular.ttf', cinzelBase64);
            pdoc.addFont('Cinzel-Regular.ttf', 'cinzel', 'normal');
            if (cinzelBoldBase64) {
                pdoc.addFileToVFS('Cinzel-Bold.ttf', cinzelBoldBase64);
                pdoc.addFont('Cinzel-Bold.ttf', 'cinzel', 'bold');
            }
            cinzelLoaded = true;
        } catch (e) { console.warn('Cinzel apply:', e); }
        return;
    }
    try {
        // jsdelivr proxy vers Google Fonts pour les fichiers TTF
        const regularUrl = 'https://cdn.jsdelivr.net/npm/@fontsource/cinzel@5.0.18/files/cinzel-latin-400-normal.woff';
        const boldUrl    = 'https://cdn.jsdelivr.net/npm/@fontsource/cinzel@5.0.18/files/cinzel-latin-700-normal.woff';

        // jsPDF préfère TTF — on tente d'abord
        const tryTtfReg = 'https://cdn.jsdelivr.net/npm/@fontsource/cinzel@5.0.18/files/cinzel-latin-400-normal.ttf';
        const tryTtfBold = 'https://cdn.jsdelivr.net/npm/@fontsource/cinzel@5.0.18/files/cinzel-latin-700-normal.ttf';

        const regularBuf = await fetch(tryTtfReg).then(r => {
            if (!r.ok) throw new Error('Regular non dispo');
            return r.arrayBuffer();
        });
        cinzelBase64 = arrayBufferToBase64(regularBuf);
        pdoc.addFileToVFS('Cinzel-Regular.ttf', cinzelBase64);
        pdoc.addFont('Cinzel-Regular.ttf', 'cinzel', 'normal');

        const boldBuf = await fetch(tryTtfBold).then(r => {
            if (!r.ok) throw new Error('Bold non dispo');
            return r.arrayBuffer();
        });
        cinzelBoldBase64 = arrayBufferToBase64(boldBuf);
        pdoc.addFileToVFS('Cinzel-Bold.ttf', cinzelBoldBase64);
        pdoc.addFont('Cinzel-Bold.ttf', 'cinzel', 'bold');

        cinzelLoaded = true;
    } catch (e) {
        console.warn('Cinzel non chargée, fallback Times:', e.message);
        cinzelLoaded = false;
    }
}

function usesCinzel(model) {
    if (!model) return false;
    for (const key of Object.keys(model)) {
        const arr = model[key];
        if (Array.isArray(arr)) {
            for (const t of arr) {
                if (t && (t.fontFamily || '').toLowerCase() === 'cinzel') return true;
            }
        }
    }
    return false;
}

// précharge toutes les images du modèle, applique les thèmes, met en cache
async function prepareImages(model) {
    const promises = [];
    for (const key of Object.keys(model)) {
        const arr = model[key];
        if (!Array.isArray(arr)) continue;
        for (const t of arr) {
            if (t && t.kind === 'image') {
                const src = t.url || t.dataUrl;
                if (!src) continue;
                const theme = t.theme || 'normal';
                const cacheKey = src + '__' + theme;
                if (_imgCache[cacheKey]) continue;

                promises.push((async () => {
                    try {
                        // charger l'image en dataUrl (gère URL Storage et data: déjà encodée)
                        const baseDataUrl = src.startsWith('data:') ? src : await loadImageAsDataUrl(src);
                        const themed = applyThemeToDataUrl(baseDataUrl, theme);
                        _imgCache[cacheKey] = themed;
                    } catch (e) {
                        console.warn('Image preload failed:', e.message);
                    }
                })());
            }
        }
    }
    await Promise.all(promises);
}

function arrayBufferToBase64(buf) {
    let bin = '';
    const bytes = new Uint8Array(buf);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(bin);
}

async function getModels() {
    if (cachedModels) return cachedModels;
    try {
        const snap = await getDoc(doc(db, 'params', 'modeles'));
        cachedModels = snap.exists() ? snap.data() : {};
    } catch (e) {
        cachedModels = {};
    }
    return cachedModels;
}

export function clearModelsCache() { cachedModels = null; }

function applyFont(pdoc, font, size, family) {
    const styleMap = {
        'bold':       'bold',
        'bolditalic': 'bolditalic',
        'italic':     'italic',
        'normal':     'normal',
    };
    const fam = (family || 'helvetica').toLowerCase();
    let style = styleMap[font] || 'bold';

    if (fam === 'cinzel' && cinzelLoaded) {
        // Cinzel ne supporte que normal et bold
        if (style === 'bolditalic' || style === 'italic') style = 'bold';
        try {
            pdoc.setFont('cinzel', style).setFontSize(size);
            return;
        } catch (e) {
            // fallback Times si erreur
        }
    }
    const validFamily = ['helvetica', 'times', 'courier'].includes(fam) ? fam : 'helvetica';
    pdoc.setFont(validFamily, style).setFontSize(size);
}

// remplace TOUS les placeholders {{xxx}} par data[xxx]
// fonctionne avec n'importe quel champ créé dans la page "Champs personnalisés"
function fillPlaceholders(text, data) {
    if (!text || !data) return text;
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        return data[key] !== undefined && data[key] !== null ? data[key] : '';
    });
}

// Dessine un rectangle et y place les textes du modèle
function drawRect(pdoc, x, y, w, h, texts, data) {
    pdoc.rect(x, y, w, h);
    if (!texts || !Array.isArray(texts)) return;
    const TW = w - 6;
    for (const t of texts) {
        if (t.kind === 'image') {
            const src = t.url || t.dataUrl;
            if (!src) continue;
            try {
                const ix = x + (t.x || 0);
                const iy = y + (t.y || 0);
                const iw = t.width || 30;
                const ih = t.height || 30;
                const opacity = (t.opacity !== undefined) ? t.opacity : 1;
                const theme = t.theme || 'normal';

                // utiliser l'image préparée depuis le cache (stockée par dataURL en cache)
                const cacheKey = src + '__' + theme;
                let imgData = _imgCache[cacheKey] || src;

                if (opacity < 1) {
                    pdoc.saveGraphicsState();
                    pdoc.setGState(new pdoc.GState({ opacity: opacity }));
                    pdoc.addImage(imgData, 'PNG', ix, iy, iw, ih);
                    pdoc.restoreGraphicsState();
                } else {
                    pdoc.addImage(imgData, 'PNG', ix, iy, iw, ih);
                }
            } catch (e) {
                console.warn('Image error:', e);
            }
            continue;
        }
        if (!t.texte) continue;
        applyFont(pdoc, t.font || 'bold', t.fontSize || 8, t.fontFamily || 'helvetica');
        const filled = fillPlaceholders(t.texte, data);
        const lines = pdoc.splitTextToSize(filled, TW);
        pdoc.text(lines, x + (t.x || 0), y + (t.y || 5));
    }
}

// cache global pour images thématisées (clé = src+theme)
const _imgCache = {};

// charge une image depuis URL ou dataUrl en dataUrl base64 prêt pour jsPDF
function loadImageAsDataUrl(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // nécessaire pour les images Storage
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            try {
                resolve(canvas.toDataURL('image/png'));
            } catch (e) {
                reject(e);
            }
        };
        img.onerror = () => reject(new Error('Image load failed: ' + src));
        img.src = src;
    });
}

// applique un thème (grayscale, watermark) à une dataUrl déjà chargée
function applyThemeToDataUrl(dataUrl, theme) {
    if (theme === 'normal' || !theme) return dataUrl;

    const img = new Image();
    img.src = dataUrl;
    if (!img.complete) return dataUrl;

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    if (theme === 'grayscale') {
        for (let i = 0; i < d.length; i += 4) {
            const avg = (d[i] + d[i+1] + d[i+2]) / 3;
            d[i] = d[i+1] = d[i+2] = avg;
        }
    } else if (theme === 'watermark') {
        for (let i = 0; i < d.length; i += 4) {
            const avg = (d[i] + d[i+1] + d[i+2]) / 3;
            const v = Math.min(255, avg * 0.4 + 180);
            d[i] = d[i+1] = d[i+2] = v;
        }
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/png');
}

// génère le PDF basé sur le modèle stocké
async function buildPDF(typeCode, model, data) {
    const pdoc = new jsPDF({ unit: 'mm', format: 'a4' });
    pdoc.setLineWidth(0.4);

    // si un texte utilise Cinzel, charger la police d'abord
    if (model && usesCinzel(model)) {
        await loadCinzel(pdoc);
    }

    // précharger les images thématisées (grayscale/watermark)
    if (model) await prepareImages(model);

    let y = 3;

    // R1 — entête (toujours vide)
    pdoc.rect(M_L, y, CW, R1_H);
    y += R1_H;

    // R2
    drawRect(pdoc, M_L, y, CW, R2_H, model?.R2, data);
    y += R2_H;

    // R3
    drawRect(pdoc, M_L, y, CW, R3_H, model?.R3, data);
    y += R3_H;

    // R4
    drawRect(pdoc, M_L, y, CW, R4_H, model?.R4, data);

    // signature directeur sur R4 si fournie (toujours visible peu importe le modèle)
    if (data && data.signatureUrl) {
        try {
            pdoc.addImage(data.signatureUrl, 'PNG', M_L + CW * 0.70 + 16, y - 1, 36, 10);
        } catch (e) {}
    }

    y += R4_H;

    // R5 — hauteur calculée pour aller jusqu'à R6
    const R5_H = PAGE_H - 3 - y - R6_H;
    drawRect(pdoc, M_L, y, CW, R5_H, model?.R5, data);
    y += R5_H;

    // R6 — descend jusqu'à 3mm du bas
    const r6Final = PAGE_H - 3 - y;
    drawRect(pdoc, M_L, y, CW, r6Final, model?.R6, data);

    return pdoc;
}

// Pour l'éditeur : génère un aperçu sans cacher (utilise le modèle passé en paramètre)
// Charge aussi tous les champs personnalisés et leur attribue une valeur d'exemple
export async function generatePreviewPDF(typeCode, model) {
    let customData = {};
    try {
        const snap = await getDoc(doc(db, 'params', 'champs'));
        if (snap.exists() && snap.data().list) {
            const champs = snap.data().list;
            // pour chaque champ, mettre une valeur d'exemple = nom du champ en majuscules
            Object.values(champs).forEach(c => {
                customData[c.id] = '[' + c.name.toUpperCase() + ']';
            });
        }
    } catch (e) {}

    const fakeData = {
        numero: '[NUMERO]',
        type: typeCode + ' (exemple)',
        typeCode,
        dateEmission: '07/05/2026',
        dateReception: '08/05/2026',
        ...customData,
    };
    return await buildPDF(typeCode, model, fakeData);
}

export async function getPreviewDataURI(typeCode, model) {
    const pdoc = await generatePreviewPDF(typeCode, model);
    return pdoc.output('datauristring');
}

// Pour la création d'autorisation : charge le modèle depuis Firestore
export async function generateAuthorizationPDF(data) {
    const models = await getModels();
    const m = models[data.typeCode] || {};
    return await buildPDF(data.typeCode, m, data);
}

function safeName(s) { return (s || '').replace(/[^a-zA-Z0-9-]/g, '_'); }

export async function downloadGeneratedPDF(data, existingDoc = null) {
    const d = existingDoc || await generateAuthorizationPDF(data);
    d.save(`${safeName(data.numero) || 'autorisation'}_${safeName(data.operateur)}.pdf`);
}

export async function getPDFBlob(data, existingDoc = null) {
    const d = existingDoc || await generateAuthorizationPDF(data);
    return d.output('blob');
}

export async function getPDFDataURI(data, existingDoc = null) {
    const d = existingDoc || await generateAuthorizationPDF(data);
    return d.output('datauristring');
}
