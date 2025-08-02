import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AudioPlayer from '../AudioPlayer';
import { Song } from '@/types';

const mockSong: Song = {
  id: 'test-song-1',
  title: 'Test Song',
  artist: 'Test Artist',
  thumbnail: 'https://example.com/thumbnail.jpg',
  duration: '3:30',
  mood: ['chill'],
  youtubeUrl: 'https://youtube.com/watch?v=test'
};

describe('AudioPlayer', () => {
  const mockOnPlayPause = jest.fn();
  const mockOnSeek = jest.fn();
  const mockOnNext = jest.fn();
  const mockOnPrevious = jest.fn();
  const mockOnVolumeChange = jest.fn();
  const mockOnShowQueue = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fetch for stream URL
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ streamUrl: 'https://example.com/stream.mp3' })
    });
  });

  it('renders audio player with song information', () => {
    render(
      <AudioPlayer
        currentSong={mockSong}
        isPlaying={false}
        onPlayPause={mockOnPlayPause}
        onSeek={mockOnSeek}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
        onVolumeChange={mockOnVolumeChange}
        onShowQueue={mockOnShowQueue}
        queueLength={5}
      />
    );

    expect(screen.getByText('Test Song')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
  });

  it('shows play button when not playing', () => {
    render(
      <AudioPlayer
        currentSong={mockSong}
        isPlaying={false}
        onPlayPause={mockOnPlayPause}
        onSeek={mockOnSeek}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
        onVolumeChange={mockOnVolumeChange}
        onShowQueue={mockOnShowQueue}
        queueLength={5}
      />
    );

    const playButton = screen.getByRole('button', { name: /play/i });
    expect(playButton).toBeInTheDocument();
  });

  it('shows pause button when playing', () => {
    render(
      <AudioPlayer
        currentSong={mockSong}
        isPlaying={true}
        onPlayPause={mockOnPlayPause}
        onSeek={mockOnSeek}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
        onVolumeChange={mockOnVolumeChange}
        onShowQueue={mockOnShowQueue}
        queueLength={5}
      />
    );

    const pauseButton = screen.getByRole('button', { name: /pause/i });
    expect(pauseButton).toBeInTheDocument();
  });

  it('calls onPlayPause when play/pause button is clicked', () => {
    render(
      <AudioPlayer
        currentSong={mockSong}
        isPlaying={false}
        onPlayPause={mockOnPlayPause}
        onSeek={mockOnSeek}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
        onVolumeChange={mockOnVolumeChange}
        onShowQueue={mockOnShowQueue}
        queueLength={5}
      />
    );

    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);

    expect(mockOnPlayPause).toHaveBeenCalled();
  });

  it('calls onNext when next button is clicked', () => {
    render(
      <AudioPlayer
        currentSong={mockSong}
        isPlaying={false}
        onPlayPause={mockOnPlayPause}
        onSeek={mockOnSeek}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
        onVolumeChange={mockOnVolumeChange}
        onShowQueue={mockOnShowQueue}
        queueLength={5}
      />
    );

    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    expect(mockOnNext).toHaveBeenCalled();
  });

  it('calls onPrevious when previous button is clicked', () => {
    render(
      <AudioPlayer
        currentSong={mockSong}
        isPlaying={false}
        onPlayPause={mockOnPlayPause}
        onSeek={mockOnSeek}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
        onVolumeChange={mockOnVolumeChange}
        onShowQueue={mockOnShowQueue}
        queueLength={5}
      />
    );

    const previousButton = screen.getByRole('button', { name: /previous/i });
    fireEvent.click(previousButton);

    expect(mockOnPrevious).toHaveBeenCalled();
  });

  it('displays queue length', () => {
    render(
      <AudioPlayer
        currentSong={mockSong}
        isPlaying={false}
        onPlayPause={mockOnPlayPause}
        onSeek={mockOnSeek}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
        onVolumeChange={mockOnVolumeChange}
        onShowQueue={mockOnShowQueue}
        queueLength={5}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onShowQueue when queue button is clicked', () => {
    render(
      <AudioPlayer
        currentSong={mockSong}
        isPlaying={false}
        onPlayPause={mockOnPlayPause}
        onSeek={mockOnSeek}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
        onVolumeChange={mockOnVolumeChange}
        onShowQueue={mockOnShowQueue}
        queueLength={5}
      />
    );

    const queueButton = screen.getByRole('button', { name: /queue/i });
    fireEvent.click(queueButton);

    expect(mockOnShowQueue).toHaveBeenCalled();
  });

  it('handles volume change', () => {
    render(
      <AudioPlayer
        currentSong={mockSong}
        isPlaying={false}
        onPlayPause={mockOnPlayPause}
        onSeek={mockOnSeek}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
        onVolumeChange={mockOnVolumeChange}
        onShowQueue={mockOnShowQueue}
        queueLength={5}
      />
    );

    const volumeSlider = screen.getByRole('slider', { name: /volume/i });
    fireEvent.change(volumeSlider, { target: { value: '0.8' } });

    expect(mockOnVolumeChange).toHaveBeenCalledWith(0.8);
  });

  it('handles progress bar seek', () => {
    render(
      <AudioPlayer
        currentSong={mockSong}
        isPlaying={false}
        onPlayPause={mockOnPlayPause}
        onSeek={mockOnSeek}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
        onVolumeChange={mockOnVolumeChange}
        onShowQueue={mockOnShowQueue}
        queueLength={5}
      />
    );

    const progressBar = screen.getByRole('slider', { name: /progress/i });
    fireEvent.change(progressBar, { target: { value: '60' } });

    expect(mockOnSeek).toHaveBeenCalledWith(60);
  });

  it('does not render when no current song', () => {
    const { container } = render(
      <AudioPlayer
        currentSong={null}
        isPlaying={false}
        onPlayPause={mockOnPlayPause}
        onSeek={mockOnSeek}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
        onVolumeChange={mockOnVolumeChange}
        onShowQueue={mockOnShowQueue}
        queueLength={0}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('fetches stream URL when song changes', async () => {
    render(
      <AudioPlayer
        currentSong={mockSong}
        isPlaying={true}
        onPlayPause={mockOnPlayPause}
        onSeek={mockOnSeek}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
        onVolumeChange={mockOnVolumeChange}
        onShowQueue={mockOnShowQueue}
        queueLength={5}
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl: mockSong.youtubeUrl })
      });
    });
  });

  it('displays current time and duration', () => {
    render(
      <AudioPlayer
        currentSong={mockSong}
        isPlaying={false}
        onPlayPause={mockOnPlayPause}
        onSeek={mockOnSeek}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
        onVolumeChange={mockOnVolumeChange}
        onShowQueue={mockOnShowQueue}
        queueLength={5}
      />
    );

    // Should display time format (initially 0:00)
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });
});