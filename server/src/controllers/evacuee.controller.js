// evacuee.controller.js

const supabase = require("../config/supabase");

class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * @desc Register a new evacuee with vulnerability data
 * @route POST /api/v1/evacuees
 * @access Private (Camp Manager only)
 */
exports.registerEvacuee = async (req, res, next) => {
  const {
    first_name,
    middle_name,
    last_name,
    suffix,
    birthdate,
    sex,
    barangay_of_origin,
    marital_status,
    educational_attainment,
    school_of_origin,
    occupation,
    purok,
    family_head_id,
    relationship_to_family_head,
    date_registered,
    is_infant,
    is_pwd,
    is_children,
    is_senior,
    is_pregnant,
    is_lactating,
    is_youth, 
    is_adult, 
    ec_rooms_id,
    disaster_evacuation_event_id,
  } = req.body;

  let resident_id = null;
  let evacuee_id = null;
  let registration_id = null;
  let family_head_inserted_id = null;

  try {
    console.log("Step 1: Insert resident...");
    console.log("Resident Payload:", {
      first_name,
      middle_name,
      last_name,
      suffix,
      birthdate,
      sex,
      barangay_of_origin,
    });

    // Step 1: Insert the resident
    // Normalize suffix: "" or whitespace => null
    const normalizedSuffix =
      typeof suffix === "string" && suffix.trim() !== "" ? suffix.trim() : null;

    const { data: residentData, error: residentError } = await supabase
      .from("residents")
      .insert([
        {
          first_name,
          middle_name,
          last_name,
          suffix: normalizedSuffix, 
          birthdate,
          sex,
          barangay_of_origin,
        },
      ])
      .select()
      .single();

    if (residentError) {
      console.error("Supabase residentError:", residentError);
      if (residentError.code === "23505") {
        throw new ApiError(
          `Failed to register resident. Duplicate key error on 'residents.id'. Likely sequence mismatch. Run: SELECT setval(pg_get_serial_sequence('residents','id'), (SELECT MAX(id) FROM residents)+1);`,
          500
        );
      }
      throw new ApiError(
        `Failed to register resident. Supabase error: ${
          residentError.message
        } | Details: ${JSON.stringify(residentError)}`,
        500
      );
    }
    resident_id = residentData.id;

    const birthdateObj = new Date(birthdate);
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    const isHead = relationship_to_family_head === "Head";

    // Step 2: Insert family head if needed
    if (isHead) {
      console.log("Step 2: Insert family head...");
      const { data: familyHeadData, error: familyHeadError } = await supabase
        .from("family_head")
        .insert([{ resident_id }])
        .select()
        .single();

      if (familyHeadError) {
        console.error("Supabase familyHeadError:", familyHeadError);
        if (familyHeadError.code === "23505") {
          throw new ApiError(
            `Failed to register family head. Duplicate key error on 'family_head.id'. Run: SELECT setval(pg_get_serial_sequence('family_head','id'), (SELECT MAX(id) FROM family_head)+1);`,
            500
          );
        }
        await supabase.from("residents").delete().eq("id", resident_id);
        throw new ApiError(
          `Failed to register family head. Supabase error: ${
            familyHeadError.message
          } | Details: ${JSON.stringify(familyHeadError)}`,
          500
        );
      }
      family_head_inserted_id = familyHeadData.id;
    } else {
      if (!family_head_id) {
        throw new ApiError(
          `Missing family_head_id. When the evacuee is not the head, a valid family_head_id must be provided.`,
          400
        );
      }
      family_head_inserted_id = family_head_id;
    }

    // Step 3: Insert evacuee_residents
    console.log("Step 3: Insert evacuee_residents...");
    const { data: evacueeData, error: evacueeError } = await supabase
      .from("evacuee_residents")
      .insert([
        {
          resident_id,
          marital_status,
          educational_attainment,
          school_of_origin,
          occupation,
          purok,
          family_head_id: family_head_inserted_id,
          relationship_to_family_head,
          date_registered: date_registered || new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (evacueeError) {
      console.error("Supabase evacueeError:", evacueeError);
      if (evacueeError.code === "23505") {
        throw new ApiError(
          `Failed to register evacuee. Duplicate key error on 'evacuee_residents.id'. Run: SELECT setval(pg_get_serial_sequence('evacuee_residents','id'), (SELECT MAX(id) FROM evacuee_residents)+1);`,
          500
        );
      }
      await supabase.from("residents").delete().eq("id", resident_id);
      throw new ApiError(
        `Failed to register evacuee. Supabase error: ${
          evacueeError.message
        } | Details: ${JSON.stringify(evacueeError)}`,
        500
      );
    }
    evacuee_id = evacueeData.id;

    // Step 4: Insert evacuation_registrations
    console.log("Step 4: Insert evacuation_registrations...");
    const { data: registrationData, error: registrationError } = await supabase
      .from("evacuation_registrations")
      .insert([
        {
          evacuee_resident_id: evacuee_id,
          disaster_evacuation_event_id,
          family_head_id: family_head_inserted_id,
          arrival_timestamp: new Date().toISOString(),
          decampment_timestamp: null,
          reported_age_at_arrival: age,
          ec_rooms_id,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (registrationError) {
      console.error("Supabase registrationError:", registrationError);
      if (registrationError.code === "23505") {
        throw new ApiError(
          `Failed to register evacuation. Duplicate key error on 'evacuation_registrations.id'. Run: SELECT setval(pg_get_serial_sequence('evacuation_registrations','id'), (SELECT MAX(id) FROM evacuation_registrations)+1);`,
          500
        );
      }
      await supabase.from("evacuee_residents").delete().eq("id", evacuee_id);
      await supabase.from("residents").delete().eq("id", resident_id);
      throw new ApiError(
        `Failed to register evacuation. Supabase error: ${
          registrationError.message
        } | Details: ${JSON.stringify(registrationError)}`,
        500
      );
    }
    registration_id = registrationData.id;

    // Step 5: Insert vulnerabilities
    const vulnerabilities = [];
    if (is_infant) vulnerabilities.push(1);
    if (is_pwd) vulnerabilities.push(4);
    if (is_children) vulnerabilities.push(2);
    if (is_senior) vulnerabilities.push(3);
    if (is_pregnant) vulnerabilities.push(5);
    if (is_lactating) vulnerabilities.push(6);
    if (is_youth) vulnerabilities.push(7);
    if (is_adult) vulnerabilities.push(8);

    if (vulnerabilities.length > 0) {
      console.log("Step 5: Insert vulnerabilities...");
      const vulnInserts = vulnerabilities.map((vuln_id) => ({
        evacuee_resident_id: evacuee_id,
        vulnerability_type_id: vuln_id,
      }));

      const { error: vulnError } = await supabase
        .from("resident_vulnerabilities")
        .insert(vulnInserts);

      if (vulnError) {
        console.error("Supabase vulnError:", vulnError);
        if (vulnError.code === "23505") {
          throw new ApiError(
            `Failed to associate vulnerabilities. Duplicate key error on 'resident_vulnerabilities.id'. Run: SELECT setval(pg_get_serial_sequence('resident_vulnerabilities','id'), (SELECT MAX(id) FROM resident_vulnerabilities)+1);`,
            500
          );
        }
        await supabase
          .from("evacuation_registrations")
          .delete()
          .eq("id", registration_id);
        await supabase.from("evacuee_residents").delete().eq("id", evacuee_id);
        await supabase.from("residents").delete().eq("id", resident_id);
        throw new ApiError(
          `Failed to associate vulnerabilities. Supabase error: ${
            vulnError.message
          } | Details: ${JSON.stringify(vulnError)}`,
          500
        );
      }
    }

    console.log("Registration complete.");
    return res.status(201).json({
      message: "Evacuee registered successfully.",
      data: {
        evacuee: { ...evacueeData, family_head_id: family_head_inserted_id },
        evacuation_registration: registrationData,
        vulnerability_type_ids: vulnerabilities,
      },
    });
  } catch (err) {
    console.error("RegisterEvacuee Error:", err);
    if (registration_id)
      await supabase
        .from("evacuation_registrations")
        .delete()
        .eq("id", registration_id);
    if (evacuee_id)
      await supabase.from("evacuee_residents").delete().eq("id", evacuee_id);
    if (resident_id)
      await supabase.from("residents").delete().eq("id", resident_id);

    return next(
      new ApiError(
        `Internal server error during evacuee registration. ${
          err.message || ""
        }`,
        500
      )
    );
  }
};

/**
 * @desc Get all barangay entries
 * @route GET /api/v1/barangays
 * @access Public
 */
exports.getAllBarangays = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("barangays").select("*");

    if (error) {
      console.error("Supabase Error (getAllBarangays):", error);
      return next(new ApiError("Failed to retrieve barangay entries.", 500));
    }

    if (!data || data.length === 0) {
      return res
        .status(200)
        .json({ message: "No barangay entries found.", data: [] });
    }

    res.status(200).json({
      message: "Successfully retrieved all barangay entries.",
      count: data.length,
      data: data, 
    });
  } catch (err) {
    console.error("Internal server error during getAllBarangays:", err);
    next(new ApiError("Internal server error during getAllBarangays.", 500));
  }
};

/**
 * @desc Update an evacuee's details (mirrors POST behavior for head logic & null suffix)
 * @route PUT /api/v1/evacuees/:id   // :id = evacuee_residents.id
 * @access Private (Camp Manager only)
 */
exports.updateEvacuee = async (req, res, next) => {
  const { id } = req.params; 
  const {
    first_name,
    middle_name,
    last_name,
    suffix,
    birthdate,
    sex,
    barangay_of_origin,
    marital_status,
    educational_attainment,
    school_of_origin,
    occupation,
    purok,
    family_head_id, 
    relationship_to_family_head, 
    date_registered,
    is_infant,
    is_pwd,
    is_children,
    is_senior,
    is_pregnant,
    is_lactating,
    is_youth,
    is_adult,
    ec_rooms_id, 
    disaster_evacuation_event_id, 
  } = req.body;

  if (!disaster_evacuation_event_id) {
    return next(
      new ApiError("disaster_evacuation_event_id is required for updates.", 400)
    );
  }

  try {
    // STEP 1: fetch current row (ADD relationship_to_family_head here)
    const { data: evacueeRow, error: evacueeErr } = await supabase
      .from("evacuee_residents")
      .select("id, resident_id, family_head_id, relationship_to_family_head") 
      .eq("id", id)
      .single();

    if (evacueeErr || !evacueeRow) {
      return next(new ApiError("Evacuee not found.", 404));
    }

    const resident_id = evacueeRow.resident_id;
    // PRE-CHECK: block demoting a head who still has >1 members in THIS event
    const wasHead = evacueeRow.relationship_to_family_head === "Head";
    const isDemoting = wasHead && relationship_to_family_head !== "Head";

    if (isDemoting) {
      const { count: familyCount, error: famCountErr } = await supabase
        .from("evacuation_registrations")
        .select("id", { count: "exact", head: true })
        .eq("family_head_id", evacueeRow.family_head_id)
        .eq("disaster_evacuation_event_id", disaster_evacuation_event_id);

      if (famCountErr) {
        console.error("famCountErr:", famCountErr);
        throw new ApiError("Failed to count family members.", 500);
      }

      if ((familyCount ?? 1) > 1) {
        return next(
          new ApiError(
            "Cannot demote the family head while other family members are still assigned in this event. " +
              "Please transfer the head role to another member first.",
            409
          )
        );
      }
    }

    // STEP 2: resolve desired family_head_id (your existing logic)
    let resolved_family_head_id = null;
    if (relationship_to_family_head === "Head") {
    } else {
      if (!family_head_id) {
        return next(
          new ApiError(
            'family_head_id is required when relationship_to_family_head is not "Head".',
            400
          )
        );
      }
      resolved_family_head_id = family_head_id;
    }
    // 3) Normalize suffix ("" → null) to avoid enum errors
    const normalizedSuffix =
      typeof suffix === "string" && suffix.trim() !== "" ? suffix.trim() : null;

    // 4) Update residents
    const { error: residentError } = await supabase
      .from("residents")
      .update({
        first_name,
        middle_name,
        last_name,
        suffix: normalizedSuffix,
        birthdate,
        sex,
        barangay_of_origin,
        updated_at: new Date().toISOString(), 
      })
      .eq("id", resident_id);

    if (residentError) {
      console.error("residentError:", residentError);
      throw new ApiError("Failed to update resident details.", 500);
    }

    // 5) Update evacuee_residents (NO room/event fields here)
    const { error: evacueeUpdateError } = await supabase
      .from("evacuee_residents")
      .update({
        marital_status,
        educational_attainment,
        school_of_origin,
        occupation,
        purok,
        relationship_to_family_head,
        date_registered: date_registered || new Date().toISOString(),
        family_head_id: resolved_family_head_id, 
        updated_at: new Date().toISOString(), 
      })
      .eq("id", id);

    if (evacueeUpdateError) {
      console.error("evacueeUpdateError:", evacueeUpdateError);
      throw new ApiError("Failed to update evacuee information.", 500);
    }

    // 6) Upsert registration for THIS event (room + family head lives here too)
    const { data: regRow, error: regFindErr } = await supabase
      .from("evacuation_registrations")
      .select("id")
      .eq("evacuee_resident_id", id)
      .eq("disaster_evacuation_event_id", disaster_evacuation_event_id)
      .maybeSingle();

    if (regFindErr) {
      console.error("regFindErr:", regFindErr);
      throw new ApiError("Failed to fetch evacuation registration.", 500);
    }

    if (regRow) {
      const { error: regUpdateErr } = await supabase
        .from("evacuation_registrations")
        .update({
          ec_rooms_id: ec_rooms_id ?? null,
          family_head_id: resolved_family_head_id, 
          updated_at: new Date().toISOString(), 
        })
        .eq("id", regRow.id);

      if (regUpdateErr) {
        console.error("regUpdateErr:", regUpdateErr);
        throw new ApiError("Failed to update evacuation registration.", 500);
      }
    } else {
      // insert (business decision)
      const reported_age = birthdate
        ? Math.max(
            0,
            new Date().getFullYear() - new Date(birthdate).getFullYear()
          )
        : null;

      const { error: regInsertErr } = await supabase
        .from("evacuation_registrations")
        .insert([
          {
            evacuee_resident_id: id,
            disaster_evacuation_event_id,
            family_head_id: resolved_family_head_id,
            ec_rooms_id: ec_rooms_id ?? null,
            arrival_timestamp: new Date().toISOString(),
            decampment_timestamp: null,
            reported_age_at_arrival: reported_age,
            created_at: new Date().toISOString(),
          },
        ]);

      if (regInsertErr) {
        console.error("regInsertErr:", regInsertErr);
        throw new ApiError(
          "Failed to create evacuation registration for this event.",
          500
        );
      }
    }

    // 7) Replace vulnerabilities (delete + insert)
    const { error: vulnDeleteError } = await supabase
      .from("resident_vulnerabilities")
      .delete()
      .eq("evacuee_resident_id", id);

    if (vulnDeleteError) {
      console.error("vulnDeleteError:", vulnDeleteError);
      throw new ApiError("Failed to clear previous vulnerabilities.", 500);
    }

    const vulnerabilities = [];
    if (is_infant) vulnerabilities.push(1);
    if (is_children) vulnerabilities.push(2);
    if (is_senior) vulnerabilities.push(3);
    if (is_pwd) vulnerabilities.push(4);
    if (is_pregnant) vulnerabilities.push(5);
    if (is_lactating) vulnerabilities.push(6);
    if (is_youth) vulnerabilities.push(7);
    if (is_adult) vulnerabilities.push(8);

    if (vulnerabilities.length > 0) {
      const inserts = vulnerabilities.map((vuln_id) => ({
        evacuee_resident_id: id,
        vulnerability_type_id: vuln_id,
      }));

      const { error: vulnInsertError } = await supabase
        .from("resident_vulnerabilities")
        .insert(inserts);

      if (vulnInsertError) {
        console.error("vulnInsertError:", vulnInsertError);
        throw new ApiError("Failed to update vulnerabilities.", 500);
      }
    }

    return res.status(200).json({
      message: "Evacuee updated successfully.",
      data: { evacuee_id: id, family_head_id: resolved_family_head_id },
    });
  } catch (err) {
    console.error("UpdateEvacuee Error:", err);
    return next(
      new ApiError("Internal server error during evacuee update.", 500)
    );
  }
};

// --- Helper: build full name safely (first [middle] last [suffix]) ---
function buildFullName({ first_name, middle_name, last_name, suffix }) {
  const parts = [
    first_name?.trim(),
    middle_name?.trim(),
    last_name?.trim(),
    suffix?.trim(),
  ].filter(Boolean);
  return parts.join(" ");
}

/**
 * @desc Get detailed evacuee data by disaster evacuation event ID, includes summary, room details, and full list of evacuees
 * @route GET /api/v1/evacuees/:disasterEvacuationEventId/evacuees-information
 * @access Private (Camp Manager only)
 */
exports.getEvacueesInformationbyDisasterEvacuationEventId = async (
  req,
  res,
  next
) => {
  const { disasterEvacuationEventId } = req.params;

  try {
    // Step 1: Fetch registrations + resident details (include middle_name & suffix)
    const { data: registrations, error: regError } = await supabase
      .from("evacuation_registrations")
      .select(
        `
        id,
        arrival_timestamp,
        evacuee_resident_id,
        disaster_evacuation_event_id,
        family_head_id,
        ec_rooms_id,
        decampment_timestamp,
        residents:evacuee_resident_id (
          id,
          resident_id,
          relationship_to_family_head,
          residents (
            id,
            first_name,
            middle_name,
            last_name,
            suffix,
            birthdate,
            sex,
            barangay_of_origin,
            barangays ( name )
          )
        ),
        ec_rooms:ec_rooms_id (
          id,
          room_name,
          evacuation_centers ( name )
        )
      `
      )
      .eq("disaster_evacuation_event_id", disasterEvacuationEventId);

    if (regError) {
      console.error("Error fetching registrations:", regError);
      return next(new ApiError("Failed to fetch registrations", 500));
    }
    if (!registrations || registrations.length === 0) {
      return next(new ApiError("No registrations found for this event.", 404));
    }

    // Group by family_head_id
    const familyGroups = new Map();
    for (const record of registrations) {
      const fhId = record.family_head_id;
      if (!familyGroups.has(fhId)) familyGroups.set(fhId, []);
      familyGroups.get(fhId).push(record);
    }

    const response = [];

    for (const [familyHeadId, members] of familyGroups.entries()) {
      const evacueeIds = members.map((m) => m.evacuee_resident_id);

      // Vulnerabilities for all family members
      const { data: vulnerabilities } = await supabase
        .from("resident_vulnerabilities")
        .select("evacuee_resident_id, vulnerability_types(name)")
        .in("evacuee_resident_id", evacueeIds);

      const vulnerabilityMap = new Map();
      for (const v of vulnerabilities || []) {
        const arr = vulnerabilityMap.get(v.evacuee_resident_id) || [];
        if (v.vulnerability_types?.name) arr.push(v.vulnerability_types.name);
        vulnerabilityMap.set(v.evacuee_resident_id, arr);
      }

      // Build summary + member list
      const summary = {
        total_no_of_male: 0,
        total_no_of_female: 0,
        total_no_of_individuals: members.length,
        total_no_of_family: 1,
        total_no_of_infant: 0,
        total_no_of_children: 0,
        total_no_of_youth: 0,
        total_no_of_adult: 0,
        total_no_of_seniors: 0,
        total_no_of_pwd: 0,
        total_no_of_pregnant: 0,
        total_no_of_lactating_women: 0,
      };

      const familyMembers = members.map((member) => {
        const evacuee = member.residents;
        const resident = evacuee.residents;

        // Age bucketing (kept as in your code)
        const birth = new Date(resident.birthdate);
        const today = new Date();
        let ageStr = "";
        const years = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        const dateDiff = today.getDate() - birth.getDate();
        let totalMonths = years * 12 + monthDiff;
        if (dateDiff < 0) totalMonths--;
        totalMonths = Math.max(0, totalMonths);

        if (totalMonths <= 12) {
          ageStr = `${totalMonths} month${totalMonths === 1 ? "" : "s"}`;
          summary.total_no_of_infant++;
        } else {
          const hadBirthday =
            today.getMonth() > birth.getMonth() ||
            (today.getMonth() === birth.getMonth() &&
              today.getDate() >= birth.getDate());
          const adjustedYears = hadBirthday ? years : years - 1;
          ageStr = `${adjustedYears}`;

          if (adjustedYears <= 12) summary.total_no_of_children++;
          else if (adjustedYears <= 17) summary.total_no_of_youth++;
          else if (adjustedYears <= 59) summary.total_no_of_adult++;
          else summary.total_no_of_seniors++;
        }

        if (resident.sex === "Male") summary.total_no_of_male++;
        else if (resident.sex === "Female") summary.total_no_of_female++;

        const vtypes = vulnerabilityMap.get(member.evacuee_resident_id) || [];
        if (vtypes.includes("Person with Disability"))
          summary.total_no_of_pwd++;
        if (vtypes.includes("Pregnant Woman")) summary.total_no_of_pregnant++;
        if (vtypes.includes("Lactating Woman"))
          summary.total_no_of_lactating_women++;

        // 🔥 Full name for each family member
        const memberFullName = buildFullName({
          first_name: resident.first_name,
          middle_name: resident.middle_name,
          last_name: resident.last_name,
          suffix: resident.suffix,
        });

        return {
          evacuee_id: member.evacuee_resident_id,
          resident_id: resident.id,
          full_name: memberFullName, 
          age: ageStr,
          barangay_of_origin: resident.barangays?.name || "Unknown",
          sex: resident.sex,
          vulnerability_types: vtypes,
          room_name: member.ec_rooms?.room_name || "Unknown",
          arrival_timestamp: member.arrival_timestamp,
          relationship_to_family_head: evacuee.relationship_to_family_head,
        };
      });

      // Fetch the actual family head resident (include middle/suffix)
      const { data: headRow, error: headError } = await supabase
        .from("family_head")
        .select(
          `
          id,
          resident_id,
          residents (
            first_name,
            middle_name,
            last_name,
            suffix,
            barangays ( name )
          )
        `
        )
        .eq("id", familyHeadId)
        .single();

      let family_head_full_name = "Unknown";
      let family_head_barangay = "Unknown";

      if (!headError && headRow?.residents) {
        const fh = headRow.residents;
        family_head_full_name = buildFullName({
          first_name: fh.first_name,
          middle_name: fh.middle_name,
          last_name: fh.last_name,
          suffix: fh.suffix,
        });
        family_head_barangay = fh.barangays?.name || "Unknown";
      } else {
        console.error("Failed to fetch head of family:", headError);
      }

      response.push({
        id: familyHeadId,
        disaster_evacuation_event_id: disasterEvacuationEventId,
        family_head_full_name, 
        barangay: family_head_barangay || "Unknown",
        total_individuals: members.length,
        room_name: members[0]?.ec_rooms?.room_name || "Unknown",
        decampment_timestamp: members[0]?.decampment_timestamp || null,

        view_family: {
          evacuation_center_name:
            members[0]?.ec_rooms?.evacuation_centers?.name || "Unknown",
          head_of_family: family_head_full_name, 
          decampment: members[0]?.decampment_timestamp || null,
          summary_per_family: summary,
        },

        list_of_family_members: {
          family_members: familyMembers, 
        },
      });
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("Unexpected error:", error);
    return next(new ApiError("Internal server error", 500));
  }
};

/**
 * @desc Get evacuee demographic statistics by disaster evacuation event ID
 * @route GET /api/v1/evacuees/:disasterEvacuationEventId/evacuee-statistics
 * @access Public
 */
exports.getEvacueeStatisticsByDisasterEvacuationEventId = async (
  req,
  res,
  next
) => {
  const { disasterEvacuationEventId } = req.params;

  try {
    const { data, error } = await supabase
      .from("evacuation_summaries")
      .select(
        `
        total_no_of_male,
        total_no_of_female,
        total_no_of_infant,
        total_no_of_children,
        total_no_of_youth,
        total_no_of_adult,
        total_no_of_seniors,
        total_no_of_pwd,
        total_no_of_pregnant,
        total_no_of_lactating_women
      `
      )
      .eq("disaster_evacuation_event_id", disasterEvacuationEventId)
      .single();

    if (error || !data) {
      return next(
        new ApiError("Evacuee summary not found for this event.", 404)
      );
    }

    return res.status(200).json({
      title: "Evacuees Statistics",
      summary: data,
    });
  } catch (err) {
    console.error("Error fetching evacuee statistics:", err);
    return next(new ApiError("Internal server error.", 500));
  }
};

/**
 * @desc Get disaster and evacuation center information for a given disaster evacuation event
 * @route GET /api/v1/evacuees/:disasterEvacuationEventId/details
 * @access Public
 */
exports.getDisasterEvacuationDetails = async (req, res, next) => {
  const { disasterEvacuationEventId } = req.params;
  console.log(
    `[INFO] Fetching details for disasterEvacuationEventId: ${disasterEvacuationEventId}`
  );

  try {
    // 1. Fetch disaster event data
    const { data: eventData, error: eventError } = await supabase
      .from("disaster_evacuation_event")
      .select(
        `
        id,
        evacuation_start_date,
        evacuation_end_date,
        disasters (
          id,
          disaster_name,
          disaster_types (
            id,
            name
          )
        ),
        evacuation_centers (
          id,
          name,
          barangay_id,
          barangays (
            name
          )
        )
      `
      )
      .eq("id", disasterEvacuationEventId)
      .single();

    if (eventError) {
      console.error(
        `[ERROR] Supabase error fetching disaster event: ${eventError.message}`
      );
      return next(
        new ApiError("Failed to fetch disaster evacuation event.", 500)
      );
    }

    if (!eventData) {
      console.warn(
        `[WARN] No disaster event found for ID: ${disasterEvacuationEventId}`
      );
      return next(new ApiError("Disaster evacuation event not found.", 404));
    }

    const {
      disasters,
      evacuation_centers,
      evacuation_start_date,
      evacuation_end_date,
    } = eventData;

    if (!disasters || !disasters.disaster_types) {
      console.error(
        `[ERROR] Missing disaster or disaster type in disaster data.`
      );
      return next(
        new ApiError("Disaster or disaster type data is incomplete.", 500)
      );
    }

    if (!evacuation_centers || !evacuation_centers.barangays) {
      console.error(`[ERROR] Missing evacuation center or barangay data.`);
      return next(
        new ApiError("Evacuation center or barangay data is incomplete.", 500)
      );
    }

    // 2. Fetch evacuation summary
    const { data: summary, error: summaryError } = await supabase
      .from("evacuation_summaries")
      .select(
        `
        total_no_of_family,
        total_no_of_individuals
      `
      )
      .eq("disaster_evacuation_event_id", disasterEvacuationEventId)
      .single();

    if (summaryError) {
      console.error(
        `[ERROR] Supabase error fetching evacuation summary: ${summaryError.message}`
      );
      return next(new ApiError("Failed to fetch evacuation summary.", 500));
    }

    if (!summary) {
      console.warn(
        `[WARN] No summary found for disasterEvacuationEventId: ${disasterEvacuationEventId}`
      );
      return next(new ApiError("Evacuation summary not found.", 404));
    }

    // 3. Fetch evacuation center capacity directly from evacuation_centers
    const { data: centerCapacity, error: capacityError } = await supabase
      .from("evacuation_centers")
      .select("total_capacity")
      .eq("id", evacuation_centers.id)
      .single();

    if (capacityError) {
      console.error(
        `[ERROR] Supabase error fetching center capacity: ${capacityError.message}`
      );
      return next(
        new ApiError("Failed to fetch evacuation center capacity.", 500)
      );
    }

    const totalCapacity = centerCapacity?.total_capacity || 0;
    console.log(`[INFO] Fetched EC total capacity: ${totalCapacity}`);

    // 4. Final response structure
    return res.status(200).json({
      disaster: {
        disaster_types_id: disasters.disaster_types.id,
        disaster_type_name: disasters.disaster_types.name,
        disasters_id: disasters.id,
        disaster_name: disasters.disaster_name,
        disaster_start_date: evacuation_start_date,
        disaster_end_date: evacuation_end_date,
      },
      evacuation_center: {
        evacuation_center_id: evacuation_centers.id,
        evacuation_center_name: evacuation_centers.name,
        evacuation_center_barangay_id: evacuation_centers.barangay_id,
        evacuation_center_barangay_name: evacuation_centers.barangays.name,
      },
      evacuation_summary: {
        total_no_of_family: summary.total_no_of_family,
        total_no_of_individuals: summary.total_no_of_individuals,
        evacuation_center_capacity: totalCapacity,
      },
    });
  } catch (err) {
    console.error("[FATAL] Uncaught server error:", err);
    return next(new ApiError("Internal server error", 500));
  }
};

/**
 * @desc Get all rooms for the evacuation center tied to a disaster evacuation event
 * @route GET /api/v1/evacuees/:disasterEvacuationEventId/rooms
 * @access Public
 */
exports.getAllRoomsForDisasterEvacuationEventId = async (req, res, next) => {
  const { disasterEvacuationEventId } = req.params;

  try {
    // 1) Resolve the evacuation_center_id from disaster_evacuation_event
    const { data: eventRow, error: eventErr } = await supabase
      .from("disaster_evacuation_event")
      .select("evacuation_center_id")
      .eq("id", disasterEvacuationEventId)
      .single();

    if (eventErr || !eventRow) {
      return next(new ApiError("Disaster evacuation event not found.", 404));
    }

    // 2) Fetch all rooms for that center (names only for dropdown)
    const { data: rooms, error: roomsErr } = await supabase
      .from("evacuation_center_rooms")
      .select("id, room_name")
      .eq("evacuation_center_id", eventRow.evacuation_center_id)
      .order("room_name", { ascending: true });

    if (roomsErr) {
      return next(
        new ApiError("Failed to fetch evacuation center rooms.", 500)
      );
    }

    return res.status(200).json({
      message: "Rooms fetched successfully.",
      count: rooms?.length || 0,
      data: rooms || [],
    });
  } catch (err) {
    console.error("getAllRoomsForDisasterEvacuationEventId error:", err);
    return next(new ApiError("Internal server error.", 500));
  }
};

/**
 * @desc Get full evacuee details for editing (including resident info, family head name, vulnerabilities, and event-specific registration)
 * @route GET /api/v1/evacuees/:disasterEvacuationEventId/:evacueeResidentId/edit
 * @access Private (Camp Manager only)
 */
exports.getEvacueeDetailsForEdit = async (req, res, next) => {
  const { disasterEvacuationEventId, evacueeResidentId } = req.params;

  try {
    // 1) evacuee core + resident
    // 1) evacuee core + resident + family head's resident name
    const { data: evacuee, error: evacueeErr } = await supabase
      .from("evacuee_residents")
      .select(
        `
    id,
    resident_id,
    marital_status,
    educational_attainment,
    school_of_origin,
    occupation,
    purok,
    relationship_to_family_head,
    family_head_id,
    date_registered,
    residents:resident_id (
      first_name,
      middle_name,
      last_name,
      suffix,
      birthdate,
      sex,
      barangay_of_origin
    ),
    family_head:family_head_id (
      residents:resident_id (
        first_name,
        middle_name,
        last_name
      )
    )
  `
      )
      .eq("id", evacueeResidentId)
      .single();

    if (evacueeErr || !evacuee) {
      return next(new ApiError("Evacuee not found.", 404));
    }

    // 2) registration row for *this* event (room assignment lives here)
    const { data: registration, error: regErr } = await supabase
      .from("evacuation_registrations")
      .select(
        "id, ec_rooms_id, arrival_timestamp, decampment_timestamp, reported_age_at_arrival"
      )
      .eq("evacuee_resident_id", evacueeResidentId)
      .eq("disaster_evacuation_event_id", disasterEvacuationEventId)
      .maybeSingle();

    if (regErr) {
      return next(
        new ApiError("Failed to load registration for this event.", 500)
      );
    }

    // 3) vulnerabilities (names for UI)
    const { data: vulns, error: vulnsErr } = await supabase
      .from("resident_vulnerabilities")
      .select("vulnerability_types(name, id)")
      .eq("evacuee_resident_id", evacueeResidentId);

    if (vulnsErr) {
      return next(new ApiError("Failed to load vulnerabilities.", 500));
    }

    const vulnerabilityNames = (vulns || [])
      .map((v) => v.vulnerability_types?.name)
      .filter(Boolean);

    const vulnerabilityIds = (vulns || [])
      .map((v) => v.vulnerability_types?.id)
      .filter(Boolean);

    return res.status(200).json({
      id: evacuee.id,
      // Residents
      first_name: evacuee.residents.first_name,
      middle_name: evacuee.residents.middle_name,
      last_name: evacuee.residents.last_name,
      suffix: evacuee.residents.suffix,
      birthdate: evacuee.residents.birthdate,
      sex: evacuee.residents.sex,
      barangay_of_origin: evacuee.residents.barangay_of_origin,

      // Evacuee residents
      marital_status: evacuee.marital_status,
      educational_attainment: evacuee.educational_attainment,
      school_of_origin: evacuee.school_of_origin,
      occupation: evacuee.occupation,
      purok: evacuee.purok,
      relationship_to_family_head: evacuee.relationship_to_family_head,
      family_head_id: evacuee.family_head_id,
      family_head_full_name: evacuee.family_head?.residents
        ? `${evacuee.family_head.residents.first_name} ${
            evacuee.family_head.residents.middle_name || ""
          } ${evacuee.family_head.residents.last_name}`
            .replace(/\s+/g, " ")
            .trim()
        : null,
      date_registered: evacuee.date_registered,

      // Registration (event-bound)
      ec_rooms_id: registration?.ec_rooms_id ?? null,
      arrival_timestamp: registration?.arrival_timestamp ?? null,
      decampment_timestamp: registration?.decampment_timestamp ?? null,
      reported_age_at_arrival: registration?.reported_age_at_arrival ?? null,

      // Vulnerabilities
      vulnerability_types: vulnerabilityNames,
      vulnerability_type_ids: vulnerabilityIds,
    });
  } catch (err) {
    console.error("getEvacueeDetailsForEdit error:", err);
    return next(new ApiError("Internal server error.", 500));
  }
};

/**
 * @desc Transfer the family head to another member (GLOBAL update)
 * @route POST /api/v1/evacuees/:disasterEvacuationEventId/transfer-head
 * @access Private (Camp Manager only)
 */
exports.transferHead = async (req, res, next) => {
  const { disasterEvacuationEventId } = req.params;
  const {
    from_family_head_id,
    to_evacuee_resident_id,
    old_head_new_relationship = "Spouse",
  } = req.body || {};

  const eventIdNum = Number(disasterEvacuationEventId); 
  const fromFH = Number(from_family_head_id);
  const toEvac = Number(to_evacuee_resident_id);

  if (
    !eventIdNum ||
    !fromFH ||
    !toEvac ||
    typeof old_head_new_relationship !== "string"
  ) {
    return next(new ApiError("Missing or invalid fields for transfer.", 400));
  }

  try {
    // ── A) Validate that the chosen member belongs to this family for this event
    const { count: membershipCount, error: memberCheckErr } = await supabase
      .from("evacuation_registrations")
      .select("id", { count: "exact", head: true })
      .eq("evacuee_resident_id", toEvac)
      .eq("family_head_id", fromFH)
      .eq("disaster_evacuation_event_id", eventIdNum);

    if (memberCheckErr) {
      console.error("memberCheckErr:", memberCheckErr);
      throw new ApiError("Failed to validate family membership.", 500);
    }
    if ((membershipCount ?? 0) === 0) {
      return next(
        new ApiError(
          "Target member is not part of this family for the specified event.",
          400
        )
      );
    }

    // ── B) Get the person we’re promoting (need their resident_id)
    const { data: promoteRow, error: promoteErr } = await supabase
      .from("evacuee_residents")
      .select("id, resident_id, relationship_to_family_head, family_head_id")
      .eq("id", toEvac)
      .single();

    if (promoteErr || !promoteRow) {
      return next(new ApiError("Member to promote not found.", 404));
    }

    // ── C) Find old head’s resident_id via the family_head table
    const { data: oldFHRow, error: oldFHErr } = await supabase
      .from("family_head")
      .select("id, resident_id")
      .eq("id", fromFH)
      .single();

    if (oldFHErr || !oldFHRow) {
      console.error("oldFHErr:", oldFHErr);
      throw new ApiError("Old family head record not found.", 404);
    }

    // ── D) Ensure the promoted person has a family_head row (or create)
    let new_family_head_id = null;
    const { data: existingHead, error: headFindErr } = await supabase
      .from("family_head")
      .select("id")
      .eq("resident_id", promoteRow.resident_id)
      .maybeSingle();

    if (headFindErr) {
      console.error("headFindErr:", headFindErr);
      throw new ApiError("Failed to resolve family head record.", 500);
    }
    if (existingHead) {
      new_family_head_id = existingHead.id;
    } else {
      const { data: insertedHead, error: headInsertErr } = await supabase
        .from("family_head")
        .insert([{ resident_id: promoteRow.resident_id }])
        .select("id")
        .single();
      if (headInsertErr) {
        console.error("headInsertErr:", headInsertErr);
        throw new ApiError("Failed to create new family head record.", 500);
      }
      new_family_head_id = insertedHead.id;
    }

    const nowIso = new Date().toISOString();

    // ── E) Promote the selected member to Head
    const { error: promoteRelErr } = await supabase
      .from("evacuee_residents")
      .update({
        relationship_to_family_head: "Head",
        family_head_id: new_family_head_id,
        updated_at: nowIso,
      })
      .eq("id", toEvac);

    if (promoteRelErr) {
      console.error("promoteRelErr:", promoteRelErr);
      throw new ApiError("Failed to set promoted member as head.", 500);
    }

    // ── F) Demote the OLD head by resident_id (handles cases where family_head_id was NULL)
    const { error: oldHeadDemoteErr } = await supabase
      .from("evacuee_residents")
      .update({
        relationship_to_family_head: old_head_new_relationship,
        family_head_id: new_family_head_id, // now points to the new head
        updated_at: nowIso,
      })
      .eq("resident_id", oldFHRow.resident_id) 
      .eq("relationship_to_family_head", "Head"); 

    if (oldHeadDemoteErr) {
      console.error("oldHeadDemoteErr:", oldHeadDemoteErr);
      throw new ApiError("Failed to update old head relationship.", 500);
    }

    // ── G) Repoint ALL members that referenced the old family_head_id to the new one (GLOBAL)
    const { error: allMembersRepointErr } = await supabase
      .from("evacuee_residents")
      .update({
        family_head_id: new_family_head_id,
        updated_at: nowIso,
      })
      .eq("family_head_id", fromFH);

    if (allMembersRepointErr) {
      console.error("allMembersRepointErr:", allMembersRepointErr);
      throw new ApiError("Failed to reassign family members to new head.", 500);
    }

    // ── H) Update registrations to point at new head (GLOBAL across events)
    const { error: regRepointErr } = await supabase
      .from("evacuation_registrations")
      .update({
        family_head_id: new_family_head_id,
        updated_at: nowIso,
      })
      .eq("family_head_id", fromFH);
    // If you prefer event-scoped only, add:
    // .eq('disaster_evacuation_event_id', eventIdNum)

    if (regRepointErr) {
      console.error("regRepointErr:", regRepointErr);
      throw new ApiError("Failed to update registrations to new head.", 500);
    }

    return res.status(200).json({
      message: "Family head transferred successfully.",
      data: { new_family_head_id },
    });
  } catch (err) {
    console.error("transferHead error:", err);
    return next(
      err instanceof ApiError
        ? err
        : new ApiError("Internal error during head transfer.", 500)
    );
  }
};
