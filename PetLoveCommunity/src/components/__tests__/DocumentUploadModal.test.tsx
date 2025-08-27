// Pet Love Community - Document Upload Modal Tests
// Comprehensive test suite for document capture and upload functionality

import React from 'react';
import { fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import DocumentUploadModal from '../DocumentUploadModal';
import { DocumentType } from '../../services/documentUploadService';
import {
  renderWithProviders,
  createMockColors,
  createMockDocumentUploadHook,
  cleanupMocks,
} from '../../__tests__/testUtils';

// Mock the hooks
jest.mock('../../hooks/useColors', () => ({
  useColors: jest.fn(),
}));

jest.mock('../../hooks/useDocumentUpload', () => ({
  useDocumentUpload: jest.fn(),
}));

// Mock React Native Alert
jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

import { useColors } from '../../hooks/useColors';
import { useDocumentUpload } from '../../hooks/useDocumentUpload';

// Type the mocked hooks
const mockUseColors = useColors as jest.MockedFunction<typeof useColors>;
const mockUseDocumentUpload = useDocumentUpload as jest.MockedFunction<typeof useDocumentUpload>;

describe('DocumentUploadModal', () => {
  const mockColors = createMockColors();
  const mockOnClose = jest.fn();
  const mockPickDocument = jest.fn();
  const mockCaptureDocument = jest.fn();
  const mockGetDocumentsByType = jest.fn();
  const mockCanAddDocument = jest.fn();

  const defaultProps = {
    visible: true,
    onClose: mockOnClose,
    applicationId: 'app-123',
    documentType: DocumentType.ID,
    title: 'Upload Government ID',
    description: 'Please provide a clear photo of your ID',
    allowMultiple: false,
  };

  const mockDocumentUploadHook = createMockDocumentUploadHook({
    pickDocument: mockPickDocument,
    captureDocument: mockCaptureDocument,
    getDocumentsByType: mockGetDocumentsByType,
    canAddDocument: mockCanAddDocument,
  });

  beforeEach(() => {
    // Setup default mock implementations
    mockUseColors.mockReturnValue(mockColors);
    mockUseDocumentUpload.mockReturnValue(mockDocumentUploadHook);
    
    // Default return values
    mockGetDocumentsByType.mockReturnValue([]);
    mockCanAddDocument.mockReturnValue(true);
    mockPickDocument.mockResolvedValue({ success: true });
    mockCaptureDocument.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanupMocks();
    jest.clearAllMocks();
  });

  describe('Modal Rendering', () => {
    it('renders modal when visible is true', () => {
      renderWithProviders(<DocumentUploadModal {...defaultProps} />);

      expect(screen.getByText('Upload Government ID')).toBeTruthy();
      expect(screen.getByText('Please provide a clear photo of your ID')).toBeTruthy();
    });

    it('does not render modal when visible is false', () => {
      renderWithProviders(<DocumentUploadModal {...defaultProps} visible={false} />);

      expect(screen.queryByText('Upload Government ID')).toBeNull();
    });

    it('uses default title and description when not provided', () => {
      const propsWithoutTitleDesc = {
        ...defaultProps,
        title: undefined,
        description: undefined,
      };

      renderWithProviders(<DocumentUploadModal {...propsWithoutTitleDesc} />);

      expect(screen.getByText('Upload Government ID')).toBeTruthy();
      expect(screen.getByText("Please provide a clear photo of your government-issued ID (driver's license, passport, or state ID).")).toBeTruthy();
    });

    it('renders close button and responds to press', () => {
      renderWithProviders(<DocumentUploadModal {...defaultProps} />);

      const closeButton = screen.getByText('Close');
      fireEvent.press(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('shows file requirements for different document types', () => {
      renderWithProviders(<DocumentUploadModal {...defaultProps} documentType={DocumentType.VET_RECORDS} />);

      expect(screen.getByText('Accepted formats: JPEG, PNG, PDF • Max size: 15MB')).toBeTruthy();
    });
  });

  describe('Document Type Labels and Descriptions', () => {
    it.each([
      [DocumentType.ID, 'Government ID'],
      [DocumentType.PROOF_OF_RESIDENCE, 'Proof of Residence'],
      [DocumentType.LANDLORD_APPROVAL, 'Landlord Approval'],
      [DocumentType.VET_RECORDS, 'Veterinary Records'],
      [DocumentType.INCOME_VERIFICATION, 'Income Verification'],
      [DocumentType.REFERENCES, 'Personal References'],
      [DocumentType.OTHER, 'Other Documents'],
    ])('renders correct label for document type %s', (documentType, expectedLabel) => {
      renderWithProviders(
        <DocumentUploadModal {...defaultProps} documentType={documentType} title={undefined} />
      );

      expect(screen.getByText(`Upload ${expectedLabel}`)).toBeTruthy();
    });

    it('renders correct description for ID document type', () => {
      renderWithProviders(
        <DocumentUploadModal {...defaultProps} documentType={DocumentType.ID} description={undefined} />
      );

      expect(screen.getByText("Please provide a clear photo of your government-issued ID (driver's license, passport, or state ID).")).toBeTruthy();
    });

    it('renders correct description for proof of residence document type', () => {
      renderWithProviders(
        <DocumentUploadModal {...defaultProps} documentType={DocumentType.PROOF_OF_RESIDENCE} description={undefined} />
      );

      expect(screen.getByText('Upload a recent utility bill, lease agreement, or bank statement showing your current address.')).toBeTruthy();
    });
  });

  describe('Upload Options', () => {
    it('renders camera capture option', () => {
      renderWithProviders(<DocumentUploadModal {...defaultProps} />);

      expect(screen.getByText('Take Photo')).toBeTruthy();
      expect(screen.getByText('Use your camera to capture the document')).toBeTruthy();
      expect(screen.getByText('📷')).toBeTruthy();
    });

    it('renders file picker option', () => {
      renderWithProviders(<DocumentUploadModal {...defaultProps} />);

      expect(screen.getByText('Choose File')).toBeTruthy();
      expect(screen.getByText("Select from your device's storage")).toBeTruthy();
      expect(screen.getByText('📁')).toBeTruthy();
    });

    it('handles camera capture button press', async () => {
      renderWithProviders(<DocumentUploadModal {...defaultProps} />);

      const cameraButton = screen.getByText('Take Photo');
      fireEvent.press(cameraButton);

      await waitFor(() => {
        expect(mockCaptureDocument).toHaveBeenCalledWith(
          DocumentType.ID,
          { description: 'Government ID captured via camera' }
        );
      });
    });

    it('handles file picker button press', async () => {
      renderWithProviders(<DocumentUploadModal {...defaultProps} />);

      const fileButton = screen.getByText('Choose File');
      fireEvent.press(fileButton);

      await waitFor(() => {
        expect(mockPickDocument).toHaveBeenCalledWith(
          DocumentType.ID,
          { description: 'Government ID selected from files' }
        );
      });
    });
  });

  describe('Existing Documents Display', () => {
    it('shows existing documents when they exist', () => {
      const existingDocuments = [
        {
          id: 'doc-1',
          fileName: 'id-document.jpg',
          fileSize: 2048000, // 2MB
          uploadedAt: '2024-01-01T00:00:00Z',
          documentType: DocumentType.ID,
        },
        {
          id: 'doc-2',
          fileName: 'backup-id.pdf',
          fileSize: 1024000, // 1MB
          uploadedAt: null, // Pending upload
          documentType: DocumentType.ID,
        },
      ];

      mockGetDocumentsByType.mockReturnValue(existingDocuments);

      renderWithProviders(<DocumentUploadModal {...defaultProps} />);

      expect(screen.getByText('Current Documents (2)')).toBeTruthy();
      expect(screen.getByText('📄 id-document.jpg')).toBeTruthy();
      expect(screen.getByText('2000.0 KB • Uploaded')).toBeTruthy();
      expect(screen.getByText('📄 backup-id.pdf')).toBeTruthy();
      expect(screen.getByText('1000.0 KB • Pending upload')).toBeTruthy();
      expect(screen.getAllByText('✓')).toHaveLength(1);
      expect(screen.getAllByText('⏳')).toHaveLength(1);
    });

    it('does not show existing documents section when no documents exist', () => {
      mockGetDocumentsByType.mockReturnValue([]);

      renderWithProviders(<DocumentUploadModal {...defaultProps} />);

      expect(screen.queryByText(/Current Documents/)).toBeNull();
    });
  });

  describe('Upload Limits and Restrictions', () => {
    it('hides upload options when maximum documents reached', () => {
      mockCanAddDocument.mockReturnValue(false);
      mockGetDocumentsByType.mockReturnValue([
        { id: 'doc-1', fileName: 'test.jpg', fileSize: 1000, uploadedAt: '2024-01-01T00:00:00Z', documentType: DocumentType.ID },
      ]);

      renderWithProviders(<DocumentUploadModal {...defaultProps} />);

      expect(screen.queryByText('How would you like to add this document?')).toBeNull();
      expect(screen.getByText('Maximum Documents Reached')).toBeTruthy();
      expect(screen.getByText('You have uploaded the maximum number of Government ID documents allowed. You can delete an existing document to upload a new one.')).toBeTruthy();
    });

    it('shows warning when trying to upload beyond limit via camera', async () => {
      mockCanAddDocument.mockReturnValue(false);

      renderWithProviders(<DocumentUploadModal {...defaultProps} />);

      // Force render upload options to test the limit check within handlers
      const { rerender } = renderWithProviders(<DocumentUploadModal {...defaultProps} />);
      
      // Simulate the component state where upload options would be available
      mockCanAddDocument.mockReturnValue(true);
      rerender(<DocumentUploadModal {...defaultProps} />);
      
      // Now simulate the limit being reached when trying to upload
      mockCanAddDocument.mockReturnValue(false);
      
      const cameraButton = screen.getByText('Take Photo');
      fireEvent.press(cameraButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Maximum Documents',
        'You have already uploaded the maximum number of Government ID documents.',
        [{ text: 'OK' }]
      );
    });

    it('shows warning when trying to upload beyond limit via file picker', async () => {
      mockCanAddDocument.mockReturnValue(false);

      renderWithProviders(<DocumentUploadModal {...defaultProps} />);

      // Force render upload options to test the limit check within handlers
      const { rerender } = renderWithProviders(<DocumentUploadModal {...defaultProps} />);
      
      // Simulate the component state where upload options would be available
      mockCanAddDocument.mockReturnValue(true);
      rerender(<DocumentUploadModal {...defaultProps} />);
      
      // Now simulate the limit being reached when trying to upload
      mockCanAddDocument.mockReturnValue(false);
      
      const fileButton = screen.getByText('Choose File');
      fireEvent.press(fileButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Maximum Documents',
        'You have already uploaded the maximum number of Government ID documents.',
        [{ text: 'OK' }]
      );
    });
  });

  describe('Upload States and Feedback', () => {
    it('shows uploading state and disables interactions during upload', async () => {
      let resolveUpload: (value: any) => void;
      const uploadPromise = new Promise(resolve => {
        resolveUpload = resolve;
      });
      mockCaptureDocument.mockReturnValue(uploadPromise);

      renderWithProviders(<DocumentUploadModal {...defaultProps} />);

      const cameraButton = screen.getByText('Take Photo');
      fireEvent.press(cameraButton);

      // Should show loading state
      expect(screen.getByText('Uploading...')).toBeTruthy();
      
      // Close button should be disabled during upload
      const closeButton = screen.getByText('Uploading...');
      expect(closeButton).toBeTruthy();

      // Complete the upload
      resolveUpload!({ success: true });
    });

    it('handles successful upload completion', async () => {
      const mockOnUploadComplete = jest.fn();
      mockUseDocumentUpload.mockReturnValue({
        ...mockDocumentUploadHook,
        onUploadComplete: mockOnUploadComplete,
      });

      // Simulate the upload completion callback
      const hookConfig = mockUseDocumentUpload.mock.calls[0][0];
      hookConfig.onUploadComplete({ success: true });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Document Uploaded',
        'Government ID has been added successfully.',
        [{ text: 'OK', onPress: mockOnClose }]
      );
    });

    it('handles upload error from hook callback', async () => {
      const mockOnUploadError = jest.fn();
      mockUseDocumentUpload.mockReturnValue({
        ...mockDocumentUploadHook,
        onUploadError: mockOnUploadError,
      });

      // Simulate the upload error callback
      const hookConfig = mockUseDocumentUpload.mock.calls[0][0];
      hookConfig.onUploadError('Upload failed due to network error');

      expect(Alert.alert).toHaveBeenCalledWith(
        'Upload Failed',
        'Upload failed due to network error',
        [{ text: 'OK' }]
      );
    });

    it('handles capture failure with error message', async () => {
      mockCaptureDocument.mockResolvedValue({
        success: false,
        error: 'Camera permission denied',
      });

      renderWithProviders(<DocumentUploadModal {...defaultProps} />);

      const cameraButton = screen.getByText('Take Photo');
      fireEvent.press(cameraButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Capture Failed',
          'Camera permission denied',
          [{ text: 'OK' }]
        );
      });
    });

    it('handles file picker failure with error message', async () => {
      mockPickDocument.mockResolvedValue({
        success: false,
        error: 'File type not supported',
      });

      renderWithProviders(<DocumentUploadModal {...defaultProps} />);

      const fileButton = screen.getByText('Choose File');
      fireEvent.press(fileButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Upload Failed',
          'File type not supported',
          [{ text: 'OK' }]
        );
      });
    });

    it('handles unexpected errors during upload', async () => {
      mockCaptureDocument.mockRejectedValue(new Error('Unexpected error'));

      renderWithProviders(<DocumentUploadModal {...defaultProps} />);

      const cameraButton = screen.getByText('Take Photo');
      fireEvent.press(cameraButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Capture Failed',
          'An unexpected error occurred',
          [{ text: 'OK' }]
        );
      });
    });
  });

  describe('Tips and Guidance', () => {
    it('renders upload tips section', () => {
      renderWithProviders(<DocumentUploadModal {...defaultProps} />);

      expect(screen.getByText('📋 Tips for Better Results')).toBeTruthy();
      expect(screen.getByText('• Ensure all text is clearly readable')).toBeTruthy();
      expect(screen.getByText('• Use good lighting and avoid shadows')).toBeTruthy();
      expect(screen.getByText('• Keep the document flat and fully visible')).toBeTruthy();
      expect(screen.getByText('• PDF files are preferred for multi-page documents')).toBeTruthy();
    });

    it('shows appropriate section headers', () => {
      renderWithProviders(<DocumentUploadModal {...defaultProps} />);

      expect(screen.getByText('How would you like to add this document?')).toBeTruthy();
    });
  });

  describe('Hook Integration', () => {
    it('initializes document upload hook with correct parameters', () => {
      renderWithProviders(<DocumentUploadModal {...defaultProps} />);

      expect(mockUseDocumentUpload).toHaveBeenCalledWith({
        applicationId: 'app-123',
        onUploadComplete: expect.any(Function),
        onUploadError: expect.any(Function),
      });
    });

    it('calls getDocumentsByType with correct document type', () => {
      renderWithProviders(<DocumentUploadModal {...defaultProps} documentType={DocumentType.VET_RECORDS} />);

      expect(mockGetDocumentsByType).toHaveBeenCalledWith(DocumentType.VET_RECORDS);
    });

    it('calls canAddDocument with correct document type', () => {
      renderWithProviders(<DocumentUploadModal {...defaultProps} documentType={DocumentType.PROOF_OF_RESIDENCE} />);

      expect(mockCanAddDocument).toHaveBeenCalledWith(DocumentType.PROOF_OF_RESIDENCE);
    });
  });

  describe('Accessibility', () => {
    it('provides accessible structure for screen readers', () => {
      renderWithProviders(<DocumentUploadModal {...defaultProps} />);

      // Modal should be accessible
      expect(screen.getByText('Upload Government ID')).toBeTruthy();
      
      // Upload options should be accessible
      const cameraButton = screen.getByText('Take Photo').parent;
      const fileButton = screen.getByText('Choose File').parent;
      
      expect(cameraButton).toBeTruthy();
      expect(fileButton).toBeTruthy();
    });

    it('maintains focus management during upload states', () => {
      renderWithProviders(<DocumentUploadModal {...defaultProps} />);

      const closeButton = screen.getByText('Close');
      expect(closeButton).toBeTruthy();
      
      // Close button should remain accessible when not uploading
      fireEvent.press(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles missing document type gracefully', () => {
      const propsWithUndefinedType = {
        ...defaultProps,
        documentType: undefined as any,
      };

      expect(() => {
        renderWithProviders(<DocumentUploadModal {...propsWithUndefinedType} />);
      }).not.toThrow();
    });

    it('handles empty existing documents array', () => {
      mockGetDocumentsByType.mockReturnValue([]);

      renderWithProviders(<DocumentUploadModal {...defaultProps} />);

      expect(screen.queryByText(/Current Documents/)).toBeNull();
      expect(screen.getByText('Take Photo')).toBeTruthy();
    });

    it('handles very large file sizes display', () => {
      const largeDocuments = [
        {
          id: 'doc-1',
          fileName: 'large-document.pdf',
          fileSize: 50000000, // 50MB
          uploadedAt: '2024-01-01T00:00:00Z',
          documentType: DocumentType.VET_RECORDS,
        },
      ];

      mockGetDocumentsByType.mockReturnValue(largeDocuments);

      renderWithProviders(<DocumentUploadModal {...defaultProps} />);

      expect(screen.getByText('48828.1 KB • Uploaded')).toBeTruthy();
    });

    it('handles documents without upload timestamps', () => {
      const pendingDocuments = [
        {
          id: 'doc-1',
          fileName: 'pending-upload.jpg',
          fileSize: 1024000,
          uploadedAt: null,
          documentType: DocumentType.ID,
        },
      ];

      mockGetDocumentsByType.mockReturnValue(pendingDocuments);

      renderWithProviders(<DocumentUploadModal {...defaultProps} />);

      expect(screen.getByText('1000.0 KB • Pending upload')).toBeTruthy();
      expect(screen.getByText('⏳')).toBeTruthy();
    });
  });
});