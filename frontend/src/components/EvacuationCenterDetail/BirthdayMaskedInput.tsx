// components/BirthdayMaskedInput.tsx
import React from "react";
import { Input } from "../ui/input";

type Props = {
  value: string;                          
  onChange: (iso: string) => void;        
  required?: boolean;
  className?: string;                     
  placeholder?: string;
};

function isoToDisplay(iso?: string) {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  const [, y, mm, dd] = m;
  return `${mm}/${dd}/${y}`;
}

function displayToISO(display: string) {
  const digits = display.replace(/\D/g, "");
  if (digits.length !== 8) return "";
  const mm = parseInt(digits.slice(0, 2), 10);
  const dd = parseInt(digits.slice(2, 4), 10);
  const yyyy = parseInt(digits.slice(4, 8), 10);

  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return "";
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return "";

  const m2 = String(mm).padStart(2, "0");
  const d2 = String(dd).padStart(2, "0");
  return `${yyyy}-${m2}-${d2}`;
}

export default function BirthdayMaskedInput({
  value,
  onChange,
  required,
  className,
  placeholder = "MM/DD/YYYY",
}: Props) {
  const [text, setText] = React.useState(isoToDisplay(value));

  React.useEffect(() => {
    setText(isoToDisplay(value));
  }, [value]);

  function formatWithSlashes(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatWithSlashes(e.target.value);
    setText(formatted);
    const iso = displayToISO(formatted);
    onChange(iso); 
  }

  function clear() {
    setText("");
    onChange("");
  }

  return (
    <div className="relative w-full">
      <Input
        type="text"
        inputMode="numeric"
        pattern="\d{2}/\d{2}/\d{4}"
        placeholder={placeholder}
        value={text}
        onChange={handleChange}
        required={required}
        className={className}  
        aria-label="Birthday (MM/DD/YYYY)"
      />
      {text && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear date"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-700 text-white hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-600 cursor-pointer"
        >
          ×
        </button>
      )}
    </div>
  );
}
