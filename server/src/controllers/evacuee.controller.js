// evacuee.controller.js

const supabase = require('../config/supabase');

class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * @desc Register an evacuee and attach vulnerabilities
 * @route POST /api/v1/evacuees
 * @access Private (Camp Manager only)
 */
exports.registerEvacuee = async (req, res, next) => {
  const {
    resident_id,
    marital_status,
    educational_attainment,
    school_of_origin,
    occupation,
    purok,
    family_head_id,
    relationship_to_family_head,
    date_registered,
    is_pwd,
    is_minor,
    is_senior,
    is_pregnant,
    is_lactating
  } = req.body;

  try {
    if (!resident_id || !marital_status || !educational_attainment || !purok || !relationship_to_family_head) {
      return next(new ApiError('Missing required fields.', 400));
    }

    const { data: resident, error: residentError } = await supabase
      .from('residents')
      .select('id')
      .eq('id', resident_id)
      .single();

    if (residentError || !resident) {
      return next(new ApiError(`Resident with ID ${resident_id} not found.`, 404));
    }

    const isHead = relationship_to_family_head === 'Head';
    const effectiveFamilyHeadId = isHead ? null : family_head_id;

    if (!isHead && !effectiveFamilyHeadId) {
      return next(new ApiError('Family head ID is required if evacuee is not the head.', 400));
    }

    // Insert evacuee record (family_head_id can be null if head)
    const { data: evacueeData, error: evacueeError } = await supabase
      .from('evacuee_residents')
      .insert([{
        resident_id,
        marital_status,
        educational_attainment,
        school_of_origin,
        occupation,
        purok,
        family_head_id: effectiveFamilyHeadId,
        relationship_to_family_head,
        date_registered: date_registered || new Date().toISOString()
      }])
      .select()
      .single();

    if (evacueeError) {
      console.error('Evacuee insert error:', evacueeError);
      return next(new ApiError('Failed to register evacuee.', 500));
    }

    const evacueeId = evacueeData.id;

    // If this evacuee is the head, update their own record with self-reference
    if (isHead) {
      const { error: updateError } = await supabase
        .from('evacuee_residents')
        .update({ family_head_id: evacueeId })
        .eq('id', evacueeId);

      if (updateError) {
        console.error('Failed to update family_head_id for head:', updateError);
        return next(new ApiError('Evacuee created but failed to update family head ID.', 500));
      }

      // Update response data to reflect new family_head_id
      evacueeData.family_head_id = evacueeId;
    }

    // Handle vulnerabilities
    const vulnerabilities = [];
    if (is_pwd) vulnerabilities.push(4);
    if (is_minor) vulnerabilities.push(2);
    if (is_senior) vulnerabilities.push(3);
    if (is_pregnant) vulnerabilities.push(5);
    if (is_lactating) vulnerabilities.push(6);

    if (vulnerabilities.length > 0) {
      const vulnInserts = vulnerabilities.map(vuln_id => ({
        evacuee_resident_id: evacueeId,
        vulnerability_type_id: vuln_id
      }));

      const { error: vulnError } = await supabase
        .from('resident_vulnerabilities')
        .insert(vulnInserts);

      if (vulnError) {
        console.error('Vulnerability insert error:', vulnError);
        return next(new ApiError('Failed to associate vulnerabilities.', 500));
      }
    }

    return res.status(201).json({
      message: 'Evacuee registered successfully.',
      data: {
        evacuee: evacueeData,
        vulnerability_type_ids: vulnerabilities
      }
    });

  } catch (err) {
    console.error('RegisterEvacuee Error:', err);
    return next(new ApiError('Internal server error during evacuee registration.', 500));
  }
};


/**
 * @desc Get an evacuee's details by ID including resident & vulnerabilities
 * @route GET /api/v1/evacuees/:id
 * @access Private
 */
