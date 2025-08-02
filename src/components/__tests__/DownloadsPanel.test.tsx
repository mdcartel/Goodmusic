import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DownloadsPanel from '../DownloadsPanel';
import { DownloadManager } from '@/lib/downloadManager';

// Mock the DownloadManager
jest.mock('@/lib/downloadManager');

const mockDownloadManager = {
  getInstance: jest.fn(),
  getAllDownloads: jest.fn(),
  getStatistics: jest.fn(),
  cancelDownload: jest.fn(),
  retryDownload: jest.fn(),
  clearCompleted: jest.fn(),
  clearAll: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
};

beforeEach(() => {
  (DownloadManager.getInstance as jest.Mock).mockReturnValue(mockDownloadManager);
  mockDownloadManager.getAllDownloads.mockReturnValue([]);
  mockDownloadManager.getStatistics.mockReturnValue({
    total: 0,
    completed: 0,
    failed: 0,
    processing: 0,
    queued: 0,
    totalSize: 0,
  });
});

describe('DownloadsPanel', () => {
  it('renders empty state when no downloads', () => {
    render(<DownloadsPanel />);
    
    expect(screen.getByText('No downloads found')).toBeInTheDocument();
    expect(screen.getByText('Start downloading music to see your downloads here')).toBeInTheDocument();
  });

  it('displays download statistics', () => {
    mockDownloadManager.getStatistics.mockReturnValue({
      total: 5,
      completed: 3,
      failed: 1,
      processing: 1,
      queued: 0,
      totalSize: 15000000,
    });

    render(<DownloadsPanel />);
    
    expect(screen.getByText('Downloads')).toBeInTheDocument();
    expect(screen.getByText('(5)')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // completed
    expect(screen.getByText('1')).toBeInTheDocument(); // processing
  });

  it('shows clear completed button when there are completed downloads', () => {
    mockDownloadManager.getStatistics.mockReturnValue({
      total: 3,
      completed: 2,
      failed: 0,
      processing: 0,
      queued: 1,
      totalSize: 10000000,
    });

    render(<DownloadsPanel />);
    
    expect(screen.getByText('Clear Completed')).toBeInTheDocument();
  });

  it('calls clearCompleted when clear completed button is clicked', () => {
    mockDownloadManager.getStatistics.mockReturnValue({
      total: 3,
      completed: 2,
      failed: 0,
      processing: 0,
      queued: 1,
      totalSize: 10000000,
    });

    render(<DownloadsPanel />);
    
    fireEvent.click(screen.getByText('Clear Completed'));
    
    expect(mockDownloadManager.clearCompleted).toHaveBeenCalled();
  });
});