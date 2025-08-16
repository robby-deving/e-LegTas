// EvacuationCenterDetail.tsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Calendar, ArrowRight, ArrowUpDown } from "lucide-react";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Pagination } from "../components/ui/pagination";
import { RegisteredFamiliesCard } from "../components/cards/RegisteredFamiliesCard";
import { RegisteredEvacueesCard } from "../components/cards/RegisteredEvacueesCard";
import { ECCapacityCard } from "../components/cards/ECCapacityCard";
import { EvacuationCenterNameCard } from "../components/cards/EvacuationCenterNameCard";
import EvacueeStatisticsChart from "../components/EvacueeStatisticsChart";
import { getTypeColor, getTagColor } from "@/constants/disasterTypeColors";
import { decodeId } from "@/utils/secureId";
import type { EvacuationCenterDetail, EvacueeStatistics, FamilyEvacueeInformation, RegisterEvacuee, FamilyMember, FamilyHeadResult, EditEvacueeApi, SelectedEvacuee, Evacuee } from "@/types/EvacuationCenterDetails";
import { usePageTitle } from "../hooks/usePageTitle";
import { encodeId } from "@/utils/secureId";
import { formatDate } from "@/utils/dateFormatter";
import { FamilyDetailsModal } from "../components/modals/FamilyDetailsModal";
import { RegisterEvacueeModal } from "../components/modals/RegisterEvacueeModal";
import { SearchEvacueeModal } from "../components/modals/SearchEvacueeModal";
import { FamilyHeadSearchModal } from "../components/modals/FamilyHeadSearchModal";
import { RegisterBlockDialog } from "@/components/modals/RegisterBlockDialog";
import { differenceInYears } from "date-fns";
import { mapEditPayloadToForm, mapSearchPayloadToForm } from "@/utils/mapEvacueePayload";
import type { SortKey, SortState } from "@/types/EvacuationCenterDetails";

