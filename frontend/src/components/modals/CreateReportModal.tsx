// CreateReportModal.tsx
import React, { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Clock, ChevronRight, Loader2 } from "lucide-react";
import { DateTimePicker } from "../ui/date-time-picker";

// --- Keep your existing prop shape so this is drop-in compatible ---
type EvacuationCenter = { id: string; name: string; barangay?: string };
type Barangay = { id: string; name: string };
type IdName = { id: string; name: string };
// ---- Disaggregated option state ----
type AgeRange = { min: string; max: string };
type SexBuckets = { male: boolean; female: boolean; total: boolean };

export type CreateReportModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;

  reportName: string;
  setReportName: (value: string) => void;

  reportType: string; // UI label (e.g., "Aggregated" | "Disaggregated" | "Barangay Report")
  setReportType: (value: string) => void;

  // value to submit (name)
  disasterEvent: string;
  setDisasterEvent: (value: string) => void;

  fileFormat: string;
  setFileFormat: (value: string) => void;

  // Legacy props
  evacuationQuery: string;
  setEvacuationQuery: (value: string) => void;
  evacuationResults: EvacuationCenter[];
  setEvacuationResults: (centers: EvacuationCenter[]) => void;
  selectedCenter: { id: string; name: string } | null;
  setSelectedCenter: (center: { id: string; name: string } | null) => void;

  // Barangay search props for Barangay Report
  barangayQuery: string;
  setBarangayQuery: (value: string) => void;
  barangayResults: Barangay[];
  setBarangayResults: (barangays: Barangay[]) => void;
  selectedBarangay: { id: string; name: string } | null;
  setSelectedBarangay: (barangay: { id: string; name: string } | null) => void;

  // Disaster Event search (you can keep your existing async search)
  disasterQuery: string;
  setDisasterQuery: (value: string) => void;
  disasterResults: IdName[];
  setDisasterResults: (rows: IdName[]) => void;
  selectedDisaster: IdName | null;
  setSelectedDisaster: (row: IdName | null) => void;

  formErrors: { [key: string]: string };
  isCreating: boolean;
  onCreate: (opts?: { fields?: any }) => void; // parent builds payload

  reportTypes: string[]; 
  fileFormats: string[]; 

  clearFormError?: (key: string) => void;

  date: Date | undefined;
  setDate: (date: Date | undefined) => void;

  time: string; // "HH:mm"
  setTime: (time: string) => void;

  /** Number of rows that will be exported (from a lightweight pre-check). If undefined, we allow download. */
  rowCount?: number;
};

const checkboxGreenStyle = `
/* Brand checkbox: fixed size everywhere (20px) */
.brand-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid #00824E;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  position: relative;
  margin-right: 0.75rem;
  vertical-align: middle;
  transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
}

.brand-checkbox:checked {
  background-color: #00824E;
  border-color: #00824E;
}

/* Tick mark sized/positioned for 20px box */
.brand-checkbox:checked:after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 6px;
  height: 11px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  pointer-events: none;
  display: block;
}

.brand-checkbox:indeterminate {
  background-color: #00824E;
  border-color: #00824E;
}

/* Centered bar for indeterminate (20px box) */
.brand-checkbox:indeterminate:after {
  content: '';
  position: absolute;
  left: 4px;           /* (20 - 12) / 2 */
  top: 8.5px;          /* (20 - 3) / 2 */
  width: 12px;
  height: 3px;
  background: #fff;
  border-radius: 1px;
  display: block;
}
  /* Disabled look */
.brand-checkbox:disabled {
  border-color: #D1D5DB;   /* gray-300 */
  background: #F9FAFB;     /* gray-50 */
  cursor: not-allowed;
}
.brand-checkbox:disabled:checked,
.brand-checkbox:disabled:indeterminate {
  background-color: #9CA3AF; /* gray-400 */
  border-color: #9CA3AF;
}
`;

/* ---------------- Collapsible Section (chevron in left gutter; content stays aligned) ---------------- */
function Section({
  label,
  open,
  onToggle,
  children,
  className = "",
  variant = "card",
  flushLeft = false,
}: {
  label: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: "card" | "plain";
  flushLeft?: boolean;
}) {
  const isPlain = variant === "plain";
  const wrapper = isPlain ? className : `rounded-md border border-gray-200 ${className}`;

  const header = isPlain
    ? `relative flex w-full items-center gap-2 py-1 ${flushLeft ? "" : "pl-6"}`
    : "flex w-full items-center gap-2 px-3 py-2 hover:bg-gray-50";

  const body = isPlain
    ? `${flushLeft ? "" : "pl-6"} pb-2 pt-1 space-y-2`
    : "px-4 pb-3 pt-1 space-y-2";

  const chevronPos = isPlain
    ? flushLeft
      ? "-left-4"
      : "left-0"
    : "left-0";

  return (
    <div className={wrapper}>
      <button type="button" onClick={onToggle} className={header}>
        <ChevronRight
          className={`h-4 w-4 text-gray-600 transition-transform absolute ${chevronPos} top-1.5 ${open ? "rotate-90" : ""}`}
        />
        <div className="text-sm font-semibold text-gray-900">{label}</div>
      </button>
      {open && <div className={body}>{children}</div>}
    </div>
  );
}

/* ---------------- Option State ---------------- */
// Options under Aggregated
interface AggregatedOptions {
  nameOfCenter: boolean;
  address: boolean;
  origin: boolean;
  displaced: {
    inside: {
      families: boolean;
      persons: {
        male: boolean;
        female: boolean;
        total: boolean;
      };
    };
    outside: {
      families: boolean;
      persons: {
        male: boolean;
        female: boolean;
        total: boolean;
      };
    };
  };
}
interface DisaggregatedOptions {
  // top-level columns
  barangayName: boolean;
  evacuationCenterSite: boolean;
  family: boolean;
  totalMale: boolean;
  totalFemale: boolean;
  totalIndividuals: boolean;

  // age-bucketed groups
  infant:  { enabled: boolean; age: AgeRange; buckets: SexBuckets };
  children:{ enabled: boolean; age: AgeRange; buckets: SexBuckets };
  youth:   { enabled: boolean; age: AgeRange; buckets: SexBuckets };
  adult:   { enabled: boolean; age: AgeRange; buckets: SexBuckets };
  seniors: { enabled: boolean; age: AgeRange; buckets: SexBuckets };

  // groups without age
  pwd: { enabled: boolean; buckets: SexBuckets };

  // single-column groups
  pregnantWomen: boolean;
  lactatingWomen: boolean;
}
interface BarangayOptions {
  evacuationCenterSite: boolean;

  familyHead: {
    enabled: boolean;
    name: boolean;
    sex: boolean;
  };

  purok: boolean;                 // single Purok (if you really need two, tell me and I’ll add it)
  totalMale: boolean;
  totalFemale: boolean;
  totalIndividuals: boolean;

  infant:   { enabled: boolean; age: AgeRange; buckets: SexBuckets };
  children: { enabled: boolean; age: AgeRange; buckets: SexBuckets };
  youth:    { enabled: boolean; age: AgeRange; buckets: SexBuckets };
  adult:    { enabled: boolean; age: AgeRange; buckets: SexBuckets };
  seniors:  { enabled: boolean; age: AgeRange; buckets: SexBuckets };

  pwd: { enabled: boolean; buckets: SexBuckets };

  pregnantWomen: boolean;
  lactatingWomen: boolean;
}


