import React, { useMemo, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Clock, Loader2 } from "lucide-react";
import { DateTimePicker } from "../ui/date-time-picker";

// Sections + styles
import AggregatedSection from "./sections/AggregatedSection";
import DisaggregatedSection from "./sections/DisaggregatedSection";
import BarangaySection from "./sections/BarangaySection";
import { checkboxGreenStyle } from "./shared/BrandCheckboxStyles";

import type { AgeRange, SexBuckets } from "../../types/reporting";

// --- Keep your existing prop shape so this is drop-in compatible ---
type EvacuationCenter = { id: string; name: string; barangay?: string };
type Barangay = { id: string; name: string };
type IdName = { id: string; name: string };

// ---- Option state interfaces ----
interface AggregatedOptions {
  nameOfCenter: boolean;
  address: boolean;
  origin: boolean;
  displaced: {
    inside: {
      families: boolean;
      persons: { male: boolean; female: boolean; total: boolean };
    };
    outside: {
      families: boolean;
      persons: { male: boolean; female: boolean; total: boolean };
    };
  };
}
interface DisaggregatedOptions {
  barangayName: boolean;
  evacuationCenterSite: boolean;
  family: boolean;
  totalMale: boolean;
  totalFemale: boolean;
  totalIndividuals: boolean;

  infant: { enabled: boolean; age: AgeRange; buckets: SexBuckets };
  children: { enabled: boolean; age: AgeRange; buckets: SexBuckets };
  youth: { enabled: boolean; age: AgeRange; buckets: SexBuckets };
  adult: { enabled: boolean; age: AgeRange; buckets: SexBuckets };
  seniors: { enabled: boolean; age: AgeRange; buckets: SexBuckets };

  pwd: { enabled: boolean; buckets: SexBuckets };

  pregnantWomen: boolean;
  lactatingWomen: boolean;
}
interface BarangayOptions {
  evacuationCenterSite: boolean;

  familyHead: { enabled: boolean; name: boolean; sex: boolean };

  purok: boolean;
  totalMale: boolean;
  totalFemale: boolean;
  totalIndividuals: boolean;

  infant: { enabled: boolean; age: AgeRange; buckets: SexBuckets };
  children: { enabled: boolean; age: AgeRange; buckets: SexBuckets };
  youth: { enabled: boolean; age: AgeRange; buckets: SexBuckets };
  adult: { enabled: boolean; age: AgeRange; buckets: SexBuckets };
  seniors: { enabled: boolean; age: AgeRange; buckets: SexBuckets };

  pwd: { enabled: boolean; buckets: SexBuckets };

  pregnantWomen: boolean;
  lactatingWomen: boolean;
  reliefServices: boolean;
}

