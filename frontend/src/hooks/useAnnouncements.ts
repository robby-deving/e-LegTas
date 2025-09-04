import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { notificationService } from '../services/notificationService.ts';
import { useSelector } from 'react-redux';
import { selectToken } from '../features/auth/authSlice';
import type { ServerAnnouncement, AnnouncementsQueryParams } from '../services/notificationService.ts';

type UIAnnouncement = {
  id: number;
  title: string;
  body: string;
  created_by: number;
  created_at: string;
  updated_at?: string | null;
  expires_at?: string | null;
  date: string; // display field
};

type CreateAnnouncementInput = {
  title: string;
  body: string;
  created_by: number;
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
  const token = useSelector(selectToken);
  const [announcements, setAnnouncements] = useState<UIAnnouncement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Pagination state
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');

  // Debounce timeout ref
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const toUI = (a: ServerAnnouncement): UIAnnouncement => ({
    id: a.id,
    title: a?.title ?? '',
    body: a?.content ?? '',
    created_by: a.created_by,
    created_at: a?.created_at,
    updated_at: a?.updated_at,
    expires_at: a?.expires_at,
    date: formatDisplayDate(a?.date_posted ?? a?.created_at),
  });

  const fetchAnnouncements = useCallback(async (params?: Partial<AnnouncementsQueryParams>) => {
    try {
      setLoading(true);
      setError(null);

      const queryParams: AnnouncementsQueryParams = {
        limit: rowsPerPage,
        offset: (currentPage - 1) * rowsPerPage,
        search: debouncedSearchTerm || undefined,
        ...params
      };

      const response = await notificationService.getAnnouncements(queryParams, token ?? undefined);
      setAnnouncements(response.data.map(toUI));
      setTotalCount(response.totalCount || response.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load announcements');
    } finally {
      setLoading(false);
      setIsSearching(false); // Reset searching state after fetch
    }
  }, [token, rowsPerPage, currentPage, debouncedSearchTerm]);

  // Debounced search effect
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      setIsSearching(false);
    }

    // Set searching state if there's a search term
    if (searchTerm.trim()) {
      setIsSearching(true);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when search is triggered
    }, 500); // 500ms delay

    // Cleanup function to clear timeout
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const createAnnouncement = async (payload: CreateAnnouncementInput): Promise<UIAnnouncement | null> => {
    try {
      setSaving(true);
      setError(null);
      const created = await notificationService.createAnnouncement({
        title: payload.title,
        content: payload.body,
        created_by: payload.created_by,
      }, token ?? undefined);
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
      await notificationService.deleteNotification(id, token ?? undefined);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete announcement');
      return false;
    } finally {
      setDeleting(false);
    }
  };

  // Pagination and search handlers
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleRowsPerPageChange = useCallback((value: number) => {
    setRowsPerPage(value);
    setCurrentPage(1); // Reset to first page when changing rows per page
  }, []);

  const handleSearchChange = useCallback((search: string) => {
    setSearchTerm(search);
  }, []);

  const totalPages = useMemo(() => Math.ceil(totalCount / rowsPerPage), [totalCount, rowsPerPage]);

  const state = useMemo(
    () => ({
      announcements,
      loading,
      error,
      saving,
      deleting,
      isSearching,
      // Pagination state
      totalCount,
      currentPage,
      rowsPerPage,
      searchTerm,
      totalPages
    }),
    [announcements, loading, error, saving, deleting, isSearching, totalCount, currentPage, rowsPerPage, searchTerm, totalPages]
  );

  return {
    ...state,
    refresh: fetchAnnouncements,
    createAnnouncement,
    deleteAnnouncement,
    // Pagination handlers
    handlePageChange,
    handleRowsPerPageChange,
    handleSearchChange
  };
}