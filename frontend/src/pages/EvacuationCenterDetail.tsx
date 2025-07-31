import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, ArrowRight, Calendar, Home, Users, LayoutGrid, Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/table";
import { Pagination } from "../components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import EvacueeStatisticsChart from "../components/EvacueeStatisticsChart";
import StatCard from "../components/StatCard";
import { usePageTitle } from "../hooks/usePageTitle";
import axios from "axios";
import { encodeId, decodeId } from "@/utils/secureId"; // Import encodeId and decodeId utilities
import { DISASTER_TYPE_COLORS } from "@/constants/disasterTypeColors"; // Assuming you have this constant already


// Dummy data for testing purposes
const mockCenter = {
  name: "Evacuation Center 1",
  barangay: "Bgy. 1 - Em's Barrio",
  families: 143,
  evacuees: 50000,
  capacity: 20215,
};

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
  // More mock evacuee data here...
];

export default function EvacuationCenterDetail() {
  usePageTitle("Evacuation Center Detail");
  const navigate = useNavigate();

  const { disasterId: disasterIdParam, centerId: centerIdParam } = useParams<{ disasterId?: string; centerId?: string }>();

  const disasterId = disasterIdParam ? decodeId(disasterIdParam) : "";
  const centerId = centerIdParam ? decodeId(centerIdParam) : "";

  const encodedDisasterId = disasterId ? encodeId(disasterId) : "";
  const encodedCenterId = centerId ? encodeId(centerId) : "";

  console.log("Decoded Disaster ID:", disasterId);
  console.log("Decoded Evacuation Center ID:", centerId);

  console.log("Encoded Disaster ID:", encodedDisasterId);
  console.log("Encoded Evacuation Center ID:", encodedCenterId);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedEvacuee, setSelectedEvacuee] = useState<any>(null);
  const [evacuees, setEvacuees] = useState<any[]>(mockEvacuees); // Set to mock data
  const [disaster, setDisaster] = useState<any>(null);

useEffect(() => {
  const fetchEvacuationData = async () => {
    try {
      console.log("Disaster ID:", disasterId);
      console.log("Evacuation Center ID:", centerId);

      // Fetch disaster data
      const resDisaster = await axios.get(`/api/v1/disaster-events/by-disaster/${disasterId}/details`);
      if (resDisaster.data) {
        setDisaster(resDisaster.data);
      }

      // Fetch evacuee data
      const resEvacuees = await axios.get(`/api/v1/evacuation-centers/${centerId}/evacuees`);
      if (resEvacuees.data && Array.isArray(resEvacuees.data.evacuees)) {
        setEvacuees(resEvacuees.data.evacuees);  // Store the evacuees data correctly
      } else {
        console.error("Evacuees data is not an array:", resEvacuees.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  fetchEvacuationData();
}, [disasterId, centerId]);


  const filteredEvacuees = evacuees.filter(e =>
    e.familyHead.toLowerCase().includes(search.toLowerCase()) ||
    e.barangay.toLowerCase().includes(search.toLowerCase())
  );

  const totalRows = filteredEvacuees.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const paginatedEvacuees = filteredEvacuees.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  useEffect(() => {
    setPage(1);
  }, [search, rowsPerPage]);

  const handleRowClick = (evacueeId: number) => {
    const evacuee = evacuees.find(e => e.id === evacueeId);
    setSelectedEvacuee(evacuee || null);
  };

  const handleCloseModal = () => {
    setSelectedEvacuee(null);
  };

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

  const handleRegisterClick = () => {
    setEvacueeModalMode('register');
    setEvacueeModalOpen(true);
  };

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    if (value.trim()) {
      const results = evacuees.filter(e =>
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
      const results = evacuees.filter(e =>
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

  const handleSelectEvacuee = (evacuee: any) => {
    const member = evacuee.members[0];
    const nameParts = member.fullName.split(" ");
    const lastName = nameParts.pop() || '';
    const firstName = nameParts.shift() || '';
    const middleName = nameParts.join(" ") || '';

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

    setShowSearchModal(false);
    setEvacueeModalOpen(true);
  };

  const handleManualRegister = () => {
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
    setShowSearchModal(false);
    setEvacueeModalOpen(true);
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
            onClick={() => navigate(`/evacuation-information/${encodedDisasterId}`)} 
            className="hover:text-green-700 font-semibold transition-colors cursor-pointer text-gray-900"
          >
            {disaster ? disaster.name : "Loading..."}
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-gray-900 font-normal">{encodedCenterId}</span>
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
            <EvacueeStatisticsChart data={[]} />
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
        key={evac.evacuee_id}  // Make sure to use the correct ID
        className="cursor-pointer hover:bg-gray-50"
        onClick={() => handleRowClick(evac.evacuee_id)}  // Pass evacuee_id
      >
        <TableCell className="text-foreground font-medium">{evac.firstName} {evac.lastName}</TableCell>
        <TableCell className="text-foreground">{evac.barangay_of_origin}</TableCell>
        <TableCell className="text-foreground">{evac.age}</TableCell>
        <TableCell className="text-foreground">{evac.roomName}</TableCell> {/* Ensure this field exists in your data */}
        <TableCell className="text-foreground">{evac.arrivalTimestamp}</TableCell>
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
              {/* Family details */}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
