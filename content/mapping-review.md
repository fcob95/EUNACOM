# Revisión de mapeo tema/examen → códigos EUNACOM (superado)

Este informe documentaba el mapeo "suggested" de los 153 ítems macro originales
(129 temas + 24 exámenes) contra el catálogo EUNACOM, con 212 enlaces totales,
7 ítems sin match y 10 con mapeo aproximado/compartido — ver historial de git
para el detalle completo.

Quedó superado por la granularización del temario (`scripts/expand-medicina-interna.mjs`):
ahora cada ítem de Medicina Interna corresponde 1:1 a un código EUNACOM oficial
(655 ítems, `confidence: "confirmed"` por construcción), así que no queda mapeo
pendiente de revisar en esta área. Endocrinología y Enfermedades Infecciosas,
antes sin ítems, quedaron pobladas junto con el resto; Urgencias sigue vacía
(no existe como especialidad propia en el catálogo — es una sección transversal).
