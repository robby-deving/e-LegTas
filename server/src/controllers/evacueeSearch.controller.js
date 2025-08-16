// evacueeSearch.controller.js

const supabase = require("../config/supabase");

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
 * @desc Search evacuees (deduped, event-aware).
 *       Returns one row per evacuee_resident_id, using the latest registration.
 *       Identity/demographics come from profile_snapshot when present.
 * @route GET /api/v1/evacuees/search
 * @access Public
 */
exports.searchEvacueeByName = async (req, res, next) => {
  const { name } = req.query;
  if (!name || String(name).trim() === "") {
    return next(new ApiError("Name query is required.", 400));
  }

  try {
    const now = Date.now();
    let rows = [];

    if (evacueeCache && cacheTimestamp && now - cacheTimestamp < CACHE_TTL_MS) {
      rows = evacueeCache;
      console.log("[CACHE HIT] evacuees");
    } else {
      console.log("[CACHE MISS] fetching from Supabase…");
      const { data, error } = await supabase
        .from("evacuation_registrations")
        .select(`
          id,
          evacuee_resident_id,
          disaster_evacuation_event_id,
          family_head_id,
          arrival_timestamp,
          decampment_timestamp,
          reported_age_at_arrival,
          ec_rooms_id,

          profile_snapshot,
          vulnerability_type_ids,

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
              barangays ( name )
            ),
            resident_vulnerabilities (vulnerability_type_id)
          ),

          family_head:family_head_id (
            id,
            residents:resident_id (
              first_name, middle_name, last_name, suffix
            )
          ),

          disaster_evacuation_event:disaster_evacuation_event_id (
            id,
            disasters ( id ),
            evacuation_centers ( id, name )
          )
        `);

      if (error) {
        console.error("Supabase error:", error);
        return next(new ApiError("Failed to fetch evacuee records.", 500));
      }

      rows = data || [];
      evacueeCache = rows;
      cacheTimestamp = now;
    }

    // Client sends "name", we filter locally from cached rows.
    const q = String(name).toLowerCase();
    const filtered = rows.filter((entry) => {
      const r = entry?.evacuee_residents?.residents;
      if (!r) return false;

      // Prefer profile_snapshot for search if present; fall back to resident
      const ps = entry?.profile_snapshot || {};
      const first = String(ps.first_name ?? r.first_name ?? "").toLowerCase();
      const middle = String(ps.middle_name ?? r.middle_name ?? "").toLowerCase();
      const last = String(ps.last_name ?? r.last_name ?? "").toLowerCase();
      const suffix = String(ps.suffix ?? r.suffix ?? "").toLowerCase();

      const full = `${first} ${middle} ${last} ${suffix}`.replace(/\s+/g, " ").trim();
      return (
        first.includes(q) ||
        middle.includes(q) ||
        last.includes(q) ||
        suffix.includes(q) ||
        full.includes(q)
      );
    });

    // Unique evacuees whose ACTIVE status we need to compute
    const ids = [...new Set(filtered.map((r) => r.evacuee_resident_id))];

    // Fetch ACTIVE registrations (decampment IS NULL)
    const { data: activeRows, error: activeErr } = await supabase
      .from("evacuation_registrations")
      .select(`
        evacuee_resident_id,
        disaster_evacuation_event_id,
        decampment_timestamp,
        disaster_evacuation_event:disaster_evacuation_event_id (
          id,
          disasters ( id ),
          evacuation_centers ( id, name )
        )
      `)
      .in("evacuee_resident_id", ids.length ? ids : [-1])
      .is("decampment_timestamp", null);

    if (activeErr) {
      console.error("Supabase active query error:", activeErr);
      return next(new ApiError("Failed to fetch active registration info.", 500));
    }

    // Map evacuee_resident_id -> active info
    const activeMap = new Map();
    for (const r of activeRows || []) {
      const dee = r.disaster_evacuation_event || null;
      activeMap.set(r.evacuee_resident_id, {
        active_event_id: dee?.id ?? r.disaster_evacuation_event_id ?? null,
        active_disaster_id: dee?.disasters?.id ?? null,
        active_ec_id: dee?.evacuation_centers?.id ?? null,
        active_ec_name: dee?.evacuation_centers?.name ?? null,
      });
    }

    // Dedupe: keep only the latest registration per evacuee_resident_id
    const latest = new Map(); // id -> row
    for (const entry of filtered) {
      const key = entry.evacuee_resident_id;
      const prev = latest.get(key);
      if (!prev) {
        latest.set(key, entry);
      } else {
        const a = Date.parse(entry.arrival_timestamp || "") || 0;
        const b = Date.parse(prev.arrival_timestamp || "") || 0;
        if (a > b) latest.set(key, entry);
      }
    }

    const result = Array.from(latest.values()).map((entry) => {
      const evacuee = entry?.evacuee_residents || {};
      const resident = evacuee?.residents || {};
      const ps = entry?.profile_snapshot || {}; // event-scoped preferred

      // Effective identity/demographics (event-scoped first)
      const first_name = ps.first_name ?? resident.first_name ?? null;
      const middle_name = ps.middle_name ?? resident.middle_name ?? null;
      const last_name = ps.last_name ?? resident.last_name ?? null;
      const suffix = (typeof ps.suffix === "string" ? ps.suffix : resident.suffix) ?? null;
      const birthdate = ps.birthdate ?? resident.birthdate ?? null;
      const sex = ps.sex ?? resident.sex ?? null;
      const barangay_of_origin = ps.barangay_of_origin ?? resident.barangay_of_origin ?? null;

      // Barangay name: we only have the name for resident.barangay_of_origin join
      // If snapshot overrides barangay_of_origin to a different id, we may not know the name here.
      const barangay_name =
        (ps.barangay_of_origin == null ||
          ps.barangay_of_origin === resident.barangay_of_origin)
          ? (resident.barangays?.name ?? null)
          : null;

      // Event-scoped socio-econ (snapshot first, fallback to evacuee_residents for older rows)
      const marital_status = ps.marital_status ?? evacuee.marital_status ?? null;
      const educational_attainment =
        ps.educational_attainment ?? evacuee.educational_attainment ?? null;
      const school_of_origin = ps.school_of_origin ?? evacuee.school_of_origin ?? null;
      const occupation = ps.occupation ?? evacuee.occupation ?? null;
      const purok = ps.purok ?? evacuee.purok ?? null;

      // Fallback to global only when the column is truly NULL (pre-migration data).
      const hasEventScoped =
        entry.vulnerability_type_ids !== null &&
        entry.vulnerability_type_ids !== undefined;

      const regVuln = hasEventScoped ? entry.vulnerability_type_ids : [];
      const globalVuln = Array.isArray(evacuee.resident_vulnerabilities)
        ? evacuee.resident_vulnerabilities.map((v) => v.vulnerability_type_id)
        : [];

      const vulnerability_type_ids = hasEventScoped ? regVuln : globalVuln;


      // Family head display
      const headRes = entry.family_head?.residents;
      const family_head_full_name = headRes
        ? [headRes.first_name, headRes.middle_name, headRes.last_name, headRes.suffix]
            .filter(Boolean)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim()
        : null;

      // Active flags for UI rules
      const active = activeMap.get(entry.evacuee_resident_id);

      return {
        evacuee_resident_id: entry.evacuee_resident_id,

        // identity + demographics (event-scoped preferred)
        first_name,
        middle_name,
        last_name,
        suffix,
        birthdate,
        sex,
        barangay_of_origin,
        barangay_name,

        // socio-econ (event-scoped preferred)
        marital_status,
        educational_attainment,
        school_of_origin,
        occupation,
        purok,

        // registration summary (latest)
        arrival_timestamp: entry.arrival_timestamp,
        decampment_timestamp: entry.decampment_timestamp,
        reported_age_at_arrival: entry.reported_age_at_arrival,
        disaster_evacuation_event_id: entry.disaster_evacuation_event_id,
        ec_rooms_id: entry.ec_rooms_id,

        // family head summary
        family_head_id: entry.family_head_id,
        family_head_full_name,

        // vulnerabilities (event-scoped preferred)
        vulnerability_type_ids,

        // Active flags (for duplicate blocking in UI)
        is_active: !!active,
        active_event_id: active?.active_event_id ?? null,
        active_disaster_id: active?.active_disaster_id ?? null,
        active_ec_id: active?.active_ec_id ?? null,
        active_ec_name: active?.active_ec_name ?? null,
      };
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("Evacuee search error:", err);
    return next(new ApiError("Internal server error during evacuee search.", 500));
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