export default function CreateReportModal(props: CreateReportModalProps) {
  const {
    isOpen,
    onOpenChange,
    reportName,
    setReportName,
    reportType,
    setReportType,
    disasterEvent,
    setDisasterEvent,
    fileFormat,
    setFileFormat,
    // Legacy/aux props (kept for compatibility)
    barangayQuery,
    setBarangayQuery,
    barangayResults,
    setBarangayResults,
    selectedBarangay,
    setSelectedBarangay,
    disasterQuery,
    setDisasterQuery,
    disasterResults,
    setDisasterResults,
    selectedDisaster,
    setSelectedDisaster,
    formErrors,
    isCreating,
    onCreate,
    reportTypes, // kept for contract (unused here)
    fileFormats,
    clearFormError,
    date,
    setDate,
    time,
    setTime,
    rowCount,
  } = props;

  // which major type is chosen (UI label)
  const selectedType = reportType; // 'Aggregated' | 'Disaggregated' | 'Barangay Report'
  // Only one section can be edited/selected at a time
const aggDisabled = selectedType !== "" && selectedType !== "Aggregated";
const disDisabled = selectedType !== "" && selectedType !== "Disaggregated";
const bgyDisabled = selectedType !== "" && selectedType !== "Barangay Report";


  // collapsed by default
  const [aggOpen, setAggOpen] = useState(false);
  const [aggNumOpen, setAggNumOpen] = useState(false);
  const [aggInsideOpen, setAggInsideOpen] = useState(false);
  const [aggOutsideOpen, setAggOutsideOpen] = useState(false);
  const [aggInsidePersonsOpen, setAggInsidePersonsOpen] = useState(false);
  const [aggOutsidePersonsOpen, setAggOutsidePersonsOpen] = useState(false);

  // Aggregated checkbox states (default to false)
  const [agg, setAgg] = useState<AggregatedOptions>({
    nameOfCenter: false,
    address: false,
    origin: false,
    displaced: {
      inside: { families: false, persons: { male: false, female: false, total: false } },
      outside: { families: false, persons: { male: false, female: false, total: false } },
    },
  });

  // --- aggregated parent checkbox (checked / indeterminate) ---
  const flatAgg = useMemo(
    () => [
      agg.nameOfCenter,
      agg.address,
      agg.origin,
      agg.displaced.inside.families,
      agg.displaced.inside.persons.male,
      agg.displaced.inside.persons.female,
      agg.displaced.inside.persons.total,
      agg.displaced.outside.families,
      agg.displaced.outside.persons.male,
      agg.displaced.outside.persons.female,
      agg.displaced.outside.persons.total,
    ],
    [agg]
  );

  const aggAll = flatAgg.every(Boolean);
  const aggNone = flatAgg.every((v) => !v);
  const aggMixed = !aggAll && !aggNone;

  const aggHeaderRef = React.useRef<HTMLInputElement>(null);
useEffect(() => {
  if (aggHeaderRef.current) {
    aggHeaderRef.current.indeterminate = selectedType === "Aggregated" && aggMixed;
  }
}, [selectedType, aggMixed]);


  const setAllAgg = (v: boolean) => {
    setAgg({
      nameOfCenter: v,
      address: v,
      origin: v,
      displaced: {
        inside: {
          families: v,
          persons: { male: v, female: v, total: v },
        },
        outside: {
          families: v,
          persons: { male: v, female: v, total: v },
        },
      },
    });
  };

  // --- Aggregated subgroup select-all + indeterminate -----------------
const insidePersonsVals = useMemo(
  () => [
    agg.displaced.inside.persons.male,
    agg.displaced.inside.persons.female,
    agg.displaced.inside.persons.total,
  ],
  [agg]
);
const insidePersonsAll = insidePersonsVals.every(Boolean);
const insidePersonsNone = insidePersonsVals.every(v => !v);
const insidePersonsMixed = !insidePersonsAll && !insidePersonsNone;
const insidePersonsRef = React.useRef<HTMLInputElement>(null);
useEffect(() => {
  if (insidePersonsRef.current) insidePersonsRef.current.indeterminate = insidePersonsMixed;
}, [insidePersonsMixed]);

const outsidePersonsVals = useMemo(
  () => [
    agg.displaced.outside.persons.male,
    agg.displaced.outside.persons.female,
    agg.displaced.outside.persons.total,
  ],
  [agg]
);
const outsidePersonsAll = outsidePersonsVals.every(Boolean);
const outsidePersonsNone = outsidePersonsVals.every(v => !v);
const outsidePersonsMixed = !outsidePersonsAll && !outsidePersonsNone;
const outsidePersonsRef = React.useRef<HTMLInputElement>(null);
useEffect(() => {
  if (outsidePersonsRef.current) outsidePersonsRef.current.indeterminate = outsidePersonsMixed;
}, [outsidePersonsMixed]);

const insideGroupVals = useMemo(
  () => [agg.displaced.inside.families, ...insidePersonsVals],
  [agg, insidePersonsVals]
);
const insideAll = insideGroupVals.every(Boolean);
const insideNone = insideGroupVals.every(v => !v);
const insideMixed = !insideAll && !insideNone;
const insideRef = React.useRef<HTMLInputElement>(null);
useEffect(() => {
  if (insideRef.current) insideRef.current.indeterminate = insideMixed;
}, [insideMixed]);

const outsideGroupVals = useMemo(
  () => [agg.displaced.outside.families, ...outsidePersonsVals],
  [agg, outsidePersonsVals]
);
const outsideAll = outsideGroupVals.every(Boolean);
const outsideNone = outsideGroupVals.every(v => !v);
const outsideMixed = !outsideAll && !outsideNone;
const outsideRef = React.useRef<HTMLInputElement>(null);
useEffect(() => {
  if (outsideRef.current) outsideRef.current.indeterminate = outsideMixed;
}, [outsideMixed]);

const displacedVals = useMemo(
  () => [...insideGroupVals, ...outsideGroupVals],
  [insideGroupVals, outsideGroupVals]
);
const displacedAll = displacedVals.every(Boolean);
const displacedNone = displacedVals.every(v => !v);
const displacedMixed = !displacedAll && !displacedNone;
const displacedRef = React.useRef<HTMLInputElement>(null);
useEffect(() => {
  if (displacedRef.current) displacedRef.current.indeterminate = displacedMixed;
}, [displacedMixed]);

// Setters
const setInsidePersonsAll = (v: boolean) =>
  setAgg(s => ({
    ...s,
    displaced: {
      ...s.displaced,
      inside: {
        ...s.displaced.inside,
        persons: { male: v, female: v, total: v },
      },
    },
  }));

const setOutsidePersonsAll = (v: boolean) =>
  setAgg(s => ({
    ...s,
    displaced: {
      ...s.displaced,
      outside: {
        ...s.displaced.outside,
        persons: { male: v, female: v, total: v },
      },
    },
  }));

const setInsideAll = (v: boolean) =>
  setAgg(s => ({
    ...s,
    displaced: {
      ...s.displaced,
      inside: { families: v, persons: { male: v, female: v, total: v } },
    },
  }));

const setOutsideAll = (v: boolean) =>
  setAgg(s => ({
    ...s,
    displaced: {
      ...s.displaced,
      outside: { families: v, persons: { male: v, female: v, total: v } },
    },
  }));

const setDisplacedAll = (v: boolean) =>
  setAgg(s => ({
    ...s,
    displaced: {
      inside: { families: v, persons: { male: v, female: v, total: v } },
      outside: { families: v, persons: { male: v, female: v, total: v } },
    },
  }));




  // ---- Disaggregated UI state ----
const [disOpen, setDisOpen] = useState(false);
const [disInfantOpen, setDisInfantOpen] = useState(false);
const [disChildrenOpen, setDisChildrenOpen] = useState(false);
const [disYouthOpen, setDisYouthOpen] = useState(false);
const [disAdultOpen, setDisAdultOpen] = useState(false);
const [disSeniorsOpen, setDisSeniorsOpen] = useState(false);
const [disPWDOpen, setDisPWDOpen] = useState(false);

const [disagg, setDisagg] = useState<DisaggregatedOptions>({
  barangayName: false,
  evacuationCenterSite: false,
  family: false,
  totalMale: false,
  totalFemale: false,
  totalIndividuals: false,

  infant:   { enabled: false, age: { min: "", max: "" }, buckets: { male: false, female: false, total: false } },
  children: { enabled: false, age: { min: "", max: "" }, buckets: { male: false, female: false, total: false } },
  youth:    { enabled: false, age: { min: "", max: "" }, buckets: { male: false, female: false, total: false } },
  adult:    { enabled: false, age: { min: "", max: "" }, buckets: { male: false, female: false, total: false } },
  seniors:  { enabled: false, age: { min: "", max: "" }, buckets: { male: false, female: false, total: false } },

  pwd: { enabled: false, buckets: { male: false, female: false, total: false } },

  pregnantWomen: false,
  lactatingWomen: false,
});

// ---- Disaggregated select-all + indeterminate helpers ----
const disHeaderRef = React.useRef<HTMLInputElement>(null);

// buckets per group
const infantBuckets   = useMemo(() => [disagg.infant.buckets.male,   disagg.infant.buckets.female,   disagg.infant.buckets.total],   [disagg.infant.buckets]);
const childrenBuckets = useMemo(() => [disagg.children.buckets.male, disagg.children.buckets.female, disagg.children.buckets.total], [disagg.children.buckets]);
const youthBuckets    = useMemo(() => [disagg.youth.buckets.male,    disagg.youth.buckets.female,    disagg.youth.buckets.total],    [disagg.youth.buckets]);
const adultBuckets    = useMemo(() => [disagg.adult.buckets.male,    disagg.adult.buckets.female,    disagg.adult.buckets.total],    [disagg.adult.buckets]);
const seniorsBuckets  = useMemo(() => [disagg.seniors.buckets.male,  disagg.seniors.buckets.female,  disagg.seniors.buckets.total],  [disagg.seniors.buckets]);
const pwdBuckets      = useMemo(() => [disagg.pwd.buckets.male,      disagg.pwd.buckets.female,      disagg.pwd.buckets.total],      [disagg.pwd.buckets]);

// top-level columns (non-age)
const disTopCols = useMemo(
  () => [
    disagg.barangayName,
    disagg.evacuationCenterSite,
    disagg.family,
    disagg.totalMale,
    disagg.totalFemale,
    disagg.totalIndividuals,
    disagg.pregnantWomen,
    disagg.lactatingWomen,
  ],
  [
    disagg.barangayName,
    disagg.evacuationCenterSite,
    disagg.family,
    disagg.totalMale,
    disagg.totalFemale,
    disagg.totalIndividuals,
    disagg.pregnantWomen,
    disagg.lactatingWomen,
  ]
);

// we also include each group's "enabled" so "all" truly means everything is on
const disEnabledFlags = useMemo(
  () => [
    disagg.infant.enabled,
    disagg.children.enabled,
    disagg.youth.enabled,
    disagg.adult.enabled,
    disagg.seniors.enabled,
    disagg.pwd.enabled,
  ],
  [
    disagg.infant.enabled,
    disagg.children.enabled,
    disagg.youth.enabled,
    disagg.adult.enabled,
    disagg.seniors.enabled,
    disagg.pwd.enabled,
  ]
);

const disFlat = useMemo(
  () => [
    ...disTopCols,
    ...disEnabledFlags,
    ...infantBuckets,
    ...childrenBuckets,
    ...youthBuckets,
    ...adultBuckets,
    ...seniorsBuckets,
    ...pwdBuckets,
  ],
  [disTopCols, disEnabledFlags, infantBuckets, childrenBuckets, youthBuckets, adultBuckets, seniorsBuckets, pwdBuckets]
);

const disAll = disFlat.every(Boolean);
const disNone = disFlat.every(v => !v);
const disMixed = !disAll && !disNone;

useEffect(() => {
  if (disHeaderRef.current) {
    disHeaderRef.current.indeterminate = selectedType === "Disaggregated" && disMixed;
  }
}, [selectedType, disMixed]);


const setAllDisagg = (v: boolean) =>
  setDisagg(s => ({
    ...s,
    // top-level cols
    barangayName: v,
    evacuationCenterSite: v,
    family: v,
    totalMale: v,
    totalFemale: v,
    totalIndividuals: v,
    // age groups - preserve ages, toggle enabled + buckets
    infant:   { enabled: v, age: s.infant.age,   buckets: { male: v, female: v, total: v } },
    children: { enabled: v, age: s.children.age, buckets: { male: v, female: v, total: v } },
    youth:    { enabled: v, age: s.youth.age,    buckets: { male: v, female: v, total: v } },
    adult:    { enabled: v, age: s.adult.age,    buckets: { male: v, female: v, total: v } },
    seniors:  { enabled: v, age: s.seniors.age,  buckets: { male: v, female: v, total: v } },
    // PWD (no age)
    pwd: { enabled: v, buckets: { male: v, female: v, total: v } },
    // singles
    pregnantWomen: v,
    lactatingWomen: v,
  }));



// ---- Barangay Report UI state ----
const [bgyOpen, setBgyOpen] = useState(false);
const [bgyFamilyOpen, setBgyFamilyOpen] = useState(false);
const [bgyInfantOpen, setBgyInfantOpen] = useState(false);
const [bgyChildrenOpen, setBgyChildrenOpen] = useState(false);
const [bgyYouthOpen, setBgyYouthOpen] = useState(false);
const [bgyAdultOpen, setBgyAdultOpen] = useState(false);
const [bgySeniorsOpen, setBgySeniorsOpen] = useState(false);
const [bgyPWDOpen, setBgyPWDOpen] = useState(false);

const [bgy, setBgy] = useState<BarangayOptions>({
  evacuationCenterSite: false,

  familyHead: {
    enabled: false,
    name: false,
    sex: false,
  },

  purok: false,
  totalMale: false,
  totalFemale: false,
  totalIndividuals: false,

  infant:   { enabled: false, age: { min: "", max: "" }, buckets: { male: false, female: false, total: false } },
  children: { enabled: false, age: { min: "", max: "" }, buckets: { male: false, female: false, total: false } },
  youth:    { enabled: false, age: { min: "", max: "" }, buckets: { male: false, female: false, total: false } },
  adult:    { enabled: false, age: { min: "", max: "" }, buckets: { male: false, female: false, total: false } },
  seniors:  { enabled: false, age: { min: "", max: "" }, buckets: { male: false, female: false, total: false } },

  pwd: { enabled: false, buckets: { male: false, female: false, total: false } },

  pregnantWomen: false,
  lactatingWomen: false,
});

// parent select-all + indeterminate for Barangay
const flatBgy = useMemo(
  () => [
    bgy.evacuationCenterSite,
    bgy.familyHead.enabled, bgy.familyHead.name, bgy.familyHead.sex,
    bgy.purok, bgy.totalMale, bgy.totalFemale, bgy.totalIndividuals,

    bgy.infant.enabled,   bgy.infant.buckets.male,   bgy.infant.buckets.female,   bgy.infant.buckets.total,
    bgy.children.enabled, bgy.children.buckets.male, bgy.children.buckets.female, bgy.children.buckets.total,
    bgy.youth.enabled,    bgy.youth.buckets.male,    bgy.youth.buckets.female,    bgy.youth.buckets.total,
    bgy.adult.enabled,    bgy.adult.buckets.male,    bgy.adult.buckets.female,    bgy.adult.buckets.total,
    bgy.seniors.enabled,  bgy.seniors.buckets.male,  bgy.seniors.buckets.female,  bgy.seniors.buckets.total,

    bgy.pwd.enabled, bgy.pwd.buckets.male, bgy.pwd.buckets.female, bgy.pwd.buckets.total,

    bgy.pregnantWomen, bgy.lactatingWomen,
  ],
  [bgy]
);

const bgyAll   = flatBgy.every(Boolean);
const bgyNone  = flatBgy.every((v) => !v);
const bgyMixed = !bgyAll && !bgyNone;

const bgyHeaderRef = React.useRef<HTMLInputElement>(null);
useEffect(() => {
  if (bgyHeaderRef.current) {
    bgyHeaderRef.current.indeterminate = selectedType === "Barangay Report" && bgyMixed;
  }
}, [selectedType, bgyMixed]);


const setAllBgy = (v: boolean) => {
  setBgy((s) => ({
    evacuationCenterSite: v,

    familyHead: { enabled: v, name: v, sex: v },

    purok: v,
    totalMale: v,
    totalFemale: v,
    totalIndividuals: v,

    infant:   { enabled: v, age: { ...s.infant.age },   buckets: { male: v, female: v, total: v } },
    children: { enabled: v, age: { ...s.children.age }, buckets: { male: v, female: v, total: v } },
    youth:    { enabled: v, age: { ...s.youth.age },    buckets: { male: v, female: v, total: v } },
    adult:    { enabled: v, age: { ...s.adult.age },    buckets: { male: v, female: v, total: v } },
    seniors:  { enabled: v, age: { ...s.seniors.age },  buckets: { male: v, female: v, total: v } },

    pwd: { enabled: v, buckets: { male: v, female: v, total: v } },

    pregnantWomen: v,
    lactatingWomen: v,
  }));
};




  // Reset barangay selection if type changes away from Barangay
  useEffect(() => {
    if (selectedType !== "Barangay Report") {
      setSelectedBarangay(null);
      setBarangayQuery("");
    }
  }, [selectedType, setSelectedBarangay, setBarangayQuery]);

  // --- enable/disable logic ---
  const hasRequired = useMemo(() => {
    const base = !!reportName && !!selectedType;
    if (!base) return false;

    // require a disaster selection for all types
    const hasDisaster = !!selectedDisaster?.id || !!disasterEvent;
    if (!hasDisaster) return false;

    // For Barangay Report, require barangay pick
    if (selectedType === "Barangay Report") return !!selectedBarangay?.id;

    return true;
  }, [reportName, selectedType, selectedDisaster, disasterEvent, selectedBarangay]);

  // If rowCount is undefined, assume pre-check isn't wired yet and allow download.
  const hasData = rowCount === undefined ? true : rowCount > 0;
  const canDownload = hasRequired && hasData && !isCreating;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <style>{checkboxGreenStyle}</style>
     
<DialogContent className="sm:max-w-[720px] max-w-[95vw] max-h-[85vh] overflow-hidden">
        <DialogHeader className="relative">
          <DialogTitle className="text-green-700 text-xl font-bold">Create Report</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Fill out the details below to generate and download a report.
          </DialogDescription>
        </DialogHeader>

    <div className="space-y-1 pr-2 pb-2 max-h-152 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-corner]:bg-transparent dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500 [scrollbar-width:thin] [scrollbar-color:rgb(209_213_219)_transparent] dark:[scrollbar-color:rgb(115_115_115)_transparent]">
          <form
            id="createReportForm"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (canDownload) {
                onCreate({
                  // send only the fields relevant to the chosen type
                  fields:
                    selectedType === "Aggregated"
                      ? agg
                      : selectedType === "Disaggregated"
                      ? disagg
                      : selectedType === "Barangay Report"
                      ? bgy
                      : undefined,
                });
             }
             }}
           >
            {/* Report Name */}
            <div>
              <label className="block text-sm font-semibold mb-2">Report Name:</label>
              <Input
                placeholder="Enter report name"
                className="w-full"
                value={reportName}
                onChange={(e) => {
                  setReportName(e.target.value);
                  clearFormError && clearFormError("reportName");
                }}
                required
              />
              {formErrors.reportName && (
                <p className="text-red-600 text-sm mt-1">{formErrors.reportName}</p>
              )}
            </div>

            {/* Report Types (checkbox UI + indeterminate for Aggregated) */}
            <div>
              <label className="block text-sm font-semibold mb-2">Report Types:</label>

              <div className="rounded-md border border-gray-200 p-3 space-y-3">
                {/* Aggregated header row */}
                <div>
                 <div className={`flex items-center gap-2 ${aggDisabled ? "opacity-50" : ""}`}>
  <button
    type="button"
    onClick={() => !aggDisabled && setAggOpen((o) => !o)}
    disabled={aggDisabled}
    className="flex items-center p-0 rounded disabled:cursor-not-allowed"
    aria-label={aggOpen ? "Collapse Aggregated" : "Expand Aggregated"}
  >
    <ChevronRight
      className={`h-4 w-4 text-gray-600 transition-transform ${aggOpen ? "rotate-90" : ""}`}
    />
  </button>

  <input
    ref={aggHeaderRef}
    type="checkbox"
    className="brand-checkbox"
    disabled={aggDisabled}
    checked={selectedType === "Aggregated" ? aggAll : false}
    onChange={(e) => {
      const checked = e.target.checked;
      setReportType(checked ? "Aggregated" : "");
      setAllAgg(checked);

      if (checked) {
        setAggOpen(true);
        setAggNumOpen(true);
        setAggInsideOpen(true);
        setAggOutsideOpen(true);
        setAggInsidePersonsOpen(true);
        setAggOutsidePersonsOpen(true);
        // clear the others
        setAllDisagg(false);
        setAllBgy(false);
        setDisOpen(false);
        setBgyOpen(false);
      } else {
        // when unchecked, bring everything back to normal
        setAggOpen(false);
        setAggNumOpen(false);
        setAggInsideOpen(false);
        setAggOutsideOpen(false);
        setAggInsidePersonsOpen(false);
        setAggOutsidePersonsOpen(false);
      }
    }}
  />
  <span className="text-left font-semibold text-sm">Aggregated</span>
