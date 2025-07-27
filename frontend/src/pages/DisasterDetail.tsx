import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Input } from "../components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from "../components/ui/table";
import { ChevronRight, Calendar, ArrowRight } from "lucide-react";
import { Pagination } from "../components/ui/pagination";

type EvacuationCenter = {
  name: string;
  barangay: string;
  totalFamilies: string;
  totalEvacuees: string;
  campManager: string;
};

type Disaster = {
  name: string;
  type: string;
  start: string;
  end?: string;
  status: 'Active' | 'Ended';
};

const DISASTER_TYPE_COLORS: Record<string, { typeColor: string; tagColor: string }> = {
  'Typhoon': { typeColor: 'text-sky-500', tagColor: 'bg-sky-100 text-sky-600' },
  'Tropical Storm': { typeColor: 'text-sky-400', tagColor: 'bg-sky-100 text-sky-600' },
  'Volcanic Eruption': { typeColor: 'text-orange-600', tagColor: 'bg-orange-100 text-orange-600' },
  'Landslide': { typeColor: 'text-yellow-600', tagColor: 'bg-yellow-100 text-yellow-600' },
};

export const EVACUATION_CENTERS: EvacuationCenter[] = [
  { name: 'Albay Astrodome', barangay: 'Bgy. Legazpi - Legazpi City', totalFamilies: '120 / 150 Family', totalEvacuees: '480 Persons', campManager: 'Maria Elena Santos' },
  { name: 'Legazpi Elementary School', barangay: 'Bgy. Sagpon - Legazpi City', totalFamilies: '85 / 100 Family', totalEvacuees: '340 Persons', campManager: 'Roberto Cruz' },
  { name: 'Aquinas University Gym', barangay: 'Bgy. Rawis - Legazpi City', totalFamilies: '95 / 120 Family', totalEvacuees: '380 Persons', campManager: 'Carmen Villanueva' },
  { name: 'Bicol University Covered Court', barangay: 'Bgy. Gogon - Legazpi City', totalFamilies: '110 / 130 Family', totalEvacuees: '440 Persons', campManager: 'Jose Ramirez' },
  { name: 'Peñaranda Park Pavilion', barangay: 'Bgy. Bitano - Legazpi City', totalFamilies: '75 / 90 Family', totalEvacuees: '300 Persons', campManager: 'Ana Gutierrez' },
  { name: 'Embarcadero de Legazpi', barangay: 'Bgy. Legazpi - Legazpi City', totalFamilies: '60 / 80 Family', totalEvacuees: '240 Persons', campManager: 'Pedro Morales' },
  { name: 'Legazpi City Hall Gymnasium', barangay: 'Bgy. Sagpon - Legazpi City', totalFamilies: '90 / 110 Family', totalEvacuees: '360 Persons', campManager: 'Luz Fernandez' },
  { name: 'Kapuntukan Hill Barangay Hall', barangay: 'Bgy. Kapuntukan - Legazpi City', totalFamilies: '45 / 60 Family', totalEvacuees: '180 Persons', campManager: 'Ricardo Dela Rosa' },
  { name: 'Taysan Elementary School', barangay: 'Bgy. Taysan - Legazpi City', totalFamilies: '70 / 85 Family', totalEvacuees: '280 Persons', campManager: 'Gloria Mendoza' },
  { name: 'Bagumbayan Sur Covered Court', barangay: 'Bgy. Bagumbayan Sur - Legazpi City', totalFamilies: '55 / 70 Family', totalEvacuees: '220 Persons', campManager: 'Antonio Reyes' },
  { name: 'Cruzada Barangay Hall', barangay: 'Bgy. Cruzada - Legazpi City', totalFamilies: '40 / 55 Family', totalEvacuees: '160 Persons', campManager: 'Rosario Aquino' },
  { name: 'Dita Elementary School', barangay: 'Bgy. Dita - Legazpi City', totalFamilies: '65 / 80 Family', totalEvacuees: '260 Persons', campManager: 'Miguel Torres' },
  { name: 'Estanza Barangay Gymnasium', barangay: 'Bgy. Estanza - Legazpi City', totalFamilies: '50 / 65 Family', totalEvacuees: '200 Persons', campManager: 'Elena Castillo' },
  { name: 'Homapon Elementary School', barangay: 'Bgy. Homapon - Legazpi City', totalFamilies: '35 / 50 Family', totalEvacuees: '140 Persons', campManager: 'Fernando Jimenez' },
  { name: 'Ilawod Pob. Covered Court', barangay: 'Bgy. Ilawod Pob. - Legazpi City', totalFamilies: '80 / 95 Family', totalEvacuees: '320 Persons', campManager: 'Corazon Valdez' },
  { name: 'Kawit-East Barangay Hall', barangay: 'Bgy. Kawit-East - Legazpi City', totalFamilies: '30 / 45 Family', totalEvacuees: '120 Persons', campManager: 'Danilo Pascual' },
  { name: 'Lamba Elementary School', barangay: 'Bgy. Lamba - Legazpi City', totalFamilies: '60 / 75 Family', totalEvacuees: '240 Persons', campManager: 'Remedios Silva' },
  { name: 'Mabinit Barangay Gymnasium', barangay: 'Bgy. Mabinit - Legazpi City', totalFamilies: '45 / 60 Family', totalEvacuees: '180 Persons', campManager: 'Alfredo Ramos' },
  { name: 'Pinaric Elementary School', barangay: 'Bgy. Pinaric - Legazpi City', totalFamilies: '55 / 70 Family', totalEvacuees: '220 Persons', campManager: 'Teresita Bautista' },
  { name: 'Rawis Elementary School', barangay: 'Bgy. Rawis - Legazpi City', totalFamilies: '75 / 90 Family', totalEvacuees: '300 Persons', campManager: 'Ernesto Navarro' },
  { name: 'San Roque Barangay Hall', barangay: 'Bgy. San Roque - Legazpi City', totalFamilies: '40 / 55 Family', totalEvacuees: '160 Persons', campManager: 'Natividad Herrera' },
  { name: 'Tula-tula Elementary School', barangay: 'Bgy. Tula-tula - Legazpi City', totalFamilies: '50 / 65 Family', totalEvacuees: '200 Persons', campManager: 'Benjamin Aguilar' },
  { name: 'Victory Village South Gym', barangay: 'Bgy. Victory Village South - Legazpi City', totalFamilies: '65 / 80 Family', totalEvacuees: '260 Persons', campManager: 'Josephine Cortez' },
  { name: 'Washington Drive Covered Court', barangay: 'Bgy. Washington Drive - Legazpi City', totalFamilies: '70 / 85 Family', totalEvacuees: '280 Persons', campManager: 'Rodolfo Perez' },
  { name: 'Yawa Elementary School', barangay: 'Bgy. Yawa - Legazpi City', totalFamilies: '35 / 50 Family', totalEvacuees: '140 Persons', campManager: 'Milagros Domingo' },

];

