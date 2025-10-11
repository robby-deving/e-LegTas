import React, { useEffect } from "react";
import Section from "./Section";
import { Input } from "../../ui/input";
import type { AgeRange, SexBuckets } from "../../../types/reporting";

const onlyDigits3 = (raw: string) => raw.replace(/\D/g, "").slice(0, 3);

const AgeRow: React.FC<{
  label?: string;
  value: AgeRange;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
}> = ({ label = "Age:", value, onMin, onMax }) => (
  <div className="flex items-center gap-2 text-sm">
    <span className="text-sm">{label}</span>

    <Input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={3}
      className="w-14 h-8 px-2 text-sm"
      value={value.min ?? ""}
      onChange={(e) => onMin(onlyDigits3(e.target.value))}
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => (e.target as HTMLInputElement).blur()}
    />

    <span>–</span>

    <Input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={3}
      className="w-14 h-8 px-2 text-sm"
      value={value.max ?? ""}
      onChange={(e) => onMax(onlyDigits3(e.target.value))}
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => (e.target as HTMLInputElement).blur()}
    />
  </div>
);

const Buckets: React.FC<{
  value: SexBuckets;
  onChange: (next: SexBuckets) => void;
}> = ({ value, onChange }) => (
  <>
    <label className="flex items-center">
      <input
        type="checkbox"
        className="brand-checkbox"
        checked={value.male}
        onChange={(e) => onChange({ ...value, male: e.target.checked })}
      />
      <span className="text-sm">Male</span>
    </label>
    <label className="flex items-center">
      <input
        type="checkbox"
        className="brand-checkbox"
        checked={value.female}
        onChange={(e) => onChange({ ...value, female: e.target.checked })}
      />
      <span className="text-sm">Female</span>
    </label>
    <label className="flex items-center">
      <input
        type="checkbox"
        className="brand-checkbox"
        checked={value.total}
        onChange={(e) => onChange({ ...value, total: e.target.checked })}
      />
      <span className="text-sm">Total</span>
    </label>
  </>
);

const Cat: React.FC<{
  title: string;
  open: boolean;
  setOpen: (v: boolean) => void;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  buckets: SexBuckets;
  setBuckets: (b: SexBuckets) => void;
  age?: AgeRange;
  setAge?: (a: AgeRange) => void;
  withAge?: boolean;
  className?: string;
}> = ({
  title,
  open,
  setOpen,
  setEnabled,
  buckets,
  setBuckets,
  age,
  setAge,
  withAge = true,
  className = "mt-2",
}) => {
  const vals = [buckets.male, buckets.female, buckets.total];
  const all = vals.every(Boolean);
  const none = vals.every((v) => !v);
  const mixed = !all && !none;

  const headerRef = React.useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerRef.current) headerRef.current.indeterminate = mixed;
  }, [mixed]);

  return (
    <Section
      variant="plain"
      label={
        <div className="flex items-center">
          <input
            ref={headerRef}
            type="checkbox"
            className="brand-checkbox"
            checked={all}
            onChange={(e) => {
              const v = e.target.checked;
              setEnabled(v);
              setBuckets({ male: v, female: v, total: v });
              if (v) setOpen(true);
            }}
          />
          <span className="ml-2">{title}</span>
        </div>
      }
      open={open}
      onToggle={() => setOpen(!open)}
      className={className}
    >
      <div
        className="pl-6 space-y-2"
        onPointerDownCapture={(e) => e.stopPropagation()}
        onKeyDownCapture={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {withAge && age && setAge && (
          <AgeRow
            value={age}
            onMin={(v) => {
              setAge({ ...age, min: v });
              if ((v ?? "") !== "" || (age.max ?? "") !== "") setEnabled(true);
            }}
            onMax={(v) => {
              setAge({ ...age, max: v });
              if ((age.min ?? "") !== "" || (v ?? "") !== "") setEnabled(true);
            }}
          />
        )}
        <Buckets
          value={buckets}
          onChange={(next) => {
            setBuckets(next);
            setEnabled(next.male || next.female || next.total);
          }}
        />
      </div>
    </Section>
  );
};

export default Cat;