</div>


{/* Aggregated children */}
{aggOpen && (
  <fieldset disabled={aggDisabled}>
    <div className="pl-22 mt-2 space-y-2">
    {/* Simple columns */}
    <label className="flex items-center">
      <input
        type="checkbox"
        className="brand-checkbox"
        checked={agg.nameOfCenter}
        onChange={(e) => setAgg((s) => ({ ...s, nameOfCenter: e.target.checked }))}
      />
      <span className="text-sm">Name of Evacuation Center</span>
    </label>

    <label className="flex items-center">
      <input
        type="checkbox"
        className="brand-checkbox"
        checked={agg.address}
        onChange={(e) => setAgg((s) => ({ ...s, address: e.target.checked }))}
      />
      <span className="text-sm">Address</span>
    </label>

    <label className="flex items-center">
      <input
        type="checkbox"
        className="brand-checkbox"
        checked={agg.origin}
        onChange={(e) => setAgg((s) => ({ ...s, origin: e.target.checked }))}
      />
      <span className="text-sm">Origin of IDPs / Barangay Name</span>
    </label>

    {/* Number of Displaced (borderless) */}
    <Section
      variant="plain"
      className="mt-2"
      label={
        <div className="flex items-center">
<input
  ref={displacedRef}
  type="checkbox"
  className="brand-checkbox"
  checked={displacedAll}
  onChange={(e) => {
    const v = e.target.checked;
    setDisplacedAll(v);
    if (v) {
      setAggNumOpen(true);
      setAggInsideOpen(true);
      setAggOutsideOpen(true);
      setAggInsidePersonsOpen(true);
      setAggOutsidePersonsOpen(true);
    }
  }}
/>

          <span className="ml-0.2">Number of Displaced</span>
        </div>
      }
      open={aggNumOpen}
      onToggle={() => setAggNumOpen((v) => !v)}
    >
      {/* Inside ECs (borderless) */}
      <Section
        variant="plain"
        label={
          <div className="flex items-center">
<input
  ref={insideRef}
  type="checkbox"
  className="brand-checkbox"
  checked={insideAll}
  onChange={(e) => {
    const v = e.target.checked;
    setInsideAll(v);
    if (v) {
      setAggInsideOpen(true);
      setAggInsidePersonsOpen(true);
    }
  }}
/>

            <span className="ml-0.2">Inside ECs</span>
          </div>
        }
        open={aggInsideOpen}
        onToggle={() => setAggInsideOpen((o) => !o)}
      >
        <div className="pl-6 space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="brand-checkbox"
              checked={agg.displaced.inside.families}
              onChange={(e) =>
                setAgg((s) => ({
                  ...s,
                  displaced: {
                    ...s.displaced,
                    inside: { ...s.displaced.inside, families: e.target.checked },
                  },
                }))
              }
            />
            <span className="text-sm">Families</span>
          </label>

          {/* Persons (borderless, aligned with "Families") */}
          <Section
            variant="plain"
            label={
              <div className="flex items-center">
<input
  ref={insidePersonsRef}
  type="checkbox"
  className="brand-checkbox"
  checked={insidePersonsAll}
  onChange={(e) => {
    const v = e.target.checked;
    setInsidePersonsAll(v);
    if (v) setAggInsidePersonsOpen(true);
  }}
/>

                <span className="ml-0.2">Persons</span>
              </div>
            }
            open={aggInsidePersonsOpen}
            onToggle={() => setAggInsidePersonsOpen((o) => !o)}
            className="mt-1"
          >
            <label className="flex items-center">
              <input
                type="checkbox"
                className="brand-checkbox"
                checked={agg.displaced.inside.persons.male}
                onChange={(e) =>
                  setAgg((s) => ({
                    ...s,
                    displaced: {
                      ...s.displaced,
                      inside: {
                        ...s.displaced.inside,
                        persons: { ...s.displaced.inside.persons, male: e.target.checked },
                      },
                    },
                  }))
                }
              />
              <span className="text-sm">Male</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                className="brand-checkbox"
                checked={agg.displaced.inside.persons.female}
                onChange={(e) =>
                  setAgg((s) => ({
                    ...s,
                    displaced: {
                      ...s.displaced,
                      inside: {
                        ...s.displaced.inside,
                        persons: { ...s.displaced.inside.persons, female: e.target.checked },
                      },
                    },
                  }))
                }
              />
              <span className="text-sm">Female</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                className="brand-checkbox"
                checked={agg.displaced.inside.persons.total}
                onChange={(e) =>
                  setAgg((s) => ({
                    ...s,
                    displaced: {
                      ...s.displaced,
                      inside: {
                        ...s.displaced.inside,
                        persons: { ...s.displaced.inside.persons, total: e.target.checked },
                      },
                    },
                  }))
                }
              />
              <span className="text-sm">Total</span>
            </label>
          </Section>
        </div>
      </Section>

      {/* Outside ECs (borderless) */}
      <Section
        variant="plain"
        label={
          <div className="flex items-center">
<input
  ref={outsideRef}
  type="checkbox"
  className="brand-checkbox"
  checked={outsideAll}
  onChange={(e) => {
    const v = e.target.checked;
    setOutsideAll(v);
    if (v) {
      setAggOutsideOpen(true);
      setAggOutsidePersonsOpen(true);
    }
  }}
/>

            <span className="ml-0.2">Outside ECs</span>
          </div>
        }
        open={aggOutsideOpen}
        onToggle={() => setAggOutsideOpen((o) => !o)}
        className="mt-2"
      >
        <div className="pl-6 space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="brand-checkbox"
              checked={agg.displaced.outside.families}
              onChange={(e) =>
                setAgg((s) => ({
                  ...s,
                  displaced: {
                    ...s.displaced,
                    outside: { ...s.displaced.outside, families: e.target.checked },
                  },
                }))
              }
            />
            <span className="text-sm">Families</span>
          </label>

          {/* Persons (borderless, aligned with "Families") */}
          <Section
            variant="plain"
            label={
              <div className="flex items-center">
<input
  ref={outsidePersonsRef}
  type="checkbox"
  className="brand-checkbox"
  checked={outsidePersonsAll}
  onChange={(e) => {
    const v = e.target.checked;
    setOutsidePersonsAll(v);
    if (v) setAggOutsidePersonsOpen(true);
  }}
/>

                <span className="ml-0.2">Persons</span>
              </div>
            }
            open={aggOutsidePersonsOpen}
            onToggle={() => setAggOutsidePersonsOpen((o) => !o)}
            className="mt-1"
          >
            <label className="flex items-center">
              <input
                type="checkbox"
                className="brand-checkbox"
                checked={agg.displaced.outside.persons.male}
                onChange={(e) =>
                  setAgg((s) => ({
                    ...s,
                    displaced: {
                      ...s.displaced,
                      outside: {
                        ...s.displaced.outside,
                        persons: { ...s.displaced.outside.persons, male: e.target.checked },
                      },
                    },
                  }))
                }
              />
              <span className="text-sm">Male</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                className="brand-checkbox"
                checked={agg.displaced.outside.persons.female}
                onChange={(e) =>
                  setAgg((s) => ({
                    ...s,
                    displaced: {
                      ...s.displaced,
                      outside: {
                        ...s.displaced.outside,
                        persons: { ...s.displaced.outside.persons, female: e.target.checked },
                      },
                    },
                  }))
                }
              />
              <span className="text-sm">Female</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                className="brand-checkbox"
                checked={agg.displaced.outside.persons.total}
                onChange={(e) =>
                  setAgg((s) => ({
                    ...s,
                    displaced: {
                      ...s.displaced,
                      outside: {
                        ...s.displaced.outside,
                        persons: { ...s.displaced.outside.persons, total: e.target.checked },
                      },
                    },
                  }))
                }
              />
              <span className="text-sm">Total</span>
            </label>
          </Section>
        </div>
      </Section>
    </Section>
    
  </div>
  </fieldset>
)}
</div>

