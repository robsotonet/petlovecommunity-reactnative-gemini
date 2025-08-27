// Pet Love Community - Adoption Application Screen
// Multi-step adoption application form with enterprise tracking

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  BackHandler,
} from 'react-native';
import { useColors } from '../hooks/useColors';
import { useAnalyticsTracker } from '../hooks/useAnalytics';
import { useAdoptionApplication, useApplicationForm } from '../hooks/useAdoption';
import { useGetPetByIdQuery } from '../services/petApi';
import type { AdoptionApplicationNavigationProp, AdoptionApplicationRouteProp } from '../types/navigation';
import Button from '../components/Button';
import Card from '../components/Card';
import LoadingScreen from '../components/LoadingScreen';

// Import form step components (to be created)
import PersonalInfoStep from '../components/ApplicationFormSteps/PersonalInfoStep';
import LivingSituationStep from '../components/ApplicationFormSteps/LivingSituationStep';
import ExperienceStep from '../components/ApplicationFormSteps/ExperienceStep';
import PreferencesStep from '../components/ApplicationFormSteps/PreferencesStep';
import ReviewStep from '../components/ApplicationFormSteps/ReviewStep';

interface AdoptionApplicationScreenProps {
  route: AdoptionApplicationRouteProp;
  navigation: AdoptionApplicationNavigationProp;
}

const TOTAL_STEPS = 5;
const STEP_TITLES = [
  'Personal Information',
  'Living Situation', 
  'Pet Experience',
  'Preferences',
  'Review & Submit',
];