export type CreateReportModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;

  reportName: string;
  setReportName: (value: string) => void;

  reportType: string; // UI label
  setReportType: (value: string) => void;

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

  // Barangay search props
  barangayQuery: string;
  setBarangayQuery: (value: string) => void;
  barangayResults: Barangay[];
  setBarangayResults: (barangays: Barangay[]) => void;
  selectedBarangay: { id: string; name: string } | null;
  setSelectedBarangay: (barangay: { id: string; name: string } | null) => void;

  // Disaster Event search
  disasterQuery: string;
  setDisasterQuery: (value: string) => void;
  disasterResults: IdName[];
  setDisasterResults: (rows: IdName[]) => void;
  selectedDisaster: IdName | null;
  setSelectedDisaster: (row: IdName | null) => void;

  formErrors: { [key: string]: string };
  isCreating: boolean;
  onCreate: (opts?: { fields?: any }) => void;

  reportTypes: string[];
  fileFormats: string[];

  clearFormError?: (key: string) => void;

  date: Date | undefined;
  setDate: (date: Date | undefined) => void;

  time: string; // "HH:mm"
  setTime: (time: string) => void;

  rowCount?: number;
};

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
    fileFormats,
    clearFormError,
    date,
    setDate,
    time,
    setTime,
    rowCount,
  } = props;

  const [submitting, setSubmitting] = useState(false);
  const selectedType = reportType;

  // Only one section can be edited/selected at a time
  const aggDisabled = selectedType !== "" && selectedType !== "Aggregated";
  const disDisabled = selectedType !== "" && selectedType !== "Disaggregated";
  const bgyDisabled = selectedType !== "" && selectedType !== "Barangay Report";

  // ---------- Aggregated state ----------
  const [aggOpen, setAggOpen] = useState(false);
  const [aggNumOpen, setAggNumOpen] = useState(false);
  const [aggInsideOpen, setAggInsideOpen] = useState(false);
  const [aggOutsideOpen, setAggOutsideOpen] = useState(false);
  const [aggInsidePersonsOpen, setAggInsidePersonsOpen] = useState(false);
  const [aggOutsidePersonsOpen, setAggOutsidePersonsOpen] = useState(false);

  const [agg, setAgg] = useState<AggregatedOptions>({
    nameOfCenter: false,
    address: false,
    origin: false,
    displaced: {
      inside: { families: false, persons: { male: false, female: false, total: false } },
      outside: { families: false, persons: { male: false, female: false, total: false } },
    },
  });

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

  const aggHeaderRef = React.useRef<HTMLInputElement>(null!);
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
        inside: { families: v, persons: { male: v, female: v, total: v } },
        outside: { families: v, persons: { male: v, female: v, total: v } },
      },
    });
  };

  const insidePersonsVals = useMemo(
    () => [agg.displaced.inside.persons.male, agg.displaced.inside.persons.female, agg.displaced.inside.persons.total],
    [agg]
  );
  const insidePersonsAll = insidePersonsVals.every(Boolean);
  const insidePersonsMixed = !insidePersonsAll && !insidePersonsVals.every((v) => !v);
  const insidePersonsRef = React.useRef<HTMLInputElement>(null!);
  useEffect(() => {
    if (insidePersonsRef.current) insidePersonsRef.current.indeterminate = insidePersonsMixed;
  }, [insidePersonsMixed]);

  const outsidePersonsVals = useMemo(
    () => [agg.displaced.outside.persons.male, agg.displaced.outside.persons.female, agg.displaced.outside.persons.total],
    [agg]
  );
  const outsidePersonsAll = outsidePersonsVals.every(Boolean);
  const outsidePersonsMixed = !outsidePersonsAll && !outsidePersonsVals.every((v) => !v);
  const outsidePersonsRef = React.useRef<HTMLInputElement>(null!);
  useEffect(() => {
    if (outsidePersonsRef.current) outsidePersonsRef.current.indeterminate = outsidePersonsMixed;
  }, [outsidePersonsMixed]);

  const insideGroupVals = useMemo(() => [agg.displaced.inside.families, ...insidePersonsVals], [agg, insidePersonsVals]);
  const insideAll = insideGroupVals.every(Boolean);
  const insideMixed = !insideAll && !insideGroupVals.every((v) => !v);
  const insideRef = React.useRef<HTMLInputElement>(null!);
  useEffect(() => {
    if (insideRef.current) insideRef.current.indeterminate = insideMixed;
  }, [insideMixed]);

  const outsideGroupVals = useMemo(() => [agg.displaced.outside.families, ...outsidePersonsVals], [agg, outsidePersonsVals]);
  const outsideAll = outsideGroupVals.every(Boolean);
  const outsideMixed = !outsideAll && !outsideGroupVals.every((v) => !v);
  const outsideRef = React.useRef<HTMLInputElement>(null!);
  useEffect(() => {
    if (outsideRef.current) outsideRef.current.indeterminate = outsideMixed;
  }, [outsideMixed]);

  const displacedVals = useMemo(() => [...insideGroupVals, ...outsideGroupVals], [insideGroupVals, outsideGroupVals]);
  const displacedAll = displacedVals.every(Boolean);
  const displacedMixed = !displacedAll && !displacedVals.every((v) => !v);
  const displacedRef = React.useRef<HTMLInputElement>(null!);
  useEffect(() => {
    if (displacedRef.current) displacedRef.current.indeterminate = displacedMixed;
  }, [displacedMixed]);

  const setInsidePersonsAll = (v: boolean) =>
    setAgg((s) => ({
      ...s,
      displaced: { ...s.displaced, inside: { ...s.displaced.inside, persons: { male: v, female: v, total: v } } },
    }));
  const setOutsidePersonsAll = (v: boolean) =>
    setAgg((s) => ({
      ...s,
      displaced: { ...s.displaced, outside: { ...s.displaced.outside, persons: { male: v, female: v, total: v } } },
    }));
  const setInsideAll = (v: boolean) =>
    setAgg((s) => ({
      ...s,
      displaced: { ...s.displaced, inside: { families: v, persons: { male: v, female: v, total: v } } },
    }));
  const setOutsideAll = (v: boolean) =>
    setAgg((s) => ({
      ...s,
      displaced: { ...s.displaced, outside: { families: v, persons: { male: v, female: v, total: v } } },
    }));
