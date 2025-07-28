import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, ArrowRight, Calendar, Home, Users, LayoutGrid, Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/table";
import { Pagination } from "../components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import EvacueeStatisticsChart from "../components/EvacueeStatisticsChart";
import StatCard from "../components/StatCard";
import { usePageTitle } from "../hooks/usePageTitle";

const DISASTER_TYPE_COLORS = {
  Typhoon: { typeColor: "text-sky-500", tagColor: "bg-sky-100 text-sky-600" },
  "Tropical Storm": { typeColor: "text-sky-400", tagColor: "bg-sky-100 text-sky-600" },
  "Volcanic Eruption": { typeColor: "text-orange-600", tagColor: "bg-orange-100 text-orange-600" },
  Landslide: { typeColor: "text-yellow-600", tagColor: "bg-yellow-100 text-yellow-600" },
};

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
    ] 
  },
];

import { DISASTERS } from "./DisasterDetail";

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
  const [searchName, setSearchName] = useState("");
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

  const handleRegisterClick = () => {
    setShowRegisterModal(true);
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

  const handleSelectEvacuee = (evacuee: any) => {
    const member = evacuee.members[0]; // Use the first member for simplicity
    navigate(`/evacuation-information/${disasterName}/${centerParam}/register-evacuee`, {
      state: {
        prefilledData: {
          firstName: member.fullName.split(" ")[0],
          middleName: member.fullName.split(" ")[1] || "",
          lastName: member.fullName.split(" ").slice(-1)[0],
          sex: member.sex,
          birthday: "", // Add logic to estimate birthday if needed
          barangayOfOrigin: member.barangayOfOrigin,
          vulnerabilities: {
            pwd: member.vulnerability === "PWD",
            pregnant: member.vulnerability === "Pregnant",
            lactatingMother: member.vulnerability === "Lactating"
          }
        }
      }
    });
    setShowRegisterModal(false);
  };

  const handleManualRegister = () => {
    navigate(`/evacuation-information/${disasterName}/${centerParam}/register-evacuee`);
    setShowRegisterModal(false);
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
                <div>
                  <label className="block text-sm font-semibold mb-2">Room Number:</label>
                  <Input value={selectedEvacuee.room} readOnly className="w-full bg-gray-50" />
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedEvacuee.members.map((member: { fullName: string; age: number; barangayOfOrigin: string; sex: string; vulnerability: string; timeOfArrival: string; }, idx: number) => (
                        <TableRow key={idx} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{member.fullName}</TableCell>
                          <TableCell>{member.age}</TableCell>
                          <TableCell>{member.barangayOfOrigin}</TableCell>
                          <TableCell>{member.sex}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              member.vulnerability === "None" ? "bg-gray-100 text-gray-600" :
                              member.vulnerability === "Child" ? "bg-blue-100 text-blue-600" :
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
      <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-green-700 text-xl font-bold">Register Evacuee</DialogTitle>
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
                    className="cursor-pointer p-1 hover:bg-gray-100 rounded flex items-center justify-between px-3 text-sm cursor-pointer"
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
              onClick={() => setShowRegisterModal(false)}
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
    </div>
  );
}