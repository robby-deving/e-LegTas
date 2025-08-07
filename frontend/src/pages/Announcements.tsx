import { useState, useEffect } from 'react';
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/table";
import { Pagination } from "../components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { Plus, Trash2, X } from "lucide-react";
import { usePageTitle } from '../hooks/usePageTitle';

type Announcement = {
  id: number;
  title: string;
  body: string;
  date: string;
  created_by: number;
  created_at: string;
};

const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 1,
    title: "Emergency Evacuation Drill - June 15, 2025",
    body: "All residents are required to participate in the emergency evacuation drill scheduled for June 15, 2025, at 2:00 PM. Please report to your designated evacuation centers and follow the instructions of emergency personnel.",
    date: "June 10, 2025 | 9:00am",
    created_by: 1,
    created_at: "2025-06-10T09:00:00Z"
  },
  {
    id: 2,
    title: "Flood Warning Alert - Monitor Weather Updates",
    body: "The weather bureau has issued a flood warning for low-lying areas. Residents in flood-prone zones should monitor weather updates closely and be prepared to evacuate if necessary. Emergency supplies should be ready.",
    date: "June 8, 2025 | 6:30am",
    created_by: 1,
    created_at: "2025-06-08T06:30:00Z"
  },
  {
    id: 3,
    title: "New Evacuation Center Opened in Barangay Gogon",
    body: "A new state-of-the-art evacuation center has been officially opened in Barangay Gogon. The facility can accommodate up to 500 individuals and is equipped with modern amenities including medical facilities, kitchen, and sleeping quarters.",
    date: "June 5, 2025 | 2:15pm",
    created_by: 1,
    created_at: "2025-06-05T14:15:00Z"
  },
  {
    id: 4,
    title: "Disaster Preparedness Training Schedule",
    body: "Community disaster preparedness training sessions will be conducted every Saturday of June 2025. Topics include first aid, emergency communication, and family emergency planning. Registration is now open at the City Hall.",
    date: "June 3, 2025 | 10:45am",
    created_by: 1,
    created_at: "2025-06-03T10:45:00Z"
  },
  {
    id: 5,
    title: "Road Closure Due to Bridge Inspection",
    body: "The bridge connecting Rawis and Centro Baybay will be temporarily closed for safety inspection from June 12-14, 2025. Alternative routes will be available via Bagumbayan Road. Motorists are advised to plan accordingly.",
    date: "June 1, 2025 | 4:20pm",
    created_by: 1,
    created_at: "2025-06-01T16:20:00Z"
  }
];

