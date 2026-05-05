// pdf-generator.js - v2 05/05/2026
// Corrections 05/05/2026 v2 :
// - Marges réduites à 8mm (document plus large)
// - R6 hauteur fixe 38mm collé en bas de page
// - Signature/Nom/Titre à droite (MID)
// - Texte conditions tronqué pour rester dans le rectangle

import { jsPDF } from "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm";

const PAGE_W = 210;
const PAGE_H = 297;
const M_L    = 3;
const M_R    = PAGE_W - 3;
const CW     = M_R - M_L;
const MID    = M_L + CW / 2;
const R6H    = 52;

// découpe un texte long en lignes qui tiennent dans maxWidth
function splitText(doc, text, maxWidth, fontSize) {
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(text, maxWidth);
}

export function generateAuthorizationPDF(data) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setLineWidth(0.4);
    doc.setFont('helvetica', 'bold');

    let y = 3;
    const TW = CW - 6;

    // ══════════════════════════════
    // R1 — Espace entête papier ANAC
    // 35mm entête + 10mm espace = 45mm
    // ══════════════════════════════
    doc.rect(M_L, y, CW, 45);
    y += 45;

    // ══════════════════════════════
    // R2 — Titre + Numéro + Type
    // ══════════════════════════════
    doc.rect(M_L, y, CW, 34);

    const DX = M_R - 46;
    doc.setFontSize(8);
    doc.text('Date/ Dated', DX, y + 5);
    doc.setFontSize(11);
    doc.text(data.dateEmission || '', DX + 23, y + 13, { align: 'center' });

    doc.setFontSize(19);
    doc.text('Autorisation / Authorization', M_L + 3, y + 8);
    doc.setFontSize(7.5);
    doc.text('Aurorisation numéro / authorization number:', M_L + 3, y + 14);

    doc.setFontSize(15);
    doc.text(data.numero || '', M_L + 5, y + 24);

    doc.setFontSize(8.5);
    doc.text('Autorisation type / Authorization', M_L + 3, y + 30);
    doc.setFontSize(13);
    doc.text(data.type || '', M_L + 68, y + 30.5);

    y += 34;

    // ══════════════════════════════
    // R3 — Info ANAC / Destinataire
    // ══════════════════════════════
    doc.rect(M_L, y, CW, 33);

    doc.setFontSize(7.5);
    doc.text("Délivrée par: Agence Nationale de l'Aviation Civile:", M_L + 3, y + 5);
    doc.text("Delivered by: National Civil Aviation Autority:", M_L + 3, y + 10);
    doc.text("Tél/Tel: 00 222 45 24  40 05", M_L + 3, y + 15);
    doc.text("Télécopie/Fax: 00 222 45 25 35 78", M_L + 3, y + 20);
    doc.text("Référence/Reference:", M_L + 3, y + 25);

    doc.text('A/To:', MID + 3, y + 5);
    doc.setFontSize(9);
    doc.text(data.destinataire || '', MID + 13, y + 5);

    doc.setFontSize(7.5);
    doc.text('Tél/Tel:', MID + 3, y + 11);
    doc.text('Télécopie/Fax:', MID + 3, y + 16);
    doc.text('Date de recéption de la demande/Date of', MID + 3, y + 21);
    doc.text('receipt of request:', MID + 3, y + 26);
    doc.setFontSize(8.5);
    doc.text(data.dateReception || data.dateEmission || '', MID + 46, y + 26);

    y += 33;

    // ══════════════════════════════
    // R4 — Visa + Accord + Aéronef
    // ══════════════════════════════
    doc.rect(M_L, y, CW, 43);

    doc.setFontSize(9.5);
    doc.text('Visa/SRT A', M_L + CW * 0.40, y + 5);
    doc.text('Visa DTA',   M_L + CW * 0.70, y + 5);

    if (data.signatureUrl) {
        try {
            doc.addImage(data.signatureUrl, 'PNG', M_L + CW * 0.70 + 16, y - 1, 36, 10);
        } catch (e) { console.warn('Signature:', e); }
    }

    doc.setFontSize(8);
    if (data.typeCode === 'SUR') {
        doc.text(
            "Honneur vous notifier notre accord de survol du territoire mauritanien en faveur de l'avion selon les informations ci-après #",
            M_L + 3, y + 12
        );
    } else {
        doc.text(
            "Honneur vous notifier notre accord de survol du territoire mauritanien et l'atterrissage sur le(s)",
            M_L + 3, y + 12
        );
        doc.text(
            "aéroport(s) International de Nouakchott OUM TOUNSY en faveur de(s) avion(s) selon les",
            M_L + 3, y + 17
        );
    }

    doc.setFontSize(8);
    doc.text('Aéronef type / aircraft type', M_L + CW * 0.25, y + 24, { align: 'center' });
    doc.text('Immatriculation/ Registration', M_L + CW * 0.75, y + 24, { align: 'center' });

    doc.setFontSize(13);
    doc.text(data.aeronefType || '', M_L + CW * 0.25, y + 37, { align: 'center' });
    doc.text(data.immatriculation || '', M_L + CW * 0.75, y + 37, { align: 'center' });

    y += 43;

    // ══════════════════════════════
    // R5 — Motif + Dates + Conditions
    // ══════════════════════════════
    const BOTTOM = PAGE_H - 10;
    const R5H    = BOTTOM - y - R6H - 10; // -10mm cédés à R6
    doc.rect(M_L, y, CW, R5H);

    let iy = y + 6;

    const champs = [
        ['Motif/Motif:', data.motif || ''],
        ['Opérateur/Operator:', data.operateur || ''],
        [data.typeCode === 'SUR' ? 'itinéraire/Itinerary' : 'Route/Route:', data.route || ''],
    ];
    for (const [label, val] of champs) {
        doc.setFont('helvetica', 'bold').setFontSize(8);
        doc.text(label, M_L + 3, iy);
        doc.text(val, M_L + 50, iy);
        iy += 6;
    }

    iy += 1;
    doc.setFontSize(8);
    doc.text('Date début de validité/Validity Start Date :', M_L + 3, iy);
    doc.text(data.dateDebutValidite || '', M_L + 95, iy);
    iy += 5;

    doc.text('Date fin vlidité/Validity End Date', M_L + 3, iy);
    doc.text(data.dateFinValidite || '', M_L + 95, iy);
    if (data.validiteExtension) {
        doc.text(data.validiteExtension, M_L + 140, iy);
    }
    iy += 5;

    // conditions — splitText pour éviter débordement
    doc.setFont('helvetica', 'bolditalic').setFontSize(6.5);
    const condTexts = [
        "Cette autorisation est délivrée sous réserve que/ This permit is issued subject to :",
        "1) Tous les docuemnts de bord de l'aéronef soient en cours de validité pendant l'opération du vol ci-dessus autorisé/ All aircraft 's onboard docuemnts be valid for the operation of authorized above flight;",
        "2) La réglementation aérienne mauritanienne soit scrupuleusement respectée/ Mauritanian Aviation Regulation is scrupulously respected ;",
    ];
    for (const cond of condTexts) {
        const lines = doc.splitTextToSize(cond, TW);
        doc.text(lines, M_L + 3, iy);
        iy += lines.length * 3;
    }

    if (data.typeCode !== 'SUR') {
        iy += 0.5;
        const nb1 = doc.splitTextToSize("NB: Le paiement des frais et taxes relatifs à la délivrance de la présente autorisation sont dus dès la signature de celle-ci par l'ANAC.", TW);
        const nb2 = doc.splitTextToSize("NB: The payment of the fees and taxes relating to the issue of this authorization are due as soon as it is signed by the ANAC.", TW);
        doc.text(nb1, M_L + 3, iy); iy += nb1.length * 3;
        doc.text(nb2, M_L + 3, iy);
    }

    if (data.typeCode === 'SUR') {
        iy += 3;
        doc.setFontSize(7.5);
        doc.text('Salutations distinguées Stop', M_L + 3, iy);
        iy += 4;
        doc.text('Nouakchott Mauritanie Stop et Fin', M_L + 3, iy);
    }

    // ══════════════════════════════
    // R6 — Signature (connecté directement après R5)
    // Nom/Titre/Signature à DROITE
    // ══════════════════════════════
    const sigY  = y + R5H;
    const sigH  = PAGE_H - 3 - sigY;
    doc.setFont('helvetica', 'bold');
    doc.rect(M_L, sigY, CW, sigH);

    const SX = MID + 5;

    doc.setFontSize(8);
    doc.text('Nom du signataire:', SX, sigY + 8);
    doc.setFontSize(11);
    doc.text(data.signataire || 'AHMED BABA AHMED', SX + 42, sigY + 8);

    doc.setFontSize(8);
    doc.text('Titre:', SX, sigY + 18);
    doc.setFontSize(10);
    doc.text(data.titreSignataire || 'Directeur Général', SX + 14, sigY + 18);

    doc.setFontSize(8);
    doc.text('Signature et cachet:', SX, sigY + 30);

    return doc;
}

function safeName(s) {
    return (s || '').replace(/[^a-zA-Z0-9-]/g, '_');
}

export function downloadGeneratedPDF(data, existingDoc = null) {
    const doc = existingDoc || generateAuthorizationPDF(data);
    const name = `${safeName(data.numero) || 'autorisation'}_${safeName(data.operateur)}.pdf`;
    doc.save(name);
}

export function getPDFBlob(data, existingDoc = null) {
    const doc = existingDoc || generateAuthorizationPDF(data);
    return doc.output('blob');
}

export function getPDFDataURI(data, existingDoc = null) {
    const doc = existingDoc || generateAuthorizationPDF(data);
    return doc.output('datauristring');
}
