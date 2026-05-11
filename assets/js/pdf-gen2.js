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

// Hauteurs par défaut des rectangles (peuvent être surchargées dans le modèle via _heights)
const DEFAULT_HEIGHTS = {
    R1: 45,
    R2: 34,
    R3: 33,
    R4: 43,
    R6: 52,
};

// récupère la hauteur d'un rectangle pour le modèle courant
function getH(model, rectId) {
    if (model && model._heights && model._heights[rectId] !== undefined) {
        return model._heights[rectId];
    }
    return DEFAULT_HEIGHTS[rectId] || 0;
}

let cachedModels = null;

// ─── Polices personnalisées ────────────────────────────
// URLs jsdelivr qui servent directement les TTF (plus fiables que Google Fonts)
const CUSTOM_FONTS = {
    cinzel: {
        regular: 'https://cdn.jsdelivr.net/gh/google/fonts/ofl/cinzel/Cinzel%5Bwght%5D.ttf',
        bold:    null, // la version variable contient bold
    },
    roboto: {
        regular: 'https://cdn.jsdelivr.net/gh/google/fonts/apache/roboto/static/Roboto-Regular.ttf',
        bold:    'https://cdn.jsdelivr.net/gh/google/fonts/apache/roboto/static/Roboto-Bold.ttf',
    },
    playfair: {
        regular: 'https://cdn.jsdelivr.net/gh/google/fonts/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf',
        bold:    null,
    },
    merriweather: {
        regular: 'https://cdn.jsdelivr.net/gh/google/fonts/ofl/merriweather/Merriweather-Regular.ttf',
        bold:    'https://cdn.jsdelivr.net/gh/google/fonts/ofl/merriweather/Merriweather-Bold.ttf',
    },
    notoarabic: {
        regular: 'https://cdn.jsdelivr.net/gh/google/fonts/ofl/notosansarabic/NotoSansArabic%5Bwdth%2Cwght%5D.ttf',
        bold:    null,
    },
};

const _fontState = {}; // { fontKey: { loaded: bool, regularB64, boldB64 } }

async function loadCustomFont(pdoc, fontKey) {
    const def = CUSTOM_FONTS[fontKey];
    if (!def) return false;

    if (!_fontState[fontKey]) _fontState[fontKey] = { loaded: false, regularB64: null, boldB64: null };
    const state = _fontState[fontKey];

    // déjà chargée en base64 — juste l'attacher au PDF
    if (state.regularB64) {
        try {
            pdoc.addFileToVFS(`${fontKey}-regular.ttf`, state.regularB64);
            pdoc.addFont(`${fontKey}-regular.ttf`, fontKey, 'normal');
            if (state.boldB64) {
                pdoc.addFileToVFS(`${fontKey}-bold.ttf`, state.boldB64);
                pdoc.addFont(`${fontKey}-bold.ttf`, fontKey, 'bold');
            }
            state.loaded = true;
            return true;
        } catch (e) { console.warn(`${fontKey} apply:`, e); return false; }
    }

    // télécharger
    try {
        const regBuf = await fetch(def.regular).then(r => {
            if (!r.ok) throw new Error('regular ' + r.status);
            return r.arrayBuffer();
        });
        state.regularB64 = arrayBufferToBase64(regBuf);
        pdoc.addFileToVFS(`${fontKey}-regular.ttf`, state.regularB64);
        pdoc.addFont(`${fontKey}-regular.ttf`, fontKey, 'normal');

        if (def.bold) {
            try {
                const boldBuf = await fetch(def.bold).then(r => {
                    if (!r.ok) throw new Error('bold ' + r.status);
                    return r.arrayBuffer();
                });
                state.boldB64 = arrayBufferToBase64(boldBuf);
                pdoc.addFileToVFS(`${fontKey}-bold.ttf`, state.boldB64);
                pdoc.addFont(`${fontKey}-bold.ttf`, fontKey, 'bold');
            } catch (e) { /* pas grave, on garde regular */ }
        } else {
            // police variable — utiliser regular pour bold aussi
            pdoc.addFont(`${fontKey}-regular.ttf`, fontKey, 'bold');
        }
        state.loaded = true;
        return true;
    } catch (e) {
        console.warn(`Police ${fontKey} non chargée, fallback Times:`, e.message);
        state.loaded = false;
        return false;
    }
}

