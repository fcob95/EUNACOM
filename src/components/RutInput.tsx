"use client";

/**
 * <RutInput> — input con formato automático 12.345.678-9 y validación del
 * dígito verificador (módulo 11). Error inline bajo el campo.
 */
import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cleanRut, formatRut } from "@/lib/rut";
import { cn } from "@/lib/utils";

interface RutInputProps {
  value: string;
  onChange: (raw: string) => void;
  error?: string | null;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function RutInput({
  value,
  onChange,
  error,
  disabled,
  autoFocus,
}: RutInputProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 block">
        RUT
      </Label>
      <Input
        id={id}
        inputMode="text"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder="12.345.678-9"
        value={formatRut(value)}
        onChange={(e) => onChange(cleanRut(e.target.value).slice(0, 9))}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "h-12 text-center text-lg font-semibold tracking-wide",
          error && "border-domain-1",
        )}
      />
      <p
        id={errorId}
        role="alert"
        className="mt-1.5 min-h-5 text-[13px] font-semibold text-domain-1"
      >
        {error}
      </p>
    </div>
  );
}