export default function EvacuationCenterDetail() {
  const navigate = useNavigate();
  const { id: encodedDisasterId, disasterEvacuationEventId: encodedCenterId } = useParams();
  const disasterId = decodeId(encodedDisasterId!);
  const centerId = decodeId(encodedCenterId!);
  const [detail, setDetail] = useState<EvacuationCenterDetail | null>(null);
  const [statistics, setStatistics] = useState<EvacueeStatistics | null>(null);
  const [evacuees, setEvacuees] = useState<FamilyEvacueeInformation[]>([]);
  const [evacueesLoading, setEvacueesLoading] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<FamilyEvacueeInformation | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  useEffect(() => setPage(1), [search, rowsPerPage]);
  const [selectedEvacuee, setSelectedEvacuee] = useState<SelectedEvacuee | null>(null);
  const [searchResults, setSearchResults] = useState<Evacuee[]>([]);
  
  const [regBlockOpen, setRegBlockOpen] = useState(false);
  const [regBlockName, setRegBlockName] = useState<string | undefined>();
  const [regBlockEcName, setRegBlockEcName] = useState<string | undefined>();

  // ---- DEBUG UTILITIES ----
const DEBUG = true;
const dbg = (...args: any[]) => DEBUG && console.log(...args);

useEffect(() => {
  // one-time axios interceptors
  const reqId = () => Math.random().toString(36).slice(2);

  const reqI = axios.interceptors.request.use((config) => {
    (config as any).__traceId = reqId();
    dbg(
      `%c[HTTP ➡️] ${config.method?.toUpperCase()} ${config.url}  trace=${(config as any).__traceId}`,
      "color:#0b7285;font-weight:bold",
      { params: config.params, data: config.data, headers: config.headers }
    );
    // attach trace id header (nice to echo on the server logs too)
    config.headers = { ...(config.headers || {}), "X-Debug-Trace": (config as any).__traceId };
    return config;
  });

  const resI = axios.interceptors.response.use(
    (res) => {
      const trace = (res.config as any).__traceId;
      dbg(
        `%c[HTTP ⬅️] ${res.config.method?.toUpperCase()} ${res.config.url}  ${res.status} ${res.statusText}  trace=${trace}`,
        "color:#2b8a3e;font-weight:bold",
        { data: res.data, headers: res.headers }
      );
      return res;
    },
    (err) => {
      const cfg = err?.config || {};
      const trace = (cfg as any).__traceId;
      const status = err?.response?.status;
      const statusText = err?.response?.statusText;
      console.error(
        `%c[HTTP ⬅️ ERR] ${cfg.method?.toUpperCase?.() || "?"} ${cfg.url}  ${status ?? "?"} ${statusText ?? ""}  trace=${trace}`,
        "color:#c92a2a;font-weight:bold",
        {
          request: { params: cfg.params, data: cfg.data, headers: cfg.headers },
          response: { data: err?.response?.data, headers: err?.response?.headers },
          error: { message: err?.message, stack: err?.stack },
        }
      );
      return Promise.reject(err);
    }
  );

  return () => {
    axios.interceptors.request.eject(reqI);
    axios.interceptors.response.eject(resI);
  };
}, []);


  // --- sorting state & helpers ---
  const [sort, setSort] = useState<SortState>(null);
  const toggleSort = (key: SortKey) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null; 
    });
    setPage(1); 
  };

  // Filter Registered Evacuees Table
  const sortRows = (rows: FamilyEvacueeInformation[], s: SortState) => {
    if (!s) return rows;
    const { key, dir } = s;
    const factor = dir === "asc" ? 1 : -1;

    return [...rows].sort((a, b) => {
      // numeric
      if (key === "total_individuals") {
        const res = (a.total_individuals ?? 0) - (b.total_individuals ?? 0);
        return res * factor;
      }

    // date — keep nulls LAST in both asc and desc
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

    // text (case-insensitive) — e.g., family_head_full_name
    const va = String((a as any)[key] ?? "");
    const vb = String((b as any)[key] ?? "");
    return va.localeCompare(vb, undefined, { sensitivity: "base" }) * factor;
  });
};

// Gather all evacuee IDs currently shown in the Registered Evacuees table
const registeredEvacueeIds = useMemo(() => {
  const ids = new Set<number>();
  for (const fam of evacuees) {
    const members = fam?.list_of_family_members?.family_members ?? [];
    for (const m of members as any[]) {
      if (typeof m?.evacuee_resident_id === "number") ids.add(m.evacuee_resident_id);
      if (typeof m?.evacuee_id === "number") ids.add(m.evacuee_id);
    }
  }
  return ids;
}, [evacuees]);

// latest registration time in a family (used for default ordering)
const getRegisteredAt = (f: FamilyEvacueeInformation) => {
  const members = f?.list_of_family_members?.family_members ?? [];
  let maxTs = Number.NEGATIVE_INFINITY;
  for (const m of members as any[]) {
    const t = Date.parse(m?.arrival_timestamp ?? "");
    if (!Number.isNaN(t)) maxTs = Math.max(maxTs, t);
  }
  return maxTs; 
};

  const chartData = statistics ? [
    { label: "Males", value: statistics.summary.total_no_of_male },
    { label: "Females", value: statistics.summary.total_no_of_female },
    { label: "Infants (<1 yr)", value: statistics.summary.total_no_of_infant },
    { label: "Children (2–12 yrs)", value: statistics.summary.total_no_of_children },
    { label: "Youth (13–17 yrs)", value: statistics.summary.total_no_of_youth },
    { label: "Adults (18–59 yrs)", value: statistics.summary.total_no_of_adult },
    { label: "Senior Citizens (60+)", value: statistics.summary.total_no_of_seniors },
    { label: "PWD", value: statistics.summary.total_no_of_pwd },
    { label: "Pregnant Women", value: statistics.summary.total_no_of_pregnant },
    { label: "Lactating Women", value: statistics.summary.total_no_of_lactating_women }
  ] : [];

  usePageTitle(
    detail?.evacuation_center?.evacuation_center_name ??
      "Evacuation Center Detail"
  );

  const fetchDetails = useCallback(async () => {
  try {
    const res = await axios.get<EvacuationCenterDetail>(
      `http://localhost:3000/api/v1/evacuees/${centerId}/details`
    );
    setDetail(res.data);
  } catch (err) {
    console.error("❌ Error fetching details:", err);
  }
}, [centerId]);

