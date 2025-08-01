import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, ArrowRight, Calendar, Home, Users, LayoutGrid, Search, CalendarIcon, ChevronUp, ChevronDown, Pencil, X as XIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/table";
import { Pagination } from "../components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import EvacueeStatisticsChart from "../components/EvacueeStatisticsChart";
import StatCard from "../components/StatCard";
import { usePageTitle } from "../hooks/usePageTitle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
// import { decodeId } from "@/utils/secureId";
import { getTypeColor, getTagColor } from '@/constants/disasterTypeColors';

const mockCenter = {
  name: "Evacuation Center 1",
  barangay: "Bgy. 1 - Em's Barrio",
  families: 143,
  evacuees: 50000,
  capacity: 20215,
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


export default function EvacuationCenterDetail() {
  usePageTitle('Evacuation Center Detail');
  const navigate = useNavigate();
  const { disasterName, centerName: centerParam } = useParams<{ disasterName?: string; centerName?: string }>();
  const centerName = decodeURIComponent(centerParam || "");

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
        <h1 className="text-3xl font-bold text-green-800">Evacuation Information</h1>
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
              className={`inline-block rounded px-3 py-1 text-sm font-semibold ${getTagColor(disaster.type)}`}
            >
              {disaster.type}
            </div>
            <h2
              className={`text-3xl font-bold ${getTypeColor(disaster.type)}`}
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
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold leading-tight mb-0">{mockCenter.name}</CardTitle>
              <div className="text-muted-foreground text-base font-medium">{mockCenter.barangay}</div>
            </CardHeader>
          </Card>
          <div className="flex flex-col gap-6 mt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatCard
                title="Registered Families"
                value={mockCenter.families.toLocaleString()}
                icon={<Home className="w-5 h-5 text-blue-600 mr-2" />}
                valueClassName="text-blue-500"
              />
              <StatCard
                title="Registered Evacuees"
                value={mockCenter.evacuees.toLocaleString()}
                icon={<Users className="w-5 h-5 text-green-700 mr-2" />}
                valueClassName="text-green-600"
              />
              <StatCard
                title="EC Capacity"
                value={mockCenter.capacity.toLocaleString()}
                icon={<LayoutGrid className="w-5 h-5 text-yellow-500 mr-2" />}
                valueClassName="text-yellow-500"
              />
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

      {/* Family Details Modal */}
      <Dialog open={!!selectedEvacuee} onOpenChange={handleCloseModal}>
        <DialogContent size="full">
          <DialogHeader>
            <DialogTitle className="text-green-700 text-xl font-bold">View Family</DialogTitle>
          </DialogHeader>
          {selectedEvacuee && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Evacuation Center:</label>
                  <Input value={mockCenter.name} readOnly className="w-full bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Head of the Family:</label>
                  <Input value={selectedEvacuee.familyHead} readOnly className="w-full bg-gray-50" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-full">
                    <label className="block text-sm font-semibold mb-2">Decampment:</label>
                    <Input value={selectedEvacuee.decampment || "Not Decamped"} readOnly className="w-full bg-gray-50" />
                  </div>
                  <Button
                    className="bg-green-700 hover:bg-green-800 text-white px-3 py-1 text-sm cursor-pointer self-end"
                    onClick={() => navigate(`/decampment/${selectedEvacuee.id}`)}
                  >
                    Decamp
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-3">Individual Breakdown:</label>
                <div className="overflow-x-auto border rounded-lg">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-center font-semibold">Male</TableHead>
                        <TableHead className="text-center font-semibold">Female</TableHead>
                        <TableHead className="text-center font-semibold">Total</TableHead>
                        <TableHead className="text-center font-semibold">Infant<br/>(1 yr below)</TableHead>
                        <TableHead className="text-center font-semibold">Children<br/>(2-12 yrs)</TableHead>
                        <TableHead className="text-center font-semibold">Youth<br/>(13-17 yrs)</TableHead>
                        <TableHead className="text-center font-semibold">Adult<br/>(18-59 yrs)</TableHead>
                        <TableHead className="text-center font-semibold">Senior<br/>(60+ yrs)</TableHead>
                        <TableHead className="text-center font-semibold">PWD</TableHead>
                        <TableHead className="text-center font-semibold">Pregnant</TableHead>
                        <TableHead className="text-center font-semibold">Lactating</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-center">{selectedEvacuee.members.filter((m: { sex: string; }) => m.sex === "Male").length}</TableCell>
                        <TableCell className="text-center">{selectedEvacuee.members.filter((m: { sex: string; }) => m.sex === "Female").length}</TableCell>
                        <TableCell className="text-center font-semibold">{selectedEvacuee.individuals}</TableCell>
                        <TableCell className="text-center">{selectedEvacuee.members.filter((m: { age: number; }) => m.age < 2).length}</TableCell>
                        <TableCell className="text-center">{selectedEvacuee.members.filter((m: { age: number; }) => m.age >= 2 && m.age <= 12).length}</TableCell>
                        <TableCell className="text-center">{selectedEvacuee.members.filter((m: { age: number; }) => m.age >= 13 && m.age <= 17).length}</TableCell>
                        <TableCell className="text-center">{selectedEvacuee.members.filter((m: { age: number; }) => m.age >= 18 && m.age <= 59).length}</TableCell>
                        <TableCell className="text-center">{selectedEvacuee.members.filter((m: { age: number; }) => m.age >= 60).length}</TableCell>
                        <TableCell className="text-center">{selectedEvacuee.members.filter((m: { vulnerability: string; }) => m.vulnerability === "PWD").length}</TableCell>
                        <TableCell className="text-center">{selectedEvacuee.members.filter((m: { vulnerability: string; }) => m.vulnerability === "Pregnant").length}</TableCell>
                        <TableCell className="text-center">{selectedEvacuee.members.filter((m: { vulnerability: string; }) => m.vulnerability === "Lactating").length}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-3">List of Family Members:</label>
                <div className="overflow-x-auto border rounded-lg">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Full Name</TableHead>
                        <TableHead className="font-semibold">Age</TableHead>
                        <TableHead className="font-semibold">Barangay of Origin</TableHead>
                        <TableHead className="font-semibold">Sex</TableHead>
                        <TableHead className="font-semibold">Type of Vulnerability</TableHead>
                        <TableHead className="font-semibold">Time of Arrival</TableHead>
                        <TableHead className="font-semibold"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedEvacuee.members.map((member: { fullName: string; age: number; barangayOfOrigin: string; sex: string; vulnerability: string; timeOfArrival: string; }, idx: number) => (
                        <TableRow key={idx} className="group hover:bg-gray-50">
                          <TableCell className="font-medium">{member.fullName}</TableCell>
                          <TableCell>{member.age}</TableCell>
                          <TableCell>{member.barangayOfOrigin}</TableCell>
                          <TableCell>{member.sex}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              member.vulnerability === "None" ? "bg-gray-100 text-gray-600" :
                              member.vulnerability === "Children" ? "bg-blue-100 text-blue-600" :
                              member.vulnerability === "Youth" ? "bg-green-100 text-green-600" :
                              member.vulnerability === "Adult" ? "bg-purple-100 text-purple-600" :
                              member.vulnerability === "Senior" ? "bg-orange-100 text-orange-600" :
                              member.vulnerability === "Infant" ? "bg-pink-100 text-pink-600" :
                              member.vulnerability === "Pregnant" ? "bg-red-100 text-red-600" :
                              member.vulnerability === "PWD" ? "bg-yellow-100 text-yellow-600" :
                              "bg-gray-100 text-gray-600"
                            }`}>
                              {member.vulnerability || "None"}
                            </span>
                          </TableCell>
                          <TableCell>{member.timeOfArrival}</TableCell>
                          <TableCell className="text-right flex justify-end items-center text-foreground">
                            <Pencil className="w-4 h-4 text-gray-400 group-hover:text-green-700 cursor-pointer" onClick={() => handleEditMember(member.fullName)} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Register Evacuee Modal */}
      <Dialog open={evacueeModalOpen} onOpenChange={setEvacueeModalOpen}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle className="text-green-700 text-xl font-bold">{evacueeModalMode === 'register' ? 'Register Evacuee' : 'Edit Evacuee'}</DialogTitle>
          </DialogHeader>
          <form className="space-y-8">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">First Name:</label>
                  <Input
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={e => handleFormInputChange('firstName', e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Middle Name:</label>
                  <Input
                    placeholder="Middle Name"
                    value={formData.middleName}
                    onChange={e => handleFormInputChange('middleName', e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Last Name:</label>
                  <Input
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={e => handleFormInputChange('lastName', e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Suffix:</label>
                  <Input
                    placeholder="Suffix"
                    value={formData.suffix}
                    onChange={e => handleFormInputChange('suffix', e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Sex:</label>
                  <Select value={formData.sex} onValueChange={value => handleFormInputChange('sex', value)}>
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
                  <Select value={formData.maritalStatus} onValueChange={value => handleFormInputChange('maritalStatus', value)}>
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
                      onChange={e => handleFormInputChange('birthday', e.target.value)}
                      className="w-full hide-date-icon"
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Educational Attainment:</label>
                  <Select value={formData.educationalAttainment} onValueChange={value => handleFormInputChange('educationalAttainment', value)}>
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
                    onChange={e => handleFormInputChange('occupation', e.target.value)}
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
                    onChange={e => handleFormInputChange('purok', e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Barangay of Origin:</label>
                  <Select value={formData.barangayOfOrigin} onValueChange={value => handleFormInputChange('barangayOfOrigin', value)}>
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
                      onValueChange={value => handleFormInputChange('isFamilyHead', value)}
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
                            onClick={handleFamilyHeadSearchClick}
                            readOnly
                            className="w-full cursor-pointer bg-gray-50"
                          />
                          {formData.familyHead && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData(prev => ({
                                  ...prev,
                                  familyHead: '',
                                  relationshipToFamilyHead: ''
                                }));
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
                        <Select value={formData.relationshipToFamilyHead} onValueChange={value => handleFormInputChange('relationshipToFamilyHead', value)}>
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
                  <Input
                    placeholder="Room Number"
                    value={formData.searchEvacuationRoom}
                    onChange={e => handleFormInputChange('searchEvacuationRoom', e.target.value)}
                    className="w-full"
                  />
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
                    onCheckedChange={checked => handleVulnerabilityChange('pwd', checked as boolean)}
                  />
                  <label htmlFor="pwd" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Person with Disability (PWD)
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="pregnant"
                    checked={formData.vulnerabilities.pregnant}
                    onCheckedChange={checked => handleVulnerabilityChange('pregnant', checked as boolean)}
                  />
                  <label htmlFor="pregnant" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Pregnant
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="lactating"
                    checked={formData.vulnerabilities.lactatingMother}
                    onCheckedChange={checked => handleVulnerabilityChange('lactatingMother', checked as boolean)}
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
                onClick={handleEvacueeModalClose}
                className="px-6 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRegisterOrEdit}
                className="bg-green-700 hover:bg-green-800 text-white px-6 cursor-pointer"
              >
                {evacueeModalMode === 'register' ? 'Register' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Search Modal (only for register mode) */}
      <Dialog open={showSearchModal} onOpenChange={setShowSearchModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-green-700 text-xl font-bold">Search Registered Evacuee</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Input
              placeholder="Search Name"
              value={searchName}
              onChange={handleSearchChange}
              className="w-full"
            />
            {searchResults.length > 0 ? (
              <div className="space-y-1">
                {searchResults.map((evacuee) => (
                  <div
                    key={evacuee.id}
                    className="cursor-pointer p-1 hover:bg-gray-100 rounded flex items-center justify-between px-3 text-sm"
                    onClick={() => handleSelectEvacuee(evacuee)}
                  >
                    <span>{evacuee.familyHead}</span>
                  </div>
                ))}
              </div>
            ) : searchName.trim() ? (
              <p className="text-gray-500 text-center text-sm py-4">No results found</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSearchModal(false)}
              className="px-6 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleManualRegister}
              className="bg-green-700 hover:bg-green-800 text-white px-6 cursor-pointer"
            >
              Manual Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Family Head Search Modal */}
      <Dialog open={showFamilyHeadSearchModal} onOpenChange={setShowFamilyHeadSearchModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-green-700 text-xl font-bold">Search Family Head</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Input
              placeholder="Search Family Head"
              value={familyHeadSearchTerm}
              onChange={handleFamilyHeadSearchChange}
              className="w-full"
              autoFocus
            />
            {familyHeadSearchResults.length > 0 ? (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {familyHeadSearchResults.map((evacuee) => (
                  <div
                    key={evacuee.id}
                    className="cursor-pointer p-2 hover:bg-gray-100 rounded flex items-center justify-between text-sm"
                    onClick={() => handleFamilyHeadSelect(evacuee)}
                  >
                    <span>{evacuee.familyHead}</span>
                    <span className="text-gray-500 text-xs">{evacuee.barangay}</span>
                  </div>
                ))}
              </div>
            ) : familyHeadSearchTerm.trim() ? (
              <p className="text-gray-500 text-center text-sm py-4">No family heads found</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowFamilyHeadSearchModal(false)}
              className="px-6 cursor-pointer"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}