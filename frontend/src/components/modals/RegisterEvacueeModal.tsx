// RegisterEvacueeModal.tsx
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { SearchEvacuation } from "./SearchEvacuation";
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
import { toISODateLocal } from "@/utils/dateInput.ts";
import BirthdayMaskedInput from '../EvacuationCenterDetail/BirthdayMaskedInput';
import { RegisterBlockDialog } from "@/components/modals/RegisterBlockDialog";
import searchIcon from "@/assets/search.svg";
import { useSelector } from "react-redux";
import { selectToken } from "@/features/auth/authSlice";

import { validateString, validateDate } from '../../utils/validateInput';

// Validation function for evacuee registration form
export function validateEvacueeForm(formData: any, centerId?: number): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {};

  // Validate first name
  const firstNameValidation = validateString(formData.firstName || '', { minLength: 1, maxLength: 50 });
  if (!firstNameValidation.isValid) {
    errors.firstName = firstNameValidation.error;
  }

  // Validate last name
  const lastNameValidation = validateString(formData.lastName || '', { minLength: 1, maxLength: 50 });
  if (!lastNameValidation.isValid) {
    errors.lastName = lastNameValidation.error;
  }

  // Validate middle name (optional)
  if (formData.middleName && formData.middleName.trim()) {
    const middleNameValidation = validateString(formData.middleName, { minLength: 1, maxLength: 50 });
    if (!middleNameValidation.isValid) {
      errors.middleName = middleNameValidation.error;
    }
  }

  // Validate suffix (optional)
  if (formData.suffix && formData.suffix !== SUFFIX_NONE) {
    const suffixOptions = ["Jr.", "Sr.", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    if (!suffixOptions.includes(formData.suffix)) {
      errors.suffix = 'Invalid suffix selected';
    }
  }

  // Validate sex
  if (!formData.sex) {
    errors.sex = 'Please select gender';
  } else if (!["Male", "Female"].includes(formData.sex)) {
    errors.sex = 'Invalid gender selected';
  }

  // Validate marital status
  if (!formData.maritalStatus) {
    errors.maritalStatus = 'Please select marital status';
  } else {
    const maritalStatusOptions = ["Single", "Married", "Widowed", "Separated"];
    if (!maritalStatusOptions.includes(formData.maritalStatus)) {
      errors.maritalStatus = 'Invalid marital status selected';
    }
  }

  // Validate birthday
  if (!formData.birthday) {
    errors.birthday = 'Birthday is required';
  } else {
    const birthdayValidation = validateDate(formData.birthday);
    if (!birthdayValidation.isValid) {
      errors.birthday = birthdayValidation.error;
    } else {
      // Additional validation: not in future and reasonable age range
      const birthDate = new Date(formData.birthday);
      const today = new Date();
      const minAge = 0; // Allow newborn
      const maxAge = 120; // Maximum reasonable age

      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < minAge || age > maxAge) {
        errors.birthday = 'Please enter a valid birth date';
      }
    }
  }

  // Validate educational attainment
  if (!formData.educationalAttainment) {
    errors.educationalAttainment = 'Please select educational attainment';
  } else {
    const educationalAttainmentOptions = ["No Formal Education", "Elementary Level", "Elementary Graduate", "High School Level", "High School Graduate", "Senior High School Level", "Senior High School Graduate", "Vocational/Technical", "College Level", "College Graduate", "Postgraduate/Master’s Level", "Master’s Graduate", "Doctorate Level", "Doctorate Graduate"];
    if (!educationalAttainmentOptions.includes(formData.educationalAttainment)) {
      errors.educationalAttainment = 'Invalid educational attainment selected';
    }
  }

  // Validate occupation (optional)
  if (formData.occupation && formData.occupation.trim()) {
    const occupationValidation = validateString(formData.occupation, { minLength: 1, maxLength: 100 });
    if (!occupationValidation.isValid) {
      errors.occupation = occupationValidation.error;
    }
  }

  // Validate school of origin (optional)
  if (formData.schoolOfOrigin && formData.schoolOfOrigin.trim()) {
    const schoolValidation = validateString(formData.schoolOfOrigin, { minLength: 1, maxLength: 200 });
    if (!schoolValidation.isValid) {
      errors.schoolOfOrigin = schoolValidation.error;
    }
  }

  // Validate barangay of origin
  if (!formData.barangayOfOrigin) {
    errors.barangayOfOrigin = 'Please select barangay of origin';
  }

  // Validate purok
  if (!formData.purok) {
    errors.purok = 'Please select purok';
  } else {
    const purokOptions = Array.from({ length: 20 }, (_, i) => (i + 1).toString());
    if (!purokOptions.includes(formData.purok)) {
      errors.purok = 'Invalid purok selected';
    }
  }

  // Validate isFamilyHead
  if (!formData.isFamilyHead) {
    errors.isFamilyHead = 'Please specify if this person is the family head';
  } else if (!["Yes", "No"].includes(formData.isFamilyHead)) {
    errors.isFamilyHead = 'Invalid family head selection';
  }

  // Validate family head (required if not family head)
  if (formData.isFamilyHead === "No") {
    if (!formData.familyHead || !formData.familyHead.trim()) {
      errors.familyHead = 'Family head is required';
    }
    if (!formData.relationshipToFamilyHead) {
      errors.relationshipToFamilyHead = 'Relationship to family head is required';
    } else {
      const relationshipOptions = ["Spouse", "Child", "Parent", "Sibling", "Grandparent", "Grandchild", "In-law", "Relative", "Household Member", "Boarder", "Partner"];
      if (!relationshipOptions.includes(formData.relationshipToFamilyHead)) {
        errors.relationshipToFamilyHead = 'Invalid relationship selected';
      }
    }
  }

  // Validate evacuation room (required if centerId exists)
  if (centerId) {
    if (!formData.searchEvacuationRoom) {
      errors.searchEvacuationRoom = 'Please select an evacuation room';
    }
  }

  return errors;
}

