// Pet Love Community - Documents Form Step
// Document upload step for adoption applications with required and optional documents

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useColors } from '../../hooks/useColors';
import { useDocumentUpload } from '../../hooks/useDocumentUpload';
import DocumentUploadModal from '../DocumentUploadModal';
import Card from '../Card';
import { DocumentType, CachedDocument } from '../../services/documentUploadService';
import type { AdoptionApplication } from '../../types/pet';

interface DocumentsStepProps {
  data?: AdoptionApplication;
  applicationId: string;
  onUpdate: (updates: Partial<AdoptionApplication>) => void;
}

const DocumentsStep: React.FC<DocumentsStepProps> = ({ data, applicationId, onUpdate }) => {
  const colors = useColors();
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType | null>(null);

  const {
    documents,
    uploadStatus,
    getDocumentsByType,
    hasRequiredDocuments,
    getMissingRequiredDocuments,
    canAddDocument,
    deleteDocument,
    retryFailedUploads,
  } = useDocumentUpload({
    applicationId,
    onUploadComplete: (result) => {
      if (result.success) {
        // Trigger form update to reflect new document status
        onUpdate({});
      }
    },
  });

  const requiredDocumentTypes = [
    DocumentType.ID,
    DocumentType.PROOF_OF_RESIDENCE,
  ];

  const optionalDocumentTypes = [
    DocumentType.LANDLORD_APPROVAL,
    DocumentType.VET_RECORDS,
    DocumentType.INCOME_VERIFICATION,
    DocumentType.REFERENCES,
    DocumentType.OTHER,
  ];

  const getDocumentTypeInfo = (type: DocumentType) => {
    const configs = {
      [DocumentType.ID]: {
        title: 'Government ID',
        description: 'Driver\'s license, passport, or state-issued ID',
        icon: '🪪',
        required: true,
      },
      [DocumentType.PROOF_OF_RESIDENCE]: {
        title: 'Proof of Residence',
        description: 'Recent utility bill, lease agreement, or bank statement',
        icon: '🏠',
        required: true,
      },
      [DocumentType.LANDLORD_APPROVAL]: {
        title: 'Landlord Approval',
        description: 'Written permission to have pets (if renting)',
        icon: '📋',
        required: false,
      },
      [DocumentType.VET_RECORDS]: {
        title: 'Veterinary Records',
        description: 'Vaccination records for current pets',
        icon: '🏥',
        required: false,
      },
      [DocumentType.INCOME_VERIFICATION]: {
        title: 'Income Verification',
        description: 'Pay stubs or tax returns',
        icon: '💼',
        required: false,
      },
      [DocumentType.REFERENCES]: {
        title: 'Personal References',
        description: 'Contact information for references',
        icon: '👥',
        required: false,
      },
      [DocumentType.OTHER]: {
        title: 'Other Documents',
        description: 'Additional documents requested by shelter',
        icon: '📎',
        required: false,
      },
    };

    return configs[type];
  };

  const getDocumentStatus = (type: DocumentType) => {
    const docs = getDocumentsByType(type);
    if (docs.length === 0) {
      return { status: 'missing', color: colors.extended.textVariations.tertiary, icon: '⭕' };
    }

    const uploaded = docs.filter(doc => doc.uploadedAt);
    const pending = docs.filter(doc => !doc.uploadedAt);

    if (pending.length > 0) {
      return { status: 'pending', color: colors.extended.orangeVariations.dark, icon: '⏳' };
    }

    return { status: 'completed', color: colors.semantic.success, icon: '✅' };
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await deleteDocument(documentId);
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const renderDocumentTypeCard = (type: DocumentType, isRequired: boolean) => {
    const info = getDocumentTypeInfo(type);
    const status = getDocumentStatus(type);
    const docs = getDocumentsByType(type);
    const canAdd = canAddDocument(type);

    return (
      <Card key={type} style={styles.documentCard}>
        <View style={styles.documentHeader}>
          <View style={styles.documentTitleSection}>
            <Text style={styles.documentIcon}>{info.icon}</Text>
            <View style={styles.documentTitleContent}>
              <View style={styles.documentTitleRow}>
                <Text style={[styles.documentTitle, { color: colors.neutral.midnight }]}>
                  {info.title}
                </Text>
                {isRequired && (
                  <View style={[styles.requiredBadge, { backgroundColor: colors.primary.coral }]}>
                    <Text style={styles.requiredText}>Required</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.documentDescription, { color: colors.extended.textVariations.secondary }]}>
                {info.description}
              </Text>
            </View>
          </View>
          
          <View style={styles.documentStatus}>
            <Text style={[styles.statusIcon, { color: status.color }]}>
              {status.icon}
            </Text>
          </View>
        </View>

        {/* Uploaded Documents */}
        {docs.length > 0 && (
          <View style={styles.uploadedDocuments}>
            {docs.map((doc) => (
              <View key={doc.id} style={[styles.documentItem, { backgroundColor: colors.extended.tealVariations.background }]}>
                <View style={styles.documentInfo}>
                  <Text style={[styles.documentName, { color: colors.neutral.midnight }]}>
                    📄 {doc.fileName}
                  </Text>
                  <Text style={[styles.documentMeta, { color: colors.extended.textVariations.secondary }]}>
                    {(doc.fileSize / 1024).toFixed(1)} KB
                    {doc.uploadedAt ? ' • Uploaded' : ' • Uploading...'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.deleteButton, { backgroundColor: colors.semantic.error }]}
                  onPress={() => handleDeleteDocument(doc.id)}
                >
                  <Text style={styles.deleteButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Upload Button */}
        {canAdd && (
          <TouchableOpacity
            style={[
              styles.uploadButton,
              {
                backgroundColor: colors.extended.tealVariations.background,
                borderColor: colors.primary.teal,
              }
            ]}
            onPress={() => setSelectedDocumentType(type)}
          >
            <Text style={[styles.uploadButtonText, { color: colors.primary.teal }]}>
              {docs.length > 0 ? '+ Add Another' : `Upload ${info.title}`}
            </Text>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  const missingRequired = getMissingRequiredDocuments();

  return (
    <View style={styles.container}>
      <Text style={[styles.description, { color: colors.extended.textVariations.secondary }]}>
        Please provide the required documents to complete your adoption application. 
        Optional documents can help speed up the review process.
      </Text>

      {/* Upload Status Summary */}
      {(uploadStatus.totalPending > 0 || uploadStatus.totalFailed > 0) && (
        <Card style={[styles.statusCard, { backgroundColor: colors.extended.orangeVariations.background }]}>
          <View style={styles.statusHeader}>
            <Text style={[styles.statusTitle, { color: colors.extended.orangeVariations.dark }]}>
              Upload Status
            </Text>
            {uploadStatus.totalFailed > 0 && (
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: colors.primary.coral }]}
                onPress={retryFailedUploads}
              >
                <Text style={styles.retryButtonText}>Retry Failed</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.statusText, { color: colors.extended.textVariations.secondary }]}>
            {uploadStatus.totalPending > 0 && `${uploadStatus.totalPending} uploads pending. `}
            {uploadStatus.totalFailed > 0 && `${uploadStatus.totalFailed} uploads failed. `}
            {uploadStatus.isProcessing && 'Processing uploads...'}
          </Text>
        </Card>
      )}

      {/* Missing Required Documents Alert */}
      {missingRequired.length > 0 && (
        <Card style={[styles.alertCard, { backgroundColor: colors.semantic.error + '15', borderColor: colors.semantic.error }]}>
          <Text style={[styles.alertTitle, { color: colors.semantic.error }]}>
            ⚠️ Required Documents Missing
          </Text>
          <Text style={[styles.alertText, { color: colors.extended.textVariations.secondary }]}>
            Please upload the following required documents to complete your application:
          </Text>
          <View style={styles.missingList}>
            {missingRequired.map(type => (
              <Text key={type} style={[styles.missingItem, { color: colors.semantic.error }]}>
                • {getDocumentTypeInfo(type).title}
              </Text>
            ))}
          </View>
        </Card>
      )}

      <ScrollView showsVerticalScrollIndicator={false} style={styles.documentsScrollView}>
        {/* Required Documents */}
        <Text style={[styles.sectionTitle, { color: colors.neutral.midnight }]}>
          Required Documents
        </Text>
        {requiredDocumentTypes.map(type => renderDocumentTypeCard(type, true))}

        {/* Optional Documents */}
        <Text style={[styles.sectionTitle, { color: colors.neutral.midnight }]}>
          Optional Documents
        </Text>
        <Text style={[styles.sectionDescription, { color: colors.extended.textVariations.secondary }]}>
          These documents can help expedite your application review process.
        </Text>
        {optionalDocumentTypes.map(type => renderDocumentTypeCard(type, false))}

        {/* Completion Status */}
        {hasRequiredDocuments() && (
          <Card style={[styles.completionCard, { backgroundColor: colors.semantic.success + '15', borderColor: colors.semantic.success }]}>
            <Text style={[styles.completionTitle, { color: colors.semantic.success }]}>
              ✅ All Required Documents Uploaded
            </Text>
            <Text style={[styles.completionText, { color: colors.extended.textVariations.secondary }]}>
              Great! You have provided all required documents. You can now proceed to the next step or add optional documents to strengthen your application.
            </Text>
          </Card>
        )}
      </ScrollView>

      {/* Document Upload Modal */}
      {selectedDocumentType && (
        <DocumentUploadModal
          visible={true}
          onClose={() => setSelectedDocumentType(null)}
          applicationId={applicationId}
          documentType={selectedDocumentType}
          allowMultiple={
            selectedDocumentType === DocumentType.VET_RECORDS ||
            selectedDocumentType === DocumentType.REFERENCES ||
            selectedDocumentType === DocumentType.OTHER
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 20,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
  },
  statusCard: {
    padding: 16,
    borderRadius: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  alertCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  alertText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  missingList: {
    gap: 4,
  },
  missingItem: {
    fontSize: 14,
    fontWeight: '500',
  },
  documentsScrollView: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 16,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  documentCard: {
    padding: 16,
    marginBottom: 16,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  documentTitleSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  documentIcon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  documentTitleContent: {
    flex: 1,
  },
  documentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  documentTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  requiredText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  documentDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  documentStatus: {
    marginLeft: 12,
  },
  statusIcon: {
    fontSize: 20,
  },
  uploadedDocuments: {
    gap: 8,
    marginBottom: 12,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  documentMeta: {
    fontSize: 12,
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  completionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  completionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  completionText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default DocumentsStep;