import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from 'lucide-react';
import activateIcon from '@/assets/protectIcon.svg';
import { disasterService } from '@/services/disasterService';
import type { DisasterEventPayload } from '@/types/disaster';
import LoadingSpinner from '@/components/loadingSpinner';
import { selectToken, selectIsAuthenticated } from '@/features/auth/authSlice';
import type { RootState } from '@/store';
import { encodeId } from '@/utils/secureId';

interface ActivateScreenProps {
  disasterId: number;
  evacuationCenterId: number;
  userId: number;
}

const ActivateScreen: React.FC<ActivateScreenProps> = ({
  disasterId,
  evacuationCenterId,
  userId
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Get auth state from Redux
  const token = useSelector((state: RootState) => selectToken(state));
  const isAuthenticated = useSelector((state: RootState) => selectIsAuthenticated(state));

  const handleActivate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!isAuthenticated || !token) {
        throw new Error('Authentication required. Please log in to continue.');
      }

      if (!disasterId || !evacuationCenterId || !userId) {
        throw new Error('Missing required information for activation.');
      }

      const disasterEventData: DisasterEventPayload = {
        disaster_id: disasterId,
        assigned_user_id: userId,
        evacuation_center_id: evacuationCenterId,
        evacuation_start_date: new Date().toISOString(),
        evacuation_end_date: null
      };

      const response = await disasterService.createDisasterEvent(disasterEventData, token);

      // Get the created disaster event data
      const createdEvent = response.data;
      if (!createdEvent || !createdEvent.id) {
        throw new Error('Failed to get created disaster event ID.');
      }

      // Encode the IDs for navigation
      const encodedDisasterId = encodeId(disasterId);
      const encodedDisasterEventId = encodeId(createdEvent.id);

      console.log('Navigating to evacuation information:', encodedDisasterId, encodedDisasterEventId);
      navigate(`/evacuation-information/${encodedDisasterId}/${encodedDisasterEventId}`);
    } catch (err) {
      console.error('Failed to activate evacuation operation:', err);
      setError(err instanceof Error ? err.message : 'Failed to activate evacuation operation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Main Content */}
      <div className="flex flex-col gap-5 p-8 w-full">
      {/* Breadcrumb Navigation */}
      <div className="bg-gray-100 h-3 rounded-md w-32" />

      {/* Main Content Grid */}
      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Summary Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="bg-gray-100 h-5 rounded-md w-16" />
            </div>
            <div className="bg-white rounded-lg border p-4 flex items-center justify-center">
              <div className="bg-gray-100 h-6 rounded-md w-36" />
            </div>
            <div className="bg-gray-100 h-3 rounded-md w-32" />
          </div>

          {/* Right Column - Card Section */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="bg-gray-100 h-6 rounded-md w-60" />
            </CardHeader>
            <CardContent>
              <CardDescription className="bg-gray-100 h-2.5 rounded-md w-36" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-4">
          <Input
            placeholder="Search..."
            className="flex-1 h-9"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
          <div className="bg-gray-300 h-5 rounded-md w-20" />

          </div>
          <div className="flex gap-2">
          <div className="bg-gray-300 h-5 rounded-md w-20" />
          <div className="bg-gray-300 h-5 rounded-md w-20" />
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-64"> <div className="bg-gray-200 h-3 rounded-md w-14" /></TableHead>
                <TableHead className="w-64"> <div className="bg-gray-200 h-3 rounded-md w-14" /></TableHead>
                <TableHead className="w-48"> <div className="bg-gray-200 h-3 rounded-md w-14" /></TableHead>
                <TableHead className="w-48"> <div className="bg-gray-200 h-3 rounded-md w-14" /></TableHead>
                <TableHead className="w-48"> <div className="bg-gray-200 h-3 rounded-md w-14" /></TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Sample rows */}       
              {Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="bg-gray-100 h-3 rounded-md w-24" />
                  </TableCell>
                  <TableCell>
                    <div className="bg-gray-100 h-3 rounded-md w-20" />
                  </TableCell>
                  <TableCell>
                    <div className="bg-gray-100 h-3 rounded-md w-16" />
                  </TableCell>
                  <TableCell>
                    <div className="bg-gray-100 h-3 rounded-md w-18" />
                  </TableCell>
                  <TableCell>
                    <div className="bg-gray-100 h-3 rounded-md w-14" />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-2 py-4">
          <div className="text-sm text-muted-foreground">
            <span className="bg-gray-100 h-5 rounded-md w-32 inline-block" />
          </div>

          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              <span className="bg-gray-100 h-5 rounded-md w-24 inline-block" />
            </div>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" disabled>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Overlay with Activate Button */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-xs flex items-center justify-center z-10">
        <div className="bg-white/90 backdrop-blur-md rounded-lg p-8 shadow-2xl border border-white/20">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
          <Button
            onClick={handleActivate}
            disabled={isLoading || !isAuthenticated}
            className="bg-[#0C955B] hover:bg-[#0C955B] text-white font-semibold px-8 py-4 text-lg rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            size="lg"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                Activating...
              </div>
            ) : (
              <>
                <img src={activateIcon} alt="Activate" className="w-5 h-5 mr-2" />
                Activate Evacuation Operation
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ActivateScreen;
