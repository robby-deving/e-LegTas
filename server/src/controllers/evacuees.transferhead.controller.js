// server/src/controllers/evacuees.transferhead.controller.js
const { supabase } = require('../config/supabase');
const { invalidateEvacueeSearchCache } = require('./evacuees.search.controller');

class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

/**
 * @desc Transfer the family head to another member.
 *       GLOBAL: repoints family_head_id on evacuee_residents + registrations.
 *       EVENT-SCOPED: also patches profile_snapshot.relationship_to_family_head
 *       for the specified event so Edit modal reflects the new roles.
 * @route POST /api/v1/evacuees/:disasterEvacuationEventId/transfer-head
 * @access Private (Camp Manager only)
 */
exports.transferHead = async (req, res, next) => {
  const { disasterEvacuationEventId } = req.params;
  const {
    from_family_head_id,
    to_evacuee_resident_id,
    old_head_new_relationship = 'Spouse',
  } = req.body || {};

  const eventIdNum = Number(disasterEvacuationEventId);
  const fromFH = Number(from_family_head_id);
  const toEvac = Number(to_evacuee_resident_id);

  if (
    !Number.isFinite(eventIdNum) ||
    !Number.isFinite(fromFH) ||
    !Number.isFinite(toEvac) ||
    typeof old_head_new_relationship !== 'string' ||
    !old_head_new_relationship.trim()
  ) {
    return next(new ApiError('Missing or invalid fields for transfer.', 400));
  }

  let mutated = false; // track if any DB write succeeded so we can invalidate cache

  try {
    // A) Validate: target member is in this family for THIS event
    const { count: membershipCount, error: memberCheckErr } = await supabase
      .from('evacuation_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('evacuee_resident_id', toEvac)
      .eq('family_head_id', fromFH)
      .eq('disaster_evacuation_event_id', eventIdNum);

    if (memberCheckErr) throw new ApiError('Failed to validate family membership.', 500);
    if ((membershipCount ?? 0) === 0) {
      return next(
        new ApiError(
          'Target member is not part of this family for the specified event.',
          400
        )
      );
    }

    // B) Member we promote (need resident_id)
    const { data: promoteRow, error: promoteErr } = await supabase
      .from('evacuee_residents')
      .select('id, resident_id, relationship_to_family_head, family_head_id')
      .eq('id', toEvac)
      .single();
    if (promoteErr || !promoteRow) {
      return next(new ApiError('Member to promote not found.', 404));
    }

    // C) Old head's resident_id
    const { data: oldFHRow, error: oldFHErr } = await supabase
      .from('family_head')
      .select('id, resident_id')
      .eq('id', fromFH)
      .single();
    if (oldFHErr || !oldFHRow) {
      throw new ApiError('Old family head record not found.', 404);
    }

    // Also find old-head evacuee_residents.id (for event snapshot patch)
    const { data: oldHeadEvacueeRow, error: oldHeadEvacErr } = await supabase
      .from('evacuee_residents')
      .select('id')
      .eq('resident_id', oldFHRow.resident_id)
      .single();
    if (oldHeadEvacErr || !oldHeadEvacueeRow) {
      throw new ApiError("Could not locate old head's evacuee record.", 404);
    }

    // D) Ensure a family_head row for the promoted resident
    let new_family_head_id = null;
    const { data: existingHead, error: headFindErr } = await supabase
      .from('family_head')
      .select('id')
      .eq('resident_id', promoteRow.resident_id)
      .maybeSingle();
    if (headFindErr) throw new ApiError('Failed to resolve family head record.', 500);

    if (existingHead?.id) {
      new_family_head_id = existingHead.id;
    } else {
      const { data: insertedHead, error: headInsertErr } = await supabase
        .from('family_head')
        .insert([{ resident_id: promoteRow.resident_id }])
        .select('id')
        .single();
      if (headInsertErr) {
        if (headInsertErr.code === '23505') {
          throw new ApiError(
            `Duplicate key on 'family_head.id'. Run: SELECT setval(pg_get_serial_sequence('family_head','id'), (SELECT MAX(id) FROM family_head)+1);`,
            500
          );
        }
        throw new ApiError('Failed to create new family head record.', 500);
      }
      new_family_head_id = insertedHead.id;
      mutated = true;
    }

    const nowIso = new Date().toISOString();

    // E) Promote the selected member to Head (GLOBAL)
    {
      const { error: promoteRelErr } = await supabase
        .from('evacuee_residents')
        .update({
          relationship_to_family_head: 'Head',
          family_head_id: new_family_head_id,
          updated_at: nowIso,
        })
        .eq('id', toEvac);
      if (promoteRelErr) throw new ApiError('Failed to set promoted member as head.', 500);
      mutated = true;
    }

    // F) Demote the OLD head (GLOBAL)
    {
      const { error: oldHeadDemoteErr } = await supabase
        .from('evacuee_residents')
        .update({
          relationship_to_family_head: old_head_new_relationship,
          family_head_id: new_family_head_id,
          updated_at: nowIso,
        })
        .eq('resident_id', oldFHRow.resident_id)
        .eq('relationship_to_family_head', 'Head');
      if (oldHeadDemoteErr) throw new ApiError('Failed to update old head relationship.', 500);
      mutated = true;
    }

    // G) Repoint ALL members to the new family_head_id (GLOBAL)
    {
      const { error: allMembersRepointErr } = await supabase
        .from('evacuee_residents')
        .update({ family_head_id: new_family_head_id, updated_at: nowIso })
        .eq('family_head_id', fromFH);
      if (allMembersRepointErr) throw new ApiError('Failed to reassign family members to new head.', 500);
      mutated = true;
    }

    // H) Update registrations to point at new head (GLOBAL)
    {
      const { error: regRepointErr } = await supabase
        .from('evacuation_registrations')
        .update({ family_head_id: new_family_head_id, updated_at: nowIso })
        .eq('family_head_id', fromFH);
      if (regRepointErr) throw new ApiError('Failed to update registrations to new head.', 500);
      mutated = true;
    }

    // I) Patch EVENT-SCOPED snapshots (this event)
    // Promoted member’s snapshot -> Head
    {
      const { data: promoteReg, error: promoteRegErr } = await supabase
        .from('evacuation_registrations')
        .select('id, profile_snapshot')
        .eq('evacuee_resident_id', toEvac)
        .eq('disaster_evacuation_event_id', eventIdNum)
        .maybeSingle();
      if (promoteRegErr) throw new ApiError('Failed to load promoted member registration.', 500);
      if (promoteReg?.id) {
        const patched = { ...(promoteReg.profile_snapshot || {}), relationship_to_family_head: 'Head' };
        const { error } = await supabase
          .from('evacuation_registrations')
          .update({ profile_snapshot: patched, updated_at: nowIso })
          .eq('id', promoteReg.id);
        if (error) throw new ApiError('Failed to update promoted member event snapshot.', 500);
        mutated = true;
      }
    }

    // Old head’s snapshot in THIS event -> demoted role
    {
      const oldEvacId = oldHeadEvacueeRow.id;
      const { data: oldReg, error: oldRegErr } = await supabase
        .from('evacuation_registrations')
        .select('id, profile_snapshot')
        .eq('evacuee_resident_id', oldEvacId)
        .eq('disaster_evacuation_event_id', eventIdNum)
        .maybeSingle();
      if (oldRegErr) throw new ApiError('Failed to load old head registration.', 500);
      if (oldReg?.id) {
        const patched = { ...(oldReg.profile_snapshot || {}), relationship_to_family_head: old_head_new_relationship };
        const { error } = await supabase
          .from('evacuation_registrations')
          .update({ profile_snapshot: patched, updated_at: nowIso })
          .eq('id', oldReg.id);
        if (error) throw new ApiError('Failed to update old head event snapshot.', 500);
        mutated = true;
      }
    }

    return res.status(200).json({
      message: 'Family head transferred successfully.',
      data: { new_family_head_id },
    });
  } catch (err) {
    console.error('transferHead error:', err);
    return next(err instanceof ApiError ? err : new ApiError('Internal error during head transfer.', 500));
  } finally {
    if (mutated) {
      invalidateEvacueeSearchCache();
    }
  }
};
