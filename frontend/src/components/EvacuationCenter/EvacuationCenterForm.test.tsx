import { render, screen, fireEvent } from '@testing-library/react';
import { EvacuationCenterForm } from './EvacuationCenterForm';
import userEvent from '@testing-library/user-event';

describe('EvacuationCenterForm', () => {
  const mockOnFormChange = jest.fn();
  const defaultProps = {
    onFormChange: mockOnFormChange,
    initialValues: {
      name: '',
      address: '',
      barangay_id: 0,
      category: '',
      total_capacity: 0,
      longitude: 0,
      latitude: 0,
      ec_status: 'Available',
      rooms: []
    },
    barangays: [
      { id: 1, name: 'Barangay 1' },
      { id: 2, name: 'Barangay 2' }
    ]
  };

  beforeEach(() => {
    mockOnFormChange.mockClear();
  });

  it('calls onFormChange when input values change', async () => {
    render(<EvacuationCenterForm {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/name/i);
    await userEvent.type(nameInput, 'Updated Center');

    expect(mockOnFormChange).toHaveBeenCalledWith('name', 'Updated Center');
  });

  it('handles barangay selection', async () => {
    render(<EvacuationCenterForm {...defaultProps} />);
    
    const barangaySelect = screen.getByLabelText(/barangay/i);
    await userEvent.selectOptions(barangaySelect, '2');

    expect(mockOnFormChange).toHaveBeenCalledWith('barangay_id', 2);
  });

  it('properly initializes with provided values', () => {
    const initialValues = {
      ...defaultProps.initialValues,
      name: 'Test Center',
      barangay_id: 2
    };

    render(<EvacuationCenterForm {...defaultProps} initialValues={initialValues} />);
    
    expect(screen.getByLabelText(/name/i)).toHaveValue('Test Center');
    expect(screen.getByLabelText(/barangay/i)).toHaveValue('2');
  });
});
