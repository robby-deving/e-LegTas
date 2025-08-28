// RegisterEvacueeModal.tsx
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { X as XIcon, Loader2 } from "lucide-react";
// import ReactDatePicker from "react-datepicker";
// import "react-datepicker/dist/react-datepicker.css";
import type { Barangay, RoomOption } from "@/types/EvacuationCenterDetails";
import type { RegisterEvacueeModalProps } from "@/types/RegisterEvacueeModal";
// import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
// import { Calendar as DateCalendar } from "../ui/calendar"; 
// import { formatMMDDYYYY, parseMMDDYYYY, toISODateLocal } from "@/utils/dateInput";
import { DateTimePicker } from "../ui/date-time-picker";
import { toISODateLocal } from "@/utils/dateInput";
import BirthdayMaskedInput from '../EvacuationCenterDetail/BirthdayMaskedInput';

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
  const formRef = useRef<HTMLFormElement>(null);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const handleClickSave = async () => {
    if (formRef.current && !formRef.current.reportValidity()) return;
    try {
      setSaving(true);
      await Promise.resolve(onSave());
    } finally {
      setSaving(false);
    }
  };

  const suffixOptions = ["Jr.", "Sr.", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  const sexOptions = ["Male", "Female"];
  const maritalStatusOptions = ["Single", "Married", "Widowed", "Separated"];
  const educationalAttainmentOptions = ["No Formal Education", "Elementary Level", "Elementary Graduate", "High School Level", "High School Graduate", "Senior High School Level", "Senior High School Graduate", "Vocational/Technical", "College Level", "College Graduate", "Postgraduate/Master’s Level", "Master’s Graduate", "Doctorate Level", "Doctorate Graduate"];
  const purokOptions = Array.from({ length: 20 }, (_, i) => (i + 1).toString());
  const relationshipOptions = ["Spouse", "Child", "Parent", "Sibling", "Grandparent", "Grandchild", "In-law", "Relative", "Household Member", "Boarder", "Partner"];
  const [allRoomsFull, setAllRoomsFull] = useState(false);

  const SUFFIX_NONE = "__NULL__";
  const isEdit = mode === "edit";

  useEffect(() => {
    const fetchBarangays = async () => {
      try {
        const { data } = await axios.get<{ data: Barangay[] }>(
          "http://localhost:3000/api/v1/evacuees/barangays"
        );
        setBarangays(data.data || []);
      } catch (e) {
        console.error("Error fetching barangays:", e);
      }
    };
    fetchBarangays();
  }, []);

useEffect(() => {
  if (!isOpen || !centerId) return;
  const fetchRooms = async () => {
    try {
      setRoomsLoading(true);
      setRoomsError(null);

      const res = await axios.get<{
        data: RoomOption[];
        all_full?: boolean;
      }>(`http://localhost:3000/api/v1/evacuees/${centerId}/rooms?only_available=1`);

      const rows = res.data?.data ?? [];
      setRooms(rows);
      setAllRoomsFull(Boolean(res.data?.all_full) || rows.length === 0);
    } catch (err) {
      console.error("Error fetching rooms:", err);
      setRooms([]);
      setRoomsError("Failed to load rooms");
      setAllRoomsFull(false);
    } finally {
      setRoomsLoading(false);
    }
  };
  fetchRooms();
}, [isOpen, centerId]);

useEffect(() => {
  if (
    formData.searchEvacuationRoom &&
    !rooms.some(r => String(r.id) === formData.searchEvacuationRoom)
  ) {
    onFormChange("searchEvacuationRoom", "");
  }
}, [rooms, formData.searchEvacuationRoom]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
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
        <div className="max-h-[70vh] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500">
          <form ref={formRef} className="space-y-8" onSubmit={(e) => e.preventDefault()}>
            {/* --- Evacuee Information --- */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-400">
                Evacuee Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name * */}
                <div>
                  <label className="block text-sm font-medium mb-2">First Name:<span className="text-red-500">*</span></label>
                  <Input
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={(e) => onFormChange("firstName", e.target.value)}
                    required
                  />
                </div>

                {/* Middle Name (optional) */}
                <div>
                  <label className="block text-sm font-medium mb-2">Middle Name:</label>
                  <Input
                    placeholder="Middle Name"
                    value={formData.middleName}
                    onChange={(e) => onFormChange("middleName", e.target.value)}
                  />
                </div>

                {/* Last Name * */}
                <div>
                  <label className="block text-sm font-medium mb-2">Last Name:<span className="text-red-500">*</span></label>
                  <Input
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={(e) => onFormChange("lastName", e.target.value)}
                    required
                  />
                </div>

                {/* Suffix (optional) */}
                <div>
                  <label className="block text-sm font-medium mb-2">Suffix:</label>
                  <Select
                    value={formData.suffix && formData.suffix.trim() !== "" ? formData.suffix : SUFFIX_NONE}
                    onValueChange={(v) => {
                      onFormChange("suffix", v === SUFFIX_NONE ? "" : v);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Suffix" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SUFFIX_NONE}>None</SelectItem>
                      {suffixOptions.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sex * */}
                <div className="relative">
                  <label className="block text-sm font-medium mb-2">Sex:<span className="text-red-500">*</span></label>
                  <Select
                    value={formData.sex}
                    onValueChange={(v) => onFormChange("sex", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {sexOptions.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <select
                    value={formData.sex || ""}
                    onChange={() => {}}
                    required
                    className="absolute inset-0 w-full h-10 opacity-0"
                    style={{ pointerEvents: "none" }}
                    aria-hidden="true"
                    tabIndex={-1}
                  >
                    <option value="">Select</option>
                    {sexOptions.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Marital Status * */}
                <div className="relative">
                  <label className="block text-sm font-medium mb-2">Marital Status:<span className="text-red-500">*</span></label>
                  <Select
                    value={formData.maritalStatus}
                    onValueChange={(v) => onFormChange("maritalStatus", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {maritalStatusOptions.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <select
                    value={formData.maritalStatus || ""}
                    onChange={() => {}}
                    required
                    className="absolute inset-0 w-full h-10 opacity-0"
                    style={{ pointerEvents: "none" }}
                    aria-hidden="true"
                    tabIndex={-1}
                  >
                    <option value="">Select</option>
                    {maritalStatusOptions.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Birthday * */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Birthday:<span className="text-red-500">*</span>
                  </label>

                  <div className="relative w-full">
                    {/* Masked text input – same look as other <Input> fields */}
                    <BirthdayMaskedInput
                      value={formData.birthday}
                      onChange={(iso) => onFormChange("birthday", iso)}
                      required
                      className="pl-10 pr-10"  
                    />

                    {/* LEFT calendar trigger (render this AFTER the input so it’s on top) */}
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 z-30">
                      {/* Invisible clickable button from DateTimePicker */}
                      <DateTimePicker
                        value={formData.birthday ? new Date(formData.birthday) : undefined}
                        onChange={(d) => onFormChange("birthday", d ? toISODateLocal(d) : "")}
                        showTime={false}
                        placeholder=" "
                        className="absolute inset-0 h-10 w-10 p-0 opacity-0 cursor-pointer" // clickable area
                        minYear={1900}
                        maxYear={new Date().getFullYear()}
                      />
                      {/* Visible calendar icon (doesn’t block clicks) */}
                      <div className="pointer-events-none absolute inset-0 grid place-items-center">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted-foreground">
                          <path fill="currentColor" d="M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3V2Zm13 6H4v12h16V8Z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Educational Attainment * */}
                <div className="relative">
                  <label className="block text-sm font-medium mb-2">Educational Attainment:<span className="text-red-500">*</span></label>
                  <Select
                    value={formData.educationalAttainment}
                    onValueChange={(v) =>
                      onFormChange("educationalAttainment", v)
                    }
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {educationalAttainmentOptions.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <select
                    value={formData.educationalAttainment || ""}
                    onChange={() => {}}
                    required
                    className="absolute inset-0 w-full h-10 opacity-0"
                    style={{ pointerEvents: "none" }}
                    aria-hidden="true"
                    tabIndex={-1}
                  >
                    <option value="">Select</option>
                    {educationalAttainmentOptions.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Occupation (optional) */}
                <div>
                    <label className="block text-sm font-medium mb-2">Occupation:</label>
                  <Input
                    placeholder="Occupation"
                    value={formData.occupation}
                    onChange={(e) => onFormChange("occupation", e.target.value)}
                  />
                </div>

                {/* School of Origin (optional) */}
                <div>
                  <label className="block text-sm font-medium mb-2">School of Origin:</label>
                  <Input
                    placeholder="School of Origin"
                    value={formData.schoolOfOrigin}
                    onChange={(e) =>
                      onFormChange("schoolOfOrigin", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* --- Address & Family Details --- */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-400">
                Address and Family Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Barangay of Origin * */}
                <div className="relative">
                  <label className="block text-sm font-medium mb-2">Barangay of Origin:<span className="text-red-500">*</span></label>
                  <Select
                    value={formData.barangayOfOrigin}
                    onValueChange={(v) => onFormChange("barangayOfOrigin", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Barangay" />
                    </SelectTrigger>
                    <SelectContent>
                      {barangays.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <select
                    value={formData.barangayOfOrigin || ""}
                    onChange={() => {}}
                    required
                    className="absolute inset-0 w-full h-10 opacity-0"
                    style={{ pointerEvents: "none" }}
                    aria-hidden="true"
                    tabIndex={-1}
                  >
                    <option value="">Select Barangay</option>
                    {barangays.map((b) => (
                      <option key={b.id} value={String(b.id)}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Purok * */}
                <div className="relative">
                  <label className="block text-sm font-medium mb-2">Purok:<span className="text-red-500">*</span></label>
                  <Select
                    value={formData.purok}
                    onValueChange={(v) => onFormChange("purok", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Purok" />
                    </SelectTrigger>
                    <SelectContent>
                      {purokOptions.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <select
                    value={formData.purok || ""}
                    onChange={() => {}}
                    required
                    className="absolute inset-0 w-full h-10 opacity-0"
                    style={{ pointerEvents: "none" }}
                    aria-hidden="true"
                    tabIndex={-1}
                  >
                    <option value="">Select Purok</option>
                    {purokOptions.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* --- Family Head / Vulnerabilities --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Is Family Head? * */}
                <div className="relative">
                  <label className="block text-sm font-medium mb-2">Is Family Head?<span className="text-red-500">*</span></label>

                  <RadioGroup
                    value={formData.isFamilyHead}
                    // lock the group in Edit mode
                    onValueChange={
                      isEdit
                        ? undefined
                        : (v) => onFormChange("isFamilyHead", v)
                    }
                    className={`flex items-center space-x-4 ${
                      isEdit ? "opacity-80 cursor-not-allowed" : ""
                    }`}
                    aria-disabled={isEdit}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Yes" id="r1" disabled={isEdit} />
                      <label htmlFor="r1" className={isEdit ? "text-gray-400" : ""}>Yes</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="No" id="r2" disabled={isEdit} />
                      <label htmlFor="r2" className={isEdit ? "text-gray-400" : ""}>No</label>
                    </div>
                  </RadioGroup>

                  {/* native inputs only enforce "required" in Register mode */}
                  <div className="absolute inset-0 opacity-0 pointer-events-none">
                    <input
                      type="radio"
                      name="isFamilyHead"
                      value="Yes"
                      checked={formData.isFamilyHead === "Yes"}
                      onChange={() => {}}
                      required={!isEdit}
                      disabled={isEdit}
                    />
                    <input
                      type="radio"
                      name="isFamilyHead"
                      value="No"
                      checked={formData.isFamilyHead === "No"}
                      onChange={() => {}}
                      required={!isEdit}
                      disabled={isEdit}
                    />
                  </div>
                </div>

                {formData.isFamilyHead === "No" && (
                  <>
                    {/* Family Head * (conditional) */}
                    <div className="relative">
                      <label className="block text-sm font-medium mb-2">Family Head:<span className="text-red-500">*</span></label>
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
                      <input
                        type="text"
                        value={formData.familyHead || ""}
                        onChange={() => {}}
                        required
                        className="absolute inset-0 w-full h-10 opacity-0 pointer-events-none"
                        tabIndex={-1}
                      />
                    </div>

                    {/* Relationship to Family Head * (conditional) */}
                    <div className="relative">
                      <label className="block text-sm font-medium mb-2">Relationship to Family Head:<span className="text-red-500">*</span></label>
                      <Select
                        value={formData.relationshipToFamilyHead}
                        onValueChange={(v) =>
                          onFormChange("relationshipToFamilyHead", v)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Relationship to Family Head" />
                        </SelectTrigger>
                        <SelectContent>
                          {relationshipOptions.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <select
                        value={formData.relationshipToFamilyHead || ""}
                        onChange={() => {}}
                        required
                        className="absolute inset-0 w-full h-10 opacity-0 pointer-events-none"
                        tabIndex={-1}
                      >
                        <option value="">Relationship to Family Head</option>
                        {relationshipOptions.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Evacuation Room * */}
              <div className="relative">
                <label className="block text-sm font-medium mb-2">
                  Evacuation Room:<span className="text-red-500">*</span>
                </label>

                <Select
                  value={formData.searchEvacuationRoom}
                  onValueChange={(v) => onFormChange("searchEvacuationRoom", v)}
                  disabled={roomsLoading || !!roomsError || allRoomsFull}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        roomsLoading
                          ? "Loading rooms..."
                          : roomsError
                          ? roomsError
                          : allRoomsFull
                          ? "All rooms are full"
                          : "Select a room"
                      }
                    />
                  </SelectTrigger>

                  <SelectContent>
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.room_name}
                        {typeof r.available === "number" && typeof r.capacity === "number"
                          ? ` (${r.available}/${r.capacity} left)`
                          : typeof r.available === "number"
                          ? ` (${r.available} left)`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Hidden native select to keep HTML5 required validation */}
                <select
                  value={formData.searchEvacuationRoom || ""}
                  onChange={() => {}}
                  required={!roomsLoading && !roomsError && !allRoomsFull}
                  disabled={roomsLoading || !!roomsError || allRoomsFull}
                  className="absolute inset-0 w-full h-10 opacity-0"
                  style={{ pointerEvents: "none" }}
                  aria-hidden="true"
                  tabIndex={-1}
                >
                  <option value="">
                    {roomsLoading
                      ? "Loading rooms..."
                      : roomsError
                      ? roomsError
                      : allRoomsFull
                      ? "All rooms are full"
                      : "Select a room"}
                  </option>
                  {rooms.map((r) => (
                    <option key={r.id} value={String(r.id)}>
                      {r.room_name}
                      {typeof r.available === "number" && typeof r.capacity === "number"
                        ? ` (${r.available}/${r.capacity} left)`
                        : typeof r.available === "number"
                        ? ` (${r.available} left)`
                        : ""}
                    </option>
                  ))}
                </select>

                {/* Optional helper when full */}
                {!roomsLoading && !roomsError && allRoomsFull && (
                  <p className="mt-1 text-xs text-red-600">All rooms are full.</p>
                )}
              </div>
              </div>

            {/* --- Vulnerability Classification (all optional) --- */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-400">
                Vulnerability Classification
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="pwd"
                    checked={formData.vulnerabilities.pwd}
                    onCheckedChange={(c) => onVulnerabilityChange("pwd", !!c)}
                  />
                  <label htmlFor="pwd" className="text-sm font-medium leading-none">Person with Disability (PWD)</label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="pregnant"
                    checked={formData.vulnerabilities.pregnant}
                    onCheckedChange={(c) =>
                      onVulnerabilityChange("pregnant", !!c)
                    }
                  />
                  <label htmlFor="pregnant" className="text-sm font-medium leading-none">Pregnant</label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="lactating"
                    checked={formData.vulnerabilities.lactatingMother}
                    onCheckedChange={(c) =>
                      onVulnerabilityChange("lactatingMother", !!c)
                    }
                  />
                  <label htmlFor="lactating" className="text-sm font-medium leading-none">Lactating Mother</label>
                </div>
              </div>
            </div>
            <DialogFooter className="flex justify-end space-x-3 pt-2">
              <Button
                type="button"                 
                variant="outline"
                onClick={onClose}
                disabled={saving}
                className="px-6 cursor-pointer"
              >
                Cancel
              </Button>

              <Button
                type="button"                 
                onClick={handleClickSave}
                disabled={saving}
                className="bg-green-700 hover:bg-green-800 text-white px-6 cursor-pointer disabled:opacity-90"
                aria-busy={saving}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {mode === "register"
                  ? (saving ? "Registering..." : "Register")
                  : (saving ? "Saving..." : "Save")}
              </Button>
            </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
  );
};
