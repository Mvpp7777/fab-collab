"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type SectionInsertHandler = (row: {
  section_id: string;
  content_text: string;
  saved_by: string | null;
  created_at: string;
}) => void;

type RelayUpdateHandler = (row: {
  old: { current_holder: string | null };
  new: { current_holder: string | null };
}) => void;

export default function RealtimeProjectBridge({
  projectId,
  sectionIds,
  onSectionSnapshot,
  onRelayChange,
}: {
  projectId: string;
  sectionIds: string[];
  onSectionSnapshot: SectionInsertHandler;
  onRelayChange: RelayUpdateHandler;
}) {
  useEffect(() => {
    if (sectionIds.length === 0) return;
    const client = createClient();
    const ids = new Set(sectionIds);

    const channel = client
      .channel(`project-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "content_snapshots",
        },
        (payload) => {
          const row = payload.new as {
            section_id: string;
            content_text: string;
            saved_by: string | null;
            created_at: string;
          };
          if (!ids.has(row.section_id)) return;
          onSectionSnapshot(row);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "relay_state",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          onRelayChange({
            old: payload.old as { current_holder: string | null },
            new: payload.new as { current_holder: string | null },
          });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [projectId, sectionIds, onSectionSnapshot, onRelayChange]);

  return null;
}