const AdoptionApplicationScreen: React.FC<AdoptionApplicationScreenProps> = ({ 
  route, 
  navigation 
}) => {
  const { petId } = route.params;
  const colors = useColors();
  const { trackScreenView, trackUserAction } = useAnalyticsTracker();
  
  // Pet data
  const { data: pet, isLoading: petLoading, error: petError } = useGetPetByIdQuery(petId);
  
  // Adoption hooks
  const {
    currentApplication,
    startApplication,
    nextStep,
    previousStep,
    submitApplication,
    getDraftByPetId,
  } = useAdoptionApplication();

  // Form management
  const draft = getDraftByPetId(petId);
  const {
    currentStep,
    formData,
    updateFormData,
    isStepValid,
    getCompletionPercentage,
    isSubmitting,
    submitError,
  } = useApplicationForm(draft?.id || '');

  // Auto-save state
  const [lastAutoSave, setLastAutoSave] = useState<Date>(() => new Date());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize application if not started
  useEffect(() => {
    if (pet && !currentApplication.petId) {
      startApplication(petId, pet.name);
    }
  }, [pet, currentApplication.petId, petId, startApplication]);

  // Track screen view
  useEffect(() => {
    trackScreenView('AdoptionApplicationScreen', {
      petId,
      step: currentStep,
      petName: pet?.name,
    });
  }, [trackScreenView, petId, currentStep, pet?.name]);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [hasUnsavedChanges]);

  // Auto-save draft every 30 seconds if there are changes
  useEffect(() => {
    if (!hasUnsavedChanges || !draft) return;

    const autoSaveInterval = setInterval(() => {
      if (formData) {
        // Auto-save logic would go here
        setLastAutoSave(new Date());
        setHasUnsavedChanges(false);
        
        trackUserAction('application_auto_saved', {
          petId,
          step: currentStep,
          completionPercentage: getCompletionPercentage(),
        });
      }
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [hasUnsavedChanges, formData, draft, petId, currentStep, getCompletionPercentage, trackUserAction]);

  const handleBackPress = useCallback((): boolean => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
      return true;
    }
    return false;
  }, [hasUnsavedChanges, navigation]);

  const handleNext = useCallback(() => {
    if (!isStepValid(currentStep)) {
      Alert.alert(
        'Incomplete Information',
        'Please fill in all required fields before continuing.',
        [{ text: 'OK' }]
      );
      return;
    }

    trackUserAction('application_step_completed', {
      petId,
      step: currentStep,
      stepName: STEP_TITLES[currentStep - 1],
    });

    if (currentStep < TOTAL_STEPS) {
      nextStep();
    }
  }, [currentStep, isStepValid, nextStep, petId, trackUserAction]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      previousStep();
    }
  }, [currentStep, previousStep]);

  const handleSubmit = useCallback(async () => {
    if (!formData || !pet) return;

    const fullApplicationData = {
      ...formData,
      petId,
      status: 'submitted' as const,
    };

    trackUserAction('application_submit_attempted', {
      petId,
      completionPercentage: getCompletionPercentage(),
    });

    const result = await submitApplication(fullApplicationData);
    
    if (result.success) {
      navigation.navigate('Home');
    }
  }, [formData, pet, petId, submitApplication, navigation, trackUserAction, getCompletionPercentage]);

  const renderProgressBar = () => (
    <View style={[styles.progressContainer, { backgroundColor: colors.extended.tealVariations.background }]}>
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { 
              backgroundColor: colors.primary.coral,
              width: `${(currentStep / TOTAL_STEPS) * 100}%`
            }
          ]} 
        />
      </View>
      <Text style={[styles.progressText, { color: colors.neutral.midnight }]}>
        Step {currentStep} of {TOTAL_STEPS}
      </Text>
      <Text style={[styles.progressPercentage, { color: colors.extended.textVariations.secondary }]}>
        {getCompletionPercentage()}% Complete
      </Text>
    </View>
  );

  const renderStepContent = () => {
    if (!draft || !formData) return null;

    switch (currentStep) {
      case 1:
        return (
          <PersonalInfoStep
            data={formData.personalInfo}
            onUpdate={(personalInfo) => {
              updateFormData({ personalInfo });
              setHasUnsavedChanges(true);
            }}
          />
        );
      case 2:
        return (
          <LivingSituationStep
            data={formData.livingSituation}
            onUpdate={(livingSituation) => {
              updateFormData({ livingSituation });
              setHasUnsavedChanges(true);
            }}
          />
        );
      case 3:
        return (
          <ExperienceStep
            data={formData.experience}
            onUpdate={(experience) => {
              updateFormData({ experience });
              setHasUnsavedChanges(true);
            }}
          />
        );
      case 4:
        return (
          <PreferencesStep
            data={formData.preferences}
            pet={pet}
            onUpdate={(preferences) => {
              updateFormData({ preferences });
              setHasUnsavedChanges(true);
            }}
          />
        );
      case 5:
        return (
          <ReviewStep
            data={formData}
            pet={pet}
            onUpdate={(updates) => {
              updateFormData(updates);
              setHasUnsavedChanges(true);
            }}
          />
        );
      default:
        return null;
    }
  };

  const renderActionButtons = () => (
    <View style={styles.actionButtons}>
      <View style={styles.buttonRow}>
        {currentStep > 1 && (
          <View style={styles.backButton}>
            <Button
              title="Previous"
              onPress={handlePrevious}
              type="secondary"
              disabled={isSubmitting}
            />
          </View>
        )}
        <View style={styles.nextButton}>
          {currentStep < TOTAL_STEPS ? (
            <Button
              title="Next"
              onPress={handleNext}
              type="primary"
              disabled={!isStepValid(currentStep)}
            />
          ) : (
            <Button
              title={isSubmitting ? "Submitting..." : "Submit Application"}
              onPress={handleSubmit}
              type="primary"
              disabled={isSubmitting || !isStepValid(currentStep)}
              style={{ backgroundColor: colors.primary.coral }}
            />
          )}
        </View>
      </View>
      
      {/* Auto-save indicator */}
      {hasUnsavedChanges && (
        <Text style={[styles.autoSaveText, { color: colors.extended.textVariations.tertiary }]}>
          Unsaved changes - will auto-save in {30 - Math.floor((Date.now() - lastAutoSave.getTime()) / 1000)}s
        </Text>
      )}
      
      {submitError && (
        <Text style={[styles.errorText, { color: colors.semantic.error }]}>
          {submitError}
        </Text>
      )}
    </View>
  );

  // Loading states
  if (petLoading) {
    return <LoadingScreen message="Loading pet information..." />;
  }

  if (petError || !pet) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.neutral.beige }]}>
        <Text style={[styles.errorTitle, { color: colors.semantic.error }]}>
          Pet Not Found
        </Text>
        <Text style={[styles.errorMessage, { color: colors.extended.textVariations.secondary }]}>
          Unable to load pet information for this adoption application.
        </Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          type="secondary"
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.neutral.beige }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header with pet info */}
      <Card style={styles.headerCard}>
        <View style={styles.petHeader}>
          <View style={[styles.petImagePlaceholder, { backgroundColor: colors.extended.tealVariations.background }]}>
            <Text style={[styles.petImageText, { color: colors.neutral.midnight }]}>
              📷
            </Text>
          </View>
          <View style={styles.petInfo}>
            <Text style={[styles.petName, { color: colors.neutral.midnight }]}>
              Adopting {pet.name}
            </Text>
            <Text style={[styles.petDetails, { color: colors.extended.textVariations.secondary }]}>
              {pet.breed} • {pet.age} years • {pet.gender}
            </Text>
            <Text style={[styles.shelterName, { color: colors.primary.teal }]}>
              {pet.shelter.name}
            </Text>
          </View>
        </View>
      </Card>

      {/* Progress bar */}
      {renderProgressBar()}

      {/* Form content */}
      <ScrollView 
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.formCard}>
          <Text style={[styles.stepTitle, { color: colors.neutral.midnight }]}>
            {STEP_TITLES[currentStep - 1]}
          </Text>
          {renderStepContent()}
        </Card>
      </ScrollView>

      {/* Action buttons */}
      {renderActionButtons()}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
  },
  petHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  petImageText: {
    fontSize: 20,
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  petDetails: {
    fontSize: 14,
    marginBottom: 4,
  },
  shelterName: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  progressPercentage: {
    fontSize: 12,
  },
  contentContainer: {
    flex: 1,
  },
  formCard: {
    margin: 16,
    marginTop: 8,
    padding: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  actionButtons: {
    padding: 16,
    paddingTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
  autoSaveText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default AdoptionApplicationScreen;