// anthropic.js
// Appel à l'API Claude pour extraire les champs d'une autorisation depuis le PDF scanné.
// On envoie le PDF en base64, Claude retourne du JSON qu'on parse direct.

import { ANTHROPIC_API_KEY } from './firebase-config.js';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

// Prompt système. Ne pas oublier de demander UNIQUEMENT du JSON,
// sinon Claude rajoute du texte autour et ca casse JSON.parse.
const PROMPT = `Tu es un expert en analyse de documents administratifs aéronautiques.
Tu vas analyser une autorisation officielle de vol/survol émise par l'ANAC Mauritanie.

Extrais les informations suivantes du document et retourne UNIQUEMENT un objet JSON valide (sans texte avant ni après, sans markdown, juste le JSON pur).

Format attendu :
{
  "numero": "le numéro complet d'autorisation (ex: SAT-0303-26 ou SUR-1014-26)",
  "type": "le type exact (Survol et Atterrissage, Survol, Atterrissage, ou autre)",
  "typeCode": "code court basé sur le numéro: SAT, SUR, ATT, ou AUTRE",
  "dateEmission": "date d'émission au format JJ/MM/AAAA",
  "dateReception": "date de réception de la demande au format JJ/MM/AAAA (peut être identique)",
  "destinataire": "nom de la compagnie destinataire (champ A/To)",
  "operateur": "nom de l'opérateur",
  "aeronefType": "type de l'aéronef (ex: B737-8, GULFSTREAM G450)",
  "immatriculation": "immatriculation de l'aéronef (ex: 5TCLJ, CN-GMT)",
  "motif": "motif du vol (ex: CONVOYAGE TECHNIQUE, COMMERCIAL FLT)",
  "route": "itinéraire ou route complète",
  "dateDebutValidite": "date de début de validité au format JJ/MM/AAAA",
  "dateFinValidite": "date de fin de validité au format JJ/MM/AAAA",
  "validiteExtension": "extension type +72H si présente, sinon vide",
  "visaSRT": "valeur du visa SRT (ex: A) ou vide",
  "visaDTA": "true si le visa DTA est présent (signature/cachet visible), sinon false",
  "reference": "référence si présente",
  "signataire": "nom du signataire",
  "titreSignataire": "titre du signataire (ex: Directeur Général)",
  "confidence": "high, medium, ou low selon la qualité de lecture",
  "champsIncertains": ["liste des champs où tu n'es pas sûr"]
}

Règles strictes:
- Si un champ est vide ou illisible, mets "" (chaîne vide)
- Pour les dates, respecte STRICTEMENT le format JJ/MM/AAAA
- Pour typeCode, base-toi sur le préfixe du numéro: SAT-xxx → "SAT", SUR-xxx → "SUR", ATT-xxx → "ATT"
- Renvoie UNIQUEMENT le JSON, rien d'autre.`;


// petit helper pour convertir un File en base64 (sans le préfixe data:...)
function fileToB64(file) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
            // resultat = "data:application/pdf;base64,XXXXX..."
            // on garde que la partie après la virgule
            resolve(r.result.split(',')[1]);
        };
        r.onerror = reject;
        r.readAsDataURL(file);
    });
}


export async function extractAuthorizationData(pdfFile) {
    if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY.startsWith('VOTRE_')) {
        throw new Error('Clé API Anthropic non configurée. Voir firebase-config.js');
    }

    const b64 = await fileToB64(pdfFile);

    const body = {
        model: MODEL,
        max_tokens: 1500,
        messages: [{
            role: 'user',
            content: [
                {
                    type: 'document',
                    source: { type: 'base64', media_type: 'application/pdf', data: b64 }
                },
                { type: 'text', text: PROMPT }
            ]
        }]
    };

    // /!\ on utilise le header "anthropic-dangerous-direct-browser-access"
    // parce qu'on appelle l'API directement depuis le navigateur.
    // En prod il faudrait un proxy ou une Cloud Function pour cacher la clé.
    const resp = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(body)
    });

    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Erreur API (${resp.status}): ${err}`);
    }

    const json = await resp.json();
    if (!json.content?.[0]?.text) {
        throw new Error('Réponse API vide ou invalide');
    }

    // parfois Claude rajoute des ```json même quand on lui dit non
    let text = json.content[0].text.trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    let extracted;
    try {
        extracted = JSON.parse(text);
    } catch (e) {
        console.error('Réponse non parsable:', text);
        throw new Error('Format de réponse invalide. Voir console pour les détails.');
    }

    return {
        success: true,
        data: extracted,
        usage: json.usage  // pour suivre le coût
    };
}
