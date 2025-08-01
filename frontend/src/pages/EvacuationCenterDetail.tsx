import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { RegisteredFamiliesCard } from "../components/cards/RegisteredFamiliesCard";
import { RegisteredEvacueesCard } from "../components/cards/RegisteredEvacueesCard";
import { ECCapacityCard } from "../components/cards/ECCapacityCard";
import { EvacuationCenterNameCard } from "../components/cards/EvacuationCenterNameCard";
import { FamilyDetailsModal } from "../components/modals/FamilyDetailsModal";
import { RegisterEvacueeModal } from "../components/modals/RegisterEvacueeModal";
import { SearchEvacueeModal } from "../components/modals/SearchEvacueeModal";
import { FamilyHeadSearchModal } from "../components/modals/FamilyHeadSearchModal";
import { usePageTitle } from "../hooks/usePageTitle";
import { Pagination } from "../components/ui/pagination";
import { ChevronRight, Calendar, ArrowRight } from "lucide-react";
import EvacueeStatisticsChart from "../components/EvacueeStatisticsChart";

const DISASTER_TYPE_COLORS = {
  Typhoon: { typeColor: "text-sky-500", tagColor: "bg-sky-100 text-sky-600" },
  "Tropical Storm": { typeColor: "text-sky-400", tagColor: "bg-sky-100 text-sky-600" },
  "Volcanic Eruption": { typeColor: "text-orange-600", tagColor: "bg-orange-100 text-orange-600" },
  Landslide: { typeColor: "text-yellow-600", tagColor: "bg-yellow-100 text-yellow-600" },
};

const mockStatistics = [
  { label: "Male", value: 120000 },
  { label: "Female", value: 100000 },
  { label: "Infant (<1 yr)", value: 5000 },
  { label: "Children (2-12 yrs)", value: 20000 },
  { label: "Youth (13-17 yrs)", value: 35000 },
  { label: "Adult (18-59 yrs)", value: 110000 },
  { label: "Senior Citizens (60+)", value: 20000 },
  { label: "PWD", value: 7000 },
  { label: "Pregnant Women", value: 3000 },
  { label: "Lactating Women", value: 2000 },
];

