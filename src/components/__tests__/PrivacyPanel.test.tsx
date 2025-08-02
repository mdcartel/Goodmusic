import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { privacyManager } from '@/lib/privacyManager';
import PrivacyPanel from '../PrivacyPanel';

// Mock the privacy manager and dependencies
jest.mock('@/lib/privacyManager');
jest.mock('@/contexts/ToastContext');

const mockPrivacyManager = privacyManager as jest.Mocked<typeof privacyManager>;

const mockPrivacySettings = {
  dataCollection: {
    allowUsageAnalytics: false,
    allowErrorReporting: true,
    allowPerformanceMetrics: false
  },
  dataRetention: {
    maxHistoryDays: 90,
    maxDownloadHistory: 200,
    maxChatHistory: 20,
    autoCleanup: true
  },
  dataSharing: {
    shareWithThirdParties: false,
    allowTelemetry: false
  }
};

const mockAuditReport = {
  personalDataFound: false,
  dataTypes: ['mood_preferences', 'playback_settings', 'favorites'],
  storageUsage: {
    total: 1024,
    byCategory: {
      'vibepipe_favorites_v1': 512,
      'vibepipe_preferences_v1': 256,
      'vibepipe_playback_v1': 256
    }
  },
  recommendations: []
};

describe('PrivacyPanel', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrivacyManager.getPrivacySettings.mockReturnValue(mockPrivacySettings);
    mockPrivacyManager.auditStoredData.mockReturnValue(mockAuditReport);
    mockPrivacyManager.updatePrivacySettings.mockReturnValue(true);
    mockPrivacyManager.clearDataCategory.mockReturnValue(true);
    mockPrivacyManager.clearAllUserData.mockReturnValue(true);
    mockPrivacyManager.exportUserData.mockReturnValue('{"exported": "data"}');
  });

  it('renders privacy panel when open', () => {
    render(
      <PrivacyPanel
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Privacy & Data Management')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <PrivacyPanel
        isOpen={false}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('Privacy & Data Management')).not.toBeInTheDocument();
  });

  it('displays privacy settings tab by default', () => {
    render(
      <PrivacyPanel
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Data Collection Preferences')).toBeInTheDocument();
    expect(screen.getByText('Usage Analytics')).toBeInTheDocument();
    expect(screen.getByText('Error Reporting')).toBeInTheDocument();
  });

  it('switches between tabs', () => {
    render(
      <PrivacyPanel
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Click on Data Management tab
    const dataTab = screen.getByText('Data Management');
    fireEvent.click(dataTab);

    expect(screen.getByText('Manage your stored data')).toBeInTheDocument();
    expect(screen.getByText('Clear Favorites')).toBeInTheDocument();
  });

  it('toggles usage analytics setting', () => {
    render(
      <PrivacyPanel
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const analyticsToggle = screen.getByRole('button', { name: /usage analytics/i });
    fireEvent.click(analyticsToggle);

    expect(mockPrivacyManager.updatePrivacySettings).toHaveBeenCalledWith({
      dataCollection: {
        ...mockPrivacySettings.dataCollection,
        allowUsageAnalytics: true
      }
    });
  });

  it('clears data category when requested', async () => {
    // Mock window.confirm
    window.confirm = jest.fn().mockReturnValue(true);

    render(
      <PrivacyPanel
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Switch to Data Management tab
    const dataTab = screen.getByText('Data Management');
    fireEvent.click(dataTab);

    // Click clear favorites
    const clearFavoritesButton = screen.getByText('Clear Favorites');
    fireEvent.click(clearFavoritesButton);

    await waitFor(() => {
      expect(mockPrivacyManager.clearDataCategory).toHaveBeenCalledWith('favorites');
    });
  });

  it('exports data when export button is clicked', () => {
    // Mock URL.createObjectURL and related functions
    const mockCreateObjectURL = jest.fn().mockReturnValue('mock-url');
    const mockRevokeObjectURL = jest.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock document.createElement and appendChild
    const mockAnchor = {
      href: '',
      download: '',
      click: jest.fn()
    };
    const mockCreateElement = jest.fn().mockReturnValue(mockAnchor);
    const mockAppendChild = jest.fn();
    const mockRemoveChild = jest.fn();
    
    document.createElement = mockCreateElement;
    document.body.appendChild = mockAppendChild;
    document.body.removeChild = mockRemoveChild;

    render(
      <PrivacyPanel
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Switch to Data Management tab
    const dataTab = screen.getByText('Data Management');
    fireEvent.click(dataTab);

    // Click export button
    const exportButton = screen.getByText('Export All Data');
    fireEvent.click(exportButton);

    expect(mockPrivacyManager.exportUserData).toHaveBeenCalled();
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockAnchor.click).toHaveBeenCalled();
  });

  it('displays privacy audit results', () => {
    render(
      <PrivacyPanel
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Switch to Privacy Audit tab
    const auditTab = screen.getByText('Privacy Audit');
    fireEvent.click(auditTab);

    expect(screen.getByText('Privacy Audit Report')).toBeInTheDocument();
    expect(screen.getByText('Personal Data Check')).toBeInTheDocument();
    expect(screen.getByText('No personal data found')).toBeInTheDocument();
  });

  it('shows warning when personal data is found', () => {
    const auditWithPersonalData = {
      ...mockAuditReport,
      personalDataFound: true,
      recommendations: ['Remove personal data from storage']
    };

    mockPrivacyManager.auditStoredData.mockReturnValue(auditWithPersonalData);

    render(
      <PrivacyPanel
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Switch to Privacy Audit tab
    const auditTab = screen.getByText('Privacy Audit');
    fireEvent.click(auditTab);

    expect(screen.getByText('Potential personal data detected')).toBeInTheDocument();
    expect(screen.getByText('Remove personal data from storage')).toBeInTheDocument();
  });

  it('refreshes audit when refresh button is clicked', () => {
    render(
      <PrivacyPanel
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Switch to Privacy Audit tab
    const auditTab = screen.getByText('Privacy Audit');
    fireEvent.click(auditTab);

    // Click refresh button
    const refreshButton = screen.getByText('Refresh Audit');
    fireEvent.click(refreshButton);

    expect(mockPrivacyManager.auditStoredData).toHaveBeenCalledTimes(2); // Once on mount, once on refresh
  });

  it('closes panel when close button is clicked', () => {
    render(
      <PrivacyPanel
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays storage usage information', () => {
    render(
      <PrivacyPanel
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Switch to Privacy Audit tab
    const auditTab = screen.getByText('Privacy Audit');
    fireEvent.click(auditTab);

    expect(screen.getByText('Storage Usage')).toBeInTheDocument();
    expect(screen.getByText('1.0 KB used')).toBeInTheDocument();
    expect(screen.getByText('3 data categories')).toBeInTheDocument();
  });

  it('shows data categories in audit', () => {
    render(
      <PrivacyPanel
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Switch to Privacy Audit tab
    const auditTab = screen.getByText('Privacy Audit');
    fireEvent.click(auditTab);

    expect(screen.getByText('Data Categories')).toBeInTheDocument();
    expect(screen.getByText('mood preferences')).toBeInTheDocument();
    expect(screen.getByText('playback settings')).toBeInTheDocument();
    expect(screen.getByText('favorites')).toBeInTheDocument();
  });
});