exports.getEvacueeById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const { data: evacuee, error: evacueeError } = await supabase
      .from('evacuee_residents')
      .select('*')
      .eq('id', id)
      .single();

    if (evacueeError || !evacuee) {
      return next(new ApiError(`Evacuee with ID ${id} not found.`, 404));
    }

    const { data: resident, error: residentError } = await supabase
      .from('residents')
      .select('*')
      .eq('id', evacuee.resident_id)
      .single();

    if (residentError || !resident) {
      return next(new ApiError('Resident data not found.', 404));
    }

    const { data: vulnerabilityLinks, error: vulnError } = await supabase
      .from('resident_vulnerabilities')
      .select('vulnerability_type_id, vulnerability_types(name)')
      .eq('evacuee_resident_id', id);

    if (vulnError) {
      console.error('Vulnerability fetch error:', vulnError);
      return next(new ApiError('Error fetching vulnerabilities.', 500));
    }

    const vulnerabilities = vulnerabilityLinks.map(v => v.vulnerability_types.name);

    return res.status(200).json({
      evacuee: {
        id: evacuee.id,
        resident: resident,
        marital_status: evacuee.marital_status,
        educational_attainment: evacuee.educational_attainment,
        school_of_origin: evacuee.school_of_origin,
        occupation: evacuee.occupation,
        purok: evacuee.purok,
        family_head_id: evacuee.family_head_id,
        relationship_to_family_head: evacuee.relationship_to_family_head,
        date_registered: evacuee.date_registered,
        vulnerabilities: vulnerabilities
      }
    });

  } catch (err) {
    console.error('GetEvacueeById Error:', err);
    return next(new ApiError('Internal server error during evacuee fetch.', 500));
  }
};

/**
 * @desc Register evacuee to an evacuation center room
 * @route POST /api/v1/evacuees/register-evacuation
 * @access Private (Camp Manager only)
 */
