import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import MoodSelector from '../MoodSelector';

// Mock the hooks
jest.mock('@/hooks/useUserPreferences');
jest.mock('@/hooks/useErrorHandling');
jest.mock('@/contexts/ToastContext');
jest.mock('@/lib/localStorageManager');

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;

const mockMoods = [
  {
    id: 'chill',
    name: 'Chill',
    emoji: '😌',
    color: 'bg-blue-500',
    description: 'Relaxed and peaceful vibes',
    keywords: ['chill', 'relax', 'calm']
  },
  {
    id: 'hype',
    name: 'Hype',
    emoji: '🔥',
    color: 'bg-orange-500',
    description: 'High energy and motivational',
    keywords: ['hype', 'energy', 'pump']
  }
];

describe('MoodSelector', () => {
  const mockOnMoodSelect = jest.fn();
  const mockSetSelectedMood = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseUserPreferences.mockReturnValue({
      preferences: {
        selectedMood: null,
        preferredMoods: [],
        moodHistory: [],
        lastActiveDate: new Date().toISOString(),
        totalSongsPlayed: 0,
        totalDownloads: 0,
        favoriteGenres: [],
        discoveryPreferences: {
          enableChatSuggestions: true,
          enableMoodRecommendations: true,
          enableAutoplay: false
        }
      },
      setSelectedMood: mockSetSelectedMood,
      isLoading: false,
      updatePreferences: jest.fn(),
      addPreferredMood: jest.fn(),
      removePreferredMood: jest.fn(),
      updateDiscoveryPreferences: jest.fn(),
      incrementSongsPlayed: jest.fn(),
      incrementDownloads: jest.fn()
    });

    // Mock fetch for API calls
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ moods: mockMoods })
    });
  });

  it('renders mood selector with title', () => {
    render(
      <MoodSelector
        selectedMood={null}
        onMoodSelect={mockOnMoodSelect}
        moods={mockMoods}
      />
    );

    expect(screen.getByText('Choose Your Vibe')).toBeInTheDocument();
  });

  it('renders provided moods', () => {
    render(
      <MoodSelector
        selectedMood={null}
        onMoodSelect={mockOnMoodSelect}
        moods={mockMoods}
      />
    );

    expect(screen.getByText('Chill')).toBeInTheDocument();
    expect(screen.getByText('Hype')).toBeInTheDocument();
    expect(screen.getByText('😌')).toBeInTheDocument();
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  it('calls onMoodSelect when mood is clicked', () => {
    render(
      <MoodSelector
        selectedMood={null}
        onMoodSelect={mockOnMoodSelect}
        moods={mockMoods}
      />
    );

    const chillButton = screen.getByRole('button', { name: /chill/i });
    fireEvent.click(chillButton);

    expect(mockOnMoodSelect).toHaveBeenCalledWith('chill');
    expect(mockSetSelectedMood).toHaveBeenCalledWith('chill');
  });

  it('shows selected mood with visual indicator', () => {
    render(
      <MoodSelector
        selectedMood="chill"
        onMoodSelect={mockOnMoodSelect}
        moods={mockMoods}
      />
    );

    const chillButton = screen.getByRole('button', { name: /chill/i });
    expect(chillButton).toHaveClass('scale-105');
  });

  it('shows clear selection button when mood is selected', () => {
    render(
      <MoodSelector
        selectedMood="chill"
        onMoodSelect={mockOnMoodSelect}
        moods={mockMoods}
      />
    );

    const clearButton = screen.getByText('Clear Selection');
    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);
    expect(mockOnMoodSelect).toHaveBeenCalledWith('');
  });

  it('displays selected mood info', () => {
    render(
      <MoodSelector
        selectedMood="chill"
        onMoodSelect={mockOnMoodSelect}
        moods={mockMoods}
      />
    );

    expect(screen.getByText('Chill Vibes')).toBeInTheDocument();
    expect(screen.getByText('Relaxed and peaceful vibes')).toBeInTheDocument();
    expect(screen.getByText('chill')).toBeInTheDocument();
    expect(screen.getByText('relax')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseUserPreferences.mockReturnValue({
      ...mockUseUserPreferences(),
      isLoading: true
    });

    render(
      <MoodSelector
        selectedMood={null}
        onMoodSelect={mockOnMoodSelect}
        moods={[]}
      />
    );

    // Should show loading skeleton
    const skeletons = screen.getAllByRole('generic');
    expect(skeletons.some(el => el.classList.contains('animate-pulse'))).toBe(true);
  });

  it('fetches moods from API when none provided', async () => {
    render(
      <MoodSelector
        selectedMood={null}
        onMoodSelect={mockOnMoodSelect}
        moods={[]}
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/moods');
    });
  });

  it('shows empty state when no moods available', () => {
    render(
      <MoodSelector
        selectedMood={null}
        onMoodSelect={mockOnMoodSelect}
        moods={[]}
      />
    );

    expect(screen.getByText('No moods available right now')).toBeInTheDocument();
    expect(screen.getByText('😔')).toBeInTheDocument();
  });

  it('loads saved mood from preferences on mount', () => {
    mockUseUserPreferences.mockReturnValue({
      ...mockUseUserPreferences(),
      preferences: {
        ...mockUseUserPreferences().preferences,
        selectedMood: 'hype'
      }
    });

    render(
      <MoodSelector
        selectedMood={null}
        onMoodSelect={mockOnMoodSelect}
        moods={mockMoods}
      />
    );

    expect(mockOnMoodSelect).toHaveBeenCalledWith('hype');
  });
});