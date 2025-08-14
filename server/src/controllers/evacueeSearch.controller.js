// evacueeSearch.controller.js

const { supabase } = require('../config/supabase');

class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

let evacueeCache = null;
let cacheTimestamp = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * @desc Search for evacuees by name with additional fields
 * @route GET /api/v1/evacuees/search
 * @access Public
 */
exports.searchEvacueeByName = async (req, res, next) => {
  const { name } = req.query;
  if (!name || name.trim() === "") {
    return next(new ApiError("Name query is required.", 400));
  }

  try {
    const now = Date.now();
    let evacueeData = [];

    if (evacueeCache && cacheTimestamp && now - cacheTimestamp < CACHE_TTL_MS) {
      evacueeData = evacueeCache;
      console.log("[CACHE HIT] Using cached evacuee data.");
    } else {
      console.log("[CACHE MISS] Fetching from Supabase...");
      const { data, error } = await supabase.from("evacuation_registrations")
        .select(`
                id,
                evacuee_resident_id,
                disaster_evacuation_event_id,
                family_head_id,
                arrival_timestamp,
                decampment_timestamp,
                reported_age_at_arrival,
                ec_rooms_id,

                evacuee_residents!evacuee_resident_id (
                id,
                resident_id,
                marital_status,
                educational_attainment,
                school_of_origin,
                occupation,
                purok,
                relationship_to_family_head,
                date_registered,
                residents (
                    id,
                    first_name,
                    middle_name,
                    last_name,
                    suffix,
                    birthdate,
                    sex,
                    barangay_of_origin,
                    barangays (name)
                ),
                resident_vulnerabilities (vulnerability_type_id)
                ),
                family_head:family_head_id (
                id,
                residents:resident_id (
                    first_name,
                    middle_name,
                    last_name,
                    suffix
                )
                )
            `);
      if (error) {
        console.error("Supabase error:", error);
        return next(new ApiError("Failed to fetch evacuee records.", 500));
      }

      evacueeData = data;
      evacueeCache = data;
      cacheTimestamp = now;
    }

    const query = name.toLowerCase();

    // Filter evacuees based on the search query
    const filtered = evacueeData.filter((entry) => {
      const r = entry.evacuee_residents?.residents;
      if (!r) return false;

      const first = r.first_name?.toLowerCase() || "";
      const middle = r.middle_name?.toLowerCase() || "";
      const last = r.last_name?.toLowerCase() || "";
      const suffix = r.suffix?.toLowerCase() || "";
      const fullName = `${first} ${middle} ${last} ${suffix}`.trim();
      console.log("Constructed Full Name:", fullName);

      // Search by first name, middle name, last name, or full name
      return (
        first.includes(query) ||
        middle.includes(query) ||
        last.includes(query) ||
        suffix.includes(query) ||
        fullName.includes(query)
      );
    });
    const result = filtered.map((entry) => {
      const resident = entry.evacuee_residents.residents;
      const evacuee = entry.evacuee_residents;

      const headRes = entry.family_head?.residents;
      const family_head_full_name = headRes
        ? [
            headRes.first_name,
            headRes.middle_name,
            headRes.last_name,
            headRes.suffix,
          ]
            .filter(Boolean)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim()
        : null;

      const vulnerabilities =
        evacuee.resident_vulnerabilities?.map((v) => v.vulnerability_type_id) ||
        [];

      return {
        evacuee_resident_id: entry.evacuee_resident_id,
        first_name: resident.first_name,
        middle_name: resident.middle_name,
        last_name: resident.last_name,
        suffix: resident.suffix,
        birthdate: resident.birthdate,
        sex: resident.sex,
        barangay_of_origin: resident.barangay_of_origin,
        barangay_name: resident.barangays?.name || null,

        marital_status: evacuee.marital_status,
        educational_attainment: evacuee.educational_attainment,
        school_of_origin: evacuee.school_of_origin,
        occupation: evacuee.occupation,
        purok: evacuee.purok,
        relationship_to_family_head: evacuee.relationship_to_family_head,
        date_registered: evacuee.date_registered,

        arrival_timestamp: entry.arrival_timestamp,
        decampment_timestamp: entry.decampment_timestamp,
        reported_age_at_arrival: entry.reported_age_at_arrival,
        disaster_evacuation_event_id: entry.disaster_evacuation_event_id,
        ec_rooms_id: entry.ec_rooms_id,

        family_head_id: entry.family_head_id,
        family_head_full_name,

        vulnerability_type_ids: vulnerabilities,
      };
    });
    return res.status(200).json(result);
  } catch (err) {
    console.error("Evacuee search error:", err);
    return next(
      new ApiError("Internal server error during evacuee search.", 500)
    );
  }
};