const mockEvacuees = [
  { 
    id: 1, 
    familyHead: "Juan dela Cruz", 
    barangay: "Bgy. 1 - Oro Site", 
    individuals: 6, 
    room: "A1", 
    decampment: "6/2/2025 8:00am", 
    members: [
      { fullName: "Juan dela Cruz", age: 45, barangayOfOrigin: "Bgy. 1 - Oro Site", sex: "Male", vulnerability: "None", timeOfArrival: "6/2/2025 8:00am" },
      { fullName: "Maria dela Cruz", age: 42, barangayOfOrigin: "Bgy. 1 - Oro Site", sex: "Female", vulnerability: "None", timeOfArrival: "6/2/2025 8:00am" },
      { fullName: "Pedro dela Cruz", age: 15, barangayOfOrigin: "Bgy. 1 - Oro Site", sex: "Male", vulnerability: "Youth", timeOfArrival: "6/2/2025 8:00am" },
      { fullName: "Ana dela Cruz", age: 12, barangayOfOrigin: "Bgy. 1 - Oro Site", sex: "Female", vulnerability: "Children", timeOfArrival: "6/2/2025 8:00am" },
      { fullName: "Jose dela Cruz", age: 8, barangayOfOrigin: "Bgy. 1 - Oro Site", sex: "Male", vulnerability: "Children", timeOfArrival: "6/2/2025 8:00am" },
      { fullName: "Lita dela Cruz", age: 5, barangayOfOrigin: "Bgy. 1 - Oro Site", sex: "Female", vulnerability: "Children", timeOfArrival: "6/2/2025 8:00am" },
    ] 
  },
  { 
    id: 2, 
    familyHead: "Juan Tamad", 
    barangay: "Bgy. 2 - Bogtong", 
    individuals: 4, 
    room: "A2", 
    decampment: "6/2/2025 9:30am", 
    members: [
      { fullName: "Juan Tamad", age: 35, barangayOfOrigin: "Bgy. 2 - Bogtong", sex: "Male", vulnerability: "None", timeOfArrival: "6/2/2025 9:30am" },
      { fullName: "Lita Tamad", age: 33, barangayOfOrigin: "Bgy. 2 - Bogtong", sex: "Female", vulnerability: "None", timeOfArrival: "6/2/2025 9:30am" },
      { fullName: "Ramon Tamad", age: 10, barangayOfOrigin: "Bgy. 2 - Bogtong", sex: "Male", vulnerability: "Children", timeOfArrival: "6/2/2025 9:30am" },
      { fullName: "Sita Tamad", age: 7, barangayOfOrigin: "Bgy. 2 - Bogtong", sex: "Female", vulnerability: "Children", timeOfArrival: "6/2/2025 9:30am" },
    ] 
  },
  { 
    id: 3, 
    familyHead: "Juan Twothree", 
    barangay: "Bgy. 3 - Sabang", 
    individuals: 5, 
    room: "A3", 
    decampment: "6/2/2025 10:00am", 
    members: [
      { fullName: "Juan Twothree", age: 50, barangayOfOrigin: "Bgy. 3 - Sabang", sex: "Male", vulnerability: "None", timeOfArrival: "6/2/2025 10:00am" },
      { fullName: "Ana Twothree", age: 48, barangayOfOrigin: "Bgy. 3 - Sabang", sex: "Female", vulnerability: "None", timeOfArrival: "6/2/2025 10:00am" },
      { fullName: "Luis Twothree", age: 20, barangayOfOrigin: "Bgy. 3 - Sabang", sex: "Male", vulnerability: "Adult", timeOfArrival: "6/2/2025 10:00am" },
      { fullName: "Mila Twothree", age: 17, barangayOfOrigin: "Bgy. 3 - Sabang", sex: "Female", vulnerability: "Youth", timeOfArrival: "6/2/2025 10:00am" },
      { fullName: "Tina Twothree", age: 3, barangayOfOrigin: "Bgy. 3 - Sabang", sex: "Female", vulnerability: "Children", timeOfArrival: "6/2/2025 10:00am" },
    ] 
  },
  { 
    id: 4, 
    familyHead: "Pedro Santos", 
    barangay: "Bgy. 4 - Poblacion", 
    individuals: 7, 
    room: "A4", 
    decampment: "6/2/2025 11:00am", 
    members: [
      { fullName: "Pedro Santos", age: 55, barangayOfOrigin: "Bgy. 4 - Poblacion", sex: "Male", vulnerability: "None", timeOfArrival: "6/2/2025 11:00am" },
      { fullName: "Carmen Santos", age: 53, barangayOfOrigin: "Bgy. 4 - Poblacion", sex: "Female", vulnerability: "None", timeOfArrival: "6/2/2025 11:00am" },
      { fullName: "Raul Santos", age: 25, barangayOfOrigin: "Bgy. 4 - Poblacion", sex: "Male", vulnerability: "Adult", timeOfArrival: "6/2/2025 11:00am" },
      { fullName: "Elena Santos", age: 22, barangayOfOrigin: "Bgy. 4 - Poblacion", sex: "Female", vulnerability: "Adult", timeOfArrival: "6/2/2025 11:00am" },
      { fullName: "Mario Santos", age: 15, barangayOfOrigin: "Bgy. 4 - Poblacion", sex: "Male", vulnerability: "Youth", timeOfArrival: "6/2/2025 11:00am" },
      { fullName: "Lina Santos", age: 10, barangayOfOrigin: "Bgy. 4 - Poblacion", sex: "Female", vulnerability: "Children", timeOfArrival: "6/2/2025 11:00am" },
      { fullName: "Nico Santos", age: 2, barangayOfOrigin: "Bgy. 4 - Poblacion", sex: "Male", vulnerability: "Infant", timeOfArrival: "6/2/2025 11:00am" },
    ] 
  },
  { 
    id: 5, 
    familyHead: "Maria Garcia", 
    barangay: "Bgy. 5 - Centro", 
    individuals: 3, 
    room: "A5", 
    decampment: "6/2/2025 12:00pm", 
    members: [
      { fullName: "Maria Garcia", age: 40, barangayOfOrigin: "Bgy. 5 - Centro", sex: "Female", vulnerability: "None", timeOfArrival: "6/2/2025 12:00pm" },
      { fullName: "Jose Garcia", age: 38, barangayOfOrigin: "Bgy. 5 - Centro", sex: "Male", vulnerability: "None", timeOfArrival: "6/2/2025 12:00pm" },
      { fullName: "Lola Garcia", age: 65, barangayOfOrigin: "Bgy. 5 - Centro", sex: "Female", vulnerability: "Senior", timeOfArrival: "6/2/2025 12:00pm" },
    ] 
  },
  { 
    id: 6, 
    familyHead: "Antonio Reyes", 
    barangay: "Bgy. 6 - Bayan", 
    individuals: 8, 
    room: "A6", 
    decampment: "6/2/2025 1:00pm", 
    members: [
      { fullName: "Antonio Reyes", age: 60, barangayOfOrigin: "Bgy. 6 - Bayan", sex: "Male", vulnerability: "Senior", timeOfArrival: "6/2/2025 1:00pm" },
      { fullName: "Beatriz Reyes", age: 58, barangayOfOrigin: "Bgy. 6 - Bayan", sex: "Female", vulnerability: "Senior", timeOfArrival: "6/2/2025 1:00pm" },
      { fullName: "Carlos Reyes", age: 30, barangayOfOrigin: "Bgy. 6 - Bayan", sex: "Male", vulnerability: "Adult", timeOfArrival: "6/2/2025 1:00pm" },
      { fullName: "Dina Reyes", age: 28, barangayOfOrigin: "Bgy. 6 - Bayan", sex: "Female", vulnerability: "Adult", timeOfArrival: "6/2/2025 1:00pm" },
      { fullName: "Eduardo Reyes", age: 12, barangayOfOrigin: "Bgy. 6 - Bayan", sex: "Male", vulnerability: "Children", timeOfArrival: "6/2/2025 1:00pm" },
      { fullName: "Fiona Reyes", age: 9, barangayOfOrigin: "Bgy. 6 - Bayan", sex: "Female", vulnerability: "Children", timeOfArrival: "6/2/2025 1:00pm" },
      { fullName: "Gina Reyes", age: 5, barangayOfOrigin: "Bgy. 6 - Bayan", sex: "Female", vulnerability: "Children", timeOfArrival: "6/2/2025 1:00pm" },
      { fullName: "Hector Reyes", age: 2, barangayOfOrigin: "Bgy. 6 - Bayan", sex: "Male", vulnerability: "Infant", timeOfArrival: "6/2/2025 1:00pm" },
    ] 
  },
  { 
    id: 7, 
    familyHead: "Lucia Mendoza", 
    barangay: "Bgy. 7 - Hilltop", 
    individuals: 2, 
    room: "A7", 
    decampment: "6/2/2025 2:00pm", 
    members: [
      { fullName: "Lucia Mendoza", age: 35, barangayOfOrigin: "Bgy. 7 - Hilltop", sex: "Female", vulnerability: "Pregnant", timeOfArrival: "6/2/2025 2:00pm" },
      { fullName: "Miguel Mendoza", age: 37, barangayOfOrigin: "Bgy. 7 - Hilltop", sex: "Male", vulnerability: "None", timeOfArrival: "6/2/2025 2:00pm" },
    ] 
  },
  { 
    id: 8, 
    familyHead: "Rosa Lim", 
    barangay: "Bgy. 8 - Riverside", 
    individuals: 10, 
    room: "A8", 
    decampment: "6/2/2025 3:00pm", 
    members: [
      { fullName: "Rosa Lim", age: 45, barangayOfOrigin: "Bgy. 8 - Riverside", sex: "Female", vulnerability: "None", timeOfArrival: "6/2/2025 3:00pm" },
      { fullName: "Victor Lim", age: 47, barangayOfOrigin: "Bgy. 8 - Riverside", sex: "Male", vulnerability: "None", timeOfArrival: "6/2/2025 3:00pm" },
      { fullName: "Sofia Lim", age: 20, barangayOfOrigin: "Bgy. 8 - Riverside", sex: "Female", vulnerability: "Adult", timeOfArrival: "6/2/2025 3:00pm" },
      { fullName: "Tomas Lim", age: 18, barangayOfOrigin: "Bgy. 8 - Riverside", sex: "Male", vulnerability: "Youth", timeOfArrival: "6/2/2025 3:00pm" },
      { fullName: "Ursula Lim", age: 15, barangayOfOrigin: "Bgy. 8 - Riverside", sex: "Female", vulnerability: "Youth", timeOfArrival: "6/2/2025 3:00pm" },
      { fullName: "Vince Lim", age: 12, barangayOfOrigin: "Bgy. 8 - Riverside", sex: "Male", vulnerability: "Children", timeOfArrival: "6/2/2025 3:00pm" },
      { fullName: "Wendy Lim", age: 9, barangayOfOrigin: "Bgy. 8 - Riverside", sex: "Female", vulnerability: "Children", timeOfArrival: "6/2/2025 3:00pm" },
      { fullName: "Xander Lim", age: 6, barangayOfOrigin: "Bgy. 8 - Riverside", sex: "Male", vulnerability: "Children", timeOfArrival: "6/2/2025 3:00pm" },
      { fullName: "Yvonne Lim", age: 3, barangayOfOrigin: "Bgy. 8 - Riverside", sex: "Female", vulnerability: "Children", timeOfArrival: "6/2/2025 3:00pm" },
      { fullName: "Zack Lim", age: 1, barangayOfOrigin: "Bgy. 8 - Riverside", sex: "Male", vulnerability: "Infant", timeOfArrival: "6/2/2025 3:00pm" },
    ] 
  },
  { 
    id: 9, 
    familyHead: "Carlos Lopez", 
    barangay: "Bgy. 9 - Valley", 
    individuals: 6, 
    room: "A9", 
    decampment: "6/2/2025 4:00pm", 
    members: [
      { fullName: "Carlos Lopez", age: 50, barangayOfOrigin: "Bgy. 9 - Valley", sex: "Male", vulnerability: "None", timeOfArrival: "6/2/2025 4:00pm" },
      { fullName: "Isabel Lopez", age: 48, barangayOfOrigin: "Bgy. 9 - Valley", sex: "Female", vulnerability: "None", timeOfArrival: "6/2/2025 4:00pm" },
      { fullName: "Hugo Lopez", age: 22, barangayOfOrigin: "Bgy. 9 - Valley", sex: "Male", vulnerability: "Adult", timeOfArrival: "6/2/2025 4:00pm" },
      { fullName: "Irma Lopez", age: 19, barangayOfOrigin: "Bgy. 9 - Valley", sex: "Female", vulnerability: "Youth", timeOfArrival: "6/2/2025 4:00pm" },
      { fullName: "Javier Lopez", age: 10, barangayOfOrigin: "Bgy. 9 - Valley", sex: "Male", vulnerability: "Children", timeOfArrival: "6/2/2025 4:00pm" },
      { fullName: "Karla Lopez", age: 5, barangayOfOrigin: "Bgy. 9 - Valley", sex: "Female", vulnerability: "Children", timeOfArrival: "6/2/2025 4:00pm" },
    ] 
  },
  { 
    id: 10, 
    familyHead: "Elena Torres", 
    barangay: "Bgy. 10 - Plains", 
    individuals: 4, 
    room: "A10", 
    decampment: "6/2/2025 5:00pm", 
    members: [
      { fullName: "Elena Torres", age: 38, barangayOfOrigin: "Bgy. 10 - Plains", sex: "Female", vulnerability: "None", timeOfArrival: "6/2/2025 5:00pm" },
      { fullName: "Fernando Torres", age: 40, barangayOfOrigin: "Bgy. 10 - Plains", sex: "Male", vulnerability: "None", timeOfArrival: "6/2/2025 5:00pm" },
      { fullName: "Gina Torres", age: 14, barangayOfOrigin: "Bgy. 10 - Plains", sex: "Female", vulnerability: "Youth", timeOfArrival: "6/2/2025 5:00pm" },
      { fullName: "Hector Torres", age: 11, barangayOfOrigin: "Bgy. 10 - Plains", sex: "Male", vulnerability: "Children", timeOfArrival: "6/2/2025 5:00pm" },
    ] 
  },
];

