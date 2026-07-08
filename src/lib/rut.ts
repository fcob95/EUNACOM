/**
 * RUT chileno: normalización, validación (dígito verificador módulo 11)
 * y formateo. Implementación canónica del proyecto — el espejo SQL vive en
 * public.is_valid_rut() (supabase/migrations/0001_init.sql).
 * Ver .claude/skills/rut-chileno para el procedimiento completo.
 */
import { z } from "zod";

/** Quita puntos, guiones y espacios; DV a mayúscula. '20.429.810-6' → '204298106' */
export function cleanRut(raw: string): string {
  return raw.replace(/[^0-9kK]/g, "").toUpperCase();
}

/** Calcula el dígito verificador (módulo 11) del cuerpo numérico. */
export function computeDv(body: string): string {
  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const mod = 11 - (sum % 11);
  if (mod === 11) return "0";
  if (mod === 10) return "K";
  return String(mod);
}

/** Valida un RUT en cualquier formato de entrada. */
export function isValidRut(raw: string): boolean {
  const clean = cleanRut(raw);
  if (clean.length < 8 || clean.length > 9) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;
  return computeDv(body) === dv;
}

/** Normaliza al formato de la DB: 'NNNNNNNN-D' (sin puntos, DV mayúscula). */
export function normalizeRut(raw: string): string {
  const clean = cleanRut(raw);
  return `${clean.slice(0, -1)}-${clean.slice(-1)}`;
}

/** Formatea para mostrar: '204298106' → '20.429.810-6' */
export function formatRut(raw: string): string {
  const clean = cleanRut(raw);
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots}-${dv}`;
}

/** Schema Zod: acepta cualquier formato de entrada, valida DV. */
export const rutSchema = z
  .string()
  .min(1, "Ingresa tu RUT")
  .refine((v) => cleanRut(v).length >= 8, "RUT incompleto")
  .refine(isValidRut, "RUT inválido. Revisa el dígito verificador.");
