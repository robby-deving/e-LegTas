import { useEffect, useMemo, useState } from 'react';
import { notificationService } from '../services/notificationService.ts';
import type { ServerAnnouncement } from '../services/notificationService.ts';

type UIAnnouncement = {
  id: number;
  title: string;
  body: string;
  created_by?: number;
  created_at: string;
  updated_at?: string | null;
  expires_at?: string | null;
  date: string; // display field
};

type CreateAnnouncementInput = {
  title: string;
  body: string;
  created_by?: number;
};

function formatDisplayDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<UIAnnouncement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  const toUI = (a: ServerAnnouncement): UIAnnouncement => ({
    id: a.id,
    title: a?.title ?? '',
    body: a?.content ?? '',
    created_by: a?.created_by,
    created_at: a?.created_at,
    updated_at: a?.updated_at,
    expires_at: a?.expires_at,
    date: formatDisplayDate(a?.date_posted ?? a?.created_at),
  });

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationService.getAnnouncements();
      setAnnouncements((data ?? []).map(toUI));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const createAnnouncement = async (payload: CreateAnnouncementInput): Promise<UIAnnouncement | null> => {
    try {
      setSaving(true);
      setError(null);
      const created = await notificationService.createAnnouncement({
        title: payload.title,
        content: payload.body,
        created_by: payload.created_by,
      });
      const mapped = toUI(created);
      setAnnouncements((prev) => [mapped, ...prev]);
      return mapped;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create announcement');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const deleteAnnouncement = async (id: number): Promise<boolean> => {
    try {
      setDeleting(true);
      setError(null);
      await notificationService.deleteNotification(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete announcement');
      return false;
    } finally {
      setDeleting(false);
    }
  };

  const state = useMemo(
    () => ({ announcements, loading, error, saving, deleting }),
    [announcements, loading, error, saving, deleting]
  );

  return { ...state, refresh: fetchAnnouncements, createAnnouncement, deleteAnnouncement };
}