// evacuee.controller.js

const { supabase } = require('../config/supabase');

class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 *  @desc Register a new evacuee OR reuse an existing evacuee_residents record
 *       (event-scoped snapshot/flags written to evacuation_registrations)
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
    is_children,
    is_youth,
    is_adult,
    is_senior,
    is_pwd,
    is_pregnant,
    is_lactating,

    ec_rooms_id,
    disaster_evacuation_event_id,

    existing_evacuee_resident_id,
  } = req.body;

  let resident_id = null;
  let evacuee_id = null;
  let registration_id = null;
  let family_head_inserted_id = null;

  const computeAge = (isoBirthdate) => {
    if (!isoBirthdate) return 0;
    const today = new Date();
    const birth = new Date(isoBirthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return Math.max(0, age);
  };

  const buildVulnIdsFromFlags = () => {
    const ids = [];
    if (is_infant) ids.push(1);
    if (is_children) ids.push(2);
    if (is_senior) ids.push(3);
    if (is_pwd) ids.push(4);
    if (is_pregnant) ids.push(5);
    if (is_lactating) ids.push(6);
    if (is_youth) ids.push(7);
    if (is_adult) ids.push(8);
    return ids;
  };

  const buildSnapshot = (src = {}, relForThisEvent = null) => ({
    first_name: src.first_name ?? null,
    middle_name: src.middle_name ?? null,
    last_name: src.last_name ?? null,
    suffix:
      typeof src.suffix === "string" && src.suffix.trim() !== ""
        ? src.suffix.trim()
        : (src.suffix ?? null),
    sex: src.sex ?? null,
    marital_status: src.marital_status ?? null,
    birthdate: src.birthdate ?? null,
    barangay_of_origin: src.barangay_of_origin ?? null,
    purok: src.purok ?? null,
    educational_attainment: src.educational_attainment ?? null,
    occupation: src.occupation ?? null,
    school_of_origin: src.school_of_origin ?? null,
    relationship_to_family_head: relForThisEvent, 
  });

  const normalizedSuffix =
    typeof suffix === "string" && suffix.trim() !== "" ? suffix.trim() : null;

  try {
    // REUSE BRANCH: existing_evacuee_resident_id
    if (existing_evacuee_resident_id) {
      const { data: evacRow, error: evacRowErr } = await supabase
        .from("evacuee_residents")
        .select(`
          id,
          family_head_id,
          resident_id,
          relationship_to_family_head,
          marital_status,
          educational_attainment,
          school_of_origin,
          occupation,
          purok,
          residents (
            id,
            first_name,
            middle_name,
            last_name,
            suffix,
            birthdate,
            sex,
            barangay_of_origin
          )
        `)
        .eq("id", existing_evacuee_resident_id)
        .single();

      if (evacRowErr || !evacRow) {
        return next(new ApiError("Existing evacuee not found.", 404));
      }

      evacuee_id = evacRow.id;
      resident_id = evacRow.resident_id;

      // 1) Fetch the target event (we reference EC for messaging and disasters if needed)
      const { data: targetEvent, error: targetEventErr } = await supabase
        .from("disaster_evacuation_event")
        .select(`id, evacuation_centers ( id )`)
        .eq("id", disaster_evacuation_event_id)
        .single();

      if (targetEventErr || !targetEvent) {
        return next(new ApiError("Target disaster evacuation event not found.", 404));
      }

      // 2) Fetch the target room to get EC id
      const { data: targetRoom, error: roomErr } = await supabase
        .from("evacuation_center_rooms")
        .select(`id, evacuation_center_id`)
        .eq("id", ec_rooms_id)
        .single();

      if (roomErr || !targetRoom) {
        return next(new ApiError("Target EC room not found.", 404));
      }

      // 3) Check ANY ACTIVE registrations for this evacuee (decampment IS NULL)
      const { data: activeRegs, error: activeRegsErr } = await supabase
        .from("evacuation_registrations")
        .select(`
          id,
          evacuee_resident_id,
          disaster_evacuation_event_id,
          decampment_timestamp,
          disaster_evacuation_event:disaster_evacuation_event_id (
            id,
            evacuation_centers ( id, name )
          )
        `)
        .eq("evacuee_resident_id", existing_evacuee_resident_id)
        .is("decampment_timestamp", null);

      if (activeRegsErr) {
        return next(new ApiError("Failed to verify active registration state.", 500));
      }

      if ((activeRegs || []).length > 0) {
        // Already active in THIS event
        const alreadyInTarget = activeRegs.find(
          (r) => Number(r.disaster_evacuation_event_id) === Number(disaster_evacuation_event_id)
        );
        if (alreadyInTarget) {
          const ecName =
            alreadyInTarget?.disaster_evacuation_event?.evacuation_centers?.name ||
            "this evacuation center";
          return next(
            new ApiError(
              `This evacuee is already actively registered in this event (${ecName}). Use Edit to update the existing record.`,
              409
            )
          );
        }

        // Active somewhere else -> block
        const first = activeRegs[0];
        const ecName =
          first?.disaster_evacuation_event?.evacuation_centers?.name ||
          "another evacuation center";
        return next(
          new ApiError(
            `This evacuee is still actively registered in another event (${ecName}). Please decamp them first before registering here.`,
            409
          )
        );
      }

      // 4) Resolve NOT-NULL family_head_id to persist on registration (event intent)
      const desiredRel =
        typeof relationship_to_family_head === "string" &&
        relationship_to_family_head.trim() !== ""
          ? relationship_to_family_head.trim()
          : (evacRow.relationship_to_family_head || "Head"); // default to Head when empty

      if (desiredRel === "Head") {
        // If evacuee already has a family_head_id, reuse; otherwise create one for this resident
        if (evacRow.family_head_id) {
          family_head_inserted_id = evacRow.family_head_id;
        } else {
          // Check if a head record exists for this resident_id; reuse or create
          const { data: existingHead, error: existingHeadErr } = await supabase
            .from("family_head")
            .select("id")
            .eq("resident_id", resident_id)
            .maybeSingle();
          if (existingHeadErr) {
            return next(new ApiError("Failed to look up head record.", 500));
          }
          if (existingHead?.id) {
            family_head_inserted_id = existingHead.id;
          } else {
            const { data: newHead, error: newHeadErr } = await supabase
              .from("family_head")
              .insert([{ resident_id }])
              .select()
              .single();
            if (newHeadErr) {
              if (newHeadErr.code === "23505") {
                return next(
                  new ApiError(
                    `Failed to create family head. Duplicate key on 'family_head.id'. Run: SELECT setval(pg_get_serial_sequence('family_head','id'), (SELECT MAX(id) FROM family_head)+1);`,
                    500
                  )
                );
              }
              return next(new ApiError("Failed to create family head.", 500));
            }
            family_head_inserted_id = newHead.id;
          }
        }
      } else {
        if (!family_head_id) {
          return next(
            new ApiError(
              'Missing family_head_id. When the evacuee is not the head, a valid family_head_id must be provided.',
              400
            )
          );
        }
        family_head_inserted_id = family_head_id;
      }

      // 5) Insert new registration row
      const birthIso = birthdate ?? evacRow?.residents?.birthdate ?? null;
      const reported_age_at_arrival = birthIso ? computeAge(birthIso) : 0;
      const nowIso = new Date().toISOString();

      const { data: registrationData, error: registrationError } = await supabase
        .from("evacuation_registrations")
        .insert([
          {
            evacuee_resident_id: evacuee_id,
            disaster_evacuation_event_id,
            family_head_id: family_head_inserted_id,
            arrival_timestamp: nowIso,
            decampment_timestamp: null,
            reported_age_at_arrival,
            ec_rooms_id,
            created_at: nowIso,
          },
        ])
        .select()
        .single();

      if (registrationError) {
        return next(
          new ApiError(
            `Failed to register evacuation: ${registrationError.message}`,
            500
          )
        );
      }

      registration_id = registrationData.id;

      // 6) EVENT-SCOPED SNAPSHOT + FLAGS (no global vuln writes)
      const vulnIds = buildVulnIdsFromFlags();

      // --- IMPORTANT FIX: build snapshot source with presence checks ---
      const snapshotSrc = {
        first_name:
          first_name !== undefined ? first_name : evacRow?.residents?.first_name,
        middle_name:
          middle_name !== undefined ? middle_name : evacRow?.residents?.middle_name,
        last_name:
          last_name !== undefined ? last_name : evacRow?.residents?.last_name,
        // allow explicit null to clear suffix
        suffix:
          suffix !== undefined ? normalizedSuffix : evacRow?.residents?.suffix,
        sex: sex !== undefined ? sex : evacRow?.residents?.sex,
        marital_status:
          marital_status !== undefined ? marital_status : evacRow?.marital_status,
        birthdate:
          birthdate !== undefined ? birthdate : evacRow?.residents?.birthdate,
        barangay_of_origin:
          barangay_of_origin !== undefined
            ? barangay_of_origin
            : evacRow?.residents?.barangay_of_origin,
        purok: purok !== undefined ? purok : evacRow?.purok,
        educational_attainment:
          educational_attainment !== undefined
            ? educational_attainment
            : evacRow?.educational_attainment,
        occupation: occupation !== undefined ? occupation : evacRow?.occupation,
        school_of_origin:
          school_of_origin !== undefined
            ? school_of_origin
            : evacRow?.school_of_origin,
      };

      const relForThisEvent = desiredRel; 
      const snapshot = buildSnapshot(snapshotSrc, relForThisEvent);

      const { error: regEventStateErr } = await supabase
        .from("evacuation_registrations")
        .update({
          profile_snapshot: snapshot,
          vulnerability_type_ids: vulnIds,
          updated_at: nowIso,
        })
        .eq("id", registration_id);

      if (regEventStateErr) {
        return next(new ApiError("Failed to save event-scoped data.", 500));
      }

      // 7) Invalidate cache so new state is visible in search
      evacueeCache = null;
      cacheTimestamp = null;

      return res.status(201).json({
        message: "Evacuee registered successfully (existing person reused).",
        data: {
          evacuee: { id: evacuee_id, family_head_id: family_head_inserted_id },
          evacuation_registration: {
            ...registrationData,
            vulnerability_type_ids: vulnIds,
            profile_snapshot: snapshot,
          },
        },
      });
    }

    // CREATE-NEW BRANCH: original flow (with event-scoped snapshot/flags)

    // Step 1: Insert resident
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
      if (residentError.code === "23505") {
        throw new ApiError(
          `Failed to register resident. Duplicate key error on 'residents.id'. Likely sequence mismatch. Run: SELECT setval(pg_get_serial_sequence('residents','id'), (SELECT MAX(id) FROM residents)+1);`,
          500
        );
      }
      throw new ApiError(
        `Failed to register resident. Supabase error: ${residentError.message}`,
        500
      );
    }
    resident_id = residentData.id;

    // Step 2: Ensure family_head (based on relationship intent)
    const isHead = relationship_to_family_head === "Head";

    if (isHead) {
      const { data: familyHeadData, error: familyHeadError } = await supabase
        .from("family_head")
        .insert([{ resident_id }])
        .select()
        .single();

      if (familyHeadError) {
        if (familyHeadError.code === "23505") {
          throw new ApiError(
            `Failed to register family head. Duplicate key error on 'family_head.id'. Run: SELECT setval(pg_get_serial_sequence('family_head','id'), (SELECT MAX(id) FROM family_head)+1);`,
            500
          );
        }
        await supabase.from("residents").delete().eq("id", resident_id);
        throw new ApiError(
          `Failed to register family head. ${familyHeadError.message}`,
          500
        );
      }
      family_head_inserted_id = familyHeadData.id;
    } else {
      if (!family_head_id) {
        await supabase.from("residents").delete().eq("id", resident_id);
        throw new ApiError(
          `Missing family_head_id. When the evacuee is not the head, a valid family_head_id must be provided.`,
          400
        );
      }
      family_head_inserted_id = family_head_id;
    }

    // Step 3: Insert evacuee_residents (global record)
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
      if (evacueeError.code === "23505") {
        throw new ApiError(
          `Failed to register evacuee. Duplicate key error on 'evacuee_residents.id'. Run: SELECT setval(pg_get_serial_sequence('evacuee_residents','id'), (SELECT MAX(id) FROM evacuee_residents)+1);`,
          500
        );
      }
      await supabase.from("residents").delete().eq("id", resident_id);
      throw new ApiError(`Failed to register evacuee. ${evacueeError.message}`, 500);
    }
    evacuee_id = evacueeData.id;

    // Step 4: Insert evacuation_registrations (event-bound)
    const reported_age_at_arrival = computeAge(birthdate);
    const nowIso = new Date().toISOString();

    const { data: registrationData, error: registrationError } = await supabase
      .from("evacuation_registrations")
      .insert([
        {
          evacuee_resident_id: evacuee_id,
          disaster_evacuation_event_id,
          family_head_id: family_head_inserted_id,
          arrival_timestamp: nowIso,
          decampment_timestamp: null,
          reported_age_at_arrival,
          ec_rooms_id,
          created_at: nowIso,
        },
      ])
      .select()
      .single();

    if (registrationError) {
      if (registrationError.code === "23505") {
        throw new ApiError(
          `Failed to register evacuation. Duplicate key error on 'evacuation_registrations.id'. Run: SELECT setval(pg_get_serial_sequence('evacuation_registrations','id'), (SELECT MAX(id) FROM evacuation_registrations)+1);`,
          500
        );
      }
      await supabase.from("evacuee_residents").delete().eq("id", evacuee_id);
      await supabase.from("residents").delete().eq("id", resident_id);
      throw new ApiError(
        `Failed to register evacuation. ${registrationError.message}`,
        500
      );
    }
    registration_id = registrationData.id;

    // Step 5: EVENT-SCOPED SNAPSHOT + FLAGS (no global vuln writes)
    const vulnerabilities = buildVulnIdsFromFlags();
    const snapshot = buildSnapshot(
      {
        first_name,
        middle_name,
        last_name,
        suffix: normalizedSuffix,
        sex,
        marital_status,
        birthdate,
        barangay_of_origin,
        purok,
        educational_attainment,
        occupation,
        school_of_origin,
      },
      relationship_to_family_head || "Head" // default to Head if empty (matches UI default)
    );

    const { error: regEventStateErr } = await supabase
      .from("evacuation_registrations")
      .update({
        profile_snapshot: snapshot,
        vulnerability_type_ids: vulnerabilities, // [] allowed; column is NOT NULL
        updated_at: nowIso,
      })
      .eq("id", registration_id);

    if (regEventStateErr) {
      // optional rollback for atomicity
      await supabase.from("evacuation_registrations").delete().eq("id", registration_id);
      await supabase.from("evacuee_residents").delete().eq("id", evacuee_id);
      await supabase.from("residents").delete().eq("id", resident_id);
      throw new ApiError("Failed to save event-scoped data.", 500);
    }

    // Invalidate cache so searches reflect the new registration
    evacueeCache = null;
    cacheTimestamp = null;

    return res.status(201).json({
      message: "Evacuee registered successfully.",
      data: {
        evacuee: { ...evacueeData, family_head_id: family_head_inserted_id },
        evacuation_registration: {
          ...registrationData,
          vulnerability_type_ids: vulnerabilities,
          profile_snapshot: snapshot,
        },
      },
    });
  } catch (err) {
    console.error("RegisterEvacuee Error:", err);

    // best-effort rollback for CREATE-NEW branch
    if (!existing_evacuee_resident_id) {
      if (registration_id)
        await supabase.from("evacuation_registrations").delete().eq("id", registration_id);
      if (evacuee_id)
        await supabase.from("evacuee_residents").delete().eq("id", evacuee_id);
      if (resident_id)
        await supabase.from("residents").delete().eq("id", resident_id);
    }

    return next(
      new ApiError(
        `Internal server error during evacuee registration. ${err?.message || ""}`,
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
 * @desc Update an evacuee's registration for a specific event (event-scoped only).
 *       DOES NOT modify global person tables (residents / evacuee_residents).
 * @route PUT /api/v1/evacuees/:id   // :id = evacuee_residents.id
 * @access Private (Camp Manager only)
 */
exports.updateEvacuee = async (req, res, next) => {
  const { id } = req.params; // evacuee_residents.id

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

    is_infant,
    is_children,
    is_youth,
    is_adult,
    is_senior,
    is_pwd,
    is_pregnant,
    is_lactating,

    ec_rooms_id,                 
    disaster_evacuation_event_id,
  } = req.body;

  if (!disaster_evacuation_event_id) {
    return next(new ApiError("disaster_evacuation_event_id is required for updates.", 400));
  }
  if (!id || Number.isNaN(Number(id))) {
    return next(new ApiError("Invalid evacuee id.", 400));
  }

  // ------- helpers -------
  const computeAge = (isoBirthdate) => {
    if (!isoBirthdate) return 0;
    const today = new Date();
    const birth = new Date(isoBirthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return Math.max(0, age);
  };

  const buildVulnIdsFromFlags = () => {
    const ids = [];
    if (is_infant) ids.push(1);
    if (is_children) ids.push(2);
    if (is_senior) ids.push(3);
    if (is_pwd) ids.push(4);
    if (is_pregnant) ids.push(5);
    if (is_lactating) ids.push(6);
    if (is_youth) ids.push(7);
    if (is_adult) ids.push(8);
    return ids;
  };

  const buildSnapshot = (src = {}, relForThisEvent = null) => ({
    first_name: src.first_name ?? null,
    middle_name: src.middle_name ?? null,
    last_name: src.last_name ?? null,
    suffix:
      typeof src.suffix === "string" && src.suffix.trim() !== ""
        ? src.suffix.trim()
        : (src.suffix ?? null),
    sex: src.sex ?? null,
    marital_status: src.marital_status ?? null,
    birthdate: src.birthdate ?? null,
    barangay_of_origin: src.barangay_of_origin ?? null,
    purok: src.purok ?? null,
    educational_attainment: src.educational_attainment ?? null,
    occupation: src.occupation ?? null,
    school_of_origin: src.school_of_origin ?? null,
    relationship_to_family_head: relForThisEvent, 
  });

  let normalizedSuffix;
  if (suffix === null) {
    normalizedSuffix = null;
  } else if (typeof suffix === "string") {
    const t = suffix.trim();
    normalizedSuffix = t === "" ? null : t;
  } else {
    normalizedSuffix = undefined;
  }

  try {
    // 1) Load base person (for snapshot fallbacks + resident_id to resolve family_head)
    const { data: evacueeRow, error: evacueeErr } = await supabase
      .from("evacuee_residents")
      .select(`
        id,
        resident_id,
        family_head_id,
        relationship_to_family_head,
        marital_status,
        educational_attainment,
        school_of_origin,
        occupation,
        purok,
        residents (
          id,
          first_name,
          middle_name,
          last_name,
          suffix,
          birthdate,
          sex,
          barangay_of_origin
        )
      `)
      .eq("id", id)
      .single();

    if (evacueeErr || !evacueeRow) {
      return next(new ApiError("Evacuee not found.", 404));
    }

    const resident_id = evacueeRow.resident_id;

    // Determine relation intent FOR THIS EVENT (no global mutations)
    const currentRel = evacueeRow.relationship_to_family_head || "Head";
    const desiredRel =
      typeof relationship_to_family_head === "string" && relationship_to_family_head.trim() !== ""
        ? relationship_to_family_head.trim()
        : currentRel;

    const wasHead = currentRel === "Head";
    const isBecomingHead = desiredRel === "Head";
    const isDemoting = wasHead && !isBecomingHead;

    // 2) Safety: cannot demote a head who still has >1 members in THIS event
    if (isDemoting && evacueeRow.family_head_id) {
      const { count: familyCount, error: famCountErr } = await supabase
        .from("evacuation_registrations")
        .select("id", { count: "exact", head: true })
        .eq("family_head_id", evacueeRow.family_head_id)
        .eq("disaster_evacuation_event_id", disaster_evacuation_event_id);

      if (famCountErr) throw new ApiError("Failed to count family members.", 500);
      if ((familyCount ?? 1) > 1) {
        return next(
          new ApiError(
            "Cannot demote the family head while other family members are still assigned in this event. Please transfer the head role to another member first.",
            409
          )
        );
      }
    }

    // 3) Resolve NOT-NULL family_head_id to persist on registration (no global edits)
    let resolved_family_head_id = null;

    if (isBecomingHead) {
      if (wasHead && evacueeRow.family_head_id) {
        resolved_family_head_id = evacueeRow.family_head_id;
      } else {
        const { data: existingHead, error: existingHeadErr } = await supabase
          .from("family_head")
          .select("id")
          .eq("resident_id", resident_id)
          .maybeSingle();
        if (existingHeadErr) throw new ApiError("Failed to look up head record.", 500);

        if (existingHead?.id) {
          resolved_family_head_id = existingHead.id;
        } else {
          const { data: newHead, error: newHeadErr } = await supabase
            .from("family_head")
            .insert([{ resident_id }])
            .select()
            .single();
          if (newHeadErr) {
            if (newHeadErr.code === "23505") {
              throw new ApiError(
                `Failed to create family head. Duplicate key on 'family_head.id'. Run: SELECT setval(pg_get_serial_sequence('family_head','id'), (SELECT MAX(id) FROM family_head)+1);`,
                500
              );
            }
            throw new ApiError("Failed to create family head.", 500);
          }
          resolved_family_head_id = newHead.id;
        }
      }
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

    // 4) Upsert registration row for THIS event (event-scoped data only)
    const { data: regRow, error: regFindErr } = await supabase
      .from("evacuation_registrations")
      .select("id, arrival_timestamp, reported_age_at_arrival, ec_rooms_id")
      .eq("evacuee_resident_id", id)
      .eq("disaster_evacuation_event_id", disaster_evacuation_event_id)
      .maybeSingle();
    if (regFindErr) throw new ApiError("Failed to fetch evacuation registration.", 500);

    // Guard: if no registration yet, ensure evacuee not active elsewhere
    if (!regRow) {
      const { data: otherActive, error: oaErr } = await supabase
        .from("evacuation_registrations")
        .select(`
          id,
          disaster_evacuation_event_id,
          decampment_timestamp,
          disaster_evacuation_event:disaster_evacuation_event_id (
            id,
            evacuation_centers ( id, name )
          )
        `)
        .eq("evacuee_resident_id", id)
        .is("decampment_timestamp", null);

      if (oaErr) throw new ApiError("Failed to verify active-registration state.", 500);

      if ((otherActive || []).length > 0) {
        const alreadyInTarget = otherActive.find(
          (r) => Number(r.disaster_evacuation_event_id) === Number(disaster_evacuation_event_id)
        );
        if (alreadyInTarget) {
          const ecName =
            alreadyInTarget?.disaster_evacuation_event?.evacuation_centers?.name ||
            "this evacuation center";
          return next(
            new ApiError(
              `This evacuee is already actively registered in this event (${ecName}). Use Edit to update the existing record.`,
              409
            )
          );
        }
        const ecName =
          otherActive[0]?.disaster_evacuation_event?.evacuation_centers?.name ||
          "another evacuation center";
        return next(
          new ApiError(
            `This evacuee is still actively registered in another event (${ecName}). Please decamp them first before registering here.`,
            409
          )
        );
      }
    }

    // ---- Snapshot (presence checks; allow clearing suffix) ----
    const snapshotSrc = {
      first_name: first_name !== undefined ? first_name : evacueeRow?.residents?.first_name,
      middle_name: middle_name !== undefined ? middle_name : evacueeRow?.residents?.middle_name,
      last_name: last_name !== undefined ? last_name : evacueeRow?.residents?.last_name,
      suffix: normalizedSuffix !== undefined ? normalizedSuffix : evacueeRow?.residents?.suffix,
      sex: sex !== undefined ? sex : evacueeRow?.residents?.sex,
      marital_status: marital_status !== undefined ? marital_status : evacueeRow?.marital_status,
      birthdate: birthdate !== undefined ? birthdate : evacueeRow?.residents?.birthdate,
      barangay_of_origin: barangay_of_origin !== undefined ? barangay_of_origin : evacueeRow?.residents?.barangay_of_origin,
      purok: purok !== undefined ? purok : evacueeRow?.purok,
      educational_attainment: educational_attainment !== undefined ? educational_attainment : evacueeRow?.educational_attainment,
      occupation: occupation !== undefined ? occupation : evacueeRow?.occupation,
      school_of_origin: school_of_origin !== undefined ? school_of_origin : evacueeRow?.school_of_origin,
    };
    const snapshot = buildSnapshot(snapshotSrc, desiredRel);

    const vulnIds = buildVulnIdsFromFlags();
    const nowIso = new Date().toISOString();

    if (regRow) {
      const patch = {
        family_head_id: resolved_family_head_id,
        profile_snapshot: snapshot,
        vulnerability_type_ids: vulnIds, 
        updated_at: nowIso,
      };
      if (ec_rooms_id !== undefined) {
        patch.ec_rooms_id = ec_rooms_id ?? null;
      }

      const { error: regUpdateErr } = await supabase
        .from("evacuation_registrations")
        .update(patch)
        .eq("id", regRow.id);

      if (regUpdateErr) throw new ApiError("Failed to update evacuation registration.", 500);
    } else {
      // INSERT new registration for this event (if none existed)
      const reported_age = computeAge(snapshot.birthdate);
      const { error: regInsertErr } = await supabase
        .from("evacuation_registrations")
        .insert([
          {
            evacuee_resident_id: id,
            disaster_evacuation_event_id,
            family_head_id: resolved_family_head_id,
            ec_rooms_id: ec_rooms_id ?? null,
            arrival_timestamp: nowIso,
            decampment_timestamp: null,
            reported_age_at_arrival: reported_age,
            profile_snapshot: snapshot,
            vulnerability_type_ids: vulnIds,
            created_at: nowIso,
            updated_at: nowIso,
          },
        ]);
      if (regInsertErr) throw new ApiError("Failed to create evacuation registration for this event.", 500);
    }

    // 5) Invalidate name-search cache (so SearchEvacueeModal sees latest)
    evacueeCache = null;
    cacheTimestamp = null;

    return res.status(200).json({
      message: "Evacuee updated successfully (event-scoped).",
      data: { evacuee_id: id, family_head_id: resolved_family_head_id },
    });
  } catch (err) {
    console.error("UpdateEvacuee Error:", err);
    return next(new ApiError("Internal server error during evacuee update.", 500));
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
 * @desc Get detailed evacuee data by disaster evacuation event ID (event-scoped)
 * @route GET /api/v1/evacuees/:disasterEvacuationEventId/evacuees-information
 * @access Private (Camp Manager only)
 */
exports.getEvacueesInformationbyDisasterEvacuationEventId = async (req, res, next) => {
  const eventId = Number(req.params.disasterEvacuationEventId ?? req.params.id);
  if (!Number.isFinite(eventId)) {
    return next(new ApiError("Invalid disaster evacuation event id.", 400));
  }

  const parseJsonMaybe = (v) => {
    if (v == null) return null;
    if (typeof v === "object") return v;
    if (typeof v === "string") { try { return JSON.parse(v); } catch { return null; } }
    return null;
  };
  const has = (obj, key) => obj != null && Object.prototype.hasOwnProperty.call(obj, key);

  const buildFullName = ({ first_name, middle_name, last_name, suffix }) => {
    const parts = [first_name, middle_name, last_name].filter(Boolean);
    const full = parts.join(" ");
    return suffix ? `${full} ${suffix}` : full;
  };

  // Prefer snapshot barangay_of_origin; if it's a number, map id->name from barangays
  const resolveBarangayNameFactory = (barangayNameById) => (snapValue, residentJoinName) => {
    if (snapValue !== undefined && snapValue !== null) {
      const num = Number(snapValue);
      if (Number.isFinite(num)) {
        return barangayNameById.get(num) || residentJoinName || "Unknown";
      }
      if (typeof snapValue === "string" && snapValue.trim() !== "") {
        return snapValue.trim(); // legacy: snapshot stored a free-text barangay label
      }
    }
    return residentJoinName || "Unknown";
  };

  try {
    // 0) vulnerability type names
    const { data: vulnTypes, error: vulnTypesErr } = await supabase
      .from("vulnerability_types")
      .select("id, name");
    if (vulnTypesErr) console.warn("[WARN] fetching vulnerability_types:", vulnTypesErr);
    const vulnNameById = new Map((vulnTypes || []).map((v) => [Number(v.id), v.name]));

    // 0.1) barangay id -> name map (for snapshot numeric values)
    const { data: brgyRows, error: brgyErr } = await supabase
      .from("barangays")
      .select("id, name");
    if (brgyErr) {
      console.warn("[WARN] fetching barangays:", brgyErr);
    }
    const barangayNameById = new Map((brgyRows || []).map((b) => [Number(b.id), b.name]));
    const resolveBarangayName = resolveBarangayNameFactory(barangayNameById);

    // 1) registrations for this event (include resident + barangay join via FK)
    const { data: registrations, error: regError } = await supabase
      .from("evacuation_registrations")
      .select(`
        id,
        evacuee_resident_id,
        disaster_evacuation_event_id,
        family_head_id,
        ec_rooms_id,
        arrival_timestamp,
        decampment_timestamp,
        profile_snapshot,
        vulnerability_type_ids,
        evacuee_residents:evacuee_resident_id (
          id,
          resident_id,
          relationship_to_family_head,
          marital_status,
          educational_attainment,
          school_of_origin,
          occupation,
          purok,
          residents (
            id,
            first_name,
            middle_name,
            last_name,
            suffix,
            birthdate,
            sex,
            barangay_of_origin,
            barangays:barangay_of_origin ( id, name )
          )
        ),
        ec_rooms:ec_rooms_id (
          id,
          room_name,
          evacuation_centers ( name )
        )
      `)
      .eq("disaster_evacuation_event_id", eventId);

    if (regError) {
      console.error("[ERROR] fetching registrations:", regError);
      return next(new ApiError("Failed to fetch registrations", 500));
    }
    if (!registrations || registrations.length === 0) {
      return res.status(200).json([]);
    }

    // 2) group by family_head_id
    const familyGroups = new Map();
    for (const r of registrations) {
      const fhId = r.family_head_id ?? null;
      if (!familyGroups.has(fhId)) familyGroups.set(fhId, []);
      familyGroups.get(fhId).push(r);
    }

    const response = [];

    for (const [familyHeadId, members] of familyGroups.entries()) {
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
        const er = member?.evacuee_residents ?? {};
        const resident = er?.residents ?? {};
        const snap = parseJsonMaybe(member?.profile_snapshot) || {};

        // prefer snapshot fields; fallback to resident
        const first_name  = has(snap, "first_name")  ? (snap.first_name  ?? null) : (resident.first_name  ?? null);
        const middle_name = has(snap, "middle_name") ? (snap.middle_name ?? null) : (resident.middle_name ?? null);
        const last_name   = has(snap, "last_name")   ? (snap.last_name   ?? null) : (resident.last_name   ?? null);
        const suffix      = has(snap, "suffix")      ? (snap.suffix      ?? null) : (resident.suffix      ?? null);
        const sexVal      = has(snap, "sex")         ? (snap.sex         ?? "Unknown") : (resident.sex ?? "Unknown");
        const birthdate   = has(snap, "birthdate")   ? (snap.birthdate   ?? null)      : (resident.birthdate ?? null);

        // barangay: prefer snapshot.barangay_of_origin (ID or string), fallback to resident join name
        const barangayFromResident = resident?.barangays?.name || "Unknown";
        const barangayName = resolveBarangayName(snap.barangay_of_origin, barangayFromResident);

        // age + buckets
        let ageStr = "—";
        if (birthdate) {
          const birth = new Date(birthdate);
          const today = new Date();
          const y = today.getFullYear() - birth.getFullYear();
          const m = today.getMonth() - birth.getMonth();
          const d = today.getDate() - birth.getDate();
          let totalMonths = y * 12 + m - (d < 0 ? 1 : 0);
          totalMonths = Math.max(0, totalMonths);

          if (totalMonths <= 12) {
            ageStr = `${totalMonths} month${totalMonths === 1 ? "" : "s"}`;
            summary.total_no_of_infant++;
          } else {
            const hadBday =
              today.getMonth() > birth.getMonth() ||
              (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
            const years = hadBday ? y : y - 1;
            const safeYears = Math.max(0, years);
            ageStr = String(safeYears);

            if (safeYears <= 12) summary.total_no_of_children++;
            else if (safeYears <= 17) summary.total_no_of_youth++;
            else if (safeYears <= 59) summary.total_no_of_adult++;
            else summary.total_no_of_seniors++;
          }
        }

        if (sexVal === "Male") summary.total_no_of_male++;
        else if (sexVal === "Female") summary.total_no_of_female++;

        // event-scoped vulnerabilities
        let vulnIdsRaw = Array.isArray(member?.vulnerability_type_ids)
          ? member.vulnerability_type_ids
          : parseJsonMaybe(member?.vulnerability_type_ids) || [];
        const vulnIds = (Array.isArray(vulnIdsRaw) ? vulnIdsRaw : [])
          .map((x) => Number(x))
          .filter(Number.isFinite);
        const vulnNames = vulnIds.map((id) => vulnNameById.get(id)).filter(Boolean);

        if (vulnIds.includes(4)) summary.total_no_of_pwd++;
        if (vulnIds.includes(5)) summary.total_no_of_pregnant++;
        if (vulnIds.includes(6)) summary.total_no_of_lactating_women++;

        const memberFullName = buildFullName({ first_name, middle_name, last_name, suffix });
        const relationship =
          has(snap, "relationship_to_family_head")
            ? (snap.relationship_to_family_head ?? null)
            : (er.relationship_to_family_head ?? null);

        return {
          evacuee_id: member.evacuee_resident_id,
          resident_id: resident.id ?? null,
          full_name: memberFullName || "Unknown",
          age: ageStr,
          barangay_of_origin: barangayName, // <-- now snapshot-first
          sex: sexVal,
          vulnerability_types: vulnNames,
          room_name: member?.ec_rooms?.room_name || "Unknown",
          arrival_timestamp: member.arrival_timestamp || null,
          relationship_to_family_head: relationship,
          _snap: snap,
          _resident: resident,
        };
      });

      // Head-of-family display (prefer snapshot barangay; fallback to resident join)
      const headMember =
        familyMembers.find((m) => m.relationship_to_family_head === "Head") || familyMembers[0];

      let family_head_full_name = "Unknown";
      let family_head_barangay = "Unknown";
      if (headMember) {
        const snapH = headMember._snap || {};
        const residentH = headMember._resident || {};

        const first_nameH  = has(snapH, "first_name")  ? (snapH.first_name  ?? null) : (residentH.first_name  ?? null);
        const middle_nameH = has(snapH, "middle_name") ? (snapH.middle_name ?? null) : (residentH.middle_name ?? null);
        const last_nameH   = has(snapH, "last_name")   ? (snapH.last_name   ?? null) : (residentH.last_name   ?? null);
        const suffixH      = has(snapH, "suffix")      ? (snapH.suffix      ?? null) : (residentH.suffix      ?? null);

        family_head_full_name = buildFullName({
          first_name: first_nameH, middle_name: middle_nameH, last_name: last_nameH, suffix: suffixH,
        });

        const residentJoinBrgy = residentH?.barangays?.name || "Unknown";
        family_head_barangay = resolveBarangayName(snapH.barangay_of_origin, residentJoinBrgy);
      }

      const first = members[0] || {};
      response.push({
        id: familyHeadId,
        disaster_evacuation_event_id: eventId,
        family_head_full_name,
        barangay: family_head_barangay, // <-- now snapshot-first
        total_individuals: members.length,
        room_name: first?.ec_rooms?.room_name || "Unknown",
        decampment_timestamp: first?.decampment_timestamp || null,
        view_family: {
          evacuation_center_name: first?.ec_rooms?.evacuation_centers?.name || "Unknown",
          head_of_family: family_head_full_name,
          decampment: first?.decampment_timestamp || null,
          summary_per_family: summary,
        },
        list_of_family_members: {
          family_members: familyMembers.map(({ _snap, _resident, ...pub }) => pub),
        },
      });
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("[FATAL] evacuees-information:", error);
    return next(new ApiError("Internal server error", 500));
  }
};

/**
 * @desc Get evacuee demographic statistics by disaster evacuation event ID
 * @route GET /api/v1/evacuees/:disasterEvacuationEventId/evacuee-statistics 
 * @access Public
 */
exports.getEvacueeStatisticsByDisasterEvacuationEventId = async (req, res, next) => {
  const eventId = Number(req.params.disasterEvacuationEventId ?? req.params.id);
  if (!Number.isFinite(eventId)) {
    return next(new ApiError("Invalid disaster evacuation event id.", 400));
  }

  try {
    const { data, error } = await supabase
      .from("evacuation_summaries")
      .select(`
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
      `)
      .eq("disaster_evacuation_event_id", eventId)
      .maybeSingle(); 

    if (error) {
      console.error("[ERROR] fetching evacuee statistics:", error);
      return next(new ApiError("Failed to fetch evacuee statistics.", 500));
    }

    const summary = {
      total_no_of_male:             data?.total_no_of_male ?? 0,
      total_no_of_female:           data?.total_no_of_female ?? 0,
      total_no_of_infant:           data?.total_no_of_infant ?? 0,
      total_no_of_children:         data?.total_no_of_children ?? 0,
      total_no_of_youth:            data?.total_no_of_youth ?? 0,
      total_no_of_adult:            data?.total_no_of_adult ?? 0,
      total_no_of_seniors:          data?.total_no_of_seniors ?? 0,
      total_no_of_pwd:              data?.total_no_of_pwd ?? 0,
      total_no_of_pregnant:         data?.total_no_of_pregnant ?? 0,
      total_no_of_lactating_women:  data?.total_no_of_lactating_women ?? 0,
    };

    return res.status(200).json({
      title: "Evacuees Statistics",
      summary,
    });
  } catch (err) {
    console.error("[FATAL] evacuee-statistics:", err);
    return next(new ApiError("Internal server error.", 500));
  }
};

/**
 * @desc Get disaster + evacuation center info for a disaster evacuation event (empty-state friendly)
 * @route GET /api/v1/evacuees/:disasterEvacuationEventId/details  (also supports :id)
 * @access Public
 */
exports.getDisasterEvacuationDetails = async (req, res, next) => {
  const disasterEvacuationEventId = Number(
    req.params.disasterEvacuationEventId ?? req.params.id
  );

  if (!Number.isFinite(disasterEvacuationEventId)) {
    return next(new ApiError("Invalid disaster evacuation event id.", 400));
  }

  try {
    // 1) Event + related disaster + EC (pull capacity here to avoid extra query)
    const { data: eventData, error: eventError } = await supabase
      .from("disaster_evacuation_event")
      .select(`
        id,
        disasters (
          id,
          disaster_name,
          disaster_start_date,
          disaster_end_date,
          disaster_types (
            id, name
          )
        ),
        evacuation_centers (
          id,
          name,
          barangay_id,
          total_capacity,
          barangays ( id, name )
        )
      `)
      .eq("id", disasterEvacuationEventId)
      .maybeSingle(); // ← no error if not found

    if (eventError) {
      console.error("[ERROR] fetching event:", eventError);
      return next(new ApiError("Failed to fetch disaster evacuation event.", 500));
    }
    if (!eventData) {
      return next(new ApiError("Disaster evacuation event not found.", 404));
    }

    const disasters = eventData.disasters ?? null;
    const ec = eventData.evacuation_centers ?? null;

    // 2) Summary (ok if missing — return zeros)
    const { data: summary, error: summaryError } = await supabase
      .from("evacuation_summaries")
      .select(`total_no_of_family, total_no_of_individuals`)
      .eq("disaster_evacuation_event_id", disasterEvacuationEventId)
      .maybeSingle();

    if (summaryError) {
      console.error("[ERROR] fetching summary:", summaryError);
      return next(new ApiError("Failed to fetch evacuation summary.", 500));
    }

    const safeSummary = {
      total_no_of_family: summary?.total_no_of_family ?? 0,
      total_no_of_individuals: summary?.total_no_of_individuals ?? 0,
      evacuation_center_capacity: ec?.total_capacity ?? 0,
    };

    // 3) Respond with null/“Unknown” fallbacks instead of 500s
    return res.status(200).json({
      disaster: {
        disaster_types_id: disasters?.disaster_types?.id ?? null,
        disaster_type_name: disasters?.disaster_types?.name ?? "Unknown",
        disasters_id: disasters?.id ?? null,
        disaster_name: disasters?.disaster_name ?? "Unknown",
        disaster_start_date: disasters?.disaster_start_date ?? null,
        disaster_end_date: disasters?.disaster_end_date ?? null,
      },
      evacuation_center: {
        evacuation_center_id: ec?.id ?? null,
        evacuation_center_name: ec?.name ?? "Unknown",
        evacuation_center_barangay_id: ec?.barangay_id ?? null,
        evacuation_center_barangay_name: ec?.barangays?.name ?? "Unknown",
      },
      evacuation_summary: safeSummary,
    });
  } catch (err) {
    console.error("[FATAL] getDisasterEvacuationDetails:", err);
    return next(new ApiError("Internal server error", 500));
  }
};

// controllers/evacuees.js
// controllers/evacuees.js

// controllers/evacuees.js
exports.getAllRoomsForDisasterEvacuationEventId = async (req, res, next) => {
  const { disasterEvacuationEventId } = req.params;
  const onlyAvailable = String(req.query.only_available || "1") !== "0"; // default: only rooms with space

  try {
    // 1) Resolve center id for this event
    const { data: eventRow, error: eventErr } = await supabase
      .from("disaster_evacuation_event")
      .select("evacuation_center_id")
      .eq("id", disasterEvacuationEventId)
      .single();
    if (eventErr || !eventRow) {
      return next(new ApiError("Disaster evacuation event not found.", 404));
    }

    // 2) Rooms (include capacity)
    const { data: rooms, error: roomsErr } = await supabase
      .from("evacuation_center_rooms")
      .select("id, room_name, individual_room_capacity")
      .eq("evacuation_center_id", eventRow.evacuation_center_id)
      .order("room_name", { ascending: true });
    if (roomsErr) {
      return next(new ApiError("Failed to fetch evacuation center rooms.", 500));
    }

    // 3) Occupancy for THIS event (active = decampment_timestamp IS NULL)
    const { data: occRows, error: occErr } = await supabase
      .from("evacuation_registrations")
      .select("ec_rooms_id")
      .eq("disaster_evacuation_event_id", disasterEvacuationEventId)
      .is("decampment_timestamp", null);
    if (occErr) {
      return next(new ApiError("Failed to fetch room occupancy.", 500));
    }

    // 4) Count occupants per room
    const occMap = new Map(); // room_id -> count
    for (const row of occRows || []) {
      const rid = row.ec_rooms_id;
      if (!rid) continue;
      occMap.set(rid, (occMap.get(rid) || 0) + 1);
    }

    // 5) Compose rooms with availability
    const withAvailability = (rooms || []).map((r) => {
      const capacity = Number(r.individual_room_capacity || 0);
      const occupants = occMap.get(r.id) || 0;
      return {
        id: r.id,
        room_name: r.room_name,
        capacity,
        available: Math.max(capacity - occupants, 0),
      };
    });

    const filtered = onlyAvailable
      ? withAvailability.filter((r) => r.available > 0)
      : withAvailability;

    return res.status(200).json({
      message: "Rooms fetched successfully.",
      count: filtered.length,
      data: filtered,            // [{ id, room_name, capacity, available }]
      all_full: onlyAvailable && filtered.length === 0,
    });
  } catch (err) {
    console.error("getAllRoomsForDisasterEvacuationEventId error:", err);
    return next(new ApiError("Internal server error.", 500));
  }
};




/**
 * @desc Get full evacuee details for editing (event-scoped first).
 *       Prefers registration.profile_snapshot & registration.vulnerability_type_ids
 *       for the given disaster_evacuation_event_id, with per-field fallback to global.
 * @route GET /api/v1/evacuees/:disasterEvacuationEventId/:evacueeResidentId/edit
 * @access Private (Camp Manager only)
 */
exports.getEvacueeDetailsForEdit = async (req, res, next) => {
  const { disasterEvacuationEventId, evacueeResidentId } = req.params;

  const parseJsonMaybe = (v) => {
    if (v == null) return null;
    if (typeof v === "object") return v;
    if (typeof v === "string") {
      try { return JSON.parse(v); } catch { return null; }
    }
    return null;
  };

  const buildFullName = ({ first_name, middle_name, last_name, suffix }) => {
    const parts = [first_name, middle_name, last_name].filter(Boolean);
    const full = parts.join(" ");
    return suffix ? `${full} ${suffix}` : full;
  };

  // Normalize snapshot builder (keeps null when suffix cleared)
  const buildSnapshot = (src = {}) => ({
    first_name: src.first_name ?? null,
    middle_name: src.middle_name ?? null,
    last_name: src.last_name ?? null,
    suffix:
      typeof src.suffix === "string" && src.suffix.trim() !== ""
        ? src.suffix.trim()
        : (src.suffix ?? null),
    sex: src.sex ?? null,
    birthdate: src.birthdate ?? null,
    barangay_of_origin: src.barangay_of_origin ?? null,
    purok: src.purok ?? null,
    marital_status: src.marital_status ?? null,
    educational_attainment: src.educational_attainment ?? null,
    occupation: src.occupation ?? null,
    school_of_origin: src.school_of_origin ?? null,
    relationship_to_family_head: src.relationship_to_family_head ?? null,
  });

  try {
    // 1) Global evacuee + resident + head display
    const { data: evacuee, error: evacueeErr } = await supabase
      .from("evacuee_residents")
      .select(`
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
            last_name,
            suffix
          )
        )
      `)
      .eq("id", evacueeResidentId)
      .single();

    if (evacueeErr || !evacuee) {
      return next(new ApiError("Evacuee not found.", 404));
    }

    // 2) Event-scoped registration
    const { data: registration, error: regErr } = await supabase
      .from("evacuation_registrations")
      .select(`
        id,
        ec_rooms_id,
        arrival_timestamp,
        decampment_timestamp,
        reported_age_at_arrival,
        profile_snapshot,
        vulnerability_type_ids
      `)
      .eq("evacuee_resident_id", evacueeResidentId)
      .eq("disaster_evacuation_event_id", disasterEvacuationEventId)
      .maybeSingle();

    if (regErr) {
      return next(new ApiError("Failed to load registration for this event.", 500));
    }

    // 3) Parse snapshot if needed
    const snapRow = parseJsonMaybe(registration?.profile_snapshot);

    // 4) Build field-by-field merge: prefer event snapshot; fallback to global
    const mergedBase = {
      first_name: snapRow?.first_name ?? evacuee.residents?.first_name ?? null,
      middle_name: snapRow?.middle_name ?? evacuee.residents?.middle_name ?? null,
      last_name: snapRow?.last_name ?? evacuee.residents?.last_name ?? null,
      // IMPORTANT: allow null from event snapshot to pass through (cleared suffix)
      suffix: (snapRow && "suffix" in snapRow)
        ? (snapRow.suffix ?? null)
        : (evacuee.residents?.suffix ?? null),
      sex: snapRow?.sex ?? evacuee.residents?.sex ?? null,
      birthdate: snapRow?.birthdate ?? evacuee.residents?.birthdate ?? null,
      barangay_of_origin: (snapRow && "barangay_of_origin" in snapRow)
        ? (snapRow.barangay_of_origin ?? null)
        : (evacuee.residents?.barangay_of_origin ?? null),
      purok: (snapRow && "purok" in snapRow)
        ? (snapRow.purok ?? null)
        : (evacuee.purok ?? null),
      marital_status: (snapRow && "marital_status" in snapRow)
        ? (snapRow.marital_status ?? null)
        : (evacuee.marital_status ?? null),
      educational_attainment: (snapRow && "educational_attainment" in snapRow)
        ? (snapRow.educational_attainment ?? null)
        : (evacuee.educational_attainment ?? null),
      occupation: (snapRow && "occupation" in snapRow)
        ? (snapRow.occupation ?? null)
        : (evacuee.occupation ?? null),
      school_of_origin: (snapRow && "school_of_origin" in snapRow)
        ? (snapRow.school_of_origin ?? null)
        : (evacuee.school_of_origin ?? null),
    };

    // Ensure relationship_to_family_head is event-first
    const eventRel =
      (snapRow && "relationship_to_family_head" in snapRow
        ? (snapRow.relationship_to_family_head ?? null)
        : null) ??
      evacuee.relationship_to_family_head ??
      null;

    const snap = buildSnapshot({ ...mergedBase, relationship_to_family_head: eventRel });

    // 5) Normalize vulnerabilities (array of numbers)
    let vulnIds = [];
    if (Array.isArray(registration?.vulnerability_type_ids)) {
      vulnIds = registration.vulnerability_type_ids.map((x) => Number(x)).filter(Number.isFinite);
    } else {
      const parsed = parseJsonMaybe(registration?.vulnerability_type_ids);
      if (Array.isArray(parsed)) {
        vulnIds = parsed.map((x) => Number(x)).filter(Number.isFinite);
      }
    }

    return res.status(200).json({
      id: evacuee.id,

      // Residents (event snapshot first)
      first_name: snap.first_name,
      middle_name: snap.middle_name,
      last_name: snap.last_name,
      suffix: snap.suffix, // stays null if cleared
      birthdate: snap.birthdate,
      sex: snap.sex,
      barangay_of_origin: snap.barangay_of_origin,

      // Evacuee-residents (event snapshot first where applicable)
      marital_status: snap.marital_status,
      educational_attainment: snap.educational_attainment,
      school_of_origin: snap.school_of_origin,
      occupation: snap.occupation,
      purok: snap.purok,

      // Event-scoped relationship used by the Edit modal
      relationship_to_family_head: snap.relationship_to_family_head,
      family_head_id: evacuee.family_head_id,
      family_head_full_name: evacuee.family_head?.residents
        ? buildFullName(evacuee.family_head.residents)
        : null,
      date_registered: evacuee.date_registered,

      // Registration (event-bound)
      ec_rooms_id: registration?.ec_rooms_id ?? null,
      arrival_timestamp: registration?.arrival_timestamp ?? null,
      decampment_timestamp: registration?.decampment_timestamp ?? null,
      reported_age_at_arrival: registration?.reported_age_at_arrival ?? null,

      // Event-scoped vulnerabilities for edit form
      vulnerability_type_ids: vulnIds,

      // Provide the merged snapshot the UI expects
      profile_snapshot: snap,
    });
  } catch (err) {
    console.error("getEvacueeDetailsForEdit error:", err);
    return next(new ApiError("Internal server error.", 500));
  }
};

/**
 * @desc Transfer the family head to another member.
 *       GLOBAL: repoints family_head_id on evacuee_residents + registrations.
 *       EVENT-SCOPED: also patches profile_snapshot.relationship_to_family_head
 *       for the specified event so Edit modal reflects the new roles.
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
    !Number.isFinite(eventIdNum) ||
    !Number.isFinite(fromFH) ||
    !Number.isFinite(toEvac) ||
    typeof old_head_new_relationship !== "string" ||
    !old_head_new_relationship.trim()
  ) {
    return next(new ApiError("Missing or invalid fields for transfer.", 400));
  }

  try {
    // ── A) Validate: target member belongs to this family for THIS event
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

    // ── B) Member we promote (need resident_id)
    const { data: promoteRow, error: promoteErr } = await supabase
      .from("evacuee_residents")
      .select("id, resident_id, relationship_to_family_head, family_head_id")
      .eq("id", toEvac)
      .single();
    if (promoteErr || !promoteRow) {
      return next(new ApiError("Member to promote not found.", 404));
    }

    // ── C) Old head's resident_id via family_head
    const { data: oldFHRow, error: oldFHErr } = await supabase
      .from("family_head")
      .select("id, resident_id")
      .eq("id", fromFH)
      .single();
    if (oldFHErr || !oldFHRow) {
      console.error("oldFHErr:", oldFHErr);
      throw new ApiError("Old family head record not found.", 404);
    }

    // Also fetch the old-head evacuee_residents.id (to patch event snapshot later)
    const { data: oldHeadEvacueeRow, error: oldHeadEvacErr } = await supabase
      .from("evacuee_residents")
      .select("id")
      .eq("resident_id", oldFHRow.resident_id)
      .single();
    if (oldHeadEvacErr || !oldHeadEvacueeRow) {
      console.error("oldHeadEvacErr:", oldHeadEvacErr);
      throw new ApiError("Could not locate old head's evacuee record.", 404);
    }

    // ── D) Ensure a family_head row for the promoted resident
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
    if (existingHead?.id) {
      new_family_head_id = existingHead.id;
    } else {
      const { data: insertedHead, error: headInsertErr } = await supabase
        .from("family_head")
        .insert([{ resident_id: promoteRow.resident_id }])
        .select("id")
        .single();
      if (headInsertErr) {
        console.error("headInsertErr:", headInsertErr);
        if (headInsertErr.code === "23505") {
          throw new ApiError(
            `Duplicate key on 'family_head.id'. Run: SELECT setval(pg_get_serial_sequence('family_head','id'), (SELECT MAX(id) FROM family_head)+1);`,
            500
          );
        }
        throw new ApiError("Failed to create new family head record.", 500);
      }
      new_family_head_id = insertedHead.id;
    }

    const nowIso = new Date().toISOString();

    // ── E) Promote the selected member to Head (GLOBAL person table)
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

    // ── F) Demote the OLD head (GLOBAL person table)
    const { error: oldHeadDemoteErr } = await supabase
      .from("evacuee_residents")
      .update({
        relationship_to_family_head: old_head_new_relationship,
        family_head_id: new_family_head_id, // point to new head
        updated_at: nowIso,
      })
      .eq("resident_id", oldFHRow.resident_id)
      .eq("relationship_to_family_head", "Head");
    if (oldHeadDemoteErr) {
      console.error("oldHeadDemoteErr:", oldHeadDemoteErr);
      throw new ApiError("Failed to update old head relationship.", 500);
    }

    // ── G) Repoint ALL members to the new family_head_id (GLOBAL people table)
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
    if (regRepointErr) {
      console.error("regRepointErr:", regRepointErr);
      throw new ApiError("Failed to update registrations to new head.", 500);
    }

    // ── I) Patch EVENT-SCOPED snapshots so the Edit modal shows correct roles for THIS event
    // Promotee's registration snapshot → relationship_to_family_head = "Head"
    const { data: promoteReg, error: promoteRegErr } = await supabase
      .from("evacuation_registrations")
      .select("id, profile_snapshot")
      .eq("evacuee_resident_id", toEvac)
      .eq("disaster_evacuation_event_id", eventIdNum)
      .maybeSingle();
    if (promoteRegErr) {
      console.error("promoteRegErr:", promoteRegErr);
      throw new ApiError("Failed to load promoted member registration.", 500);
    }
    if (promoteReg?.id) {
      const pSnap = promoteReg.profile_snapshot || {};
      const patched = { ...pSnap, relationship_to_family_head: "Head" };
      const { error: promoteSnapUpdErr } = await supabase
        .from("evacuation_registrations")
        .update({ profile_snapshot: patched, updated_at: nowIso })
        .eq("id", promoteReg.id);
      if (promoteSnapUpdErr) {
        console.error("promoteSnapUpdErr:", promoteSnapUpdErr);
        throw new ApiError("Failed to update promoted member event snapshot.", 500);
      }
    }

    // Old head's registration snapshot in THIS event → relationship_to_family_head = given demoted role
    const oldEvacId = oldHeadEvacueeRow.id;
    const { data: oldReg, error: oldRegErr } = await supabase
      .from("evacuation_registrations")
      .select("id, profile_snapshot")
      .eq("evacuee_resident_id", oldEvacId)
      .eq("disaster_evacuation_event_id", eventIdNum)
      .maybeSingle();
    if (oldRegErr) {
      console.error("oldRegErr:", oldRegErr);
      throw new ApiError("Failed to load old head registration.", 500);
    }
    if (oldReg?.id) {
      const oSnap = oldReg.profile_snapshot || {};
      const patched = { ...oSnap, relationship_to_family_head: old_head_new_relationship };
      const { error: oldSnapUpdErr } = await supabase
        .from("evacuation_registrations")
        .update({ profile_snapshot: patched, updated_at: nowIso })
        .eq("id", oldReg.id);
      if (oldSnapUpdErr) {
        console.error("oldSnapUpdErr:", oldSnapUpdErr);
        throw new ApiError("Failed to update old head event snapshot.", 500);
      }
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