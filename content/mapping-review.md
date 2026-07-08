# Revisión de mapeo tema/examen → códigos EUNACOM

Informe para Francisco. Los mapeos son **automáticos y "suggested"**: revisa y edita/confirma a mano.
Al confirmar un mapeo en la base de datos, cámbialo a `confidence = 'confirmed'` y el seed dejará de sobreescribirlo.

## Resumen

- **153 ítems** (129 temas + 24 exámenes complementarios) en 9 especialidades con contenido.
- **127 / 129 temas** mapeados a ≥1 código oficial; **19 / 24 exámenes** mapeados.
- **212 enlaces** ítem↔código en total (un ítem puede cubrir varios códigos).
- **7 ítems sin match** (2 temas + 5 exámenes) y **10 ítems con mapeo aproximado/compartido** listados abajo.
- Endocrinología, Urgencias y Enfermedades Infecciosas quedan **sin ítems** (contenido pendiente).

## Ítems a revisar

| Especialidad | Ítem | Tipo | Estado | Código(s) sugerido(s) | Nota |
|---|---|---|---|---|---|
| Cardiología | Enfermedad Tromboembólica | tema | Aproximado | `1.01.1.006` Embolia pulmonar | El tema abarca ETE venosa (TVP/TEP); el catálogo cardiológico solo trae "Embolia pulmonar". No hay código de TVP en Cardiología. |
| Cardiología | Farmacología Cardiovascular | tema | Sin match | _(sin match)_ | No existe código de "farmacología cardiovascular" como situación clínica. Lo más cercano es 1.01.3.003 "Manejo del paciente en tratamiento anticoagulante" (muy parcial). |
| Cardiología | Dispositivos cardíacos (marcapasos, resincronizador, DAI) | examen | Sin match | _(sin match)_ | El catálogo no tiene un examen/procedimiento para dispositivos. Existen 1.01.5.002 Cardioversión eléctrica y 1.01.5.004 Desfibrilación (procedimientos, no el estudio del dispositivo). |
| Nefrología | Electrolitos urinarios y creatininuria | examen | Aproximado | `1.09.4.016` Sodio urinario; `1.09.4.009` Clearence de creatinina | Mapeo compuesto: 1.09.4.016 "Sodio urinario" + 1.09.4.009 "Clearance de creatinina". No hay un único examen equivalente. |
| Nefrología | Biopsia Renal | examen | Sin match | _(sin match)_ | No existe código de biopsia renal en las secciones 4 (exámenes) ni 5 (procedimientos) de Nefrología. |
| Gastroenterología | DILI/HILI (Drug & herb induced liver injury) | tema | Compartido | `1.06.1.020` Hepatitis agudas B, C, por otros virus, por drogas y tóxicas | 1.06.1.020 "Hepatitis agudas B, C, por otros virus, por drogas y tóxicas" cubre la parte tóxica/por drogas, pero el mismo código también quedó en "Hepatitis virales". |
| Gastroenterología | Enfermedades Hepáticas Autoinmunes | tema | Sin match | _(sin match)_ | No hay código específico de hepatitis autoinmune / CBP / CEP. Podría forzarse a 1.06.1.021 "Hepatitis crónica" si se desea (ya usado en Hepatitis virales). |
| Gastroenterología | Alteración del laboratorio hepático (sintomático y asintomático) | tema | Aproximado | `1.06.1.007` Colestasia | Mapeado a 1.06.1.007 "Colestasia" como situación clínica más próxima. Considerar también los exámenes 1.06.4.010/1.06.4.011 (perfil/función hepática). |
| Neurología | ACV isquémico | tema | Compartido | `1.10.2.007` Enfermedad cerebrovascular (isquémica, cardioembólica, hemorrágica, AVE, TIA, etc) | El catálogo trae un único código de ECV (1.10.2.007) que engloba isquémica, cardioembólica y hemorrágica; queda compartido con "ACV hemorrágico". |
| Neurología | ACV hemorrágico | tema | Compartido | `1.10.2.007` Enfermedad cerebrovascular (isquémica, cardioembólica, hemorrágica, AVE, TIA, etc); `1.10.2.008` Hemorragia subaracnoídea | Comparte 1.10.2.007 con "ACV isquémico"; se agregó 1.10.2.008 "Hemorragia subaracnoídea" para diferenciar. |
| Neurología | Cefaleas secundarias | tema | Aproximado | `1.10.2.001` Cefalea aguda en urgencia | Mapeado a 1.10.2.001 "Cefalea aguda en urgencia". Evaluar sumar 1.10.1.019 "Sd. de hipertensión endocraneana" y 1.10.1.013 "Neuralgia del trigémino". |
| Neurología | Parkinsonismos | tema | Compartido | `1.10.1.006` Enfermedad de Parkinson y parkinsonismos | El catálogo une "Enfermedad de Parkinson y parkinsonismos" en 1.10.1.006; queda compartido con el tema "Enfermedad de Parkinson". |
| Nutrición y Diabetes | Hiperglicemia en Paciente Hospitalizado | tema | Aproximado | `1.02.1.006` Diabetes por corticoides | Mapeado a 1.02.1.006 "Diabetes por corticoides" (causa frecuente de hiperglicemia intrahospitalaria). No hay código exacto de "hiperglicemia del hospitalizado". |
| Nutrición y Diabetes | Síndrome de Realimentación | tema | Aproximado | `1.02.2.004` Déficit agudo de tiamina | Mapeado a 1.02.2.004 "Déficit agudo de tiamina" (relación clínica con refeeding). Considerar también 1.02.1.001 "Desnutrición". |
| Nutrición y Diabetes | Farmacología Antidiabéticos orales y parenterales | examen | Sin match | _(sin match)_ | Es un tema farmacológico; no hay examen homólogo en sección 4 del catálogo. |
| Nutrición y Diabetes | Tipos de Insulina | examen | Sin match | _(sin match)_ | Tema farmacológico; sin examen homólogo en el catálogo. |
| Reumatología | Lumbago Inflamatorio | tema | Aproximado | `1.11.1.018` Pelviespondilopatías seronegativas | Mapeado a 1.11.1.018 "Pelviespondilopatías seronegativas" (dolor lumbar inflamatorio axial). Queda compartido con "Espondiloartropatías". |
| Enfermedades Respiratorias | Test de marcha | examen | Sin match | _(sin match)_ | El test de marcha de 6 minutos no figura en la sección 4 de Enf. Respiratorias. Lo más cercano es 1.05.4.014 "Saturometría arterial". |

## Notas metodológicas

- Especialidades homólogas usadas del catálogo: Hematología → **Hémato-oncología** (1.08), Nutrición y Diabetes → **Diabetes y nutrición** (1.02), Enfermedades Respiratorias → **Enfermedades respiratorias** (1.05). No existe "Urgencias" como especialidad: las urgencias son la sección `.2` de cada especialidad.
- "Exámenes complementarios" se buscaron en la **sección 4** (Exámenes e imagenología); algunos ítems del prototipo son en realidad temas farmacológicos y no tienen examen homólogo.
- Los códigos del prototipo original (`codigos` en el JSON fuente) eran **sintéticos/inventados** y se descartaron; este mapeo se hizo desde cero contra el catálogo oficial.
- Todos los códigos citados fueron verificados contra `content/eunacom-codes.json` (existen en el catálogo).