{/* Disaggregated (header matches Aggregated) */}
<div>
<div className={`flex items-center gap-2 ${disDisabled ? "opacity-50" : ""}`}>
  <button
    type="button"
    onClick={() => !disDisabled && setDisOpen((o) => !o)}
    disabled={disDisabled}
    className="flex items-center p-0 rounded disabled:cursor-not-allowed"
    aria-label={disOpen ? "Collapse Disaggregated" : "Expand Disaggregated"}
  >
    <ChevronRight
      className={`h-4 w-4 text-gray-600 transition-transform ${disOpen ? "rotate-90" : ""}`}
    />
  </button>

  <input
    ref={disHeaderRef}
    type="checkbox"
    className="brand-checkbox"
    disabled={disDisabled}
    checked={selectedType === "Disaggregated" ? disAll : false}
    onChange={(e) => {
      const v = e.target.checked;
      if (v) {
        setReportType("Disaggregated");
        setAllDisagg(true);
        // clear others
        setAllAgg(false);
        setAllBgy(false);
        setAggOpen(false);
        setBgyOpen(false);

        setDisOpen(true);
        setDisInfantOpen(true);
        setDisChildrenOpen(true);
        setDisYouthOpen(true);
        setDisAdultOpen(true);
        setDisSeniorsOpen(true);
        setDisPWDOpen(true);
      } else {
        setReportType("");
        setAllDisagg(false);
        setDisOpen(false);
      }
    }}
  />
  <span className="text-left font-semibold text-sm">Disaggregated</span>
