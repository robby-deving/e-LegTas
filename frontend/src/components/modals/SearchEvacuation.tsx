import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useEffect, useState } from "react";
import axios from "axios";
import { useDebounce } from "@/hooks/useDebounce";
import { useSelector } from "react-redux";
import { selectUserId, selectToken, selectIsAuthenticated } from "@/features/auth/authSlice";
import { disasterService } from "@/services/disasterService";
import type { DisasterEventPayload } from "@/types/disaster";
interface EvacuationCenter {
  id: number;
  name: string;
  barangay_name: string;
  status: 'Active' | 'Inactive' | 'Ended';
  event_id: number | null;
  address: string;
}

interface SearchEvacuationProps {
  isOpen: boolean;
  onClose: () => void;
  disasterId: number | string;
  onSelectEvacuation: (evacuation: EvacuationCenter) => void;
}

export const SearchEvacuation = ({
  isOpen,
  onClose,
  disasterId,
  onSelectEvacuation,
}: SearchEvacuationProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<EvacuationCenter[]>([]);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInactiveWarning, setShowInactiveWarning] = useState(false);
  const [selectedEvacuation, setSelectedEvacuation] = useState<EvacuationCenter | null>(null);
  const userId = useSelector(selectUserId);
  const token = useSelector(selectToken);
  const isAuthenticated = useSelector(selectIsAuthenticated);


  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  };
  useEffect(() => {
    const searchEvacuations = async () => {
      if (!debouncedSearch.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await axios.get<{ data: EvacuationCenter[] }>('/api/v1/evacuation-centers/search', {
          params: {
            disasterId,
            search: debouncedSearch
          },
          headers: getAuthHeaders()
        });
        setResults(response.data.data || []);
      } catch (error) {
        console.error('Error searching evacuations:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    searchEvacuations();
  }, [debouncedSearch, disasterId]);

  const handleEvacuationClick = (evacuation: EvacuationCenter) => {
    if (evacuation.status === 'Ended') {
      return; // Do nothing for ended evacuations
    }
    
    if (evacuation.status === 'Inactive') {
      setSelectedEvacuation(evacuation);
      setShowInactiveWarning(true);
      return;
    }

    // For active evacuations, directly select them
    onSelectEvacuation(evacuation);
    onClose();
  };

  const handleActivate = async (evacuation: EvacuationCenter) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!isAuthenticated || !token) {
        throw new Error('Authentication required. Please log in to continue.');
      }

      if (!disasterId || !evacuation.id || !userId) {
        throw new Error('Missing required information for activation.');
      }

      const disasterEventData: DisasterEventPayload = {
        disaster_id: Number(disasterId),
        assigned_user_id: userId,
        evacuation_center_id: evacuation.id,
        evacuation_start_date: new Date().toISOString(),
        evacuation_end_date: null
      };

      const response = await disasterService.createDisasterEvent(disasterEventData, token);

      // Get the created disaster event data
      const createdEvent = response.data;
      if (!createdEvent || !createdEvent.id) {
        throw new Error('Failed to get created disaster event ID.');
      }

      evacuation.event_id = createdEvent.id;
      onSelectEvacuation(evacuation);
      onClose();

    } catch (err) {
      console.error('Failed to activate evacuation operation:', err);
      setError(err instanceof Error ? err.message : 'Failed to activate evacuation operation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-green-700 text-xl font-bold">
            Search Evacuation
          </DialogTitle>
          <DialogDescription>
            Search for an evacuation by name. Select one to view details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <Input
            placeholder="Search Evacuation"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
            autoFocus
          />

          {isSearching ? (
            <div className="text-center py-4">
              <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-green-700 border-r-transparent"></div>
              <span className="ml-2 text-sm text-gray-500">Searching...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300">
              {results.map((evacuation) => (
                <div
                  key={evacuation.id}
                  onClick={() => handleEvacuationClick(evacuation)}
                  className={`flex items-center justify-between p-3 rounded-lg border border-gray-100 ${
                    evacuation.status !== 'Ended' ? 'cursor-pointer hover:bg-gray-50' : 'opacity-70'
                  }`}
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{evacuation.name}</h3>
                    <p className="text-xs text-gray-500">Bgy. {evacuation.barangay_name}</p>
                    {evacuation.address && (
                      <p className="text-xs text-gray-500">{evacuation.address}</p>
                    )}
                  </div>
                  <div className="ml-4">
                    {evacuation.status === 'Inactive' ? (
                      <span className="bg-green-700 text-white text-xs rounded px-4 py-1">
                        Activate
                      </span>
                    ) : evacuation.status === 'Active' ? (
                      <span className="bg-[#0192D4] text-white text-xs rounded px-4 py-1">
                        Active
                      </span>
                    ) : (
                      <span className="bg-[#BE1E2D] text-white text-xs rounded px-4 py-1">
                        Ended
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="text-red-500 text-center text-sm py-4">{error}</p>
          ) : searchTerm.trim() ? (
            <p className="text-gray-500 text-center text-sm py-4">No results found</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="px-6 cursor-pointer"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showInactiveWarning} onOpenChange={setShowInactiveWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Inactive Evacuation Center</AlertDialogTitle>
          <AlertDialogDescription>
            This evacuation center is currently inactive. You need to activate it before proceeding.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setShowInactiveWarning(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (selectedEvacuation) {
                handleActivate(selectedEvacuation);
                setShowInactiveWarning(false);
              }
            }}
            className="bg-green-700 hover:bg-green-800"
            disabled={isLoading}
          >
            {isLoading ? 'Activating...' : 'Activate Now'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};
