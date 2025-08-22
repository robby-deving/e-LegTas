import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Input } from "../components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/table";
import { ChevronRight, Calendar, ArrowRight } from "lucide-react";
import { Pagination } from "../components/ui/pagination";
import { decodeId } from "@/utils/secureId";
import axios from "axios";
import type { Disaster } from "@/types/disaster";
import type { ActiveEvacuation } from "@/types/EvacuationCenter";
import { usePageTitle } from "../hooks/usePageTitle";
import { formatDate } from "@/utils/dateFormatter";
import { getTypeColor, getTagColor } from "@/constants/disasterTypeColors";
import { encodeId } from "@/utils/secureId";
import { selectToken } from "../features/auth/authSlice";

export default function DisasterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = useSelector(selectToken);

  const [searchTerm, setSearchTerm] = useState("");
  const [evacuationCenters, setCenters] = useState<ActiveEvacuation[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [disaster, setDisaster] = useState<Disaster | null>(null);

  // Get auth headers for API calls
  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  };

  const rawDisasterId = id?.split("-")[0] || "";
  const disasterId = decodeId(rawDisasterId);

  useEffect(() => {
    const storedDisasters = localStorage.getItem("disasters");
    if (storedDisasters) {
      try {
        const parsed: Disaster[] = JSON.parse(storedDisasters);
        const disasterDetails = parsed.find((d) => d.id === disasterId);
        if (disasterDetails) setDisaster(disasterDetails);
      } catch (e) {
        console.error("Error parsing disasters from localStorage", e);
      }
    }
  }, [disasterId]);

  usePageTitle(disaster?.name ?? "");

  useEffect(() => {
    const fetchEvacuationCenters = async () => {
      if (!disasterId || isNaN(disasterId)) return;

      try {
        const res = await axios.get(
          `http://localhost:3000/api/v1/disaster-events/by-disaster/${disasterId}/details`,
          { headers: getAuthHeaders() }
        );
        
        // Type-safe data extraction
        const responseData = res.data as { data: ActiveEvacuation[] };
        setCenters(responseData.data || []);
      } catch (err) {
        console.error("Failed to fetch evacuation data", err);
      }
    };

    fetchEvacuationCenters();
  }, [disasterId, token]);

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value));
    setCurrentPage(1);
  };

  if (!disaster) {
    return <div className="text-red-500 p-6">Disaster not found</div>;
  }

  const filteredCenters = evacuationCenters.filter(
    (center) =>
      center.evacuation_center_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      center.evacuation_center_barangay_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const totalRows = filteredCenters.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = filteredCenters.slice(startIndex, endIndex);

  return (
    <div className="text-black p-6 space-y-6 flex flex-col min-h-screen">
      <div className="space-y-5">
        <h1 className="text-3xl font-bold text-green-800">
          Evacuation Information
        </h1>
        <div className="flex items-center text-sm text-gray-600">
          <button
            onClick={() => navigate("/evacuation-information")}
            className="hover:text-green-700 font-bold transition-colors cursor-pointer"
          >
            Disaster
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-gray-900 font-semibold">{disaster.name}</span>
        </div>
      </div>

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
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">{formatDate(disaster.start_date)}</span>
          </div>
        </div>
      </div>

      <div className="py-1 flex flex-col flex-1">
        <div className="flex flex-col space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold">List of Evacuation Center</h3>
          </div>

          <div className="w-full max-w-xs">
            <Input
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="rounded-md border border-input overflow-x-auto">
            <div className="max-h-[70vh] overflow-x-auto overflow-y-auto pr-2 pb-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-corner]:bg-transparent dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500 [scrollbar-width:thin] [scrollbar-color:rgb(209_213_219)_transparent] dark:[scrollbar-color:rgb(115_115_115)_transparent]">
              <Table className="text-sm">
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="text-left">
                      Evacuation Center
                    </TableHead>
                    <TableHead className="text-left">Barangay</TableHead>
                    <TableHead className="text-left">Total Families</TableHead>
                    <TableHead className="text-left">Total Evacuees</TableHead>
                    <TableHead className="text-left">Camp Manager</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-4 text-gray-500"
                      >
                        No evacuation operations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentRows.map((center) => (
                      <TableRow
                        key={center.evacuation_center_id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() =>
                          navigate(
                            `/evacuation-information/${encodeId(
                              disasterId
                            )}/${encodeId(center.id)}`
                          )
                        }
                      >
                        <TableCell className="text-foreground font-medium">
                          {center.evacuation_center_name}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {center.evacuation_center_barangay_name}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {center.total_no_of_family} Family
                        </TableCell>
                        <TableCell className="text-foreground">
                          {center.total_no_of_individuals} /{" "}
                          {center.evacuation_center_total_capacity} Persons
                        </TableCell>
                        <TableCell className="flex items-center justify-between text-foreground">
                          {center.assigned_user_name}
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex items-center justify-between mt-auto pt-4">
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