const setDisplacedAll = (v: boolean) =>
  setAgg(s => ({
    ...s,
    displaced: {
      inside: { families: v, persons: { male: v, female: v, total: v } },
      outside: { families: v, persons: { male: v, female: v, total: v } },
    },
  }));

  // ---------- Disaggregated state ----------
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

    infant: { enabled: false, age: { min: "", max: "" }, buckets: { male: false, female: false, total: false } },
    children: { enabled: false, age: { min: "", max: "" }, buckets: { male: false, female: false, total: false } },
    youth: { enabled: false, age: { min: "", max: "" }, buckets: { male: false, female: false, total: false } },
    adult: { enabled: false, age: { min: "", max: "" }, buckets: { male: false, female: false, total: false } },
    seniors: { enabled: false, age: { min: "", max: "" }, buckets: { male: false, female: false, total: false } },

    pwd: { enabled: false, buckets: { male: false, female: false, total: false } },

    pregnantWomen: false,
    lactatingWomen: false,
  });

  const disHeaderRef = React.useRef<HTMLInputElement>(null!);

  const infantBuckets = useMemo(
    () => [disagg.infant.buckets.male, disagg.infant.buckets.female, disagg.infant.buckets.total],
    [disagg.infant.buckets]
  );
  const childrenBuckets = useMemo(
    () => [disagg.children.buckets.male, disagg.children.buckets.female, disagg.children.buckets.total],
    [disagg.children.buckets]
  );
  const youthBuckets = useMemo(
    () => [disagg.youth.buckets.male, disagg.youth.buckets.female, disagg.youth.buckets.total],
    [disagg.youth.buckets]
  );
  const adultBuckets = useMemo(
    () => [disagg.adult.buckets.male, disagg.adult.buckets.female, disagg.adult.buckets.total],
    [disagg.adult.buckets]
  );
  const seniorsBuckets = useMemo(
    () => [disagg.seniors.buckets.male, disagg.seniors.buckets.female, disagg.seniors.buckets.total],
    [disagg.seniors.buckets]
  );
  const pwdBuckets = useMemo(
    () => [disagg.pwd.buckets.male, disagg.pwd.buckets.female, disagg.pwd.buckets.total],
    [disagg.pwd.buckets]
  );

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
  const disNone = disFlat.every((v) => !v);
  const disMixed = !disAll && !disNone;

  useEffect(() => {
    if (disHeaderRef.current) {
      disHeaderRef.current.indeterminate = selectedType === "Disaggregated" && disMixed;
    }
  }, [selectedType, disMixed]);

  const setAllDisagg = (v: boolean) =>
    setDisagg((s) => ({
      ...s,
      barangayName: v,
      evacuationCenterSite: v,
      family: v,
      totalMale: v,
      totalFemale: v,
      totalIndividuals: v,
      infant: { enabled: v, age: s.infant.age, buckets: { male: v, female: v, total: v } },
      children: { enabled: v, age: s.children.age, buckets: { male: v, female: v, total: v } },
      youth: { enabled: v, age: s.youth.age, buckets: { male: v, female: v, total: v } },
      adult: { enabled: v, age: s.adult.age, buckets: { male: v, female: v, total: v } },
      seniors: { enabled: v, age: s.seniors.age, buckets: { male: v, female: v, total: v } },
      pwd: { enabled: v, buckets: { male: v, female: v, total: v } },
      pregnantWomen: v,
      lactatingWomen: v,
    }));

  // ---------- Barangay Report state ----------
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

    familyHead: { enabled: false, name: false, sex: false },

    purok: false,
    totalMale: false,
    totalFemale: false,
    totalIndividuals: false,

    infant: { enabled: false, age: { min: "", max: "" }, buckets: { male: false, female: false, total: false } },
    children: { enabled: false, age: { min: "", max: "" }, buckets: { male: false, female: false, total: false } },
    youth: { enabled: false, age: { min: "", max: "" }, buckets: { male: false, female: false, total: false } },
    adult: { enabled: false, age: { min: "", max: "" }, buckets: { male: false, female: false, total: false } },
    seniors: { enabled: false, age: { min: "", max: "" }, buckets: { male: false, female: false, total: false } },

    pwd: { enabled: false, buckets: { male: false, female: false, total: false } },

    pregnantWomen: false,
    lactatingWomen: false,
    reliefServices: false,
  });

  const flatBgy = useMemo(
    () => [
      bgy.evacuationCenterSite,
      bgy.familyHead.enabled,
      bgy.familyHead.name,
      bgy.familyHead.sex,
      bgy.purok,
      bgy.totalMale,
      bgy.totalFemale,
      bgy.totalIndividuals,

      bgy.infant.enabled,
      bgy.infant.buckets.male,
      bgy.infant.buckets.female,
      bgy.infant.buckets.total,
      bgy.children.enabled,
      bgy.children.buckets.male,
      bgy.children.buckets.female,
      bgy.children.buckets.total,
      bgy.youth.enabled,
      bgy.youth.buckets.male,
      bgy.youth.buckets.female,
      bgy.youth.buckets.total,
      bgy.adult.enabled,
      bgy.adult.buckets.male,
      bgy.adult.buckets.female,
      bgy.adult.buckets.total,
      bgy.seniors.enabled,
      bgy.seniors.buckets.male,
      bgy.seniors.buckets.female,
      bgy.seniors.buckets.total,

      bgy.pwd.enabled,
      bgy.pwd.buckets.male,
      bgy.pwd.buckets.female,
      bgy.pwd.buckets.total,

      bgy.pregnantWomen,
      bgy.lactatingWomen,
      bgy.reliefServices,
    ],
    [bgy]
  );

  const bgyAll = flatBgy.every(Boolean);
  const bgyNone = flatBgy.every((v) => !v);
  const bgyMixed = !bgyAll && !bgyNone;

  const bgyHeaderRef = React.useRef<HTMLInputElement>(null!);
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

      infant: { enabled: v, age: { ...s.infant.age }, buckets: { male: v, female: v, total: v } },
      children: { enabled: v, age: { ...s.children.age }, buckets: { male: v, female: v, total: v } },
      youth: { enabled: v, age: { ...s.youth.age }, buckets: { male: v, female: v, total: v } },
      adult: { enabled: v, age: { ...s.adult.age }, buckets: { male: v, female: v, total: v } },
      seniors: { enabled: v, age: { ...s.seniors.age }, buckets: { male: v, female: v, total: v } },

      pwd: { enabled: v, buckets: { male: v, female: v, total: v } },

      pregnantWomen: v,
      lactatingWomen: v,
      reliefServices: v,
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

    const hasDisaster = !!selectedDisaster?.id || !!disasterEvent;
    if (!hasDisaster) return false;

    if (selectedType === "Barangay Report") return !!selectedBarangay?.id;

    return true;
  }, [reportName, selectedType, selectedDisaster, disasterEvent, selectedBarangay]);

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

        <div className="space-y-1 pr-2 pb-2 max-h-150 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-corner]:bg-transparent dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500 [scrollbar-width:thin] [scrollbar-color:rgb(209_213_219)_transparent] dark:[scrollbar-color:rgb(115_115_115)_transparent]">
          <form
            id="createReportForm"
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!canDownload || submitting) return;

              setSubmitting(true);
              try {
                const fieldsForType =
                  selectedType === "Aggregated"
                    ? agg
                    : selectedType === "Disaggregated"
                    ? disagg
                    : selectedType === "Barangay Report"
                    ? bgy
                    : undefined;

                await onCreate?.({ fields: fieldsForType });
              } finally {
                setSubmitting(false);
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
              {formErrors.reportName && <p className="text-red-600 text-sm mt-1">{formErrors.reportName}</p>}
            </div>

            {/* Report Types (as 3 separated sections) */}
            <div>
              <label className="block text-sm font-semibold mb-2">Report Types:</label>

              <div className="rounded-md border border-gray-200 p-3 space-y-3">
                <AggregatedSection
                  aggDisabled={aggDisabled}
                  aggOpen={aggOpen}
                  setAggOpen={setAggOpen}
                  aggNumOpen={aggNumOpen}
                  setAggNumOpen={setAggNumOpen}
                  aggInsideOpen={aggInsideOpen}
                  setAggInsideOpen={setAggInsideOpen}
                  aggOutsideOpen={aggOutsideOpen}
                  setAggOutsideOpen={setAggOutsideOpen}
                  aggInsidePersonsOpen={aggInsidePersonsOpen}
                  setAggInsidePersonsOpen={setAggInsidePersonsOpen}
                  aggOutsidePersonsOpen={aggOutsidePersonsOpen}
                  setAggOutsidePersonsOpen={setAggOutsidePersonsOpen}
                  agg={agg}
                  setAgg={setAgg}
                  aggAll={selectedType === "Aggregated" ? aggAll : false}
                  setReportType={setReportType}
                  setAllAgg={setAllAgg}
                  setAllDisagg={setAllDisagg}
                  setAllBgy={setAllBgy}
                  setDisOpen={setDisOpen}
                  setBgyOpen={setBgyOpen}
                  displacedAll={displacedAll}
                  insideAll={insideAll}
                  outsideAll={outsideAll}
                  insidePersonsAll={insidePersonsAll}
                  outsidePersonsAll={outsidePersonsAll}
                  displacedRef={displacedRef}
                  insideRef={insideRef}
                  outsideRef={outsideRef}
                  insidePersonsRef={insidePersonsRef}
                  outsidePersonsRef={outsidePersonsRef}
                  aggHeaderRef={aggHeaderRef}
                  setDisplacedAll={setDisplacedAll}
                  setInsideAll={setInsideAll}
                  setOutsideAll={setOutsideAll}
                  setInsidePersonsAll={setInsidePersonsAll}
                  setOutsidePersonsAll={setOutsidePersonsAll}
                />

                <DisaggregatedSection
                  disDisabled={disDisabled}
                  disOpen={disOpen}
                  setDisOpen={setDisOpen}
                  disagg={disagg}
                  setDisagg={setDisagg}
                  disAll={selectedType === "Disaggregated" ? disAll : false}
                  setReportType={setReportType}
                  setAllDisagg={setAllDisagg}
                  setAllAgg={setAllAgg}
                  setAllBgy={setAllBgy}
                  setAggOpen={setAggOpen}
                  setBgyOpen={setBgyOpen}
                  disHeaderRef={disHeaderRef}
                  disInfantOpen={disInfantOpen}
                  setDisInfantOpen={setDisInfantOpen}
                  disChildrenOpen={disChildrenOpen}
                  setDisChildrenOpen={setDisChildrenOpen}
                  disYouthOpen={disYouthOpen}
                  setDisYouthOpen={setDisYouthOpen}
                  disAdultOpen={disAdultOpen}
                  setDisAdultOpen={setDisAdultOpen}
                  disSeniorsOpen={disSeniorsOpen}
                  setDisSeniorsOpen={setDisSeniorsOpen}
                  disPWDOpen={disPWDOpen}
                  setDisPWDOpen={setDisPWDOpen}
                />

                <BarangaySection
                  bgyDisabled={bgyDisabled}
                  bgyOpen={bgyOpen}
                  setBgyOpen={setBgyOpen}
                  bgy={bgy}
                  setBgy={setBgy}
                  bgyAll={selectedType === "Barangay Report" ? bgyAll : false}
                  setReportType={setReportType}
                  setAllBgy={setAllBgy}
                  setAllAgg={setAllAgg}
                  setAllDisagg={setAllDisagg}
                  setAggOpen={setAggOpen}
                  setDisOpen={setDisOpen}
                  bgyHeaderRef={bgyHeaderRef}
                  bgyFamilyOpen={bgyFamilyOpen}
                  setBgyFamilyOpen={setBgyFamilyOpen}
                  bgyInfantOpen={bgyInfantOpen}
                  setBgyInfantOpen={setBgyInfantOpen}
                  bgyChildrenOpen={bgyChildrenOpen}
                  setBgyChildrenOpen={setBgyChildrenOpen}
                  bgyYouthOpen={bgyYouthOpen}
                  setBgyYouthOpen={setBgyYouthOpen}
                  bgyAdultOpen={bgyAdultOpen}
                  setBgyAdultOpen={setBgyAdultOpen}
                  bgySeniorsOpen={bgySeniorsOpen}
                  setBgySeniorsOpen={setBgySeniorsOpen}
                  bgyPWDOpen={bgyPWDOpen}
                  setBgyPWDOpen={setBgyPWDOpen}
                />
              </div>
            </div>

            {/* Disaster Event */}
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

              {formErrors.disasterEvent && <p className="text-red-600 text-sm mt-1">{formErrors.disasterEvent}</p>}
            </div>

            {/* Barangay selector (only for Barangay Report) */}
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
                  <DateTimePicker value={date} onChange={setDate} showTime={false} placeholder="Select date" className="w-full" />
                </div>
                <div className="w-1/3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="pl-9 h-10" required />
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

            {/* Empty-state hint */}
            {hasRequired && rowCount === 0 && <p className="text-sm text-muted-foreground">No data matches your selection.</p>}
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
