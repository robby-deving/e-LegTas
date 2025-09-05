import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "../ui/dialog";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "../ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";
import { Button } from "../ui/button";
import { CalendarIcon } from "lucide-react";
import type { Disaster, DisasterPayload, DisasterTypeWithId } from "@/types/disaster";

interface Props {
  mode: "create" | "edit";
  disaster?: Disaster;
  open: boolean;
  onClose: () => void;
  onSave: (d: DisasterPayload) => void;
  disasterTypes: DisasterTypeWithId[];
  loading?: boolean;
}

export default function DisasterFormDialog({
  mode,
  disaster,
  open,
  onClose,
  onSave,
  disasterTypes,
  loading = false,
}: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState(""); // Stores the display name of the type
  const [typeId, setTypeId] = useState<number | undefined>(undefined); // Stores the actual ID of the type
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (mode === "edit" && disaster) {
      setName(disaster.name);
      setType(disaster.type); // Set display name
      setTypeId(disaster.type_id); // Set actual ID
      setStartDate(disaster.start_date);
      setEndDate(disaster.end_date ?? "");
    } else {
      setName("");
      setType(""); // Clear display name
      setTypeId(undefined); // Clear ID
      setStartDate(new Date().toISOString());
      setEndDate("");
    }
  }, [mode, disaster]);

  const handleSave = () => {
    // Replaced alert with a console.error or a custom message box if you have one
    if (!name || typeId === undefined || !startDate) {
      console.error("Please fill in all required fields: Disaster Name, Type, and Start Date.");
      // You might want to display a user-friendly message here, e.g., using a toast or a modal
      return;
    }

    const payload: DisasterPayload = {
      disaster_name: name,
      disaster_type_id: typeId, // Use the stored typeId
      disaster_start_date: startDate,
      disaster_end_date: mode === "edit" ? endDate || null : null,
    };

    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-green-700 text-xl font-bold mb-2">
            {mode === "create" ? "Record New Disaster" : "Update Disaster"}
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Disaster Name:
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Disaster Name"
              className="w-full"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Disaster Type:
            </label>
            <Select
              // The value of Select should correspond to the 'value' of SelectItem
              // We'll use the typeId (converted to string) for this.
              value={typeId !== undefined ? String(typeId) : ""}
              onValueChange={(selectedValue) => {
                // Find the selected type object from the disasterTypes array
                const selectedType = disasterTypes.find(
                  (t) => String(t.id) === selectedValue
                );
                if (selectedType) {
                  setType(selectedType.name); // Update display name
                  setTypeId(Number(selectedType.id)); // Update actual ID
                }
              }}
              disabled={mode === "edit"}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category">
                  {typeId !== undefined && type ? type : "Select category"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {disasterTypes.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Start Date:
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  {startDate
                    ? format(new Date(startDate), "MMMM dd, yyyy")
                    : "Pick a start date"}
                  <CalendarIcon className="ml-auto h-5 w-5 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate ? new Date(startDate) : undefined}
                  onSelect={(date) =>
                    date && setStartDate(date.toISOString())
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date - only in edit mode */}
          {mode === "edit" && (
            <div>
              <label className="block text-sm font-semibold mb-1">
                End Date:
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    {endDate
                      ? format(new Date(endDate), "MMMM dd, yyyy")
                      : "Pick an end date"}
                    <CalendarIcon className="ml-auto h-5 w-5 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate ? new Date(endDate) : undefined}
                    onSelect={(date) =>
                      date && setEndDate(date.toISOString())
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </form>

        <DialogFooter className="flex justify-between mt-4">
          <DialogClose asChild>
            <Button variant="outline" className="cursor-pointer">
              Cancel
            </Button>
          </DialogClose>
          <Button
            className="bg-green-700 hover:bg-green-800 text-white cursor-pointer"
            onClick={handleSave}
            disabled={loading}
          >
            {loading
              ? (mode === "create" ? "Adding..." : "Saving...")
              : (mode === "create" ? "Add Disaster" : "Save Changes")
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
