// evacuees.event-evacuees-information.controller.js

const { supabase } = require('../config/supabase');
const { validateId } = require('../utils/validateInput');
const logger = require('../utils/logger');

class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

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
  // Use validated params from middleware if available, otherwise validate manually
  let eventId = req.validatedParams?.disasterEvacuationEventId;
  
  if (!eventId) {
    // Fallback validation if middleware not used
    const rawId = req.params.disasterEvacuationEventId ?? req.params.id;
    const idValidation = validateId(rawId, 'integer');

    if (!idValidation.isValid) {
      logger.warn('Invalid disaster evacuation event ID provided for evacuees information', {
        path: req.path,
        providedId: rawId,
        error: idValidation.error,
        ip: req.ip
      });
      return next(new ApiError(idValidation.error, 400));
    }

    eventId = idValidation.sanitized;
  }

  logger.info('Fetching evacuees information for disaster evacuation event', {
    disasterEvacuationEventId: eventId,
    path: req.path,
    ip: req.ip
  });

  const parseJsonMaybe = (v) => {
    if (v == null) return null;
    if (typeof v === 'object') return v;
    if (typeof v === 'string') { try { return JSON.parse(v); } catch { return null; } }
    return null;
  };
  const has = (obj, key) => obj != null && Object.prototype.hasOwnProperty.call(obj, key);

  const buildFullName = ({ first_name, middle_name, last_name, suffix }) => {
    const parts = [first_name, middle_name, last_name].filter(Boolean);
    const full = parts.join(' ');
    return suffix ? `${full} ${suffix}` : full;
  };

  // Prefer snapshot barangay_of_origin; if it's a number, map id->name from barangays
  const resolveBarangayNameFactory = (barangayNameById) => (snapValue, residentJoinName) => {
    if (snapValue !== undefined && snapValue !== null) {
      const num = Number(snapValue);
      if (Number.isFinite(num)) {
        return barangayNameById.get(num) || residentJoinName || 'Unknown';
      }
      if (typeof snapValue === 'string' && snapValue.trim() !== '') {
        return snapValue.trim(); // legacy free-text label
      }
    }
    return residentJoinName || 'Unknown';
  };

  try {
    // --- Fallback: get the event's EC name (works for Private House too)
    let fallbackEventLocationName = null;

    try {
      const { data: eventRow, error: evtErr } = await supabase
        .from('disaster_evacuation_event')
        .select(`
          id,
          evacuation_center_id,
          evacuation_centers:evacuation_center_id (
            id,
            name,
            category
          )
        `)
        .eq('id', eventId)
        .maybeSingle();

  if (evtErr) {
    logger.warn('Event fetch failed', {
      disasterEvacuationEventId: eventId,
      error: evtErr
    });
  }
  logger.debug('Event row fetched', {
    disasterEvacuationEventId: eventId,
    hasEvacuationCenter: !!eventRow?.evacuation_centers
  });

      // Primary: name from joined center
      fallbackEventLocationName = eventRow?.evacuation_centers?.name ?? null;

      // Safety net: direct fetch by id if the join didn't hydrate
      if (!fallbackEventLocationName && eventRow?.evacuation_center_id) {
        const { data: ecRow, error: ecErr } = await supabase
          .from('evacuation_centers')
          .select('id, name, category')
          .eq('id', eventRow.evacuation_center_id)
          .maybeSingle();

    if (ecErr) {
      logger.warn('Evacuation center fetch by id failed', {
        evacuationCenterId: eventRow.evacuation_center_id,
        error: ecErr
      });
    }
    logger.debug('Evacuation center row fetched', {
      evacuationCenterId: eventRow.evacuation_center_id,
      centerName: ecRow?.name
    });

        fallbackEventLocationName = ecRow?.name ?? null;
      }

  logger.debug('Fallback event location name determined', {
    disasterEvacuationEventId: eventId,
    locationName: fallbackEventLocationName
  });
} catch (e) {
  logger.warn('Could not fetch event location name', {
    disasterEvacuationEventId: eventId,
    error: e.message
  });
}



    // 0) vulnerability type names
    const { data: vulnTypes, error: vulnTypesErr } = await supabase
      .from('vulnerability_types')
      .select('id, name');
    if (vulnTypesErr) {
      logger.warn('Failed to fetch vulnerability types', {
        disasterEvacuationEventId: eventId,
        error: vulnTypesErr
      });
    }
    const vulnNameById = new Map((vulnTypes || []).map((v) => [Number(v.id), v.name]));

    // 0.1) barangay id -> name map (for snapshot numeric values)
    const { data: brgyRows, error: brgyErr } = await supabase
      .from('barangays')
      .select('id, name');
    if (brgyErr) {
      logger.warn('Failed to fetch barangays', {
        disasterEvacuationEventId: eventId,
        error: brgyErr
      });
    }
    const barangayNameById = new Map((brgyRows || []).map((b) => [Number(b.id), b.name]));
    const resolveBarangayName = resolveBarangayNameFactory(barangayNameById);

    // 1) registrations for this event (include resident + barangay join via FK)
    const { data: registrations, error: regError } = await supabase
      .from('evacuation_registrations')
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
      .eq('disaster_evacuation_event_id', eventId);

    if (regError) {
      logger.error('Failed to fetch evacuation registrations', {
        disasterEvacuationEventId: eventId,
        error: regError,
        path: req.path
      });
      return next(new ApiError('Failed to fetch registrations', 500));
    }
    if (!registrations || registrations.length === 0) {
      logger.info('No registrations found for disaster evacuation event', {
        disasterEvacuationEventId: eventId,
        path: req.path
      });
      return res.status(200).json([]);
    }

    logger.info('Registrations fetched successfully', {
      disasterEvacuationEventId: eventId,
      registrationCount: registrations.length,
      path: req.path
    });

    // 2) group by family_head_id
    const familyGroups = new Map();
    for (const r of registrations) {
      const fhId = r.family_head_id ?? null;
      if (!familyGroups.has(fhId)) familyGroups.set(fhId, []);
      familyGroups.get(fhId).push(r);
    }

    // --- Bulk fetch services for all visible families in this event ---
    const familyHeadIds = Array.from(familyGroups.keys()).filter((x) => Number.isFinite(x));
    let servicesByFamilyId = new Map();

    if (familyHeadIds.length > 0) {
      const { data: serviceRows, error: svcErr } = await supabase
        .from('services')
        .select('family_id, service_received, created_at')
        .in('family_id', familyHeadIds)
        .eq('disaster_evacuation_event_id', eventId)
        .order('created_at', { ascending: false });

  if (svcErr) {
    logger.warn('Failed to fetch services for families', {
      disasterEvacuationEventId: eventId,
      familyHeadIdCount: familyHeadIds.length,
      error: svcErr
    });
  } else {
    servicesByFamilyId = serviceRows.reduce((map, row) => {
      const fid = Number(row.family_id);
      const arr = map.get(fid) || [];
      arr.push({
        service_received: row.service_received,
        created_at: row.created_at,              // <-- keep created_at
      });
      map.set(fid, arr);
      return map;
    }, new Map());
    logger.debug('Services fetched for families', {
      disasterEvacuationEventId: eventId,
      serviceCount: serviceRows?.length || 0,
      familiesWithServices: servicesByFamilyId.size
    });
  }
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
        const first_name  = has(snap, 'first_name')  ? (snap.first_name  ?? null) : (resident.first_name  ?? null);
        const middle_name = has(snap, 'middle_name') ? (snap.middle_name ?? null) : (resident.middle_name ?? null);
        const last_name   = has(snap, 'last_name')   ? (snap.last_name   ?? null) : (resident.last_name   ?? null);
        const suffix      = has(snap, 'suffix')      ? (snap.suffix      ?? null) : (resident.suffix      ?? null);
        const sexVal      = has(snap, 'sex')         ? (snap.sex         ?? 'Unknown') : (resident.sex ?? 'Unknown');
        const birthdate   = has(snap, 'birthdate')   ? (snap.birthdate   ?? null)      : (resident.birthdate ?? null);

        // barangay: prefer snapshot.barangay_of_origin (ID or string), fallback to resident join name
        const barangayFromResident = resident?.barangays?.name || 'Unknown';
        const barangayName = resolveBarangayName(snap.barangay_of_origin, barangayFromResident);

        // age + buckets
        let ageStr = '—';
        if (birthdate) {
          const birth = new Date(birthdate);
          const today = new Date();
          const y = today.getFullYear() - birth.getFullYear();
          const m = today.getMonth() - birth.getMonth();
          const d = today.getDate() - birth.getDate();
          let totalMonths = y * 12 + m - (d < 0 ? 1 : 0);
          totalMonths = Math.max(0, totalMonths);

          if (totalMonths <= 12) {
            ageStr = `${totalMonths} month${totalMonths === 1 ? '' : 's'}`;
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

        if (sexVal === 'Male') summary.total_no_of_male++;
        else if (sexVal === 'Female') summary.total_no_of_female++;

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
          has(snap, 'relationship_to_family_head')
            ? (snap.relationship_to_family_head ?? null)
            : (er.relationship_to_family_head ?? null);

        return {
          evacuee_id: member.evacuee_resident_id,
          resident_id: resident.id ?? null,
          full_name: memberFullName || 'Unknown',
          age: ageStr,
          barangay_of_origin: barangayName, // snapshot-first
          sex: sexVal,
          vulnerability_types: vulnNames,
          room_name: member?.ec_rooms?.room_name || 'Unknown',
          arrival_timestamp: member.arrival_timestamp || null,
          relationship_to_family_head: relationship,
          _snap: snap,
          _resident: resident,
        };
      });

      // Head-of-family display
      const headMember =
        familyMembers.find((m) => m.relationship_to_family_head === 'Head') || familyMembers[0];

      let family_head_full_name = 'Unknown';
      let family_head_barangay = 'Unknown';
      if (headMember) {
        const snapH = headMember._snap || {};
        const residentH = headMember._resident || {};

        const first_nameH  = has(snapH, 'first_name')  ? (snapH.first_name  ?? null) : (residentH.first_name  ?? null);
        const middle_nameH = has(snapH, 'middle_name') ? (snapH.middle_name ?? null) : (residentH.middle_name ?? null);
        const last_nameH   = has(snapH, 'last_name')   ? (snapH.last_name   ?? null) : (residentH.last_name   ?? null);
        const suffixH      = has(snapH, 'suffix')      ? (snapH.suffix      ?? null) : (residentH.suffix      ?? null);

        family_head_full_name = buildFullName({
          first_name: first_nameH, middle_name: middle_nameH, last_name: last_nameH, suffix: suffixH,
        });

        const residentJoinBrgy = residentH?.barangays?.name || 'Unknown';
        family_head_barangay = resolveBarangayName(snapH.barangay_of_origin, residentJoinBrgy);
      }

      const first = members[0] || {};
      response.push({
        id: familyHeadId,
        disaster_evacuation_event_id: eventId,
        family_head_full_name,
        barangay: family_head_barangay,
        total_individuals: members.length,
        room_name: first?.ec_rooms?.room_name || 'Unknown',
        decampment_timestamp: first?.decampment_timestamp || null,
        view_family: {
          evacuation_center_name: first?.ec_rooms?.evacuation_centers?.name || fallbackEventLocationName || 'Unknown',
          head_of_family: family_head_full_name,
          decampment: first?.decampment_timestamp || null,
          summary_per_family: summary,
        },
        list_of_family_members: {
          family_members: familyMembers.map(({ _snap, _resident, ...pub }) => pub),
        },
        relief_goods_and_services: servicesByFamilyId.get(Number(familyHeadId)) || [],
      });
    }

    logger.info('Successfully retrieved evacuees information', {
      disasterEvacuationEventId: eventId,
      familyCount: response.length,
      totalIndividuals: response.reduce((sum, fam) => sum + fam.total_individuals, 0),
      path: req.path
    });

    return res.status(200).json(response);
  } catch (error) {
    logger.error('Fatal error in getEvacueesInformationbyDisasterEvacuationEventId', {
      disasterEvacuationEventId: eventId,
      error: error.message,
      stack: error.stack,
      path: req.path
    });
    return next(new ApiError('Internal server error', 500));
  }
};
