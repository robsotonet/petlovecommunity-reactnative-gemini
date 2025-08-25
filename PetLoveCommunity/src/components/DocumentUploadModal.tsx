// Pet Love Community - Document Upload Modal
// Modal component for document capture and upload with multiple source options

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useColors } from '../hooks/useColors';
import { useDocumentUpload } from '../hooks/useDocumentUpload';
import Button from './Button';
import Card from './Card';
import { DocumentType, DocumentSource } from '../services/documentUploadService';

interface DocumentUploadModalProps {
  visible: boolean;
  onClose: () => void;
  applicationId: string;
  documentType: DocumentType;
  title?: string;
  description?: string;
  allowMultiple?: boolean;
}

const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  visible,
  onClose,
  applicationId,
  documentType,
  title,
  description,
  allowMultiple = false,
}) => {
  const colors = useColors();
  const [uploading, setUploading] = useState(false);

  const {
    pickDocument,
    captureDocument,
    getDocumentsByType,
    canAddDocument,
  } = useDocumentUpload({
    applicationId,
    onUploadComplete: (result) => {
      if (result.success) {
        Alert.alert(
          'Document Uploaded',
          `${getDocumentTypeLabel(documentType)} has been added successfully.`,
          [{ text: 'OK', onPress: onClose }]
        );
      }
    },
    onUploadError: (error) => {
      Alert.alert(
        'Upload Failed',
        error,
        [{ text: 'OK' }]
      );
      setUploading(false);
    },
  });

  const existingDocuments = getDocumentsByType(documentType);
  const canAdd = canAddDocument(documentType);

  const handleCameraCapture = async () => {
    if (!canAdd) {
      Alert.alert(
        'Maximum Documents',
        `You have already uploaded the maximum number of ${getDocumentTypeLabel(documentType)} documents.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setUploading(true);
    try {
      const result = await captureDocument(documentType, {
        description: `${getDocumentTypeLabel(documentType)} captured via camera`,
      });

      if (!result.success) {
        Alert.alert('Capture Failed', result.error || 'Unknown error', [{ text: 'OK' }]);
      }
    } catch (error) {
      Alert.alert('Capture Failed', 'An unexpected error occurred', [{ text: 'OK' }]);
    }
    setUploading(false);
  };

  const handleFilePicker = async () => {
    if (!canAdd) {
      Alert.alert(
        'Maximum Documents',
        `You have already uploaded the maximum number of ${getDocumentTypeLabel(documentType)} documents.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setUploading(true);
    try {
      const result = await pickDocument(documentType, {
        description: `${getDocumentTypeLabel(documentType)} selected from files`,
      });

      if (!result.success) {
        Alert.alert('Upload Failed', result.error || 'Unknown error', [{ text: 'OK' }]);
      }
    } catch (error) {
      Alert.alert('Upload Failed', 'An unexpected error occurred', [{ text: 'OK' }]);
    }
    setUploading(false);
  };

  const getDocumentTypeLabel = (type: DocumentType): string => {
    switch (type) {
      case DocumentType.ID:
        return 'Government ID';
      case DocumentType.PROOF_OF_RESIDENCE:
        return 'Proof of Residence';
      case DocumentType.LANDLORD_APPROVAL:
        return 'Landlord Approval';
      case DocumentType.VET_RECORDS:
        return 'Veterinary Records';
      case DocumentType.INCOME_VERIFICATION:
        return 'Income Verification';
      case DocumentType.REFERENCES:
        return 'Personal References';
      case DocumentType.OTHER:
        return 'Other Documents';
      default:
        return 'Document';
    }
  };

  const getDocumentDescription = (type: DocumentType): string => {
    switch (type) {
      case DocumentType.ID:
        return 'Please provide a clear photo of your government-issued ID (driver\'s license, passport, or state ID).';
      case DocumentType.PROOF_OF_RESIDENCE:
        return 'Upload a recent utility bill, lease agreement, or bank statement showing your current address.';
      case DocumentType.LANDLORD_APPROVAL:
        return 'If you rent, please provide written approval from your landlord allowing pets.';
      case DocumentType.VET_RECORDS:
        return 'Upload vaccination records and health certificates for your current pets.';
      case DocumentType.INCOME_VERIFICATION:
        return 'Provide recent pay stubs, tax returns, or other proof of income.';
      case DocumentType.REFERENCES:
        return 'Upload contact information for personal or professional references.';
      case DocumentType.OTHER:
        return 'Upload any additional documents requested by the shelter.';
      default:
        return 'Please select how you\'d like to provide this document.';
    }
  };

  const getFileRequirements = (type: DocumentType): string => {
    switch (type) {
      case DocumentType.ID:
      case DocumentType.PROOF_OF_RESIDENCE:
        return 'Accepted formats: JPEG, PNG, PDF • Max size: 10MB';
      case DocumentType.VET_RECORDS:
        return 'Accepted formats: JPEG, PNG, PDF • Max size: 15MB';
      default:
        return 'Accepted formats: JPEG, PNG, PDF • Max size: 10MB';
    }
  };

  const modalTitle = title || `Upload ${getDocumentTypeLabel(documentType)}`;
  const modalDescription = description || getDocumentDescription(documentType);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.neutral.beige }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.extended.tealVariations.light }]}>
          <Text style={[styles.headerTitle, { color: colors.neutral.midnight }]}>
            {modalTitle}
          </Text>
          <TouchableOpacity 
            onPress={onClose} 
            style={styles.closeButton}
            disabled={uploading}
          >
            <Text style={[styles.closeButtonText, { color: colors.primary.teal }]}>
              {uploading ? 'Uploading...' : 'Close'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Description */}
          <Card style={styles.descriptionCard}>
            <Text style={[styles.description, { color: colors.extended.textVariations.secondary }]}>
              {modalDescription}
            </Text>
            
            <Text style={[styles.requirements, { color: colors.extended.textVariations.tertiary }]}>
              {getFileRequirements(documentType)}
            </Text>
          </Card>

          {/* Existing Documents */}
          {existingDocuments.length > 0 && (
            <Card style={styles.existingCard}>
              <Text style={[styles.sectionTitle, { color: colors.neutral.midnight }]}>
                Current Documents ({existingDocuments.length})
              </Text>
              {existingDocuments.map((doc) => (
                <View key={doc.id} style={[styles.documentItem, { backgroundColor: colors.extended.tealVariations.background }]}>
                  <View style={styles.documentInfo}>
                    <Text style={[styles.documentName, { color: colors.neutral.midnight }]}>
                      📄 {doc.fileName}
                    </Text>
                    <Text style={[styles.documentMeta, { color: colors.extended.textVariations.secondary }]}>
                      {(doc.fileSize / 1024).toFixed(1)} KB
                      {doc.uploadedAt && ' • Uploaded'}
                      {!doc.uploadedAt && ' • Pending upload'}
                    </Text>
                  </View>
                  <View style={[
                    styles.documentStatus,
                    {
                      backgroundColor: doc.uploadedAt ? colors.semantic.success : colors.extended.orangeVariations.light,
                    }
                  ]}>
                    <Text style={[styles.statusText, { color: '#FFFFFF' }]}>
                      {doc.uploadedAt ? '✓' : '⏳'}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          )}

          {/* Upload Options */}
          {canAdd && (
            <Card style={styles.optionsCard}>
              <Text style={[styles.sectionTitle, { color: colors.neutral.midnight }]}>
                How would you like to add this document?
              </Text>

              {/* Camera Option */}
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  { 
                    backgroundColor: colors.extended.tealVariations.background,
                    borderColor: colors.extended.tealVariations.light,
                  }
                ]}
                onPress={handleCameraCapture}
                disabled={uploading}
              >
                <View style={styles.optionIcon}>
                  <Text style={styles.optionIconText}>📷</Text>
                </View>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionTitle, { color: colors.neutral.midnight }]}>
                    Take Photo
                  </Text>
                  <Text style={[styles.optionDescription, { color: colors.extended.textVariations.secondary }]}>
                    Use your camera to capture the document
                  </Text>
                </View>
                {uploading && (
                  <ActivityIndicator 
                    size="small" 
                    color={colors.primary.teal} 
                  />
                )}
              </TouchableOpacity>

              {/* File Picker Option */}
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  { 
                    backgroundColor: colors.extended.tealVariations.background,
                    borderColor: colors.extended.tealVariations.light,
                  }
                ]}
                onPress={handleFilePicker}
                disabled={uploading}
              >
                <View style={styles.optionIcon}>
                  <Text style={styles.optionIconText}>📁</Text>
                </View>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionTitle, { color: colors.neutral.midnight }]}>
                    Choose File
                  </Text>
                  <Text style={[styles.optionDescription, { color: colors.extended.textVariations.secondary }]}>
                    Select from your device's storage
                  </Text>
                </View>
                {uploading && (
                  <ActivityIndicator 
                    size="small" 
                    color={colors.primary.teal} 
                  />
                )}
              </TouchableOpacity>
            </Card>
          )}

          {/* Maximum Reached Message */}
          {!canAdd && (
            <Card style={[styles.warningCard, { backgroundColor: colors.extended.orangeVariations.background }]}>
              <Text style={[styles.warningTitle, { color: colors.extended.orangeVariations.dark }]}>
                Maximum Documents Reached
              </Text>
              <Text style={[styles.warningText, { color: colors.extended.textVariations.secondary }]}>
                You have uploaded the maximum number of {getDocumentTypeLabel(documentType)} documents allowed.
                {existingDocuments.length > 0 && ' You can delete an existing document to upload a new one.'}
              </Text>
            </Card>
          )}

          {/* Upload Tips */}
          <Card style={[styles.tipsCard, { backgroundColor: colors.extended.tealVariations.background }]}>
            <Text style={[styles.tipsTitle, { color: colors.neutral.midnight }]}>
              📋 Tips for Better Results
            </Text>
            <View style={styles.tipsList}>
              <Text style={[styles.tipItem, { color: colors.extended.textVariations.secondary }]}>
                • Ensure all text is clearly readable
              </Text>
              <Text style={[styles.tipItem, { color: colors.extended.textVariations.secondary }]}>
                • Use good lighting and avoid shadows
              </Text>
              <Text style={[styles.tipItem, { color: colors.extended.textVariations.secondary }]}>
                • Keep the document flat and fully visible
              </Text>
              <Text style={[styles.tipItem, { color: colors.extended.textVariations.secondary }]}>
                • PDF files are preferred for multi-page documents
              </Text>
            </View>
          </Card>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  descriptionCard: {
    marginBottom: 20,
    padding: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },
  requirements: {
    fontSize: 14,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  existingCard: {
    marginBottom: 20,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  documentMeta: {
    fontSize: 14,
  },
  documentStatus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionsCard: {
    marginBottom: 20,
    padding: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionIconText: {
    fontSize: 24,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  warningCard: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
  },
  tipsCard: {
    padding: 16,
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tipsList: {
    gap: 4,
  },
  tipItem: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default DocumentUploadModal;