// scanne tous les textes d'un modèle (+R1 commun) et collecte les polices utilisées
function getUsedCustomFonts(model, commonR1) {
    const set = new Set();
    const check = (arr) => {
        if (!Array.isArray(arr)) return;
        for (const t of arr) {
            if (t && !t.kind && t.fontFamily && CUSTOM_FONTS[t.fontFamily]) {
                set.add(t.fontFamily);
            }
        }
    };
    if (model) {
        for (const key of Object.keys(model)) {
            if (!key.startsWith('_')) check(model[key]);
        }
    }
    if (commonR1) check(commonR1);
    return Array.from(set);
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
export function clearImgCache() { Object.keys(_imgCache).forEach(k => delete _imgCache[k]); }

function applyFont(pdoc, font, size, family) {
    const styleMap = {
        'bold':       'bold',
        'bolditalic': 'bolditalic',
        'italic':     'italic',
        'normal':     'normal',
    };
    const fam = (family || 'helvetica').toLowerCase();
    let style = styleMap[font] || 'bold';

    // polices personnalisées (Cinzel, Roboto, Playfair, Merriweather, Noto Arabic)
    if (CUSTOM_FONTS[fam] && _fontState[fam]?.loaded) {
        // ces polices supportent uniquement normal et bold
        if (style === 'bolditalic' || style === 'italic') style = 'bold';
        try {
            pdoc.setFont(fam, style).setFontSize(size);
            return;
        } catch (e) {
            // fallback ci-dessous
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

                // chercher dans le cache avec la clé correcte
                const cacheKey = (t.storagePath || src.substring(0, 80)) + '__' + theme;
                const imgData = _imgCache[cacheKey] || _imgCache[(t.storagePath || src.substring(0, 80)) + '__normal'] || src;

                if (opacity < 1) {
                    pdoc.saveGraphicsState();
                    pdoc.setGState(new pdoc.GState({ opacity: opacity }));
                    pdoc.addImage(imgData, 'PNG', ix, iy, iw, ih);
                    pdoc.restoreGraphicsState();
                } else {
                    pdoc.addImage(imgData, 'PNG', ix, iy, iw, ih);
                }
            } catch (e) {
                console.warn('Image render error:', e.message);
            }
            continue;
        }
        if (!t.texte) continue;
        applyFont(pdoc, t.font || 'bold', t.fontSize || 8, t.fontFamily || 'helvetica');
        const filled = fillPlaceholders(t.texte, data);
        // utiliser la largeur max définie sur le texte si présente, sinon la largeur du rectangle
        const wrapWidth = (t.maxWidth && t.maxWidth > 0) ? t.maxWidth : TW;
        const lines = pdoc.splitTextToSize(filled, wrapWidth);
        pdoc.text(lines, x + (t.x || 0), y + (t.y || 5));
    }
}

// cache global pour images thématisées (clé = src+theme)
const _imgCache = {};

// charge une image depuis URL ou dataUrl en dataUrl base64 prêt pour jsPDF
function loadImageAsDataUrl(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width || 100;
            canvas.height = img.naturalHeight || img.height || 100;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            try {
                resolve(canvas.toDataURL('image/png'));
            } catch (e) {
                reject(e);
            }
        };
        img.onerror = (e) => reject(new Error('Image load failed: ' + src));
        img.src = src;
    });
}