</div>


{disOpen && (
  <fieldset disabled={disDisabled}>
    <div className="pl-15 mt-2">
      {/* Top-level columns */}
      <div className="pl-7 space-y-2">
        <label className="flex items-center">
          <input
            type="checkbox"
            className="brand-checkbox"
            checked={disagg.barangayName}
            onChange={(e) => setDisagg((s) => ({ ...s, barangayName: e.target.checked }))}
          />
          <span className="text-sm">Barangay Name</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            className="brand-checkbox"
            checked={disagg.evacuationCenterSite}
            onChange={(e) => setDisagg((s) => ({ ...s, evacuationCenterSite: e.target.checked }))}
          />
          <span className="text-sm">Evacuation Center/Site</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            className="brand-checkbox"
            checked={disagg.family}
            onChange={(e) => setDisagg((s) => ({ ...s, family: e.target.checked }))}
          />
          <span className="text-sm">Family</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            className="brand-checkbox"
            checked={disagg.totalMale}
            onChange={(e) => setDisagg((s) => ({ ...s, totalMale: e.target.checked }))}
          />
          <span className="text-sm">Total No. of Male</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            className="brand-checkbox"
            checked={disagg.totalFemale}
            onChange={(e) => setDisagg((s) => ({ ...s, totalFemale: e.target.checked }))}
          />
          <span className="text-sm">Total No. of Female</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            className="brand-checkbox"
            checked={disagg.totalIndividuals}
            onChange={(e) => setDisagg((s) => ({ ...s, totalIndividuals: e.target.checked }))}
          />
          <span className="text-sm">Total Individuals</span>
        </label>
      </div>

      {/* Helper + nested sections */}
      {(() => {
        const AgeRow = ({
          label = "Age:",
          value,
          onMin,
          onMax,
        }: {
          label?: string;
          value: AgeRange;
          onMin: (v: string) => void;
          onMax: (v: string) => void;
        }) => (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-sm">{label}</span>
            <Input
              type="number"
              className="w-14 h-8 px-2 text-sm"
              value={value.min}
              onChange={(e) => onMin(e.target.value)}
            />
            <span>–</span>
            <Input
              type="number"
              className="w-14 h-8 px-2 text-sm"
              value={value.max}
              onChange={(e) => onMax(e.target.value)}
            />
          </div>
        );

        const Buckets = ({
          value,
          onChange,
        }: {
          value: SexBuckets;
          onChange: (next: SexBuckets) => void;
        }) => (
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

        // Category Section with tri-state header
        const Cat = ({
          title,
          open,
          setOpen,
          enabled,
          setEnabled,
          buckets,
          setBuckets,
          age,
          setAge,
          withAge = true,
          className = "mt-2",
        }: {
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
        }) => {
          // tri-state from bucket children
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
                  {/* header select-all for this category */}
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
              <div className="pl-6 space-y-2">
                {withAge && age && setAge && (
                  <AgeRow
                    value={age}
                    onMin={(v) => setAge({ ...age, min: v })}
                    onMax={(v) => setAge({ ...age, max: v })}
                  />
                )}
                <Buckets
                  value={buckets}
                  onChange={(next) => {
                    setBuckets(next);
                    // keep "enabled" in sync with any child selection
                    setEnabled(next.male || next.female || next.total);
                  }}
                />
              </div>
            </Section>
          );
        };

        return (
          <div className="pl-7">
            <Cat
              title="Infant"
              open={disInfantOpen}
              setOpen={setDisInfantOpen}
              enabled={disagg.infant.enabled}
              setEnabled={(v) => setDisagg((s) => ({ ...s, infant: { ...s.infant, enabled: v } }))}
              buckets={disagg.infant.buckets}
              setBuckets={(b) => setDisagg((s) => ({ ...s, infant: { ...s.infant, buckets: b } }))}
              age={disagg.infant.age}
              setAge={(a) => setDisagg((s) => ({ ...s, infant: { ...s.infant, age: a } }))}
              withAge
              className="mt-2"
            />
            <Cat
              title="Children"
              open={disChildrenOpen}
              setOpen={setDisChildrenOpen}
              enabled={disagg.children.enabled}
              setEnabled={(v) => setDisagg((s) => ({ ...s, children: { ...s.children, enabled: v } }))}
              buckets={disagg.children.buckets}
              setBuckets={(b) => setDisagg((s) => ({ ...s, children: { ...s.children, buckets: b } }))}
              age={disagg.children.age}
              setAge={(a) => setDisagg((s) => ({ ...s, children: { ...s.children, age: a } }))}
              withAge
            />
            <Cat
              title="Youth"
              open={disYouthOpen}
              setOpen={setDisYouthOpen}
              enabled={disagg.youth.enabled}
              setEnabled={(v) => setDisagg((s) => ({ ...s, youth: { ...s.youth, enabled: v } }))}
              buckets={disagg.youth.buckets}
              setBuckets={(b) => setDisagg((s) => ({ ...s, youth: { ...s.youth, buckets: b } }))}
              age={disagg.youth.age}
              setAge={(a) => setDisagg((s) => ({ ...s, youth: { ...s.youth, age: a } }))}
              withAge
            />
            <Cat
              title="Adult"
              open={disAdultOpen}
              setOpen={setDisAdultOpen}
              enabled={disagg.adult.enabled}
              setEnabled={(v) => setDisagg((s) => ({ ...s, adult: { ...s.adult, enabled: v } }))}
              buckets={disagg.adult.buckets}
              setBuckets={(b) => setDisagg((s) => ({ ...s, adult: { ...s.adult, buckets: b } }))}
              age={disagg.adult.age}
              setAge={(a) => setDisagg((s) => ({ ...s, adult: { ...s.adult, age: a } }))}
              withAge
            />
            <Cat
              title="Senior Citizens"
              open={disSeniorsOpen}
              setOpen={setDisSeniorsOpen}
              enabled={disagg.seniors.enabled}
              setEnabled={(v) => setDisagg((s) => ({ ...s, seniors: { ...s.seniors, enabled: v } }))}
              buckets={disagg.seniors.buckets}
              setBuckets={(b) => setDisagg((s) => ({ ...s, seniors: { ...s.seniors, buckets: b } }))}
              age={disagg.seniors.age}
              setAge={(a) => setDisagg((s) => ({ ...s, seniors: { ...s.seniors, age: a } }))}
              withAge
            />
            <Cat
              title="PWD"
              open={disPWDOpen}
              setOpen={setDisPWDOpen}
              enabled={disagg.pwd.enabled}
              setEnabled={(v) => setDisagg((s) => ({ ...s, pwd: { ...s.pwd, enabled: v } }))}
              buckets={disagg.pwd.buckets}
              setBuckets={(b) => setDisagg((s) => ({ ...s, pwd: { ...s.pwd, buckets: b } }))}
              withAge={false}
            />

            {/* Singles */}
            <div className="space-y-2 mt-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="brand-checkbox"
                  checked={disagg.pregnantWomen}
                  onChange={(e) => setDisagg((s) => ({ ...s, pregnantWomen: e.target.checked }))}
                />
                <span className="text-sm">Pregnant Women</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="brand-checkbox"
                  checked={disagg.lactatingWomen}
                  onChange={(e) => setDisagg((s) => ({ ...s, lactatingWomen: e.target.checked }))}
                />
                <span className="text-sm">Lactating Women</span>
              </label>
            </div>
          </div>
        );
      })()}
    </div>
  </fieldset>
  )}
