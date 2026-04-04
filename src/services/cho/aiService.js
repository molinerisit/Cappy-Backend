/**
 * aiService.js
 * Calls OpenAI to get Cho's response.
 * Supports text + vision (image) requests.
 * Always returns a user-friendly response — never exposes internal errors.
 */

const OpenAI = require('openai');

const FALLBACK_IMAGE   = 'No pude analizar bien la imagen. ¿Cómo lo ves vos? ¿Más dorado o pálido?';
const FALLBACK_GENERIC = 'Tuve un problema técnico. Seguí con el paso que tenés en pantalla y avisame si algo no te cierra.';

const MODEL      = 'gpt-4o-mini'; // fast + cheap, supports vision
const MAX_TOKENS = 300;

let client = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.CHO_OPENAI_KEY;
    if (!apiKey) throw new Error('CHO_OPENAI_KEY not configured');
    client = new OpenAI({ apiKey });
  }
  return client;
}

/**
 * @param {{ system: string, messages: Array }} prompt - output of promptBuilder
 * @param {boolean} hasImage
 * @returns {{ text: string, tokensUsed: number, usedFallback: boolean }}
 */
async function ask(prompt, hasImage = false) {
  try {
    const ai = getClient();

    const response = await ai.chat.completions.create({
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: prompt.system },
        ...prompt.messages,
      ],
    });

    const text = response.choices?.[0]?.message?.content?.trim() ?? '';
    const tokensUsed = (response.usage?.total_tokens ?? 0);

    if (!text || text.length < 10) {
      return { text: hasImage ? FALLBACK_IMAGE : FALLBACK_GENERIC, tokensUsed: 0, usedFallback: true };
    }

    return { text, tokensUsed, usedFallback: false };

  } catch (err) {
    console.error('[ChoAI] OpenAI error:', err?.message ?? err);
    return {
      text: hasImage ? FALLBACK_IMAGE : FALLBACK_GENERIC,
      tokensUsed: 0,
      usedFallback: true,
    };
  }
}

module.exports = { ask };
