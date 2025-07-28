import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Search, Calendar } from "lucide-react";
import { Input } from "../components/ui/input";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Checkbox } from "../components/ui/checkbox";
import { Button } from "../components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { usePageTitle } from "../hooks/usePageTitle";
import "../styles/hide-date-icon.css";

export default function RegisterEvacuee() {
  usePageTitle('Register Evacuee');
  const navigate = useNavigate();
  const { disasterName, centerName } = useParams<{ disasterName?: string; centerName?: string }>();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    sex: '',
    maritalStatus: '',
    birthday: '',
    educationalAttainment: '',
    occupation: '',
    purok: '',
    barangayOfOrigin: '',
    isFamilyHead: 'Yes',
    familyHead: '',
    relationshipToFamilyHead: '',
    searchEvacuationRoom: '',
    vulnerabilities: {
      pwd: false,
      pregnant: false,
      lactatingMother: false
    }
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVulnerabilityChange = (vulnerability: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      vulnerabilities: {
        ...prev.vulnerabilities,
        [vulnerability]: checked
      }
    }));
  };

  const handleRegister = () => {
    console.log('Registering evacuee:', formData);
    // Navigate back to evacuation center detail
    navigate(`/evacuation-information/${disasterName}/${centerName}`);
  };

  const handleCancel = () => {
    navigate(`/evacuation-information/${disasterName}/${centerName}`);
  };

  return (
    <div className="text-black p-6 space-y-6">
      {/* Header with Breadcrumb */}
      <div className="space-y-5">
        <h1 className="text-3xl font-bold text-green-800">Evacuation Information</h1>
        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-gray-600">
          <button
            onClick={() => navigate("/evacuation-information")}
            className="hover:text-green-700 font-bold transition-colors cursor-pointer"
          >
            Disaster
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <button
            onClick={() => navigate(`/evacuation-information/${disasterName}`)}
            className="hover:text-green-700 font-semibold transition-colors cursor-pointer text-gray-900"
          >
            {disasterName}
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <button
            onClick={() => navigate(`/evacuation-information/${disasterName}/${centerName}`)}
            className="hover:text-green-700 font-semibold transition-colors cursor-pointer text-gray-900"
          >
            {decodeURIComponent(centerName || "")}
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-gray-900 font-normal">Register Evacuee</span>
        </div>
      </div>

      {/* Main Form Section */}
      <div className="w-full mx-auto pt-6">
        <h2 className="text-2xl font-bold text-green-800 mb-6">Register Evacuee</h2>
        <div className="pb-4">
          <h1 className="text-sm font-medium text-gray-400">Personal Information</h1>
        </div>
        <div className="space-y-8">
          {/* Personal Information Section */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">First Name:</label>
                <Input
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Middle Name:</label>
                <Input
                  placeholder="Last Name"
                  value={formData.middleName}
                  onChange={(e) => handleInputChange('middleName', e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Last Name:</label>
                <Input
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Suffix:</label>
                <Input
                  placeholder="Suffix"
                  value={formData.suffix}
                  onChange={(e) => handleInputChange('suffix', e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Sex:</label>
                <Select value={formData.sex} onValueChange={(value) => handleInputChange('sex', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Marital Status:</label>
                <Select value={formData.maritalStatus} onValueChange={(value) => handleInputChange('maritalStatus', value)}>
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
              <div>
                <label className="block text-sm font-medium mb-2">Birthday:</label>
                <div className="relative">
                  <Input
                    type="date"
                    placeholder="MM/DD/YYYY"
                    value={formData.birthday}
                    onChange={(e) => handleInputChange('birthday', e.target.value)}
                    className="w-full hide-date-icon"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Educational Attainment:</label>
                <Select value={formData.educationalAttainment} onValueChange={(value) => handleInputChange('educationalAttainment', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Elementary">Elementary</SelectItem>
                    <SelectItem value="High School">High School</SelectItem>
                    <SelectItem value="College">College</SelectItem>
                    <SelectItem value="Vocational">Vocational</SelectItem>
                    <SelectItem value="Graduate">Graduate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Occupation:</label>
                <Input
                  placeholder="Occupation"
                  value={formData.occupation}
                  onChange={(e) => handleInputChange('occupation', e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Address and Family Details Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400">Address and Family Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Purok:</label>
                <Input
                  placeholder="Purok"
                  value={formData.purok}
                  onChange={(e) => handleInputChange('purok', e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Barangay of Origin:</label>
                <Select value={formData.barangayOfOrigin} onValueChange={(value) => handleInputChange('barangayOfOrigin', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bgy. 1 - Em's Barrio">Bgy. 1 - Em's Barrio</SelectItem>
                    <SelectItem value="Bgy. 1 - Oro Site">Bgy. 1 - Oro Site</SelectItem>
                    <SelectItem value="Bgy. 2 - Bogtong">Bgy. 2 - Bogtong</SelectItem>
                    <SelectItem value="Bgy. 3 - Sabang">Bgy. 3 - Sabang</SelectItem>
                    <SelectItem value="Bgy. 4 - Rawis">Bgy. 4 - Rawis</SelectItem>
                    <SelectItem value="Bgy. 5 - Taysan">Bgy. 5 - Taysan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Is Family Head?</label>
                  <RadioGroup
                    defaultValue={formData.isFamilyHead}
                    onValueChange={(value: string) => handleInputChange('isFamilyHead', value)}
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
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        onClick={() => {}}
                      >
                        <Search className="mr-2 h-4 w-4" />
                        Search
                      </Button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Relationship to Family Head:</label>
                      <Select value={formData.relationshipToFamilyHead} onValueChange={(value) => handleInputChange('relationshipToFamilyHead', value)}>
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

              <div>
                <label className="block text-sm font-medium mb-2">Search Evacuation Room:</label>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  onClick={() => {}}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
              </div>
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
                  onCheckedChange={(checked) => handleVulnerabilityChange('pwd', checked as boolean)}
                />
                <label htmlFor="pwd" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Person with Disability (PWD)
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="pregnant"
                  checked={formData.vulnerabilities.pregnant}
                  onCheckedChange={(checked) => handleVulnerabilityChange('pregnant', checked as boolean)}
                />
                <label htmlFor="pregnant" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Pregnant
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="lactating"
                  checked={formData.vulnerabilities.lactatingMother}
                  onCheckedChange={(checked) => handleVulnerabilityChange('lactatingMother', checked as boolean)}
                />
                <label htmlFor="lactating" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Lactating Mother
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="px-6 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRegister}
              className="bg-green-700 hover:bg-green-800 text-white px-6 cursor-pointer"
            >
              Register
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}