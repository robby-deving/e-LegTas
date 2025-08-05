import { supabase } from "../lib/supabaseClient";
import type { EvacuationSummary } from '../types/dashboard';

// Helper function to Listen for evacuation_summaries changes
export function listenToEvacuationSummaryChange(
  channel: ReturnType<typeof supabase.channel>,
  selectedDisasterId: number | undefined,
  checkChanged: (newData: any, oldData: any) => boolean,
  onChange: () => void,
  label: string
) {
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'evacuation_summaries',
    },
    async (payload) => {
      const newData = payload.new as EvacuationSummary;
      const oldData = payload.old as EvacuationSummary;

      const hasChanged = checkChanged(newData, oldData);
      if (!hasChanged) {
        console.log(`${label}: no relevant change — skipping`);
        return;
      }

      const isRelevant = await isEventLinkedToSelectedDisaster(
        newData?.disaster_evacuation_event_id,
        'event',
        selectedDisasterId
      );

      if (isRelevant) {
        console.log(`${label}: relevant change detected — refetching`);
        onChange();
      } else {
        console.log(`${label}: unrelated to selected disaster — skipping`);
      }
    }
  );
}

// Helper function to Listen for evacuation_end_date changes
export function listenToEvacuationEndDateChange(
  channel: ReturnType<typeof supabase.channel>,
  selectedDisasterId: number | undefined,
  onChange: () => void,
  label: string
) {
  channel.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'disaster_evacuation_event',
    },
    (payload) => {
      const newData = payload.new;
      const oldData = payload.old;

      const oldEndDate = oldData?.evacuation_end_date;
      const newEndDate = newData?.evacuation_end_date;

      const endDateChanged =
        oldEndDate !== newEndDate && newData?.disaster_id === selectedDisasterId;

      if (endDateChanged) {
        console.log(`${label}: evacuation_end_date changed — refetching`);
        onChange();
      } else {
        console.log(`${label}: no relevant end_date change — skipping`);
      }
    }
  );
}

// Helper function for only fetching data if it is linked to the selected disaster
export async function isEventLinkedToSelectedDisaster(
  eventIdOrCenterId: number,
  mode: 'event' | 'center',
  selectedDisasterId: number | undefined
): Promise<boolean> {
  if (!selectedDisasterId) return false;

  if (mode === 'event') {
    const { data, error } = await supabase
      .from('disaster_evacuation_event')
      .select('disaster_id')
      .eq('id', eventIdOrCenterId)
      .single();

    if (error || !data) return false;
    return data.disaster_id === selectedDisasterId;
  }

  if (mode === 'center') {
    const { data, error } = await supabase
      .from('disaster_evacuation_event')
      .select('id')
      .eq('evacuation_center_id', eventIdOrCenterId)
      .eq('disaster_id', selectedDisasterId)
      .is('evacuation_end_date', null);

    if (error || !data) return false;
    return data.length > 0;
  }

  return false;
}