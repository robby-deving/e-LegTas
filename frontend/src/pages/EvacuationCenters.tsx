import { useState, useEffect, useCallback } from 'react';
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/table";
import { Pagination } from "../components/ui/pagination";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Plus, MoreHorizontal, Trash2, Edit } from "lucide-react";
import { usePageTitle } from '../hooks/usePageTitle';
import { EvacuationCenterModal } from '../components/EvacuationCenter/EvacuationCenterModal';
import DeleteConfirmationDialog from '../components/EvacuationCenter/DeleteConfirmationDialog';
import { useEvacuationCenters } from '../hooks/useEvacuationCenters';
import { useEvacuationCenterMutations } from '../hooks/useEvacuationCenterMutations';
import { useDebounce } from '../hooks/useDebounce';
import type { EvacuationCenter } from '../types/evacuation';
import { evacuationCenterService } from '../services/evacuationCenterService';
import { usePermissions } from '../contexts/PermissionContext';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectIsAuthenticated, selectUserId, selectAssignedBarangayId } from '../features/auth/authSlice';
import LoadingSpinner from '../components/loadingSpinner';
import { toast } from 'react-hot-toast';

const STATUS_COLORS = {
  'Available': 'text-green-600 bg-green-100',
  'Full': 'text-red-600 bg-red-100',
  'Maintenance': 'text-yellow-600 bg-yellow-100',
  'Unavailable': 'text-gray-600 bg-gray-100'
};


