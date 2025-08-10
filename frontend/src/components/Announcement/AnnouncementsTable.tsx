// src/components/announcements/AnnouncementsTable.tsx
import { Table, TableHeader, TableRow, TableHead, TableBody } from "../ui/table";
import AnnouncementRow from "./AnnouncementRow.tsx";

// Type definition for Announcement and expandedRows should be imported or defined here
type Announcement = {
  id: number;
  title: string;
  body: string;
  date: string;
  created_by: number;
  created_at: string;
};

type AnnouncementsTableProps = {
  currentRows: Announcement[];
  expandedRows: Record<number, { title: boolean; body: boolean }>;
  onToggleExpand: (announcementId: number, type: 'title' | 'body') => void;
  onDeleteClick: (announcement: Announcement) => void;
};

export default function AnnouncementsTable({
  currentRows,
  expandedRows,
  onToggleExpand,
  onDeleteClick,
}: AnnouncementsTableProps) {
  return (
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
                <TableHead className="text-left">Title</TableHead>
                <TableHead className="text-left">Body</TableHead>
                <TableHead className="text-left">Date</TableHead>
                <TableHead className="text-center w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentRows.map((announcement) => (
                <AnnouncementRow
                  key={announcement.id}
                  announcement={announcement}
                  expandedRows={expandedRows}
                  onToggleExpand={onToggleExpand}
                  onDeleteClick={onDeleteClick}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}