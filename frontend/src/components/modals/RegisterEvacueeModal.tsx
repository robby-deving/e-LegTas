// RegisterEvacueeModal.tsx
import { useState, useEffect } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Calendar, X as XIcon } from "lucide-react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import type { Barangay } from "@/types/EvacuationCenterDetails";

type RoomOption = { id: number; room_name: string };

export type RegisterEvacueeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: "register" | "edit";
  formData: any;
  onFormChange: (field: string, value: string) => void;
  onVulnerabilityChange: (field: string, value: boolean) => void;
  onSave: () => void;
  onFamilyHeadSearch: () => void;
  centerId: number; 
};

export const RegisterEvacueeModal = ({
  isOpen,
  onClose,
  mode,
  formData,
  onFormChange,
  onVulnerabilityChange,
  onSave,
  onFamilyHeadSearch,
  centerId, 
}: RegisterEvacueeModalProps) => {
  if (!isOpen) return null;

  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  const suffixOptions = ["Jr.", "Sr.", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  const sexOptions = ["Male", "Female"];
  const maritalStatusOptions = ["Single", "Married", "Widowed", "Separated"];
  const educationalAttainmentOptions = ["No Formal Education", "Elementary Level", "Elementary Graduate", "High School Level", "High School Graduate", "Senior High School Level", "Senior High School Graduate", "Vocational/Technical", "College Level", "College Graduate", "Postgraduate/Master’s Level", "Master’s Graduate", "Doctorate Level", "Doctorate Graduate"];
  const purokOptions = Array.from({ length: 20 }, (_, i) => (i + 1).toString());
  const relationshipOptions = ["Head", "Spouse", "Child", "Parent", "Sibling", "Grandparent", "Grandchild", "In-law", "Relative", "Household Member", "Boarder", "Partner"];

  // Barangays
  useEffect(() => {
    const fetchBarangays = async () => {
      try {
        const response = await axios.get<{ data: Barangay[] }>("http://localhost:3000/api/v1/evacuees/barangays");
        setBarangays(response.data.data || []);
      } catch (error) {
        console.error("Error fetching barangays:", error);
      }
    };
    fetchBarangays();
  }, []);

  // Rooms (by centerId / disaster_evacuation_event_id)
  useEffect(() => {
    const fetchRooms = async () => {
      if (!isOpen || !centerId) return;
      try {
        setRoomsLoading(true);
        setRoomsError(null);
        const res = await axios.get<{ data: RoomOption[] }>(`http://localhost:3000/api/v1/evacuees/${centerId}/rooms`);
        setRooms(res.data?.data || []);
      } catch (err) {
        console.error("Error fetching rooms:", err);
        setRooms([]);
        setRoomsError("Failed to load rooms");
      } finally {
        setRoomsLoading(false);
      }
    };
    fetchRooms();
  }, [isOpen, centerId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle className="text-green-700 text-xl font-bold">
            {mode === "register" ? "Register Evacuee" : "Edit Evacuee"}
          </DialogTitle>
          <DialogDescription>
            {mode === "register"
              ? "Fill out the form below to register a new evacuee in the evacuation center."
              : "Update the details of the selected evacuee below."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-8">
          {/* --- Evacuee Information --- */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400">Evacuee Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">First Name:</label>
                <Input
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={(e) => onFormChange("firstName", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Middle Name:</label>
                <Input
                  placeholder="Middle Name"
                  value={formData.middleName}
                  onChange={(e) => onFormChange("middleName", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Last Name:</label>
                <Input
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={(e) => onFormChange("lastName", e.target.value)}
                />
              </div>

              {/* Suffix */}
              <div>
                <label className="block text-sm font-medium mb-2">Suffix:</label>
                <Select value={formData.suffix} onValueChange={(v) => onFormChange("suffix", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Suffix" />
                  </SelectTrigger>
                  <SelectContent>
                    {suffixOptions.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sex */}
              <div>
                <label className="block text-sm font-medium mb-2">Sex:</label>
                <Select value={formData.sex} onValueChange={(v) => onFormChange("sex", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {sexOptions.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Marital Status */}
              <div>
                <label className="block text-sm font-medium mb-2">Marital Status:</label>
                <Select value={formData.maritalStatus} onValueChange={(v) => onFormChange("maritalStatus", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {maritalStatusOptions.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Birthday */}
              <div>
                <label className="block text-sm font-medium mb-2">Birthday:</label>
                <div className="relative w-full">
                  <ReactDatePicker
                    wrapperClassName="w-full"
                    popperPlacement="bottom"
                    selected={formData.birthday ? new Date(formData.birthday) : null}
                    onChange={(date) =>
                      onFormChange("birthday", date ? date.toISOString().substring(0, 10) : "")
                    }
                    placeholderText="MM/DD/YYYY"
                    customInput={<Input className="w-full pl-10" />}
                    dateFormat="MM/dd/yyyy"
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none " />
                </div>
              </div>

              {/* Educational Attainment */}
              <div>
                <label className="block text-sm font-medium mb-2">Educational Attainment:</label>
                <Select value={formData.educationalAttainment} onValueChange={(v) => onFormChange("educationalAttainment", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {educationalAttainmentOptions.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Occupation:</label>
                <Input
                  placeholder="Occupation"
                  value={formData.occupation}
                  onChange={(e) => onFormChange("occupation", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">School of Origin:</label>
                <Input
                  placeholder="School of Origin"
                  value={formData.schoolOfOrigin}
                  onChange={(e) => onFormChange("schoolOfOrigin", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* --- Address & Family Details --- */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400">Address and Family Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Barangay of Origin:</label>
                <Select value={formData.barangayOfOrigin} onValueChange={(v) => onFormChange("barangayOfOrigin", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Barangay" />
                  </SelectTrigger>
                  <SelectContent>
                    {barangays.map((b) => (
                      <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Purok:</label>
                <Select value={formData.purok} onValueChange={(v) => onFormChange("purok", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Purok" />
                  </SelectTrigger>
                  <SelectContent>
                    {purokOptions.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* --- Family Head / Vulnerabilities --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Is Family Head?</label>
                <RadioGroup
                  defaultValue={formData.isFamilyHead}
                  onValueChange={(v) => onFormChange("isFamilyHead", v)}
                  className="flex items-center space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Yes" id="r1" />
                    <label htmlFor="r1">Yes</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="No" id="r2" />
                    <label htmlFor="r2">No</label>
                  </div>
                </RadioGroup>
              </div>

              {formData.isFamilyHead === "No" && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Family Head:</label>
                    <div className="relative">
                      <Input
                        placeholder="Search Family Head"
                        value={formData.familyHead}
                        onClick={onFamilyHeadSearch}
                        readOnly
                        className="w-full cursor-pointer bg-gray-50"
                      />
                      {formData.familyHead && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onFormChange("familyHead", "");
                            onFormChange("relationshipToFamilyHead", "");
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Relationship to Family Head:</label>
                    <Select
                      value={formData.relationshipToFamilyHead}
                      onValueChange={(v) => onFormChange("relationshipToFamilyHead", v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Relationship to Family Head" />
                      </SelectTrigger>
                      <SelectContent>
                        {relationshipOptions.map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            {/* ✅ Evacuation Room dropdown */}
            <div>
              <label className="block text-sm font-medium mb-2">Evacuation Room:</label>
              <Select
                value={formData.searchEvacuationRoom} // store selected room id as string
                onValueChange={(v) => onFormChange("searchEvacuationRoom", v)}
                disabled={roomsLoading || !!roomsError}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      roomsLoading ? "Loading rooms..." : roomsError ? roomsError : "Select a room"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.room_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* --- Vulnerability Classification --- */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400">Vulnerability Classification</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="pwd"
                  checked={formData.vulnerabilities.pwd}
                  onCheckedChange={(c) => onVulnerabilityChange("pwd", !!c)}
                />
                <label htmlFor="pwd" className="text-sm font-medium leading-none">
                  Person with Disability (PWD)
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="pregnant"
                  checked={formData.vulnerabilities.pregnant}
                  onCheckedChange={(c) => onVulnerabilityChange("pregnant", !!c)}
                />
                <label htmlFor="pregnant" className="text-sm font-medium leading-none">
                  Pregnant
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="lactating"
                  checked={formData.vulnerabilities.lactatingMother}
                  onCheckedChange={(c) => onVulnerabilityChange("lactatingMother", !!c)}
                />
                <label htmlFor="lactating" className="text-sm font-medium leading-none">
                  Lactating Mother
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-end space-x-3 pt-2">
            <Button variant="outline" onClick={onClose} className="px-6 cursor-pointer">
              Cancel
            </Button>
            <Button onClick={onSave} className="bg-green-700 hover:bg-green-800 text-white px-6 cursor-pointer">
              {mode === "register" ? "Register" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
