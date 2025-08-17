const supabase = require("../config/supabase");

class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}


/**
 * @desc Set, update, or clear decampment for a whole family in an event.
 *       If body.decampment_timestamp is null/empty -> clear (set NULL) but block if already active elsewhere.
 *       If it's an ISO string -> set/update decampment (validations apply).
 * @route POST /api/v1/evacuees/:disasterEvacuationEventId/families/:familyHeadId/decamp
 * @body  { decampment_timestamp: string|null }
 * @access Private (Camp Manager)
 */
exports.decampFamily = async (req, res, next) => {
  const eventId = Number(req.params.disasterEvacuationEventId);
  const familyHeadId = Number(req.params.familyHeadId);
  const rawTs = req.body?.decampment_timestamp;

  try {
    if (!eventId || !familyHeadId) {
      return res
        .status(400)
        .json({ message: "disasterEvacuationEventId and familyHeadId are required path params." });
    }

    // Ensure event exists (and grab its disaster_id for validation later)
    const { data: eventRow, error: eventErr } = await supabase
      .from("disaster_evacuation_event")
      .select("id, disaster_id")
      .eq("id", eventId)
      .single();

    if (eventErr || !eventRow) {
      return res.status(404).json({ message: "Disaster evacuation event not found." });
    }

    // -------------------------------------------
    // BRANCH A: CLEAR decampment (set NULL)
    // -------------------------------------------
    if (rawTs === null || (typeof rawTs === "string" && rawTs.trim() === "")) {
      // Guard: DO NOT allow clearing if the same family is already ACTIVE in any OTHER event.
// Guard: DO NOT allow clearing if the same family is already ACTIVE in any OTHER event.
const { data: othersActive, error: othersErr } = await supabase
  .from("evacuation_registrations")
  .select(`
    id,
    disaster_evacuation_event_id,
    disaster_evacuation_event:disaster_evacuation_event_id (
      id,
      disaster_id,
      evacuation_centers ( name ),
      disasters:disaster_id ( disaster_name )
    )
  `)
  .eq("family_head_id", familyHeadId)
  .is("decampment_timestamp", null);

if (othersErr) {
  return res.status(500).json({ message: "Failed to check active registrations." });
}

// ... after othersActive check
if ((othersActive?.length ?? 0) > 0) {
  const other =
    othersActive.find((a) => Number(a.disaster_evacuation_event_id) !== eventId) ||
    othersActive[0];

  const otherEventId = Number(other?.disaster_evacuation_event_id) || null;
  const ecName = other?.disaster_evacuation_event?.evacuation_centers?.name;

  let disasterId = undefined;
  let disasterName = undefined;
  let disasterTypeName = undefined;

  // Robust 2-step lookup to avoid relying on nested joins existing
  if (otherEventId) {
    const { data: otherEvent, error: otherEventErr } = await supabase
      .from("disaster_evacuation_event")
      .select("id, disaster_id")
      .eq("id", otherEventId)
      .single();

    if (!otherEventErr && otherEvent?.disaster_id) {
      disasterId = otherEvent.disaster_id;

      // Try to grab both the name and the type in one go
      const { data: disRow, error: disErr } = await supabase
        .from("disasters")
        .select("disaster_name, disaster_type_id, disaster_types(name)")
        .eq("id", disasterId)
        .single();

      if (!disErr && disRow) {
        disasterName = disRow.disaster_name;
        disasterTypeName = disRow?.disaster_types?.name;

        // Fallback: if nested relation not returned, fetch type by id
        if (!disasterTypeName && disRow?.disaster_type_id) {
          const { data: typeRow } = await supabase
            .from("disaster_types")
            .select("name")
            .eq("id", disRow.disaster_type_id)
            .maybeSingle();
          disasterTypeName = typeRow?.name;
        }
      }
    }
  }

  return res.status(409).json({
    code: "UndecampConflict",
    ec_name: ecName || undefined,
    disaster_id: disasterId || undefined,
    disaster_name: disasterName || undefined,
    disaster_type_name: disasterTypeName || undefined,
    message: `This family is already active${ecName ? ` in ${ecName}` : ""}. Only one active event is allowed.`,
  });
}


      // Proceed to clear decampment for rows in THIS event that currently have a decampment
      const { data: clearedRows, error: clearErr } = await supabase
        .from("evacuation_registrations")
        .update({ decampment_timestamp: null, updated_at: new Date().toISOString() })
        .eq("disaster_evacuation_event_id", eventId)
        .eq("family_head_id", familyHeadId)
        .not("decampment_timestamp", "is", null)
        .select();

      if (clearErr) {
        console.error("[decampFamily][ERROR] Failed to clear decampment", { clearErr });
        return res.status(500).json({ message: `Failed to clear decampment: ${clearErr.message}` });
      }

      return res.json({
        message: "Decampment cleared for the family.",
        updated: clearedRows?.length ?? 0,
        rows: clearedRows ?? [],
      });
    }

    // -------------------------------------------
    // BRANCH B: SET/UPDATE decampment to a timestamp
    // -------------------------------------------
    if (typeof rawTs !== "string") {
      return res.status(400).json({ message: "decampment_timestamp must be ISO string or null." });
    }

    const decampDate = new Date(rawTs);
    if (isNaN(decampDate.getTime())) {
      return res.status(400).json({ message: "Invalid decampment_timestamp (must be ISO 8601)." });
    }

    // Disaster-level bound: must be after disaster_start_date
    const { data: disasterRow, error: disasterErr } = await supabase
      .from("disasters")
      .select("disaster_start_date")
      .eq("id", eventRow.disaster_id)
      .single();

    if (disasterErr || !disasterRow) {
      return res.status(404).json({ message: "Disaster not found for the event." });
    }

    const disasterStart = new Date(disasterRow.disaster_start_date);
    if (decampDate <= disasterStart) {
      return res.status(400).json({ message: "Decampment must be after the disaster_start_date." });
    }

    // Must be later than the family's earliest arrival (prefer active rows; fall back to any)
    const { data: earliestActive, error: eaErr } = await supabase
      .from("evacuation_registrations")
      .select("arrival_timestamp")
      .eq("disaster_evacuation_event_id", eventId)
      .eq("family_head_id", familyHeadId)
      .is("decampment_timestamp", null)
      .order("arrival_timestamp", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (eaErr) {
      console.error("[decampFamily][ERROR] Failed earliestActive", { eaErr });
      return res.status(500).json({ message: `Failed to read registrations: ${eaErr.message}` });
    }

    let earliest = earliestActive;
    let earliestSource = "active";

    if (!earliest) {
      const { data: earliestAny, error: eAnyErr } = await supabase
        .from("evacuation_registrations")
        .select("arrival_timestamp")
        .eq("disaster_evacuation_event_id", eventId)
        .eq("family_head_id", familyHeadId)
        .order("arrival_timestamp", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (eAnyErr) {
        console.error("[decampFamily][ERROR] Failed earliestAny", { eAnyErr });
        return res.status(500).json({ message: `Failed to read registrations: ${eAnyErr.message}` });
      }
      earliest = earliestAny;
      earliestSource = "any";
    }

    if (!earliest) {
      return res.status(404).json({ message: "No registrations for this family in the event." });
    }

    const earliestArrival = new Date(earliest.arrival_timestamp);
    if (decampDate <= earliestArrival) {
      return res
        .status(400)
        .json({ message: "Decampment must be later than the family's earliest arrival." });
    }

    // Update decampment on all rows for this family in THIS event
    const { data: updatedRows, error: updateErr } = await supabase
      .from("evacuation_registrations")
      .update({
        decampment_timestamp: decampDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("disaster_evacuation_event_id", eventId)
      .eq("family_head_id", familyHeadId)
      .select();

    if (updateErr) {
      if (updateErr.code === "23514") {
        return res
          .status(400)
          .json({ message: "Decampment must be later than arrival (CHECK constraint failed)." });
      }
      console.error("[decampFamily][ERROR] Failed to update decampment", { updateErr });
      return res.status(500).json({ message: `Failed to update decampment: ${updateErr.message}` });
    }

    if (earliestSource === "any") {
      console.log("[decampFamily] success edit decampment time and date", {
        eventId,
        familyHeadId,
        decampment_timestamp: decampDate.toISOString(),
      });
    }

    return res.json({
      message: "Decampment saved for the family.",
      updated: updatedRows?.length ?? 0,
      rows: updatedRows ?? [],
    });
  } catch (err) {
    console.error("[decampFamily][ERROR] Unhandled exception", { error: err?.message, stack: err?.stack });
    return next(new ApiError(`Internal error during decampFamily. ${err?.message || ""}`, 500));
  }
};