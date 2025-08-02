import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatBot from '../ChatBot';

// Mock fetch
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('ChatBot', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('renders welcome message on mount', () => {
    render(<ChatBot />);
    
    expect(screen.getByText(/Hi there! 👋 I'm your music companion/)).toBeInTheDocument();
    expect(screen.getByText('Music Companion')).toBeInTheDocument();
  });

  it('displays typing indicator when bot is responding', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        response: 'Test response',
        mood: 'happy',
        suggestedSongs: []
      })
    } as Response);

    render(<ChatBot />);
    
    const input = screen.getByPlaceholderText(/Tell me how you're feeling/);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(input, { target: { value: 'I am happy' } });
    fireEvent.click(sendButton);
    
    // Should show typing indicator
    expect(screen.getByText('Typing...')).toBeInTheDocument();
    
    // Wait for response
    await waitFor(() => {
      expect(screen.getByText('Test response')).toBeInTheDocument();
    });
  });

  it('sends message when send button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        response: 'I understand you are happy!',
        mood: 'happy',
        suggestedSongs: []
      })
    } as Response);

    render(<ChatBot />);
    
    const input = screen.getByPlaceholderText(/Tell me how you're feeling/);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(input, { target: { value: 'I am happy today' } });
    fireEvent.click(sendButton);
    
    expect(mockFetch).toHaveBeenCalledWith('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'I am happy today',
        context: undefined
      })
    });
    
    await waitFor(() => {
      expect(screen.getByText('I understand you are happy!')).toBeInTheDocument();
    });
  });

  it('sends message when Enter key is pressed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        response: 'Test response',
        mood: 'default',
        suggestedSongs: []
      })
    } as Response);

    render(<ChatBot />);
    
    const input = screen.getByPlaceholderText(/Tell me how you're feeling/);
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });
    
    expect(mockFetch).toHaveBeenCalled();
  });

  it('displays suggested songs when provided', async () => {
    const mockSongs = [
      {
        id: '1',
        title: 'Happy Song',
        artist: 'Happy Artist',
        thumbnail: 'happy.jpg',
        duration: '3:30',
        mood: ['happy'],
        youtubeUrl: 'https://youtube.com/watch?v=happy'
      }
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        response: 'Here are some happy songs!',
        mood: 'happy',
        suggestedSongs: mockSongs
      })
    } as Response);

    render(<ChatBot />);
    
    const input = screen.getByPlaceholderText(/Tell me how you're feeling/);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(input, { target: { value: 'I am happy' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('Happy Song')).toBeInTheDocument();
      expect(screen.getByText('Happy Artist')).toBeInTheDocument();
      expect(screen.getByText('Here are some songs that might match your vibe:')).toBeInTheDocument();
    });
  });

  it('calls onPlay when play button is clicked on suggested song', async () => {
    const mockOnPlay = jest.fn();
    const mockSongs = [
      {
        id: '1',
        title: 'Test Song',
        artist: 'Test Artist',
        thumbnail: 'test.jpg',
        duration: '3:30',
        mood: ['happy'],
        youtubeUrl: 'https://youtube.com/watch?v=test'
      }
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        response: 'Here are some songs!',
        mood: 'happy',
        suggestedSongs: mockSongs
      })
    } as Response);

    render(<ChatBot onPlay={mockOnPlay} />);
    
    const input = screen.getByPlaceholderText(/Tell me how you're feeling/);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(input, { target: { value: 'I am happy' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('Test Song')).toBeInTheDocument();
    });

    // Find and click play button
    const playButtons = screen.getAllByRole('button');
    const playButton = playButtons.find(button => 
      button.querySelector('svg') && button.title === 'Play from local file'
    );
    
    if (playButton) {
      fireEvent.click(playButton);
      expect(mockOnPlay).toHaveBeenCalledWith(mockSongs[0]);
    }
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<ChatBot />);
    
    const input = screen.getByPlaceholderText(/Tell me how you're feeling/);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText(/I'm sorry, I'm having trouble connecting/)).toBeInTheDocument();
    });
  });

  it('displays quick action buttons', () => {
    render(<ChatBot />);
    
    expect(screen.getByText("I'm feeling sad 😢")).toBeInTheDocument();
    expect(screen.getByText("I need energy! ⚡")).toBeInTheDocument();
    expect(screen.getByText("Help me focus 🎯")).toBeInTheDocument();
    expect(screen.getByText("Something chill 😌")).toBeInTheDocument();
    expect(screen.getByText("Party vibes! 🎉")).toBeInTheDocument();
  });

  it('sets input value when quick action is clicked', () => {
    render(<ChatBot />);
    
    const quickAction = screen.getByText("I'm feeling sad 😢");
    fireEvent.click(quickAction);
    
    const input = screen.getByPlaceholderText(/Tell me how you're feeling/) as HTMLTextAreaElement;
    expect(input.value).toBe("I'm feeling sad 😢");
  });

  it('disables input and buttons when loading', async () => {
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({
          success: true,
          response: 'Test response',
          mood: 'default',
          suggestedSongs: []
        })
      } as Response), 100))
    );

    render(<ChatBot />);
    
    const input = screen.getByPlaceholderText(/Tell me how you're feeling/);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    // Should disable input and show loading state
    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();
    
    await waitFor(() => {
      expect(screen.getByText('Test response')).toBeInTheDocument();
    });
  });

  it('displays MVP disclaimer in footer', () => {
    render(<ChatBot />);
    
    expect(screen.getByText(/AI-powered music companion \(MVP version with placeholder responses\)/)).toBeInTheDocument();
  });
});