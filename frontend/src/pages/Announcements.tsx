// src/components/announcements/AnnouncementsPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import AnnouncementsHeader from '../components/Announcement/AnnouncementsHeader';
import AnnouncementsPagination from '../components/Announcement/AnnouncementsPagination';
import CreateAnnouncementModal from '../components/Announcement/CreateAnnouncementModal';
import DeleteConfirmationDialog from '../components/Announcement/DeleteConfirmationDialog';
import ConfirmPostDialog from '../components/Announcement/ConfirmPostDialog';
import AnnouncementsTable from '../components/Announcement/AnnouncementsTable';
import { useAnnouncements } from '../hooks/useAnnouncements.ts';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { selectUserId } from '../features/auth/authSlice';

type Announcement = {
  id: number;
  title: string;
  body: string;
  date: string;
  created_by: number;
  created_at: string;
};



export default function AnnouncementsPage() {
  usePageTitle('Announcements');

  const auth = useSelector((s: RootState) => s.auth);

  useEffect(() => {
    console.log('auth slice:', auth);
  }, [auth]);

  const {
    announcements,
    loading,
    error,
    createAnnouncement,
    deleteAnnouncement,
  } = useAnnouncements();

  const userId = useSelector(selectUserId);

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedAnnouncements] = useState<string[]>([]);
  const [expandedRows, setExpandedRows] = useState<Record<number, { title: boolean; body: boolean }>>({});

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isConfirmPostDialogOpen, setIsConfirmPostDialogOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    body: ''
  });

  // Update filtered list when announcements or search term changes
  useEffect(() => {
    const list = (announcements as unknown as Announcement[]) || [];
    const filtered = list.filter((a) =>
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.body.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAnnouncements(filtered);
    setCurrentPage(1);
  }, [announcements, searchTerm]);

  // Handle rows per page change
  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value));
    setCurrentPage(1);
  };

  // Pagination logic
  const totalRows = filteredAnnouncements.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = useMemo(
    () => filteredAnnouncements.slice(startIndex, endIndex),
    [filteredAnnouncements, startIndex, endIndex]
  );

  // Modal handlers
  const handleAddAnnouncement = () => {
    setFormData({ title: '', body: '' });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (announcement: Announcement) => {
    setAnnouncementToDelete(announcement);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!announcementToDelete) return;
    const ok = await deleteAnnouncement(announcementToDelete.id);
    if (ok) {
      setIsDeleteDialogOpen(false);
      setAnnouncementToDelete(null);
    }
  };

  const handleFormInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveAnnouncement = () => {
    if (formData.title.trim() && formData.body.trim()) {
      setIsModalOpen(false);
      setIsConfirmPostDialogOpen(true);
    }
  };

  const handleConfirmPost = async () => {
    const created = await createAnnouncement({
      title: formData.title.trim(),
      body: formData.body.trim(),
      created_by: userId,
    });
    if (created) {
      setIsModalOpen(false);
      setIsConfirmPostDialogOpen(false);
      setFormData({ title: '', body: '' });
    }
  };

  // Toggle expand/collapse for title or body
  const toggleExpand = (announcementId: number, type: 'title' | 'body') => {
    setExpandedRows((prev) => ({
      ...prev,
      [announcementId]: {
        ...prev[announcementId],
        [type]: !prev[announcementId]?.[type]
      }
    }));
  };

  return (
    <div className="text-black p-6 space-y-6 flex flex-col">
      <AnnouncementsHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onAddAnnouncement={handleAddAnnouncement}
      />

      {/* Optional: lightweight loading/error states */}
      {loading && (
        <div className="text-sm text-gray-500">Loading announcements...</div>
      )}
      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      <AnnouncementsTable
        currentRows={currentRows}
        expandedRows={expandedRows}
        onToggleExpand={toggleExpand}
        onDeleteClick={handleDeleteClick}
      />

      <AnnouncementsPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        rowsPerPage={rowsPerPage}
        totalRows={totalRows}
        onRowsPerPageChange={handleRowsPerPageChange}
        selectedRowsCount={selectedAnnouncements.length}
      />

      <CreateAnnouncementModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setIsConfirmPostDialogOpen(false);
          setFormData({ title: '', body: '' });
        }}
        formData={formData}
        onInputChange={handleFormInputChange}
        onSave={handleSaveAnnouncement}
      />

      <ConfirmPostDialog
        isOpen={isConfirmPostDialogOpen}
        onClose={() => setIsConfirmPostDialogOpen(false)}
        onConfirm={handleConfirmPost}
        formData={formData}
        onBackToEdit={() => {
          setIsConfirmPostDialogOpen(false);
          setIsModalOpen(true);
        }}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        announcement={announcementToDelete}
      />
    </div>
  );
}