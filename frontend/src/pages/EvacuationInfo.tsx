import { useState } from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../components/ui/dropdown-menu";
import { Input } from "../components/ui/input";
import { CalendarIcon, ChevronUp, ChevronDown, Pencil } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "../components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import DisasterFilterIcon from '../assets/disaster-filter.svg';
import { Popover, PopoverTrigger, PopoverContent } from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";
import { format } from "date-fns";
import React from 'react';

import { useNavigate } from 'react-router-dom';

type Disaster = {
  name: string;
  type: string;
  start_date: string;
  end_date?: string;
  status: 'Active' | 'Ended';
};

const DISASTER_TYPE_COLORS: Record<string, { typeColor: string; tagColor: string }> = {
  'Typhoon': { typeColor: 'text-sky-500', tagColor: 'bg-sky-100 text-sky-600' },
  'Tropical Storm': { typeColor: 'text-sky-400', tagColor: 'bg-sky-100 text-sky-600' },
  'Volcanic Eruption': { typeColor: 'text-orange-600', tagColor: 'bg-orange-100 text-orange-600' },
  'Landslide': { typeColor: 'text-yellow-600', tagColor: 'bg-yellow-100 text-yellow-600' },
};

const DISASTERS: Disaster[] = [
  { name: 'Kristine', type: 'Typhoon', start_date: 'October 21, 2024', end_date: 'October 21, 2024', status: 'Active' },
  { name: 'Fyang', type: 'Tropical Storm', start_date: 'October 21, 2024', end_date: 'October 21, 2024', status: 'Active' },
  { name: 'Mayon', type: 'Volcanic Eruption', start_date: 'October 21, 2024', end_date: 'October 21, 2024', status: 'Active' },
  { name: 'Landslide', type: 'Landslide', start_date: 'October 21, 2024', end_date: 'October 21, 2024', status: 'Active' },
  { name: 'Odette', type: 'Typhoon', start_date: 'December 16, 2021', end_date: 'December 18, 2021', status: 'Ended' },
  { name: 'Taal', type: 'Volcanic Eruption', start_date: 'January 12, 2020', end_date: 'January 22, 2020', status: 'Ended' },
  { name: 'Agaton', type: 'Tropical Storm', start_date: 'April 8, 2022', end_date: 'April 13, 2022', status: 'Ended' },
  { name: 'Leyte Landslide', type: 'Landslide', start_date: 'February 17, 2006', end_date: 'February 20, 2006', status: 'Ended' },
];

const DISASTER_TYPES = [
  'All',
  ...Array.from(new Set(DISASTERS.map(d => d.type)))
];

