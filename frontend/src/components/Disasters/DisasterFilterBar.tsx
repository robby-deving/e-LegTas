import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";
import DisasterFilterIcon from "../../assets/disaster-filter.svg"; 
import MonthYearGridPicker from "./MonthYearGridPicker"; 
import { usePermissions } from "../../contexts/PermissionContext";
/**
 * Note: While the UI displays "Incident", we use "Disaster" in our
 * codebase for consistency with our data models and APIs.
 */
interface Props {
  disasterTypes: string[];
  typeFilter: string;
  setTypeFilter: (t: string) => void;
  onRecordNew: () => void;
  month: number | null; 
  year: number;
  onMonthYearChange: (month: number | null, year: number) => void;
}

export default function DisasterFilterBar({
  disasterTypes,
  typeFilter,
  setTypeFilter,

  onRecordNew,
  month, 
  year,  
  onMonthYearChange, 
}: Props) {
  const { hasPermission } = usePermissions();
  const canCreateDisaster = hasPermission('create_disaster');
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-2">
      {/* Disaster Type Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex gap-2 items-center min-w-[120px] cursor-pointer">
            {DisasterFilterIcon ? (
              <img src={DisasterFilterIcon} alt="Disaster Filter" className="w-4 h-4" />
            ) : (
              <span>Icon</span>
            )}
            {typeFilter === 'All' ? 'Incident Type' : typeFilter}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {disasterTypes.map((type) => (
            <DropdownMenuItem key={type} onClick={() => setTypeFilter(type)}>
              {type}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Date Filter */}
      <MonthYearGridPicker
        month={month}
        year={year}
        onMonthYearChange={onMonthYearChange}
      />

      {/* Record New Disaster - Only show if user has permission */}
      {canCreateDisaster && (
        <Button
          className="bg-green-700 hover:bg-green-800 text-white px-6 flex gap-2 items-center cursor-pointer"
          onClick={onRecordNew}
        >
          <span className="text-lg">+</span> Record New Incident
        </Button>
      )}
    </div>
  );
}
