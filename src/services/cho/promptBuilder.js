/**
 * promptBuilder.js
 * Assembles the messages array for OpenAI Chat Completions.
 * Supports text-only and vision (image) requests.
 */

const SYSTEM_PROMPT = `Sos Cho, el asistente de cocina de Bara.

REGLAS ABSOLUTAS:
- Respondés CUALQUIER pregunta de cocina: técnicas, ingredientes, herramientas, fuego, tiempos, sustituciones, cortes, etc.
- Solo rechazás preguntas completamente ajenas a cocina (tecnología, política, matemáticas, etc.) → "Soy Cho, tu asistente de cocina. ¿Tenés alguna duda sobre lo que estás preparando?"
- Respuestas CORTAS: máximo 5–8 líneas.
- Siempre dás UNA acción concreta al final.
- Usás lenguaje simple, amigable, en español rioplatense (vos, che).
- No mostrás errores técnicos nunca.

PERSONALIDAD:
- Sos preciso, directo, cálido.
- Conocés la receta exacta que está cocinando el usuario y el paso actual.
- Si ves una imagen: describís lo que observás en términos culinarios y dás una acción concreta.`;

/**
 * Builds the messages array for OpenAI.
 * @param {Object} context - output of contextBuilder.buildContext()
 * @param {string|null} imageBase64 - processed base64 (without data: prefix)
 * @param {string|null} imageMime - e.g. 'image/jpeg'
 * @returns {{ system: string, messages: Array }}
 */
function buildPrompt(context, imageBase64 = null, imageMime = 'image/jpeg') {
  const { recipe, user, environment, interaction } = context;

  const contextBlock = [
    `[CONTEXTO RECETA]`,
    `Receta: ${recipe.name || 'No especificada'}`,
    recipe.stepTitle       ? `Paso actual: ${recipe.stepTitle}` : null,
    recipe.stepDescription ? `Instrucción del paso: ${recipe.stepDescription}` : null,
    recipe.totalSteps      ? `Progreso: paso ${recipe.stepIndex + 1} de ${recipe.totalSteps}` : null,
    recipe.elapsedTime > 0 ? `Tiempo cocinando: ${Math.floor(recipe.elapsedTime / 60)} min` : null,
    recipe.ingredients?.length ? `Ingredientes: ${recipe.ingredients.slice(0, 8).join(', ')}` : null,
    `Nivel del usuario: ${user.level}`,
    `Hora del día: ${environment.time}`,
    `[FIN CONTEXTO]`,
  ].filter(Boolean).join('\n');

  const userText = `${contextBlock}\n\nPregunta: ${interaction.message}`;

  // Build user message content — OpenAI vision format
  let userContent;
  if (imageBase64 && imageMime) {
    userContent = [
      {
        type: 'image_url',
        image_url: {
          url:    `data:${imageMime};base64,${imageBase64}`,
          detail: 'low', // low = faster + cheaper for cooking images
        },
      },
      {
        type: 'text',
        text: `${userText}\n\n[El usuario envió una imagen de su preparación. Evaluá: nivel de cocción, color, textura. Indicá si está crudo, en punto o pasado. Dá UNA acción concreta. No rechaces la imagen.]`,
      },
    ];
  } else {
    userContent = userText;
  }

  return {
    system:   SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  };
}

module.exports = { buildPrompt };