/**
 * @desc Search family heads for a disaster event (by name)
 * @route GET /api/v1/evacuees/:disasterEvacuationEventId/family-heads?q=...
 * @access Private (Camp Manager only)
 */
exports.searchFamilyHeads = async (req, res, next) => {
  const { disasterEvacuationEventId } = req.params;
  const q = (req.query.q || "").trim();

  try {
    console.log(
      "[searchFamilyHeads] EventID:",
      disasterEvacuationEventId,
      "| q:",
      q || "(empty)"
    );

    // 1) Pull registrations for the event with family head identity + room
    const { data: rows, error: regErr } = await supabase
      .from("evacuation_registrations")
      .select(
        `
        family_head_id,
        ec_rooms_id,
        evacuation_center_rooms:ec_rooms_id ( room_name ),
        family_head:family_head_id (
          id,
          resident_id,
          residents:resident_id (
            first_name,
            middle_name,
            last_name,
            suffix,
            barangay_of_origin,
            barangays ( id, name )
          )
        )
      `
      )
      .eq("disaster_evacuation_event_id", disasterEvacuationEventId);

    if (regErr) {
      console.error("Supabase error (registrations):", regErr);
      return next(new ApiError("Failed to load family heads", 500));
    }

    console.log(
      "[searchFamilyHeads] Raw registration rows:",
      JSON.stringify(rows, null, 2)
    );

    // Deduplicate by family_head_id and shape initial items (without purok)
    const seen = new Set();
    const headsBase = [];
    const familyHeadIds = [];

    for (const r of rows || []) {
      const fh = r.family_head;
      if (!fh) continue;
      if (seen.has(fh.id)) continue;
      seen.add(fh.id);
      familyHeadIds.push(fh.id);

      const resi = fh.residents || {};
      const fullName = [
        resi.first_name,
        resi.middle_name,
        resi.last_name,
        resi.suffix,
      ]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      headsBase.push({
        family_head_id: fh.id,
        family_head_full_name: fullName,
        barangay: resi.barangays?.name || "Unknown",
        barangay_id: resi.barangays?.id || null,
        evacuation_room: r.evacuation_center_rooms?.room_name || null,
        // purok will be filled in step 2
        purok: null,
      });
    }

    console.log("[searchFamilyHeads] Family head IDs:", familyHeadIds);

    // 2) In one batch, fetch purok from evacuee_residents using family_head_id
    let purokByHeadId = new Map();
    if (familyHeadIds.length > 0) {
      const { data: erows, error: erErr } = await supabase
        .from("evacuee_residents")
        .select("family_head_id, purok")
        .in("family_head_id", familyHeadIds);

      if (erErr) {
        console.error("❌ Supabase error (evacuee_residents):", erErr);
        // We can continue without purok rather than failing the whole endpoint
      } else {
        console.log(
          "[searchFamilyHeads] evacuee_residents rows:",
          JSON.stringify(erows, null, 2)
        );
        purokByHeadId = new Map(erows.map((r) => [r.family_head_id, r.purok]));
      }
    }

    // 3) Merge purok into the base items
    const merged = headsBase.map((h) => ({
      ...h,
      purok: purokByHeadId.get(h.family_head_id) ?? null,
    }));

    console.log(
      "[searchFamilyHeads] Merged result before filter:",
      JSON.stringify(merged, null, 2)
    );

    // Optional search filtering (now includes purok & room)
    let result = merged;
    if (q) {
      const qq = q.toLowerCase();
      result = merged.filter(
        (h) =>
          h.family_head_full_name.toLowerCase().includes(qq) ||
          h.barangay.toLowerCase().includes(qq) ||
          (h.purok?.toLowerCase?.().includes(qq) ?? false) ||
          (h.evacuation_room?.toLowerCase?.().includes(qq) ?? false)
      );
      console.log(
        "[searchFamilyHeads] After filter:",
        JSON.stringify(result, null, 2)
      );
    }

    return res.status(200).json({
      count: result.length,
      data: result,
    });
  } catch (err) {
    console.error("[searchFamilyHeads] error:", err);
    return next(new ApiError("Internal server error", 500));
  }
};
