---
name: rut-chileno
description: Validación, normalización y formateo del RUT chileno (dígito verificador módulo 11). Úsala al tocar login, RutInput, la RPC login_with_rut, o cualquier código que reciba/muestre RUTs.
---

# RUT chileno

## Regla de oro
La implementación canónica vive en `src/lib/rut.ts` (`cleanRut`, `isValidRut`,
`formatRut`, `rutSchema` de Zod). El espejo SQL es `is_valid_rut()` en
`supabase/migrations/0001_init.sql`. **No dupliques el algoritmo en otro lugar**; si
cambia, cambia en ambos lados.

## Formatos
- Entrada del usuario: cualquier cosa (`20.429.810-6`, `20429810-6`, `204298106`, `k` minúscula).
- **Normalizado** (el que se guarda en DB, check `^[0-9]{7,8}-[0-9K]$`): sin puntos,
  DV en mayúscula, con guion → `20429810-6`.
- **Mostrado** (formatRut): con puntos → `20.429.810-6`.

## Algoritmo DV (módulo 11)
Recorre el cuerpo de derecha a izquierda multiplicando por factores 2,3,4,5,6,7,2,3...
Suma, calcula `11 - (suma % 11)`: 11→'0', 10→'K', otro→dígito.

## Implementación de referencia (src/lib/rut.ts)
```ts
import { z } from "zod";

/** Normaliza: '20.429.810-6' → '20429810-6' (sin puntos, DV mayúscula, con guion). */
export function cleanRut(raw: string): string {
  const chars = raw.toUpperCase().replace(/[^0-9K]/g, "");
  if (chars.length < 2) return chars;
  return `${chars.slice(0, -1)}-${chars.slice(-1)}`;
}

/** Valida el dígito verificador con módulo 11. Acepta cualquier formato de entrada. */
export function isValidRut(raw: string): boolean {
  const rut = cleanRut(raw);
  if (!/^\d{7,8}-[\dK]$/.test(rut)) return false;
  const [body, dv] = rut.split("-");
  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const mod = 11 - (sum % 11);
  const expected = mod === 11 ? "0" : mod === 10 ? "K" : String(mod);
  return dv === expected;
}

/** Formatea para mostrar: '20429810-6' → '20.429.810-6'. */
export function formatRut(raw: string): string {
  const rut = cleanRut(raw);
  const [body, dv] = rut.split("-");
  if (!dv) return rut;
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
}

/** Schema Zod: normaliza y valida. Úsalo en el form de login. */
export const rutSchema = z
  .string()
  .transform(cleanRut)
  .refine(isValidRut, "RUT inválido: revisa el dígito verificador");
```

## Notas
- `login_with_rut()` en SQL vuelve a normalizar y validar server-side: la validación
  cliente es UX, la del servidor es la que manda.
- Casos de prueba: `20429810-6` válido; `20429810-5` inválido; DV `K` (p.ej.
  `20347878-K`) y DV `0` deben cubrirse.
