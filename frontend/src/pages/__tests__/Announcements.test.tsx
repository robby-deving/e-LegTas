import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnnouncementsPage from '../Announcements';
import { useAnnouncements } from '../../hooks/useAnnouncements.ts';

// Mocks
jest.mock('../../hooks/useAnnouncements.ts');
jest.mock('../../hooks/usePageTitle');

// Mock react-redux selectors used by the page
jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useSelector: jest.fn(),
    useDispatch: jest.fn(() => jest.fn()),
  };
});

type UIAnnouncement = {
  id: number;
  title: string;
  body: string;
  created_by?: number;
  created_at?: string;
  date: string;
};

describe('AnnouncementsPage', () => {
  const mockUseSelector = require('react-redux').useSelector as jest.Mock;

  const baseAuthState = {
    auth: {
      user: { user_id: 123, name: 'Tester' },
      token: 'token',
      isAuthenticated: true,
    },
  };

  const mockAnnouncements: UIAnnouncement[] = [
    {
      id: 1,
      title: 'City-wide Drill',
      body: 'There will be a drill on Friday.',
      date: 'Jan 01, 2025, 10:00 AM',
      created_by: 1,
      created_at: '2025-01-01T10:00:00Z',
    },
    {
      id: 2,
      title: 'Relief Goods Distribution',
      body: 'Distribution at the barangay hall.',
      date: 'Jan 02, 2025, 11:00 AM',
      created_by: 1,
      created_at: '2025-01-02T11:00:00Z',
    },
  ];

  const longBody = 'A'.repeat(160); // triggers See more for body

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector: any) => selector(baseAuthState));

    (useAnnouncements as jest.Mock).mockReturnValue({
      announcements: mockAnnouncements,
      loading: false,
      error: null,
      saving: false,
      deleting: false,
      refresh: jest.fn(),
      createAnnouncement: jest.fn(),
      deleteAnnouncement: jest.fn(),
    });
  });

  it('renders loading state', () => {
    (useAnnouncements as jest.Mock).mockReturnValue({
      announcements: [],
      loading: true,
      error: null,
      saving: false,
      deleting: false,
      refresh: jest.fn(),
      createAnnouncement: jest.fn(),
      deleteAnnouncement: jest.fn(),
    });

    render(<AnnouncementsPage />);
    expect(screen.getByText('Loading announcements...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const errorMessage = 'Failed to load announcements';
    (useAnnouncements as jest.Mock).mockReturnValue({
      announcements: [],
      loading: false,
      error: errorMessage,
      saving: false,
      deleting: false,
      refresh: jest.fn(),
      createAnnouncement: jest.fn(),
      deleteAnnouncement: jest.fn(),
    });

    render(<AnnouncementsPage />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('shows empty table state when no announcements', () => {
    (useAnnouncements as jest.Mock).mockReturnValue({
      announcements: [],
      loading: false,
      error: null,
      saving: false,
      deleting: false,
      refresh: jest.fn(),
      createAnnouncement: jest.fn(),
      deleteAnnouncement: jest.fn(),
    });

    render(<AnnouncementsPage />);
    expect(screen.getByText('No announcements found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search or create a new announcement')).toBeInTheDocument();
  });

  it('renders announcements list and supports search filtering', async () => {
    render(<AnnouncementsPage />);

    expect(screen.getByText('City-wide Drill')).toBeInTheDocument();
    expect(screen.getByText('Relief Goods Distribution')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('Search');
    await userEvent.type(searchInput, 'Relief');

    expect(screen.getByText('Relief Goods Distribution')).toBeInTheDocument();
    expect(screen.queryByText('City-wide Drill')).not.toBeInTheDocument();
  });

  it('expands and collapses long body text', async () => {
    (useAnnouncements as jest.Mock).mockReturnValue({
      announcements: [
        { id: 1, title: 'Notice', body: longBody, date: 'Jan 03, 2025, 12:00 PM' },
      ],
      loading: false,
      error: null,
      saving: false,
      deleting: false,
      refresh: jest.fn(),
      createAnnouncement: jest.fn(),
      deleteAnnouncement: jest.fn(),
    });

    render(<AnnouncementsPage />);

    const seeMore = screen.getByRole('button', { name: 'See more' });
    await userEvent.click(seeMore);
    expect(screen.getByRole('button', { name: 'See less' })).toBeInTheDocument();
  });

  it('opens create modal, reviews, and posts an announcement', async () => {
    const createAnnouncement = jest.fn().mockResolvedValue({
      id: 3,
      title: 'New Title',
      body: 'New Body',
      date: 'Jan 04, 2025, 01:00 PM',
    });

    (useAnnouncements as jest.Mock).mockReturnValue({
      announcements: mockAnnouncements,
      loading: false,
      error: null,
      saving: false,
      deleting: false,
      refresh: jest.fn(),
      createAnnouncement,
      deleteAnnouncement: jest.fn(),
    });

    render(<AnnouncementsPage />);

    await userEvent.click(screen.getByRole('button', { name: /Add Announcement/i }));

    // Fill the form
    await userEvent.type(screen.getByPlaceholderText('Announcement Title'), 'New Title');
    await userEvent.type(screen.getByPlaceholderText('Announcement description'), 'New Body');

    // Post -> opens confirm dialog
    await userEvent.click(screen.getByRole('button', { name: 'Post' }));

    await waitFor(() => {
      expect(screen.getByText('Review Announcement')).toBeInTheDocument();
      expect(screen.getByText('New Title')).toBeInTheDocument();
      expect(screen.getByText('New Body')).toBeInTheDocument();
    });

    // Confirm & Post
    await userEvent.click(screen.getByRole('button', { name: 'Confirm & Post' }));

    await waitFor(() => {
      expect(createAnnouncement).toHaveBeenCalledWith({
        title: 'New Title',
        body: 'New Body',
        created_by: 123,
      });
    });
  });

  it('opens delete confirmation and deletes an announcement', async () => {
    const deleteAnnouncement = jest.fn().mockResolvedValue(true);
    (useAnnouncements as jest.Mock).mockReturnValue({
      announcements: mockAnnouncements,
      loading: false,
      error: null,
      saving: false,
      deleting: false,
      refresh: jest.fn(),
      createAnnouncement: jest.fn(),
      deleteAnnouncement,
    });

    render(<AnnouncementsPage />);

    // Click delete button for first row
    const deleteButtons = screen.getAllByTitle('Delete announcement');
    await userEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      expect(screen.getByText('"City-wide Drill"')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(deleteAnnouncement).toHaveBeenCalledWith(1);
    });
  });
});

