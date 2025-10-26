import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { EvacuationCenterDetail } from "@/types/EvacuationCenterDetails";

export function useEcSubscriptions(
  centerId: number | null | undefined,
  detail: EvacuationCenterDetail | null,
  refreshAllDebounced: () => void
) {
  // Core data changes
  useEffect(() => {
    if (!centerId) return;

    const channel = supabase.channel(`ec-detail-core-${centerId}`);

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "evacuation_registrations",
        filter: `disaster_evacuation_event_id=eq.${centerId}`,
      },
      () => refreshAllDebounced()
    );

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "residents" },
      () => refreshAllDebounced()
    );

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "evacuee_residents" },
      () => refreshAllDebounced()
    );

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "evacuation_summaries",
        filter: `disaster_evacuation_event_id=eq.${centerId}`,
      },
      () => refreshAllDebounced()
    );

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "disaster_evacuation_event",
        filter: `id=eq.${centerId}`,
      },
      () => refreshAllDebounced()
    );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [centerId, refreshAllDebounced]);

  // Meta changes (center/disaster)
  useEffect(() => {
    const ecId = detail?.evacuation_center?.evacuation_center_id;
    const disasterIdForDetail = detail?.disaster?.disasters_id;
    if (!centerId || (!ecId && !disasterIdForDetail)) return;

    const channel = supabase.channel(`ec-detail-meta-${centerId}`);

    if (ecId) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "evacuation_center_rooms",
          filter: `evacuation_center_id=eq.${ecId}`,
        },
        () => refreshAllDebounced()
      );
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "evacuation_centers", filter: `id=eq.${ecId}` },
        () => refreshAllDebounced()
      );
    }

    if (disasterIdForDetail) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "disasters", filter: `id=eq.${disasterIdForDetail}` },
        () => refreshAllDebounced()
      );
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    centerId,
    detail?.evacuation_center?.evacuation_center_id,
    detail?.disaster?.disasters_id,
    refreshAllDebounced,
  ]);
}
