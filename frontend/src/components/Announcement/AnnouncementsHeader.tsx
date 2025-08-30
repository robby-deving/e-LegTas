// src/components/announcements/AnnouncementsHeader.tsx
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Plus, Search } from "lucide-react";
import { usePermissions } from "../../contexts/PermissionContext";
import LoadingSpinner from "../loadingSpinner";

type AnnouncementsHeaderProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onAddAnnouncement: () => void;
  isSearching?: boolean;
};

export default function AnnouncementsHeader({
  searchTerm,
  onSearchChange,
  onAddAnnouncement,
  isSearching = false,
}: AnnouncementsHeaderProps) {
  const { hasPermission } = usePermissions();
  const canPostAnnouncement = hasPermission('post_announcement');
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-green-800">
        Announcements
      </h1>
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm">
          <Input
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pr-10"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isSearching ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Search className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>
        {canPostAnnouncement && (
          <Button
            onClick={onAddAnnouncement}
            className="bg-green-700 hover:bg-green-800 text-white px-6 flex gap-2 items-center cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Announcement
          </Button>
        )}
      </div>
    </div>
  );
}