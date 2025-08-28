// ui/date-time-picker.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from './button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './select';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface DateTimePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  showTime?: boolean;
  placeholder?: string;
  className?: string;
  /** inclusive min/max – defaults keep years within 1950..2025 */
  minYear?: number;
  maxYear?: number;
}

export function DateTimePicker({
  value,
  onChange,
  showTime = true,
  placeholder = "Select date and time",
  className = "",
  minYear = 1900,
  maxYear = 2025, // 👈 cap years so nothing beyond 2025
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const now = new Date();
  const clampYear = (y: number) => Math.min(Math.max(y, minYear), maxYear);

  // Build year list once (inclusive)
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = minYear; y <= maxYear; y++) list.push(y);
    return list;
  }, [minYear, maxYear]);

  const initYear = clampYear(value?.getFullYear() ?? now.getFullYear());
  const initMonth = value?.getMonth() ?? now.getMonth();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value);
  const [selectedTime, setSelectedTime] = useState<string>(
    value ? `${value.getHours().toString().padStart(2, '0')}:${value.getMinutes().toString().padStart(2, '0')}` : "09:00"
  );
  const [selectedMonth, setSelectedMonth] = useState(initMonth);
  const [selectedYear, setSelectedYear] = useState(initYear);

  // keep local state in sync with incoming value; clamp to bounds
  useEffect(() => {
    if (!value) return;
    const y = clampYear(value.getFullYear());
    const m = value.getMonth();
    const safe = new Date(value);
    safe.setFullYear(y);
    setSelectedDate(safe);
    setSelectedTime(`${safe.getHours().toString().padStart(2, '0')}:${safe.getMinutes().toString().padStart(2, '0')}`);
    setSelectedMonth(m);
    setSelectedYear(y);
  }, [value, minYear, maxYear]);

  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const generateTimeOptions = () => {
    const times: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        times.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }
    return times;
  };

  const to12Hour = (time24: string) => {
    const [h, m] = time24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = ((h + 11) % 12) + 1;
    return `${hour12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const handleDateSelect = (day: number, month = selectedMonth, year = selectedYear) => {
    // clamp year to bounds
    const y = clampYear(year);
    const newDate = new Date(y, month, day);
    if (showTime) {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      newDate.setHours(hours, minutes, 0, 0);
    } else {
      newDate.setHours(0, 0, 0, 0);
    }
    setSelectedDate(newDate);
    onChange(newDate);
  };

  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
    const [hours, minutes] = time.split(':').map(Number);
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(hours, minutes, 0, 0);
      setSelectedDate(newDate);
      onChange(newDate);
      return;
    }
    const lastDay = getDaysInMonth(selectedMonth, selectedYear);
    const day = Math.min(now.getDate(), lastDay);
    const newDate = new Date(selectedYear, selectedMonth, day);
    newDate.setHours(hours, minutes, 0, 0);
    setSelectedDate(newDate);
    onChange(newDate);
  };

  const formatDisplayValue = () => {
    if (!selectedDate) return "";
    const monthName = months[selectedDate.getMonth()];
    const day = selectedDate.getDate();
    const year = selectedDate.getFullYear();
    if (!showTime) return `${monthName} ${day}, ${year}`;
    const time = to12Hour(selectedTime);
    return `${monthName} ${day}, ${year}, ${time}`;
  };

  // navigation availability for the grey prev/next month days
  const canGoPrevMonth = selectedYear > minYear || (selectedYear === minYear && selectedMonth > 0);
  const canGoNextMonth = selectedYear < maxYear || (selectedYear === maxYear && selectedMonth < 11);

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
    const days: React.ReactElement[] = [];

    // Prev month meta
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    const prevAllowed = prevYear >= minYear;
    const daysInPrevMonth = getDaysInMonth(prevMonth, prevYear);

    // Previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const disabled = !prevAllowed;
      days.push(
        <button
          key={`prev-${d}`}
          className={`w-8 h-8 text-gray-400 rounded text-sm ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100'}`}
          disabled={disabled || !canGoPrevMonth}
          onClick={() => {
            if (!canGoPrevMonth) return;
            const ny = prevYear < minYear ? minYear : prevYear;
            const nm = ny === minYear ? Math.max(prevMonth, 0) : prevMonth;
            setSelectedMonth(nm);
            setSelectedYear(ny);
            handleDateSelect(d, nm, ny);
          }}
          type="button"
        >
          {d}
        </button>
      );
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected =
        selectedDate &&
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === selectedMonth &&
        selectedDate.getFullYear() === selectedYear;

      const isToday =
        now.getDate() === day &&
        now.getMonth() === selectedMonth &&
        now.getFullYear() === selectedYear;

      days.push(
        <button
          key={day}
          type="button"
          className={`w-8 h-8 text-sm rounded hover:bg-gray-100 ${
            isSelected ? 'bg-green-700 text-white hover:bg-green-800'
            : isToday ? 'bg-gray-200 font-semibold'
            : ''
          }`}
          onClick={() => handleDateSelect(day)}
        >
          {day}
        </button>
      );
    }

    // Next month's leading days
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const remainingCells = totalCells - (firstDay + daysInMonth);
    const nextMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
    const nextYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
    const nextAllowed = nextYear <= maxYear;

    for (let day = 1; day <= remainingCells; day++) {
      const disabled = !nextAllowed;
      days.push(
        <button
          key={`next-${day}`}
          type="button"
          className={`w-8 h-8 text-gray-400 rounded text-sm ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100'}`}
          disabled={disabled || !canGoNextMonth}
          onClick={() => {
            if (!canGoNextMonth) return;
            const ny = nextYear > maxYear ? maxYear : nextYear;
            const nm = ny === maxYear ? Math.min(nextMonth, 11) : nextMonth;
            setSelectedMonth(nm);
            setSelectedYear(ny);
            handleDateSelect(day, nm, ny);
          }}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-full justify-start text-left font-normal ${className} ${!selectedDate ? "text-gray-500" : ""}`}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {formatDisplayValue() || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <style>{`.no-scroll-buttons [data-slot="select-scroll-up-button"], .no-scroll-buttons [data-slot="select-scroll-down-button"]{display:none}`}</style>
        <div className="p-4">
          <div className="md:flex-1">
            <div className="flex gap-2 mb-3">
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v, 10))}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => (
                    <SelectItem key={month} value={index.toString()}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setSelectedYear(clampYear(parseInt(v, 10)))}
              >
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
                  <div key={d} className="w-8 h-8 text-center text-xs font-medium text-gray-500 flex items-center justify-center">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {renderCalendar()}
              </div>
            </div>
          </div>

          {showTime && (
            <div className="mt-4">
              <Select value={selectedTime} onValueChange={handleTimeChange}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-48 no-scroll-buttons">
                  {generateTimeOptions().map((time) => (
                    <SelectItem key={time} value={time}>{to12Hour(time)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
