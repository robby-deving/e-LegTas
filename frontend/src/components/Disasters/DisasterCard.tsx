import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Pencil, Trash2 } from "lucide-react";
import type { Disaster } from "@/types/disaster";
import {
  getTagColor,
  getTypeColor,
} from "../../constants/disasterTypeColors";
import { formatDate } from "@/utils/dateFormatter";
import { usePermissions } from "../../contexts/PermissionContext";






interface Props {
  disaster: Disaster;
  onEdit: (d: Disaster) => void;
  onNavigate: (d: Disaster) => void;
  onDelete?: (d: Disaster) => void;
}

export default function DisasterCard({ disaster, onEdit, onNavigate, onDelete }: Props) {
  const { hasPermission } = usePermissions();
  const canUpdateDisaster = hasPermission('update_disaster');
  const canDeleteDisaster = hasPermission('delete_disaster');
  
  return (
    <Card
      className="relative group flex flex-col gap-0 rounded-xl h-full transition-transform duration-100 hover:scale-102 ease-in-out hover:shadow-md cursor-pointer"
      onClick={() => onNavigate(disaster)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className={`inline-block rounded px-2 py-1 text-xs font-semibold ${getTagColor(disaster.type)} w-fit`}>
            {disaster.type}
          </div>
          <div className="flex gap-1">
            {canUpdateDisaster && (
              <button
                className="p-1 rounded hover:bg-gray-100 transition"
                title="Edit"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(disaster);
                }}
              >
                <Pencil className="w-4 h-4 text-gray-400 group-hover:text-green-700 cursor-pointer" />
              </button>
            )}
            {canDeleteDisaster && onDelete && (
              <button
                className="p-1 rounded hover:bg-gray-100 transition"
                title="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(disaster);
                }}
              >
                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-700 cursor-pointer" />
              </button>
            )}
          </div>
        </div>
        <CardTitle className={`text-2xl font-bold py-2 ${getTypeColor(disaster.type)}`}>
          {disaster.name}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-0 mt-auto">
        <div className="grid grid-cols-[60px_1fr] items-baseline gap-x-1">
          <div className="text-xs text-gray-500 font-normal whitespace-nowrap">Start Date:</div>
          <div className="text-xs font-normal truncate whitespace-nowrap overflow-hidden">{formatDate(disaster.start_date)}</div>
        </div>
        <div className="grid grid-cols-[60px_1fr] items-baseline gap-x-1">
          <div className="text-xs text-gray-500 font-normal whitespace-nowrap">End Date:</div>
          <div className={`text-xs font-normal truncate whitespace-nowrap overflow-hidden${
            disaster.status === "Active" ? " text-gray-400 italic" : ""
          }`}>
            {disaster.status === "Active" ? "Ongoing" : formatDate(disaster.end_date)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