export default function Announcements() {
  usePageTitle('Announcements');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>(MOCK_ANNOUNCEMENTS);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>(MOCK_ANNOUNCEMENTS);
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

  // Filter announcements based on search term
  useEffect(() => {
    const filtered = announcements.filter(announcement =>
      announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      announcement.body.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAnnouncements(filtered);
    setCurrentPage(1);
  }, [searchTerm, announcements]);

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
  const currentRows = filteredAnnouncements.slice(startIndex, endIndex);

  // Modal handlers
  const handleAddAnnouncement = () => {
    setFormData({
      title: '',
      body: ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (announcement: Announcement) => {
    setAnnouncementToDelete(announcement);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (announcementToDelete) {
      setAnnouncements(prev => prev.filter(a => a.id !== announcementToDelete.id));
      setIsDeleteDialogOpen(false);
      setAnnouncementToDelete(null);
    }
  };

  const handleFormInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveAnnouncement = () => {
    if (formData.title.trim() && formData.body.trim()) {
      // Show confirmation dialog instead of directly posting
      setIsConfirmPostDialogOpen(true);
    }
  };

  const handleConfirmPost = () => {
    const newAnnouncement: Announcement = {
      id: Date.now(),
      title: formData.title.trim(),
      body: formData.body.trim(),
      date: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) + ' | ' + new Date().toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }),
      created_by: 1,
      created_at: new Date().toISOString()
    };
    
    setAnnouncements(prev => [newAnnouncement, ...prev]);
    setIsModalOpen(false);
    setIsConfirmPostDialogOpen(false);
    setFormData({ title: '', body: '' });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsConfirmPostDialogOpen(false);
    setFormData({ title: '', body: '' });
  };

  // Toggle expand/collapse for title or body
  const toggleExpand = (announcementId: number, type: 'title' | 'body') => {
    setExpandedRows(prev => ({
      ...prev,
      [announcementId]: {
        ...prev[announcementId],
        [type]: !prev[announcementId]?.[type]
      }
    }));
  };

  // Check if text needs "See more" button
  const needsExpansion = (text: string, type: 'title' | 'body') => {
    if (type === 'title') {
      return text.length > 50; // Adjust character limit as needed
    } else {
      return text.length > 150; // Adjust character limit as needed
    }
  };

  // Get display text based on expansion state
  const getDisplayText = (announcement: Announcement, type: 'title' | 'body') => {
    const text = type === 'title' ? announcement.title : announcement.body;
    const isExpanded = expandedRows[announcement.id]?.[type];
    
    if (!needsExpansion(text, type) || isExpanded) {
      return text;
    }
    
    const limit = type === 'title' ? 50 : 150;
    return text.substring(0, limit) + '...';
  };

  return (
    <div className="text-black p-6 space-y-6 flex flex-col">
      {/* Page Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-green-800">
          Announcements
        </h1>

        {/* Search and Add Button */}
        <div className="flex items-center justify-between gap-4">
          <Input
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Button 
            onClick={handleAddAnnouncement}
            className="bg-green-700 hover:bg-green-800 text-white px-6 flex gap-2 items-center cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Announcement
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-input overflow-hidden">
        <div className="relative w-full overflow-x-auto">
          {currentRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="text-gray-500 text-lg font-medium mb-2">
                No announcements found
              </div>
              <p className="text-gray-400 text-sm">
                Try adjusting your search or create a new announcement
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="text-left">
                    Title
                  </TableHead>
                  <TableHead className="text-left">
                    Body
                  </TableHead>
                  <TableHead className="text-left">
                    Date
                  </TableHead>
                  <TableHead className="text-center w-12">

                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRows.map((announcement) => (
                  <TableRow key={announcement.id} className="hover:bg-gray-50">
                    <TableCell className="text-foreground font-medium max-w-xs">
                      <div className="space-y-1">
                        <div className="whitespace-pre-wrap font-semibold">
                          {getDisplayText(announcement, 'title')}
                        </div>
                        {needsExpansion(announcement.title, 'title') && (
                          <button
                            onClick={() => toggleExpand(announcement.id, 'title')}
                            className="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer"
                          >
                            {expandedRows[announcement.id]?.title ? 'See less' : 'See more'}
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground max-w-md">
                      <div className="space-y-1">
                        <div className="whitespace-pre-wrap">
                          {getDisplayText(announcement, 'body')}
                        </div>
                        {needsExpansion(announcement.body, 'body') && (
                          <button
                            onClick={() => toggleExpand(announcement.id, 'body')}
                            className="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer"
                          >
                            {expandedRows[announcement.id]?.body ? 'See less' : 'See more'}
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground whitespace-nowrap">
                      {announcement.date}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteClick(announcement)}
                        className="h-8 w-8 p-0 cursor-pointer text-red-600 hover:text-red-800 hover:bg-red-50"
                        title="Delete announcement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
          {selectedAnnouncements.length > 0 && (
            <span className="mr-4">
              {selectedAnnouncements.length} of {totalRows} row(s) selected.
            </span>
          )}
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

      {/* Create Announcement Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-green-700 text-xl font-bold">
              Create Announcement
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium mb-2">Title:</label>
              <Input
                placeholder="Announcement Title"
                value={formData.title}
                onChange={(e) => handleFormInputChange('title', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description:</label>
              <Textarea
                placeholder="Announcement description"
                value={formData.body}
                onChange={(e) => handleFormInputChange('body', e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveAnnouncement}
              className="bg-green-700 hover:bg-green-800 text-white"
              disabled={!formData.title.trim() || !formData.body.trim()}
            >
              Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-700 text-xl font-bold">
              Confirm Delete
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this announcement?
            </p>
            {announcementToDelete && (
              <p className="text-sm font-medium mt-2 text-gray-800">
                "{announcementToDelete.title}"
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmDelete}
              className="bg-red-700 hover:bg-red-800 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post Confirmation Dialog */}
      <Dialog open={isConfirmPostDialogOpen} onOpenChange={setIsConfirmPostDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-green-700 text-xl font-bold">
              Review Announcement
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <p className="text-sm text-gray-600">
              Please review your announcement before posting:
            </p>
            
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div>
                {/*<span className="text-sm font-semibold text-gray-700">Title:</span>*/}
                <p className="text-sm text-gray-900 mt-1 font-bold">{formData.title}</p>
              </div>
              
              <div>
                {/*<span className="text-sm font-semibold text-gray-700">Description:</span>*/}
                <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{formData.body}</p>
              </div>
            </div>
            
            <p className="text-xs text-gray-500">
              Once posted, this announcement will be visible to the users.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmPostDialogOpen(false)}>
              Back to Edit
            </Button>
            <Button 
              onClick={handleConfirmPost}
              className="bg-green-700 hover:bg-green-800 text-white"
            >
              Confirm & Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}