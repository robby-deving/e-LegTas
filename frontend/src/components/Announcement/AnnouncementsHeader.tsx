// src/components/announcements/AnnouncementsHeader.tsx
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Plus } from "lucide-react";

type AnnouncementsHeaderProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onAddAnnouncement: () => void;
};

export default function AnnouncementsHeader({
  searchTerm,
  onSearchChange,
  onAddAnnouncement,
}: AnnouncementsHeaderProps) {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-green-800">
        Announcements
      </h1>
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-sm"
        />
        <Button
          onClick={onAddAnnouncement}
          className="bg-green-700 hover:bg-green-800 text-white px-6 flex gap-2 items-center cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Announcement
        </Button>
      </div>
    </div>
  );
}