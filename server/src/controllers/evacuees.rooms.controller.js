// server/src/controllers/evacuees.rooms.controller.js
const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');

class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

/**
 * @desc Get rooms for the evacuation center tied to the given disaster event,
 *       including capacity and computed available slots (active = decampment IS NULL).
 * @route GET /api/v1/evacuees/:disasterEvacuationEventId/rooms?only_available=1|0
 * @access Public
 */
exports.getAllRoomsForDisasterEvacuationEventId = async (req, res, next) => {
  const disasterEvacuationEventId = Number(req.params.disasterEvacuationEventId);
  const onlyAvailable = String(req.query.only_available ?? '1') !== '0'; // default: only rooms with space

  if (!Number.isFinite(disasterEvacuationEventId)) {
    logger.warn('[rooms] Invalid disaster evacuation event id', { disasterEvacuationEventId, query: req.query });
    return next(new ApiError('Invalid disaster evacuation event id.', 400));
  }

  try {
    // 1) Resolve center id for this event
    const { data: eventRow, error: eventErr } = await supabase
      .from('disaster_evacuation_event')
      .select('evacuation_center_id')
      .eq('id', disasterEvacuationEventId)
      .single();

    if (eventErr || !eventRow) {
      if (eventErr) logger.error('[rooms] Supabase error resolving event center', { error: eventErr.message, details: eventErr, disasterEvacuationEventId });
      logger.warn('[rooms] Disaster evacuation event not found', { disasterEvacuationEventId });
      return next(new ApiError('Disaster evacuation event not found.', 404));
    }

    // 2) Rooms (include capacity)
    const { data: rooms, error: roomsErr } = await supabase
      .from('evacuation_center_rooms')
      .select('id, room_name, individual_room_capacity')
      .eq('evacuation_center_id', eventRow.evacuation_center_id)
      .order('room_name', { ascending: true });

    if (roomsErr) {
      logger.error('[rooms] Supabase error fetching rooms', { error: roomsErr.message, details: roomsErr, evacuation_center_id: eventRow.evacuation_center_id });
      return next(new ApiError('Failed to fetch evacuation center rooms.', 500));
    }

    // 3) Occupancy for THIS event (active = decampment_timestamp IS NULL)
    const { data: occRows, error: occErr } = await supabase
      .from('evacuation_registrations')
      .select('ec_rooms_id')
      .eq('disaster_evacuation_event_id', disasterEvacuationEventId)
      .is('decampment_timestamp', null);

    if (occErr) {
      logger.error('[rooms] Supabase error fetching occupancy', { error: occErr.message, details: occErr, disasterEvacuationEventId });
      return next(new ApiError('Failed to fetch room occupancy.', 500));
    }

    // 4) Count occupants per room
    const occMap = new Map(); // room_id -> count
    for (const row of occRows || []) {
      const rid = row.ec_rooms_id;
      if (!rid) continue;
      occMap.set(rid, (occMap.get(rid) || 0) + 1);
    }
    logger.debug('[rooms] Occupancy map built', { size: occMap.size });

    // 5) Compose rooms with availability
    const withAvailability = (rooms || []).map((r) => {
      const capacity = Number(r.individual_room_capacity || 0);
      const occupants = occMap.get(r.id) || 0;
      return {
        id: r.id,
        room_name: r.room_name,
        capacity,
        available: Math.max(capacity - occupants, 0),
      };
    });

    const filtered = onlyAvailable
      ? withAvailability.filter((r) => r.available > 0)
      : withAvailability;

    logger.info('[rooms] Rooms fetched successfully', {
      eventId: disasterEvacuationEventId,
      onlyAvailable,
      totalRooms: withAvailability.length,
      returned: filtered.length,
    });
    logger.debug('[rooms] Rooms payload (sample)', { sample: filtered.slice(0, 5) });

    return res.status(200).json({
      message: 'Rooms fetched successfully.',
      count: filtered.length,
      data: filtered,           // [{ id, room_name, capacity, available }]
      all_full: onlyAvailable && filtered.length === 0,
    });
  } catch (err) {
    logger.error('[rooms] getAllRoomsForDisasterEvacuationEventId fatal', { error: err.message, stack: err.stack, disasterEvacuationEventId });
    return next(new ApiError('Internal server error.', 500));
  }
};
