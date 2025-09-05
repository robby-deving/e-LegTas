// EvacuationCenterDetail.tsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
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
import type { EvacuationCenterDetail, EvacueeStatistics, FamilyEvacueeInformation, RegisterEvacuee, FamilyMember, FamilyHeadResult, EditEvacueeApi, SelectedEvacuee, Evacuee, SortKey, SortState } from "@/types/EvacuationCenterDetails";
import { usePageTitle } from "../hooks/usePageTitle";
import { encodeId } from "@/utils/secureId";
import { formatDate } from "@/utils/dateFormatter";
import { FamilyDetailsModal } from "../components/modals/FamilyDetailsModal";
import { RegisterEvacueeModal } from "../components/modals/RegisterEvacueeModal";
import { SearchEvacueeModal } from "../components/modals/SearchEvacueeModal";
import { FamilyHeadSearchModal } from "../components/modals/FamilyHeadSearchModal";
import { RegisterBlockDialog } from "@/components/modals/RegisterBlockDialog";
import { DecampAllModal } from "../components/modals/DecampAllModal";
import { AlreadyEndedDialog } from "../components/modals/AlreadyEndedDialog";
import { startOfDayLocal } from "@/utils/dateInput";
import { differenceInYears } from "date-fns";
import { mapEditPayloadToForm, mapSearchPayloadToForm } from "@/utils/mapEvacueePayload";
import { usePermissions } from "../contexts/PermissionContext";
import { useSelector } from "react-redux";
import { selectToken } from "../features/auth/authSlice";

