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
    is_pwd,
    is_minor,
    is_senior,
    is_pregnant,
    is_lactating,
    ec_rooms_id,
    disaster_evacuation_event_id
  } = req.body;

  let resident_id = null;
  let evacuee_id = null;
  let registration_id = null;

  try {
    // Insert into residents
    const { data: residentData, error: residentError } = await supabase
      .from('residents')
      .insert([{
        first_name,
        middle_name,
        last_name,
        suffix,
        birthdate,
        sex,
        barangay_of_origin
      }])
      .select()
      .single();

    if (residentError) {
      console.error('Resident insert error:', residentError);
      return next(new ApiError('Failed to register resident.', 500));
    }

    resident_id = residentData.id;

    // Compute age
    const birthdateObj = new Date(birthdate);
    const age = Math.floor((new Date() - birthdateObj) / (365.25 * 24 * 60 * 60 * 1000));

    // Determine if this evacuee is the head
    const isHead = relationship_to_family_head === 'Head';

    // Insert into evacuee_residents
    const { data: evacueeData, error: evacueeError } = await supabase
      .from('evacuee_residents')
      .insert([{
        resident_id,
        marital_status,
        educational_attainment,
        school_of_origin,
        occupation,
        purok,
        family_head_id: isHead ? null : family_head_id,
        relationship_to_family_head,
        date_registered: date_registered || new Date().toISOString()
      }])
      .select()
      .single();

    if (evacueeError) {
      console.error('Evacuee insert error:', evacueeError);
      // rollback residents
      await supabase.from('residents').delete().eq('id', resident_id);
      return next(new ApiError('Failed to register evacuee.', 500));
    }

    evacuee_id = evacueeData.id;

    // If Head, update own family_head_id = self
    let effectiveFamilyHeadId = family_head_id;
    if (isHead) {
      const updateResult = await supabase
        .from('evacuee_residents')
        .update({ family_head_id: evacuee_id })
        .eq('id', evacuee_id);

      if (updateResult.error) {
        console.error('Update family_head_id to self error:', updateResult.error);
        // rollback evacuee_residents and residents
        await supabase.from('evacuee_residents').delete().eq('id', evacuee_id);
        await supabase.from('residents').delete().eq('id', resident_id);
        return next(new ApiError('Failed to set family_head_id for head.', 500));
      }

      effectiveFamilyHeadId = evacuee_id;
    }

    // Insert into evacuation_registrations
    const { data: registrationData, error: registrationError } = await supabase
      .from('evacuation_registrations')
      .insert([{
        evacuee_resident_id: evacuee_id,
        disaster_evacuation_event_id,
        family_head_id: effectiveFamilyHeadId,
        arrival_timestamp: new Date().toISOString(),
        decampment_timestamp: null,
        reported_age_at_arrival: age,
        ec_rooms_id,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (registrationError) {
      console.error('Evacuation registration error:', registrationError);
      // rollback evacuee_residents and residents
      await supabase.from('evacuee_residents').delete().eq('id', evacuee_id);
      await supabase.from('residents').delete().eq('id', resident_id);
      return next(new ApiError('Failed to register evacuation.', 500));
    }

    registration_id = registrationData.id;

    // Handle vulnerabilities
    const vulnerabilities = [];
    if (is_pwd) vulnerabilities.push(4);
    if (is_minor) vulnerabilities.push(2);
    if (is_senior) vulnerabilities.push(3);
    if (is_pregnant) vulnerabilities.push(5);
    if (is_lactating) vulnerabilities.push(6);

    if (vulnerabilities.length > 0) {
      const vulnInserts = vulnerabilities.map(vuln_id => ({
        evacuee_resident_id: evacuee_id,
        vulnerability_type_id: vuln_id
      }));

      const { error: vulnError } = await supabase
        .from('resident_vulnerabilities')
        .insert(vulnInserts);

      if (vulnError) {
        console.error('Vulnerability insert error:', vulnError);
        // rollback all
        await supabase.from('evacuation_registrations').delete().eq('id', registration_id);
        await supabase.from('evacuee_residents').delete().eq('id', evacuee_id);
        await supabase.from('residents').delete().eq('id', resident_id);
        return next(new ApiError('Failed to associate vulnerabilities.', 500));
      }
    }

    // Success response
    return res.status(201).json({
      message: 'Evacuee registered successfully.',
      data: {
        evacuee: { ...evacueeData, family_head_id: effectiveFamilyHeadId },
        evacuation_registration: registrationData,
        vulnerability_type_ids: vulnerabilities
      }
    });

  } catch (err) {
    console.error('RegisterEvacuee Error:', err);

    // Final catch rollback (just in case)
    if (registration_id) await supabase.from('evacuation_registrations').delete().eq('id', registration_id);
    if (evacuee_id) await supabase.from('evacuee_residents').delete().eq('id', evacuee_id);
    if (resident_id) await supabase.from('residents').delete().eq('id', resident_id);

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
    // Fetch evacuee_resident
    const { data: evacuee, error: evacueeError } = await supabase
      .from('evacuee_residents')
      .select('*')
      .eq('id', id)
      .single();

    if (evacueeError || !evacuee) {
      return next(new ApiError(`Evacuee with ID ${id} not found.`, 404));
    }

    //  Fetch linked resident
    const { data: resident, error: residentError } = await supabase
      .from('residents')
      .select('*')
      .eq('id', evacuee.resident_id)
      .single();

    if (residentError || !resident) {
      return next(new ApiError('Resident data not found.', 404));
    }

    //  Fetch vulnerabilities
    const { data: vulnerabilityLinks, error: vulnError } = await supabase
      .from('resident_vulnerabilities')
      .select('vulnerability_type_id, vulnerability_types(name)')
      .eq('evacuee_resident_id', id);

    if (vulnError) {
      console.error('Vulnerability fetch error:', vulnError);
      return next(new ApiError('Error fetching vulnerabilities.', 500));
    }

    const vulnerabilities = vulnerabilityLinks.map(v => v.vulnerability_types.name);

    //  Fetch evacuation registration
    const { data: registration, error: regError } = await supabase
      .from('evacuation_registrations')
      .select('*')
      .eq('evacuee_resident_id', id)
      .single();

    if (regError || !registration) {
      return next(new ApiError('Evacuation registration not found.', 404));
    }

    // Return structured response
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
        vulnerabilities: vulnerabilities,
        evacuation_registration: {
          disaster_evacuation_event_id: registration.disaster_evacuation_event_id,
          arrival_timestamp: registration.arrival_timestamp,
          reported_age_at_arrival: registration.reported_age_at_arrival,
          ec_rooms_id: registration.ec_rooms_id
        }
      }
    });

  } catch (err) {
    console.error('GetEvacueeById Error:', err);
    return next(new ApiError('Internal server error during evacuee fetch.', 500));
  }
};