</div>



{/* Barangay Report (header matches Aggregated) */}
<div>
<div className={`flex items-center gap-2 ${bgyDisabled ? "opacity-50" : ""}`}>
  <button
    type="button"
    onClick={() => !bgyDisabled && setBgyOpen((o) => !o)}
    disabled={bgyDisabled}
    className="flex items-center p-0 rounded disabled:cursor-not-allowed"
    aria-label={bgyOpen ? "Collapse Barangay Report" : "Expand Barangay Report"}
  >
    <ChevronRight
      className={`h-4 w-4 text-gray-600 transition-transform ${bgyOpen ? "rotate-90" : ""}`}
    />
  </button>

  <input
    ref={bgyHeaderRef}
    type="checkbox"
    className="brand-checkbox"
    disabled={bgyDisabled}
    checked={selectedType === "Barangay Report" ? bgyAll : false}
    onChange={(e) => {
      const checked = e.target.checked;
      if (checked) {
        setReportType("Barangay Report");
        setAllBgy(true);
        // clear others
        setAllAgg(false);
        setAllDisagg(false);
        setAggOpen(false);
        setDisOpen(false);

        setBgyOpen(true);
        setBgyFamilyOpen(true);
        setBgyInfantOpen(true);
        setBgyChildrenOpen(true);
        setBgyYouthOpen(true);
        setBgyAdultOpen(true);
        setBgySeniorsOpen(true);
        setBgyPWDOpen(true);
      } else {
        setReportType("");
        setAllBgy(false);
        setBgyOpen(false);
      }
    }}
  />
  <span className="font-semibold text-sm">Barangay Report</span>
