import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import DisasterFilterBar from "../components/Disasters/DisasterFilterBar";
import DisasterSection from "../components/Disasters/DisasterSection";
import DisasterFormDialog from "../components/Disasters/DisasterFormDialog";
import ErrorBoundary from "../components/Disasters/ErrorBoundary";
import type { Disaster, DisasterPayload, DisasterTypeWithId } from "@/types/disaster"; // Import new type
import axios from "axios";
import { encodeId } from "@/utils/secureId";

export default function EvacuationInfo() {
  usePageTitle("Evacuation Information");
  const navigate = useNavigate();

  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("All"); // This remains 'string' for display purposes
  const [showEnded, setShowEnded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingDisaster, setEditingDisaster] = useState<Disaster | undefined>();
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

      if (cachedDisasters && cachedDisastersTime && Date.now() - Number(cachedDisastersTime) < 1000 * 60 * 5) {
        // use cached data if less than 5 mins old
        setDisasters(JSON.parse(cachedDisasters));
      } else {
        const res = await axios.get("http://localhost:3000/api/v1/disasters");
        const transformed: Disaster[] = res.data.data.map((item: any) => ({
          id: item.id,
          name: item.disaster_name,
          type: String(item.disaster_type_name),
          type_id: item.disaster_type_id,
          start_date: item.disaster_start_date,
          end_date: item.disaster_end_date,
          status: item.disaster_end_date ? "Ended" : "Active",
        }));
        setDisasters(transformed);
        localStorage.setItem("disasters", JSON.stringify(transformed));
        localStorage.setItem("disasters_time", String(Date.now()));
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
          const res = await axios.get("http://localhost:3000/api/v1/disasters/types");
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
    await axios.post("http://localhost:3000/api/v1/disasters", payload);
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
    await axios.put(`http://localhost:3000/api/v1/disasters/${editingDisaster.id}`, payload);
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
      </div>
    </ErrorBoundary>
  );
}