/**
 * @desc Get evacuee details and demographic breakdown by family head ID
 * @route GET /api/v1/evacuees/family/:family_head_id
 * @access Private
 */
exports.getRegisterEvacueeByFamilyId = async (req, res, next) => {
  const { family_head_id } = req.params;

  try {
    // Fetch evacuees in the family
    const { data: evacuees, error: evacueesError } = await supabase
      .from('evacuee_residents')
      .select(`
        id,
        resident_id,
        relationship_to_family_head,
        date_registered,
        residents (
          id,
          first_name,
          last_name,
          birthdate,
          sex,
          barangay_of_origin,
          barangays ( name )
        )
      `)
      .eq('family_head_id', family_head_id);

    if (evacueesError || !evacuees || evacuees.length === 0) {
      return next(new ApiError('No evacuees found for this family.', 404));
    }

    const evacueeIds = evacuees.map(e => e.id);

    // Fetch vulnerabilities
    const { data: vulnerabilities, error: vulnError } = await supabase
      .from('resident_vulnerabilities')
      .select('evacuee_resident_id, vulnerability_types(name)')
      .in('evacuee_resident_id', evacueeIds);

    if (vulnError) {
      console.error('Error fetching vulnerabilities:', vulnError);
      return next(new ApiError('Failed to fetch vulnerabilities.', 500));
    }

    // Fetch arrival timestamps
    const { data: registrations, error: regError } = await supabase
      .from('evacuation_registrations')
      .select('evacuee_resident_id, arrival_timestamp')
      .in('evacuee_resident_id', evacueeIds);

    if (regError) {
      console.error('Error fetching registrations:', regError);
      return next(new ApiError('Failed to fetch arrival timestamps.', 500));
    }

    // Build lookup maps
    const registrationMap = new Map(
      registrations.map(r => [r.evacuee_resident_id, r.arrival_timestamp])
    );

    const vulnerabilityMap = new Map();
    for (const v of vulnerabilities) {
      const existing = vulnerabilityMap.get(v.evacuee_resident_id) || [];
      existing.push(v.vulnerability_types.name);
      vulnerabilityMap.set(v.evacuee_resident_id, existing);
    }

    // Initialize summary
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

    const now = new Date();

    // Map family members
    const family_members = evacuees.map(evacuee => {
      const resident = evacuee.residents;
      const birthdate = new Date(resident.birthdate);
      const age = Math.floor((now - birthdate) / (365.25 * 24 * 60 * 60 * 1000));

      // Sex count
      if (resident.sex === 'Male') summary.total_male++;
      else if (resident.sex === 'Female') summary.total_female++;

      // Age group
      if (age <= 2) summary.infant++;
      else if (age <= 12) summary.children++;
      else if (age <= 17) summary.youth++;
      else if (age <= 59) summary.adult++;
      else summary.senior_citizens++;

      // Vulnerability types
      const vtypes = vulnerabilityMap.get(evacuee.id) || [];

      if (vtypes.includes('PWD')) summary.pwd++;
      if (vtypes.includes('Pregnant')) summary.pregnant++;
      if (vtypes.includes('Lactating')) summary.lactating++;

      // Arrival time
      const arrival = registrationMap.get(evacuee.id) || null;

      return {
        evacuee_id: evacuee.id,
        resident_id: resident.id,
        full_name: `${resident.first_name} ${resident.last_name}`,
        age,
        barangay_of_origin: resident.barangays?.name || 'Unknown',
        sex: resident.sex,
        vulnerability_types: vtypes,
        arrival_timestamp: arrival
      };
    });

    return res.status(200).json({
      summary,
      family_members
    });

  } catch (err) {
    console.error('getRegisterEvacueeByFamilyId Error:', err);
    return next(new ApiError('Internal server error while fetching family evacuee details.', 500));
  }
};

