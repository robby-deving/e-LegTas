// src/hooks/useFamilySort.ts
import { useState } from "react";
import type { FamilyEvacueeInformation, SortKey, SortState } from "@/types/EvacuationCenterDetails";

export function useFamilySort() {
  const [sort, setSort] = useState<SortState>(null);

  const toggleSort = (key: SortKey) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const sortRows = (rows: FamilyEvacueeInformation[]) => {
    if (!sort) return rows;
    const { key, dir } = sort;
    const factor = dir === "asc" ? 1 : -1;

    return [...rows].sort((a, b) => {
      if (key === "total_individuals") {
        const res = (a.total_individuals ?? 0) - (b.total_individuals ?? 0);
        return res * factor;
      }
      if (key === "decampment_timestamp") {
        const aNull = !a.decampment_timestamp;
        const bNull = !b.decampment_timestamp;
        if (aNull && bNull) return 0;
        if (aNull) return 1;
        if (bNull) return -1;
        const ta = new Date(a.decampment_timestamp!).getTime();
        const tb = new Date(b.decampment_timestamp!).getTime();
        return (ta - tb) * factor;
      }
      const va = String((a as any)[key] ?? "");
      const vb = String((b as any)[key] ?? "");
      return va.localeCompare(vb, undefined, { sensitivity: "base" }) * factor;
    });
  };

  return { sort, toggleSort, sortRows, setSort };
}
