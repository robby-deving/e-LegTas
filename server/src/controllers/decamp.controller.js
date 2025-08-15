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
 *       If body.decampment_timestamp is null/empty -> clear (set NULL).
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

    const { data: eventRow, error: eventErr } = await supabase
      .from("disaster_evacuation_event")
      .select("id, disaster_id")
      .eq("id", eventId)
      .single();

    if (eventErr || !eventRow) {
      return res.status(404).json({ message: "Disaster evacuation event not found." });
    }

    if (rawTs === null || (typeof rawTs === "string" && rawTs.trim() === "")) {
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

    if (typeof rawTs !== "string") {
      return res.status(400).json({ message: "decampment_timestamp must be ISO string or null." });
    }
    const decampDate = new Date(rawTs);
    if (isNaN(decampDate.getTime())) {
      return res.status(400).json({ message: "Invalid decampment_timestamp (must be ISO 8601)." });
    }

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