const fetchStatistics = useCallback(async () => {
  try {
    const res = await axios.get<EvacueeStatistics>(
      `http://localhost:3000/api/v1/evacuees/${centerId}/evacuee-statistics`
    );
    setStatistics(res.data);
  } catch (err) {
    console.error("❌ Error fetching statistics:", err);
  }
}, [centerId]);

const fetchEvacueesList = useCallback(async () => {
  setEvacueesLoading(true);
  try {
    const res = await axios.get<FamilyEvacueeInformation[]>(
      `http://localhost:3000/api/v1/evacuees/${centerId}/evacuees-information`
    );
    setEvacuees(Array.isArray(res.data) ? res.data : []);
  } catch (err) {
    console.error("❌ Error fetching evacuees:", err);
  } finally {
    setEvacueesLoading(false);
  }
}, [centerId]);

// optional helper to refresh all at once
const refreshAll = useCallback(async () => {
  await Promise.all([fetchEvacueesList(), fetchDetails(), fetchStatistics()]);
}, [fetchEvacueesList, fetchDetails, fetchStatistics]);

useEffect(() => {
  console.log("✅ Decoded IDs:", { disasterId, centerId });
  if (!centerId || isNaN(Number(centerId))) {
    console.warn("❌ Invalid decoded centerId:", centerId);
    return;
  }
  refreshAll();
}, [centerId, disasterId, refreshAll]);


const { paginatedEvacuees, totalRows, totalPages } = useMemo(() => {
  const base = Array.isArray(evacuees) ? evacuees : [];

  // text search
  const q = search.trim().toLowerCase();
  const searched = q
    ? base.filter(
        (evac) =>
          evac.family_head_full_name.toLowerCase().includes(q) ||
          evac.barangay.toLowerCase().includes(q)
      )
    : base;

  const defaultSorted = [...searched].sort((a, b) => {
    const aDecamped = Boolean(a.decampment_timestamp);
    const bDecamped = Boolean(b.decampment_timestamp);
    if (aDecamped !== bDecamped) return aDecamped ? 1 : -1; 

    return getRegisteredAt(b) - getRegisteredAt(a);
  });

  const sorted = sort ? sortRows(defaultSorted, sort) : defaultSorted;

  // paginate
  const totalRows = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const end = start + rowsPerPage;

  return {
    paginatedEvacuees: sorted.slice(start, end),
    totalRows,
    totalPages,
  };
}, [evacuees, search, sort, page, rowsPerPage]);


  // Add state for modal mode and form data
  const [evacueeModalOpen, setEvacueeModalOpen] = useState(false);
  const [evacueeModalMode, setEvacueeModalMode] = useState<"register" | "edit">(
    "register"
  );
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    sex: "",
    maritalStatus: "",
    birthday: "",
    educationalAttainment: "",
    schoolOfOrigin: "",
    occupation: "",
    purok: "",
    barangayOfOrigin: "",
    isFamilyHead: "Yes",
    familyHead: "",
    familyHeadId: null as number | null,
    relationshipToFamilyHead: "",
    searchEvacuationRoom: "",
    evacuationRoomName: "",
    vulnerabilities: {
      pwd: false,
      pregnant: false,
      lactatingMother: false,
    },
    existingEvacueeResidentId: null as number | null,
  });
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showFamilyHeadSearchModal, setShowFamilyHeadSearchModal] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [familyHeadSearchTerm, setFamilyHeadSearchTerm] = useState("");
  const [familyHeadSearchResults, setFamilyHeadSearchResults] = useState<FamilyHeadResult[]>([]);

  const [fhLoading, setFhLoading] = useState(false);

  

