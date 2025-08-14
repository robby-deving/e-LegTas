import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EvacuationCenterForm } from '../EvacuationCenterForm';
import { evacuationCenterService } from '../../../services/evacuationCenterService';

// Mock the service
jest.mock('../../../services/evacuationCenterService');

// Mock the Select component
jest.mock('../../../components/ui/select', () => {
  const { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } = require('./mocks/select');
  return {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue
  };
});

describe('EvacuationCenterForm', () => {
  const mockFormData = {
    name: 'Test Center',
    category: 'School',
    streetName: 'Test Street',
    barangay: 'Test Barangay',
    barangayId: 1,
    latitude: '14.123',
    longitude: '121.123',
    total_capacity: '100'
  };

  const mockBarangays = [
    { id: 1, name: 'Barangay 1' },
    { id: 2, name: 'Barangay 2' }
  ];

  const mockOnFormChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (evacuationCenterService.getBarangays as jest.Mock).mockResolvedValue(mockBarangays);
  });

  it('renders form fields with initial values', async () => {
    await act(async () => {
      render(
        <EvacuationCenterForm
          formData={mockFormData}
          onFormChange={mockOnFormChange}
        />
      );
    });

    // Wait for barangays to load
    await waitFor(() => {
      expect(evacuationCenterService.getBarangays).toHaveBeenCalled();
    });

    // Check if all form fields are rendered with correct values
    expect(screen.getByLabelText('Name *')).toHaveValue('Test Center');
    expect(screen.getByLabelText('Street Name *')).toHaveValue('Test Street');
    expect(screen.getByLabelText('Latitude *')).toHaveValue(14.123);
    expect(screen.getByLabelText('Longitude *')).toHaveValue(121.123);
    expect(screen.getByLabelText('Total Capacity')).toHaveValue(100);

    // Wait for selects to be populated
    await waitFor(() => {
      const selects = screen.getAllByTestId('mock-select');
      expect(selects[0]).toHaveValue('School');
    });

    // Wait for barangay options to be available
    await waitFor(() => {
      const barangaySelect = screen.getAllByTestId('mock-select')[1];
      const options = barangaySelect.querySelectorAll('option');
      expect(options.length).toBeGreaterThan(1); // Including the default "Select..." option
      expect(barangaySelect).toHaveValue('Test Barangay');
    });
  });

  it('shows loading state for barangays', async () => {
    // Mock a delay in the API response
    (evacuationCenterService.getBarangays as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockBarangays), 100))
    );

    await act(async () => {
      render(
        <EvacuationCenterForm
          formData={mockFormData}
          onFormChange={mockOnFormChange}
        />
      );
    });

    // Check for loading state
    const barangaySelect = screen.getAllByTestId('mock-select')[1];
    expect(barangaySelect).toBeDisabled();
  });

  it('shows error messages for invalid fields', async () => {
    const errors = {
      name: 'Name is required',
      category: 'Category is required',
      streetName: 'Street name is required',
      barangay: 'Barangay is required',
      latitude: 'Valid latitude is required',
      longitude: 'Valid longitude is required'
    };

    await act(async () => {
      render(
        <EvacuationCenterForm
          formData={mockFormData}
          onFormChange={mockOnFormChange}
          errors={errors}
        />
      );
    });

    // Check if error messages are displayed
    Object.values(errors).forEach(error => {
      expect(screen.getByText(error)).toBeInTheDocument();
    });
  });

  it('calls onFormChange when input values change', async () => {
    await act(async () => {
      render(
        <EvacuationCenterForm
          formData={mockFormData}
          onFormChange={mockOnFormChange}
        />
      );
    });

    // Change name input
    const nameInput = screen.getByLabelText('Name *');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Updated Center', { delay: 1 });
    
    await waitFor(() => {
      expect(mockOnFormChange).toHaveBeenCalledWith('name', 'Updated Center');
    }, { timeout: 2000 });

    // Change street name input
    const streetInput = screen.getByLabelText('Street Name *');
    await userEvent.clear(streetInput);
    await userEvent.type(streetInput, 'Updated Street', { delay: 1 });
    
    await waitFor(() => {
      expect(mockOnFormChange).toHaveBeenCalledWith('streetName', 'Updated Street');
    }, { timeout: 2000 });

    // Change latitude input
    const latitudeInput = screen.getByLabelText('Latitude *');
    await userEvent.clear(latitudeInput);
    await userEvent.type(latitudeInput, '15.123', { delay: 1 });
    
    await waitFor(() => {
      expect(mockOnFormChange).toHaveBeenCalledWith('latitude', '15.123');
    }, { timeout: 2000 });
  });

  it('handles barangay selection', async () => {
    await act(async () => {
      render(
        <EvacuationCenterForm
          formData={mockFormData}
          onFormChange={mockOnFormChange}
        />
      );
    });

    // Wait for barangays to load
    await waitFor(() => {
      expect(evacuationCenterService.getBarangays).toHaveBeenCalled();
    });

    // Wait for barangay options to be available
    await waitFor(() => {
      const barangaySelect = screen.getAllByTestId('mock-select')[1];
      const options = barangaySelect.querySelectorAll('option');
      expect(options.length).toBe(2); // Two barangays from mockBarangays
    });

    // Change barangay
    const barangaySelect = screen.getAllByTestId('mock-select')[1];
    await userEvent.selectOptions(barangaySelect, 'Barangay 2');
    
    await waitFor(() => {
      expect(mockOnFormChange).toHaveBeenCalledWith('barangay', 'Barangay 2');
      expect(mockOnFormChange).toHaveBeenCalledWith('barangayId', 2);
    }, { timeout: 2000 });
  });

  it('shows total capacity as read-only', async () => {
    await act(async () => {
      render(
        <EvacuationCenterForm
          formData={mockFormData}
          onFormChange={mockOnFormChange}
        />
      );
    });

    const capacityInput = screen.getByLabelText('Total Capacity');
    expect(capacityInput).toHaveAttribute('readonly');
    expect(capacityInput).toHaveClass('bg-gray-50', 'cursor-not-allowed');
  });
});