// server/src/controllers/evacuees.edit.controller.js
const { supabase } = require('../config/supabase');

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
    if (typeof v === 'object') return v;
    if (typeof v === 'string') {
      try { return JSON.parse(v); } catch { return null; }
    }
    return null;
  };

  const buildFullName = ({ first_name, middle_name, last_name, suffix }) => {
    const parts = [first_name, middle_name, last_name].filter(Boolean);
    const full = parts.join(' ');
    return suffix ? `${full} ${suffix}` : full;
  };

  // Normalize snapshot builder (keeps null when suffix cleared)
  const buildSnapshot = (src = {}) => ({
    first_name: src.first_name ?? null,
    middle_name: src.middle_name ?? null,
    last_name: src.last_name ?? null,
    suffix:
      typeof src.suffix === 'string' && src.suffix.trim() !== ''
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
      .from('evacuee_residents')
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
      .eq('id', evacueeResidentId)
      .single();

    if (evacueeErr || !evacuee) {
      return next(new ApiError('Evacuee not found.', 404));
    }

    // 2) Event-scoped registration
    const { data: registration, error: regErr } = await supabase
      .from('evacuation_registrations')
      .select(`
        id,
        ec_rooms_id,
        arrival_timestamp,
        decampment_timestamp,
        reported_age_at_arrival,
        profile_snapshot,
        vulnerability_type_ids
      `)
      .eq('evacuee_resident_id', evacueeResidentId)
      .eq('disaster_evacuation_event_id', disasterEvacuationEventId)
      .maybeSingle();

    if (regErr) {
      return next(new ApiError('Failed to load registration for this event.', 500));
    }

    // 3) Parse snapshot if needed
    const snapRow = parseJsonMaybe(registration?.profile_snapshot);

    // 4) Merge fields (event snapshot first, then global)
    const mergedBase = {
      first_name: snapRow?.first_name ?? evacuee.residents?.first_name ?? null,
      middle_name: snapRow?.middle_name ?? evacuee.residents?.middle_name ?? null,
      last_name: snapRow?.last_name ?? evacuee.residents?.last_name ?? null,
      // allow null from event snapshot (cleared suffix)
      suffix: (snapRow && 'suffix' in snapRow)
        ? (snapRow.suffix ?? null)
        : (evacuee.residents?.suffix ?? null),
      sex: snapRow?.sex ?? evacuee.residents?.sex ?? null,
      birthdate: snapRow?.birthdate ?? evacuee.residents?.birthdate ?? null,
      barangay_of_origin: (snapRow && 'barangay_of_origin' in snapRow)
        ? (snapRow.barangay_of_origin ?? null)
        : (evacuee.residents?.barangay_of_origin ?? null),
      purok: (snapRow && 'purok' in snapRow)
        ? (snapRow.purok ?? null)
        : (evacuee.purok ?? null),
      marital_status: (snapRow && 'marital_status' in snapRow)
        ? (snapRow.marital_status ?? null)
        : (evacuee.marital_status ?? null),
      educational_attainment: (snapRow && 'educational_attainment' in snapRow)
        ? (snapRow.educational_attainment ?? null)
        : (evacuee.educational_attainment ?? null),
      occupation: (snapRow && 'occupation' in snapRow)
        ? (snapRow.occupation ?? null)
        : (evacuee.occupation ?? null),
      school_of_origin: (snapRow && 'school_of_origin' in snapRow)
        ? (snapRow.school_of_origin ?? null)
        : (evacuee.school_of_origin ?? null),
    };

    const eventRel =
      (snapRow && 'relationship_to_family_head' in snapRow
        ? (snapRow.relationship_to_family_head ?? null)
        : null) ??
      evacuee.relationship_to_family_head ??
      null;

    const snap = buildSnapshot({ ...mergedBase, relationship_to_family_head: eventRel });

    // 5) Normalize vulnerabilities
    let vulnIds = [];
    if (Array.isArray(registration?.vulnerability_type_ids)) {
      vulnIds = registration.vulnerability_type_ids.map(Number).filter(Number.isFinite);
    } else {
      const parsed = parseJsonMaybe(registration?.vulnerability_type_ids);
      if (Array.isArray(parsed)) {
        vulnIds = parsed.map(Number).filter(Number.isFinite);
      }
    }

    return res.status(200).json({
      id: evacuee.id,

      // Residents (event snapshot first)
      first_name: snap.first_name,
      middle_name: snap.middle_name,
      last_name: snap.last_name,
      suffix: snap.suffix,
      birthdate: snap.birthdate,
      sex: snap.sex,
      barangay_of_origin: snap.barangay_of_origin,

      // Evacuee-residents (event snapshot first where applicable)
      marital_status: snap.marital_status,
      educational_attainment: snap.educational_attainment,
      school_of_origin: snap.school_of_origin,
      occupation: snap.occupation,
      purok: snap.purok,

      // Event-scoped relationship
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

      // Provide merged snapshot
      profile_snapshot: snap,
    });
  } catch (err) {
    console.error('[edit] getEvacueeDetailsForEdit error:', err);
    return next(new ApiError('Internal server error.', 500));
  }
};
