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
  let family_head_inserted_id = null; // To store the family head ID

  try {
    console.log('Step 1: Insert resident...');
    console.log('Resident Payload:', {
      first_name,
      middle_name,
      last_name,
      suffix,
      birthdate,
      sex,
      barangay_of_origin
    });

    // Insert the resident
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

    if (residentError) throw new ApiError('Failed to register resident.', 500);
    resident_id = residentData.id;

    const birthdateObj = new Date(birthdate);
    const age = Math.floor((Date.now() - birthdateObj) / (365.25 * 24 * 60 * 60 * 1000));
    const isHead = relationship_to_family_head === 'Head';

    // If the resident is the family head, insert into family_head table
    if (isHead) {
      console.log('Step 2: Insert family head...');
      const { data: familyHeadData, error: familyHeadError } = await supabase
        .from('family_head')
        .insert([{
          resident_id // Use the resident_id for the family head
        }])
        .select()
        .single();

      if (familyHeadError) {
        await supabase.from('residents').delete().eq('id', resident_id);
        throw new ApiError('Failed to register family head.', 500);
      }

      family_head_inserted_id = familyHeadData.id; // Store the inserted family head ID
    } else {
      // If not the family head, use the provided family_head_id
      family_head_inserted_id = family_head_id;
    }

    // Step 2: Insert evacuee_residents
    console.log('Step 3: Insert evacuee_residents...');
    const { data: evacueeData, error: evacueeError } = await supabase
      .from('evacuee_residents')
      .insert([{
        resident_id,
        marital_status,
        educational_attainment,
        school_of_origin,
        occupation,
        purok,
        family_head_id: family_head_inserted_id, // Use the family_head_id from family_heads table
        relationship_to_family_head,
        date_registered: date_registered || new Date().toISOString()
      }])
      .select()
      .single();

    if (evacueeError) {
      console.error('Supabase evacueeError:', evacueeError);
      await supabase.from('residents').delete().eq('id', resident_id);
      throw new ApiError('Failed to register evacuee.', 500);
    }
    evacuee_id = evacueeData.id;

    // Step 3: Insert evacuation_registrations
    console.log('Step 4: Insert evacuation_registrations...');
    const { data: registrationData, error: registrationError } = await supabase
      .from('evacuation_registrations')
      .insert([{
        evacuee_resident_id: evacuee_id,
        disaster_evacuation_event_id,
        family_head_id: family_head_inserted_id,
        arrival_timestamp: new Date().toISOString(),
        decampment_timestamp: null,
        reported_age_at_arrival: age,
        ec_rooms_id,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (registrationError) {
      await supabase.from('evacuee_residents').delete().eq('id', evacuee_id);
      await supabase.from('residents').delete().eq('id', resident_id);
      throw new ApiError('Failed to register evacuation.', 500);
    }
    registration_id = registrationData.id;

    // Step 4: Insert vulnerabilities (if any)
    const vulnerabilities = [];
    if (is_pwd) vulnerabilities.push(4);
    if (is_minor) vulnerabilities.push(2);
    if (is_senior) vulnerabilities.push(3);
    if (is_pregnant) vulnerabilities.push(5);
    if (is_lactating) vulnerabilities.push(6);

    if (vulnerabilities.length > 0) {
      console.log('Step 5: Insert vulnerabilities...');
      const vulnInserts = vulnerabilities.map(vuln_id => ({
        evacuee_resident_id: evacuee_id,
        vulnerability_type_id: vuln_id
      }));

      const { error: vulnError } = await supabase
        .from('resident_vulnerabilities')
        .insert(vulnInserts);

      if (vulnError) {
        await supabase.from('evacuation_registrations').delete().eq('id', registration_id);
        await supabase.from('evacuee_residents').delete().eq('id', evacuee_id);
        await supabase.from('residents').delete().eq('id', resident_id);
        throw new ApiError('Failed to associate vulnerabilities.', 500);
      }
    }

    console.log('Registration complete.');
    return res.status(201).json({
      message: 'Evacuee registered successfully.',
      data: {
        evacuee: { ...evacueeData, family_head_id: family_head_inserted_id },
        evacuation_registration: registrationData,
        vulnerability_type_ids: vulnerabilities
      }
    });

  } catch (err) {
    console.error('RegisterEvacuee Error:', err);
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
        const { data: evacuee, error: evacueeError } = await supabase
            .from('evacuee_residents')
            .select('*')
            .eq('id', id)
            .single();
        if (evacueeError || !evacuee) throw new ApiError(`Evacuee with ID ${id} not found.`, 404);

        // Fetch resident data for this evacuee
        const { data: resident, error: residentError } = await supabase
            .from('residents')
            .select('*')
            .eq('id', evacuee.resident_id)
            .single();
        if (residentError || !resident) throw new ApiError('Resident data not found.', 404);

        // Fetch vulnerabilities for this evacuee
        const { data: vulnerabilityLinks, error: vulnError } = await supabase
            .from('resident_vulnerabilities')
            .select('vulnerability_type_id, vulnerability_types(name)')
            .eq('evacuee_resident_id', id);
        if (vulnError) throw new ApiError('Error fetching vulnerabilities.', 500);

        const vulnerabilities = vulnerabilityLinks.map(v => v.vulnerability_types.name);

        // Fetch the evacuation registration for this evacuee
        const { data: registration, error: regError } = await supabase
            .from('evacuation_registrations')
            .select('*')
            .eq('evacuee_resident_id', id)
            .single();
        if (regError || !registration) throw new ApiError('Evacuation registration not found.', 404);

        // Fetch the family head data from family_head table (based on family_head_id)
        let familyHeadData = null;
        if (registration.family_head_id) {
            const { data: familyHead, error: familyHeadError } = await supabase
                .from('family_head')
                .select('id, resident_id')
                .eq('id', registration.family_head_id)  // Get family head by family_head_id
                .single();
            if (familyHeadError) throw new ApiError('Error fetching family head data.', 500);
            if (familyHead) {
                // Get the family head's resident data
                const { data: familyHeadResident, error: familyHeadResidentError } = await supabase
                    .from('residents')
                    .select('*')
                    .eq('id', familyHead.resident_id)  // Get resident data for family head
                    .single();
                if (familyHeadResidentError) throw new ApiError('Error fetching family head resident data.', 500);
                familyHeadData = familyHeadResident;
            }
        }

        return res.status(200).json({
            evacuee: {
                id: evacuee.id,
                resident: resident,
                marital_status: evacuee.marital_status,
                educational_attainment: evacuee.educational_attainment,
                school_of_origin: evacuee.school_of_origin,
                occupation: evacuee.occupation,
                purok: evacuee.purok,
                family_head: familyHeadData,  // Only include family head data here
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

    // Initialize summary breakdown
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

    // Map family members and populate summary
    const family_members = evacuees.map(evacuee => {
      const resident = evacuee.residents;
      const birthdate = new Date(resident.birthdate);
      const age = Math.floor((now - birthdate) / (365.25 * 24 * 60 * 60 * 1000));

      // Count sex
      if (resident.sex === 'Male') summary.total_male++;
      else if (resident.sex === 'Female') summary.total_female++;

      // Categorize age group
      if (age <= 2) summary.infant++;
      else if (age <= 12) summary.children++;
      else if (age <= 17) summary.youth++;
      else if (age <= 59) summary.adult++;
      else summary.senior_citizens++;

      // Handle vulnerability types
      const vtypes = vulnerabilityMap.get(evacuee.id) || [];

      if (vtypes.includes('PWD')) summary.pwd++;
      if (vtypes.includes('Pregnant')) summary.pregnant++;
      if (vtypes.includes('Lactating')) summary.lactating++;

      return {
        evacuee_id: evacuee.id,
        resident_id: resident.id,
        full_name: `${resident.first_name} ${resident.last_name}`,
        age,
        barangay_of_origin: resident.barangays?.name || 'Unknown',
        sex: resident.sex,
        vulnerability_types: vtypes,
        arrival_timestamp: registrationMap.get(evacuee.id) || null
      };
    });

    // Respond with demographics and family member info
    return res.status(200).json({
      summary,
      family_members
    });

  } catch (err) {
    console.error('getRegisterEvacueeByFamilyId Error:', err);
    return next(
      new ApiError('Internal server error while fetching family evacuee details.', 500)
    );
  }
};

/**
 * @desc Get detailed evacuee data by disaster evacuation event ID, includes summary, room details, and full list of evacuees
 * @route GET /api/v1/evacuees/:disasterEvacuationEventId/evacuees-information
 * @access Public
 */
exports.getEvacueesInformationbyDisasterEvacuationEventId = async (req, res, next) => {
  const { disasterEvacuationEventId } = req.params;

  try {
    // Step 1: Fetch all evacuee_registrations for this disaster event
    const { data: registrations, error: regError } = await supabase
      .from('evacuation_registrations')
      .select(`
        id,
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
            last_name,
            birthdate,
            sex,
            barangay_of_origin,
            barangays ( name )
          )
        ),
        ec_rooms:ec_rooms_id (
          id,
          room_name,
          evacuation_centers (
            name
          )
        )
      `)
      .eq('disaster_evacuation_event_id', disasterEvacuationEventId);

    if (regError) {
      console.error('Error fetching registrations:', regError);
      return next(new ApiError('Failed to fetch registrations', 500));
    }

    if (!registrations || registrations.length === 0) {
      return next(new ApiError('No registrations found for this event.', 404));
    }

    const familyGroups = new Map();

    // Group by family_head_id
    for (const record of registrations) {
      const familyHeadId = record.family_head_id;
      if (!familyGroups.has(familyHeadId)) {
        familyGroups.set(familyHeadId, []);
      }
      familyGroups.get(familyHeadId).push(record);
    }

    const response = [];

    for (const [familyHeadId, members] of familyGroups.entries()) {
      const evacueeIds = members.map(m => m.evacuee_resident_id);

      // Fetch vulnerabilities
      const { data: vulnerabilities } = await supabase
        .from('resident_vulnerabilities')
        .select('evacuee_resident_id, vulnerability_types(name)')
        .in('evacuee_resident_id', evacueeIds);

      const vulnerabilityMap = new Map();
      for (const v of vulnerabilities) {
        const existing = vulnerabilityMap.get(v.evacuee_resident_id) || [];
        existing.push(v.vulnerability_types.name);
        vulnerabilityMap.set(v.evacuee_resident_id, existing);
      }

      // Initialize summary
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
        total_no_of_lactating_women: 0
      };

      const familyMembers = members.map(member => {
        const evacuee = member.residents;
        const resident = evacuee.residents;

        const birthDate = new Date(resident.birthdate);
        const age = new Date().getFullYear() - birthDate.getFullYear();

        // Update age group classification
        if (age <= 1) summary.total_no_of_infant++;
        else if (age <= 12) summary.total_no_of_children++;
        else if (age <= 17) summary.total_no_of_youth++;
        else if (age <= 59) summary.total_no_of_adult++;
        else summary.total_no_of_seniors++;

        if (resident.sex === 'Male') summary.total_no_of_male++;
        else if (resident.sex === 'Female') summary.total_no_of_female++;

        const vtypes = vulnerabilityMap.get(member.evacuee_resident_id) || [];
        if (vtypes.includes('Person with Disability')) summary.total_no_of_pwd++;
        if (vtypes.includes('Pregnant Woman')) summary.total_no_of_pregnant++;
        if (vtypes.includes('Lactating Woman')) summary.total_no_of_lactating_women++;

        return {
          evacuee_id: member.evacuee_resident_id,
          resident_id: resident.id,
          full_name: `${resident.first_name} ${resident.last_name}`,
          age,
          barangay_of_origin: resident.barangays?.name || 'Unknown',
          sex: resident.sex,
          vulnerability_types: vtypes,
          arrival_timestamp: member.created_at
        };
      });

      const head = members.find(m => m.family_head_id === familyHeadId);
      const headResident = head?.residents?.residents;

      response.push({
        title: "Registered Evacuees per Family",
        family_head_full_name: `${headResident.first_name} ${headResident.last_name}`,
        barangay: headResident.barangays?.name || 'Unknown',
        total_individuals: members.length,
        room_name: head?.ec_rooms?.room_name || 'Unknown',
        decampment_timestamp: head?.decampment_timestamp || null,

        view_family: {
          title: "View Family",
          evacuation_center_name: head?.ec_rooms?.evacuation_centers?.name || 'Unknown',
          head_of_family: `${headResident.first_name} ${headResident.last_name}`,
          decampment: head?.decampment_timestamp || null,
          summary_per_family: summary
        },

        list_of_family_members: {
          title: "List of Family Members",
          family_members: familyMembers
        }
      });
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('Unexpected error:', error);
    return next(new ApiError('Internal server error', 500));
  }
};

/**
 * @desc Get evacuee demographic statistics by disaster evacuation event ID
 * @route GET /api/v1/evacuees/:disasterEvacuationEventId/evacuee-statistics
 * @access Public
 */
exports.getEvacueeStatisticsByDisasterEvacuationEventId = async (req, res, next) => {
  const { disasterEvacuationEventId } = req.params;

  try {
    const { data, error } = await supabase
      .from('evacuation_summaries')
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
      .eq('disaster_evacuation_event_id', disasterEvacuationEventId)
      .single();

    if (error || !data) {
      return next(new ApiError('Evacuee summary not found for this event.', 404));
    }

    return res.status(200).json({
      title: 'Evacuees Statistics',
      summary: data
    });
  } catch (err) {
    console.error('Error fetching evacuee statistics:', err);
    return next(new ApiError('Internal server error.', 500));
  }
};

/**
 * @desc Get disaster and evacuation center information for a given disaster evacuation event
 * @route GET /api/v1/evacuees/:disasterEvacuationEventId/details
 * @access Public
 */
exports.getDisasterEvacuationDetails = async (req, res, next) => {
  const { disasterEvacuationEventId } = req.params;
  console.log(`[INFO] Fetching details for disasterEvacuationEventId: ${disasterEvacuationEventId}`);

  try {
    // 1. Fetch disaster event data
    const { data: eventData, error: eventError } = await supabase
      .from('disaster_evacuation_event')
      .select(`
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
      `)
      .eq('id', disasterEvacuationEventId)
      .single();

    if (eventError) {
      console.error(`[ERROR] Supabase error fetching disaster event: ${eventError.message}`);
      return next(new ApiError('Failed to fetch disaster evacuation event.', 500));
    }

    if (!eventData) {
      console.warn(`[WARN] No disaster event found for ID: ${disasterEvacuationEventId}`);
      return next(new ApiError('Disaster evacuation event not found.', 404));
    }

    const { disasters, evacuation_centers, evacuation_start_date, evacuation_end_date } = eventData;

    if (!disasters || !disasters.disaster_types) {
      console.error(`[ERROR] Missing disaster or disaster type in disaster data.`);
      return next(new ApiError('Disaster or disaster type data is incomplete.', 500));
    }

    if (!evacuation_centers || !evacuation_centers.barangays) {
      console.error(`[ERROR] Missing evacuation center or barangay data.`);
      return next(new ApiError('Evacuation center or barangay data is incomplete.', 500));
    }

    // 2. Fetch evacuation summary
    const { data: summary, error: summaryError } = await supabase
      .from('evacuation_summaries')
      .select(`
        total_no_of_family,
        total_no_of_individuals
      `)
      .eq('disaster_evacuation_event_id', disasterEvacuationEventId)
      .single();

    if (summaryError) {
      console.error(`[ERROR] Supabase error fetching evacuation summary: ${summaryError.message}`);
      return next(new ApiError('Failed to fetch evacuation summary.', 500));
    }

    if (!summary) {
      console.warn(`[WARN] No summary found for disasterEvacuationEventId: ${disasterEvacuationEventId}`);
      return next(new ApiError('Evacuation summary not found.', 404));
    }

    // 3. Fetch and compute evacuation center capacity
    const { data: roomCapacities, error: roomError } = await supabase
      .from('evacuation_center_rooms')
      .select('individual_room_capacity')
      .eq('evacuation_center_id', evacuation_centers.id);

    if (roomError) {
      console.error(`[ERROR] Supabase error fetching room capacities: ${roomError.message}`);
      return next(new ApiError('Failed to fetch room capacity data.', 500));
    }

    if (!roomCapacities || roomCapacities.length === 0) {
      console.warn(`[WARN] No room capacity data found for EC ID: ${evacuation_centers.id}`);
    }

    const totalCapacity = roomCapacities.reduce((acc, room) => acc + (room.room_capacity || 0), 0);
    console.log(`[INFO] Computed EC total capacity: ${totalCapacity}`);

    // 4. Final response structure
    return res.status(200).json({
      disaster: {
        disaster_types_id: disasters.disaster_types.id,
        disaster_type_name: disasters.disaster_types.name,
        disasters_id: disasters.id,
        disaster_name: disasters.disaster_name,
        disaster_start_date: evacuation_start_date,
        disaster_end_date: evacuation_end_date
      },
      evacuation_center: {
        evacuation_center_id: evacuation_centers.id,
        evacuation_center_name: evacuation_centers.name,
        evacuation_center_barangay_id: evacuation_centers.barangay_id,
        evacuation_center_barangay_name: evacuation_centers.barangays.name
      },
      evacuation_summary: {
        total_no_of_family: summary.total_no_of_family,
        total_no_of_individuals: summary.total_no_of_individuals,
        evacuation_center_capacity: totalCapacity
      }
    });
  } catch (err) {
    console.error('[FATAL] Uncaught server error:', err);
    return next(new ApiError('Internal server error', 500));
  }
};