# ai-tutor (módulo futuro — DESACTIVADO)

No implementar en el MVP. Este directorio solo reserva el lugar del módulo.

Idea: tutor de estudio y generador de preguntas tipo EUNACOM usando la **API de
Anthropic (Claude)** llamada desde **route handlers del backend Next.js**
(`src/app/api/ai-tutor/*`), nunca desde el cliente (la API key vive solo en el server).

Contexto que recibiría: ítem/especialidad actual, matriz de exigencia
(`item_requirements`) y avance del perfil, para preguntas dirigidas a los vacíos reales.

Hasta que se active: no agregar dependencias del SDK de Anthropic ni UI que lo asuma.
