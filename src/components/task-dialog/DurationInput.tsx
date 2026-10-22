"use client";

import { sanitizeDurationInput, normalizeDurationOnBlur } from "./duration-input";

interface DurationInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  wrapperClassName: string;
  inputClassName: string;
}

// Campo de duração HH:MM: filtra caracteres ao digitar e normaliza no blur
export function DurationInput({ id, value, onChange, wrapperClassName, inputClassName }: DurationInputProps) {
  return (
    <div className={wrapperClassName}>
      <input
        id={id}
        type="text"
        autoComplete="off"
        placeholder="ex: 36h:25m ou 08:00"
        value={value}
        onChange={(e) => onChange(sanitizeDurationInput(e.target.value))}
        onBlur={() => {
          const normalized = normalizeDurationOnBlur(value);
          if (normalized !== null) onChange(normalized);
        }}
        className={inputClassName}
      />
      <span className="absolute right-3 top-3 text-[11px] text-muted-foreground font-mono font-semibold pointer-events-none select-none">
        HH:MM
      </span>
    </div>
  );
}
