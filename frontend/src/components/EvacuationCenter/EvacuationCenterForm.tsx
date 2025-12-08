import { useState, useEffect } from 'react';
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { EvacuationCenterCategory } from '../../types/evacuation';
import { evacuationCenterService } from '../../services/evacuationCenterService';
import { usePermissions } from '../../contexts/PermissionContext';
import { validateString, validateNumeric } from '../../utils/validateInput';

// Validation function for the entire form - to be used by parent component
export function validateEvacuationCenterForm(formData: EvacuationCenterFormData): Partial<Record<keyof EvacuationCenterFormData, string>> {
  const errors: Partial<Record<keyof EvacuationCenterFormData, string>> = {};

  // Validate name
  const nameValidation = validateString(formData.name, { minLength: 1, maxLength: 100 });
  if (!nameValidation.isValid) {
    errors.name = nameValidation.error;
  }

  // Validate category
  if (!formData.category) {
    errors.category = 'Please select a category';
  }

  // Validate street name
  const streetNameValidation = validateString(formData.streetName, { minLength: 1, maxLength: 100 });
  if (!streetNameValidation.isValid) {
    errors.streetName = streetNameValidation.error;
  }

  // Validate barangay
  if (!formData.barangay || !formData.barangayId) {
    errors.barangay = 'Please select a barangay';
  }

  // Validate latitude and longitude for non-private house categories
  if (formData.category !== 'Private House') {
    if (!formData.latitude) {
      errors.latitude = 'Latitude is required';
    } else {
      const lat = parseFloat(formData.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.latitude = 'Latitude must be between -90 and 90';
      }
    }

    if (!formData.longitude) {
      errors.longitude = 'Longitude is required';
    } else {
      const lng = parseFloat(formData.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.longitude = 'Longitude must be between -180 and 180';
      }
    }
  }

  // Validate total capacity if provided
  if (formData.total_capacity !== undefined && formData.total_capacity !== '') {
    const capacityValidation = validateNumeric(formData.total_capacity, { min: 0, max: 10000 });
    if (!capacityValidation.isValid) {
      errors.total_capacity = capacityValidation.error;
    }
  }

  return errors;
}

const CATEGORIES: EvacuationCenterCategory[] = [
  'School',
  'Chapel/Church',
  'Dedicated Evacuation Center',
  'Government Building',
  'Commercial Building',
  'Private House'
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
  ec_status: string;
}

interface EvacuationCenterFormProps {
  formData: EvacuationCenterFormData;
  onFormChange: (field: string, value: string | number) => void;
  errors?: Partial<Record<keyof EvacuationCenterFormData, string>>;
}

export function EvacuationCenterForm({ formData, onFormChange, errors }: EvacuationCenterFormProps) {
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [loading, setLoading] = useState(false);
  const { hasPermission } = usePermissions();
  const canAddOutsideEC = hasPermission('add_outside_ec');


  // Filter categories based on permission - users with add_outside_ec can see Private House, others cannot
  const baseCategories: EvacuationCenterCategory[] = canAddOutsideEC
    ? CATEGORIES.filter(category => category === 'Private House')
    : CATEGORIES.filter(category => category !== 'Private House');

  // Ensure the current category is available in the list (e.g., when editing a Private House as an admin)
  const availableCategories = formData.category && 
    !baseCategories.includes(formData.category as EvacuationCenterCategory) && 
    CATEGORIES.includes(formData.category as EvacuationCenterCategory)
      ? [...baseCategories, formData.category as EvacuationCenterCategory]
      : baseCategories;

  // Automatically set category to 'Private House' if canAddOutsideEC is true
  useEffect(() => {
    if (canAddOutsideEC && formData.category !== 'Private House') {
      onFormChange('category', 'Private House');
    }
  }, [canAddOutsideEC]);

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

  // Ensure the form shows a valid barangay name based on barangayId (edit mode)
  useEffect(() => {
    if (!barangays.length) return;
    if (!formData.barangayId) return;
    const byId = barangays.find(b => b.id === formData.barangayId);
    if (byId && byId.name !== formData.barangay) {
      onFormChange('barangay', byId.name);
    }
  }, [barangays, formData.barangayId]);

  const handleBarangayChange = (barangayName: string) => {
    const selectedBarangay = barangays.find(b => b.name === barangayName);
    onFormChange('barangay', barangayName);
    onFormChange('barangayId', selectedBarangay?.id || 0);
  };

  // Sort barangays naturally (e.g., Brgy 1, Brgy 2, ... Brgy 10)
  const sortedBarangays = [...barangays].sort((a, b) => 
    a.name.localeCompare(b.name, undefined, { numeric: true })
  );

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2">Name *</label>
        <Input
          id="name"
          placeholder="Evacuation Center Name"
          value={formData.name}
          onChange={(e) => onFormChange('name', e.target.value)}
          className={errors?.name ? 'border-red-500' : ''}
        />
        {errors?.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium mb-2">Category *</label>
        <Select 
          value={formData.category} 
          onValueChange={(value) => onFormChange('category', value)}
        >
          <SelectTrigger id="category" className={`w-full ${errors?.category ? 'border-red-500' : ''}`}>
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            {availableCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
      </div>

      <div>
        <label htmlFor="streetName" className="block text-sm font-medium mb-2">Street Name *</label>
        <Input
          id="streetName"
          placeholder="Street Name"
          value={formData.streetName}
          onChange={(e) => onFormChange('streetName', e.target.value)}
          className={errors?.streetName ? 'border-red-500' : ''}
        />
        {errors?.streetName && <p className="text-red-500 text-sm mt-1">{errors.streetName}</p>}
      </div>

      <div>
        <label htmlFor="barangay" className="block text-sm font-medium mb-2">Barangay *</label>
        <Select 
          value={
            (barangays.find(b => b.id === formData.barangayId)?.name) || formData.barangay
          } 
          onValueChange={handleBarangayChange}
          disabled={loading}
        >
          <SelectTrigger id="barangay" className={`w-full ${errors?.barangay ? 'border-red-500' : ''}`}>
            <SelectValue placeholder={loading ? "Loading barangays..." : "Select Barangay"} />
          </SelectTrigger>
          <SelectContent>
            {sortedBarangays.map((barangay) => (
              <SelectItem key={barangay.id} value={barangay.name}>
                {barangay.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.barangay && <p className="text-red-500 text-sm mt-1">{errors.barangay}</p>}
      </div>

      <div>
            <label htmlFor="status" className="block text-sm font-medium mb-2">Status</label>
            <Select
              value={formData.ec_status}
              onValueChange={(value) => onFormChange('ec_status', value)}
            >
              <SelectTrigger id="status" className={`w-full ${errors?.ec_status ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="Unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>
      </div>


      {formData.category !== 'Private House' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="latitude" className="block text-sm font-medium mb-2">Latitude *</label>
              <Input
                id="latitude"
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
              <label htmlFor="longitude" className="block text-sm font-medium mb-2">Longitude *</label>
              <Input
                id="longitude"
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
            <label htmlFor="totalCapacity" className="block text-sm font-medium mb-2">Total Capacity</label>
            <Input
              id="totalCapacity"
              type="number"
              placeholder="0"
              value={formData.total_capacity}
              readOnly
              className="bg-gray-50 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              Total capacity is automatically calculated from room capacities
            </p>
            {errors?.total_capacity && <p className="text-red-500 text-sm mt-1">{errors.total_capacity}</p>}
          </div>
        </>
      )}
    </div>
  );
}