const handleEditMember = async (member: FamilyMember) => {
  try {
    const evacueeResidentId =
      (member as any).evacuee_resident_id ?? (member as any).evacuee_id;
    if (!evacueeResidentId) return;

    dbg("[EDIT] fetch edit payload", { centerId, evacueeResidentId });
    const res = await axios.get<EditEvacueeApi>(
      `http://localhost:3000/api/v1/evacuees/${centerId}/${evacueeResidentId}/edit`
    );
    dbg("[EDIT] raw API payload", res.data);

    const data = res.data;
    const mapped = mapEditPayloadToForm(data);
    dbg("[EDIT] mapped -> formData", mapped);

    setFormData((prev) => ({
      ...prev,
      ...mapped,
      evacuationRoomName: member.room_name || prev.evacuationRoomName || "",
      searchEvacuationRoom: String(data.ec_rooms_id ?? ""),
    }));

    setSelectedEvacuee({
      id: Number(evacueeResidentId),
      registration_ec_rooms_id: data.ec_rooms_id ?? null,
    });

    setEvacueeModalMode("edit");
    setEvacueeModalOpen(true);
  } catch (err) {
    console.error("Failed to load evacuee details for edit:", err);
  }
};

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchName(value);

    if (value.trim() === "") {
      setSearchResults([]);
      return;
    }

    try {
      const { data } = await axios.get<any[]>(
        "http://localhost:3000/api/v1/evacuees/search",
        { params: { name: value } }
      );
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error searching evacuees", err);
      setSearchResults([]);
    }
  };

  const handleFamilyHeadSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFamilyHeadSearchTerm(e.target.value);
  };

  useEffect(() => {
    const q = familyHeadSearchTerm.trim();
    if (!showFamilyHeadSearchModal) return;
    if (!q) {
      setFamilyHeadSearchResults([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setFhLoading(true);
        const { data } = await axios.get<{ data: FamilyHeadResult[] }>(
          `http://localhost:3000/api/v1/evacuees/${centerId}/family-heads`,
          { params: { q } }
        );
        setFamilyHeadSearchResults(data?.data || []);
      } catch (e) {
        console.error("FH search error", e);
        setFamilyHeadSearchResults([]);
      } finally {
        setFhLoading(false);
      }
    }, 250); // debounce

    return () => clearTimeout(t);
  }, [familyHeadSearchTerm, showFamilyHeadSearchModal, centerId]);

  const handleFamilyHeadSelect = (fh: FamilyHeadResult) => {
    setFormData((prev) => ({
      ...prev,
      familyHead: fh.family_head_full_name,
      familyHeadId: fh.family_head_id,
      barangayOfOrigin:
        fh.barangay_id != null ? String(fh.barangay_id) : prev.barangayOfOrigin,
      purok: fh.purok ?? prev.purok,
      evacuationRoomName: fh.evacuation_room ?? "",
    }));
    setShowFamilyHeadSearchModal(false);
  };

  const handleFamilyHeadSearchClick = () => {
    setFamilyHeadSearchTerm("");
    setFamilyHeadSearchResults([]);
    setShowFamilyHeadSearchModal(true);
  };
