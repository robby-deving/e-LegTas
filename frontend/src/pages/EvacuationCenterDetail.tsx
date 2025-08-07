// EvacuationCenterDetail.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Calendar, ArrowRight } from "lucide-react";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Pagination } from "../components/ui/pagination";
import { RegisteredFamiliesCard } from "../components/cards/RegisteredFamiliesCard";
import { RegisteredEvacueesCard } from "../components/cards/RegisteredEvacueesCard";
import { ECCapacityCard } from "../components/cards/ECCapacityCard";
import { EvacuationCenterNameCard } from "../components/cards/EvacuationCenterNameCard";
import EvacueeStatisticsChart from "../components/EvacueeStatisticsChart";
import { getTypeColor, getTagColor } from "@/constants/disasterTypeColors";
import { decodeId } from "@/utils/secureId";
import type { EvacuationCenterDetail, EvacueeStatistics, FamilyEvacueeInformation, RegisterEvacuee, Evacuee } from "@/types/EvacuationCenterDetails";
import { usePageTitle } from "../hooks/usePageTitle";
import { encodeId } from "@/utils/secureId";
import { formatDate } from "@/utils/dateFormatter";
import { FamilyDetailsModal } from "../components/modals/FamilyDetailsModal";
import { RegisterEvacueeModal } from "../components/modals/RegisterEvacueeModal";
import { SearchEvacueeModal } from "../components/modals/SearchEvacueeModal";
import { FamilyHeadSearchModal } from "../components/modals/FamilyHeadSearchModal";
import { differenceInYears } from 'date-fns';

