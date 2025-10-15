// components/modals/sections/BarangaySection.tsx
import React from "react";
import { ChevronRight } from "lucide-react";
import Section from "../shared/Section";
import Cat from "../shared/Category";
import type { AgeRange, SexBuckets } from "../../../types/reporting";

interface BarangayOptions {
  evacuationCenterSite: boolean;

  familyHead: {
    enabled: boolean;
    name: boolean;
    sex: boolean;
  };

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

type BoolSetter = React.Dispatch<React.SetStateAction<boolean>>;

export default function BarangaySection({
  bgyDisabled,
  bgyOpen,
  setBgyOpen,

  bgy,
  setBgy,

  bgyAll,
  setReportType,
  setAllBgy,
  setAllAgg,
  setAllDisagg,
  setAggOpen,
  setDisOpen,

  bgyHeaderRef,

  bgyFamilyOpen,
  setBgyFamilyOpen,
  bgyInfantOpen,
  setBgyInfantOpen,
  bgyChildrenOpen,
  setBgyChildrenOpen,
  bgyYouthOpen,
  setBgyYouthOpen,
  bgyAdultOpen,
  setBgyAdultOpen,
  bgySeniorsOpen,
  setBgySeniorsOpen,
  bgyPWDOpen,
  setBgyPWDOpen,
}: {
  bgyDisabled: boolean;
  bgyOpen: boolean;
  setBgyOpen: BoolSetter;

  bgy: BarangayOptions;
  setBgy: React.Dispatch<React.SetStateAction<BarangayOptions>>;

  bgyAll: boolean;
  setReportType: (v: string) => void;
  setAllBgy: (v: boolean) => void;
  setAllAgg: (v: boolean) => void;
  setAllDisagg: (v: boolean) => void;
  setAggOpen: (v: boolean) => void;
  setDisOpen: (v: boolean) => void;

  bgyHeaderRef: React.RefObject<HTMLInputElement>;

  bgyFamilyOpen: boolean;
  setBgyFamilyOpen: BoolSetter;
  bgyInfantOpen: boolean;
  setBgyInfantOpen: BoolSetter;
  bgyChildrenOpen: boolean;
  setBgyChildrenOpen: BoolSetter;
  bgyYouthOpen: boolean;
  setBgyYouthOpen: BoolSetter;
  bgyAdultOpen: boolean;
  setBgyAdultOpen: BoolSetter;
  bgySeniorsOpen: boolean;
  setBgySeniorsOpen: BoolSetter;
  bgyPWDOpen: boolean;
  setBgyPWDOpen: BoolSetter;
}) {
  return (
    <div>
      <div className={`flex items-center gap-2 ${bgyDisabled ? "opacity-50" : ""}`}>
        <button
          type="button"
          onClick={() => !bgyDisabled && setBgyOpen((o) => !o)}
          disabled={bgyDisabled}
          className="flex items-center p-0 rounded disabled:cursor-not-allowed"
          aria-label={bgyOpen ? "Collapse Barangay Report" : "Expand Barangay Report"}
        >
          <ChevronRight className={`h-4 w-4 text-gray-600 transition-transform ${bgyOpen ? "rotate-90" : ""}`} />
        </button>

        <input
          ref={bgyHeaderRef}
          type="checkbox"
          className="brand-checkbox"
          disabled={bgyDisabled}
          checked={bgyAll}
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

            {/* Age buckets + PWD + Singles */}
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
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="brand-checkbox"
                    checked={bgy.reliefServices}
                    onChange={(e) => setBgy((s) => ({ ...s, reliefServices: e.target.checked }))}
                  />
                  <span className="text-sm">Relief Services</span>
                </label>
              </div>
            </div>
          </div>
        </fieldset>
      )}
    </div>
  );
}
