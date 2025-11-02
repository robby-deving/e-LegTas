//AddService.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import { evacueesApi } from "@/services/evacuees";

interface AddServiceProps {
  onValueChange?: (value: string) => void;
  familyId: number;
  eventId: number;
  token: string;
  addedBy: number;
  onSuccess?: () => void;
  evacuationOperationStatus?: boolean;
  placeholder?: string;
  className?: string;
  showLabel?: boolean;
}

const STORAGE_KEY = 'service-suggestions';

export const AddService: React.FC<AddServiceProps> = ({
  onValueChange,
  familyId,
  eventId,
  token,
  addedBy,
  onSuccess,
  placeholder = "Enter service name",
  className,
  showLabel = true,
  evacuationOperationStatus = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Load suggestions from localStorage on component mount
  useEffect(() => {
    const storedSuggestions = localStorage.getItem(STORAGE_KEY);
    if (storedSuggestions) {
      setSuggestions(JSON.parse(storedSuggestions));
    }
  }, []);

  // Handle clicks outside of the component to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const addToSuggestions = (value: string) => {
    if (!value.trim()) return;
    
    const newSuggestions = Array.from(new Set([...suggestions, value.trim()]));
    setSuggestions(newSuggestions);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSuggestions));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    onValueChange?.(value);

    // Filter and sort suggestions based on input
    if (value.trim()) {
      const filtered = suggestions
        .filter(item => item.toLowerCase().includes(value.toLowerCase()))
        .sort((a, b) => {
          // Exact matches first
          const aLower = a.toLowerCase();
          const bLower = b.toLowerCase();
          const searchLower = value.toLowerCase();
          
          const aExact = aLower === searchLower;
          const bExact = bLower === searchLower;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          
          // Then starts with matches
          const aStarts = aLower.startsWith(searchLower);
          const bStarts = bLower.startsWith(searchLower);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          
          // Then by closest position of match
          const aIndex = aLower.indexOf(searchLower);
          const bIndex = bLower.indexOf(searchLower);
          return aIndex - bIndex;
        });

      // If there's an exact match, auto-select it
      const exactMatch = filtered.find(item => 
        item.toLowerCase() === value.toLowerCase()
      );
      if (exactMatch) {
        console.log('Found exact match:', exactMatch);
        selectSuggestion(exactMatch, 'exact-match');
        return;
      }

      setFilteredSuggestions(filtered);
      setShowSuggestions(true);
      // Reset selection index when filtering changes
      setSelectedIndex(-1);
    } else {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const [selectedIndex, setSelectedIndex] = useState(-1);

  const selectSuggestion = (suggestion: string, source: 'click' | 'keyboard' | 'exact-match' = 'click') => {
    console.log('Selecting suggestion:', { suggestion, source });
    // Immediately update the input value
    setInputValue(suggestion);
    onValueChange?.(suggestion);
    // Close the suggestions dropdown
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleSuggestionClick = (suggestion: string) => {
    console.log('Mouse click on suggestion:', suggestion);
    selectSuggestion(suggestion, 'click');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > -1 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          selectSuggestion(filteredSuggestions[selectedIndex], 'keyboard');
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleInputBlur = () => {
    // Only hide suggestions after a short delay to allow for clicking them
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 200);
  };

  const handleSubmit = async () => {
    if (!inputValue.trim() || isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      const valueToSubmit = inputValue.trim();
      
      await evacueesApi.addService({
        disaster_evacuation_event_id: eventId,
        family_id: familyId,
        service_received: valueToSubmit,
        added_by: addedBy
      }, token);

      // Add to suggestions only on successful submission
      addToSuggestions(valueToSubmit);
      setInputValue('');
      setShowSuggestions(false);
      toast.success('Service added successfully');
      onSuccess?.();

    } catch (error) {
      console.error('Failed to submit service:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
  <div className={cn("space-y-1.5", className)}>
    {showLabel && (                              
      <Label htmlFor="service-input" className="text-sm font-medium">
        Services
      </Label>
    )}                                          
    <div className="relative">
        <div ref={wrapperRef} className="mt-1.5 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Input
              id="service-input"
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={handleInputBlur}
              placeholder={placeholder}
              className="w-full"
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-60 overflow-auto">
                {filteredSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={cn(
                      "px-4 py-2 hover:bg-gray-100 cursor-pointer",
                      selectedIndex === index && "bg-gray-100"
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSuggestionClick(suggestion);
                    }}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || isSubmitting || (evacuationOperationStatus ?? false)}
              className="bg-green-700 hover:bg-green-800 text-white shrink-0"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Add'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddService;