</div>

{bgyOpen && (
  <fieldset disabled={bgyDisabled}>
    <div className="pl-15 mt-2 space-y-2">

      {/* Top-level columns */}
      <div className="pl-7 space-y-2">
        <label className="flex items-center">
          <input
            type="checkbox"
            className="brand-checkbox"
            checked={bgy.evacuationCenterSite}
            onChange={(e) => setBgy((s) => ({ ...s, evacuationCenterSite: e.target.checked }))}
          />
          <span className="text-sm">Evacuation Center/Site</span>
        </label>

{/* Family Head (Name, Sex) */}
<Section
  variant="plain"
  label={
    <div className="flex items-center">
      {(() => {
        // compute tri-state from child checkboxes (no hooks here)
        const fhVals = [bgy.familyHead.name, bgy.familyHead.sex];
        const all = fhVals.every(Boolean);
        const none = fhVals.every((v) => !v);
        const mixed = !all && !none;

        return (
          <>
            <input
              type="checkbox"
              className="brand-checkbox"
              checked={all}
              // callback ref avoids hooks; safe under conditional render
              ref={(el) => {
                if (el) el.indeterminate = mixed;
              }}
              onChange={(e) => {
                const v = e.target.checked;
                setBgy((s) => ({
                  ...s,
                  familyHead: { ...s.familyHead, enabled: v, name: v, sex: v },
                }));
                if (v) setBgyFamilyOpen(true);
              }}
            />
            <span className="ml-2">Family Head</span>
          </>
        );
      })()}
    </div>
  }
  open={bgyFamilyOpen}
  onToggle={() => setBgyFamilyOpen((o) => !o)}
  className="mt-1"
>
  <div className="pl-6 space-y-2">
    <label className="flex items-center">
      <input
        type="checkbox"
        className="brand-checkbox"
        checked={bgy.familyHead.name}
        onChange={(e) =>
          setBgy((s) => ({
            ...s,
            familyHead: {
              ...s.familyHead,
              name: e.target.checked,
              // bubble up: enable header if any child is checked
              enabled: e.target.checked || s.familyHead.sex,
            },
          }))
        }
      />
      <span className="text-sm">Name</span>
    </label>

    <label className="flex items-center">
      <input
        type="checkbox"
        className="brand-checkbox"
        checked={bgy.familyHead.sex}
        onChange={(e) =>
          setBgy((s) => ({
            ...s,
            familyHead: {
              ...s.familyHead,
              sex: e.target.checked,
              // bubble up: enable header if any child is checked
              enabled: e.target.checked || s.familyHead.name,
            },
          }))
        }
      />
      <span className="text-sm">Sex</span>
    </label>
  </div>
</Section>

        {/* Purok + Totals */}
        <label className="flex items-center">
          <input
            type="checkbox"
            className="brand-checkbox"
            checked={bgy.purok}
            onChange={(e) => setBgy((s) => ({ ...s, purok: e.target.checked }))}
          />
          <span className="text-sm">Purok</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            className="brand-checkbox"
            checked={bgy.totalMale}
            onChange={(e) => setBgy((s) => ({ ...s, totalMale: e.target.checked }))}
          />
          <span className="text-sm">Total No. of Male</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            className="brand-checkbox"
            checked={bgy.totalFemale}
            onChange={(e) => setBgy((s) => ({ ...s, totalFemale: e.target.checked }))}
          />
          <span className="text-sm">Total No. of Female</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            className="brand-checkbox"
            checked={bgy.totalIndividuals}
            onChange={(e) => setBgy((s) => ({ ...s, totalIndividuals: e.target.checked }))}
          />
          <span className="text-sm">Total Individuals</span>
        </label>
      </div>

      {/* Age buckets + PWD + Preg/Lactating */}
      {(() => {
        const AgeRow = ({
          label = "Age:",
          value,
          onMin,
          onMax,
        }: {
          label?: string;
          value: AgeRange;
          onMin: (v: string) => void;
          onMax: (v: string) => void;
        }) => (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-sm">{label}</span>
            <Input type="number" className="w-14 h-8 px-2 text-sm" value={value.min} onChange={(e) => onMin(e.target.value)} />
            <span>–</span>
            <Input type="number" className="w-14 h-8 px-2 text-sm" value={value.max} onChange={(e) => onMax(e.target.value)} />
          </div>
        );

        const Buckets = ({
          value,
          onChange,
        }: {
          value: SexBuckets;
          onChange: (next: SexBuckets) => void;
        }) => (
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

const Cat = ({
  title,
  open,
  setOpen,
  enabled,
  setEnabled,
  buckets,
  setBuckets,
  age,
  setAge,
  withAge = true,
  className = "mt-2",
}: {
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
}) => {
  // tri-state from bucket children
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
          {/* header select-all for this category */}
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
      <div className="pl-6 space-y-2">
        {withAge && age && setAge && (
          <AgeRow
            value={age}
            onMin={(v) => setAge({ ...age, min: v })}
            onMax={(v) => setAge({ ...age, max: v })}
          />
        )}
        <Buckets
          value={buckets}
          onChange={(next) => {
            setBuckets(next);
            // bubble up to enable when any child selected
            setEnabled(next.male || next.female || next.total);
          }}
        />
      </div>
    </Section>
  );
};


        return (
          <div className="pl-7">
            <Cat
              title="Infant"
              open={bgyInfantOpen}
              setOpen={setBgyInfantOpen}
              enabled={bgy.infant.enabled}
              setEnabled={(v) => setBgy((s) => ({ ...s, infant: { ...s.infant, enabled: v } }))}
              buckets={bgy.infant.buckets}
              setBuckets={(b) => setBgy((s) => ({ ...s, infant: { ...s.infant, buckets: b } }))}
              age={bgy.infant.age}
              setAge={(a) => setBgy((s) => ({ ...s, infant: { ...s.infant, age: a } }))}
              withAge
              className="mt-2"
            />
            <Cat
              title="Children"
              open={bgyChildrenOpen}
              setOpen={setBgyChildrenOpen}
              enabled={bgy.children.enabled}
              setEnabled={(v) => setBgy((s) => ({ ...s, children: { ...s.children, enabled: v } }))}
              buckets={bgy.children.buckets}
              setBuckets={(b) => setBgy((s) => ({ ...s, children: { ...s.children, buckets: b } }))}
              age={bgy.children.age}
              setAge={(a) => setBgy((s) => ({ ...s, children: { ...s.children, age: a } }))}
              withAge
            />
            <Cat
              title="Youth"
              open={bgyYouthOpen}
              setOpen={setBgyYouthOpen}
              enabled={bgy.youth.enabled}
              setEnabled={(v) => setBgy((s) => ({ ...s, youth: { ...s.youth, enabled: v } }))}
              buckets={bgy.youth.buckets}
              setBuckets={(b) => setBgy((s) => ({ ...s, youth: { ...s.youth, buckets: b } }))}
              age={bgy.youth.age}
              setAge={(a) => setBgy((s) => ({ ...s, youth: { ...s.youth, age: a } }))}
              withAge
            />
            <Cat
              title="Adult"
              open={bgyAdultOpen}
              setOpen={setBgyAdultOpen}
              enabled={bgy.adult.enabled}
              setEnabled={(v) => setBgy((s) => ({ ...s, adult: { ...s.adult, enabled: v } }))}
              buckets={bgy.adult.buckets}
              setBuckets={(b) => setBgy((s) => ({ ...s, adult: { ...s.adult, buckets: b } }))}
              age={bgy.adult.age}
              setAge={(a) => setBgy((s) => ({ ...s, adult: { ...s.adult, age: a } }))}
              withAge
            />
            <Cat
              title="Senior Citizens"
              open={bgySeniorsOpen}
              setOpen={setBgySeniorsOpen}
              enabled={bgy.seniors.enabled}
              setEnabled={(v) => setBgy((s) => ({ ...s, seniors: { ...s.seniors, enabled: v } }))}
              buckets={bgy.seniors.buckets}
              setBuckets={(b) => setBgy((s) => ({ ...s, seniors: { ...s.seniors, buckets: b } }))}
              age={bgy.seniors.age}
              setAge={(a) => setBgy((s) => ({ ...s, seniors: { ...s.seniors, age: a } }))}
              withAge
            />
            <Cat
              title="PWD"
              open={bgyPWDOpen}
              setOpen={setBgyPWDOpen}
              enabled={bgy.pwd.enabled}
              setEnabled={(v) => setBgy((s) => ({ ...s, pwd: { ...s.pwd, enabled: v } }))}
              buckets={bgy.pwd.buckets}
              setBuckets={(b) => setBgy((s) => ({ ...s, pwd: { ...s.pwd, buckets: b } }))}
              withAge={false}
            />

            {/* Single-column groups */}
            <div className="space-y-2 mt-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="brand-checkbox"
                  checked={bgy.pregnantWomen}
                  onChange={(e) => setBgy((s) => ({ ...s, pregnantWomen: e.target.checked }))}
                />
                <span className="text-sm">Pregnant Women</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="brand-checkbox"
                  checked={bgy.lactatingWomen}
                  onChange={(e) => setBgy((s) => ({ ...s, lactatingWomen: e.target.checked }))}
                />
                <span className="text-sm">Lactating Women</span>
              </label>
            </div>
          </div>
        );
      })()}
    </div>
    </fieldset>
  )}