export default function EvacuationCentersPage() {
  usePageTitle('Evacuation Centers');

  const navigate = useNavigate();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUserId = useSelector(selectUserId);
    const assignedBarangayId = useSelector(selectAssignedBarangayId);
    const { hasPermission } = usePermissions();
  const canUpdateCenter = hasPermission('update_evacuation_center');
  const canDeleteCenter = hasPermission('delete_evacuation_center');
  const canAddOutsideEC = hasPermission('add_outside_ec');
  const canEditOutsideEC = hasPermission('edit_outside_ec');

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingCenter, setEditingCenter] = useState<EvacuationCenter | undefined>(undefined);

  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [centerToDelete, setCenterToDelete] = useState<EvacuationCenter | null>(null);

  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);


  const [activeTab, setActiveTab] = useState<'Inside EC' | 'Outside EC'>('Inside EC');

  // Handle tab change
  const handleTabChange = (tabName: 'Inside EC' | 'Outside EC') => {
    setActiveTab(tabName);
    setCurrentPage(1); // Reset to first page when changing tabs
    setRowsPerPage(10); // Reset rows per page to default
    setSearchTerm(''); // Clear search when changing tabs
  };

  // Helper function to get current parameters
  const getCurrentParams = useCallback(() => ({
    limit: rowsPerPage,
    offset: (currentPage - 1) * rowsPerPage,
    search: debouncedSearchTerm,
    ec_type: (activeTab === 'Inside EC' ? 'inside' : 'outside') as 'inside' | 'outside',
    barangay_id: assignedBarangayId || undefined
  }), [rowsPerPage, currentPage, debouncedSearchTerm, activeTab, assignedBarangayId]);

  // Hooks
  const {
    centers,
    loading,
    error,
    pagination,
    refreshCenters,
    refreshWithCurrentParams,
    refetchWithParams
  } = useEvacuationCenters();

  const {
    deleteCenter,
    isCreating,
    isUpdating,
    isDeleting
  } = useEvacuationCenterMutations();

  // Handle search changes
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) {
      setCurrentPage(1); // Reset to first page when search changes
    }
  }, [debouncedSearchTerm]);

  // Handle data fetching
  useEffect(() => {
    refetchWithParams(getCurrentParams());
  }, [currentPage, rowsPerPage, debouncedSearchTerm, activeTab, assignedBarangayId, refetchWithParams, getCurrentParams]);

  // Handle rows per page change
  const handleRowsPerPageChange = (value: string) => {
    const newRowsPerPage = Number(value);
    setRowsPerPage(newRowsPerPage);
    
    // Calculate the first item index of current page
    const currentFirstItem = (currentPage - 1) * rowsPerPage;
    
    // Calculate what page this item should be on with new rows per page
    const newPage = Math.floor(currentFirstItem / newRowsPerPage) + 1;
    
    setCurrentPage(newPage);
  };

  // Use pagination data from server
  const currentRows = centers;
  const totalRows = pagination?.total || 0;
  const totalPages = pagination?.totalPages || 0;

  // Modal handlers
  const handleAddCenter = () => {
    if (!isAuthenticated || !currentUserId) {
      console.warn('User not authenticated, redirecting to login');
      navigate('/login');
      return;
    }
    setModalMode('add');
    setEditingCenter(undefined);
    setIsModalOpen(true);
  };

  const handleEditCenter = async (center: EvacuationCenter) => {
    if (!isAuthenticated || !currentUserId) {
      console.warn('User not authenticated, redirecting to login');
      navigate('/login');
      return;
    }

    try {
      // Fetch the complete center data including rooms
      const completeCenter = await evacuationCenterService.getEvacuationCenter(center.id);
      setModalMode('edit');
      setEditingCenter(completeCenter);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error fetching center details:', error);
      // Optionally show an error message to the user
    }
  };

  const handleDeleteCenter = (center: EvacuationCenter) => {
    if (!isAuthenticated || !currentUserId) {
      console.warn('User not authenticated, redirecting to login');
      navigate('/login');
      return;
    }
    setCenterToDelete(center);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!centerToDelete) return;

    const success = await deleteCenter(centerToDelete.id);
    if (success) {
      toast.success('Evacuation center deleted successfully');

      // Refresh with current parameters to maintain filters and pagination
      refreshWithCurrentParams(getCurrentParams());

      setIsDeleteModalOpen(false);
      setCenterToDelete(null);
    }
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setCenterToDelete(null);
  };

  const handleModalSuccess = () => {
    // Refresh with current parameters to maintain filters and pagination
    refreshWithCurrentParams(getCurrentParams());
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCenter(undefined);
  };


  // Show full page loading only on initial load
  if (loading && !centers.length && currentPage === 1 && !debouncedSearchTerm) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner text="Loading evacuation centers..." size="lg" />
      </div>
    );
  }

  if (error && !centers.length) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium mb-2">Error loading evacuation centers</div>
          <p className="text-gray-600">{error}</p>
          <Button
            onClick={refreshCenters}
            className="mt-4 bg-green-700 hover:bg-green-800"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-black p-6 space-y-6 flex flex-col">
      {/* Page Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-green-800">
          Evacuation Centers
        </h1>

        {/* Search and Add Button */}
        <div className="flex items-center justify-between">
          <Input
            placeholder="Search by name or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <div className="flex gap-4">
             <Tabs
               defaultValue="Inside EC"
               value={activeTab}
               onValueChange={(value) => handleTabChange(value as 'Inside EC' | 'Outside EC')}
             >
               <TabsList>
                 <TabsTrigger value="Inside EC">
                   Inside EC
                 </TabsTrigger>
                 <TabsTrigger value="Outside EC">
                   Outside EC
                 </TabsTrigger>
               </TabsList>
             </Tabs>
          {activeTab === 'Inside EC' && (
            <Button
              onClick={handleAddCenter}
              disabled={isCreating}
              className="bg-green-700 hover:bg-green-800 text-white px-6 flex gap-2 items-center disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Evacuation Center
                </>
              )}
            </Button>
          )}

          {activeTab === 'Outside EC' && canAddOutsideEC && (
            <Button
              onClick={handleAddCenter}
              disabled={isCreating}
              className="bg-green-700 hover:bg-green-800 text-white px-6 flex gap-2 items-center disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Evacuation Center
                </>
              )}
            </Button>
          )}
          </div>
          
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-input overflow-hidden">
        <div className="relative w-full overflow-x-auto">
          {loading ? (
            // Loading rows with skeleton animation
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="text-left">Evacuation Center</TableHead>
                  <TableHead className="text-left">Address</TableHead>
                  <TableHead className="text-left">Category</TableHead>
                  {activeTab === 'Inside EC' && (
                    <>
                      <TableHead className="text-left">Total Individual</TableHead>
                      <TableHead className="text-left">Longitude</TableHead>
                      <TableHead className="text-left">Latitude</TableHead>
                    </>
                  )}
                  <TableHead className="text-left">Status</TableHead>
                  <TableHead className="text-center w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: rowsPerPage }, (_, index) => (
                  <TableRow key={`loading-${index}`}>
                    <TableCell className="py-4">
                      <div className="flex items-center space-x-2">
                        <LoadingSpinner size="sm" />
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-48"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                    </TableCell>
                    {activeTab === 'Inside EC' && (
                      <>
                        <TableCell>
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      <div className="h-6 bg-gray-200 rounded-full animate-pulse w-16"></div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="h-8 w-8 bg-gray-200 rounded animate-pulse mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : currentRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="text-gray-500 text-lg font-medium mb-2">
                {debouncedSearchTerm ? 'No evacuation centers found matching your search' : 'No evacuation centers found'}
              </div>
              <p className="text-gray-400 text-sm">
                {debouncedSearchTerm ? 'Try adjusting your search criteria' : 'Click "Add Evacuation Center" to get started'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="text-left">Evacuation Center</TableHead>
                  <TableHead className="text-left">Address</TableHead>
                  <TableHead className="text-left">Category</TableHead>
                  {activeTab === 'Inside EC' && (
                    <>
                      <TableHead className="text-left">Total Individual</TableHead>
                      <TableHead className="text-left">Longitude</TableHead>
                      <TableHead className="text-left">Latitude</TableHead>
                    </>
                  )}
                  <TableHead className="text-left">Status</TableHead>
                  <TableHead className="text-center w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRows.map((center) => (
                  <TableRow key={center.id} className="hover:bg-gray-50">
                    <TableCell className="text-foreground font-medium">
                      {center.name}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {center.address}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {center.category}
                    </TableCell>
                    {activeTab === 'Inside EC' && (
                      <>
                        <TableCell className="text-foreground">
                          {center.total_capacity}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {center.longitude ? center.longitude.toFixed(4) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {center.latitude ? center.latitude.toFixed(4) : 'N/A'}
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[center.ec_status]}`}>
                        {center.ec_status}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {((activeTab !== 'Outside EC' && canUpdateCenter) || (activeTab === 'Outside EC' && canEditOutsideEC) || canDeleteCenter) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              disabled={isCreating || isUpdating || isDeleting}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {activeTab !== 'Outside EC' && canUpdateCenter && (
                              <DropdownMenuItem
                                onClick={() => handleEditCenter(center)}
                                className="cursor-pointer"
                                disabled={isUpdating}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {activeTab === 'Outside EC' && canEditOutsideEC && (
                              <DropdownMenuItem
                                onClick={() => handleEditCenter(center)}
                                className="cursor-pointer"
                                disabled={isUpdating}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {canDeleteCenter && (
                              <DropdownMenuItem
                                onClick={() => handleDeleteCenter(center)}
                                className="cursor-pointer text-red-600"
                                disabled={isDeleting}
                              >
                                {isDeleting ? (
                                  <>
                                    <LoadingSpinner size="sm" />
                                    <span className="ml-2">Deleting...</span>
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex-1 text-sm text-muted-foreground">
          {currentRows.length} of {totalRows} row(s) shown.
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          rowsPerPage={rowsPerPage}
          totalRows={totalRows}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      </div>

      {/* Add/Edit Evacuation Center Modal */}
      <EvacuationCenterModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        mode={modalMode}
        center={editingCenter}
        onSuccess={handleModalSuccess}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationDialog
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        center={centerToDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}