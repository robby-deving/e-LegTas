import React, { useState, useEffect } from 'react';
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { EvacuationCenterCategory } from '../../types/evacuation';
import { evacuationCenterService } from '../../services/evacuationCenterService';

const CATEGORIES: EvacuationCenterCategory[] = [
  'School',
  'Covered Court',
  'Barangay Hall',
  'Community Center',
  'Chapel/Church',
  'Dedicated Evacuation Center',
  'Government Building',
  'Commercial Building'
];

interface Barangay {
  id: number;
  name: string;
}

interface EvacuationCenterFormData {
  name: string;
  category: string;
  streetName: string;
  barangay: string;
  barangayId: number;
  latitude: string;
  longitude: string;
  total_capacity: string;  // Added this field
}

interface EvacuationCenterFormProps {
  formData: EvacuationCenterFormData;
  onFormChange: (field: string, value: string | number) => void;
  errors?: Partial<Record<keyof EvacuationCenterFormData, string>>;
}

export function EvacuationCenterForm({ formData, onFormChange, errors }: EvacuationCenterFormProps) {
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBarangays = async () => {
      try {
        setLoading(true);
        const data = await evacuationCenterService.getBarangays();
        setBarangays(data);
      } catch (error) {
        console.error('Failed to fetch barangays:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBarangays();
  }, []);

  const handleBarangayChange = (barangayName: string) => {
    const selectedBarangay = barangays.find(b => b.name === barangayName);
    onFormChange('barangay', barangayName);
    onFormChange('barangayId', selectedBarangay?.id || 0);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Name *</label>
        <Input
          placeholder="Evacuation Center Name"
          value={formData.name}
          onChange={(e) => onFormChange('name', e.target.value)}
          className={errors?.name ? 'border-red-500' : ''}
        />
        {errors?.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Category *</label>
        <Select 
          value={formData.category} 
          onValueChange={(value) => onFormChange('category', value)}
        >
          <SelectTrigger className={`w-full ${errors?.category ? 'border-red-500' : ''}`}>
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Street Name *</label>
        <Input
          placeholder="Street Name"
          value={formData.streetName}
          onChange={(e) => onFormChange('streetName', e.target.value)}
          className={errors?.streetName ? 'border-red-500' : ''}
        />
        {errors?.streetName && <p className="text-red-500 text-sm mt-1">{errors.streetName}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Barangay *</label>
        <Select 
          value={formData.barangay} 
          onValueChange={handleBarangayChange}
          disabled={loading}
        >
          <SelectTrigger className={`w-full ${errors?.barangay ? 'border-red-500' : ''}`}>
            <SelectValue placeholder={loading ? "Loading barangays..." : "Select Barangay"} />
          </SelectTrigger>
          <SelectContent>
            {barangays.map((barangay) => (
              <SelectItem key={barangay.id} value={barangay.name}>
                {barangay.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.barangay && <p className="text-red-500 text-sm mt-1">{errors.barangay}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Latitude *</label>
          <Input
            type="number"
            step="any"
            placeholder="0.00000"
            value={formData.latitude}
            onChange={(e) => onFormChange('latitude', e.target.value)}
            className={errors?.latitude ? 'border-red-500' : ''}
          />
          {errors?.latitude && <p className="text-red-500 text-sm mt-1">{errors.latitude}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Longitude *</label>
          <Input
            type="number"
            step="any"
            placeholder="0.00000"
            value={formData.longitude}
            onChange={(e) => onFormChange('longitude', e.target.value)}
            className={errors?.longitude ? 'border-red-500' : ''}
          />
          {errors?.longitude && <p className="text-red-500 text-sm mt-1">{errors.longitude}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Capacity</label>
        <Input
          type="number"
          placeholder="Total Capacity"
          value={formData.total_capacity}
          onChange={(e) => onFormChange('total_capacity', e.target.value)}
          className={errors?.total_capacity ? 'border-red-500' : ''}
        />
        {errors?.total_capacity && <p className="text-red-500 text-sm mt-1">{errors.total_capacity}</p>}
      </div>
    </div>
  );
}