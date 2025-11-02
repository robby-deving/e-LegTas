// src/components/announcements/AnnouncementsHeader.tsx
import { Button } from "../ui/button";
import { Plus } from "lucide-react";
import { usePermissions } from "../../contexts/PermissionContext";
import SearchBar from "../SearchBar";

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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-green-800">
        Announcements
      </h1>
      <div className="flex items-center justify-between gap-4">
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          placeholder="Search"
          isSearching={isSearching}
          className="max-w-sm"
        />
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