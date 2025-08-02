import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useFavorites, useRecentlyPlayed } from '@/hooks/useUserPreferences';
import SongCard from '../SongCard';
import { Song } from '@/types';

// Mock the hooks and dependencies
jest.mock('@/hooks/useUserPreferences');
jest.mock('@/hooks/useErrorHandling');
jest.mock('@/contexts/ToastContext');
jest.mock('@/lib/downloadManager');

const mockUseFavorites = useFavorites as jest.MockedFunction<typeof useFavorites>;
const mockUseRecentlyPlayed = useRecentlyPlayed as jest.MockedFunction<typeof useRecentlyPlayed>;

const mockSong: Song = {
  id: 'test-song-1',
  title: 'Test Song',
  artist: 'Test Artist',
  thumbnail: 'https://example.com/thumbnail.jpg',
  duration: '3:30',
  mood: ['chill'],
  youtubeUrl: 'https://youtube.com/watch?v=test'
};

describe('SongCard', () => {
  const mockOnPlay = jest.fn();
  const mockOnDownload = jest.fn();
  const mockToggleFavorite = jest.fn();
  const mockAddToRecentlyPlayed = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseFavorites.mockReturnValue({
      favorites: [],
      isLoading: false,
      addToFavorites: jest.fn(),
      removeFromFavorites: jest.fn(),
      toggleFavorite: mockToggleFavorite,
      isFavorite: jest.fn().mockReturnValue(false),
      getFavoritesByMood: jest.fn()
    });

    mockUseRecentlyPlayed.mockReturnValue({
      recentlyPlayed: [],
      isLoading: false,
      addToRecentlyPlayed: mockAddToRecentlyPlayed,
      clearRecentlyPlayed: jest.fn()
    });
  });

  it('renders song information correctly', () => {
    render(
      <SongCard
        song={mockSong}
        onPlay={mockOnPlay}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('Test Song')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
    expect(screen.getByText('3:30')).toBeInTheDocument();
    expect(screen.getByText('chill')).toBeInTheDocument();
  });

  it('displays song thumbnail', () => {
    render(
      <SongCard
        song={mockSong}
        onPlay={mockOnPlay}
        onDownload={mockOnDownload}
      />
    );

    const thumbnail = screen.getByAltText('Test Song');
    expect(thumbnail).toBeInTheDocument();
    expect(thumbnail).toHaveAttribute('src', mockSong.thumbnail);
  });

  it('calls onPlay when play button is clicked', () => {
    render(
      <SongCard
        song={mockSong}
        onPlay={mockOnPlay}
        onDownload={mockOnDownload}
      />
    );

    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);

    expect(mockOnPlay).toHaveBeenCalledWith(mockSong);
  });

  it('shows pause icon when song is playing', () => {
    render(
      <SongCard
        song={mockSong}
        onPlay={mockOnPlay}
        onDownload={mockOnDownload}
        isPlaying={true}
      />
    );

    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('shows loading state when song is loading', () => {
    render(
      <SongCard
        song={mockSong}
        onPlay={mockOnPlay}
        onDownload={mockOnDownload}
        isLoading={true}
      />
    );

    // Should show loading spinner
    expect(screen.getByRole('generic')).toHaveClass('animate-spin');
  });

  it('toggles favorite when heart button is clicked', () => {
    render(
      <SongCard
        song={mockSong}
        onPlay={mockOnPlay}
        onDownload={mockOnDownload}
      />
    );

    const favoriteButton = screen.getByRole('button', { name: /favorite/i });
    fireEvent.click(favoriteButton);

    expect(mockToggleFavorite).toHaveBeenCalledWith(mockSong);
  });

  it('shows filled heart when song is favorited', () => {
    mockUseFavorites.mockReturnValue({
      ...mockUseFavorites(),
      isFavorite: jest.fn().mockReturnValue(true)
    });

    render(
      <SongCard
        song={mockSong}
        onPlay={mockOnPlay}
        onDownload={mockOnDownload}
      />
    );

    const favoriteButton = screen.getByRole('button', { name: /favorite/i });
    expect(favoriteButton).toHaveClass('text-red-500');
  });

  it('shows download options when download button is clicked', () => {
    render(
      <SongCard
        song={mockSong}
        onPlay={mockOnPlay}
        onDownload={mockOnDownload}
      />
    );

    const downloadButton = screen.getByRole('button', { name: /download/i });
    fireEvent.click(downloadButton);

    expect(screen.getByText('MP3')).toBeInTheDocument();
    expect(screen.getByText('MP4')).toBeInTheDocument();
  });

  it('calls onDownload with correct format when format is selected', () => {
    render(
      <SongCard
        song={mockSong}
        onPlay={mockOnPlay}
        onDownload={mockOnDownload}
      />
    );

    // Open download options
    const downloadButton = screen.getByRole('button', { name: /download/i });
    fireEvent.click(downloadButton);

    // Click MP3 option
    const mp3Button = screen.getByText('MP3');
    fireEvent.click(mp3Button);

    expect(mockOnDownload).toHaveBeenCalledWith(mockSong, 'mp3');
  });

  it('handles image error gracefully', () => {
    render(
      <SongCard
        song={mockSong}
        onPlay={mockOnPlay}
        onDownload={mockOnDownload}
      />
    );

    const thumbnail = screen.getByAltText('Test Song');
    fireEvent.error(thumbnail);

    // Should show fallback or handle error gracefully
    expect(thumbnail).toBeInTheDocument();
  });

  it('displays multiple mood tags', () => {
    const songWithMultipleMoods = {
      ...mockSong,
      mood: ['chill', 'focus', 'study']
    };

    render(
      <SongCard
        song={songWithMultipleMoods}
        onPlay={mockOnPlay}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('chill')).toBeInTheDocument();
    expect(screen.getByText('focus')).toBeInTheDocument();
    expect(screen.getByText('study')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SongCard
        song={mockSong}
        onPlay={mockOnPlay}
        onDownload={mockOnDownload}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});