import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { usePageTitle } from "../hooks/usePageTitle";
import DisasterFilterBar from "../components/Disasters/DisasterFilterBar";
import DisasterSection from "../components/Disasters/DisasterSection";
import DisasterFormDialog from "../components/Disasters/DisasterFormDialog";
import ErrorBoundary from "../components/Disasters/ErrorBoundary";
import type { Disaster, DisasterPayload, DisasterTypeWithId } from "@/types/disaster"; // Import new type
import axios from "axios";
import { encodeId } from "@/utils/secureId";
import { selectToken } from "../features/auth/authSlice";

export default function EvacuationInfo() {
  usePageTitle("Evacuation Information");
  const navigate = useNavigate();
  const token = useSelector(selectToken);

  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("All"); // This remains 'string' for display purposes
  const [showEnded, setShowEnded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingDisaster, setEditingDisaster] = useState<Disaster | undefined>();
  const [deleteConfirmDisaster, setDeleteConfirmDisaster] = useState<Disaster | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const today = new Date();
  const [filterMonth, setFilterMonth] = useState<number|null>(today.getMonth()); // 0-11
  const [filterYear, setFilterYear] = useState<number>(today.getFullYear());

  // Changed state type to DisasterTypeWithId[]
  const [disasterTypes, setDisasterTypes] = useState<DisasterTypeWithId[]>([{ id: null, name: "All" }]);

  // Function to fetch all disasters (re-usable)
  const fetchDisasters = async () => {
    setLoading(true);
    try {
      const cachedDisasters = localStorage.getItem("disasters");
      const cachedDisastersTime = localStorage.getItem("disasters_time");

      console.log("fetchDisasters called");
      console.log("Cached disasters:", cachedDisasters ? "exists" : "none");
      console.log("Cache time:", cachedDisastersTime);

      if (cachedDisasters && cachedDisastersTime && Date.now() - Number(cachedDisastersTime) < 1000 * 60 * 5) {
        // use cached data if less than 5 mins old
        console.log("Using cached disasters");
        const parsed = JSON.parse(cachedDisasters);
        console.log("Parsed cached disasters count:", parsed.length);
        setDisasters(parsed);
      } else {
        console.log("Fetching fresh disasters from API...");
        const res = await axios.get("http://localhost:3000/api/v1/disasters", {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log("API response:", res.data);
        
        const transformed: Disaster[] = res.data.data.map((item: any) => ({
          id: item.id,
          name: item.disaster_name,
          type: String(item.disaster_type_name),
          type_id: item.disaster_type_id,
          start_date: item.disaster_start_date,
          end_date: item.disaster_end_date,
          status: item.disaster_end_date ? "Ended" : "Active",
        }));
        
        console.log("Transformed disasters count:", transformed.length);
        setDisasters(transformed);
        localStorage.setItem("disasters", JSON.stringify(transformed));
        localStorage.setItem("disasters_time", String(Date.now()));
        console.log("Fresh disasters cached");
      }
    } catch (err) {
      console.error("Failed to fetch disasters:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch for disasters
  useEffect(() => {
    fetchDisasters();
  }, []);

  useEffect(() => {
    const fetchDisasterTypes = async () => {
      try {
        const cachedTypes = localStorage.getItem("disaster_types_with_id"); // New cache key
        const cachedTypesTime = localStorage.getItem("disaster_types_time");

        if (cachedTypes && cachedTypesTime && Date.now() - Number(cachedTypesTime) < 1000 * 60 * 60) {
          // Parse as DisasterTypeWithId[]
          const parsedCachedTypes: DisasterTypeWithId[] = JSON.parse(cachedTypes);
          setDisasterTypes([{ id: null, name: "All" }, ...parsedCachedTypes]);
        } else {
          const res = await axios.get("http://localhost:3000/api/v1/disasters/types", {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          // Map to include both id and name
          const typesWithId: DisasterTypeWithId[] = res.data.data.map((item: any) => ({
            id: item.id, // Assuming your API returns 'id' for disaster types
            name: item.name,
          }));
          setDisasterTypes([{ id: null, name: "All" }, ...typesWithId]);
          localStorage.setItem("disaster_types_with_id", JSON.stringify(typesWithId)); // Store with new key
          localStorage.setItem("disaster_types_time", String(Date.now()));
        }
      } catch (err) {
        console.error("Failed to fetch disaster types:", err);
      }
    };

    fetchDisasterTypes();
  }, []); // Empty dependency array ensures this runs once on mount

 const handleCreateDisaster = async (payload: DisasterPayload) => {
  try {
    await axios.post("http://localhost:3000/api/v1/disasters", payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log("Disaster created successfully:", payload);
    setCreateOpen(false);
    // Invalidate cache
    localStorage.removeItem("disasters");
    localStorage.removeItem("disasters_time");
    await fetchDisasters();
  } catch (error) {
    console.error("Error creating disaster:", error);
  }
};

const handleUpdateDisaster = async (payload: DisasterPayload) => {
  if (!editingDisaster?.id) {
    console.error("No disaster selected for editing.");
    return;
  }
  try {
    await axios.put(`http://localhost:3000/api/v1/disasters/${editingDisaster.id}`, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log("Disaster updated successfully:", payload);
    setEditOpen(false);
    setEditingDisaster(undefined);
    // Invalidate cache
    localStorage.removeItem("disasters");
    localStorage.removeItem("disasters_time");
    await fetchDisasters();
  } catch (error) {
    console.error("Error updating disaster:", error);
  }
};

const handleDeleteDisaster = async (disaster: Disaster) => {
  try {
    // This will now perform a soft delete (sets deleted_at timestamp)
    await axios.delete(`http://localhost:3000/api/v1/disasters/${disaster.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log("Disaster soft deleted successfully:", disaster.id);
    setDeleteConfirmDisaster(null);
    
    // Force refresh by clearing cache and fetching fresh data
    console.log("Clearing cache and refreshing disasters...");
    localStorage.removeItem("disasters");
    localStorage.removeItem("disasters_time");
    
    // Force immediate refresh
    await fetchDisasters();
    
    console.log("Cache cleared and disasters refreshed");
  } catch (error) {
    console.error("Error soft deleting disaster:", error);
    // You could add user notification here if needed
  }
};

  // Filtering logic for month and year
const filterDisastersByDate = (disaster: Disaster) => {
  const startDate = new Date(disaster.start_date);
  return (
    (filterMonth === null || startDate.getMonth() === filterMonth) &&
    startDate.getFullYear() === filterYear
  );
};

  const activeDisasters = disasters.filter((d) =>
    d.end_date === null &&
    (typeFilter === "All" || d.type === typeFilter) &&
    filterDisastersByDate(d)
  );

  const endedDisasters = disasters.filter((d) =>
    d.end_date !== null &&
    (typeFilter === "All" || d.type === typeFilter) &&
    filterDisastersByDate(d)
  );

const navigateToDetail = (d: Disaster) => {
  const encoded = encodeId(d.id);
  console.log("Encoded Disaster ID:", encoded, d.id);

  navigate(`/evacuation-information/${encoded}`);
};

  return (
    <ErrorBoundary>
      <div className="text-black p-6 space-y-6">
        <h1 className="text-3xl font-bold text-green-800">Evacuation Information</h1>

       <DisasterFilterBar
            disasterTypes={disasterTypes.map(t => t.name)}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            onRecordNew={() => setCreateOpen(true)}
            // Pass month and year states and the setter to DisasterFilterBar
            month={filterMonth}
            year={filterYear}
            onMonthYearChange={(newMonth, newYear) => {
              setFilterMonth(newMonth);
              setFilterYear(newYear);
            }}
          />

        <div className="mt-2 space-y-10">
          <DisasterSection
            title="Active Disasters"
            disasters={activeDisasters}
            onEdit={(d) => {
              setEditingDisaster(d);
              setEditOpen(true);
            }}
            onNavigate={navigateToDetail}
            onDelete={(d) => setDeleteConfirmDisaster(d)}
            emptyMessage="No active disasters."
            loading={loading}
          />

          <DisasterSection
            title="Ended Disasters"
            disasters={endedDisasters}
            collapsible
            collapsed={!showEnded}
            onToggle={() => setShowEnded((v) => !v)}
            onEdit={(d) => {
              setEditingDisaster(d);
              setEditOpen(true);
            }}
            onNavigate={navigateToDetail}
            onDelete={(d) => setDeleteConfirmDisaster(d)}
            emptyMessage="No ended disasters."
            loading={loading}
          />
        </div>

        <DisasterFormDialog
          mode="create"
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSave={handleCreateDisaster} // Use the new handler
          disasterTypes={disasterTypes.filter(t => t.id !== null)} // Pass only actual types, not "All"
        />

        <DisasterFormDialog
          mode="edit"
          disaster={editingDisaster}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSave={handleUpdateDisaster} // Use the new handler
          disasterTypes={disasterTypes.filter(t => t.id !== null)} // Pass only actual types, not "All"
        />

        {/* Delete Confirmation Modal */}
        {deleteConfirmDisaster && (
          <div 
            className='fixed inset-0 flex items-center justify-center z-50'
            style={{
              background: 'rgba(211, 211, 211, 0.80)'
            }}
          >
            <div className='bg-white rounded-lg p-6 w-[400px] shadow-lg'>
              {/* Modal Header */}
              <div className='flex items-center justify-between mb-4'>
                <h2 
                  className='text-xl font-bold'
                  style={{ color: '#DC2626' }}
                >
                  Delete Disaster
                </h2>
                <button
                  onClick={() => setDeleteConfirmDisaster(null)}
                  className='hover:bg-gray-100 p-1 rounded'
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="17" viewBox="0 0 16 17" fill="none">
                    <g opacity="0.7">
                      <path d="M12 4.5L4 12.5" stroke="#020617" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 4.5L12 12.5" stroke="#020617" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                    </g>
                  </svg>
                </button>
              </div>
              
              {/* Modal Content */}
              <div className='mb-6'>
                <p className='text-gray-700 mb-2'>
                  Are you sure you want to delete this disaster?
                </p>
                <div className='bg-gray-50 p-3 rounded-md'>
                  <p className='font-medium text-gray-900'>
                    {deleteConfirmDisaster.name}
                  </p>
                  <p className='text-sm text-gray-600'>
                    {deleteConfirmDisaster.type}
                  </p>
                </div>
                <p className='text-sm text-red-600 mt-2'>
                  This action cannot be undone. All associated evacuation data will be lost.
                </p>
              </div>
              
              {/* Modal Footer */}
              <div className='flex justify-end gap-3'>
                <button
                  onClick={() => setDeleteConfirmDisaster(null)}
                  className='px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none'
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteDisaster(deleteConfirmDisaster)}
                  className='px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none'
                >
                  Delete Disaster
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}