export default function EvacuationCenterDetail() {
  const navigate = useNavigate();
  const { id: encodedDisasterId, disasterEvacuationEventId: encodedCenterId } = useParams();

  const disasterId = decodeId(encodedDisasterId!);
  const centerId = decodeId(encodedCenterId!);
  

  const [detail, setDetail] = useState<EvacuationCenterDetail | null>(null);

  const [statistics, setStatistics] = useState<EvacueeStatistics | null>(null);

  const [evacuees, setEvacuees] = useState<FamilyEvacueeInformation[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<FamilyEvacueeInformation | null>(null);
  
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedEvacuee, setSelectedEvacuee] = useState<any>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

const chartData = statistics
  ? [
      { label: "Males", value: statistics.summary.total_no_of_male },
      { label: "Females", value: statistics.summary.total_no_of_female },
      { label: "Infants (<1 yr)", value: statistics.summary.total_no_of_infant },
      { label: "Children (2–12 yrs)", value: statistics.summary.total_no_of_children },
      { label: "Youth (13–17 yrs)", value: statistics.summary.total_no_of_youth },
      { label: "Adults (18–59 yrs)", value: statistics.summary.total_no_of_adult },
      { label: "Senior Citizens (60+)", value: statistics.summary.total_no_of_seniors },
      { label: "PWD", value: statistics.summary.total_no_of_pwd },
      { label: "Pregnant Women", value: statistics.summary.total_no_of_pregnant },
      { label: "Lactating Women", value: statistics.summary.total_no_of_lactating_women },
    ]
  : [];

usePageTitle(detail?.evacuation_center?.evacuation_center_name ?? "Evacuation Center Detail");

useEffect(() => {
  console.log("✅ Decoded IDs:", { disasterId, centerId });

  if (!centerId || isNaN(Number(centerId))) {
    console.warn("❌ Invalid decoded centerId:", centerId);
    return;
  }

  const fetchDetails = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/api/v1/evacuees/${centerId}/details`);
      setDetail(res.data);
    } catch (err) {
      console.error("❌ Error fetching details:", err);
    }
  };

  const fetchStatistics = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/api/v1/evacuees/${centerId}/evacuee-statistics`);
      setStatistics(res.data);
    } catch (err) {
      console.error("❌ Error fetching statistics:", err);
    }
  };

  const fetchEvacuees = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/api/v1/evacuees/${centerId}/evacuees-information`);
      setEvacuees(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("❌ Error fetching evacuees:", err);
    }
  };

  fetchDetails();
  fetchStatistics();
  fetchEvacuees();
}, [centerId]);



const filteredEvacuees = Array.isArray(evacuees)
  ? evacuees.filter(evac =>
      evac.family_head_full_name.toLowerCase().includes(search.toLowerCase())
      || evac.barangay.toLowerCase().includes(search.toLowerCase())
    )
  : [];

  const totalRows = filteredEvacuees.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const paginatedEvacuees = filteredEvacuees.slice((page - 1) * rowsPerPage, page * rowsPerPage);

    // Add state for modal mode and form data
  const [evacueeModalOpen, setEvacueeModalOpen] = useState(false);
  const [evacueeModalMode, setEvacueeModalMode] = useState<'register' | 'edit'>('register');
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    sex: '',
    maritalStatus: '',
    birthday: '',
    educationalAttainment: '',
    schoolOfOrigin: '',
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
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showFamilyHeadSearchModal, setShowFamilyHeadSearchModal] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [familyHeadSearchTerm, setFamilyHeadSearchTerm] = useState("");
  const [familyHeadSearchResults, setFamilyHeadSearchResults] = useState<any[]>([]);

  // Edit button handler
const handleEditMember = (fullName: string) => {
  if (!selectedEvacuee) return;
  const member = selectedEvacuee.members.find((m: { fullName: string }) => m.fullName === fullName);
  if (member) {
    const nameParts = member.fullName.split(" ");
    const lastName = nameParts.pop() || '';
    const firstName = nameParts.shift() || '';
    const middleName = nameParts.join(" ") || '';

    const estimatedBirthday = member.birthdate || `${new Date().getFullYear() - member.age}-01-01`;

    setFormData({
      firstName,
      middleName,
      lastName,
      suffix: '',
      sex: member.sex || '',
      maritalStatus: '',
      birthday: estimatedBirthday,
      educationalAttainment: '',
      schoolOfOrigin: '',
      occupation: '',
      purok: selectedEvacuee.purok || '',
      barangayOfOrigin: member.barangayOfOrigin || '',
      isFamilyHead: selectedEvacuee.familyHead === member.fullName ? "Yes" : "No",
      familyHead: selectedEvacuee.familyHead,
      relationshipToFamilyHead: '',
      searchEvacuationRoom: selectedEvacuee.room || '',
      vulnerabilities: {
        pwd: member.vulnerability === "PWD",
        pregnant: member.vulnerability === "Pregnant",
        lactatingMother: member.vulnerability === "Lactating"
      }
    });
    setEvacueeModalMode('edit');
    setEvacueeModalOpen(true);
  }
};

  // Search modal logic
  const handleSearchNameClick = () => {
    setShowSearchModal(true);
    setSearchName("");
    setSearchResults([]);
  };
const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  setSearchName(value);

  if (value.trim() === '') {
    setSearchResults([]);
    return;
  }

  try {
    const res = await axios.get(`http://localhost:3000/api/v1/evacuees/search?name=${value}`);
    setSearchResults(res.data);
  } catch (err) {
    console.error("Error searching evacuees", err);
  }
};

  const handleFamilyHeadSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFamilyHeadSearchTerm(value);
    if (value.trim()) {
      const results = evacuees.filter(e =>
        e.family_head_full_name.toLowerCase().includes(value.toLowerCase())
      );
      setFamilyHeadSearchResults(results);
    } else {
      setFamilyHeadSearchResults([]);
    }
  };

  const handleFamilyHeadSelect = (evacuee: any) => {
    setFormData(prev => ({
      ...prev,
      familyHead: evacuee.familyHead,
      barangayOfOrigin: evacuee.barangay || '',
      purok: evacuee.purok || ''
    }));
    setShowFamilyHeadSearchModal(false);
  };

  const handleFamilyHeadSearchClick = () => {
    setFamilyHeadSearchTerm('');
    setFamilyHeadSearchResults([]);
    setShowFamilyHeadSearchModal(true);
  };
  const handleSelectEvacuee = (evacuee: any) => {
    const member = evacuee.members[0];
    const nameParts = member.fullName.split(" ");
    const lastName = nameParts.pop() || '';
    const firstName = nameParts.shift() || '';
    const middleName = nameParts.join(" ") || '';
    
    // Pre-fill the form with the selected evacuee's details
    setFormData({
      firstName: firstName,
      middleName: middleName,
      lastName: lastName,
      suffix: '',
      sex: member.sex || '',
      maritalStatus: '',
      birthday: '',
      educationalAttainment: '',
      schoolOfOrigin: '',
      occupation: '',
      purok: evacuee.purok || '',
      barangayOfOrigin: evacuee.barangay || '',
      isFamilyHead: 'Yes',
      familyHead: '',
      relationshipToFamilyHead: '',
      searchEvacuationRoom: evacuee.room || '',
      vulnerabilities: {
        pwd: member.vulnerability === "PWD",
        pregnant: member.vulnerability === "Pregnant",
        lactatingMother: member.vulnerability === "Lactating"
      }
    });
    
    // Close the search modal and open the registration form
    setShowSearchModal(false);
    setEvacueeModalOpen(true);
  };
  const handleManualRegister = () => {
    // Reset form data
    setFormData({
      firstName: '',
      middleName: '',
      lastName: '',
      suffix: '',
      sex: '',
      maritalStatus: '',
      birthday: '',
      educationalAttainment: '',
      schoolOfOrigin: '',
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
    // Close search modal and open registration form
    setShowSearchModal(false);
    setEvacueeModalOpen(true);
  };

  // Form field handlers
  const handleFormInputChange = (field: string, value: string) => {
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
  const handleEvacueeModalClose = () => {
    setEvacueeModalOpen(false);
  };
  const handleRegisterOrEdit = () => {
    // Save logic here
    setEvacueeModalOpen(false);
  };

const handleRegisterClick = () => {
  setEvacueeModalMode('register');
  // Show search modal first
  setShowSearchModal(true);
  setSearchName('');
  setSearchResults([]);
};


const handleRowClick = (evacueeId: number) => {
  const selected = paginatedEvacuees.find(e => e.id === evacueeId);
  if (selected) setSelectedFamily(selected);
};

  const handleCloseModal = () => {
    setSelectedEvacuee(null);
  };

function getVulnerabilityFlags(age: number) {
  return {
    is_infant: age < 1,
    is_children: age >= 1 && age <= 12,
    is_youth: age >= 13 && age <= 17,
    is_adult: age >= 18 && age <= 59,
    is_senior: age >= 60,
  };
}

const handleRegisterEvacuee = async () => {
  try {
    const birthdate = new Date(formData.birthday);
    const age = differenceInYears(new Date(), birthdate); // ✅ Calculate age once
    const vulnerabilityFlags = getVulnerabilityFlags(age); // ✅ Only calculate once here

    const payload: RegisterEvacuee = {
      first_name: formData.firstName,
      middle_name: formData.middleName,
      last_name: formData.lastName,
      suffix: formData.suffix || '',
      birthdate: formData.birthday,
      sex: formData.sex,
      barangay_of_origin: formData.barangayOfOrigin,
      marital_status: formData.maritalStatus,
      educational_attainment: formData.educationalAttainment,
      school_of_origin: formData.schoolOfOrigin || '',
      occupation: formData.occupation || '',
      purok: formData.purok || '',
      relationship_to_family_head: formData.relationshipToFamilyHead,
      family_head_id: formData.isFamilyHead === 'No' ? selectedFamily?.id : undefined,
      date_registered: new Date().toISOString(),

      // ✅ Spread flags from helper function
      ...vulnerabilityFlags,

      // ✅ These come from the form directly
      is_pwd: formData.vulnerabilities.pwd,
      is_pregnant: formData.vulnerabilities.pregnant,
      is_lactating: formData.vulnerabilities.lactatingMother,

      ec_rooms_id: parseInt(formData.searchEvacuationRoom),
      disaster_evacuation_event_id: centerId,
    };

    const response = await axios.post("http://localhost:3000/api/v1/evacuees", payload);

    console.log("✅ Evacuee Registered", response.data);
    setEvacueeModalOpen(false);
    // Optional: refresh evacuees or show success toast
  } catch (error) {
    console.error("❌ Error registering evacuee", error);
    // Optional: show error to user
  }
};

if (!detail || !statistics) return <div className="p-6">Loading...</div>;

  const disaster = {
  name: detail?.disaster?.disaster_name || "Unknown",
  type: detail?.disaster?.disaster_type_name || "Unknown",
  start: detail?.disaster?.disaster_start_date || "N/A",
};

  const centerName = detail.evacuation_center.evacuation_center_name;
  const centerBarangay = detail.evacuation_center.evacuation_center_barangay_name;
  const familiesCount = detail.evacuation_summary.total_no_of_family;
  const evacueesCount = detail.evacuation_summary.total_no_of_individuals;
  const capacityCount = detail.evacuation_summary.evacuation_center_capacity;

  return (
<div className="text-black p-6 space-y-6">
  {/* Header with Breadcrumb */}
  <div className="space-y-5">
    <h1 className="text-3xl font-bold text-green-800">Evacuation Information</h1>
    <div className="flex items-center text-sm text-gray-600">
      <button
        onClick={() => navigate("/evacuation-information")}
        className="hover:text-green-700 transition-colors cursor-pointer"
      >
        Disaster
      </button>
      <ChevronRight className="w-4 h-4 mx-2" />
      <button
        onClick={() => navigate(`/evacuation-information/${encodeId(disasterId)}`)}
        className="hover:text-green-700 transition-colors cursor-pointer"
      >
        {disaster?.name}
      </button>
      <ChevronRight className="w-4 h-4 mx-2" />
      {/* Highlight current page */}
      <span className="text-gray-900 font-semibold">{centerName}</span>
    </div>
  </div>

  {/* Disaster Information Card */}
  <div className="py-3">
    <div className="space-y-3">
      <div
        className={`inline-block rounded px-3 py-1 text-sm font-semibold ${getTagColor(
          disaster.type
        )}`}
      >
        {disaster.type}
      </div>
      <h2 className={`text-3xl font-bold ${getTypeColor(disaster.type)}`}>
        {disaster.name}
      </h2>
      {detail?.disaster?.disaster_start_date && (
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="w-4 h-4" />
          <span className="text-sm">
            {formatDate(detail.disaster.disaster_start_date)}
          </span>
        </div>
      )}
    </div>
  </div>


      {/* Center Summary & Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="md:col-span-1">
          <EvacuationCenterNameCard name={centerName} barangay={centerBarangay} />
          <div className="flex flex-col gap-6 mt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RegisteredFamiliesCard count={familiesCount} />
              <RegisteredEvacueesCard count={evacueesCount} />
              <ECCapacityCard count={capacityCount} />
            </div>
          </div>
        </div>
        <Card className="md:col-span-1 shadow-sm border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold leading-tight mb-0">Evacuees Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <EvacueeStatisticsChart data={chartData} />
          </CardContent>
        </Card>
      </div>

      {/* Registered Evacuees Table */}
      <div className="py-1">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold">
              Registered Evacuees
              <span className="ml-2 text-md text-muted-foreground">(per Family)</span>
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
            <div className="w-full max-w-xs">
              <Input
                placeholder="Search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full border-border"
              />
            </div>
            <Button
              className="bg-green-700 hover:bg-green-800 text-white px-6 flex gap-2 items-center cursor-pointer self-start sm:self-auto"
              onClick={handleRegisterClick}
            >
              <span className="text-lg">+</span> Register Evacuee
            </Button>
          </div>

          <div className="rounded-md border border-input">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="text-left font-semibold">Family Head</TableHead>
                  <TableHead className="text-left font-semibold">Barangay</TableHead>
                  <TableHead className="text-left font-semibold">Total Individuals</TableHead>
                  <TableHead className="text-left font-semibold">Room Name</TableHead>
                  <TableHead className="text-left font-semibold">Decampment</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEvacuees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No results.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEvacuees.map((evac, idx) => (
                    <TableRow
                      key={idx}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleRowClick(evac.id)}
                    >
                      <TableCell className="text-foreground font-medium">{evac.family_head_full_name}</TableCell>
                      <TableCell className="text-foreground">{evac.barangay}</TableCell>
                      <TableCell className="text-foreground">{evac.total_individuals.toLocaleString()}</TableCell>
                      <TableCell className="text-foreground">{evac.room_name}</TableCell>
                      <TableCell className="text-foreground">{evac.decampment_timestamp || "—"}</TableCell>
                      <TableCell className="flex justify-end items-center text-foreground">
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1 text-sm text-muted-foreground">
              {paginatedEvacuees.length} of {totalRows} row(s) shown.
            </div>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              rowsPerPage={rowsPerPage}
              totalRows={totalRows}
              onRowsPerPageChange={value => setRowsPerPage(Number(value))}
            />
          </div>

<FamilyDetailsModal
  isOpen={!!selectedFamily}
  onClose={handleCloseModal}
  evacuee={selectedFamily}
  centerName={selectedFamily?.view_family?.evacuation_center_name || ""}
  onEditMember={handleEditMember}
/>


<RegisterEvacueeModal
  isOpen={evacueeModalOpen}
  onClose={handleEvacueeModalClose}
  mode={evacueeModalMode}
  formData={formData}
  onFormChange={handleFormInputChange}
  onVulnerabilityChange={handleVulnerabilityChange}
  onSave={handleRegisterOrEdit}
  onFamilyHeadSearch={handleFamilyHeadSearchClick}
/>

<SearchEvacueeModal
  isOpen={showSearchModal}
  onClose={() => setShowSearchModal(false)}
  searchName={searchName}
  onSearchChange={handleSearchChange}
  searchResults={searchResults}
  onSelectEvacuee={handleSelectEvacuee}
  onManualRegister={handleManualRegister}
/>
            <FamilyHeadSearchModal
              isOpen={showFamilyHeadSearchModal}
              onClose={() => setShowFamilyHeadSearchModal(false)}
              searchTerm={familyHeadSearchTerm}
              onSearchChange={handleFamilyHeadSearchChange}
              searchResults={familyHeadSearchResults}
              onSelectFamilyHead={handleFamilyHeadSelect}
          />
        </div>
      </div>
    </div>
  );
}