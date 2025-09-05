import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EvacuationCentersPage from '../EvacuationCenters';
import { useEvacuationCenters } from '../../hooks/useEvacuationCenters';
import { useEvacuationCenterMutations } from '../../hooks/useEvacuationCenterMutations';
import { evacuationCenterService } from '../../services/evacuationCenterService';
import type { EvacuationCenter } from '../../types/evacuation';

// Mock the hooks and services
jest.mock('../../hooks/useEvacuationCenters');
jest.mock('../../hooks/useEvacuationCenterMutations');
jest.mock('../../hooks/usePageTitle');
jest.mock('../../services/evacuationCenterService');

describe('EvacuationCentersPage', () => {
  const mockCenters: EvacuationCenter[] = [
    {
      id: 1,
      name: 'Test Center 1',
      address: 'Test Address 1',
      category: 'School',
      total_capacity: 100,
      longitude: 123.456,
      latitude: 78.901,
      ec_status: 'Available',
      barangay_id: 1,
      camp_manager_id: null,
      created_by: 1,
      assigned_user_id: null

    },
    {
      id: 2,
      name: 'Test Center 2',
      address: 'Test Address 2',
      category: 'School',
      total_capacity: 200,
      longitude: 123.457,
      latitude: 78.902,
      ec_status: 'Unavailable',
      barangay_id: 2,
      camp_manager_id: null,
      created_by: 1,
      assigned_user_id: null
    }
  ];

  const mockBarangays = [
    { id: 1, name: 'Barangay 1' },
    { id: 2, name: 'Barangay 2' }
  ];

  const mockRefreshCenters = jest.fn();
  const mockDeleteCenter = jest.fn();

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock hook implementations
    (useEvacuationCenters as jest.Mock).mockReturnValue({
      centers: mockCenters,
      loading: false,
      error: null,
      refreshCenters: mockRefreshCenters
    });

    (useEvacuationCenterMutations as jest.Mock).mockReturnValue({
      deleteCenter: mockDeleteCenter
    });

    // Mock service implementations
    (evacuationCenterService.getBarangays as jest.Mock).mockResolvedValue(mockBarangays);

    // Mock window.confirm
    window.confirm = jest.fn(() => true);
  });

  it('renders loading state', () => {
    (useEvacuationCenters as jest.Mock).mockReturnValue({
      centers: [],
      loading: true,
      error: null,
      refreshCenters: mockRefreshCenters
    });

    render(<EvacuationCentersPage />);
    expect(screen.getByText('Loading evacuation centers...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const errorMessage = 'Failed to load centers';
    (useEvacuationCenters as jest.Mock).mockReturnValue({
      centers: [],
      loading: false,
      error: errorMessage,
      refreshCenters: mockRefreshCenters
    });

    render(<EvacuationCentersPage />);
    expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
  });

  it('renders evacuation centers list', () => {
    render(<EvacuationCentersPage />);

    // Check if centers are rendered
    expect(screen.getByText('Test Center 1')).toBeInTheDocument();
    expect(screen.getByText('Test Center 2')).toBeInTheDocument();
  });

  it('filters centers based on search term', async () => {
    render(<EvacuationCentersPage />);

    const searchInput = screen.getByPlaceholderText('Search by name or address...');
    await userEvent.type(searchInput, 'Test Center 1');

    // Only Center 1 should be visible
    expect(screen.getByText('Test Center 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Center 2')).not.toBeInTheDocument();
  });

  it('opens add center modal when clicking add button', async () => {
    render(<EvacuationCentersPage />);

    const addButton = screen.getByText('Add Evacuation Center');
    await userEvent.click(addButton);

    // Check if modal is opened in add mode
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('handles center deletion', async () => {
    mockDeleteCenter.mockResolvedValueOnce(true);
    render(<EvacuationCentersPage />);

    // Open dropdown for first center
    const moreButton = screen.getAllByRole('button')[1]; // First more button
    await userEvent.click(moreButton);

    // Click delete option
    const deleteButton = screen.getByText('Delete');
    await userEvent.click(deleteButton);

    // Verify confirm dialog was shown
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete "Test Center 1"?');

    // Verify delete was called
    expect(mockDeleteCenter).toHaveBeenCalledWith(1);
    
    // Verify refresh was called after successful deletion
    expect(mockRefreshCenters).toHaveBeenCalled();
  });

  it('handles edit center', async () => {
    const mockCenter = {
      ...mockCenters[0],
      rooms: []
    };
    
    (evacuationCenterService.getEvacuationCenter as jest.Mock).mockResolvedValueOnce(mockCenter);
    
    render(<EvacuationCentersPage />);

    // Open dropdown for first center
    const moreButton = screen.getAllByRole('button')[1]; // First more button
    await userEvent.click(moreButton);

    // Click edit option
    const editButton = screen.getByText('Edit');
    await userEvent.click(editButton);

    // Verify service was called
    expect(evacuationCenterService.getEvacuationCenter).toHaveBeenCalledWith(1);

    // Verify modal is opened in edit mode
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('shows empty state when no centers match search', async () => {
    render(<EvacuationCentersPage />);

    const searchInput = screen.getByPlaceholderText('Search by name or address...');
    await userEvent.type(searchInput, 'No Match');

    expect(screen.getByText('No evacuation centers found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search criteria')).toBeInTheDocument();
  });

  it('shows empty state when no centers exist', () => {
    (useEvacuationCenters as jest.Mock).mockReturnValue({
      centers: [],
      loading: false,
      error: null,
      refreshCenters: mockRefreshCenters
    });

    render(<EvacuationCentersPage />);

    expect(screen.getByText('No evacuation centers found')).toBeInTheDocument();
    expect(screen.getByText('Click "Add Evacuation Center" to get started')).toBeInTheDocument();
  });
});