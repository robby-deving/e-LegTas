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
    is_youth,          // ✅ Added
    is_adult,          // ✅ Added
    ec_rooms_id,
    disaster_evacuation_event_id
  } = req.body;

  let resident_id = null;
  let evacuee_id = null;
  let registration_id = null;
  let family_head_inserted_id = null;

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

    // Step 1: Insert the resident
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
      console.error("Supabase residentError:", residentError);
      if (residentError.code === "23505") {
        throw new ApiError(
          `Failed to register resident. Duplicate key error on 'residents.id'. Likely sequence mismatch. Run: SELECT setval(pg_get_serial_sequence('residents','id'), (SELECT MAX(id) FROM residents)+1);`,
          500
        );
      }
      throw new ApiError(
        `Failed to register resident. Supabase error: ${residentError.message} | Details: ${JSON.stringify(residentError)}`,
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

    const isHead = relationship_to_family_head === 'Head';

    // Step 2: Insert family head if needed
    if (isHead) {
      console.log('Step 2: Insert family head...');
      const { data: familyHeadData, error: familyHeadError } = await supabase
        .from('family_head')
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
        await supabase.from('residents').delete().eq('id', resident_id);
        throw new ApiError(
          `Failed to register family head. Supabase error: ${familyHeadError.message} | Details: ${JSON.stringify(familyHeadError)}`,
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
        family_head_id: family_head_inserted_id,
        relationship_to_family_head,
        date_registered: date_registered || new Date().toISOString()
      }])
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
      await supabase.from('residents').delete().eq('id', resident_id);
      throw new ApiError(
        `Failed to register evacuee. Supabase error: ${evacueeError.message} | Details: ${JSON.stringify(evacueeError)}`,
        500
      );
    }
    evacuee_id = evacueeData.id;

    // Step 4: Insert evacuation_registrations
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
      console.error("Supabase registrationError:", registrationError);
      if (registrationError.code === "23505") {
        throw new ApiError(
          `Failed to register evacuation. Duplicate key error on 'evacuation_registrations.id'. Run: SELECT setval(pg_get_serial_sequence('evacuation_registrations','id'), (SELECT MAX(id) FROM evacuation_registrations)+1);`,
          500
        );
      }
      await supabase.from('evacuee_residents').delete().eq('id', evacuee_id);
      await supabase.from('residents').delete().eq('id', resident_id);
      throw new ApiError(
        `Failed to register evacuation. Supabase error: ${registrationError.message} | Details: ${JSON.stringify(registrationError)}`,
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
      console.log('Step 5: Insert vulnerabilities...');
      const vulnInserts = vulnerabilities.map(vuln_id => ({
        evacuee_resident_id: evacuee_id,
        vulnerability_type_id: vuln_id
      }));

      const { error: vulnError } = await supabase
        .from('resident_vulnerabilities')
        .insert(vulnInserts);

      if (vulnError) {
        console.error("Supabase vulnError:", vulnError);
        if (vulnError.code === "23505") {
          throw new ApiError(
            `Failed to associate vulnerabilities. Duplicate key error on 'resident_vulnerabilities.id'. Run: SELECT setval(pg_get_serial_sequence('resident_vulnerabilities','id'), (SELECT MAX(id) FROM resident_vulnerabilities)+1);`,
            500
          );
        }
        await supabase.from('evacuation_registrations').delete().eq('id', registration_id);
        await supabase.from('evacuee_residents').delete().eq('id', evacuee_id);
        await supabase.from('residents').delete().eq('id', resident_id);
        throw new ApiError(
          `Failed to associate vulnerabilities. Supabase error: ${vulnError.message} | Details: ${JSON.stringify(vulnError)}`,
          500
        );
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

    return next(
      new ApiError(
        `Internal server error during evacuee registration. ${err.message || ''}`,
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
        // Query the 'barangays' table to get all barangay records
        const { data, error } = await supabase
            .from('barangays')
            .select('*'); // Fetch all barangays

        if (error) {
            console.error('Supabase Error (getAllBarangays):', error);
            return next(new ApiError('Failed to retrieve barangay entries.', 500));
        }

        // If no data found
        if (!data || data.length === 0) {
            return res.status(200).json({ message: 'No barangay entries found.', data: [] });
        }

        // Successfully retrieved barangays data
        res.status(200).json({
            message: 'Successfully retrieved all barangay entries.',
            count: data.length,
            data: data // Send the data to the frontend
        });
    } catch (err) {
        console.error('Internal server error during getAllBarangays:', err);
        next(new ApiError('Internal server error during getAllBarangays.', 500));
    }
};


/**
 * @desc Update an evacuee's details
 * @route PUT /api/v1/evacuees/:id
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

  let evacuee_id = null;
  let resident_id = null;
  let registration_id = null;
  let family_head_inserted_id = null;

  try {
    // Step 1: Retrieve existing evacuee data
    console.log('Step 1: Fetch existing evacuee...');
    
    // Get the evacuee record
    const { data: evacueeData, error: evacueeError } = await supabase
      .from('evacuee_residents')
      .select('id, resident_id, family_head_id')
      .eq('id', id)
      .single();

    if (evacueeError) {
      console.error('Supabase evacueeError:', evacueeError);
      return next(new ApiError('Evacuee not found or Supabase error.', 404));
    }

    evacuee_id = evacueeData.id;
    resident_id = evacueeData.resident_id;
    family_head_inserted_id = evacueeData.family_head_id;

    // Step 2: Update the resident information
    console.log('Step 2: Update resident...');
    const { error: residentError } = await supabase
      .from('residents')
      .update({
        first_name,
        middle_name,
        last_name,
        suffix,
        birthdate,
        sex,
        barangay_of_origin,
      })
      .eq('id', resident_id);

    if (residentError) {
      console.error('Supabase residentError:', residentError);
      throw new ApiError('Failed to update resident details.', 500);
    }

    // Step 3: Update the evacuee information
    console.log('Step 3: Update evacuee...');
    const { error: evacueeUpdateError } = await supabase
      .from('evacuee_residents')
      .update({
        marital_status,
        educational_attainment,
        school_of_origin,
        occupation,
        purok,
        relationship_to_family_head,
        date_registered: date_registered || new Date().toISOString(),
        family_head_id: family_head_inserted_id || family_head_id, // Only update family head if provided
        ec_rooms_id,
        disaster_evacuation_event_id,
      })
      .eq('id', evacuee_id);

    if (evacueeUpdateError) {
      console.error('Supabase evacueeUpdateError:', evacueeUpdateError);
      throw new ApiError('Failed to update evacuee information.', 500);
    }

    // Step 4: Update vulnerabilities if necessary
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
      console.log('Step 4: Update vulnerabilities...');
      const vulnInserts = vulnerabilities.map((vuln_id) => ({
        evacuee_resident_id: evacuee_id,
        vulnerability_type_id: vuln_id,
      }));

      // Remove previous vulnerabilities and update with new ones
      const { error: vulnDeleteError } = await supabase
        .from('resident_vulnerabilities')
        .delete()
        .eq('evacuee_resident_id', evacuee_id);

      if (vulnDeleteError) {
        console.error('Supabase vulnDeleteError:', vulnDeleteError);
        throw new ApiError('Failed to remove previous vulnerabilities.', 500);
      }

      const { error: vulnInsertError } = await supabase
        .from('resident_vulnerabilities')
        .insert(vulnInserts);

      if (vulnInsertError) {
        console.error('Supabase vulnInsertError:', vulnInsertError);
        throw new ApiError('Failed to update vulnerabilities.', 500);
      }
    }

    console.log('Evacuee update complete.');

    return res.status(200).json({
      message: 'Evacuee updated successfully.',
      data: {
        evacuee: { ...evacueeData, family_head_id: family_head_inserted_id },
      },
    });
  } catch (err) {
    console.error('UpdateEvacuee Error:', err);
    return next(
      new ApiError('Internal server error during evacuee update.', 500)
    );
  }
};


/**
 * @desc Get evacuee details and demographic breakdown by family head ID
 * @route GET /api/v1/evacuees/family/:family_head_id
 * @access Private
 
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
      const today = new Date();
      const birth = new Date(birthdate);
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }


      // Count sex
      if (resident.sex === 'Male') summary.total_male++;
      else if (resident.sex === 'Female') summary.total_female++;

        // Update age group classification
        if (age <= 1) {
          summary.total_no_of_infant++;
        } else if (age >= 2 && age <= 12) {
          summary.total_no_of_children++;
        } else if (age >= 13 && age <= 17) {
          summary.total_no_of_youth++;
        } else if (age >= 18 && age <= 59) {
          summary.total_no_of_adult++;
        } else if (age >= 60) {
          summary.total_no_of_seniors++;
        }

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
};**/

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
        const hasHadBirthday =
          today.getMonth() > birth.getMonth() ||
          (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());

        const adjustedYears = hasHadBirthday ? years : years - 1;
        ageStr = `${adjustedYears}`;

        if (adjustedYears <= 12) summary.total_no_of_children++;
        else if (adjustedYears <= 17) summary.total_no_of_youth++;
        else if (adjustedYears <= 59) summary.total_no_of_adult++;
        else summary.total_no_of_seniors++;
      }



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
          age: ageStr,
          barangay_of_origin: resident.barangays?.name || 'Unknown',
          sex: resident.sex,
          vulnerability_types: vtypes,
          room_name: member.ec_rooms?.room_name || 'Unknown',
          arrival_timestamp: member.arrival_timestamp
        };
      });

      // Fetch the actual family head based on familyHeadId
      const { data: headRow, error: headError } = await supabase
        .from("family_head")
        .select("id, resident_id, residents(first_name, last_name, barangays(name))")
        .eq("id", familyHeadId)
        .single();

      let family_head_full_name = "Unknown";
      let family_head_barangay = "Unknown";

      if (headError || !headRow?.residents) {
        console.error("Failed to fetch head of family:", headError);
      } else {
        const resident = headRow.residents;
        family_head_full_name = `${resident.first_name} ${resident.last_name}`;
        family_head_barangay = resident.barangays?.name || "Unknown";
      }

      response.push({
        id: familyHeadId,
        disaster_evacuation_event_id: disasterEvacuationEventId,
        family_head_full_name: family_head_full_name,
        barangay: family_head_barangay || 'Unknown',
        total_individuals: members.length,
        room_name: members[0]?.ec_rooms?.room_name || 'Unknown',
        decampment_timestamp: members[0]?.decampment_timestamp || null,

        view_family: {
          evacuation_center_name: members[0]?.ec_rooms?.evacuation_centers?.name || 'Unknown',
          head_of_family: family_head_full_name,
          decampment: members[0]?.decampment_timestamp || null,
          summary_per_family: summary
        },


        list_of_family_members: {
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

    // 3. Fetch evacuation center capacity directly from evacuation_centers
    const { data: centerCapacity, error: capacityError } = await supabase
      .from('evacuation_centers')
      .select('total_capacity')
      .eq('id', evacuation_centers.id)
      .single();

    if (capacityError) {
      console.error(`[ERROR] Supabase error fetching center capacity: ${capacityError.message}`);
      return next(new ApiError('Failed to fetch evacuation center capacity.', 500));
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