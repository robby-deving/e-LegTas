import { render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoomForm } from '../RoomForm';
import type { EvacuationRoom } from '../../../types/evacuation';

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

describe('RoomForm', () => {
  const mockRooms: EvacuationRoom[] = [
    {
      id: '1',
      roomName: 'Room 1',
      type: 'Temporary',
      capacity: 10
    },
    {
      id: '2',
      roomName: 'Room 2',
      type: 'Permanent',
      capacity: 20
    }
  ];

  const mockOnAddRoom = jest.fn();
  const mockOnRoomChange = jest.fn();
  const mockOnDeleteRoom = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no rooms', () => {
    render(
      <RoomForm
        rooms={[]}
        onAddRoom={mockOnAddRoom}
        onRoomChange={mockOnRoomChange}
        onDeleteRoom={mockOnDeleteRoom}
      />
    );

    expect(screen.getByText('No rooms added yet. Click "Add Room" to get started.')).toBeInTheDocument();
  });

  it('renders list of rooms', async () => {
    render(
      <RoomForm
        rooms={mockRooms}
        onAddRoom={mockOnAddRoom}
        onRoomChange={mockOnRoomChange}
        onDeleteRoom={mockOnDeleteRoom}
      />
    );

    // Check if room names are rendered
    expect(screen.getByDisplayValue('Room 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Room 2')).toBeInTheDocument();

    // Check if room types are rendered
    await waitFor(() => {
      const selectElements = screen.getAllByTestId('mock-select');
      expect(selectElements[0]).toHaveValue('Temporary');
      expect(selectElements[1]).toHaveValue('Permanent');
    });

    // Check if capacities are rendered
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    expect(screen.getByDisplayValue('20')).toBeInTheDocument();
  });

  it('calls onAddRoom when add button is clicked', async () => {
    render(
      <RoomForm
        rooms={mockRooms}
        onAddRoom={mockOnAddRoom}
        onRoomChange={mockOnRoomChange}
        onDeleteRoom={mockOnDeleteRoom}
      />
    );

    const addButton = screen.getByText('+ Add Room');
    await userEvent.click(addButton);

    expect(mockOnAddRoom).toHaveBeenCalled();
  });

  it('calls onRoomChange when room fields are updated', async () => {
    render(
      <RoomForm
        rooms={mockRooms}
        onAddRoom={mockOnAddRoom}
        onRoomChange={mockOnRoomChange}
        onDeleteRoom={mockOnDeleteRoom}
      />
    );

    // Update room name
    const roomNameInput = screen.getByDisplayValue('Room 1');
    await userEvent.clear(roomNameInput);
    await userEvent.type(roomNameInput, 'Updated Room');
    
    await waitFor(() => {
      expect(mockOnRoomChange).toHaveBeenCalledWith('1', 'roomName', 'Updated Room');
    }, { timeout: 2000 });

    // Update capacity
    const capacityInput = screen.getByDisplayValue('10');
    await userEvent.clear(capacityInput);
    await userEvent.type(capacityInput, '15');
    
    await waitFor(() => {
      expect(mockOnRoomChange).toHaveBeenCalledWith('1', 'capacity', 15);
    }, { timeout: 2000 });

    // Update type
    const typeSelect = screen.getAllByTestId('mock-select')[0];
    await userEvent.selectOptions(typeSelect, 'Permanent');
    
    await waitFor(() => {
      expect(mockOnRoomChange).toHaveBeenCalledWith('1', 'type', 'Permanent');
    }, { timeout: 2000 });
  });

  it('calls onDeleteRoom when delete button is clicked', async () => {
    render(
      <RoomForm
        rooms={mockRooms}
        onAddRoom={mockOnAddRoom}
        onRoomChange={mockOnRoomChange}
        onDeleteRoom={mockOnDeleteRoom}
      />
    );

    // Find and click the first delete button
    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(button => button.className.includes('text-red-600'));
    if (deleteButton) {
      await userEvent.click(deleteButton);
    }

    expect(mockOnDeleteRoom).toHaveBeenCalledWith('1');
  });

  it('shows error messages for invalid fields', () => {
    const errors = {
      '1': {
        roomName: 'Room name is required',
        type: 'Room type is required',
        capacity: 'Valid capacity is required'
      }
    };

    render(
      <RoomForm
        rooms={mockRooms}
        onAddRoom={mockOnAddRoom}
        onRoomChange={mockOnRoomChange}
        onDeleteRoom={mockOnDeleteRoom}
        errors={errors}
      />
    );

    // Check if error messages are displayed
    Object.values(errors['1']).forEach(error => {
      expect(screen.getByText(error)).toBeInTheDocument();
    });
  });

  it('shows marked for deletion state', () => {
    const roomsWithDeletion = [
      {
        ...mockRooms[0],
        markedForDeletion: true
      },
      mockRooms[1]
    ];

    render(
      <RoomForm
        rooms={roomsWithDeletion}
        onAddRoom={mockOnAddRoom}
        onRoomChange={mockOnRoomChange}
        onDeleteRoom={mockOnDeleteRoom}
      />
    );

    expect(screen.getByText('Marked for deletion')).toBeInTheDocument();
    expect(screen.getByText('Undo')).toBeInTheDocument();
  });
});