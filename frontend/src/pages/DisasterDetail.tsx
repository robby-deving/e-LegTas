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
  { name: 'Evacuation Center 1', barangay: 'Bgy. 1 - Barangay Name', totalFamilies: '71 / 90 Family', totalEvacuees: '230 Persons', campManager: 'Juanita Dela Cruz' },
  { name: 'Evacuation Center 2', barangay: 'Bgy. 2 - Barangay Name', totalFamilies: '65 / 85 Family', totalEvacuees: '210 Persons', campManager: 'Maria Santos' },
  { name: 'Evacuation Center 3', barangay: 'Bgy. 3 - Barangay Name', totalFamilies: '45 / 70 Family', totalEvacuees: '180 Persons', campManager: 'Pedro Garcia' },
  { name: 'Evacuation Center 4', barangay: 'Bgy. 4 - Barangay Name', totalFamilies: '80 / 100 Family', totalEvacuees: '320 Persons', campManager: 'Ana Rodriguez' },
  { name: 'Evacuation Center 5', barangay: 'Bgy. 5 - Barangay Name', totalFamilies: '55 / 75 Family', totalEvacuees: '200 Persons', campManager: 'Jose Martinez' },
  { name: 'Evacuation Center 1', barangay: 'Bgy. 1 - Barangay Name', totalFamilies: '71 / 90 Family', totalEvacuees: '230 Persons', campManager: 'Juanita Dela Cruz' },
  { name: 'Evacuation Center 2', barangay: 'Bgy. 2 - Barangay Name', totalFamilies: '65 / 85 Family', totalEvacuees: '210 Persons', campManager: 'Maria Santos' },
  { name: 'Evacuation Center 3', barangay: 'Bgy. 3 - Barangay Name', totalFamilies: '45 / 70 Family', totalEvacuees: '180 Persons', campManager: 'Pedro Garcia' },
  { name: 'Evacuation Center 4', barangay: 'Bgy. 4 - Barangay Name', totalFamilies: '80 / 100 Family', totalEvacuees: '320 Persons', campManager: 'Ana Rodriguez' },
  { name: 'Evacuation Center 5', barangay: 'Bgy. 5 - Barangay Name', totalFamilies: '55 / 75 Family', totalEvacuees: '200 Persons', campManager: 'Jose Martinez' },
  { name: 'Evacuation Center 1', barangay: 'Bgy. 1 - Barangay Name', totalFamilies: '71 / 90 Family', totalEvacuees: '230 Persons', campManager: 'Juanita Dela Cruz' },
  { name: 'Evacuation Center 2', barangay: 'Bgy. 2 - Barangay Name', totalFamilies: '65 / 85 Family', totalEvacuees: '210 Persons', campManager: 'Maria Santos' },
  { name: 'Evacuation Center 3', barangay: 'Bgy. 3 - Barangay Name', totalFamilies: '45 / 70 Family', totalEvacuees: '180 Persons', campManager: 'Pedro Garcia' },
  { name: 'Evacuation Center 4', barangay: 'Bgy. 4 - Barangay Name', totalFamilies: '80 / 100 Family', totalEvacuees: '320 Persons', campManager: 'Ana Rodriguez' },
  { name: 'Evacuation Center 5', barangay: 'Bgy. 5 - Barangay Name', totalFamilies: '55 / 75 Family', totalEvacuees: '200 Persons', campManager: 'Jose Martinez' },

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
      <div className="text-black p-6 space-y-6">
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
          <div className="py-1">
              <div className="space-y-4">
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
                  <div className="rounded-md border border-input">
                      <Table>
                          <TableHeader>
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
                                    onClick={() => navigate(`/evacuation-information/${disasterName}/evacuation-center/${index + 1}`)}
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Rows per page</span>
                      <select
                        value={rowsPerPage}
                        onChange={(e) => {
                          setRowsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="border border-input bg-background px-3 py-2 text-sm rounded-md"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      rowsPerPage={rowsPerPage}
                      totalRows={totalRows}
                    />
                  </div>
              </div>
          </div>
      </div>
  );
}