// Error Boundary Component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  state: { hasError: boolean; error: any } = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-red-500 p-6">
          <h1 className="text-2xl font-bold">Something went wrong.</h1>
          <p>{this.state.error?.toString() || 'An error occurred while rendering the component.'}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function EvacuationInfo() {
  const navigate = useNavigate();
  usePageTitle('Evacuation Information');
  const [typeFilter, setTypeFilter] = useState('All');
  const [open, setOpen] = useState(false);
  const [showEnded, setShowEnded] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDisaster, setEditingDisaster] = useState<Disaster | null>(null);

  const activeDisasters = DISASTERS.filter(d => d.status === 'Active' && (typeFilter === 'All' || d.type === typeFilter));
  const endedDisasters = DISASTERS.filter(d => d.status === 'Ended' && (typeFilter === 'All' || d.type === typeFilter));

  // Handler for edit button
  const handleEditClick = (disaster: Disaster) => {
    setEditingDisaster(disaster);
    setEditModalOpen(true);
  };

  const getTypeColor = (type: string) => DISASTER_TYPE_COLORS[type]?.typeColor || '';
  const getTagColor = (type: string) => DISASTER_TYPE_COLORS[type]?.tagColor || '';

  return (
    <ErrorBoundary>
      <div className="text-black p-6 space-y-6">
        {/* Header */}
        <h1 className="text-3xl font-bold text-green-800">Evacuation Information</h1>

        {/* Filter and Action Row */}
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
              {DISASTER_TYPES.map(type => (
                <DropdownMenuItem key={type} onClick={() => setTypeFilter(type)}>
                  {type}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Date Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex gap-2 items-center min-w-[160px] cursor-pointer">
                <CalendarIcon className="w-5 h-5 text-gray-700" />
                <span className="font-medium">
                  {selectedDate ? format(selectedDate, "MMMM yyyy") : "Select Month"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={selectedDate}
                onMonthChange={setSelectedDate}
                captionLayout="dropdown"
                fromYear={2000}
                toYear={new Date().getFullYear() + 1}
                className="rounded-md"
              />
            </PopoverContent>
          </Popover>

          {/* Record New Disaster */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-green-700 hover:bg-green-800 text-white px-6 flex gap-2 items-center cursor-pointer"
                onClick={() => setOpen(true)}
              >
                <span className="text-lg">+</span> Record New Disaster
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-green-700 text-xl font-bold mb-2">Record New Disaster</DialogTitle>
              </DialogHeader>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Disaster Name:</label>
                  <Input placeholder="Disaster Name" className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Disaster Type:</label>
                  <Select>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISASTER_TYPES.filter(t => t !== "All").map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Start Date:</label>
                  <div className="relative">
                    <Input value="October 21, 2024" readOnly className="w-full pr-10" />
                    <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </form>
              <DialogFooter className="flex justify-between mt-4">
                <DialogClose asChild>
                  <Button variant="outline" className="cursor-pointer">Cancel</Button>
                </DialogClose>
                <Button className="bg-green-700 hover:bg-green-800 text-white cursor-pointer">Add Disaster</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Disaster List */}
        <div className="mt-2 space-y-10">
          {/* Active Disasters */}
          <div>
            <div className="text-green-700 font-bold text-lg mb-3">Active Disasters</div>
            {activeDisasters.length === 0 ? (
              <div className="text-gray-400 py-8 text-center">No active disasters.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {activeDisasters.map((disaster, idx) => (
                  <Card 
                    key={idx} 
                    className="relative group flex flex-col gap-0 rounded-xl h-full transition-transform duration-100 hover:scale-102 ease-in-out hover:shadow-md cursor-pointer"
                    onClick={() => navigate(`/evacuation-information/${disaster.name}`)} // Navigate to detail page
                  > 
                    <CardHeader className="pb-2 flex-row items-center justify-between">
                      <CardTitle className={`text-2xl font-bold ${getTypeColor(disaster.type)}`}>{disaster.name}</CardTitle>
                      <button
                        className="absolute top-4 right-4 p-1 rounded hover:bg-gray-100 transition"
                        title="Edit"
                        onClick={(event) => {
                          event.stopPropagation(); // Prevent parent Card's onClick from firing
                          handleEditClick(disaster);
                        }}
                      >
                        <Pencil className="w-4 h-4 text-gray-400 group-hover:text-green-700 cursor-pointer" />
                      </button>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-1 justify-between">
                      <div className={`inline-block rounded px-2 py-1 text-xs font-semibold ${getTagColor(disaster.type)} mb-2 w-fit`}>{disaster.type}</div>
                      <div className="flex w-full">
                        <div className="w-1/2">
                          <div className="text-xs text-gray-500 font-semibold">Start Date:</div>
                          <div className="text-xs font-medium">{disaster.start_date}</div>
                        </div>
                        <div className="w-1/2">
                          <div className="text-xs text-gray-500 font-semibold">End Date:</div>
                          <div className={`text-xs font-medium${disaster.status === 'Active' ? ' text-gray-400 italic' : ''}`}>
                            {disaster.status === 'Active' ? 'Ongoing' : disaster.end_date}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          
          {/* Ended Disasters */}
          <div>
            <button
              className="flex items-center gap-2 text-gray-700 font-bold text-lg mb-3 focus:outline-none select-none cursor-pointer"
              onClick={() => setShowEnded(v => !v)}
            >
              Ended Disasters
              {showEnded ? (
                <ChevronUp className="w-5 h-5 transition-transform" />
              ) : (
                <ChevronDown className="w-5 h-5 transition-transform" />
              )}
            </button>
            {showEnded && (
              endedDisasters.length === 0 ? (
                <div className="text-gray-400 py-8 text-center">No ended disasters.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {endedDisasters.map((disaster, idx) => (
                    <Card 
                      key={idx} 
                      className="relative group flex flex-col gap-0 rounded-xl h-full transition-transform duration-100 hover:scale-102 ease-in-out hover:shadow-md cursor-pointer"
                      onClick={() => navigate(`/evacuation-information/${disaster.name}`)} // Navigate to detail page
                    >
                      <CardHeader className="pb-2 flex-row items-center justify-between">
                        <CardTitle className={`text-2xl font-bold ${getTypeColor(disaster.type)}`}>{disaster.name}</CardTitle>
                        <button
                          className="absolute top-4 right-4 p-1 rounded hover:bg-gray-100 transition"
                          title="Edit"
                          onClick={(event) => {
                            event.stopPropagation(); // Prevent parent Card's onClick from firing
                            handleEditClick(disaster);
                          }}
                        >
                          <Pencil className="w-4 h-4 text-gray-400 group-hover:text-green-700 cursor-pointer" />
                        </button>
                      </CardHeader>
                      <CardContent className="flex flex-col flex-1 justify-between">
                        <div className={`inline-block rounded px-2 py-1 text-xs font-semibold ${getTagColor(disaster.type)} mb-2 w-fit`}>{disaster.type}</div>
                        <div className="flex w-full">
                          <div className="w-1/2">
                            <div className="text-xs text-gray-500 font-semibold">Start Date:</div>
                            <div className="text-xs font-medium">{disaster.start_date}</div>
                          </div>
                          <div className="w-1/2">
                            <div className="text-xs text-gray-500 font-semibold">End Date:</div>
                            <div className="text-xs font-medium">{disaster.end_date}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
        
        {/* Update Disaster Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-green-700 text-xl font-bold mb-2">Update Disaster</DialogTitle>
            </DialogHeader>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Disaster Name:</label>
                <Input
                  placeholder="Disaster Name"
                  className="w-full"
                  value={editingDisaster?.name ?? ""}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Disaster Type:</label>
                <Select value={editingDisaster?.type ?? ""} disabled>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISASTER_TYPES.filter(t => t !== "All").map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Start Date:</label>
                <div className="relative">
                  <Input
                    value={editingDisaster?.start_date ?? ""}
                    readOnly
                    className="w-full pr-10"
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">End Date:</label>
                <div className="relative">
                  <Input
                    value={editingDisaster?.end_date ?? ""}
                    placeholder="Pick a date"
                    readOnly
                    className="w-full pr-10"
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>
            </form>
            <DialogFooter className="flex justify-between mt-4">
              <DialogClose asChild>
                <Button variant="outline" className="cursor-pointer">Cancel</Button>
              </DialogClose>
              <Button className="bg-green-700 hover:bg-green-800 text-white cursor-pointer">Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  );
}