export default function EvacuationCenterDetail() {
  const navigate = useNavigate();
  const { id: encodedDisasterId, disasterEvacuationEventId: encodedCenterId } = useParams();
  const disasterId = decodeId(encodedDisasterId!);
  const centerId = decodeId(encodedCenterId!);
  const { hasPermission } = usePermissions();
  const token = useSelector(selectToken);
  const canViewDashboardSpecific = hasPermission('view_dashboard_specific');
  const canViewFamilyInformation = hasPermission('view_family_information');
  const canCreateEvacueeInformation = hasPermission('create_evacuee_information');
  const canCreateFamilyInformation = hasPermission('create_family_information');
  const canUpdateEvacueeInformation = hasPermission('update_evacuee_information');
  const canUpdateFamilyInformation = hasPermission('update_family_information');
  const canViewOnlySpecificDashboardEvacuation = hasPermission('view_only_specific_dashboard_evacuation');
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

  // permissions (or use a specific permission you already have)
  const canEndOperation = hasPermission("end_evacuation_operation") || canUpdateFamilyInformation;

  // event ended? (robust check across possible shapes)
  const isEventEnded = Boolean(detail?.evacuation_event?.evacuation_end_date);
  const [alreadyEndedOpen, setAlreadyEndedOpen] = useState(false);

  useEffect(() => {
    console.log("[details.evacuation_event]", detail?.evacuation_event);
    console.log("[isEventEnded]", isEventEnded);
  }, [detail, isEventEnded]);


  // End Operation flow
  const [endOpen, setEndOpen] = useState(false);
  const [undecampedCount, setUndecampedCount] = useState<number>(0);
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);

  // bounds for the modal (earliest = disaster start)
  const minDateForEnd =
    (detail as any)?.disaster_evacuation_event?.evacuation_start_date
      ? startOfDayLocal(new Date((detail as any).disaster_evacuation_event.evacuation_start_date))
      : detail?.disaster?.disaster_start_date
      ? startOfDayLocal(new Date(detail.disaster.disaster_start_date))
      : undefined;
      
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

  const chartData = statistics
    ? [
        { label: "Males", value: statistics.summary.total_no_of_male },
        { label: "Females", value: statistics.summary.total_no_of_female },
        { label: "Infants (<1 yr)", value: statistics.summary.total_no_of_infant },
        { label: "Children (2–12 yrs)", value: statistics.summary.total_no_of_children },
        { label: "Youth (13–17 yrs)", value: statistics.summary.total_no_of_youth },
        { label: "Adults (18–59 yrs)", value: statistics.summary.total_no_of_adult },
        { label: "Senior Citizens (60+)", value: statistics.summary.total_no_of_seniors },
        { label: "PWD", value: statistics.summary.total_no_of_pwd },
        { label: "Pregnant Women", value: statistics.summary.total_no_of_pregnant },
        { label: "Lactating Women", value: statistics.summary.total_no_of_lactating_women },
      ]
    : [];

  usePageTitle(detail?.evacuation_center?.evacuation_center_name ?? "Evacuation Center Detail");

  const fetchDetails = useCallback(async () => {
    try {
      const res = await axios.get<EvacuationCenterDetail>(
        `https://api.e-legtas.tech/api/v1/evacuees/${centerId}/details`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setDetail(res.data);
    } catch {
    }
  }, [centerId, token]);

  const fetchStatistics = useCallback(async () => {
    try {
      const res = await axios.get<EvacueeStatistics>(
        `https://api.e-legtas.tech/api/v1/evacuees/${centerId}/evacuee-statistics`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setStatistics(res.data);
    } catch {
    }
  }, [centerId, token]);

const fetchEvacueesList = useCallback(async (opts?: { silent?: boolean }) => {
  if (!opts?.silent) setEvacueesLoading(true);
  try {
    const res = await axios.get<FamilyEvacueeInformation[]>(
      `https://api.e-legtas.tech/api/v1/evacuees/${centerId}/evacuees-information`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    setEvacuees(Array.isArray(res.data) ? res.data : []);
  } catch {
    setEvacuees([]);
  } finally {
    if (!opts?.silent) setEvacueesLoading(false);
  }
}, [centerId, token]);

const refreshAll = useCallback(async (opts?: { silent?: boolean }) => {
  await Promise.all([
    fetchEvacueesList(opts),
    fetchDetails(),   
    fetchStatistics(), 
  ]);
}, [fetchEvacueesList, fetchDetails, fetchStatistics]);

const refreshAllDebounced = useMemo(() => {
  let t: number | undefined;
  return () => {
    if (t) window.clearTimeout(t);
    t = window.setTimeout(() => {
      refreshAll({ silent: true });
    }, 400);
  };
}, [refreshAll]);

  useEffect(() => {
    console.log("✅ Decoded IDs:", { disasterId, centerId });
    if (!centerId || isNaN(Number(centerId))) {
      console.warn("❌ Invalid decoded centerId:", centerId);
      return;
    }
    refreshAll();
  }, [centerId, disasterId, refreshAll]);

  useEffect(() => {
  if (!centerId) return;

  const channel = supabase.channel(`ec-detail-core-${centerId}`);
  // 1) Any registration insert/update/delete for this event → list + stats + details
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'evacuation_registrations',
      filter: `disaster_evacuation_event_id=eq.${centerId}`
    },
    () => refreshAllDebounced()
  );
  // 2) Resident profile edits (names/sex/birthdate/barangay) → affect list/details
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'residents' },
    () => refreshAllDebounced()
  );
  // 3) Evacuee resident record changes (relationship, etc.)
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'evacuee_residents' },
    () => refreshAllDebounced()
  );
  // 4) Aggregate stats table used by your /evacuee-statistics endpoint
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'evacuation_summaries',
      filter: `disaster_evacuation_event_id=eq.${centerId}`
    },
    () => refreshAllDebounced()
  );
  // 5) Event ended / updated → headers, breadcrumbs, etc.
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'disaster_evacuation_event',
      filter: `id=eq.${centerId}`
    },
    () => refreshAllDebounced()
  );

  channel.subscribe();
  return () => { supabase.removeChannel(channel); };
}, [centerId, refreshAllDebounced]);