const handleSelectEvacuee = (evacuee: any) => {
  // If evacuee is ACTIVE elsewhere, show RegisterBlockDialog (no alert)
  if (evacuee?.is_active) {
    const fullName = [
      evacuee?.first_name,
      evacuee?.middle_name,
      evacuee?.last_name,
      evacuee?.suffix,
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    setRegBlockName(fullName || undefined);
    setRegBlockEcName(evacuee?.active_ec_name || undefined); // dialog handles undefined → "in another event"
    setRegBlockOpen(true);
    return;
  }

  // Otherwise proceed to prefill and open the register modal
  const mapped = mapSearchPayloadToForm(evacuee);
  setFormData((prev) => ({
    ...prev,
    ...mapped,
    existingEvacueeResidentId: Number(evacuee?.evacuee_resident_id) || null,
  }));
  setShowSearchModal(false);
  setEvacueeModalMode("register");
  setEvacueeModalOpen(true);
};


  const handleManualRegister = () => {
    // Reset form data
    setFormData({
      firstName: "",
      middleName: "",
      lastName: "",
      suffix: "",
      sex: "",
      maritalStatus: "",
      birthday: "",
      educationalAttainment: "",
      schoolOfOrigin: "",
      occupation: "",
      purok: "",
      barangayOfOrigin: "",
      isFamilyHead: "Yes",
      familyHead: "",
      familyHeadId: null as number | null,
      relationshipToFamilyHead: "",
      searchEvacuationRoom: "",
      evacuationRoomName: "",
      vulnerabilities: {
        pwd: false,
        pregnant: false,
        lactatingMother: false,
      },
       existingEvacueeResidentId: null,
    });

    setShowSearchModal(false);
    setTimeout(() => {
      setEvacueeModalOpen(true);
    }, 0);
  };

  const handleFormInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleVulnerabilityChange = (
    vulnerability: string,
    checked: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      vulnerabilities: {
        ...prev.vulnerabilities,
        [vulnerability]: checked,
      },
    }));
  };
  const handleEvacueeModalClose = () => {
    setEvacueeModalOpen(false);
  };

  const handleRegisterClick = () => {
    setEvacueeModalMode("register");
    setShowSearchModal(true);
    setSearchName("");
    setSearchResults([]);
  };

  const handleRowClick = (evacueeId: number) => {
    const selected = paginatedEvacuees.find((e) => e.id === evacueeId);
    if (selected) setSelectedFamily(selected);
  };

  const handleCloseModal = () => setSelectedFamily(null);

  function getVulnerabilityFlags(age: number) {
    return {
      is_infant: age < 1,
      is_children: age >= 1 && age <= 12,
      is_youth: age >= 13 && age <= 17,
      is_adult: age >= 18 && age <= 59,
      is_senior: age >= 60,
    };
  }

