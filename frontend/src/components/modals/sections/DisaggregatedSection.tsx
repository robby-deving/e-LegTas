// components/modals/sections/DisaggregatedSection.tsx
import React from "react";
import { ChevronRight } from "lucide-react";
import Cat from "../shared/Category";

import type { AgeRange, SexBuckets } from "../../../types/reporting";

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

type BoolSetter = React.Dispatch<React.SetStateAction<boolean>>;

export default function DisaggregatedSection({
  disDisabled,
  disOpen,
  setDisOpen,

  disagg,
  setDisagg,

  disAll,

  setReportType,
  setAllDisagg,
  setAllAgg,
  setAllBgy,
  setAggOpen,
  setBgyOpen,

  disHeaderRef,

  disInfantOpen,
  setDisInfantOpen,
  disChildrenOpen,
  setDisChildrenOpen,
  disYouthOpen,
  setDisYouthOpen,
  disAdultOpen,
  setDisAdultOpen,
  disSeniorsOpen,
  setDisSeniorsOpen,
  disPWDOpen,
  setDisPWDOpen,
}: {
  disDisabled: boolean;
  disOpen: boolean;
  setDisOpen: BoolSetter;

  disagg: DisaggregatedOptions;
  setDisagg: React.Dispatch<React.SetStateAction<DisaggregatedOptions>>;

  disAll: boolean;

  setReportType: (v: string) => void;
  setAllDisagg: (v: boolean) => void;
  setAllAgg: (v: boolean) => void;
  setAllBgy: (v: boolean) => void;
  setAggOpen: (v: boolean) => void;
  setBgyOpen: (v: boolean) => void;

  disHeaderRef: React.RefObject<HTMLInputElement>;

  disInfantOpen: boolean;
  setDisInfantOpen: BoolSetter;
  disChildrenOpen: boolean;
  setDisChildrenOpen: BoolSetter;
  disYouthOpen: boolean;
  setDisYouthOpen: BoolSetter;
  disAdultOpen: boolean;
  setDisAdultOpen: BoolSetter;
  disSeniorsOpen: boolean;
  setDisSeniorsOpen: BoolSetter;
  disPWDOpen: boolean;
  setDisPWDOpen: BoolSetter;
}) {
  return (
    <div>
      <div className={`flex items-center gap-2 ${disDisabled ? "opacity-50" : ""}`}>
        <button
          type="button"
          onClick={() => !disDisabled && setDisOpen((o) => !o)}
          disabled={disDisabled}
          className="flex items-center p-0 rounded disabled:cursor-not-allowed"
          aria-label={disOpen ? "Collapse Disaggregated" : "Expand Disaggregated"}
        >
          <ChevronRight className={`h-4 w-4 text-gray-600 transition-transform ${disOpen ? "rotate-90" : ""}`} />
        </button>

        <input
          ref={disHeaderRef}
          type="checkbox"
          className="brand-checkbox"
          disabled={disDisabled}
          checked={disAll}
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

            {/* Age/PWD groups + singles */}
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
          </div>
        </fieldset>
      )}
    </div>
  );
}
