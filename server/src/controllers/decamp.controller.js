// server/src/controllers/decamp.controller.js
const { supabase } = require('../config/supabase');
const { invalidateEvacueeSearchCache } = require('./evacuees.search.controller'); // NEW

class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

async function isEventEnded(eventId) {
  const { data, error } = await supabase
    .from("disaster_evacuation_event")
    .select("evacuation_end_date")
    .eq("id", eventId)
    .single();
  if (error || !data) throw new ApiError("Disaster evacuation event not found.", 404);
  return Boolean(data.evacuation_end_date);
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

  const dryRun =
    String(req.query?.dry_run ?? "").toLowerCase() === "1" ||
    String(req.query?.dry_run ?? "").toLowerCase() === "true";

  try {
    if (!eventId || !familyHeadId) {
      return res
        .status(400)
        .json({ message: "disasterEvacuationEventId and familyHeadId are required path params." });
    }

    // Block any write when the event is already ended
    if (await isEventEnded(eventId)) {
      return next(new ApiError("Evacuation operation already ended.", 409));
    }

    const { data: eventRow, error: eventErr } = await supabase
      .from("disaster_evacuation_event")
      .select("id, disaster_id")
      .eq("id", eventId)
      .single();

    if (eventErr || !eventRow) {
      return res.status(404).json({ message: "Disaster evacuation event not found." });
    }

    // --- CLEAR decampment branch ---
    if (rawTs === null || (typeof rawTs === "string" && rawTs.trim() === "")) {
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

      if ((othersActive?.length ?? 0) > 0) {
        const other =
          othersActive.find((a) => Number(a.disaster_evacuation_event_id) !== eventId) ||
          othersActive[0];

        const otherEventId = Number(other?.disaster_evacuation_event_id) || null;
        const ecName = other?.disaster_evacuation_event?.evacuation_centers?.name;

        let disasterId, disasterName, disasterTypeName;

        if (otherEventId) {
          const { data: otherEvent } = await supabase
            .from("disaster_evacuation_event")
            .select("id, disaster_id")
            .eq("id", otherEventId)
            .single();

          if (otherEvent?.disaster_id) {
            disasterId = otherEvent.disaster_id;

            const { data: disRow } = await supabase
              .from("disasters")
              .select("disaster_name, disaster_type_id, disaster_types(name)")
              .eq("id", disasterId)
              .single();

            if (disRow) {
              disasterName = disRow.disaster_name;
              disasterTypeName = disRow?.disaster_types?.name;
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

        const payload = {
          allowed: false,
          code: "UndecampConflict",
          ec_name: ecName || undefined,
          disaster_id: disasterId || undefined,
          disaster_name: disasterName || undefined,
          disaster_type_name: disasterTypeName || undefined,
          message: `This family is already active${ecName ? ` in ${ecName}` : ""}. Only one active event is allowed.`,
        };

        if (dryRun) return res.status(200).json(payload);
        return res.status(409).json(payload);
      }

      if (dryRun) {
        return res.status(200).json({ allowed: true });
      }

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

      // NEW: clear cached search so decampment shows correctly
      try { invalidateEvacueeSearchCache(); } catch {}

      return res.json({
        message: "Decampment cleared for the family.",
        updated: clearedRows?.length ?? 0,
        rows: clearedRows ?? [],
      });
    }

    // --- SET/UPDATE decampment branch ---
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

    // NEW: invalidate after successful update
    try { invalidateEvacueeSearchCache(); } catch {}

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

// GET /evacuees/:disasterEvacuationEventId/undecamped-count
exports.undecampedCountInEvent = async (req, res) => {
  const eventId = Number(req.params.disasterEvacuationEventId);
  if (!eventId) return res.status(400).json({ message: "Invalid event id." });

  const { count, error } = await supabase
    .from('evacuation_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('disaster_evacuation_event_id', eventId)
    .is('decampment_timestamp', null);

  if (error) return res.status(500).json({ message: error.message });
  return res.json({ count: count ?? 0 });
};

// POST /evacuees/:disasterEvacuationEventId/decamp-all { decampment_timestamp }
exports.decampAllFamiliesInEvent = async (req, res) => {
  const eventId = Number(req.params.disasterEvacuationEventId);
  const rawTs = req.body?.decampment_timestamp;

  if (!eventId) return res.status(400).json({ message: "Invalid event id." });
  if (!rawTs || typeof rawTs !== 'string') {
    return res.status(400).json({ message: "decampment_timestamp (ISO) is required." });
  }

  const ts = new Date(rawTs);
  if (isNaN(ts.getTime())) return res.status(400).json({ message: "Invalid decampment_timestamp." });

  // Validate vs event start
  const { data: eventRow, error: evErr } = await supabase
    .from('disaster_evacuation_event')
    .select('id, evacuation_start_date')
    .eq('id', eventId)
    .single();

  if (evErr || !eventRow) return res.status(404).json({ message: "Event not found." });

  const start = new Date(eventRow.evacuation_start_date ?? new Date(0));
  if (ts <= start) {
    return res.status(400).json({ message: "Decampment must be later than the evacuation_start_date." });
  }

  // Bulk update undecamped rows whose arrival < chosen timestamp
  const { data: updated, error: upErr } = await supabase
    .from('evacuation_registrations')
    .update({ decampment_timestamp: ts.toISOString(), updated_at: new Date().toISOString() })
    .eq('disaster_evacuation_event_id', eventId)
    .is('decampment_timestamp', null)
    .lt('arrival_timestamp', ts.toISOString())
    .select('id');

  if (upErr) return res.status(500).json({ message: upErr.message });

  // NEW: invalidate after bulk change (even if 0 rows, harmless)
  try { invalidateEvacueeSearchCache(); } catch {}

  // Count what remains (if user chose a timestamp earlier than some arrivals)
  const { count: remain, error: remainErr } = await supabase
    .from('evacuation_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('disaster_evacuation_event_id', eventId)
    .is('decampment_timestamp', null);

  if (remainErr) return res.status(500).json({ message: remainErr.message });

  return res.json({
    message: "Decamped all eligible families.",
    updated: updated?.length ?? 0,
    remaining_undecamped: remain ?? 0,
  });
};

// POST /evacuees/:disasterEvacuationEventId/end { evacuation_end_date }
exports.endEvacuationOperation = async (req, res) => {
  const eventId = Number(req.params.disasterEvacuationEventId);
  const rawTs = req.body?.evacuation_end_date;

  if (!eventId) return res.status(400).json({ message: "Invalid event id." });

  const ts = rawTs ? new Date(rawTs) : new Date();
  if (isNaN(ts.getTime())) return res.status(400).json({ message: "Invalid evacuation_end_date." });

  try {
    // 1) Make sure the event exists, and not already ended
    const { data: evt, error: evtErr } = await supabase
      .from("disaster_evacuation_event")
      .select("id, evacuation_end_date")
      .eq("id", eventId)
      .maybeSingle();

    if (evtErr) return res.status(500).json({ message: evtErr.message });
    if (!evt) return res.status(404).json({ message: "Event not found." });
    if (evt.evacuation_end_date) {
      return res.status(409).json({ message: "Evacuation operation already ended." });
    }

    // 2) Must have 0 active (undecamped)
    const { count, error } = await supabase
      .from("evacuation_registrations")
      .select("id", { count: "exact", head: true })
      .eq("disaster_evacuation_event_id", eventId)
      .is("decampment_timestamp", null);

    if (error) return res.status(500).json({ message: error.message });
    if ((count ?? 0) > 0) {
      return res.status(409).json({ message: "Cannot end operation: there are still undecamped families." });
    }

    // 3) Update end date
    const { data, error: endErr } = await supabase
      .from("disaster_evacuation_event")
      .update({ evacuation_end_date: ts.toISOString() })
      .eq("id", eventId)
      .select("id, evacuation_end_date")
      .maybeSingle();

    if (endErr) {
      console.error("[endEvacuationOperation] update error:", endErr);
      return res.status(500).json({ message: endErr.message });
    }
    if (!data) return res.status(404).json({ message: "Event not found or not updated." });

    // NEW: optional invalidate (keeps UI consistent around event state)
    try { invalidateEvacueeSearchCache(); } catch {}

    return res.json({ message: "Evacuation operation ended.", event: data });
  } catch (err) {
    console.error("[endEvacuationOperation] Unhandled exception", err);
    return res.status(500).json({ message: "Internal error during endEvacuationOperation." });
  }
};
