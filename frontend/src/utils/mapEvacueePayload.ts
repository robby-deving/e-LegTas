// utils/mapEvacueePayload.ts

type VulnIds = number[] | undefined | null;
const hasVuln = (ids: VulnIds, id: number) =>
  Array.isArray(ids) && ids.includes(id);

// -------------------------
// EDIT: prefer event snapshot
// -------------------------
export function mapEditPayloadToForm(p: any) {
  // Prefer event-scoped snapshot; fallback to top-level
  const s = p?.profile_snapshot ?? p;

  // Vulnerabilities are event-scoped
  const vulnIds: number[] = Array.isArray(p?.vulnerability_type_ids)
    ? p.vulnerability_type_ids
    : [];

  // Normalize birthdate
  const safeBirth = typeof s?.birthdate === "string" ? s.birthdate : "";
  const birthdayISO = safeBirth ? safeBirth.substring(0, 10) : "";

  // ---- NEW: robust relationship resolution ----
  // 1) Prefer snapshot.relationship_to_family_head
  // 2) Fallback to top-level (global) relationship if snapshot missing
  // 3) Treat missing/empty as "Head" (so Edit shows 'Yes' by default)
  const relRaw = (s?.relationship_to_family_head ?? p?.relationship_to_family_head ?? "").trim();
  const isHead = relRaw === "Head" || relRaw === ""; // default empty → Head
  const relationshipForForm = isHead ? "" : relRaw;

  return {
    // identity / demographics (prefer snapshot)
    firstName: s?.first_name ?? "",
    middleName: s?.middle_name ?? "",
    lastName: s?.last_name ?? "",
    suffix: s?.suffix ?? "",
    sex: s?.sex ?? "",
    maritalStatus: s?.marital_status ?? "",
    birthday: birthdayISO,
    educationalAttainment: s?.educational_attainment ?? "",
    schoolOfOrigin: s?.school_of_origin ?? "",
    occupation: s?.occupation ?? "",
    purok: s?.purok != null ? String(s.purok) : "",
    barangayOfOrigin:
      s?.barangay_of_origin != null ? String(s.barangay_of_origin) : "",

    // family role (event-scoped in snapshot, with safe fallback)
    isFamilyHead: isHead ? "Yes" : "No",
    relationshipToFamilyHead: relationshipForForm,
    familyHeadId: isHead ? null : (p?.family_head_id ?? null),
    familyHead: isHead ? "" : (p?.family_head_full_name ?? ""),

    // room (this event)
    searchEvacuationRoom: p?.ec_rooms_id != null ? String(p.ec_rooms_id) : "",
    evacuationRoomName: p?.room_name ?? "",

    // vulnerabilities (event-scoped)
    vulnerabilities: {
      pwd: hasVuln(vulnIds, 4),
      pregnant: hasVuln(vulnIds, 5),
      lactatingMother: hasVuln(vulnIds, 6),
    },
  };
}

// ---------------------------------
// SEARCH/REUSE: start from snapshot,
// but DO NOT inherit old head role
// ---------------------------------
export function mapSearchPayloadToForm(p: any) {
  // /search already flattens to event-preferred fields,
  // but also works if backend later nests a snapshot:
  const s = p?.profile_snapshot ?? p;

  const vulnIds: number[] = Array.isArray(p?.vulnerability_type_ids)
    ? p.vulnerability_type_ids
    : [];

  const safeBirth = typeof s?.birthdate === "string" ? s.birthdate : "";
  const birthdayISO = safeBirth ? safeBirth.substring(0, 10) : "";

  // ALWAYS default to "Yes" for new events to avoid inheriting old role
  return {
    firstName: s?.first_name ?? "",
    middleName: s?.middle_name ?? "",
    lastName: s?.last_name ?? "",
    suffix: s?.suffix ?? "",
    sex: s?.sex ?? "",
    maritalStatus: s?.marital_status ?? "",
    birthday: birthdayISO,
    educationalAttainment: s?.educational_attainment ?? "",
    schoolOfOrigin: s?.school_of_origin ?? "",
    occupation: s?.occupation ?? "",
    purok: s?.purok != null ? String(s.purok) : "",
    barangayOfOrigin:
      s?.barangay_of_origin != null ? String(s.barangay_of_origin) : "",

    // For a *new* registration, we don’t assume prior event’s head/member status
    isFamilyHead: "Yes",
    familyHead: "",
    familyHeadId: null,
    relationshipToFamilyHead: "",

    // If you want to preselect a same-name room, keep the id; UI can override
    searchEvacuationRoom: p?.ec_rooms_id != null ? String(p.ec_rooms_id) : "",

    // manual vulnerabilities (event-scoped)
    vulnerabilities: {
      pwd: hasVuln(vulnIds, 4),
      pregnant: hasVuln(vulnIds, 5),
      lactatingMother: hasVuln(vulnIds, 6),
    },

    // optional: make reuse payload simpler to assemble
    existingEvacueeResidentId: p?.evacuee_resident_id ?? null,
  };
}
