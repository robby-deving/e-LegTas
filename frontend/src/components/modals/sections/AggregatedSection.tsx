// components/modals/sections/AggregatedSection.tsx
import React from "react";
import { ChevronRight } from "lucide-react";
import Section from "../shared/Section";

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

type BoolSetter = React.Dispatch<React.SetStateAction<boolean>>;

export default function AggregatedSection({
  aggDisabled,
  aggOpen,
  setAggOpen,
  aggNumOpen,
  setAggNumOpen,
  aggInsideOpen,
  setAggInsideOpen,
  aggOutsideOpen,
  setAggOutsideOpen,
  aggInsidePersonsOpen,
  setAggInsidePersonsOpen,
  aggOutsidePersonsOpen,
  setAggOutsidePersonsOpen,

  agg,
  setAgg,

  aggAll,

  setReportType,
  setAllAgg,
  setAllDisagg,
  setAllBgy,
  setDisOpen,
  setBgyOpen,

  displacedAll,
  insideAll,
  outsideAll,
  insidePersonsAll,
  outsidePersonsAll,

  displacedRef,
  insideRef,
  outsideRef,
  insidePersonsRef,
  outsidePersonsRef,
  aggHeaderRef,

  setDisplacedAll,
  setInsideAll,
  setOutsideAll,
  setInsidePersonsAll,
  setOutsidePersonsAll,
}: {
  aggDisabled: boolean;

  aggOpen: boolean;
  setAggOpen: BoolSetter;
  aggNumOpen: boolean;
  setAggNumOpen: BoolSetter;
  aggInsideOpen: boolean;
  setAggInsideOpen: BoolSetter;
  aggOutsideOpen: boolean;
  setAggOutsideOpen: BoolSetter;
  aggInsidePersonsOpen: boolean;
  setAggInsidePersonsOpen: BoolSetter;
  aggOutsidePersonsOpen: boolean;
  setAggOutsidePersonsOpen: BoolSetter;

  agg: AggregatedOptions;
  setAgg: React.Dispatch<React.SetStateAction<AggregatedOptions>>;

  aggAll: boolean;

  setReportType: (value: string) => void;
  setAllAgg: (v: boolean) => void;
  setAllDisagg: (v: boolean) => void;
  setAllBgy: (v: boolean) => void;
  setDisOpen: (v: boolean) => void;
  setBgyOpen: (v: boolean) => void;

  displacedAll: boolean;
  insideAll: boolean;
  outsideAll: boolean;
  insidePersonsAll: boolean;
  outsidePersonsAll: boolean;

  displacedRef: React.RefObject<HTMLInputElement>;
  insideRef: React.RefObject<HTMLInputElement>;
  outsideRef: React.RefObject<HTMLInputElement>;
  insidePersonsRef: React.RefObject<HTMLInputElement>;
  outsidePersonsRef: React.RefObject<HTMLInputElement>;
  aggHeaderRef: React.RefObject<HTMLInputElement>;

  setDisplacedAll: (v: boolean) => void;
  setInsideAll: (v: boolean) => void;
  setOutsideAll: (v: boolean) => void;
  setInsidePersonsAll: (v: boolean) => void;
  setOutsidePersonsAll: (v: boolean) => void;
}) {
  return (
    <div>
      <div className={`flex items-center gap-2 ${aggDisabled ? "opacity-50" : ""}`}>
        <button
          type="button"
          onClick={() => !aggDisabled && setAggOpen((o) => !o)}
          disabled={aggDisabled}
          className="flex items-center p-0 rounded disabled:cursor-not-allowed"
          aria-label={aggOpen ? "Collapse Aggregated" : "Expand Aggregated"}
        >
          <ChevronRight className={`h-4 w-4 text-gray-600 transition-transform ${aggOpen ? "rotate-90" : ""}`} />
        </button>

        <input
          ref={aggHeaderRef}
          type="checkbox"
          className="brand-checkbox"
          disabled={aggDisabled}
          checked={aggAll}
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
              // clear others
              setAllDisagg(false);
              setAllBgy(false);
              setDisOpen(false);
              setBgyOpen(false);
            } else {
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

            {/* Number of Displaced */}
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
              {/* Inside ECs */}
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

              {/* Outside ECs */}
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
  );
}