export const DISASTERS: Disaster[] = [
  { name: 'Kristine', type: 'Typhoon', start: 'October 21-25, 2024', end: undefined, status: 'Active' },
  { name: 'Fyang', type: 'Tropical Storm', start: 'October 21, 2024', end: 'October 21, 2024', status: 'Active' },
  { name: 'Mayon', type: 'Volcanic Eruption', start: 'October 21, 2024', end: 'October 21, 2024', status: 'Active' },
  { name: 'Landslide', type: 'Landslide', start: 'October 21, 2024', end: 'October 21, 2024', status: 'Active' },
  { name: 'Odette', type: 'Typhoon', start: 'December 16, 2021', end: 'December 18, 2021', status: 'Ended' },
  { name: 'Taal', type: 'Volcanic Eruption', start: 'January 12, 2020', end: 'January 22, 2020', status: 'Ended' },
  { name: 'Agaton', type: 'Tropical Storm', start: 'April 8, 2022', end: 'April 13, 2022', status: 'Ended' },
  { name: 'Leyte Landslide', type: 'Landslide', start: 'February 17, 2006', end: 'February 20, 2006', status: 'Ended' },
];

export default function DisasterDetail() {
  const { disasterName } = useParams<{ disasterName: string }>();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCenters, setFilteredCenters] = useState<EvacuationCenter[]>(EVACUATION_CENTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const disaster = DISASTERS.find(d => d.name === disasterName);

  useEffect(() => {
    const filtered = EVACUATION_CENTERS.filter(center =>
      center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      center.barangay.toLowerCase().includes(searchTerm.toLowerCase()) ||
      center.campManager.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCenters(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [searchTerm]);

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value));
    setCurrentPage(1);
  };

  if (!disaster) {
    return <div className="text-red-500 p-6">Disaster not found</div>;
  }

  const getTypeColor = (type: string) => DISASTER_TYPE_COLORS[type]?.typeColor || '';
  const getTagColor = (type: string) => DISASTER_TYPE_COLORS[type]?.tagColor || '';

  // Pagination logic
  const totalRows = filteredCenters.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = filteredCenters.slice(startIndex, endIndex);

  return (
      <div className="text-black p-6 space-y-6 flex flex-col min-h-screen">
          {/* Header with Breadcrumb */}
          <div className="space-y-5">
              <h1 className="text-3xl font-bold text-green-800">
                  Evacuation Information
              </h1>

              {/* Breadcrumb */}
              <div className="flex items-center text-sm text-gray-600">
                  <button
                      onClick={() => navigate("/evacuation-information")}
                      className="hover:text-green-700 font-bold transition-colors cursor-pointer"
                  >
                      Disaster
                  </button>
                  <ChevronRight className="w-4 h-4 mx-2" />
                  <span className="text-gray-900 font-semibold">
                      {disaster.name}
                  </span>
              </div>
          </div>

          {/* Disaster Information Card */}
          <div className="py-3">
              <div className="space-y-3">
                  {/* Disaster Type Tag */}
                  <div
                      className={`inline-block rounded px-3 py-1 text-sm font-semibold ${getTagColor(
                          disaster.type
                      )}`}
                  >
                      {disaster.type}
                  </div>

                  {/* Disaster Name */}
                  <h2
                      className={`text-3xl font-bold ${getTypeColor(
                          disaster.type
                      )}`}
                  >
                      {disaster.name}
                  </h2>

                  {/* Date Information */}
                  <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">{disaster.start}</span>
                  </div>
              </div>
          </div>

          {/* Evacuation Centers Section */}
          <div className="py-1 flex flex-col flex-1">
              <div className="flex flex-col space-y-4 flex-1">
                  {/* Section Header */}
                  <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold">
                          List of Evacuation Center
                      </h3>
                  </div>

                  {/* Search Input */}
                  <div className="w-full max-w-xs">
                      <Input
                          placeholder="Search"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full"
                      />
                  </div>

                  {/* Table */}
                  <div className="rounded-md border border-input overflow-x-auto">
                      <Table>
                          <TableHeader className="bg-gray-50">
                              <TableRow>
                                  <TableHead className="text-left">
                                    Evacuation Center
                                  </TableHead>
                                  <TableHead className="text-left">
                                    Barangay
                                  </TableHead>
                                  <TableHead className="text-left">
                                    Total Families
                                  </TableHead>
                                  <TableHead className="text-left">
                                    Total Evacuees
                                  </TableHead>
                                  <TableHead className="text-left">
                                    Camp Manager
                                  </TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {currentRows.map((center, index) => (
                                  <TableRow 
                                    key={index} 
                                    className="cursor-pointer hover:bg-gray-50"
                                    onClick={() => navigate(`/evacuation-information/${disasterName}/${encodeURIComponent(center.name)}`)}
                                  >
                                      <TableCell className="text-foreground font-medium">
                                          {center.name}
                                      </TableCell>
                                      <TableCell className="text-foreground">
                                          {center.barangay}
                                      </TableCell>
                                      <TableCell className="text-foreground">
                                          <span>
                                            {center.totalFamilies}
                                          </span>
                                      </TableCell>
                                      <TableCell className="text-foreground">
                                          {center.totalEvacuees}
                                      </TableCell>
                                      <TableCell className="flex items-center justify-between text-foreground">
                                          {center.campManager}
                                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                      </TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </div>
                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-auto pt-4">
                    {/* Row selection indicator */}
                    <div className="flex-1 text-sm text-muted-foreground">
                      {currentRows.length} of {totalRows} row(s) shown.
                    </div>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      rowsPerPage={rowsPerPage}
                      totalRows={totalRows}
                      onRowsPerPageChange={handleRowsPerPageChange}
                    />
                  </div>
              </div>
          </div>
      </div>
  );
}