const SUFFIX_NONE = "__NULL__";

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
  canCreateFamilyInformation = true,
  hideRoomField = false,
  isPrivateHouse = false,
}: RegisterEvacueeModalProps) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showSearchEvacuationModal, setShowSearchEvacuationModal] = useState(false);
  const [selectedEvacuation, setSelectedEvacuation] = useState<{ id: number; name: string; event_id: number | null; } | null>(null);
  const [ecCategory, setEcCategory] = useState<string | null>(null);
  const token = useSelector(selectToken);

  const isPrivate = isPrivateHouse || (ecCategory?.toLowerCase?.() === "private house");
  const hideWhileUnknown = !centerId && !!selectedEvacuation?.id && ecCategory === null;
  const shouldHideRoom = hideRoomField || isPrivate || hideWhileUnknown;

  const openedOnceRef = useRef(false);
  useEffect(() => {
    if (isOpen && !openedOnceRef.current) {
      openedOnceRef.current = true;
      console.log("[RegisterEvacueeModal OPENED]", {
        centerId,
        isPrivateHouseProp: isPrivateHouse,
        ecCategory,
        computed_isPrivate: isPrivate,
        shouldHideRoom,
      });
    }
  if (!isOpen && openedOnceRef.current) {
    openedOnceRef.current = false;
  }
}, [isOpen, centerId, isPrivateHouse, ecCategory, isPrivate, shouldHideRoom]);

  useEffect(() => {
    if (shouldHideRoom && formData.searchEvacuationRoom) {
      onFormChange("searchEvacuationRoom", "");
    }
  }, [shouldHideRoom]);

