import React from 'react';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import searchIcon from '../../assets/search.svg';
import type { EvacuationCenter } from '@/types/EvacuationCenter';

interface MapSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  evacuationCenters: EvacuationCenter[];
  onCenterOnMap: (center: EvacuationCenter) => void;
  className?: string;
}

export default function MapSearch({ searchQuery, onSearchChange, evacuationCenters, onCenterOnMap, className = '' }: MapSearchProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  const handleClearSearch = () => {
    onSearchChange('');
  };

  // Use the filtered centers passed from parent (GISMap)
  // No need for additional filtering since it's already filtered

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <img src={searchIcon} alt="Search" className="absolute left-3 top-1/2 transform -translate-y-1/2 z-50 cursor-pointer" />
        <Input
          type="text"
          placeholder="Search evacuation centers, barangays..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="pl-10 py-2 w-full bg-white/95 backdrop-blur-sm border-gray-300 shadow-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg"
        />
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {searchQuery && evacuationCenters.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2 text-xs text-gray-500 border-b border-gray-100">
          showing {evacuationCenters.slice(0, 5).length} of {evacuationCenters.length} result{evacuationCenters.length !== 1 ? 's' : ''} found 
          </div>
          {evacuationCenters.slice(0, 5).map((center) => (
            <button
              key={center.id}
              onClick={() => onCenterOnMap(center)}
              className="w-full text-left p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between ">
                    <div className="font-semibold text-sm text-gray-900 truncate">
                    {center.name}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      center.ec_status === 'Available'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {center.ec_status}
                    </span>
                    </div>

                  <div className="text-xs text-gray-500 truncate">
                    {center.address}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">
                      {center.category}
                    </span>
                  </div>
                </div>

              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {searchQuery && evacuationCenters.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3 z-50">
          <div className="text-sm text-gray-500 text-center">
            No evacuation centers found matching "{searchQuery}"
          </div>
        </div>
      )}
    </div>
  );
}
