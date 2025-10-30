// server/src/controllers/evacuees.update-registration.controller.js
const { supabase } = require('../config/supabase');
const { invalidateEvacueeSearchCache } = require('./evacuees.search.controller');
const logger = require('../utils/logger');

class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

exports.updateEvacuee = async (req, res, next) => {
  const { id } = req.params;

  const {
    first_name, middle_name, last_name, suffix, birthdate, sex,
    barangay_of_origin, marital_status, educational_attainment,
    school_of_origin, occupation, purok,

    family_head_id, relationship_to_family_head,

    is_infant, is_children, is_youth, is_adult, is_senior,
    is_pwd, is_pregnant, is_lactating,
    
    ec_rooms_id, disaster_evacuation_event_id,
  } = req.body;

  if (!disaster_evacuation_event_id) {
    logger.warn('Missing disaster_evacuation_event_id for updateEvacuee', { id, bodyKeys: Object.keys(req.body || {}) });
    return next(new ApiError('disaster_evacuation_event_id is required for updates.', 400));
  }
  if (!id || Number.isNaN(Number(id))) {
    logger.warn('Invalid evacuee id for updateEvacuee', { id });
    return next(new ApiError('Invalid evacuee id.', 400));
  }

  logger.debug('updateEvacuee payload (sanitized)', {
    id,
    disaster_evacuation_event_id,
    family_head_id,
    relationship_to_family_head,
    flags: { is_infant, is_children, is_youth, is_adult, is_senior, is_pwd, is_pregnant, is_lactating },
    ec_rooms_id
  });

  const computeAge = (iso) => {
    if (!iso) return 0;
    const today = new Date();
    const birth = new Date(iso);
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
      typeof src.suffix === 'string' && src.suffix.trim() !== ''
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
  if (suffix === null) normalizedSuffix = null;
  else if (typeof suffix === 'string') normalizedSuffix = suffix.trim() || null;
  else normalizedSuffix = undefined;

  let mutated = false; // <- track if any DB write succeeded

  try {
    const { data: evacueeRow, error: evacueeErr } = await supabase
      .from('evacuee_residents')
      .select(`
        id, resident_id, family_head_id, relationship_to_family_head,
        marital_status, educational_attainment, school_of_origin, occupation, purok,
        residents ( id, first_name, middle_name, last_name, suffix, birthdate, sex, barangay_of_origin )
      `)
      .eq('id', id)
      .single();

    if (evacueeErr || !evacueeRow) {
      logger.warn('Evacuee not found for update', { id, error: evacueeErr });
      return next(new ApiError('Evacuee not found.', 404));
    }

    const resident_id = evacueeRow.resident_id;

    const currentRel = evacueeRow.relationship_to_family_head || 'Head';
    const desiredRel =
      typeof relationship_to_family_head === 'string' && relationship_to_family_head.trim() !== ''
        ? relationship_to_family_head.trim()
        : currentRel;

    const wasHead = currentRel === 'Head';
    const isBecomingHead = desiredRel === 'Head';
    const isDemoting = wasHead && !isBecomingHead;

    if (isDemoting && evacueeRow.family_head_id) {
      const { count: familyCount, error: famCountErr } = await supabase
        .from('evacuation_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('family_head_id', evacueeRow.family_head_id)
        .eq('disaster_evacuation_event_id', disaster_evacuation_event_id);

      if (famCountErr) {
        logger.error('Failed to count family members during head demotion check', { famCountErr, id, disaster_evacuation_event_id });
        throw new ApiError('Failed to count family members.', 500);
      }
      if ((familyCount ?? 1) > 1) {
        logger.warn('Attempt to demote head while family members still assigned', {
          evacuee_id: id,
          family_head_id: evacueeRow.family_head_id,
          disaster_evacuation_event_id
        });
        return next(new ApiError(
          'Cannot demote the family head while other family members are still assigned in this event. Please transfer the head role to another member first.',
          409
        ));
      }
    }

    let resolved_family_head_id = null;
    if (isBecomingHead) {
      if (wasHead && evacueeRow.family_head_id) {
        resolved_family_head_id = evacueeRow.family_head_id;
      } else {
        const { data: existingHead, error: existingHeadErr } = await supabase
          .from('family_head')
          .select('id')
          .eq('resident_id', resident_id)
          .maybeSingle();
        if (existingHeadErr) {
          logger.error('Failed to look up head record', { resident_id, existingHeadErr });
          throw new ApiError('Failed to look up head record.', 500);
        }

        if (existingHead?.id) {
          resolved_family_head_id = existingHead.id;
        } else {
          const { data: newHead, error: newHeadErr } = await supabase
            .from('family_head')
            .insert([{ resident_id }])
            .select()
            .single();
          if (newHeadErr) {
            if (newHeadErr.code === '23505') {
              logger.error('Duplicate key on family_head.id sequence mismatch', { newHeadErr });
              throw new ApiError(
                `Failed to create family head. Duplicate key on 'family_head.id'. Run: SELECT setval(pg_get_serial_sequence('family_head','id'), (SELECT MAX(id) FROM family_head)+1);`,
                500
              );
            }
            logger.error('Failed to create family head', { newHeadErr });
            throw new ApiError('Failed to create family head.', 500);
          }
          resolved_family_head_id = newHead.id;
          mutated = true;
        }
      }
    } else {
      if (!family_head_id) {
        logger.warn('Missing family_head_id when relationship is not Head', { id, relationship_to_family_head, disaster_evacuation_event_id });
        return next(new ApiError('family_head_id is required when relationship_to_family_head is not "Head".', 400));
      }
      resolved_family_head_id = family_head_id;
    }

    const { data: regRow, error: regFindErr } = await supabase
      .from('evacuation_registrations')
      .select('id, arrival_timestamp, reported_age_at_arrival, ec_rooms_id')
      .eq('evacuee_resident_id', id)
      .eq('disaster_evacuation_event_id', disaster_evacuation_event_id)
      .maybeSingle();
    if (regFindErr) {
      logger.error('Failed to fetch evacuation registration', { id, disaster_evacuation_event_id, regFindErr });
      throw new ApiError('Failed to fetch evacuation registration.', 500);
    }

    if (!regRow) {
      const { data: otherActive, error: oaErr } = await supabase
        .from('evacuation_registrations')
        .select(`
          id,
          disaster_evacuation_event_id,
          decampment_timestamp,
          disaster_evacuation_event:disaster_evacuation_event_id ( id, evacuation_centers ( id, name ) )
        `)
        .eq('evacuee_resident_id', id)
        .is('decampment_timestamp', null);

      if (oaErr) {
        logger.error('Failed to verify active-registration state', { evacuee_id: id, oaErr });
        throw new ApiError('Failed to verify active-registration state.', 500);
      }

      if ((otherActive || []).length > 0) {
        const alreadyInTarget = otherActive.find(
          (r) => Number(r.disaster_evacuation_event_id) === Number(disaster_evacuation_event_id)
        );
        if (alreadyInTarget) {
          const ecName = alreadyInTarget?.disaster_evacuation_event?.evacuation_centers?.name || 'this evacuation center';
          logger.warn('Evacuee already actively registered in this event', { id, disaster_evacuation_event_id, ecName });
          return next(new ApiError(
            `This evacuee is already actively registered in this event (${ecName}). Use Edit to update the existing record.`,
            409
          ));
        }
        const ecName = otherActive[0]?.disaster_evacuation_event?.evacuation_centers?.name || 'another evacuation center';
        logger.warn('Evacuee still active in another event', { id, current_event: ecName });
        return next(new ApiError(
          `This evacuee is still actively registered in another event (${ecName}). Please decamp them first before registering here.`,
          409
        ));
      }
    }

    const snapshotSrc = {
      first_name: first_name !== undefined ? first_name : evacueeRow?.residents?.first_name,
      middle_name: middle_name !== undefined ? middle_name : evacueeRow?.residents?.middle_name,
      last_name: last_name !== undefined ? last_name : evacueeRow?.residents?.last_name,
      suffix: normalizedSuffix !== undefined ? normalizedSuffix : evacueeRow?.residents?.suffix,
      sex: sex !== undefined ? sex : evacueeRow?.residents?.sex,
      marital_status: marital_status !== undefined ? marital_status : evacueeRow?.marital_status,
      birthdate: birthdate !== undefined ? birthdate : evacueeRow?.residents?.birthdate,
      barangay_of_origin:
        barangay_of_origin !== undefined ? barangay_of_origin : evacueeRow?.residents?.barangay_of_origin,
      purok: purok !== undefined ? purok : evacueeRow?.purok,
      educational_attainment:
        educational_attainment !== undefined ? educational_attainment : evacueeRow?.educational_attainment,
      occupation: occupation !== undefined ? occupation : evacueeRow?.occupation,
      school_of_origin:
        school_of_origin !== undefined ? school_of_origin : evacueeRow?.school_of_origin,
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
      if (ec_rooms_id !== undefined) patch.ec_rooms_id = ec_rooms_id ?? null;

      const { error: regUpdateErr } = await supabase
        .from('evacuation_registrations')
        .update(patch)
        .eq('id', regRow.id);
      if (regUpdateErr) {
        logger.error('Failed to update evacuation registration', { reg_id: regRow.id, error: regUpdateErr });
        throw new ApiError('Failed to update evacuation registration.', 500);
      }
      mutated = true;
      logger.debug('Updated evacuation registration', { reg_id: regRow.id, evacuee_id: id });
    } else {
      const reported_age = computeAge(snapshot.birthdate);
      const { error: regInsertErr } = await supabase
        .from('evacuation_registrations')
        .insert([{
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
        }]);
      if (regInsertErr) {
        logger.error('Failed to create evacuation registration for this event', { evacuee_id: id, disaster_evacuation_event_id, error: regInsertErr });
        throw new ApiError('Failed to create evacuation registration for this event.', 500);
      }
      mutated = true;
      logger.debug('Inserted evacuation registration', { evacuee_id: id, disaster_evacuation_event_id });
    }

    logger.info('Evacuee updated successfully (event-scoped)', {
      evacuee_id: id,
      family_head_id: resolved_family_head_id,
      disaster_evacuation_event_id
    });

    return res.status(200).json({
      message: 'Evacuee updated successfully (event-scoped).',
      data: { evacuee_id: id, family_head_id: resolved_family_head_id },
    });
  } catch (err) {
    logger.error('UpdateEvacuee Error', { id, disaster_evacuation_event_id, message: err?.message, stack: err?.stack });
    return next(new ApiError('Internal server error during evacuee update.', 500));
  } finally {
    if (mutated) {
      try {
        logger.debug('Invalidating evacuee search cache after updateEvacuee', { evacuee_id: id, disaster_evacuation_event_id });
        invalidateEvacueeSearchCache();
      } catch (e) {
        logger.error('Failed to invalidate evacuee search cache after updateEvacuee', { error: e?.message });
      }
    }
  }
};
