import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, CalendarIcon, X } from "lucide-react";

const monthAbbr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthFull = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface Props {
  month: number | null; 
  year: number ;
  onMonthYearChange: (month: number | null, year: number) => void;
}


export default function MonthYearGridPicker({ month, year, onMonthYearChange }: Props) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const [open, setOpen] = useState(false);

  const isFiltered = month !== currentMonth || year !== currentYear;

  const handleMonthClick = (index: number | null) => {
    onMonthYearChange(index, year);
    setOpen(false);
  };


  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) {
      onMonthYearChange(month, val);
    }
  };

  const resetToCurrent = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent popover from toggling
    onMonthYearChange(currentMonth, currentYear);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
      <div
          className={cn(
            "flex items-center gap-1 cursor-pointer rounded-md border",
            isFiltered
              ? "bg-green-100 border-green-500 text-green-800"
              : "bg-white border-input"
          )}
        >
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-2 py-2 h-auto cursor-pointer"
            onClick={() => setOpen(true)} 
          >
            <CalendarIcon className="h-4 w-4" />
              <span>
                {month === null ? "All Months" : monthFull[month]} {year}
              </span>
          </Button>

          {isFiltered && (
            <X
              size={16}
              className="mr-2 hover:text-red-500 cursor-pointer"
              onClick={resetToCurrent}
            />
          )}
        </div>

        
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => onMonthYearChange(month, year - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            value={year}
            onChange={handleYearChange}
            className="w-20 text-center px-2 py-1 text-base appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <Button variant="ghost" size="icon" onClick={() => onMonthYearChange(month, year + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex justify-between mb-2 flex-1">
          <button
            className={cn(
              "flex flex-1 justify-center border rounded p-1 text-sm",
              month === null
          ? "bg-transparent text-[#0C955B] font-semibold"
          : "text-muted-foreground hover:text-[#0C955B] hover:bg-transparent",              isFiltered && month === null
          ? "border-[#038B53] text-[#038B53]"
          : ""
            )}
            onClick={() => handleMonthClick(null)}
          >
            Year Only
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {monthAbbr.map((m, index) => (
            <Button
              key={m}
              variant="ghost"
              className={cn(
                "text-sm transition-colors",
                index === month
                  ? "bg-transparent text-[#0C955B] font-semibold"
                  : "text-muted-foreground hover:text-[#0C955B] hover:bg-transparent"
              )}
              onClick={() => handleMonthClick(index)}
            >
              {m}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
