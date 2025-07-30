import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Pencil } from "lucide-react";
import type { Disaster } from "@/types/disaster";
import {
  getTagColor,
  getTypeColor,
} from "../../constants/disasterTypeColors";
import { formatDate } from "@/utils/dateFormatter";






interface Props {
  disaster: Disaster;
  onEdit: (d: Disaster) => void;
  onNavigate: (d: Disaster) => void;
}

export default function DisasterCard({ disaster, onEdit, onNavigate }: Props) {
  return (
    <Card
      className="relative group flex flex-col gap-0 rounded-xl h-full transition-transform duration-100 hover:scale-102 ease-in-out hover:shadow-md cursor-pointer"
      onClick={() => onNavigate(disaster)}
    >
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className={`text-2xl font-bold ${getTypeColor(disaster.type)}`}>
          {disaster.name}
        </CardTitle>
        <button
          className="absolute top-4 right-4 p-1 rounded hover:bg-gray-100 transition"
          title="Edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(disaster);
          }}
        >
          <Pencil className="w-4 h-4 text-gray-400 group-hover:text-green-700 cursor-pointer" />
        </button>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 justify-between">
        <div className={`inline-block rounded px-2 py-1 text-xs font-semibold ${getTagColor(disaster.type)} mb-2 w-fit`}>
          {disaster.type}
        </div>
        <div className="flex w-full">
          <div className="w-1/2">
            <div className="text-xs text-gray-500 font-semibold">Start Date:</div>
            <div className="text-xs font-medium">{formatDate(disaster.start_date)}</div>
          </div>
          <div className="w-1/2">
            <div className="text-xs text-gray-500 font-semibold">End Date:</div>
            <div className={`text-xs font-medium${
              disaster.status === "Active" ? " text-gray-400 italic" : ""
            }`}>
              {disaster.status === "Active" ? "Ongoing" : formatDate(disaster.end_date)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