const handleRegisterEvacuee = async () => {
  console.groupCollapsed("%c[EvacueeSubmit] start", "color:#364fc7;font-weight:bold");
  try {
    const birthdate = new Date(formData.birthday);
    const age = differenceInYears(new Date(), birthdate);
    const vulnerabilityFlags = getVulnerabilityFlags(age);
    const relationship = formData.isFamilyHead === "Yes" ? "Head" : formData.relationshipToFamilyHead;

    // quick sanity checks (these help surface silent issues)
    if (!formData.firstName || !formData.lastName) {
      console.warn("[EvacueeSubmit] Missing first/last name");
    }
    if (formData.isFamilyHead === "No" && !formData.familyHeadId) {
      console.error("[EvacueeSubmit] BLOCKED: Missing familyHeadId when isFamilyHead = 'No'");
      console.groupEnd();
      return;
    }
    const roomId = Number.parseInt(formData.searchEvacuationRoom);
    if (!Number.isFinite(roomId)) {
      console.error("[EvacueeSubmit] BLOCKED: invalid ec_rooms_id", formData.searchEvacuationRoom);
      console.groupEnd();
      return;
    }
    if (!Number.isFinite(centerId as any)) {
      console.error("[EvacueeSubmit] BLOCKED: invalid disaster_evacuation_event_id (centerId)", centerId);
      console.groupEnd();
      return;
    }

    const payload: RegisterEvacuee = {
      first_name: formData.firstName,
      middle_name: formData.middleName,
      last_name: formData.lastName,
      suffix: formData.suffix && formData.suffix.trim() !== "" ? formData.suffix.trim() : null,
      birthdate: formData.birthday,
      sex: formData.sex,
      barangay_of_origin: Number(formData.barangayOfOrigin),
      marital_status: formData.maritalStatus,
      educational_attainment: formData.educationalAttainment,
      school_of_origin: formData.schoolOfOrigin || "",
      occupation: formData.occupation || "",
      purok: formData.purok || "",
      relationship_to_family_head: relationship,
      family_head_id: formData.isFamilyHead === "No" ? formData.familyHeadId! : undefined,
      date_registered: new Date().toISOString(),
      ...vulnerabilityFlags,
      is_pwd: formData.vulnerabilities.pwd,
      is_pregnant: formData.vulnerabilities.pregnant,
      is_lactating: formData.vulnerabilities.lactatingMother,
      ec_rooms_id: roomId,
      disaster_evacuation_event_id: Number(centerId),
      ...(evacueeModalMode === "register" && formData.existingEvacueeResidentId
        ? { existing_evacuee_resident_id: formData.existingEvacueeResidentId }
        : {}),
    };

    console.table({
      mode: evacueeModalMode,
      isFamilyHead: formData.isFamilyHead,
      familyHeadId: String(formData.familyHeadId ?? ""),
      ec_rooms_id: payload.ec_rooms_id,
      disaster_evacuation_event_id: payload.disaster_evacuation_event_id,
      selectedEvacueeId: selectedEvacuee?.id ?? null,
    });
    dbg("[EvacueeSubmit] payload", payload);

    if (evacueeModalMode === "register") {
      const resp = await axios.post("http://localhost:3000/api/v1/evacuees", payload);
      dbg("[EvacueeSubmit] POST OK", resp.status, resp.data);
    } else if (evacueeModalMode === "edit" && selectedEvacuee?.id) {
      const url = `http://localhost:3000/api/v1/evacuees/${selectedEvacuee.id}`;
      // NOTE: backend PUT expects disaster_evacuation_event_id to know WHICH event to write
      const resp = await axios.put(url, payload);
      dbg("[EvacueeSubmit] PUT OK", resp.status, resp.data);
    } else {
      console.warn("[EvacueeSubmit] Edit mode but no selectedEvacuee.id");
      console.groupEnd();
      return;
    }

    setEvacueeModalOpen(false);
    await refreshAll();
} catch (error: any) {
  const status = error?.response?.status;
  const server = error?.response?.data;
  const msg = server?.message || "Failed to register evacuee.";

  // Build a display name from the form
  const fullName = [
    formData.firstName,
    formData.middleName,
    formData.lastName,
    formData.suffix,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (status === 409) {
    // Optional: backend can return active_ec_name; use it when present
    setRegBlockName(fullName || undefined);
    setRegBlockEcName(server?.active_ec_name || server?.active_ec || undefined);
    setRegBlockOpen(true);
  } else if (status === 400) {
    // keep your existing UX for validation errors (or show another modal/toast)
    alert(msg);
  }

  console.error("❌ Error registering/updating evacuee", {
    status,
    statusText: error?.response?.statusText,
    serverMessage: server?.message,
    data: server,
    headers: error?.response?.headers,
    requestUrl: error?.config?.url,
    requestMethod: error?.config?.method,
    requestPayload: error?.config?.data,
  });
} finally {
  console.groupEnd();
}

};


  if (!detail || !statistics) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div role="status" aria-live="polite" aria-busy="true">
        <svg
          aria-hidden="true"
          className="w-16 h-16 animate-spin text-gray-200 dark:text-gray-700 fill-green-600"
          viewBox="0 0 100 101"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
            fill="currentColor"
          />
          <path
            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
            fill="currentFill"
          />
        </svg>
        <span className="sr-only">Loading evacuation information…</span>
      </div>
      <p className="text-sm text-gray-600">Loading evacuation information…</p>
    </div>
  );
}
  const disaster = {
    name: detail?.disaster?.disaster_name || "Unknown",
    type: detail?.disaster?.disaster_type_name || "Unknown",
    start: detail?.disaster?.disaster_start_date || "N/A",
  };

  const centerName = detail.evacuation_center.evacuation_center_name;
  const centerBarangay = detail.evacuation_center.evacuation_center_barangay_name;
  const familiesCount = detail.evacuation_summary.total_no_of_family;
  const evacueesCount = detail.evacuation_summary.total_no_of_individuals;
  const capacityCount = detail.evacuation_summary.evacuation_center_capacity;

  return (
    <div className="text-black p-6 space-y-6">
      {/* Header with Breadcrumb */}
      <div className="space-y-5">
        <h1 className="text-3xl font-bold text-green-800">
          Evacuation Information
        </h1>
        <div className="flex items-center text-sm text-gray-600">
          <button
            onClick={() => navigate("/evacuation-information")}
            className="hover:text-green-700 transition-colors cursor-pointer"
          >
            Disaster
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <button
            onClick={() =>
              navigate(`/evacuation-information/${encodeId(disasterId)}`)
            }
            className="hover:text-green-700 transition-colors cursor-pointer"
          >
            {disaster?.name}
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          {/* Highlight current page */}
          <span className="text-gray-900 font-semibold">{centerName}</span>
        </div>
      </div>

      {/* Disaster Information Card */}
      <div className="py-3">
        <div className="space-y-3">
          <div
            className={`inline-block rounded px-3 py-1 text-sm font-semibold ${getTagColor(
              disaster.type
            )}`}
          >
            {disaster.type}
          </div>
          <h2 className={`text-3xl font-bold ${getTypeColor(disaster.type)}`}>
            {disaster.name}
          </h2>
          {detail?.disaster?.disaster_start_date && (
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">
                {formatDate(detail.disaster.disaster_start_date)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Center Summary & Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="md:col-span-1">
          <EvacuationCenterNameCard
            name={centerName}
            barangay={centerBarangay}
          />
          <div className="flex flex-col gap-6 mt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RegisteredFamiliesCard count={familiesCount} />
              <RegisteredEvacueesCard count={evacueesCount} />
              <ECCapacityCard count={capacityCount} />
            </div>
          </div>
        </div>
        <Card className="md:col-span-1 shadow-sm border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold leading-tight mb-0">
              Evacuees Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EvacueeStatisticsChart data={chartData} />
          </CardContent>
        </Card>
      </div>

      {/* Registered Evacuees Table */}
      <div className="py-1">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold">
              Registered Evacuees
              <span className="ml-2 text-md text-muted-foreground">
                (per Family)
              </span>
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
            <div className="w-full max-w-xs">
              <Input
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border-border"
              />
            </div>
            <Button
              className="bg-green-700 hover:bg-green-800 text-white px-6 flex gap-2 items-center cursor-pointer self-start sm:self-auto"
              onClick={handleRegisterClick}
            >
              <span className="text-lg">+</span> Register Evacuee
            </Button>
          </div>

              <div className="rounded-md border border-input">
                <div className="max-h-[70vh] overflow-x-auto overflow-y-auto pr-2 pb-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-corner]:bg-transparent dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500 [scrollbar-width:thin] [scrollbar-color:rgb(209_213_219)_transparent] dark:[scrollbar-color:rgb(115_115_115)_transparent]">
              <Table className="text-sm">
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="text-left font-semibold">
                      <button
                        type="button"
                        onClick={() => toggleSort("family_head_full_name")}
                        className="inline-flex items-center gap-1 hover:text-gray-900"
                        aria-sort={
                          sort?.key === "family_head_full_name"
                            ? sort.dir === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        Family Head
                        <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </TableHead>

                    <TableHead className="text-left font-semibold">Barangay</TableHead>

                    <TableHead className="text-left font-semibold">
                      <button
                        type="button"
                        onClick={() => toggleSort("total_individuals")}
                        className="inline-flex items-center gap-1 hover:text-gray-900"
                        aria-sort={
                          sort?.key === "total_individuals"
                            ? sort.dir === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        Total Individuals
                        <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </TableHead>

                    <TableHead className="text-left font-semibold">Room Name</TableHead>

                    <TableHead className="text-left font-semibold">
                      <button
                        type="button"
                        onClick={() => toggleSort("decampment_timestamp")}
                        className="inline-flex items-center gap-1 hover:text-gray-900"
                        aria-sort={
                          sort?.key === "decampment_timestamp"
                            ? sort.dir === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        Decampment
                        <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </TableHead>

                    <TableHead />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {evacueesLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center">
                        <div role="status" className="inline-flex flex-col items-center gap-3">
                          <svg
                            aria-hidden="true"
                            className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-green-500"
                            viewBox="0 0 100 101"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                              fill="currentColor"
                            />
                            <path
                              d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                              fill="currentFill"
                            />
                          </svg>
                          <span className="text-sm text-muted-foreground">
                            Loading Registered Evacuees…
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : paginatedEvacuees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No results.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedEvacuees.map((evac, idx) => (
                      <TableRow
                        key={idx}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleRowClick(evac.id)}
                      >
                        <TableCell className="text-foreground font-medium">
                          {evac.family_head_full_name}
                        </TableCell>
                        <TableCell className="text-foreground">{evac.barangay}</TableCell>
                        <TableCell className="text-foreground">
                          {evac.total_individuals.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-foreground">{evac.room_name}</TableCell>
                        <TableCell className="text-foreground">
                          {evac.decampment_timestamp
                            ? <span title={evac.decampment_timestamp}>
                                {formatDate(evac.decampment_timestamp)}
                              </span>
                            : "—"}
                        </TableCell>
                        <TableCell className="flex justify-end items-center text-foreground">
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
          </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1 text-sm text-muted-foreground">
              {paginatedEvacuees.length} of {totalRows} row(s) shown.
            </div>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              rowsPerPage={rowsPerPage}
              totalRows={totalRows}
              onRowsPerPageChange={(value) => setRowsPerPage(Number(value))}
            />
          </div>

          <FamilyDetailsModal
            isOpen={!!selectedFamily}
            onClose={handleCloseModal}
            evacuee={selectedFamily}
            centerName={
              selectedFamily?.view_family?.evacuation_center_name || ""
            }
            disasterStartDate={detail?.disaster?.disaster_start_date ?? null} 
            onEditMember={handleEditMember}
       
          />

          <RegisterEvacueeModal
            isOpen={evacueeModalOpen}
            onClose={handleEvacueeModalClose}
            mode={evacueeModalMode}
            formData={formData}
            onFormChange={handleFormInputChange}
            onVulnerabilityChange={handleVulnerabilityChange}
            onSave={handleRegisterEvacuee}
            onFamilyHeadSearch={handleFamilyHeadSearchClick}
            centerId={centerId}
          />

          <SearchEvacueeModal
            isOpen={showSearchModal}
            onClose={() => setShowSearchModal(false)}
            searchName={searchName}
            onSearchChange={handleSearchChange}
            searchResults={searchResults}
            onSelectEvacuee={handleSelectEvacuee}
            onManualRegister={handleManualRegister}
            registeredIds={registeredEvacueeIds}
            currentEventId={centerId}
            currentEcId={detail?.evacuation_center?.evacuation_center_id ?? null}
            currentDisasterId={detail?.disaster?.disasters_id ?? null} 
          />

          <FamilyHeadSearchModal
            isOpen={showFamilyHeadSearchModal}
            onClose={() => setShowFamilyHeadSearchModal(false)}
            searchTerm={familyHeadSearchTerm}
            onSearchChange={handleFamilyHeadSearchChange}
            searchResults={familyHeadSearchResults}
            onSelectFamilyHead={handleFamilyHeadSelect}
            loading={fhLoading}
          />
          <RegisterBlockDialog
            open={regBlockOpen}
            onOpenChange={setRegBlockOpen}
            personName={regBlockName}
            ecName={regBlockEcName}
          />
        </div>
      </div>
    </div>
  );
}
