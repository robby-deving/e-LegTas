import { useState, useEffect } from 'react';
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/table";
import { Pagination } from "../components/ui/pagination";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Trash2, Edit } from "lucide-react";
import { usePageTitle } from '../hooks/usePageTitle';
import { EvacuationCenterModal } from '../components/EvacuationCenter/EvacuationCenterModal';
import { useEvacuationCenters } from '../hooks/useEvacuationCenters';
import { useEvacuationCenterMutations } from '../hooks/useEvacuationCenterMutations';
import type { EvacuationCenter } from '../types/evacuation';
import { evacuationCenterService } from '../services/evacuationCenterService';
import { usePermissions } from '../contexts/PermissionContext';

const STATUS_COLORS = {
  'Available': 'text-green-600 bg-green-100',
  'Full': 'text-red-600 bg-red-100',
  'Maintenance': 'text-yellow-600 bg-yellow-100',
  'Unavailable': 'text-gray-600 bg-gray-100'
};

export default function EvacuationCentersPage() {
  usePageTitle('Evacuation Centers');
  
  const { hasPermission } = usePermissions();
  const canCreateCenter = hasPermission('create_evacuation_center');

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCenters, setFilteredCenters] = useState<EvacuationCenter[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingCenter, setEditingCenter] = useState<EvacuationCenter | undefined>(undefined);

  // Hooks
  const { centers, loading, error, refreshCenters } = useEvacuationCenters();
  const { deleteCenter } = useEvacuationCenterMutations();
  const canUpdateCenter = hasPermission('update_evacuation_center');
  const canDeleteCenter = hasPermission('delete_evacuation_center');

  // Filter evacuation centers based on search term
  useEffect(() => {
    const filtered = centers.filter(center =>
      center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      center.address.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCenters(filtered);
    setCurrentPage(1);
  }, [searchTerm, centers]);

  // Handle rows per page change
  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value));
    setCurrentPage(1);
  };

  // Pagination logic
  const totalRows = filteredCenters.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = filteredCenters.slice(startIndex, endIndex);

  // Modal handlers
  const handleAddCenter = () => {
    setModalMode('add');
    setEditingCenter(undefined);
    setIsModalOpen(true);
  };

  const handleEditCenter = async (center: EvacuationCenter) => {
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

  const handleDeleteCenter = async (center: EvacuationCenter) => {
    if (confirm(`Are you sure you want to delete "${center.name}"?`)) {
      const success = await deleteCenter(center.id);
      if (success) {
        refreshCenters();
      }
    }
  };

  const handleModalSuccess = () => {
    refreshCenters();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCenter(undefined);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading evacuation centers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-600 text-lg">Error: {error}</div>
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
        <div className="flex items-center justify-between gap-4">
          <Input
            placeholder="Search by name or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          {canCreateCenter && (
            <Button 
              onClick={handleAddCenter}
              className="bg-green-700 hover:bg-green-800 text-white px-6 flex gap-2 items-center"
            >
              <Plus className="w-4 h-4" />
              Add Evacuation Center
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-input overflow-hidden">
        <div className="relative w-full overflow-x-auto">
          {currentRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="text-gray-500 text-lg font-medium mb-2">
                No evacuation centers found
              </div>
              <p className="text-gray-400 text-sm">
                {searchTerm ? 'Try adjusting your search criteria' : 'Click "Add Evacuation Center" to get started'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="text-left">Evacuation Center</TableHead>
                  <TableHead className="text-left">Address</TableHead>
                  <TableHead className="text-left">Category</TableHead>
                  <TableHead className="text-left">Total Individual</TableHead>
                  <TableHead className="text-left">Longitude</TableHead>
                  <TableHead className="text-left">Latitude</TableHead>
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
                    <TableCell className="text-foreground">
                      {center.total_capacity}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {center.longitude.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {center.latitude.toFixed(4)}
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[center.ec_status]}`}>
                        {center.ec_status}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            disabled={!canUpdateCenter}
                            onClick={() => { if (!canUpdateCenter) return; handleEditCenter(center); }}
                            className={`cursor-pointer ${!canUpdateCenter ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            disabled={!canDeleteCenter}
                            onClick={() => { if (!canDeleteCenter) return; handleDeleteCenter(center); }}
                            className={`cursor-pointer ${canDeleteCenter ? 'text-red-600' : 'text-red-300 opacity-50 cursor-not-allowed'}`}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
    </div>
  );
}