useEffect(() => {
  if (!selectedEvacuation?.id || !token) {
    setEcCategory(null);
    return;
  }
  let cancelled = false;
  (async () => {
    try {
      const res = await axios.get<{ data: { category?: string | null } }>(
        `/api/v1/evacuation-centers/${selectedEvacuation.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const raw = res?.data?.data?.category ?? null;
      if (!cancelled) setEcCategory(raw);
    } catch (e) {
      console.error("getEvacuationCenter failed", e);
      if (!cancelled) setEcCategory(null);
    }
  })();
  return () => { cancelled = true; };
}, [selectedEvacuation?.id, token]);

useEffect(() => {
  if (!isOpen || !centerId || !token) return;

  let cancelled = false;
  (async () => {
    try {
      const res = await axios.get<{ data: { category?: string | null } }>(
        `/api/v1/disaster-events/${centerId}/center-category`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const cat = res?.data?.data?.category ?? null;
      if (!cancelled) setEcCategory(cat);
    } catch (e) {
      console.error("getEventCenterCategory failed", e);
      if (!cancelled) setEcCategory(null);
    }
  })();

  return () => { cancelled = true; };
}, [isOpen, centerId, token]);

const handleClickSave = async () => {
  if (formRef.current && !formRef.current.reportValidity()) return;

  // Clear previous errors
  setFieldErrors({});
  setErrorMsg(null);
  setShowBlockDialog(false);

  // Validate form data
  const validationErrors = validateEvacueeForm(formData, centerId);

  // If there are validation errors, display them and stop
  if (Object.keys(validationErrors).length > 0) {
    setFieldErrors(validationErrors);
    return;
  }

  try {
    console.log('saving');
    setSaving(true);
    await Promise.resolve(onSave({ shouldHideRoom }));
  } catch (err) {
    console.log('error');
    setErrorMsg(mapRegisterError(err));
    setShowBlockDialog(true); // 👈 open the popup
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
          "/api/v1/evacuees/barangays"
        );
        setBarangays(data.data || []);
      } catch (e) {
        console.error("Error fetching barangays:", e);
      }
    };
    fetchBarangays();
  }, []);

  useEffect(() => {
    if (!isOpen || !centerId || shouldHideRoom) return; // 👈 added shouldHideRoom
    const fetchRooms = async () => {
      try {
        setRoomsLoading(true);
        setRoomsError(null);

        const res = await axios.get<{
          data: RoomOption[];
          all_full?: boolean;
        }>(`/api/v1/evacuees/${centerId}/rooms?only_available=1`);

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
  }, [isOpen, centerId, shouldHideRoom]);

  useEffect(() => {
    if (
      formData.searchEvacuationRoom &&
      !rooms.some(r => String(r.id) === formData.searchEvacuationRoom)
    ) {
      onFormChange("searchEvacuationRoom", "");
    }
  }, [rooms, formData.searchEvacuationRoom]);

  function mapRegisterError(err: any): string {
    const status = err?.response?.status;
    const msg = String(err?.response?.data?.message || err?.message || "");

    if (status === 409) return msg || "This evacuee is already registered.";

    if (
      msg.includes("Duplicate key") ||
      msg.includes("duplicate key value violates unique constraint") ||
      msg.includes("23505")
    ) {
      return "This evacuee already exists (same name + birthdate). Please search and reuse their record.";
    }

    if (msg.includes("sequence mismatch") || msg.includes("setval(")) {
      return "System ID sequence issue. Please contact the administrator.";
    }

    return "Couldn’t register the evacuee. Please try again.";
  }

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            // Clear errors when closing the modal
            setFieldErrors({});
            setErrorMsg(null);
            setShowBlockDialog(false);
            onClose();
          }
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
                      className={fieldErrors.firstName ? 'border-red-500' : ''}
                      required
                    />
                    {fieldErrors.firstName && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.firstName}</p>
                    )}
                  </div>

                  {/* Middle Name (optional) */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Middle Name:</label>
                    <Input
                      placeholder="Middle Name"
                      value={formData.middleName}
                      onChange={(e) => onFormChange("middleName", e.target.value)}
                      className={fieldErrors.middleName ? 'border-red-500' : ''}
                    />
                    {fieldErrors.middleName && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.middleName}</p>
                    )}
                  </div>

                  {/* Last Name * */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Last Name:<span className="text-red-500">*</span></label>
                    <Input
                      placeholder="Last Name"
                      value={formData.lastName}
                      onChange={(e) => onFormChange("lastName", e.target.value)}
                      className={fieldErrors.lastName ? 'border-red-500' : ''}
                      required
                    />
                    {fieldErrors.lastName && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.lastName}</p>
                    )}
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
                      <SelectTrigger className={`w-full ${fieldErrors.suffix ? 'border-red-500' : ''}`}>
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
                    {fieldErrors.suffix && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.suffix}</p>
                    )}
                  </div>

                  {/* Sex * */}
                  <div className="relative">
                    <label className="block text-sm font-medium mb-2">Sex:<span className="text-red-500">*</span></label>
                    <Select
                      value={formData.sex}
                      onValueChange={(v) => onFormChange("sex", v)}
                    >
                      <SelectTrigger className={`w-full ${fieldErrors.sex ? 'border-red-500' : ''}`}>
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
                    {fieldErrors.sex && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.sex}</p>
                    )}
                  </div>

                {/* Family Head Section - Only visible with create_family_information permission */}
                {formData.isFamilyHead === "No" && canCreateFamilyInformation && (
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

                  {/* Marital Status * */}
                  <div className="relative">
                    <label className="block text-sm font-medium mb-2">Marital Status:<span className="text-red-500">*</span></label>
                    <Select
                      value={formData.maritalStatus}
                      onValueChange={(v) => onFormChange("maritalStatus", v)}
                    >
                      <SelectTrigger className={`w-full ${fieldErrors.maritalStatus ? 'border-red-500' : ''}`}>
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
                    {fieldErrors.maritalStatus && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.maritalStatus}</p>
                    )}
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
                        className={`pl-10 pr-10 ${fieldErrors.birthday ? 'border-red-500' : ''}`}
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
                    {fieldErrors.birthday && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.birthday}</p>
                    )}
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
                      <SelectTrigger className={`w-full h-10 ${fieldErrors.educationalAttainment ? 'border-red-500' : ''}`}>
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
                    {fieldErrors.educationalAttainment && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.educationalAttainment}</p>
                    )}
                  </div>

                  {/* Occupation (optional) */}
                  <div>
                      <label className="block text-sm font-medium mb-2">Occupation:</label>
                    <Input
                      placeholder="Occupation"
                      value={formData.occupation}
                      onChange={(e) => onFormChange("occupation", e.target.value)}
                      className={fieldErrors.occupation ? 'border-red-500' : ''}
                    />
                    {fieldErrors.occupation && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.occupation}</p>
                    )}
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
                      className={fieldErrors.schoolOfOrigin ? 'border-red-500' : ''}
                    />
                    {fieldErrors.schoolOfOrigin && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.schoolOfOrigin}</p>
                    )}
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
                      <SelectTrigger className={`w-full ${fieldErrors.barangayOfOrigin ? 'border-red-500' : ''}`}>
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
                    {fieldErrors.barangayOfOrigin && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.barangayOfOrigin}</p>
                    )}
                  </div>

                  {/* Purok * */}
                  <div className="relative">
                    <label className="block text-sm font-medium mb-2">Purok:<span className="text-red-500">*</span></label>
                    <Select
                      value={formData.purok}
                      onValueChange={(v) => onFormChange("purok", v)}
                    >
                      <SelectTrigger className={`w-full ${fieldErrors.purok ? 'border-red-500' : ''}`}>
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
                    {fieldErrors.purok && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.purok}</p>
                    )}
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
                    {fieldErrors.isFamilyHead && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.isFamilyHead}</p>
                    )}
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
              <div>
                {centerId ? (
                  !shouldHideRoom ? (
                    <>
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
                          <SelectTrigger className={`w-full ${fieldErrors.searchEvacuationRoom ? 'border-red-500' : ''}`}>
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

                        {fieldErrors.searchEvacuationRoom && (
                          <p className="text-red-500 text-xs mt-1">{fieldErrors.searchEvacuationRoom}</p>
                        )}

                        {/* Optional helper when full */}
                        {!roomsLoading && !roomsError && allRoomsFull && (
                          <p className="mt-1 text-xs text-red-600">All rooms are full.</p>
                        )}
                      </div>
                    </>
                  ) : null
                ) : (
                  <div className="relative">
                    <label className="block text-sm font-medium mb-2">
                      Assign Evacuation<span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => setShowSearchEvacuationModal(true)}
                        className="border border-gray-300 rounded-md px-2 py-2 text-gray-500 text-sm cursor-pointer flex items-center gap-2 w-full"
                      >
                        <img src={searchIcon} alt="Search" className="w-4 h-4" />
                        {selectedEvacuation ? selectedEvacuation.name : "Search Evacuation"}
                      </button>
                      {selectedEvacuation && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvacuation(null);
                            onFormChange("disasterId", "");
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {/* Hidden input for HTML5 validation */}
                    <input
                      type="text"
                      value={selectedEvacuation ? selectedEvacuation.id.toString() : ""}
                      onChange={() => {}}
                      required
                      className="absolute inset-0 w-full h-10 opacity-0 pointer-events-none"
                      tabIndex={-1}
                    />
                  </div>
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
                  onClick={() => {
                    // Clear errors when cancelling
                    setFieldErrors({});
                    setErrorMsg(null);
                    setShowBlockDialog(false);
                    onClose();
                  }}
                  disabled={saving}
                  className="px-6 cursor-pointer"
                >
                  Cancel
                </Button>

                <Button
                  type="button"                 
                  onClick={() => {
                    handleClickSave();
                    console.log('clicked');
                  }}
                  
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

              {/* Inline message only when popup is not shown */}
              {errorMsg && !showBlockDialog && (
                <p role="alert" className="text-sm text-red-600 mt-2">
                  {errorMsg}
                </p>
              )}
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Popup shown outside the main Dialog */}
      {showBlockDialog && (
        <RegisterBlockDialog
          open={showBlockDialog}
          onOpenChange={(open: boolean) => {
            setShowBlockDialog(open);
            if (!open) setErrorMsg(null);
          }}
          message={errorMsg || "This evacuee is already registered."}
        />
      )}

      <SearchEvacuation
        isOpen={showSearchEvacuationModal}
        onClose={() => setShowSearchEvacuationModal(false)}
        disasterId={formData.disasterId}
        onSelectEvacuation={(evacuation) => {
          setSelectedEvacuation({ 
            id: evacuation.id, 
            name: evacuation.name,
            event_id: evacuation.event_id
          });
          onFormChange("centerId", evacuation.event_id?.toString() || "");
          setShowSearchEvacuationModal(false);
        }}
      />
    </>
  );
};
