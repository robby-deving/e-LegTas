// utils/mapEvacueePayload.ts

type VulnIds = number[] | undefined | null;
const hasVuln = (ids: VulnIds, id: number) => Array.isArray(ids) && ids.includes(id);

const S = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function mapEditPayloadToForm(p: any) {
  const s = p?.profile_snapshot ?? p;
  const vulnIds = Array.isArray(p?.vulnerability_type_ids) ? p.vulnerability_type_ids : [];
  const safeBirth = S(s?.birthdate);
  const birthdayISO = safeBirth ? safeBirth.substring(0, 10) : "";
  const relRaw = S(s?.relationship_to_family_head ?? p?.relationship_to_family_head ?? "");
  const isHead = relRaw === "Head" || relRaw === "";
  const relationshipForForm = isHead ? "" : relRaw;

  return {
    firstName: S(s?.first_name),
    middleName: S(s?.middle_name),
    lastName: S(s?.last_name),
    suffix: typeof s?.suffix === "string" ? s.suffix : "",             
    sex: S(s?.sex),
    maritalStatus: S(s?.marital_status),
    birthday: birthdayISO,
    educationalAttainment: S(s?.educational_attainment),
    schoolOfOrigin: S(s?.school_of_origin),
    occupation: S(s?.occupation),
    purok: s?.purok != null ? String(s.purok) : "",
    barangayOfOrigin: s?.barangay_of_origin != null ? String(s.barangay_of_origin) : "",

    isFamilyHead: isHead ? "Yes" : "No",
    relationshipToFamilyHead: relationshipForForm,
    familyHeadId: isHead ? null : (p?.family_head_id ?? null),
    familyHead: isHead ? "" : S(p?.family_head_full_name),

    searchEvacuationRoom: p?.ec_rooms_id != null ? String(p.ec_rooms_id) : "",
    evacuationRoomName: S(p?.room_name),

    vulnerabilities: {
      pwd: hasVuln(vulnIds, 4),
      pregnant: hasVuln(vulnIds, 5),
      lactatingMother: hasVuln(vulnIds, 6),
    },
  };
}

export function mapSearchPayloadToForm(p: any) {
  const s = p?.profile_snapshot ?? p;
  const vulnIds = Array.isArray(p?.vulnerability_type_ids) ? p.vulnerability_type_ids : [];
  const safeBirth = typeof s?.birthdate === "string" ? s.birthdate : "";
  const birthdayISO = safeBirth ? safeBirth.substring(0, 10) : "";

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
    barangayOfOrigin: s?.barangay_of_origin != null ? String(s.barangay_of_origin) : "",

    isFamilyHead: "Yes",
    familyHead: "",
    familyHeadId: null,
    relationshipToFamilyHead: "",

    searchEvacuationRoom: p?.ec_rooms_id != null ? String(p.ec_rooms_id) : "",

    vulnerabilities: {
      pwd: hasVuln(vulnIds, 4),
      pregnant: hasVuln(vulnIds, 5),
      lactatingMother: hasVuln(vulnIds, 6),
    },

    existingEvacueeResidentId: p?.evacuee_resident_id ?? null,
  };
}
