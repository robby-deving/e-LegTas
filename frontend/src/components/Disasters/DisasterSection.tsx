import DisasterCard from "./DisasterCard";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { Disaster } from "@/types/disaster";

interface Props {
  title: string;
  disasters: Disaster[];
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  onEdit: (d: Disaster) => void;
  onNavigate: (d: Disaster) => void;
  onDelete?: (d: Disaster) => void;
  emptyMessage: string;
  loading?: boolean;
}

export default function DisasterSection({
  title,
  disasters,
  collapsible = false,
  collapsed = false,
  onToggle,
  onEdit,
  onNavigate,
  onDelete,
  emptyMessage,
  loading
}: Props) {
  const showContent = !collapsible || !collapsed;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 font-bold text-lg mb-3 text-green-700 select-none">
        {collapsible ? (
          <button onClick={onToggle} className="flex items-center gap-2 focus:outline-none cursor-pointer">
            {title}
            {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        ) : (
          <span>{title}</span>
        )}
      </div>

{showContent && (
  loading && disasters.length === 0 ? (
    <div className="flex justify-center items-center py-8">
      <svg
        className="animate-spin h-6 w-6 text-green-700"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
    </div>
  ) : disasters.length === 0 ? (
    <div className="text-gray-400 py-8 text-center">{emptyMessage}</div>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {disasters.map((disaster) => (
        <DisasterCard
          key={disaster.id}
          disaster={disaster}
          onEdit={onEdit}
          onNavigate={onNavigate}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
)}

    </div>
  );
}