import { DISASTERS, EVACUATION_CENTERS } from "./DisasterDetail";

export default function EvacuationCenterDetail() {
  usePageTitle('Evacuation Center Detail');
  const navigate = useNavigate();
  const { disasterName, centerName: centerParam } = useParams<{ disasterName?: string; centerName?: string }>();
  const centerName = decodeURIComponent(centerParam || "");
  const center = EVACUATION_CENTERS.find(c => c.name === centerName);

  if (!center) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-xl font-bold">Evacuation Center Not Found</h1>
        <p>The requested evacuation center "{centerName}" could not be found.</p>
      </div>
    );
  }

  const centerBarangay = center.barangay;
  const familiesCount = parseInt(center.totalFamilies.split(' ')[0] || "0");
  const evacueesCount = parseInt(center.totalEvacuees.split(' ')[0] || "0");
  const capacityCount = parseInt(center.totalFamilies.split('/')[1] || '0');

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedEvacuee, setSelectedEvacuee] = useState<any>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const filteredEvacuees = mockEvacuees.filter(e =>
    e.familyHead.toLowerCase().includes(search.toLowerCase()) ||
    e.barangay.toLowerCase().includes(search.toLowerCase())
  );

  const totalRows = filteredEvacuees.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const paginatedEvacuees = filteredEvacuees.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  useEffect(() => { 
    setPage(1); 
  }, [search, rowsPerPage]);

  const disaster = DISASTERS.find(
    (d) => d.name.toLowerCase() === (disasterName || '').toLowerCase()
  );

  const handleRowClick = (evacueeId: number) => {
    const evacuee = mockEvacuees.find(e => e.id === evacueeId);
    setSelectedEvacuee(evacuee || null);
  };

  const handleCloseModal = () => {
    setSelectedEvacuee(null);
  };

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

  // Register button handler
  const handleRegisterClick = () => {
    setEvacueeModalMode('register');
    // Show search modal first
    setShowSearchModal(true);
    setSearchName('');
    setSearchResults([]);
  };

  // Edit button handler
  const handleEditMember = (fullName: string) => {
    if (!selectedEvacuee) return;
    const member = selectedEvacuee.members.find((m: { fullName: string }) => m.fullName === fullName);
    if (member) {
      const birthYear = new Date().getFullYear() - member.age;
      const estimatedBirthday = `${birthYear}-01-01`;
      setFormData({
        firstName: member.fullName.split(" ")[0],
        middleName: member.fullName.split(" ")[1] || "",
        lastName: member.fullName.split(" ").slice(-1)[0],
        suffix: '',
        sex: member.sex,
        maritalStatus: '',
        birthday: estimatedBirthday,
        educationalAttainment: '',
        occupation: '',
        purok: '',
        barangayOfOrigin: member.barangayOfOrigin,
        isFamilyHead: selectedEvacuee.familyHead === member.fullName ? "Yes" : "No",
        familyHead: selectedEvacuee.familyHead,
        relationshipToFamilyHead: '',
        searchEvacuationRoom: selectedEvacuee.room,
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
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchName(value);
    if (value.trim()) {
      const results = mockEvacuees.filter(e =>
        e.familyHead.toLowerCase().includes(value.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleFamilyHeadSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFamilyHeadSearchTerm(value);
    if (value.trim()) {
      const results = mockEvacuees.filter(e =>
        e.familyHead.toLowerCase().includes(value.toLowerCase())
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

  return (
    <div className="text-black p-6 space-y-6">
      {/* Header with Breadcrumb */}
      <div className="space-y-5">
        <h1 className="text-3xl font-bold">Evacuation Information</h1>
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
          <span className="text-gray-900 font-normal">{centerName}</span>
        </div>
      </div>

      {/* Disaster Information Card */}
      {disaster ? (
        <div className="py-3">
          <div className="space-y-3">
            <div
              className={`inline-block rounded px-3 py-1 text-sm font-semibold ${DISASTER_TYPE_COLORS[disaster.type as keyof typeof DISASTER_TYPE_COLORS]?.tagColor}`}
            >
              {disaster.type}
            </div>
            <h2
              className={`text-3xl font-bold ${DISASTER_TYPE_COLORS[disaster.type as keyof typeof DISASTER_TYPE_COLORS]?.typeColor}`}
            >
              {disaster.name}
            </h2>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">{disaster.start}</span>
            </div>
          </div>
        </div>
      ) : null}

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
            <EvacueeStatisticsChart data={mockStatistics} />
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
                  <TableHead className="text-left font-semibold">Room Number</TableHead>
                  <TableHead className="text-left font-semibold">Decampment</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEvacuees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No results.</TableCell>
                  </TableRow>
                ) : (
                  paginatedEvacuees.map(evac => (
                    <TableRow 
                      key={evac.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleRowClick(evac.id)}
                    >
                      <TableCell className="text-foreground font-medium">{evac.familyHead}</TableCell>
                      <TableCell className="text-foreground">{evac.barangay}</TableCell>
                      <TableCell className="text-foreground">{evac.individuals.toLocaleString()}</TableCell>
                      <TableCell className="text-foreground">{evac.room}</TableCell>
                      <TableCell className="text-foreground">{evac.decampment}</TableCell>
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
              onRowsPerPageChange={(value) => setRowsPerPage(Number(value))}
            />
          </div>
        </div>
      </div>

      <FamilyDetailsModal
        isOpen={!!selectedEvacuee}
        onClose={handleCloseModal}
        evacuee={selectedEvacuee}
        centerName={centerName}
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
  );
}