// RegisterEvacueeModal.tsx
import { useState, useEffect, useRef } from "react";
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
import type { Barangay, RoomOption } from "@/types/EvacuationCenterDetails";
import type { RegisterEvacueeModalProps } from "@/types/RegisterEvacueeModal";

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

  const suffixOptions = ["Jr.", "Sr.", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  const sexOptions = ["Male", "Female"];
  const maritalStatusOptions = ["Single", "Married", "Widowed", "Separated"];
  const educationalAttainmentOptions = ["No Formal Education","Elementary Level","Elementary Graduate","High School Level","High School Graduate","Senior High School Level","Senior High School Graduate","Vocational/Technical","College Level","College Graduate","Postgraduate/Master’s Level","Master’s Graduate","Doctorate Level","Doctorate Graduate"];
  const purokOptions = Array.from({ length: 20 }, (_, i) => (i + 1).toString());
  const relationshipOptions = ["Head","Spouse","Child","Parent","Sibling","Grandparent","Grandchild","In-law","Relative","Household Member","Boarder","Partner"];

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
        const res = await axios.get<{ data: RoomOption[] }>(
          `http://localhost:3000/api/v1/evacuees/${centerId}/rooms`
        );
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

  useEffect(() => {
    if (!formData.evacuationRoomName || rooms.length === 0) return;

    const match = rooms.find(
      (r) =>
        r.room_name.trim().toLowerCase() ===
        formData.evacuationRoomName.trim().toLowerCase()
    );

    if (match) {
      onFormChange("searchEvacuationRoom", String(match.id));
    }
  }, [formData.evacuationRoomName, rooms]);

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
          <form ref={formRef} className="space-y-8">
            {/* --- Evacuee Information --- */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-400">
                Evacuee Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name * */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    First Name:<span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={(e) => onFormChange("firstName", e.target.value)}
                    required
                  />
                </div>

                {/* Middle Name (optional) */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Middle Name:
                  </label>
                  <Input
                    placeholder="Middle Name"
                    value={formData.middleName}
                    onChange={(e) => onFormChange("middleName", e.target.value)}
                  />
                </div>

                {/* Last Name * */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Last Name:<span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={(e) => onFormChange("lastName", e.target.value)}
                    required
                  />
                </div>

                {/* Suffix (optional) */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Suffix:
                  </label>
                  <Select
                    value={formData.suffix}
                    onValueChange={(v) => onFormChange("suffix", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Suffix" />
                    </SelectTrigger>
                    <SelectContent>
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
                  <label className="block text-sm font-medium mb-2">
                    Sex:<span className="text-red-500">*</span>
                  </label>
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
                  <label className="block text-sm font-medium mb-2">
                    Marital Status:<span className="text-red-500">*</span>
                  </label>
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
                    {/* Your styled DatePicker */}
                    <ReactDatePicker
                      wrapperClassName="w-full"
                      popperPlacement="bottom"
                      selected={
                        formData.birthday ? new Date(formData.birthday) : null
                      }
                      onChange={(date) =>
                        onFormChange(
                          "birthday",
                          date ? date.toISOString().substring(0, 10) : ""
                        )
                      }
                      placeholderText="MM/DD/YYYY"
                      customInput={<Input className="w-full pl-10 h-10" />}
                      dateFormat="MM/dd/yyyy"
                    />

                    {/* Left calendar icon */}
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />

                    <input
                      type="text"
                      value={formData.birthday || ""}
                      onChange={() => {}}
                      required
                      className="absolute inset-y-0 right-0 h-10 w-[calc(100%-2.5rem)] opacity-0 pointer-events-none"
                      style={{ left: "2.5rem" }}
                      aria-hidden="true"
                      tabIndex={-1}
                    />
                  </div>
                </div>

                {/* Educational Attainment * */}
                <div className="relative">
                  <label className="block text-sm font-medium mb-2">
                    Educational Attainment:
                    <span className="text-red-500">*</span>
                  </label>
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
                  <label className="block text-sm font-medium mb-2">
                    Occupation:
                  </label>
                  <Input
                    placeholder="Occupation"
                    value={formData.occupation}
                    onChange={(e) => onFormChange("occupation", e.target.value)}
                  />
                </div>

                {/* School of Origin (optional) */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    School of Origin:
                  </label>
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
                  <label className="block text-sm font-medium mb-2">
                    Barangay of Origin:<span className="text-red-500">*</span>
                  </label>
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
                  <label className="block text-sm font-medium mb-2">
                    Purok:<span className="text-red-500">*</span>
                  </label>
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
                  <label className="block text-sm font-medium mb-2">
                    Is Family Head?<span className="text-red-500">*</span>
                  </label>
                  <RadioGroup
                    value={formData.isFamilyHead}
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
                  <div className="absolute inset-0 opacity-0 pointer-events-none">
                    <input
                      type="radio"
                      name="isFamilyHead"
                      value="Yes"
                      checked={formData.isFamilyHead === "Yes"}
                      onChange={() => {}}
                      required
                    />
                    <input
                      type="radio"
                      name="isFamilyHead"
                      value="No"
                      checked={formData.isFamilyHead === "No"}
                      onChange={() => {}}
                    />
                  </div>
                </div>

                {formData.isFamilyHead === "No" && (
                  <>
                    {/* Family Head * (conditional) */}
                    <div className="relative">
                      <label className="block text-sm font-medium mb-2">
                        Family Head:<span className="text-red-500">*</span>
                      </label>
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
                      <label className="block text-sm font-medium mb-2">
                        Relationship to Family Head:
                        <span className="text-red-500">*</span>
                      </label>
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
                  disabled={roomsLoading || !!roomsError}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        roomsLoading
                          ? "Loading rooms..."
                          : roomsError
                          ? roomsError
                          : "Select a room"
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
                <select
                  value={formData.searchEvacuationRoom || ""}
                  onChange={() => {}}
                  required={!roomsLoading && !roomsError}
                  disabled={roomsLoading || !!roomsError}
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
                      : "Select a room"}
                  </option>
                  {rooms.map((r) => (
                    <option key={r.id} value={String(r.id)}>
                      {r.room_name}
                    </option>
                  ))}
                </select>
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
                  <label
                    htmlFor="pwd"
                    className="text-sm font-medium leading-none"
                  >
                    Person with Disability (PWD)
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="pregnant"
                    checked={formData.vulnerabilities.pregnant}
                    onCheckedChange={(c) =>
                      onVulnerabilityChange("pregnant", !!c)
                    }
                  />
                  <label
                    htmlFor="pregnant"
                    className="text-sm font-medium leading-none"
                  >
                    Pregnant
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="lactating"
                    checked={formData.vulnerabilities.lactatingMother}
                    onCheckedChange={(c) =>
                      onVulnerabilityChange("lactatingMother", !!c)
                    }
                  />
                  <label
                    htmlFor="lactating"
                    className="text-sm font-medium leading-none"
                  >
                    Lactating Mother
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter className="flex justify-end space-x-3 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="px-6 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!formRef.current || formRef.current.reportValidity()) {
                    onSave();
                  }
                }}
                className="bg-green-700 hover:bg-green-800 text-white px-6 cursor-pointer"
              >
                {mode === "register" ? "Register" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
