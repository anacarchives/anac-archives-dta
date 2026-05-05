// pdf-gen.js — génère le PDF en lisant les modèles depuis Firestore

import { jsPDF } from "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm";
import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const PAGE_W = 210;
const PAGE_H = 297;
const M_L    = 3;
const M_R    = PAGE_W - 3;
const CW     = M_R - M_L;
const MID    = M_L + CW / 2;
const R6H    = 52;

let cachedModels = null;

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

function applyFont(doc, font, size) {
    const map = {
        'bold':       ['helvetica', 'bold'],
        'bolditalic': ['helvetica', 'bolditalic'],
        'italic':     ['helvetica', 'italic'],
        'normal':     ['helvetica', 'normal'],
    };
    const [f, s] = map[font] || ['helvetica', 'bold'];
    doc.setFont(f, s).setFontSize(size);
}

export async function generateAuthorizationPDF(data) {
    const models = await getModels();
    const m = models[data.typeCode] || {};
    const pdoc = new jsPDF({ unit: 'mm', format: 'a4' });
    pdoc.setLineWidth(0.4);
    pdoc.setFont('helvetica', 'bold');

    let y = 3;
    const TW = CW - 6;

    // R1 — entête
    pdoc.rect(M_L, y, CW, 45);
    y += 45;

    // R2 — titre + numéro + type
    pdoc.rect(M_L, y, CW, 34);
    const DX = M_R - 46;
    pdoc.setFontSize(8);
    pdoc.text('Date/ Dated', DX, y + 5);
    pdoc.setFontSize(11);
    pdoc.text(data.dateEmission || '', DX + 23, y + 13, { align: 'center' });
    pdoc.setFontSize(19);
    pdoc.text('Autorisation / Authorization', M_L + 3, y + 8);
    pdoc.setFontSize(7.5);
    pdoc.text('Aurorisation numéro / authorization number:', M_L + 3, y + 14);
    pdoc.setFontSize(15);
    pdoc.text(data.numero || '', M_L + 5, y + 24);
    pdoc.setFontSize(8.5);
    pdoc.text('Autorisation type / Authorization', M_L + 3, y + 30);
    pdoc.setFontSize(13);
    pdoc.text(data.type || '', M_L + 68, y + 30.5);
    y += 34;

    // R3 — ANAC / destinataire
    pdoc.rect(M_L, y, CW, 33);
    pdoc.setFontSize(7.5);
    pdoc.text("Délivrée par: Agence Nationale de l'Aviation Civile:", M_L + 3, y + 5);
    pdoc.text("Delivered by: National Civil Aviation Autority:", M_L + 3, y + 10);
    pdoc.text("Tél/Tel: 00 222 45 24  40 05", M_L + 3, y + 15);
    pdoc.text("Télécopie/Fax: 00 222 45 25 35 78", M_L + 3, y + 20);
    pdoc.text("Référence/Reference:", M_L + 3, y + 25);
    pdoc.text('A/To:', MID + 3, y + 5);
    pdoc.setFontSize(9);
    pdoc.text(data.destinataire || '', MID + 13, y + 5);
    pdoc.setFontSize(7.5);
    pdoc.text('Tél/Tel:', MID + 3, y + 11);
    pdoc.text('Télécopie/Fax:', MID + 3, y + 16);
    pdoc.text('Date de recéption de la demande/Date of', MID + 3, y + 21);
    pdoc.text('receipt of request:', MID + 3, y + 26);
    pdoc.setFontSize(8.5);
    pdoc.text(data.dateReception || data.dateEmission || '', MID + 46, y + 26);
    y += 33;

    // R4 — Visa + accord + aéronef
    pdoc.rect(M_L, y, CW, 43);

    const visaSRT = m.visaSRTPos || { texte: 'Visa/SRT A', x: 40, y: 5, fontSize: 9.5, font: 'bold' };
    const visaDTA = m.visaDTAPos || { texte: 'Visa DTA',   x: 70, y: 5, fontSize: 9.5, font: 'bold' };

    applyFont(pdoc, visaSRT.font, visaSRT.fontSize);
    pdoc.text(visaSRT.texte, M_L + CW * (visaSRT.x / 100), y + visaSRT.y);

    applyFont(pdoc, visaDTA.font, visaDTA.fontSize);
    pdoc.text(visaDTA.texte, M_L + CW * (visaDTA.x / 100), y + visaDTA.y);

    if (data.signatureUrl) {
        try {
            pdoc.addImage(data.signatureUrl, 'PNG', M_L + CW * (visaDTA.x / 100) + 16, y - 1, 36, 10);
        } catch (e) { console.warn('Signature:', e); }
    }

    const accord = m.texteAccord || { texte: '', x: 3, y: 12, fontSize: 8, font: 'bold' };
    if (accord.texte) {
        applyFont(pdoc, accord.font, accord.fontSize);
        const lines = pdoc.splitTextToSize(accord.texte, TW);
        pdoc.text(lines, M_L + accord.x, y + accord.y);
    }

    pdoc.setFont('helvetica', 'bold').setFontSize(8);
    pdoc.text('Aéronef type / aircraft type', M_L + CW * 0.25, y + 24, { align: 'center' });
    pdoc.text('Immatriculation/ Registration', M_L + CW * 0.75, y + 24, { align: 'center' });
    pdoc.setFontSize(13);
    pdoc.text(data.aeronefType || '', M_L + CW * 0.25, y + 37, { align: 'center' });
    pdoc.text(data.immatriculation || '', M_L + CW * 0.75, y + 37, { align: 'center' });
    y += 43;

    // R5 — motif + dates + conditions
    const R5H = PAGE_H - 3 - y - R6H - 10;
    pdoc.rect(M_L, y, CW, R5H);
    let iy = y + 6;

    const champs = [
        ['Motif/Motif:', data.motif || ''],
        ['Opérateur/Operator:', data.operateur || ''],
        [data.typeCode === 'SUR' ? 'itinéraire/Itinerary' : 'Route/Route:', data.route || ''],
    ];
    for (const [label, val] of champs) {
        pdoc.setFont('helvetica', 'bold').setFontSize(8);
        pdoc.text(label, M_L + 3, iy);
        pdoc.text(val, M_L + 50, iy);
        iy += 6;
    }

    iy += 1;
    pdoc.setFontSize(8);
    pdoc.text('Date début de validité/Validity Start Date :', M_L + 3, iy);
    pdoc.text(data.dateDebutValidite || '', M_L + 95, iy);
    iy += 5;
    pdoc.text('Date fin vlidité/Validity End Date', M_L + 3, iy);
    pdoc.text(data.dateFinValidite || '', M_L + 95, iy);
    if (data.validiteExtension) pdoc.text(data.validiteExtension, M_L + 140, iy);
    iy += 5;

    // textes configurables depuis modèle
    const condFields = ['condition1', 'condition2', 'condition3', 'nb1', 'nb2', 'salutations1', 'salutations2'];
    for (const cfId of condFields) {
        const cf = m[cfId];
        if (!cf || !cf.texte) continue;
        applyFont(pdoc, cf.font || 'bolditalic', cf.fontSize || 6.5);
        const lines = pdoc.splitTextToSize(cf.texte, TW);
        pdoc.text(lines, M_L + 3, iy);
        iy += lines.length * ((cf.fontSize || 6.5) * 0.45) + 1;
    }

    y += R5H;

    // R6 — signature
    const sigH = PAGE_H - 3 - y;
    pdoc.setFont('helvetica', 'bold');
    pdoc.rect(M_L, y, CW, sigH);
    const SX = MID + 5;
    pdoc.setFontSize(8);
    pdoc.text('Nom du signataire:', SX, y + 8);
    pdoc.setFontSize(11);
    pdoc.text(data.signataire || 'AHMED BABA AHMED', SX + 42, y + 8);
    pdoc.setFontSize(8);
    pdoc.text('Titre:', SX, y + 18);
    pdoc.setFontSize(10);
    pdoc.text(data.titreSignataire || 'Directeur Général', SX + 14, y + 18);
    pdoc.setFontSize(8);
    pdoc.text('Signature et cachet:', SX, y + 30);

    return pdoc;
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
