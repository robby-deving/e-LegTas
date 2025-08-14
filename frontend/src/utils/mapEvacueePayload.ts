// mapEvacueePayload.ts

export function mapEditPayloadToForm(p: any) {
  return {
    firstName: p.first_name || "",
    middleName: p.middle_name || "",
    lastName: p.last_name || "",
    suffix: p.suffix || "",
    sex: p.sex || "",
    maritalStatus: p.marital_status || "",
    birthday: p.birthdate ? p.birthdate.substring(0, 10) : "",
    educationalAttainment: p.educational_attainment || "",
    schoolOfOrigin: p.school_of_origin || "",
    occupation: p.occupation || "",
    purok: p.purok ? String(p.purok) : "",
    barangayOfOrigin: p.barangay_of_origin ? String(p.barangay_of_origin) : "",
    isFamilyHead: p.relationship_to_family_head === "Head" ? "Yes" : "No",
    relationshipToFamilyHead: p.relationship_to_family_head || "",
    familyHeadId:
      p.relationship_to_family_head === "Head"
        ? null
        : p.family_head_id ?? null,
    familyHead:
      p.relationship_to_family_head === "Head"
        ? p.family_head_full_name || ""
        : p.family_head_full_name || "",
    searchEvacuationRoom: p.ec_rooms_id ? String(p.ec_rooms_id) : "",
    evacuationRoomName: p.room_name || "",
    vulnerabilities: {
      pwd: (p.vulnerability_type_ids || []).includes(4),
      pregnant: (p.vulnerability_type_ids || []).includes(5),
      lactatingMother: (p.vulnerability_type_ids || []).includes(6),
    },
  };
}
export function mapSearchPayloadToForm(p: any) {
  const isHead = p.relationship_to_family_head === "Head";
  const fullName = `${p.first_name ?? ""} ${
    p.middle_name ? p.middle_name + " " : ""
  }${p.last_name ?? ""}`
    .replace(/\s+/g, " ")
    .trim();
  const familyHeadFullName = !isHead ? p.family_head_full_name ?? "" : "";
  return {
    firstName: p.first_name || "",
    middleName: p.middle_name || "",
    lastName: p.last_name || "",
    suffix: p.suffix || "",
    sex: p.sex || "",
    maritalStatus: p.marital_status || "",
    birthday: p.birthdate ? p.birthdate.substring(0, 10) : "",
    educationalAttainment: p.educational_attainment || "",
    schoolOfOrigin: p.school_of_origin || "",
    occupation: p.occupation || "",
    purok: p.purok != null ? String(p.purok) : "",
    barangayOfOrigin:
      p.barangay_of_origin != null ? String(p.barangay_of_origin) : "",
    isFamilyHead: isHead ? "Yes" : "No",
    familyHead: isHead ? fullName : familyHeadFullName,
    familyHeadId: isHead ? null : p.family_head_id ?? null,
    relationshipToFamilyHead: p.relationship_to_family_head || "",
    searchEvacuationRoom: p.ec_rooms_id != null ? String(p.ec_rooms_id) : "",
    vulnerabilities: {
      pwd:
        Array.isArray(p.vulnerability_type_ids) &&
        p.vulnerability_type_ids.includes(4),
      pregnant:
        Array.isArray(p.vulnerability_type_ids) &&
        p.vulnerability_type_ids.includes(5),
      lactatingMother:
        Array.isArray(p.vulnerability_type_ids) &&
        p.vulnerability_type_ids.includes(6),
    },
  };
}
