import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { Calendar as DateCalendar } from "../ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import type { Disaster } from "../../types/dashboard";
import { usePermissions } from "../../contexts/PermissionContext";
import disasterfilter from '../../assets/disaster-filter.svg';

interface DashboardHeaderProps {
  disasters: Disaster[];
  selectedDisaster: Disaster | null;
  setSelectedDisaster: (disaster: Disaster) => void;
  selectedDateRange: DateRange | undefined;
  setSelectedDateRange: (range: DateRange | undefined) => void;
  fromDate?: Date;
  toDate: Date;
}

export default function DashboardHeader({
  disasters,
  selectedDisaster,
  setSelectedDisaster,
  selectedDateRange,
  setSelectedDateRange,
  fromDate,
  toDate
}: DashboardHeaderProps) {
  const { hasPermission } = usePermissions();
  const canFilterByDisaster = hasPermission('filter_dashboard_by_disaster');
  const canFilterByDate = hasPermission('filter_dashboard_by_date');

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-3">
      <h1 className="text-3xl font-bold text-green-800">Dashboard</h1>
      <div className="flex gap-3 items-center">
        {canFilterByDisaster && disasters.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="text-black border-green-300 cursor-pointer flex items-center gap-2">
                <img src={disasterfilter} alt="Disaster Filter" className="w-4 h-4" />
                {selectedDisaster
                  ? `${selectedDisaster.disaster_types?.name ?? ''} ${selectedDisaster.disaster_name}`
                  : 'No Active Incident'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {disasters.map((disaster, index) => (
                <DropdownMenuItem
                  className="cursor-pointer"
                  key={`${disaster.id}-${index}`}
                  onClick={() => {
                    setSelectedDisaster(disaster);
                    setSelectedDateRange(undefined);
                  }}
                >
                  {`${disaster.disaster_types?.name ?? ''} ${disaster.disaster_name}`}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : canFilterByDisaster && disasters.length === 0 ? (
          <Button
            variant="outline"
            className="text-green-700 border-green-300 cursor-default"
            disabled
          >
            No Active Incident
          </Button>
        ) : null}
        {canFilterByDate && selectedDisaster && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`border-green-300 cursor-pointer flex items-center ${
                  selectedDateRange?.from ? "bg-gray-100" : "bg-white"
                } text-black`}
              >
                <CalendarIcon className="w-4 h-4" />
                <span>
                  {selectedDateRange?.from && selectedDateRange?.to
                    ? selectedDateRange.from.getTime() === selectedDateRange.to.getTime()
                      ? selectedDateRange.from.toLocaleDateString("en-PH", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })
                      : `${selectedDateRange.from.toLocaleDateString("en-PH", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })} - ${selectedDateRange.to.toLocaleDateString("en-PH", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}`
                    : selectedDateRange?.from
                    ? selectedDateRange.from.toLocaleDateString("en-PH", {
                        day: "2-digit",
                        month: "long",
                          year: "numeric",
                        })
                      : "Select Date Filter"}
                </span>

                {selectedDateRange?.from && (
                  <span
                    className="ml-2 cursor-pointer hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDateRange(undefined);
                    }}
                  >
                    ✕
                  </span>
                )}
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-auto p-3" align="end">
              <div className="flex flex-col items-center space-y-3">
                <DateCalendar
                  mode="range"
                  selected={selectedDateRange}
                  onSelect={(range) => setSelectedDateRange(range)}
                  disabled={{
                    before: fromDate,
                    after: toDate,
                  }}
                  defaultMonth={fromDate}
                  numberOfMonths={2}
                  required
                  className="pb-1"
                />
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}