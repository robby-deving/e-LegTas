// src/pages/EvacuationCenterDetail.tsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ChevronRight, Calendar } from "lucide-react";
import { useSelector } from "react-redux";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisteredFamiliesCard } from "@/components/cards/RegisteredFamiliesCard";
import { RegisteredEvacueesCard } from "@/components/cards/RegisteredEvacueesCard";
import { ECCapacityCard } from "@/components/cards/ECCapacityCard";
import { EvacuationCenterNameCard } from "../components/cards/EvacuationCenterNameCard";
import EvacueeStatisticsChart from "@/components/EvacueeStatisticsChart";

import { getTypeColor, getTagColor } from "@/constants/disasterTypeColors";
import { decodeId, encodeId } from "@/utils/secureId";
import { mapEditPayloadToForm, mapSearchPayloadToForm } from "@/utils/mapEvacueePayload";
import { formatDate } from "@/utils/dateFormatter";
import { startOfDayLocal } from "@/utils/dateInput";
import { differenceInYears } from "date-fns";

import { FamilyDetailsModal } from "@/components/modals/FamilyDetailsModal";
import { RegisterEvacueeModal } from "@/components/modals/RegisterEvacueeModal";
import { SearchEvacueeModal } from "@/components/modals/SearchEvacueeModal";
import { FamilyHeadSearchModal } from "../components/modals/FamilyHeadSearchModal";
import { RegisterBlockDialog } from "@/components/modals/RegisterBlockDialog";
import { DecampAllModal } from "@/components/modals/DecampAllModal";
import { AlreadyEndedDialog } from "@/components/modals/AlreadyEndedDialog";

import { usePageTitle } from "@/hooks/usePageTitle";
import { usePermissions } from "@/contexts/PermissionContext";
import { selectToken } from "@/features/auth/authSlice";

import RegisteredEvacueesTable from "../components/EvacuationCenterDetail/RegisteredEvacueesTable";
import { useFamilySort } from "@/hooks/useFamilySort";
import { useEcSubscriptions } from "@/hooks/useEcSubscriptions";
import { evacueesApi } from "@/services/evacuees";
import type { EvacuationCenterDetail, EvacueeStatistics, FamilyEvacueeInformation, RegisterEvacuee, FamilyMember, FamilyHeadResult, SelectedEvacuee, Evacuee } from "@/types/EvacuationCenterDetails";

