// evacuee.controller.js
const { supabase } = require('../config/supabase');
const { invalidateEvacueeSearchCache } = require('./evacuees.search.controller');
const logger = require('../utils/logger');

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
  // Use validated body from middleware if available, otherwise fallback to req.body
  const validatedData = req.validatedBody || req.body;
  
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
  } = validatedData;

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
        logger.warn('[registerEvacuee] Existing evacuee not found', { existing_evacuee_resident_id, error: evacRowErr?.message });
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
        logger.warn('[registerEvacuee] Target disaster event not found', { disaster_evacuation_event_id, error: targetEventErr?.message });
        return next(new ApiError("Target disaster evacuation event not found.", 404));
      }

      // 2) Fetch the target room to get EC id
      let targetRoom = null;

      if (ec_rooms_id) {
        const { data: room, error: roomErr } = await supabase
          .from("evacuation_center_rooms")
          .select(`id, evacuation_center_id`)
          .eq("id", ec_rooms_id)
          .single();

        if (roomErr || !room) {
          logger.warn('[registerEvacuee] Target EC room not found', { ec_rooms_id, error: roomErr?.message });
          return next(new ApiError("Target EC room not found.", 404));
        }
        targetRoom = room;
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
        logger.error('[registerEvacuee] Failed to verify active registration state', { existing_evacuee_resident_id, error: activeRegsErr.message, details: activeRegsErr });
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
          logger.warn('[registerEvacuee] Evacuee already active in this event', { existing_evacuee_resident_id, disaster_evacuation_event_id, ecName });
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
        logger.warn('[registerEvacuee] Evacuee active in another event', { existing_evacuee_resident_id, otherEventId: first?.disaster_evacuation_event_id, ecName });
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
            logger.error('[registerEvacuee] Failed to look up head record', { resident_id, error: existingHeadErr.message, details: existingHeadErr });
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
                logger.error('[registerEvacuee] Duplicate key creating family head', { resident_id, code: newHeadErr.code });
                return next(
                  new ApiError(
                    `Failed to create family head. Duplicate key on 'family_head.id'. Run: SELECT setval(pg_get_serial_sequence('family_head','id'), (SELECT MAX(id) FROM family_head)+1);`,
                    500
                  )
                );
              }
              logger.error('[registerEvacuee] Failed to create family head', { resident_id, error: newHeadErr.message, details: newHeadErr });
              return next(new ApiError("Failed to create family head.", 500));
            }
            family_head_inserted_id = newHead.id;
          }
        }
      } else {
        if (!family_head_id) {
          logger.warn('[registerEvacuee] Missing family_head_id when not Head', { existing_evacuee_resident_id });
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
        logger.error('[registerEvacuee] Failed to insert registration (reuse branch)', { evacuee_id, disaster_evacuation_event_id, error: registrationError.message, details: registrationError });
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
        logger.error('[registerEvacuee] Failed to save event-scoped data (reuse branch)', { registration_id, error: regEventStateErr.message, details: regEventStateErr });
        return next(new ApiError("Failed to save event-scoped data.", 500));
      }

      // 7) Invalidate cache so new state is visible in search
      invalidateEvacueeSearchCache();
      logger.info('[registerEvacuee] Registered evacuee (existing person reused)', { evacuee_id, registration_id, disaster_evacuation_event_id });
      logger.debug('[registerEvacuee] registration snapshot (reuse)', { snapshot, vulnerability_type_ids: vulnIds });

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
        logger.error('[registerEvacuee] Duplicate key on residents.id (sequence mismatch?)', { code: residentError.code });
        throw new ApiError(
          `Failed to register resident. Duplicate key error on 'residents.id'. Likely sequence mismatch. Run: SELECT setval(pg_get_serial_sequence('residents','id'), (SELECT MAX(id) FROM residents)+1);`,
          500
        );
      }
      logger.error('[registerEvacuee] Supabase error on residents insert', { error: residentError.message, details: residentError });
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
          logger.error('[registerEvacuee] Duplicate key on family_head.id (sequence mismatch?)', { code: familyHeadError.code });
          throw new ApiError(
            `Failed to register family head. Duplicate key error on 'family_head.id'. Run: SELECT setval(pg_get_serial_sequence('family_head','id'), (SELECT MAX(id) FROM family_head)+1);`,
            500
          );
        }
        await supabase.from("residents").delete().eq("id", resident_id);
        logger.error('[registerEvacuee] Failed to register family head', { resident_id, error: familyHeadError.message, details: familyHeadError });
        throw new ApiError(
          `Failed to register family head. ${familyHeadError.message}`,
          500
        );
      }
      family_head_inserted_id = familyHeadData.id;
    } else {
      if (!family_head_id) {
        await supabase.from("residents").delete().eq("id", resident_id);
        logger.warn('[registerEvacuee] Missing family_head_id when creating non-head', { resident_id });
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
        logger.error('[registerEvacuee] Duplicate key on evacuee_residents.id (sequence mismatch?)', { code: evacueeError.code });
        throw new ApiError(
          `Failed to register evacuee. Duplicate key error on 'evacuee_residents.id'. Run: SELECT setval(pg_get_serial_sequence('evacuee_residents','id'), (SELECT MAX(id) FROM evacuee_residents)+1);`,
          500
        );
      }
      await supabase.from("residents").delete().eq("id", resident_id);
      logger.error('[registerEvacuee] Failed to register evacuee', { resident_id, error: evacueeError.message, details: evacueeError });
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
        logger.error('[registerEvacuee] Duplicate key on evacuation_registrations.id (sequence mismatch?)', { code: registrationError.code });
        throw new ApiError(
          `Failed to register evacuation. Duplicate key error on 'evacuation_registrations.id'. Run: SELECT setval(pg_get_serial_sequence('evacuation_registrations','id'), (SELECT MAX(id) FROM evacuation_registrations)+1);`,
          500
        );
      }
      await supabase.from("evacuee_residents").delete().eq("id", evacuee_id);
      await supabase.from("residents").delete().eq("id", resident_id);
      logger.error('[registerEvacuee] Failed to register evacuation (create branch)', { evacuee_id, disaster_evacuation_event_id, error: registrationError.message, details: registrationError });
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
      logger.error('[registerEvacuee] Failed to save event-scoped data (create branch)', { registration_id, error: regEventStateErr.message, details: regEventStateErr });
      throw new ApiError("Failed to save event-scoped data.", 500);
    }

    // Invalidate cache so searches reflect the new registration
    invalidateEvacueeSearchCache();
    logger.info('[registerEvacuee] Evacuee registered successfully', { evacuee_id, registration_id, disaster_evacuation_event_id });
    logger.debug('[registerEvacuee] registration snapshot (create)', { snapshot, vulnerability_type_ids: vulnerabilities });

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
    logger.error('RegisterEvacuee Error', { error: err?.message, stack: err?.stack });

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