exports.registerEvacuation = async (req, res, next) => {
  const {
    evacuee_resident_id,
    disaster_evacuation_event_id,
    family_head_id,
    arrival_timestamp,
    decampment_timestamp,
    ec_rooms_id,
    reported_age_at_arrival
  } = req.body;

  try {
    if (
      !evacuee_resident_id ||
      !disaster_evacuation_event_id ||
      !family_head_id ||
      !arrival_timestamp ||
      !ec_rooms_id ||
      !reported_age_at_arrival
    ) {
      return next(new ApiError('Missing required evacuation registration fields.', 400));
    }

    // Optional: validate evacuee exists
    const { data: evacuee, error: evacueeError } = await supabase
      .from('evacuee_residents')
      .select('id')
      .eq('id', evacuee_resident_id)
      .single();

    if (evacueeError || !evacuee) {
      return next(new ApiError(`Evacuee ID ${evacuee_resident_id} not found.`, 404));
    }

    const { data: inserted, error: insertError } = await supabase
      .from('evacuation_registrations')
      .insert([{
        evacuee_resident_id,
        disaster_evacuation_event_id,
        family_head_id,
        arrival_timestamp,
        decampment_timestamp: decampment_timestamp || null, 
        ec_rooms_id,
        reported_age_at_arrival,
        created_at: new Date().toISOString() 
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Evacuation registration error:', insertError);
      return next(new ApiError('Failed to register evacuation.', 500));
    }

    return res.status(201).json({
      message: 'Evacuation registration successful.',
      data: inserted
    });

  } catch (err) {
    console.error('registerEvacuation Error:', err);
    return next(new ApiError('Internal server error during evacuation registration.', 500));
  }
};
/**
 * @desc Get evacuation registration details by ID
 * @route GET /api/v1/evacuees/registration/:id
 * @access Private
 */
exports.getRegisterEvacuationById = async (req, res, next) => {
  const { id } = req.params;

  try {
    // Get evacuation registration record
    const { data: registration, error: regError } = await supabase
      .from('evacuation_registrations')
      .select('*')
      .eq('id', id)
      .single();

    if (regError || !registration) {
      return next(new ApiError(`Evacuation registration with ID ${id} not found.`, 404));
    }

    // Get evacuee resident details
    const { data: evacuee, error: evacueeError } = await supabase
      .from('evacuee_residents')
      .select('id, resident_id, relationship_to_family_head')
      .eq('id', registration.evacuee_resident_id)
      .single();

    if (evacueeError || !evacuee) {
      return next(new ApiError('Evacuee resident data not found.', 404));
    }

    // Get resident details
    const { data: resident, error: residentError } = await supabase
      .from('residents')
      .select('*')
      .eq('id', evacuee.resident_id)
      .single();

    if (residentError || !resident) {
      return next(new ApiError('Resident data not found.', 404));
    }

    // Get disaster event
    const { data: disasterEvent, error: eventError } = await supabase
      .from('disaster_evacuation_event')
      .select('id, disaster_id, evacuation_center_id, evacuation_start_date, evacuation_end_date')
      .eq('id', registration.disaster_evacuation_event_id)
      .single();

    if (eventError || !disasterEvent) {
      return next(new ApiError('Disaster evacuation event not found.', 404));
    }

    // Get evacuation center room info
    const { data: room, error: roomError } = await supabase
      .from('evacuation_center_rooms')
      .select('id, room_name, individual_room_capacity, room_type')
      .eq('id', registration.ec_rooms_id)
      .single();

    if (roomError || !room) {
      return next(new ApiError('Evacuation center room not found.', 404));
    }

    return res.status(200).json({
      registration: {
        id: registration.id,
        arrival_timestamp: registration.arrival_timestamp,
        decampment_timestamp: registration.decampment_timestamp,
        reported_age_at_arrival: registration.reported_age_at_arrival,
        evacuee: {
          id: evacuee.id,
          relationship_to_family_head: evacuee.relationship_to_family_head,
          resident: resident
        },
        disaster_event: disasterEvent,
        evacuation_room: room
      }
    });

  } catch (err) {
    console.error('getRegisterEvacuationById Error:', err);
    return next(new ApiError('Internal server error during evacuation registration fetch.', 500));
  }
};

/**
 * @desc Get evacuation details and demographic breakdown by family head ID
 * @route GET /api/v1/evacuees/family/:family_head_id
 * @access Private
 */
exports.getRegisterEvacuationByFamilyId = async (req, res, next) => {
  const { family_head_id } = req.params;

  try {
    // Get all evacuees linked to this family head
    const { data: evacuees, error: evacueesError } = await supabase
      .from('evacuee_residents')
      .select(`
        id,
        resident_id,
        relationship_to_family_head,
        date_registered,
        residents (
          first_name,
          last_name,
          birthdate,
          sex,
          barangay_of_origin,
          barangays ( name )
        )
      `)
      .eq('family_head_id', parseInt(family_head_id));

    if (evacueesError || !evacuees || evacuees.length === 0) {
      return next(new ApiError('No evacuees found for this family.', 404));
    }

    // Get vulnerabilities for all evacuees
    const evacueeIds = evacuees.map(e => e.id);
    const { data: vulnerabilities, error: vulnError } = await supabase
      .from('resident_vulnerabilities')
      .select('evacuee_resident_id, vulnerability_types(name)')
      .in('evacuee_resident_id', evacueeIds);

    if (vulnError) {
      console.error('Error fetching vulnerabilities:', vulnError);
      return next(new ApiError('Failed to fetch vulnerabilities.', 500));
    }

    // Get arrival timestamps
    const { data: registrations, error: regError } = await supabase
      .from('evacuation_registrations')
      .select('evacuee_resident_id, arrival_timestamp')
      .in('evacuee_resident_id', evacueeIds);

    if (regError) {
      console.error('Error fetching registrations:', regError);
      return next(new ApiError('Failed to fetch arrival timestamps.', 500));
    }

    // Initialize summary object
    const now = new Date();
    const summary = {
      total_male: 0,
      total_female: 0,
      total_individuals: evacuees.length,
      infant: 0,
      children: 0,
      youth: 0,
      adult: 0,
      senior_citizens: 0,
      pwd: 0,
      pregnant: 0,
      lactating: 0
    };

    // Build list of family members
    const familyMembers = evacuees.map(evacuee => {
      const resident = evacuee.residents;
      const birthdate = new Date(resident.birthdate);
      const age = Math.floor((now - birthdate) / (365.25 * 24 * 60 * 60 * 1000));

      // Count by sex
      if (resident.sex === 'Male') summary.total_male++;
      if (resident.sex === 'Female') summary.total_female++;

      // Count by age group
      if (age <= 2) summary.infant++;
      else if (age <= 12) summary.children++;
      else if (age <= 17) summary.youth++;
      else if (age <= 59) summary.adult++;
      else summary.senior_citizens++;

      // Get vulnerabilities
      const vtypes = vulnerabilities
        .filter(v => v.evacuee_resident_id === evacuee.id)
        .map(v => v.vulnerability_types.name);

      if (vtypes.includes('PWD')) summary.pwd++;
      if (vtypes.includes('Pregnant')) summary.pregnant++;
      if (vtypes.includes('Lactating')) summary.lactating++;

      // Get arrival timestamp
      const arrival = registrations.find(r => r.evacuee_resident_id === evacuee.id)?.arrival_timestamp || null;

      return {
        full_name: `${resident.first_name} ${resident.last_name}`,
        age,
        barangay_of_origin: resident.barangays?.name || 'Unknown',
        sex: resident.sex,
        vulnerability_types: vtypes,
        arrival_timestamp: arrival
      };
    });

    // Return structured response
    return res.status(200).json({
      summary,
      family_members: familyMembers
    });

  } catch (err) {
    console.error('getRegisterEvacuationByFamilyId Error:', err);
    return next(new ApiError('Internal server error while fetching family evacuation details.', 500));
  }
};