// précharge TOUTES les images du modèle (storage URL ou dataUrl) et les met en cache base64
async function prepareImages(model) {
    const promises = [];
    for (const key of Object.keys(model)) {
        if (key.startsWith('_')) continue; // ignorer _heights etc.
        const arr = model[key];
        if (!Array.isArray(arr)) continue;
        for (const t of arr) {
            if (!t || t.kind !== 'image') continue;
            const src = t.url || t.dataUrl;
            if (!src) continue;
            const theme = t.theme || 'normal';
            const cacheKey = (t.storagePath || src.substring(0, 80)) + '__' + theme;

            promises.push((async () => {
                try {
                    // toujours charger depuis URL (storage ou data:)
                    const baseDataUrl = src.startsWith('data:')
                        ? src
                        : await loadImageAsDataUrl(src);
                    const themed = applyThemeToDataUrl(baseDataUrl, theme);
                    _imgCache[cacheKey] = themed;
                    // aussi stocker la version normale pour le drawRect
                    const normalKey = (t.storagePath || src.substring(0, 80)) + '__normal';
                    if (!_imgCache[normalKey]) _imgCache[normalKey] = baseDataUrl;
                } catch (e) {
                    console.warn('Image preload failed:', src, e.message);
                }
            })());
        }
    }
    await Promise.all(promises);
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

    // récupérer la section commune (R1 + arrière-plan)
    const allModels = await getModels();
    const common = allModels._common || {};
    const commonR1 = common.R1 || [];
    const commonR1Height = common.R1Height || 45;
    const background = common.background || null;

    // charger toutes les polices personnalisées utilisées (Cinzel, Noto Arabic, etc.)
    const usedFonts = getUsedCustomFonts(model, commonR1);
    for (const f of usedFonts) {
        await loadCustomFont(pdoc, f);
    }

    // précharger toutes les images (rectangles, R1 commun, arrière-plan)
    if (model) await prepareImages(model);
    if (commonR1.length) await prepareImages({ R1: commonR1 });
    if (background && (background.url || background.dataUrl)) {
        // précharger l'arrière-plan : on simule un objet image
        await prepareImages({ bg: [{ ...background, kind: 'image', theme: 'normal' }] });
    }

    // 1) Dessiner l'arrière-plan EN PREMIER (sous tout le reste)
    if (background && (background.url || background.dataUrl)) {
        try {
            const src = background.url || background.dataUrl;
            const cacheKey = (background.storagePath || src.substring(0, 80)) + '__normal';
            const imgData = _imgCache[cacheKey] || src;
            const op = (background.opacity !== undefined) ? background.opacity : 0.15;
            const bx = background.x || 0;
            const by = background.y || 0;
            const bw = background.width || 210;
            const bh = background.height || 297;
            if (op < 1) {
                pdoc.saveGraphicsState();
                pdoc.setGState(new pdoc.GState({ opacity: op }));
                pdoc.addImage(imgData, 'PNG', bx, by, bw, bh);
                pdoc.restoreGraphicsState();
                // FORCER le reset complet de l'opacité (sécurité)
                try {
                    pdoc.setGState(new pdoc.GState({ opacity: 1 }));
                } catch (e) {}
            } else {
                pdoc.addImage(imgData, 'PNG', bx, by, bw, bh);
            }
        } catch (e) { console.warn('Background render:', e.message); }
    }

    let y = 3;

    // 2) R1 — commun à tous les types (depuis _common.R1)
    drawRect(pdoc, M_L, y, CW, commonR1Height, commonR1, data);
    y += commonR1Height;

    // R2
    const R2_H = getH(model, 'R2');
    drawRect(pdoc, M_L, y, CW, R2_H, model?.R2, data);
    y += R2_H;

    // R3
    const R3_H = getH(model, 'R3');
    drawRect(pdoc, M_L, y, CW, R3_H, model?.R3, data);
    y += R3_H;

    // R4
    const R4_H = getH(model, 'R4');
    drawRect(pdoc, M_L, y, CW, R4_H, model?.R4, data);

    // signature directeur sur R4
    if (data && data.signatureUrl) {
        try {
            pdoc.addImage(data.signatureUrl, 'PNG', M_L + CW * 0.70 + 16, y - 1, 36, 10);
        } catch (e) {}
    }

    y += R4_H;

    // R6 fixe par le bas
    const R6_H = getH(model, 'R6');

    // R5 = ce qui reste entre y et le début de R6
    const R5_H = Math.max(10, PAGE_H - 3 - y - R6_H);
    drawRect(pdoc, M_L, y, CW, R5_H, model?.R5, data);
    y += R5_H;

    // R6 — descend jusqu'à 3mm du bas
    const r6Final = Math.max(10, PAGE_H - 3 - y);
    drawRect(pdoc, M_L, y, CW, r6Final, model?.R6, data);

    return pdoc;
}

// Pour l'éditeur : génère un aperçu sans cacher (utilise le modèle passé en paramètre)
// allModelsOverride permet de passer le _common à jour (édition en cours non sauvegardée)
export async function generatePreviewPDF(typeCode, model, allModelsOverride = null) {
    let customData = {};
    try {
        const snap = await getDoc(doc(db, 'params', 'champs'));
        if (snap.exists() && snap.data().list) {
            const champs = snap.data().list;
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

    // si allModelsOverride fourni → écraser le cache pour ce build
    if (allModelsOverride) {
        cachedModels = allModelsOverride;
    }

    return await buildPDF(typeCode, model, fakeData);
}

export async function getPreviewDataURI(typeCode, model, allModelsOverride = null) {
    const pdoc = await generatePreviewPDF(typeCode, model, allModelsOverride);
    return pdoc.output('datauristring');
}

// alternative plus sûre que data: — utilise un Blob URL local
let _lastPreviewBlobUrl = null;
export async function getPreviewBlobURL(typeCode, model, allModelsOverride = null) {
    const pdoc = await generatePreviewPDF(typeCode, model, allModelsOverride);
    const blob = pdoc.output('blob');
    if (_lastPreviewBlobUrl) URL.revokeObjectURL(_lastPreviewBlobUrl);
    _lastPreviewBlobUrl = URL.createObjectURL(blob);
    return _lastPreviewBlobUrl;
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
