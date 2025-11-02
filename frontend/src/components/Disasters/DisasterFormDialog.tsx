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
import { validateString, validateDate, validateNumeric } from "@/utils/validateInput";

/**
 * Note: While the UI displays "Incident", we use "Disaster" in our
 * codebase for consistency with our data models and APIs.
 */
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
  const [type, setType] = useState(""); 
  const [typeId, setTypeId] = useState<number | undefined>(undefined); 
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    typeId?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  useEffect(() => {
    if (mode === "edit" && disaster) {
      setName(disaster.name);
      setType(disaster.type); 
      setTypeId(disaster.type_id); 
      setStartDate(disaster.start_date);
      setEndDate(disaster.end_date ?? "");
    } else {
      setName("");
      setType(""); 
      setTypeId(undefined); 
      setStartDate(new Date().toISOString());
      setEndDate("");
    }
    setFieldErrors({});
  }, [mode, disaster]);

  const handleSave = () => {
    setFieldErrors({}); 

    // Validate all fields
    const errors: {
      name?: string;
      typeId?: string;
      startDate?: string;
      endDate?: string;
    } = {};

    // Validate disaster name
    const nameValidation = validateString(name, { minLength: 1, maxLength: 100 });
    if (!nameValidation.isValid) {
      errors.name ='Invalid incident name';
    }

    // Validate type ID
    if (typeId === undefined) {
      errors.typeId = "Please select an incident type";
    } else {
      const typeIdValidation = validateNumeric(typeId, { min: 1 });
      if (!typeIdValidation.isValid) {
        errors.typeId = "Invalid incident type selected";
      }
    }

    // Validate start date
    if (!startDate) {
      errors.startDate = "Start date is required";
    } else {
      const startDateValidation = validateDate(startDate);
      if (!startDateValidation.isValid) {
        errors.startDate = startDateValidation.error;
      }
    }

    // Validate end date (only in edit mode and if provided)
    if (mode === "edit" && endDate) {
      const endDateValidation = validateDate(endDate);
      if (!endDateValidation.isValid) {
        errors.endDate = endDateValidation.error;
      } else if (startDate && new Date(endDate) <= new Date(startDate)) {
        errors.endDate = "End date must be after the start date";
      }
    }

    // If there are validation errors, display them and stop
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // All validation passed, create payload with sanitized data
    const payload: DisasterPayload = {
      disaster_name: nameValidation.sanitized!,
      disaster_type_id: typeId!,
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
            {mode === "create" ? "Record New Incident" : "Update Incident"}
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Incident Name:
            </label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                // Clear name error when user starts typing
                if (fieldErrors.name) {
                  setFieldErrors(prev => ({ ...prev, name: undefined }));
                }
              }}
              placeholder="Incident Name"
              className={`w-full ${fieldErrors.name ? 'border-red-500' : ''}`}
            />
            {fieldErrors.name && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
            )}
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Incident Type:
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
                  setType(selectedType.name); 
                  setTypeId(Number(selectedType.id)); 
                  // Clear type error when user makes a selection
                  if (fieldErrors.typeId) {
                    setFieldErrors(prev => ({ ...prev, typeId: undefined }));
                  }
                }
              }}
            >
              <SelectTrigger className={`w-full ${fieldErrors.typeId ? 'border-red-500' : ''}`}>
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
            {fieldErrors.typeId && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.typeId}</p>
            )}
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
                  className={`w-full justify-start text-left font-normal ${fieldErrors.startDate ? 'border-red-500' : ''}`}
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
                  onSelect={(date) => {
                    if (date) {
                      setStartDate(date.toISOString());
                      // Clear start date error when user selects a date
                      if (fieldErrors.startDate) {
                        setFieldErrors(prev => ({ ...prev, startDate: undefined }));
                      }
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {fieldErrors.startDate && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.startDate}</p>
            )}
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
                    className={`w-full justify-start text-left font-normal ${fieldErrors.endDate ? 'border-red-500' : ''}`}
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
                    onSelect={(date) => {
                      if (date) {
                        setEndDate(date.toISOString());
                        // Clear end date error when user selects a date
                        if (fieldErrors.endDate) {
                          setFieldErrors(prev => ({ ...prev, endDate: undefined }));
                        }
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {fieldErrors.endDate && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.endDate}</p>
              )}
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
              : (mode === "create" ? "Add Incident" : "Save Changes")
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
