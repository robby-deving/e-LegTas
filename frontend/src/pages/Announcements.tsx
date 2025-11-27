// src/components/announcements/AnnouncementsPage.tsx
import { useState, useEffect } from 'react';
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
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

  const auth = useSelector((s: RootState) => s.auth);

  useEffect(() => {
    console.log('auth slice:', auth);
  }, [auth]);

  const {
    announcements,
    loading,
    error,
    saving,
    deleting,
    isSearching,
    createAnnouncement,
    deleteAnnouncement,
    // Pagination state
    totalCount,
    currentPage,
    rowsPerPage,
    searchTerm,
    totalPages,
    // Pagination handlers
    handlePageChange,
    handleRowsPerPageChange,
    handleSearchChange
  } = useAnnouncements();

  const userId = useSelector(selectUserId);

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

  // Handle rows per page change
  const handleRowsPerPageChangeWrapper = (value: string) => {
    handleRowsPerPageChange(Number(value));
  };

  // Use announcements directly since pagination is handled server-side
  const currentRows = announcements as unknown as Announcement[];

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
    if (!userId) {
      navigate('/login');
      return;
    }

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
    <div className="h-full flex flex-col text-black p-10 space-y-3">
      <AnnouncementsHeader
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onAddAnnouncement={handleAddAnnouncement}
        isSearching={isSearching}
      />

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Error State */}
        {error && (
          <div className="text-sm text-red-600">{error}</div>
        )}

        {/* Content */}
        {!error && (
          <>
            <AnnouncementsTable
              currentRows={currentRows}
              expandedRows={expandedRows}
              onToggleExpand={toggleExpand}
              onDeleteClick={handleDeleteClick}
              loading={loading}
              rowsPerPage={rowsPerPage}
            />

            {!loading && (
              <AnnouncementsPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                rowsPerPage={rowsPerPage}
                totalRows={totalCount}
                onRowsPerPageChange={handleRowsPerPageChangeWrapper}
                selectedRowsCount={selectedAnnouncements.length}
              />
            )}
          </>
        )}
      </div>

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
        isSaving={saving}
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
        isDeleting={deleting}
      />
    </div>
  );
}