// src/components/announcements/AnnouncementRow.tsx
import { TableRow, TableCell } from "../ui/table";
import { Button } from "../ui/button";
import { Trash2 } from "lucide-react";
import { usePermissions } from "../../contexts/PermissionContext";

// Type definition for Announcement and expandedRows
type Announcement = {
  id: number;
  title: string;
  body: string;
  date: string;
  created_by: number;
  created_at: string;
};

type AnnouncementRowProps = {
  announcement: Announcement;
  expandedRows: Record<number, { title: boolean; body: boolean }>;
  onToggleExpand: (announcementId: number, type: 'title' | 'body') => void;
  onDeleteClick: (announcement: Announcement) => void;
};

// Helper functions moved here for encapsulation
// Helper functions moved here for encapsulation
const needsExpansion = (text: string | undefined, type: 'title' | 'body') => {
  const value = text ?? '';
  if (type === 'title') {
    return value.length > 50;
  } else {
    return value.length > 150;
  }
};

const getDisplayText = (announcement: Announcement, expandedRows: Record<number, any>, type: 'title' | 'body') => {
  const raw = type === 'title' ? announcement.title : announcement.body;
  const text = raw ?? '';
  const isExpanded = expandedRows[announcement.id]?.[type];

  if (!needsExpansion(text, type) || isExpanded) {
    return text;
  }

  const limit = type === 'title' ? 50 : 150;
  return text.substring(0, limit) + '...';
};

export default function AnnouncementRow({
  announcement,
  expandedRows,
  onToggleExpand,
  onDeleteClick,
}: AnnouncementRowProps) {
  const { hasPermission } = usePermissions();
  const canDelete = hasPermission('delete_announcement');
  return (
    <TableRow className="hover:bg-gray-50">
      <TableCell className="text-foreground font-medium max-w-xs">
        <div className="space-y-1">
          <div className="whitespace-pre-wrap font-semibold">
            {getDisplayText(announcement, expandedRows, 'title')}
          </div>
          {needsExpansion(announcement.title, 'title') && (
            <button
              onClick={() => onToggleExpand(announcement.id, 'title')}
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
            {getDisplayText(announcement, expandedRows, 'body')}
          </div>
          {needsExpansion(announcement.body, 'body') && (
            <button
              onClick={() => onToggleExpand(announcement.id, 'body')}
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
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteClick(announcement)}
            className="h-8 w-8 p-0 cursor-pointer text-red-600 hover:text-red-800 hover:bg-red-50"
            title="Delete announcement"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}