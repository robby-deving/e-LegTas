import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { useDisasters } from "../hooks/useDisasters";
import DisasterFilterBar from "../components/Disasters/DisasterFilterBar";
import DisasterSection from "../components/Disasters/DisasterSection";
import DisasterFormDialog from "../components/Disasters/DisasterFormDialog";
import ErrorBoundary from "../components/Disasters/ErrorBoundary";
import LoadingSpinner from "../components/loadingSpinner";
import ActivateScreen from "../components/ActivateScreen";
import type { Disaster, DisasterPayload } from "@/types/disaster";
import { encodeId } from "@/utils/secureId";
import { usePermissions } from "../contexts/PermissionContext";
import { useSelector } from "react-redux";
import { selectUserId, selectToken } from "../features/auth/authSlice";
import { disasterService } from "../services/disasterService";

/**
 * Note: While the UI displays "Incident", we use "Disaster" in our
 * codebase for consistency with our data models and APIs.
 */

export default function EvacuationInfo() {
  usePageTitle("Evacuation Information");
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const currentUserId = useSelector(selectUserId);
  const token = useSelector(selectToken);

  const {
    disasters,
    disasterTypes,
    loading,
    creating,
    updating,
    deleting,
    error,
    fetchDisastersByMonthYear,
    createDisaster: createDisasterApi,
    updateDisaster: updateDisasterApi,
    deleteDisaster: deleteDisasterApi,
  } = useDisasters();

  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [showEnded, setShowEnded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingDisaster, setEditingDisaster] = useState<Disaster | undefined>();
  const [deleteConfirmDisaster, setDeleteConfirmDisaster] = useState<Disaster | null>(null);
  const [assignedEvacuationCenterId, setAssignedEvacuationCenterId] = useState<number | null>(null);
  const [showActivateScreen, setShowActivateScreen] = useState(false);
  const [selectedDisasterForActivation, setSelectedDisasterForActivation] = useState<Disaster | null>(null);

  const today = new Date();
  const [filterMonth, setFilterMonth] = useState<number | null>(today.getMonth()); // 0-11
  const [filterYear, setFilterYear] = useState<number>(today.getFullYear());

  // Initial fetch for disasters based on current filter
  useEffect(() => {
    fetchDisastersByMonthYear(filterMonth, filterYear);
  }, [filterMonth, filterYear, fetchDisastersByMonthYear]);

  // Fetch assigned evacuation center if user has specific permission
  useEffect(() => {
    const fetchAssignedEvacuationCenter = async () => {
      if (hasPermission("view_only_specific_dashboard_evacuation") && currentUserId) {
        try {
          if (!token) {
            console.warn("No authentication token found in Redux store");
            setAssignedEvacuationCenterId(null);
            return;
          }
          const evacuationCenterId = await disasterService.fetchAssignedEvacuationCenter(currentUserId, token);
          setAssignedEvacuationCenterId(evacuationCenterId);
          console.log("Assigned evacuation center ID:", evacuationCenterId);
        } catch (error) {
          console.error("Error fetching assigned evacuation center:", error);
          setAssignedEvacuationCenterId(null);
        }
      }
    };

    fetchAssignedEvacuationCenter();
  }, [hasPermission, currentUserId, token]);

 const handleCreateDisaster = async (payload: DisasterPayload) => {
  try {
    await createDisasterApi(payload);
    setCreateOpen(false);
    // Refetch disasters for current filter
    await fetchDisastersByMonthYear(filterMonth, filterYear);
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
    await updateDisasterApi(editingDisaster.id, payload);
    setEditOpen(false);
    setEditingDisaster(undefined);
    // Refetch disasters for current filter
    await fetchDisastersByMonthYear(filterMonth, filterYear);
  } catch (error) {
    console.error("Error updating disaster:", error);
  }
};

const handleDeleteDisaster = async (disaster: Disaster) => {
  try {
    // This will now perform a soft delete (sets deleted_at timestamp)
    await deleteDisasterApi(disaster.id);

    console.log("Disaster soft deleted successfully:", disaster.id);
    setDeleteConfirmDisaster(null);

    // Refetch disasters for current filter
    await fetchDisastersByMonthYear(filterMonth, filterYear);

    console.log("Disasters refreshed after deletion");
  } catch (error) {
    console.error("Error soft deleting disaster:", error);
    // You could add user notification here if needed
  }
};

  // Filter disasters by type only (month/year filtering is done by API)
  const activeDisasters = disasters.filter((d) =>
    d.end_date === null &&
    (typeFilter === "All" || d.type === typeFilter)
  );

  const endedDisasters = disasters.filter((d) =>
    d.end_date !== null &&
    (typeFilter === "All" || d.type === typeFilter)
  );

const navigateToDetail = async (d: Disaster) => {
  const encoded = encodeId(d.id);
  console.log("Encoded Disaster ID:", encoded, d.id);

  // For users with specific evacuation center permission, check if disaster event exists
  if (hasPermission("view_only_specific_dashboard_evacuation") && assignedEvacuationCenterId && token) {
    try {
      console.log("Checking disaster event for disaster:", d.id, "and evacuation center:", assignedEvacuationCenterId);

      const disasterEventCheck = await disasterService.checkDisasterEventByEvacuationCenter(
        d.id,
        assignedEvacuationCenterId,
        token
      );

      if (disasterEventCheck.exists && disasterEventCheck.data) {
        // Disaster event exists, navigate with disaster event ID
        const encodedDisasterEventId = encodeId(disasterEventCheck.data.id);
        console.log("Navigating to existing disaster event:", d.id, assignedEvacuationCenterId, disasterEventCheck.data.id);
        navigate(`/evacuation-information/${encoded}/${encodedDisasterEventId}`);
      } else {
        // No disaster event exists, show activate screen
        console.log("No disaster event found, showing activate screen for:", d.id, assignedEvacuationCenterId);
        setSelectedDisasterForActivation(d);
        setShowActivateScreen(true);
      }
    } catch (error) {
      console.error("Error checking disaster event:", error);
      // On error, fall back to normal navigation
      navigate(`/evacuation-information/${encoded}`);
    }
  } else {
    // No specific permission or no assigned center, navigate normally
    navigate(`/evacuation-information/${encoded}`);
  }
};

  // Show activate screen if needed
  if (showActivateScreen && selectedDisasterForActivation && assignedEvacuationCenterId && currentUserId) {
    return (
        <ActivateScreen
          disasterId={selectedDisasterForActivation.id}
          evacuationCenterId={assignedEvacuationCenterId}
          userId={currentUserId}
        />
    );
  }

  return (
    <ErrorBoundary>
      <div className="text-black p-6 space-y-6">
        <h1 className="text-3xl font-bold text-green-800">Evacuation Information</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner text="Loading disasters..." size="lg" />
          </div>
        ) : (
          <>
            <DisasterFilterBar
            disasterTypes={disasterTypes.map(t => t.name)}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            onRecordNew={() => setCreateOpen(true)}
            month={filterMonth}
            year={filterYear}
            onMonthYearChange={(newMonth, newYear) => {
              setFilterMonth(newMonth);
              setFilterYear(newYear);
            }}
          />

        <div className="mt-2 space-y-10">
          <DisasterSection
            title="Active Incidents"
            disasters={activeDisasters}
            onEdit={(d) => {
              setEditingDisaster(d);
              setEditOpen(true);
            }}
            onNavigate={navigateToDetail}
            onDelete={(d) => setDeleteConfirmDisaster(d)}
            emptyMessage="No active Incidents."
            loading={loading}
          />

          <DisasterSection
            title="Ended Incidents"
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
          onSave={handleCreateDisaster}
          disasterTypes={disasterTypes.filter(t => t.id !== null)}
          loading={creating}
        />

        <DisasterFormDialog
          mode="edit"
          disaster={editingDisaster}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSave={handleUpdateDisaster}
          disasterTypes={disasterTypes.filter(t => t.id !== null)}
          loading={updating}
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
                  disabled={deleting}
                  className='px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
                >
                  {deleting && <LoadingSpinner size="sm" />}
                  {deleting ? "Deleting..." : "Delete Incident"}
                </button>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}