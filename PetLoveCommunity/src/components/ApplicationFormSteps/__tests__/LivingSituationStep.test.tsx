// Pet Love Community - Living Situation Step Tests
// Comprehensive test suite for living situation form step component

import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import LivingSituationStep from '../LivingSituationStep';
import {
  renderWithProviders,
  createMockColors,
  cleanupMocks,
} from '../../../__tests__/testUtils';
import type { AdoptionApplication } from '../../../types/pet';

// Mock the colors hook
jest.mock('../../../hooks/useColors', () => ({
  useColors: jest.fn(),
}));

import { useColors } from '../../../hooks/useColors';

const mockUseColors = useColors as jest.MockedFunction<typeof useColors>;

describe('LivingSituationStep', () => {
  const mockColors = createMockColors();
  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseColors.mockReturnValue(mockColors);
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('Initial Rendering', () => {
    it('should render all housing type options', () => {
      renderWithProviders(
        <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
      );

      expect(screen.getByText('Housing Type *')).toBeTruthy();
      expect(screen.getByText('House')).toBeTruthy();
      expect(screen.getByText('Apartment')).toBeTruthy();
      expect(screen.getByText('Condo')).toBeTruthy();
      expect(screen.getByText('Mobile Home')).toBeTruthy();
      expect(screen.getByText('Farm')).toBeTruthy();
      expect(screen.getByText('Other')).toBeTruthy();
    });

    it('should render own or rent options', () => {
      renderWithProviders(
        <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
      );

      expect(screen.getByText('Own or Rent *')).toBeTruthy();
      expect(screen.getByText('Own')).toBeTruthy();
      expect(screen.getByText('Rent')).toBeTruthy();
    });

    it('should render yard type options', () => {
      renderWithProviders(
        <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
      );

      expect(screen.getByText('Yard Type *')).toBeTruthy();
      expect(screen.getByText('Large Yard')).toBeTruthy();
      expect(screen.getByText('Small Yard')).toBeTruthy();
      expect(screen.getByText('No Yard')).toBeTruthy();
    });

    it('should show step description', () => {
      renderWithProviders(
        <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
      );

      expect(screen.getByText(/Tell us about your living situation/)).toBeTruthy();
      expect(screen.getByText(/This helps us ensure the pet will be comfortable/)).toBeTruthy();
    });

    it('should render with no options selected when no data provided', () => {
      renderWithProviders(
        <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
      );

      // No options should be selected (check by style - unselected buttons have different styling)
      const houseButton = screen.getByText('House');
      expect(houseButton.parent?.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: mockColors.extended.tealVariations.background,
        })
      );
    });

    it('should populate selections with existing data', () => {
      const mockData: AdoptionApplication['livingSituation'] = {
        housingType: 'house',
        ownOrRent: 'own',
        yardType: 'large',
      };

      renderWithProviders(
        <LivingSituationStep data={mockData} onUpdate={mockOnUpdate} />
      );

      // Selected options should have different styling
      const houseButton = screen.getByText('House');
      expect(houseButton.parent?.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: mockColors.primary.coral,
        })
      );

      const ownButton = screen.getByText('Own');
      expect(ownButton.parent?.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: mockColors.primary.coral,
        })
      );

      const largeYardButton = screen.getByText('Large Yard');
      expect(largeYardButton.parent?.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: mockColors.primary.coral,
        })
      );
    });
  });

  describe('Housing Type Selection', () => {
    it('should call onUpdate when house is selected', () => {
      renderWithProviders(
        <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
      );

      fireEvent.press(screen.getByText('House'));

      expect(mockOnUpdate).toHaveBeenCalledWith({
        housingType: 'house',
      });
    });

    it('should call onUpdate when apartment is selected', () => {
      renderWithProviders(
        <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
      );

      fireEvent.press(screen.getByText('Apartment'));

      expect(mockOnUpdate).toHaveBeenCalledWith({
        housingType: 'apartment',
      });
    });

    it('should call onUpdate when condo is selected', () => {
      renderWithProviders(
        <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
      );

      fireEvent.press(screen.getByText('Condo'));

      expect(mockOnUpdate).toHaveBeenCalledWith({
        housingType: 'condo',
      });
    });

    it('should call onUpdate when mobile home is selected', () => {
      renderWithProviders(
        <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
      );

      fireEvent.press(screen.getByText('Mobile Home'));

      expect(mockOnUpdate).toHaveBeenCalledWith({
        housingType: 'mobile_home',
      });
    });

    it('should call onUpdate when farm is selected', () => {
      renderWithProviders(
        <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
      );

      fireEvent.press(screen.getByText('Farm'));

      expect(mockOnUpdate).toHaveBeenCalledWith({
        housingType: 'farm',
      });
    });

    it('should call onUpdate when other is selected', () => {
      renderWithProviders(
        <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
      );

      fireEvent.press(screen.getByText('Other'));

      expect(mockOnUpdate).toHaveBeenCalledWith({
        housingType: 'other',
      });
    });

    it('should preserve existing data when updating housing type', () => {
      const existingData: AdoptionApplication['livingSituation'] = {
        housingType: 'apartment',
        ownOrRent: 'rent',
        yardType: 'no_yard',
      };

      renderWithProviders(
        <LivingSituationStep data={existingData} onUpdate={mockOnUpdate} />
      );

      fireEvent.press(screen.getByText('House'));

      expect(mockOnUpdate).toHaveBeenCalledWith({
        ...existingData,
        housingType: 'house',
      });
    });
  });

  describe('Own or Rent Selection', () => {
    it('should call onUpdate when own is selected', () => {
      renderWithProviders(
        <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
      );

      fireEvent.press(screen.getByText('Own'));

      expect(mockOnUpdate).toHaveBeenCalledWith({
        ownOrRent: 'own',
      });
    });

    it('should call onUpdate when rent is selected', () => {
      renderWithProviders(
        <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
      );

      fireEvent.press(screen.getByText('Rent'));

      expect(mockOnUpdate).toHaveBeenCalledWith({
        ownOrRent: 'rent',
      });
    });

    it('should preserve existing data when updating own or rent', () => {
      const existingData: AdoptionApplication['livingSituation'] = {
        housingType: 'house',
        ownOrRent: 'own',
        yardType: 'large',
      };

      renderWithProviders(
        <LivingSituationStep data={existingData} onUpdate={mockOnUpdate} />
      );

      fireEvent.press(screen.getByText('Rent'));

      expect(mockOnUpdate).toHaveBeenCalledWith({
        ...existingData,
        ownOrRent: 'rent',
      });
    });
  });

  describe('Yard Type Selection', () => {
    it('should call onUpdate when large yard is selected', () => {
      renderWithProviders(
        <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
      );

      fireEvent.press(screen.getByText('Large Yard'));

      expect(mockOnUpdate).toHaveBeenCalledWith({
        yardType: 'large',
      });
    });

    it('should call onUpdate when small yard is selected', () => {
      renderWithProviders(
        <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
      );

      fireEvent.press(screen.getByText('Small Yard'));

      expect(mockOnUpdate).toHaveBeenCalledWith({
        yardType: 'small',
      });
    });

    it('should call onUpdate when no yard is selected', () => {
      renderWithProviders(
        <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
      );

      fireEvent.press(screen.getByText('No Yard'));

      expect(mockOnUpdate).toHaveBeenCalledWith({
        yardType: 'no_yard',
      });
    });

    it('should preserve existing data when updating yard type', () => {
      const existingData: AdoptionApplication['livingSituation'] = {
        housingType: 'house',
        ownOrRent: 'own',
        yardType: 'large',
      };

      renderWithProviders(
        <LivingSituationStep data={existingData} onUpdate={mockOnUpdate} />
      );

      fireEvent.press(screen.getByText('Small Yard'));

      expect(mockOnUpdate).toHaveBeenCalledWith({
        ...existingData,
        yardType: 'small',
      });
    });
  });

  describe('Visual States', () => {
    it('should apply selected styles to chosen options', () => {
      const mockData: AdoptionApplication['livingSituation'] = {
        housingType: 'apartment',
        ownOrRent: 'rent',
        yardType: 'no_yard',
      };

      renderWithProviders(
        <LivingSituationStep data={mockData} onUpdate={mockOnUpdate} />
      );

      // Selected options should have coral background
      const apartmentButton = screen.getByText('Apartment');
      expect(apartmentButton.parent?.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: mockColors.primary.coral,
        })
      );

      const rentButton = screen.getByText('Rent');
      expect(rentButton.parent?.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: mockColors.primary.coral,
        })
      );

      const noYardButton = screen.getByText('No Yard');
      expect(noYardButton.parent?.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: mockColors.primary.coral,
        })
      );

      // Unselected options should have teal background
      const houseButton = screen.getByText('House');
      expect(houseButton.parent?.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: mockColors.extended.tealVariations.background,
        })
      );

      const ownButton = screen.getByText('Own');
      expect(ownButton.parent?.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: mockColors.extended.tealVariations.background,
        })
      );
    });

    it('should apply correct border colors to selected and unselected options', () => {
      const mockData: AdoptionApplication['livingSituation'] = {
        housingType: 'house',
        ownOrRent: 'own',
        yardType: 'large',
      };

      renderWithProviders(
        <LivingSituationStep data={mockData} onUpdate={mockOnUpdate} />
      );

      // Selected options should have coral border
      const houseButton = screen.getByText('House');
      expect(houseButton.parent?.props.style).toEqual(
        expect.objectContaining({
          borderColor: mockColors.primary.coral,
        })
      );

      // Unselected options should have light teal border
      const apartmentButton = screen.getByText('Apartment');
      expect(apartmentButton.parent?.props.style).toEqual(
        expect.objectContaining({
          borderColor: mockColors.extended.tealVariations.light,
        })
      );
    });

    it('should apply correct text colors to selected and unselected options', () => {
      const mockData: AdoptionApplication['livingSituation'] = {
        housingType: 'house',
        ownOrRent: 'own',
        yardType: 'large',
      };

      renderWithProviders(
        <LivingSituationStep data={mockData} onUpdate={mockOnUpdate} />
      );

      // Selected options should have white text
      const houseButton = screen.getByText('House');
      expect(houseButton.props.style).toEqual(
        expect.objectContaining({
          color: 'white',
        })
      );

      // Unselected options should have midnight text
      const apartmentButton = screen.getByText('Apartment');
      expect(apartmentButton.props.style).toEqual(
        expect.objectContaining({
          color: mockColors.neutral.midnight,
        })
      );
    });
  });

  describe('Layout and Styling', () => {
    it('should apply correct colors from theme', () => {
      renderWithProviders(
        <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
      );

      expect(mockUseColors).toHaveBeenCalled();
    });

    it('should show required field indicators', () => {
      renderWithProviders(
        <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
      );

      expect(screen.getByText('Housing Type *')).toBeTruthy();
      expect(screen.getByText('Own or Rent *')).toBeTruthy();
      expect(screen.getByText('Yard Type *')).toBeTruthy();
    });

    it('should have proper option button layout', () => {
      renderWithProviders(
        <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
      );

      // Housing type options should be in flexWrap layout
      const houseButton = screen.getByText('House').parent;
      expect(houseButton?.parent?.props.style).toEqual(
        expect.objectContaining({
          flexDirection: 'row',
          flexWrap: 'wrap',
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined data gracefully', () => {
      expect(() => {
        renderWithProviders(
          <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
        );
      }).not.toThrow();
    });

    it('should handle partial data', () => {
      const partialData: Partial<AdoptionApplication['livingSituation']> = {
        housingType: 'house',
        // Missing ownOrRent and yardType
      };

      renderWithProviders(
        <LivingSituationStep data={partialData as AdoptionApplication['livingSituation']} onUpdate={mockOnUpdate} />
      );

      // Selected option should be styled correctly
      const houseButton = screen.getByText('House');
      expect(houseButton.parent?.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: mockColors.primary.coral,
        })
      );

      // Unselected options should have default styling
      const ownButton = screen.getByText('Own');
      expect(ownButton.parent?.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: mockColors.extended.tealVariations.background,
        })
      );
    });

    it('should handle empty object data', () => {
      const emptyData = {};

      renderWithProviders(
        <LivingSituationStep data={emptyData as AdoptionApplication['livingSituation']} onUpdate={mockOnUpdate} />
      );

      // All options should be unselected
      const houseButton = screen.getByText('House');
      expect(houseButton.parent?.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: mockColors.extended.tealVariations.background,
        })
      );
    });

    it('should handle invalid housing type values gracefully', () => {
      const invalidData = {
        housingType: 'invalid_type' as any,
        ownOrRent: 'own' as const,
        yardType: 'large' as const,
      };

      renderWithProviders(
        <LivingSituationStep data={invalidData} onUpdate={mockOnUpdate} />
      );

      // No housing type should be selected since invalid
      const houseButton = screen.getByText('House');
      expect(houseButton.parent?.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: mockColors.extended.tealVariations.background,
        })
      );

      // Valid fields should still be selected
      const ownButton = screen.getByText('Own');
      expect(ownButton.parent?.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: mockColors.primary.coral,
        })
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels for option buttons', () => {
      renderWithProviders(
        <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
      );

      const houseButton = screen.getByText('House');
      expect(houseButton.parent?.props.accessibilityLabel).toBe('Select House as housing type');
      expect(houseButton.parent?.props.accessibilityRole).toBe('button');
    });

    it('should indicate selected state in accessibility labels', () => {
      const mockData: AdoptionApplication['livingSituation'] = {
        housingType: 'house',
        ownOrRent: 'own',
        yardType: 'large',
      };

      renderWithProviders(
        <LivingSituationStep data={mockData} onUpdate={mockOnUpdate} />
      );

      const houseButton = screen.getByText('House');
      expect(houseButton.parent?.props.accessibilityLabel).toBe('House, selected');
      expect(houseButton.parent?.props.accessibilityState?.selected).toBe(true);

      const apartmentButton = screen.getByText('Apartment');
      expect(apartmentButton.parent?.props.accessibilityLabel).toBe('Select Apartment as housing type');
      expect(apartmentButton.parent?.props.accessibilityState?.selected).toBe(false);
    });

    it('should group related options for screen readers', () => {
      renderWithProviders(
        <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
      );

      // Housing type group should have proper accessibility properties
      const housingTypeLabel = screen.getByText('Housing Type *');
      expect(housingTypeLabel.parent?.props.accessibilityRole).toBe('group');
      expect(housingTypeLabel.parent?.props.accessibilityLabel).toBe('Housing Type, required field');
    });

    it('should have proper heading structure', () => {
      renderWithProviders(
        <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
      );

      const description = screen.getByText(/Tell us about your living situation/);
      expect(description.props.accessibilityRole).toBe('text');
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders when props have not changed', () => {
      const data = { housingType: 'house', ownOrRent: 'own', yardType: 'large' } as const;
      
      const { rerender } = renderWithProviders(
        <LivingSituationStep data={data} onUpdate={mockOnUpdate} />
      );

      const renderCount = mockOnUpdate.mock.calls.length;

      // Re-render with same props
      rerender(<LivingSituationStep data={data} onUpdate={mockOnUpdate} />);

      // Should not have triggered any additional onUpdate calls
      expect(mockOnUpdate.mock.calls.length).toBe(renderCount);
    });

    it('should handle rapid button presses gracefully', () => {
      renderWithProviders(
        <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
      );

      const houseButton = screen.getByText('House');

      // Simulate rapid button presses
      fireEvent.press(houseButton);
      fireEvent.press(houseButton);
      fireEvent.press(houseButton);

      // Should have called onUpdate for each press with the same value
      expect(mockOnUpdate).toHaveBeenCalledTimes(3);
      mockOnUpdate.mock.calls.forEach(call => {
        expect(call[0]).toEqual({ housingType: 'house' });
      });
    });
  });

  describe('Complex Interactions', () => {
    it('should handle changing multiple fields in sequence', () => {
      renderWithProviders(
        <LivingSituationStep data={undefined} onUpdate={mockOnUpdate} />
      );

      // Select housing type
      fireEvent.press(screen.getByText('House'));
      expect(mockOnUpdate).toHaveBeenCalledWith({ housingType: 'house' });

      // Update with current data for next selection
      const updatedData = { housingType: 'house' as const };
      
      const { rerender } = renderWithProviders(
        <LivingSituationStep data={updatedData} onUpdate={mockOnUpdate} />
      );

      // Select own/rent
      fireEvent.press(screen.getByText('Own'));
      expect(mockOnUpdate).toHaveBeenLastCalledWith({ 
        ...updatedData, 
        ownOrRent: 'own' 
      });
    });
  });
});