export default function EvacuationCenterDetail() {
  const navigate = useNavigate();
  const { id: encodedDisasterId, disasterEvacuationEventId: encodedCenterId } = useParams();
  const disasterId = decodeId(encodedDisasterId!);
  const centerId = decodeId(encodedCenterId!);

  const { hasPermission } = usePermissions();
  const token = useSelector(selectToken);

  // detect if this page was opened from the "outside ec" tab
  const location = useLocation() as { state?: { isOutsideEc?: boolean } };
  const openedFromOutside = Boolean(location?.state?.isOutsideEc);

  const canViewDashboardSpecific = hasPermission("view_dashboard_specific");
  const canViewFamilyInformation = hasPermission("view_family_information");
  const canCreateEvacueeInformation = hasPermission("create_evacuee_information");
  const canCreateFamilyInformation = hasPermission("create_family_information");
  const canUpdateEvacueeInformation = hasPermission("update_evacuee_information");
  const canUpdateFamilyInformation = hasPermission("update_family_information");
  const canViewOnlySpecificDashboardEvacuation = hasPermission("view_only_specific_dashboard_evacuation");
  const canEndOperation = hasPermission("end_evacuation_operation") || canUpdateFamilyInformation;

  // core state
  const [detail, setDetail] = useState<EvacuationCenterDetail | null>(null);
  const [statistics, setStatistics] = useState<EvacueeStatistics | null>(null);
  const [evacuees, setEvacuees] = useState<FamilyEvacueeInformation[]>([]);
  const [evacueesLoading, setEvacueesLoading] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<FamilyEvacueeInformation | null>(null);

  // table & search
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  useEffect(() => setPage(1), [search, rowsPerPage]);

  // modal interactions
  const [selectedEvacuee, setSelectedEvacuee] = useState<SelectedEvacuee | null>(null);
  const [searchResults, setSearchResults] = useState<Evacuee[]>([]);
  const [regBlockOpen, setRegBlockOpen] = useState(false);
  const [regBlockName, setRegBlockName] = useState<string | undefined>();
  const [regBlockEcName, setRegBlockEcName] = useState<string | undefined>();

  const isEventEnded = Boolean(detail?.evacuation_event?.evacuation_end_date);
  const [alreadyEndedOpen, setAlreadyEndedOpen] = useState(false);

  // end operation
  const [endOpen, setEndOpen] = useState(false);
  const [undecampedCount, setUndecampedCount] = useState<number>(0);
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);

  // sorting
  const { sort, toggleSort, sortRows } = useFamilySort();

  // page title
  usePageTitle(detail?.evacuation_center?.evacuation_center_name ?? "Evacuation Center Detail");

  // fetchers (via service)
  const fetchDetails = useCallback(async () => {
    try {
      const res = await evacueesApi.getDetails(Number(centerId), token!);
      setDetail(res.data);
    } catch {}
  }, [centerId, token]);

  const fetchStatistics = useCallback(async () => {
    try {
      const res = await evacueesApi.getStatistics(Number(centerId), token!);
      setStatistics(res.data);
    } catch {}
  }, [centerId, token]);

  const fetchEvacueesList = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setEvacueesLoading(true);
      try {
        const res = await evacueesApi.getEvacueesInformation(Number(centerId), token!);
        setEvacuees(Array.isArray(res.data) ? res.data : []);
      } catch {
        setEvacuees([]);
      } finally {
        if (!opts?.silent) setEvacueesLoading(false);
      }
    },
    [centerId, token]
  );

  const refreshAll = useCallback(
    async (opts?: { silent?: boolean }) => {
      await Promise.all([fetchEvacueesList(opts), fetchDetails(), fetchStatistics()]);
    },
    [fetchEvacueesList, fetchDetails, fetchStatistics]
  );

  const refreshAllDebounced = useMemo(() => {
    let t: number | undefined;
    return () => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => {
        refreshAll({ silent: true });
      }, 400);
    };
  }, [refreshAll]);

  // initial load
  useEffect(() => {
    if (!centerId || isNaN(Number(centerId))) return;
    refreshAll();
  }, [centerId, refreshAll]);

  // realtime subscriptions
  useEcSubscriptions(centerId, detail, refreshAllDebounced);

  // track selectedFamily updates
  useEffect(() => {
    if (!selectedFamily) return;
    const updated = evacuees.find((e) => e.id === selectedFamily.id);
    if (updated) setSelectedFamily(updated);
  }, [evacuees, selectedFamily?.id]);

  // min date for end operation
  const minDateForEnd =
    (detail as any)?.disaster_evacuation_event?.evacuation_start_date
      ? startOfDayLocal(new Date((detail as any).disaster_evacuation_event.evacuation_start_date))
      : detail?.disaster?.disaster_start_date
      ? startOfDayLocal(new Date(detail.disaster.disaster_start_date))
      : undefined;

  // helper: latest registration time in family
  const getRegisteredAt = (f: FamilyEvacueeInformation) => {
    const members = f?.list_of_family_members?.family_members ?? [];
    let maxTs = Number.NEGATIVE_INFINITY;
    for (const m of members as any[]) {
      const t = Date.parse(m?.arrival_timestamp ?? "");
      if (!Number.isNaN(t)) maxTs = Math.max(maxTs, t);
    }
    return maxTs;
  };

  // ids in table (for SearchEvacueeModal to gray out)
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

  // chart data
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

  // SEARCH + SORT + PAGINATION (table)
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

    const undecamped = searched.filter((f) => !f.decampment_timestamp);
    const decamped = searched.filter((f) => !!f.decampment_timestamp);

    // default grouping: active first, then decamped
    undecamped.sort((a, b) => getRegisteredAt(b) - getRegisteredAt(a));
    decamped.sort((a, b) => {
      const ta = Date.parse(a.decampment_timestamp || "");
      const tb = Date.parse(b.decampment_timestamp || "");
      return tb - ta;
    });

    const defaultSorted = [...undecamped, ...decamped];
    const sorted = sort ? sortRows(defaultSorted) : defaultSorted;

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

  // modal states & handlers
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
    if (isEventEnded) {
      setAlreadyEndedOpen(true);
      return;
    }
    if (!canUpdateFamilyInformation) return;

    try {
      const evacueeResidentId = (member as any).evacuee_resident_id ?? (member as any).evacuee_id;
      if (!evacueeResidentId) return;

      const res = await evacueesApi.getEditEvacuee(Number(centerId), Number(evacueeResidentId), token!);
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
    } catch {}
  };

  const handleSearchChange = async (value: string) => {
    setSearchName(value);
    if (value.trim() === "") {
      setSearchResults([]);
      return;
    }
    try {
      const { data } = await evacueesApi.searchEvacuees(value, token!);
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setSearchResults([]);
    }
  };

  const handleFamilyHeadSearchChange = (v: string) => setFamilyHeadSearchTerm(v);

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
        const { data } = await evacueesApi.getFamilyHeads(Number(centerId), q, token!);
        setFamilyHeadSearchResults(data?.data || []);
      } catch {
        setFamilyHeadSearchResults([]);
      } finally {
        setFhLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [familyHeadSearchTerm, showFamilyHeadSearchModal, centerId, token]);

  const handleFamilyHeadSelect = (fh: FamilyHeadResult) => {
    if (!canCreateFamilyInformation) return;

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
    if (!canCreateFamilyInformation) return;
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
    if (isEventEnded) {
      setAlreadyEndedOpen(true);
      return;
    }
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
    setTimeout(() => setEvacueeModalOpen(true), 0);
  };

  const handleFormInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleVulnerabilityChange = (vulnerability: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      vulnerabilities: { ...prev.vulnerabilities, [vulnerability]: checked },
    }));
  };

  const handleEvacueeModalClose = () => setEvacueeModalOpen(false);

  const handleRegisterClick = () => {
    if (isEventEnded) {
      setAlreadyEndedOpen(true);
      return;
    }
    setEvacueeModalMode("register");
    setShowSearchModal(true);
    setSearchName("");
    setSearchResults([]);
  };

  const openEndFlow = async () => {
    if (isEventEnded) {
      setAlreadyEndedOpen(true);
      return;
    }

    try {
      const { data } = await evacueesApi.getUndecampedCount(Number(centerId), token!);
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
        await evacueesApi.decampAll(Number(centerId), isoTs, token);
      }
      await evacueesApi.endEvacuation(Number(centerId), isoTs, token);

      setEndOpen(false);
      await refreshAll();
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message || "Failed to end evacuation operation.";
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
    if (isEventEnded) {
      setAlreadyEndedOpen(true);
      return;
    }
    if (evacueeModalMode === "edit" && !canUpdateEvacueeInformation) return;

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
        await evacueesApi.postEvacuee(payload, token!);
      } else if (evacueeModalMode === "edit" && selectedEvacuee?.id) {
        await evacueesApi.putEvacuee(selectedEvacuee.id, payload, token!);
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
            <span className="text-gray-600">{disaster?.name}</span>
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
            <div className="flex flex-col lg:flex-row gap-6">
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
                <EvacuationCenterNameCard name={centerName} barangay={centerBarangay} />
              </div>
            </div>
          ) : (
            <>
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
                  <EvacuationCenterNameCard name={centerName} barangay={centerBarangay} />
                  {!canViewOnlySpecificDashboardEvacuation && (
                    <div className="flex flex-col gap-6 mt-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <RegisteredFamiliesCard count={familiesCount} />
                        <RegisteredEvacueesCard count={evacueesCount} />
                        {/* Hide capacity card when opened from the Outside EC tab or when capacity is not present */}
                        {!openedFromOutside && capacityCount ? (
                          <ECCapacityCard count={capacityCount} />
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
                {!canViewOnlySpecificDashboardEvacuation && (
                  <Card className="md:col-span-1 shadow-sm border border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl font-bold leading-tight mb-0">Evacuees Statistics</CardTitle>
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

      {/* Registered Evacuees Table */}
      {canViewFamilyInformation && (
        <RegisteredEvacueesTable
          loading={evacueesLoading}
          search={search}
          onSearchChange={setSearch}
          paginatedEvacuees={paginatedEvacuees}
          totalRows={totalRows}
          totalPages={totalPages}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          sort={sort}
          onToggleSort={toggleSort}
          onRowClick={handleRowClick}
          canEndOperation={canEndOperation}
          canCreateEvacueeInformation={canCreateEvacueeInformation}
          isEventEnded={isEventEnded}
          onOpenEndFlow={openEndFlow}
          onRegisterClick={handleRegisterClick}
          onShowEndedInfo={() => setAlreadyEndedOpen(true)}
        />
      )}

      {/* Modals */}
      <FamilyDetailsModal
        isOpen={!!selectedFamily}
        onClose={() => setSelectedFamily(null)}
        evacuee={selectedFamily}
        centerName={selectedFamily?.view_family?.evacuation_center_name || ""}
        onEditMember={handleEditMember}
        canUpdateEvacuee={canUpdateEvacueeInformation}
        canUpdateFamily={canUpdateFamilyInformation}
        disasterStartDate={detail?.disaster?.disaster_start_date ?? null}
        eventEnded={isEventEnded}
        onEndedAction={() => setAlreadyEndedOpen(true)}
        onSaved={async () => {
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
        centerId={Number(centerId)}
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
        onSearchChange={(e: any) => handleSearchChange(e.target ? e.target.value : e)}
        searchResults={searchResults}
        onSelectEvacuee={handleSelectEvacuee}
        onManualRegister={handleManualRegister}
        eventEnded={isEventEnded}
        onEndedAction={() => setAlreadyEndedOpen(true)}
        registeredIds={registeredEvacueeIds}
        canCreateFamilyInformation={canCreateFamilyInformation}
        currentEventId={Number(centerId)}
        currentEcId={detail?.evacuation_center?.evacuation_center_id ?? null}
        currentDisasterId={detail?.disaster?.disasters_id ?? null}
      />

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

      <AlreadyEndedDialog open={alreadyEndedOpen} onOpenChange={setAlreadyEndedOpen} />
    </div>
  );
}
