//RegisterEvacueeModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Calendar, X as XIcon } from "lucide-react";
import axios from "axios";
import { useState, useEffect } from "react";
import type { Barangay } from '@/types/EvacuationCenterDetails';



export const RegisterEvacueeModal = ({
  isOpen,
  onClose,
  mode,
  formData,
  onFormChange,
  onVulnerabilityChange,
  onSave,
  onFamilyHeadSearch
}: any) => {
  if (!isOpen) return null;

const [barangays, setBarangays] = useState<Barangay[]>([]);


  useEffect(() => {
    const fetchBarangays = async () => {
      try {
      const response = await axios.get<{ data: Barangay[] }>("http://localhost:3000/api/v1/barangays");
      setBarangays(response.data.data);
      } catch (error) {
        console.error("Error fetching barangays:", error);
      }
    };

    fetchBarangays();
  }, []);
  

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle className="text-green-700 text-xl font-bold">{mode === 'register' ? 'Register Evacuee' : 'Edit Evacuee'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-8">
          {/* Personal Information Section */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium mb-2">First Name:</label>
                <Input
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={e => onFormChange('firstName', e.target.value)}
                  className="w-full"
                />
              </div>
              {/* Middle Name */}
              <div>
                <label className="block text-sm font-medium mb-2">Middle Name:</label>
                <Input
                  placeholder="Middle Name"
                  value={formData.middleName}
                  onChange={e => onFormChange('middleName', e.target.value)}
                  className="w-full"
                />
              </div>
              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium mb-2">Last Name:</label>
                <Input
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={e => onFormChange('lastName', e.target.value)}
                  className="w-full"
                />
              </div>
              {/* Suffix */}
              <div>
                <label className="block text-sm font-medium mb-2">Suffix:</label>
                <Select value={formData.suffix} onValueChange={value => onFormChange('suffix', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Jr.">Jr.</SelectItem>
                    <SelectItem value="Sr.">Sr.</SelectItem>
                    <SelectItem value="II">II</SelectItem>
                    <SelectItem value="III">III</SelectItem>
                    <SelectItem value="IV">IV</SelectItem>
                    <SelectItem value="V">V</SelectItem>
                    {/* Add more suffix options as per your needs */}
                  </SelectContent>
                </Select>
              </div>
              {/* Sex */}
              <div>
                <label className="block text-sm font-medium mb-2">Sex:</label>
                <Select value={formData.sex} onValueChange={value => onFormChange('sex', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Marital Status */}
              <div>
                <label className="block text-sm font-medium mb-2">Marital Status:</label>
                <Select value={formData.maritalStatus} onValueChange={value => onFormChange('maritalStatus', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                    <SelectItem value="Divorced">Divorced</SelectItem>
                    <SelectItem value="Widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Birthday */}
              <div>
                <label className="block text-sm font-medium mb-2">Birthday:</label>
                <div className="relative">
                  <Input
                    type="date"
                    value={formData.birthday}
                    onChange={e => onFormChange('birthday', e.target.value)}
                    className="w-full"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
          {/* Address and Family Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400">Address and Family Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Barangay of Origin */}
              <div>
                <label className="block text-sm font-medium mb-2">Barangay of Origin:</label>
                <Select value={formData.barangayOfOrigin} onValueChange={value => onFormChange('barangayOfOrigin', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Barangay" />
                  </SelectTrigger>
                  <SelectContent>
                    {barangays.map((barangay) => (
                      <SelectItem key={barangay.id} value={barangay.name}>{barangay.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Purok */}
              <div>
                <label className="block text-sm font-medium mb-2">Purok:</label>
                <Select value={formData.purok} onValueChange={value => onFormChange('purok', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Purok" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    {/* Add more Purok options */}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          {/* Family Head and Vulnerability Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Is Family Head?</label>
                <RadioGroup
                  defaultValue={formData.isFamilyHead}
                  onValueChange={value => onFormChange('isFamilyHead', value)}
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
              {formData.isFamilyHead === 'No' && (
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
                            onFormChange('familyHead', '');
                            onFormChange('relationshipToFamilyHead', '');
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
                    <Select value={formData.relationshipToFamilyHead} onValueChange={value => onFormChange('relationshipToFamilyHead', value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Relationship to Family Head" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Spouse">Spouse</SelectItem>
                        <SelectItem value="Child">Child</SelectItem>
                        <SelectItem value="Parent">Parent</SelectItem>
                        <SelectItem value="Sibling">Sibling</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
            {/* Search Evacuation Room */}
            <div>
              <label className="block text-sm font-medium mb-2">Search Evacuation Room:</label>
              <Input
                placeholder="Room Number"
                value={formData.searchEvacuationRoom}
                onChange={e => onFormChange('searchEvacuationRoom', e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          {/* Vulnerability Classification Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400">Vulnerability Classification</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="pwd"
                  checked={formData.vulnerabilities.pwd}
                  onCheckedChange={checked => onVulnerabilityChange('pwd', checked as boolean)}
                />
                <label htmlFor="pwd" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Person with Disability (PWD)
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="pregnant"
                  checked={formData.vulnerabilities.pregnant}
                  onCheckedChange={checked => onVulnerabilityChange('pregnant', checked as boolean)}
                />
                <label htmlFor="pregnant" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Pregnant
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="lactating"
                  checked={formData.vulnerabilities.lactatingMother}
                  onCheckedChange={checked => onVulnerabilityChange('lactatingMother', checked as boolean)}
                />
                <label htmlFor="lactating" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
              onClick={onSave}
              className="bg-green-700 hover:bg-green-800 text-white px-6 cursor-pointer"
            >
              {mode === 'register' ? 'Register' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
