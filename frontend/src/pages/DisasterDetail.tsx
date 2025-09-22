import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
import { disasterService } from "@/services/disasterService";
import LoadingSpinner from "@/components/loadingSpinner";
import { Button } from "@/components/ui/button";

export default function DisasterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const token = useSelector(selectToken);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [evacuationCenters, setCenters] = useState<ActiveEvacuation[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [disaster, setDisaster] = useState<Disaster | null>(null);
  const [disasterLoading, setDisasterLoading] = useState(true);
  const [disasterError, setDisasterError] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);

  /**
   * Note: While the UI displays "Incident", we use "Disaster" in our
   * codebase for consistency with our data models and APIs.
   */
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


  const [activeTab, setActiveTab] = useState('Inside EC');

  const tabs = [
    { name: 'Inside EC' }, // Replace with your actual icon component or image
    { name: 'Outside EC' },
  ];
  useEffect(() => {
    
    const loadDisaster = async () => {
      if (!disasterId || isNaN(disasterId)) {
        setDisasterError("Invalid disaster ID");
        setHasError(true);
        return;
      }

      setDisasterLoading(true);
      setDisasterError(null);
      setHasError(false);

      try {
        // First try to get from navigation state (if passed from EvacuationInfo)
        const disasterFromState = location.state?.disaster as Disaster | undefined;
        if (disasterFromState && disasterFromState.id === disasterId) {
          setDisaster(disasterFromState);
          setDisasterLoading(false);
          setHasError(false);
          return;
        }

        // Then try localStorage
        const storedDisasters = localStorage.getItem("disasters");
        if (storedDisasters) {
          try {
            const parsed: Disaster[] = JSON.parse(storedDisasters);
            const disasterDetails = parsed.find((d) => d.id === disasterId);
            if (disasterDetails) {
              setDisaster(disasterDetails);
              setDisasterLoading(false);
              setHasError(false);
              return;
            }
          } catch (e) {
            console.error("Error parsing disasters from localStorage", e);
          }
        }

        // Finally, fetch from API if not found in localStorage
        console.log("Fetching disaster from API...");
        const fetchedDisaster = await disasterService.fetchDisasterById(disasterId, token || "");
        setDisaster(fetchedDisaster);
        setHasError(false);

      } catch (error) {
        console.error("Failed to load disaster:", error);
        setDisasterError("Failed to load disaster details");
        setHasError(true);
      } finally {
        setDisasterLoading(false);
      }
    };

    loadDisaster();
  }, [disasterId, token, location.state]);

  usePageTitle(disaster?.name ?? "");

  const fetchEvacuationCenters = async (page = currentPage, limit = rowsPerPage, searchTerm = debouncedSearchTerm) => {
    if (!disasterId || isNaN(disasterId)) return;

    setTableLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      // Add search parameter if provided
      if (searchTerm && searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const res = await axios.get(
        `https://api.e-legtas.tech/api/v1/disaster-events/by-disaster/${disasterId}/details?${params.toString()}`,
        { headers: getAuthHeaders() }
      );

      // Type-safe data extraction with pagination
      const responseData = res.data as {
        data: ActiveEvacuation[];
        pagination: {
          current_page: number;
          per_page: number;
          total_pages: number;
          total_records: number;
          has_next_page: boolean;
          has_prev_page: boolean;
        }
      };

      setCenters(responseData.data || []);
      setTotalRecords(responseData.pagination.total_records);
      setTotalPages(responseData.pagination.total_pages);
    } catch (err) {
      console.error("Failed to fetch evacuation data", err);
      setCenters([]);
      setTotalRecords(0);
      setTotalPages(0);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchEvacuationCenters();
  }, [disasterId, token]);

  useEffect(() => {
    if (disasterId && !disasterLoading) {
      fetchEvacuationCenters(currentPage, rowsPerPage, debouncedSearchTerm);
    }
  }, [currentPage, rowsPerPage, debouncedSearchTerm]);

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value));
    setCurrentPage(1);
    fetchEvacuationCenters(1, Number(value), debouncedSearchTerm);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchEvacuationCenters(page, rowsPerPage, debouncedSearchTerm);
  };


  // Reset to page 1 when search term changes
  useEffect(() => {
    if (debouncedSearchTerm !== '') {
      setCurrentPage(1);
    }
  }, [debouncedSearchTerm]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Show loading state
  if (disasterLoading) {
    return (
      <div className="text-black p-6 space-y-6 flex flex-col min-h-screen">
        <div className="flex justify-center items-center py-20">
          <LoadingSpinner text="Loading disaster details..." size="lg" />
        </div>
      </div>
    );
  }

  // Show error state
  if (hasError || (!disaster && !disasterLoading)) {
    return (
      <div className="text-black p-6 space-y-6 flex flex-col min-h-screen">
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-4">⚠️</div>
            <p className="text-red-600 font-semibold mb-2">
              {disasterError || "Disaster not found"}
            </p>
            <p className="text-gray-600 text-sm">
              The disaster you're looking for could not be loaded.
            </p>
            <button
              onClick={() => navigate("/evacuation-information")}
              className="mt-4 px-4 py-2 bg-green-800 text-white rounded hover:bg-green-900 transition-colors"
            >
              Back to Disaster List
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Data is now filtered by backend, so no local filtering needed
  const filteredCenters = evacuationCenters;

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
            Incident
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-gray-900 font-semibold">{disaster!.name}</span>
        </div>
      </div>

      <div className="py-3">
        <div className="space-y-3">
          <div
            className={`inline-block rounded px-3 py-1 text-sm font-semibold ${getTagColor(
              disaster!.type
            )}`}
          >
            {disaster!.type}
          </div>
          <h2 className={`text-3xl font-bold ${getTypeColor(disaster!.type)}`}>
            {disaster!.name}
          </h2>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">{formatDate(disaster!.start_date)}</span>
          </div>
        </div>
      </div>

      <div className="py-1 flex flex-col flex-1">
        <div className="w-full flex flex-col space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold">List of Evacuation Centers</h3>
          </div>

          <div className="w-full flex justify-between items-center">
            <div className="relative">
              <Input
                placeholder="Search evacuation centers or barangays"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-8"
              />
              {searchTerm !== debouncedSearchTerm && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            <div className="flex gap-8 text-sm text-gray-600 items-center">
              <div className="flex gap-2 items-center">
                <div className=" border border-gray-300 rounded-full inline-flex space-x-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.name}
                      onClick={() => setActiveTab(tab.name)}
                      className={`flex items-center px-4 py-2  rounded-full transition-colors duration-200
                        ${activeTab === tab.name
                          ? 'bg-green-700 text-white'
                          : 'text-gray-400 hover:text-black'
                        }`}
                    >
                      <span className="font-semibold">{tab.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <Button className="bg-green-700 hover:bg-green-800 text-white px-6 flex gap-2 items-center cursor-pointer">
                Register Evacuee
              </Button>
            </div>
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
                  {tableLoading ? (
                    // Loading rows with spinners
                    Array.from({ length: rowsPerPage }, (_, index) => (
                      <TableRow key={`loading-${index}`}>
                        <TableCell className="py-4">
                          <div className="flex items-center space-x-2">
                            <LoadingSpinner size="sm" />
                            <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-between">
                            <div className="h-4 bg-gray-200 rounded animate-pulse w-28"></div>
                            <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredCenters.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-4 text-gray-500"
                      >
                        {debouncedSearchTerm ? `No evacuation operations found for "${debouncedSearchTerm}"` : "No evacuation operations found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCenters.map((center) => (
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
              {filteredCenters.length} of {totalRecords} row(s) shown.
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              rowsPerPage={rowsPerPage}
              totalRows={totalRecords}
              onRowsPerPageChange={handleRowsPerPageChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
