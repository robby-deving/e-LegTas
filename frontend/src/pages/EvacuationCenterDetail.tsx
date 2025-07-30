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

export default function EvacuationCenterDetail() {
  usePageTitle('Evacuation Center Detail');
  const navigate = useNavigate();
  const { disasterId, centerName: centerParam } = useParams<{ disasterId?: string; centerName?: string }>();
  const centerName = decodeURIComponent(centerParam || "");

  // State management for the data
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedEvacuee, setSelectedEvacuee] = useState<any>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const [evacuees, setEvacuees] = useState<any[]>([]); // Will fetch evacuees from backend
  const [disaster, setDisaster] = useState<any>(null); // Will fetch disaster details from backend

  // Fetch disaster and evacuees based on disasterId and centerName
  useEffect(() => {
    const fetchEvacuationData = async () => {
      try {
        // Fetch disaster details using disasterId
        const resDisaster = await axios.get(`/api/v1/disasters/${disasterId}`);
        setDisaster(resDisaster.data);

        // Fetch evacuees based on the centerName
        const resEvacuees = await axios.get(`/api/v1/evacuation-centers/${centerName}/evacuees`);
        setEvacuees(resEvacuees.data); // This will be the list of evacuees based on the selected center
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchEvacuationData();
  }, [disasterId, centerName]); // This runs when disasterId or centerName changes

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
    setShowRegisterModal(true);
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
            onClick={() => navigate(`/evacuation-information/${disasterId}`)}
            className="hover:text-green-700 font-semibold transition-colors cursor-pointer text-gray-900"
          >
            {disaster.name}
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
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold leading-tight mb-0">{centerName}</CardTitle>
              <div className="text-muted-foreground text-base font-medium">{centerName}</div>
            </CardHeader>
          </Card>
          <div className="flex flex-col gap-6 mt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatCard
                title="Registered Families"
                value={evacuees.length.toLocaleString()}
                icon={<Home className="w-5 h-5 text-blue-600 mr-2" />}
                valueClassName="text-blue-500"
              />
              <StatCard
                title="Registered Evacuees"
                value={evacuees.length.toLocaleString()}
                icon={<Users className="w-5 h-5 text-green-700 mr-2" />}
                valueClassName="text-green-600"
              />
              <StatCard
                title="EC Capacity"
                value="0" // This value needs to be updated according to your database
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
            <EvacueeStatisticsChart data={[]} /> {/* Add the actual data */}
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
                      onClick={() => handleRowClick(evac.id)} // On clicking the row, open evacuee details
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
              {/* Family details view, editable fields */}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