</div>
              </div>
            </div>

            {/* Disaster Event dropdown (or keep your search box if preferred) */}
            <div>
              <label className="block text-sm font-semibold mb-2">Disaster Events:</label>
              <Input
                placeholder="Search disaster"
                className="w-full"
                value={disasterQuery}
                onChange={(e) => {
                  setDisasterQuery(e.target.value);
                  setSelectedDisaster(null);
                  setDisasterEvent("");
                  clearFormError && clearFormError("disasterEvent");
                }}
              />
{disasterQuery && !selectedDisaster && (
  <div className="mt-2 border rounded bg-white shadow-sm z-20">
    <div className="space-y-1 pr-2 pb-2 max-h-30 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-corner]:bg-transparent dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500 [scrollbar-width:thin] [scrollbar-color:rgb(209_213_219)_transparent] dark:[scrollbar-color:rgb(115_115_115)_transparent]">
      {disasterResults.length > 0 ? (
        disasterResults.map((d) => (
          <button
            key={d.id}
            type="button"
            className="w-full text-left p-2 hover:bg-gray-100 rounded cursor-pointer"
            onClick={() => {
              setSelectedDisaster({ id: d.id, name: d.name });
              setDisasterQuery(d.name);
              setDisasterEvent(d.name);
              setDisasterResults([]);
            }}
          >
            <div className="text-sm font-medium">{d.name}</div>
          </button>
        ))
      ) : (
        <div className="p-2 text-sm text-gray-500">No results</div>
      )}
    </div>
  </div>
)}

              {formErrors.disasterEvent && (
                <p className="text-red-600 text-sm mt-1">{formErrors.disasterEvent}</p>
              )}
            </div>

            {/* If Barangay Report, show Barangay selector */}
            {selectedType === "Barangay Report" && (
              <div>
                <label className="block text-sm font-semibold mb-2">Barangay:</label>
                <Input
                  placeholder="Search barangay"
                  className="w-full"
                  value={barangayQuery}
                  onChange={(e) => {
                    setBarangayQuery(e.target.value);
                    setSelectedBarangay(null);
                    clearFormError && clearFormError("barangay");
                  }}
                />
{barangayQuery && !selectedBarangay && (
  <div className="mt-2 border rounded bg-white shadow-sm z-20">
    <div className="space-y-1 pr-2 pb-2 max-h-60 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-corner]:bg-transparent dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500 [scrollbar-width:thin] [scrollbar-color:rgb(209_213_219)_transparent] dark:[scrollbar-color:rgb(115_115_115)_transparent]">
      {barangayResults.length > 0 ? (
        barangayResults.map((b) => (
          <button
            key={b.id}
            type="button"
            className="w-full text-left p-2 hover:bg-gray-100 rounded cursor-pointer"
            onClick={() => {
              setSelectedBarangay({ id: b.id, name: b.name });
              setBarangayQuery(b.name);
              setBarangayResults([]);
            }}
          >
            <div className="text-sm font-medium">{b.name}</div>
          </button>
        ))
      ) : (
        <div className="p-2 text-sm text-gray-500">No results</div>
      )}
    </div>
  </div>
)}

              </div>
            )}

            {/* Date & Time */}
            <div>
              <label className="block text-sm font-semibold mb-2">Date</label>
              <div className="flex gap-3">
                <div className="w-2/3">
                  <DateTimePicker
                    value={date}
                    onChange={setDate}
                    showTime={false}
                    placeholder="Select date"
                    className="w-full"
                  />
                </div>
                <div className="w-1/3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="pl-9 h-10"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* File Format */}
            <div>
              <label className="block text-sm font-semibold mb-2">File Format:</label>
              <Select value={fileFormat} onValueChange={setFileFormat}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fileFormats.map((format) => (
                    <SelectItem key={format} value={format}>
                      {format}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Empty-state hint (only after required fields are chosen) */}
            {hasRequired && rowCount === 0 && (
              <p className="text-sm text-muted-foreground">No data matches your selection.</p>
            )}
          </form>
        </div>

        <DialogFooter className="flex justify-between mt-6">
          <DialogClose asChild>
            <Button variant="outline" className="cursor-pointer">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            form="createReportForm"
            className="bg-green-700 text-white hover:bg-green-800 cursor-pointer disabled:bg-green-700 disabled:text-white disabled:hover:bg-green-700 disabled:opacity-60"
            disabled={!canDownload}
            aria-busy={isCreating}
            aria-live="polite"
            aria-disabled={!canDownload}
            title={!canDownload ? "Fill required fields and ensure there is data to export." : undefined}
          >
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {isCreating ? "Generating…" : "Download Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
