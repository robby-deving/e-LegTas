import React, { useState, useEffect } from 'react';
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
}

export function DateTimePicker({ value, onChange, showTime = true, placeholder = "Select date and time", className = "" }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value);
  const [selectedTime, setSelectedTime] = useState<string>(
    value ? `${value.getHours().toString().padStart(2, '0')}:${value.getMinutes().toString().padStart(2, '0')}` : "09:00"
  );

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  const [selectedMonth, setSelectedMonth] = useState(selectedDate?.getMonth() ?? currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(selectedDate?.getFullYear() ?? currentYear);

  useEffect(() => {
    setSelectedDate(value);
    if (value) {
      setSelectedTime(`${value.getHours().toString().padStart(2, '0')}:${value.getMinutes().toString().padStart(2, '0')}`);
      setSelectedMonth(value.getMonth());
      setSelectedYear(value.getFullYear());
    }
  }, [value]);

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
    const newDate = new Date(year, month, day);
    if (showTime) {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      newDate.setHours(hours, minutes);
    } else {
      // when time is hidden, normalize to midnight
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
      newDate.setHours(hours, minutes);
      setSelectedDate(newDate);
      onChange(newDate);
      return;
    }

    const month = typeof selectedMonth === 'number' ? selectedMonth : currentDate.getMonth();
    const year = typeof selectedYear === 'number' ? selectedYear : currentDate.getFullYear();
    const defaultDay = currentDate.getDate();
    const lastDay = getDaysInMonth(month, year);
    const day = Math.min(defaultDay, lastDay);
    const newDate = new Date(year, month, day);
    newDate.setHours(hours, minutes);
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

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
    const days: React.ReactElement[] = [];

    // Previous month's trailing days
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    const daysInPrevMonth = getDaysInMonth(prevMonth, prevYear);

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(
        <button
          key={`prev-${daysInPrevMonth - i}`}
          className="w-8 h-8 text-gray-400 hover:bg-gray-100 rounded text-sm"
          onClick={() => {
            setSelectedMonth(prevMonth);
            setSelectedYear(prevYear);
            handleDateSelect(daysInPrevMonth - i, prevMonth, prevYear);
          }}
        >
          {daysInPrevMonth - i}
        </button>
      );
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === selectedMonth && selectedDate.getFullYear() === selectedYear;
      const isToday = currentDate.getDate() === day && currentDate.getMonth() === selectedMonth && currentDate.getFullYear() === selectedYear;

      days.push(
        <button
          key={day}
          className={`w-8 h-8 text-sm rounded hover:bg-gray-100 ${isSelected ? 'bg-green-700 text-white hover:bg-green-800' : isToday ? 'bg-gray-200 font-semibold' : ''}`}
          onClick={() => handleDateSelect(day)}
        >
          {day}
        </button>
      );
    }

    // Next month's leading days
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const remainingCells = totalCells - (firstDay + daysInMonth);

    for (let day = 1; day <= remainingCells; day++) {
      const nextMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
      const nextYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;

      days.push(
        <button
          key={`next-${day}`}
          className="w-8 h-8 text-gray-400 hover:bg-gray-100 rounded text-sm"
          onClick={() => {
            setSelectedMonth(nextMonth);
            setSelectedYear(nextYear);
            handleDateSelect(day, nextMonth, nextYear);
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
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => (
                    <SelectItem key={month} value={index.toString()}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
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