useEffect(() => {
  const ecId = detail?.evacuation_center?.evacuation_center_id;
  const disasterIdForDetail = detail?.disaster?.disasters_id;
  if (!ecId && !disasterIdForDetail) return;

  const channel = supabase.channel(`ec-detail-meta-${centerId}`);

  if (ecId) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'evacuation_center_rooms',
        filter: `evacuation_center_id=eq.${ecId}`
      },
      () => refreshAllDebounced()
    );
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'evacuation_centers',
        filter: `id=eq.${ecId}`
      },
      () => refreshAllDebounced()
    );
  }

  if (disasterIdForDetail) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'disasters',
        filter: `id=eq.${disasterIdForDetail}`
      },
      () => refreshAllDebounced()
    );
  }

  channel.subscribe();
  return () => { supabase.removeChannel(channel); };
}, [centerId, detail?.evacuation_center?.evacuation_center_id, detail?.disaster?.disasters_id, refreshAllDebounced]);

const { paginatedEvacuees, totalRows, totalPages } = useMemo(() => {
  const base = Array.isArray(evacuees) ? evacuees : [];

  const q = search.trim().toLowerCase();
  const searched = q
    ? base.filter(
        (evac) =>
          evac.family_head_full_name.toLowerCase().includes(q) ||
          evac.barangay.toLowerCase().includes(q)
      )
    : base;

// Group: active (no decampment) first, decamped last
const undecamped = searched.filter((f) => !f.decampment_timestamp);
const decamped = searched.filter((f) => !!f.decampment_timestamp);

// Active rows: latest registered first
undecamped.sort((a, b) => getRegisteredAt(b) - getRegisteredAt(a));

// Decamped rows: most recently decamped first (but still below active)
decamped.sort((a, b) => {
  const ta = Date.parse(a.decampment_timestamp || "");
  const tb = Date.parse(b.decampment_timestamp || "");
  return tb - ta;
});

const defaultSorted = [...undecamped, ...decamped];


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

  useEffect(() => {
    if (!selectedFamily) return;
    const updated = evacuees.find((e) => e.id === selectedFamily.id);
    if (updated) setSelectedFamily(updated);
  }, [evacuees, selectedFamily?.id]);

  // Add state for modal mode and form data
  const [evacueeModalOpen, setEvacueeModalOpen] = useState(false);
  const [evacueeModalMode, setEvacueeModalMode] = useState<"register" | "edit">("register");
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

  useEffect(() => {
  if (isEventEnded && showSearchModal) {
    setShowSearchModal(false);
    setAlreadyEndedOpen(true);
  }
}, [isEventEnded, showSearchModal]);

  const handleEditMember = async (member: FamilyMember) => {
    if (isEventEnded) { setAlreadyEndedOpen(true); return; }
    // Check if user has permission to update family information
    if (!canUpdateFamilyInformation) {
      console.warn("User does not have permission to update family information");
      return;
    }

    try {
      const evacueeResidentId = (member as any).evacuee_resident_id ?? (member as any).evacuee_id;
      if (!evacueeResidentId) return;

      const res = await axios.get<EditEvacueeApi>(
        `https://api.e-legtas.tech/api/v1/evacuees/${centerId}/${evacueeResidentId}/edit`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const data = res.data;
      const mapped = mapEditPayloadToForm(data);

      setFormData((prev) => ({
        ...prev,
        ...mapped,
        evacuationRoomName: (member as any).room_name || prev.evacuationRoomName || "",
        searchEvacuationRoom: String(data.ec_rooms_id ?? ""),
      }));

      setSelectedEvacuee({
        id: Number(evacueeResidentId),
        registration_ec_rooms_id: data.ec_rooms_id ?? null,
      });

      setEvacueeModalMode("edit");
      setEvacueeModalOpen(true);
    } catch {
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
        "https://api.e-legtas.tech/api/v1/evacuees/search",
        {
          params: { name: value },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setSearchResults([]);
    }
  };

  const handleFamilyHeadSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          `https://api.e-legtas.tech/api/v1/evacuees/${centerId}/family-heads`,
          { 
            params: { q },
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        setFamilyHeadSearchResults(data?.data || []);
      } catch {
        setFamilyHeadSearchResults([]);
      } finally {
        setFhLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [familyHeadSearchTerm, showFamilyHeadSearchModal, centerId]);

  const handleFamilyHeadSelect = (fh: FamilyHeadResult) => {
    // Check if user has permission to create family information
    if (!canCreateFamilyInformation) {
      console.warn("User does not have permission to create family information");
      return;
    }
    
    setFormData((prev) => ({
      ...prev,
      familyHead: fh.family_head_full_name,
      familyHeadId: fh.family_head_id,
      barangayOfOrigin: fh.barangay_id != null ? String(fh.barangay_id) : prev.barangayOfOrigin,
      purok: fh.purok ?? prev.purok,
      evacuationRoomName: fh.evacuation_room ?? "",
    }));
    setShowFamilyHeadSearchModal(false);
  };

  const handleFamilyHeadSearchClick = () => {
    // Check if user has permission to create family information
    if (!canCreateFamilyInformation) {
      console.warn("User does not have permission to create family information");
      return;
    }
    
    setFamilyHeadSearchTerm("");
    setFamilyHeadSearchResults([]);
    setShowFamilyHeadSearchModal(true);
  };

  const handleSelectEvacuee = (evacuee: any) => {
    if (evacuee?.is_active) {
      const fullName = [evacuee?.first_name, evacuee?.middle_name, evacuee?.last_name, evacuee?.suffix]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      setRegBlockName(fullName || undefined);
      setRegBlockEcName(evacuee?.active_ec_name || undefined);
      setRegBlockOpen(true);
      return;
    }

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
     if (isEventEnded) { setAlreadyEndedOpen(true); return; }
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

  const handleVulnerabilityChange = (vulnerability: string, checked: boolean) => {
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
    if (isEventEnded) { setAlreadyEndedOpen(true); return; }
    setEvacueeModalMode("register");
    setShowSearchModal(true);
    setSearchName("");
    setSearchResults([]);
  };

// REPLACE this function
const openEndFlow = async () => {
  // If the event is already ended, just show the info dialog instead of the action modal
  if (isEventEnded) {
    setAlreadyEndedOpen(true);   // <- you added this state earlier
    return;
  }

  try {
    const { data } = await axios.get<{ count: number }>(
      `https://api.e-legtas.tech/api/v1/evacuees/${centerId}/undecamped-count`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setUndecampedCount(data?.count ?? 0);
    setEndOpen(true);
  } catch (e: any) {
    alert(e?.response?.data?.message || "Failed to check undecamped families.");
  }
};

const decampAllThenEnd = async (isoTs: string) => {
  if (!centerId || !token) return;
  setEnding(true);
  setEndError(null);

  try {
    if ((undecampedCount ?? 0) > 0) {
      await axios.post(
        `https://api.e-legtas.tech/api/v1/evacuees/${centerId}/decamp-all`,
        { decampment_timestamp: isoTs },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
    }

    await axios.post(
      `https://api.e-legtas.tech/api/v1/evacuees/${centerId}/end`,
      { evacuation_end_date: isoTs },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    setEndOpen(false);
    await refreshAll();
  } catch (e: any) {
    const status = e?.response?.status;
    const msg = e?.response?.data?.message || "Failed to end evacuation operation.";

    // If backend says it's already ended, close the modal and show the info dialog
    if (status === 409 && /already ended/i.test(msg)) {
      setEndOpen(false);
      setAlreadyEndedOpen(true);
      await refreshAll({ silent: true });
      return;
    }

    setEndError(msg);
  } finally {
    setEnding(false);
  }
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
    if (isEventEnded) { setAlreadyEndedOpen(true); return; }
    // Check permission for edit mode
    if (evacueeModalMode === "edit" && !canUpdateEvacueeInformation) {
      console.warn("User does not have permission to update evacuee information");
      return;
    }

    console.log("[handleRegisterEvacuee] start", {
      mode: evacueeModalMode,
      isFamilyHead: formData.isFamilyHead,
      familyHeadId: formData.familyHeadId,
      searchEvacuationRoom: formData.searchEvacuationRoom,
    });

    try {
      const birthdate = new Date(formData.birthday);
      const age = differenceInYears(new Date(), birthdate);
      const vulnerabilityFlags = getVulnerabilityFlags(age);
      const relationship = formData.isFamilyHead === "Yes" ? "Head" : formData.relationshipToFamilyHead;

      if (formData.isFamilyHead === "No" && !formData.familyHeadId) return;

      const roomId = Number.parseInt(formData.searchEvacuationRoom);
      if (!Number.isFinite(roomId)) return;

      if (!Number.isFinite(centerId as any)) return;

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
      if (evacueeModalMode === "register") {
        await axios.post(
          "https://api.e-legtas.tech/api/v1/evacuees",
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
      } else if (evacueeModalMode === "edit" && selectedEvacuee?.id) {
        const url = `https://api.e-legtas.tech/api/v1/evacuees/${selectedEvacuee.id}`;
        await axios.put(url, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      } else {
        return;
      }
      
      setEvacueeModalOpen(false);
      await refreshAll();
    } catch (error: any) {
      const status = error?.response?.status;
      const server = error?.response?.data;
      const msg = server?.message || "Failed to register evacuee.";

      const fullName = [formData.firstName, formData.middleName, formData.lastName, formData.suffix]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (status === 409) {
        setRegBlockName(fullName || undefined);
        setRegBlockEcName(server?.active_ec_name || server?.active_ec || undefined);
        setRegBlockOpen(true);
      } else if (status === 400) {
        alert(msg);
      }
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
            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
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
        <h1 className="text-3xl font-bold text-green-800">Evacuation Information</h1>
        <div className="flex items-center text-sm text-gray-600">
          <button onClick={() => navigate("/evacuation-information")} className="hover:text-green-700 transition-colors cursor-pointer">
            Disaster
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          {canViewOnlySpecificDashboardEvacuation ? (
            <span className="text-gray-600">
              {disaster?.name}
            </span>
          ) : (
            <button
              onClick={() => navigate(`/evacuation-information/${encodeId(disasterId)}`)}
              className="hover:text-green-700 transition-colors cursor-pointer"
            >
              {disaster?.name}
            </button>
          )}
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-gray-900 font-semibold">{centerName}</span>
        </div>
      </div>

      {/* Center Summary & Statistics */}
      {canViewDashboardSpecific && (
        <div className="mb-10">
          {canViewOnlySpecificDashboardEvacuation ? (
            /* When canViewOnlySpecificDashboardEvacuation is true, show Disaster Info and Center Name on same line */
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Disaster Information Card */}
              <div className="flex-1 py-3">
                <div className="space-y-3">
                  <div className={`inline-block rounded px-3 py-1 text-sm font-semibold ${getTagColor(disaster.type)}`}>{disaster.type}</div>
                  <h2 className={`text-3xl font-bold ${getTypeColor(disaster.type)}`}>{disaster.name}</h2>
                  {detail?.disaster?.disaster_start_date && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">{formatDate(detail.disaster.disaster_start_date)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <EvacuationCenterNameCard
                  name={centerName}
                  barangay={centerBarangay}
                />
              </div>
            </div>
          ) : (
            <>
              {/* Disaster Information Card */}
              <div className="py-3">
                <div className="space-y-3">
                  <div className={`inline-block rounded px-3 py-1 text-sm font-semibold ${getTagColor(disaster.type)}`}>{disaster.type}</div>
                  <h2 className={`text-3xl font-bold ${getTypeColor(disaster.type)}`}>{disaster.name}</h2>
                  {detail?.disaster?.disaster_start_date && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">{formatDate(detail.disaster.disaster_start_date)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-1">
                  <EvacuationCenterNameCard
                    name={centerName}
                    barangay={centerBarangay}
                  />

                {!canViewOnlySpecificDashboardEvacuation && (
                  <div className="flex flex-col gap-6 mt-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <RegisteredFamiliesCard count={familiesCount} />
                      <RegisteredEvacueesCard count={evacueesCount} />
                      <ECCapacityCard count={capacityCount} />
                    </div>
                  </div>
                )}
                </div>
                {!canViewOnlySpecificDashboardEvacuation && (
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
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Registered Evacuees Table - Only visible with view_family_information permission */}
      {canViewFamilyInformation && (
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

            <div className="flex items-center gap-3 self-start sm:self-auto">
              {/* When ENDED: show a button-style pill BEFORE Register */}
              {isEventEnded ? (
                <Button
                  type="button"
                  onClick={() => setAlreadyEndedOpen(true)}
                  className="h-10 px-6 bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 cursor-pointer"
                  title="Evacuation operation already ended"
                >
                  Evacuation operation ended
                </Button>
              ) : (
                /* When NOT ended: show the real “End Evacuation Operation” button */
                canEndOperation && (
                  <Button
                    className="h-10 bg-red-600 hover:bg-red-700 text-white px-6 cursor-pointer"
                    onClick={openEndFlow}
                  >
                    End Evacuation Operation
                  </Button>
                )
              )}

              {/* Register Evacuee — dimmed when ended, but still clickable to show the modal */}
              {canCreateEvacueeInformation && (
                <Button
                  className={`bg-green-700 hover:bg-green-800 text-white px-6 flex gap-2 items-center cursor-pointer ${
                    isEventEnded ? "opacity-60" : ""
                  }`}
                  onClick={() => (isEventEnded ? setAlreadyEndedOpen(true) : handleRegisterClick())}
                  title={isEventEnded ? "Evacuation operation already ended" : "Register a new evacuee"}
                  aria-disabled={isEventEnded}  // accessibility + keeps hover/focus styles
                >
                  <span className="text-lg">+</span> Register Evacuee
                </Button>
              )}
            </div>
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
                            {evac.decampment_timestamp ? formatDate(evac.decampment_timestamp) : "—"}
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
              centerName={selectedFamily?.view_family?.evacuation_center_name || ""}
              onEditMember={handleEditMember}
              canUpdateEvacuee={canUpdateEvacueeInformation}
              canUpdateFamily={canUpdateFamilyInformation}
              disasterStartDate={detail?.disaster?.disaster_start_date ?? null}
              eventEnded={isEventEnded}
              onEndedAction={() => setAlreadyEndedOpen(true)}
              onSaved={async (_patch) => {
                await refreshAll({ silent: true });
              }}
               
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
              canCreateFamilyInformation={canCreateFamilyInformation}
            />
            <RegisterBlockDialog
              open={regBlockOpen}
              onOpenChange={setRegBlockOpen}
              personName={regBlockName}
              ecName={regBlockEcName}
            />
            <SearchEvacueeModal
              isOpen={showSearchModal}
              onClose={() => setShowSearchModal(false)}
              searchName={searchName}
              onSearchChange={handleSearchChange}
              searchResults={searchResults}
              onSelectEvacuee={handleSelectEvacuee}
              onManualRegister={handleManualRegister}
              eventEnded={isEventEnded}
              onEndedAction={() => setAlreadyEndedOpen(true)}
              registeredIds={registeredEvacueeIds}
              canCreateFamilyInformation={canCreateFamilyInformation}
              currentEventId={centerId}
              currentEcId={detail?.evacuation_center?.evacuation_center_id ?? null}
              currentDisasterId={detail?.disaster?.disasters_id ?? null}
            />

            <DecampAllModal
            open={endOpen}
            onOpenChange={setEndOpen}
            undecampedCount={undecampedCount}
            minDate={minDateForEnd}
            maxDate={new Date()}
            loading={ending}
            error={endError}
            onConfirm={decampAllThenEnd}
          />

          <AlreadyEndedDialog
            open={alreadyEndedOpen}
            onOpenChange={setAlreadyEndedOpen}
          />

            {/* Family Head Search Modal - Only visible with create_family_information permission */}
            {canCreateFamilyInformation && (
              <FamilyHeadSearchModal
                isOpen={showFamilyHeadSearchModal}
                onClose={() => setShowFamilyHeadSearchModal(false)}
                searchTerm={familyHeadSearchTerm}
                onSearchChange={handleFamilyHeadSearchChange}
                searchResults={familyHeadSearchResults}
                onSelectFamilyHead={handleFamilyHeadSelect}
                loading={fhLoading}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
