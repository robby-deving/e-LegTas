import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";
// Popover and Calendar are no longer directly used in this component for date selection
// import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
// import { Calendar } from "../ui/calendar";
import DisasterFilterIcon from "../../assets/disaster-filter.svg"; // Ensure this path is correct
// import { format } from "date-fns"; // No longer needed for date formatting here
import MonthYearGridPicker from "./MonthYearGridPicker"; // Ensure this path is correct

interface Props {
  disasterTypes: string[];
  typeFilter: string;
  setTypeFilter: (t: string) => void;
  // Removed selectedDate and setSelectedDate as MonthYearGridPicker handles this
  // selectedDate: Date | undefined;
  // setSelectedDate: (d: Date | undefined) => void;
  onRecordNew: () => void;
  // New props for month/year filtering
  month: number | null; 
  year: number;
  onMonthYearChange: (month: number | null, year: number) => void;
}

export default function DisasterFilterBar({
  disasterTypes,
  typeFilter,
  setTypeFilter,
  // selectedDate, // Removed
  // setSelectedDate, // Removed
  onRecordNew,
  month, // New prop
  year,  // New prop
  onMonthYearChange, // New prop
}: Props) {
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
            {typeFilter === 'All' ? 'Disaster Type' : typeFilter}
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

      {/* Date Filter - Now using MonthYearGridPicker */}
      <MonthYearGridPicker
        month={month}
        year={year}
        onMonthYearChange={onMonthYearChange}
      />

      {/* Record New Disaster */}
      <Button
        className="bg-green-700 hover:bg-green-800 text-white px-6 flex gap-2 items-center cursor-pointer"
        onClick={onRecordNew}
      >
        <span className="text-lg">+</span> Record New Disaster
      </Button>
    </div>
  );
}
