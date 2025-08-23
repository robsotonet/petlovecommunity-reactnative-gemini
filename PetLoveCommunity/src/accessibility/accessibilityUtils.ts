// Accessibility Utility Functions
// Helpers for implementing WCAG 2.1 AA compliance in React Native components

import { AccessibilityInfo, Platform } from 'react-native';

// WCAG 2.1 color contrast ratios
export const CONTRAST_RATIOS = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3.0,
  AAA_NORMAL: 7.0,
  AAA_LARGE: 4.5,
} as const;

// Minimum touch target sizes (in dp)
export const TOUCH_TARGET_SIZES = {
  MINIMUM: 44,
  RECOMMENDED: 48,
} as const;

// Accessibility roles for common UI patterns
export const ACCESSIBILITY_ROLES = {
  BUTTON: 'button',
  LINK: 'link',
  TEXT: 'text',
  IMAGE: 'image',
  HEADER: 'header',
  LIST: 'list',
  LISTITEM: 'listitem',
  TAB: 'tab',
  TABLIST: 'tablist',
  TABPANEL: 'tabpanel',
  ALERT: 'alert',
  STATUS: 'status',
  BANNER: 'banner',
  NAVIGATION: 'navigation',
  MAIN: 'main',
  FORM: 'form',
  GROUP: 'group',
  SEARCH: 'search',
  RADIO: 'radio',
  RADIOGROUP: 'radiogroup',
  CHECKBOX: 'checkbox',
  SWITCH: 'switch',
  SLIDER: 'slider',
  PROGRESSBAR: 'progressbar',
} as const;

// Live region types for dynamic content
export const LIVE_REGIONS = {
  OFF: 'none',
  POLITE: 'polite',
  ASSERTIVE: 'assertive',
} as const;

/**
 * Calculate relative luminance of a color
 */
const getRelativeLuminance = (hex: string): number => {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  // Apply gamma correction
  const sR = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const sG = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const sB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
};

/**
 * Calculate color contrast ratio between two colors
 * @param color1 Hex color string (e.g., '#FF0000')
 * @param color2 Hex color string (e.g., '#FFFFFF')
 * @returns Contrast ratio (1-21)
 */
export const calculateContrastRatio = (color1: string, color2: string): number => {
  const l1 = getRelativeLuminance(color1);
  const l2 = getRelativeLuminance(color2);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Check if color combination meets WCAG contrast requirements
 */
export const meetsContrastRequirement = (
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): boolean => {
  const ratio = calculateContrastRatio(foreground, background);
  const requirement = level === 'AA' 
    ? (isLargeText ? CONTRAST_RATIOS.AA_LARGE : CONTRAST_RATIOS.AA_NORMAL)
    : (isLargeText ? CONTRAST_RATIOS.AAA_LARGE : CONTRAST_RATIOS.AAA_NORMAL);
  
  return ratio >= requirement;
};

/**
 * Generate accessibility props for interactive elements
 */
export const createAccessibilityProps = (config: {
  label: string;
  hint?: string;
  role?: keyof typeof ACCESSIBILITY_ROLES;
  state?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean;
    expanded?: boolean;
  };
  actions?: Array<{
    name: string;
    label: string;
  }>;
  liveRegion?: keyof typeof LIVE_REGIONS;
  language?: string;
}) => {
  const props: any = {
    accessibilityLabel: config.label,
    accessible: true,
  };

  if (config.hint) {
    props.accessibilityHint = config.hint;
  }

  if (config.role) {
    props.accessibilityRole = ACCESSIBILITY_ROLES[config.role];
  }

  if (config.state) {
    props.accessibilityState = config.state;
  }

  if (config.actions) {
    props.accessibilityActions = config.actions;
  }

  if (config.liveRegion && config.liveRegion !== 'OFF') {
    props.accessibilityLiveRegion = LIVE_REGIONS[config.liveRegion];
  }

  if (config.language) {
    props.accessibilityLanguage = config.language;
  }

  return props;
};

/**
 * Create heading props with proper hierarchy
 */
export const createHeadingProps = (level: number, text: string) => {
  return {
    accessibilityRole: ACCESSIBILITY_ROLES.HEADER,
    accessibilityLevel: level,
    accessibilityLabel: text,
  };
};

/**
 * Create form field props with validation support
 */
export const createFormFieldProps = (config: {
  label: string;
  hint?: string;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  fieldType?: 'text' | 'email' | 'password' | 'number' | 'search';
}) => {
  const props = createAccessibilityProps({
    label: config.isRequired ? `${config.label}, required` : config.label,
    hint: config.hint,
  });

  if (config.isInvalid) {
    props.accessibilityInvalid = true;
    if (config.errorMessage) {
      props.accessibilityErrorMessage = config.errorMessage;
    }
  }

  return props;
};

/**
 * Create list props for proper list semantics
 */
export const createListProps = (itemCount: number) => {
  return {
    accessibilityRole: ACCESSIBILITY_ROLES.LIST,
    accessibilityLabel: `List with ${itemCount} items`,
  };
};

/**
 * Create list item props
 */
export const createListItemProps = (position: number, total: number, text: string) => {
  return {
    accessibilityRole: ACCESSIBILITY_ROLES.LISTITEM,
    accessibilityLabel: `${text}, item ${position} of ${total}`,
  };
};

/**
 * Create tab navigation props
 */
export const createTabProps = (config: {
  label: string;
  isSelected: boolean;
  position: number;
  total: number;
}) => {
  return {
    accessibilityRole: ACCESSIBILITY_ROLES.TAB,
    accessibilityLabel: `${config.label}, tab ${config.position} of ${config.total}${config.isSelected ? ', selected' : ''}`,
    accessibilityState: { selected: config.isSelected },
  };
};

/**
 * Create tab list container props
 */
export const createTabListProps = () => {
  return {
    accessibilityRole: ACCESSIBILITY_ROLES.TABLIST,
  };
};

/**
 * Create status/alert message props
 */
export const createStatusProps = (message: string, isError: boolean = false) => {
  return {
    accessibilityRole: isError ? ACCESSIBILITY_ROLES.ALERT : ACCESSIBILITY_ROLES.STATUS,
    accessibilityLabel: message,
    accessibilityLiveRegion: isError ? LIVE_REGIONS.ASSERTIVE : LIVE_REGIONS.POLITE,
  };
};

/**
 * Announce message to screen readers
 */
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    AccessibilityInfo.announceForAccessibility(message);
  }
};

/**
 * Check if screen reader is enabled
 */
export const isScreenReaderEnabled = async (): Promise<boolean> => {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch {
    return false;
  }
};

/**
 * Check if reduce motion is enabled
 */
export const isReduceMotionEnabled = async (): Promise<boolean> => {
  try {
    return await AccessibilityInfo.isReduceMotionEnabled?.() ?? false;
  } catch {
    return false;
  }
};

/**
 * Check if bold text is enabled
 */
export const isBoldTextEnabled = async (): Promise<boolean> => {
  try {
    return await AccessibilityInfo.isBoldTextEnabled?.() ?? false;
  } catch {
    return false;
  }
};

/**
 * Get accessibility preferences
 */
export const getAccessibilityPreferences = async () => {
  try {
    const [
      screenReader,
      reduceMotion,
      boldText,
      reduceTransparency,
      invertColors,
      grayscale,
    ] = await Promise.all([
      isScreenReaderEnabled(),
      isReduceMotionEnabled(),
      isBoldTextEnabled(),
      AccessibilityInfo.isReduceTransparencyEnabled?.() ?? Promise.resolve(false),
      AccessibilityInfo.isInvertColorsEnabled?.() ?? Promise.resolve(false),
      AccessibilityInfo.isGrayscaleEnabled?.() ?? Promise.resolve(false),
    ]);

    return {
      screenReader,
      reduceMotion,
      boldText,
      reduceTransparency,
      invertColors,
      grayscale,
    };
  } catch {
    return {
      screenReader: false,
      reduceMotion: false,
      boldText: false,
      reduceTransparency: false,
      invertColors: false,
      grayscale: false,
    };
  }
};

/**
 * Validate accessibility implementation
 */
export const validateAccessibility = (config: {
  colors?: Array<{ foreground: string; background: string; isLarge?: boolean }>;
  touchTargets?: Array<{ width: number; height: number }>;
  textAlternatives?: Array<{ hasLabel: boolean; hasHint?: boolean }>;
}) => {
  const issues: string[] = [];

  // Check color contrast
  if (config.colors) {
    config.colors.forEach(({ foreground, background, isLarge }, index) => {
      if (!meetsContrastRequirement(foreground, background, 'AA', isLarge)) {
        const ratio = calculateContrastRatio(foreground, background);
        issues.push(`Color combination ${index + 1} fails WCAG AA contrast requirement (${ratio.toFixed(2)}:1)`);
      }
    });
  }

  // Check touch target sizes
  if (config.touchTargets) {
    config.touchTargets.forEach(({ width, height }, index) => {
      if (width < TOUCH_TARGET_SIZES.MINIMUM || height < TOUCH_TARGET_SIZES.MINIMUM) {
        issues.push(`Touch target ${index + 1} is too small (${width}x${height}dp, minimum ${TOUCH_TARGET_SIZES.MINIMUM}x${TOUCH_TARGET_SIZES.MINIMUM}dp)`);
      }
    });
  }

  // Check text alternatives
  if (config.textAlternatives) {
    config.textAlternatives.forEach(({ hasLabel }, index) => {
      if (!hasLabel) {
        issues.push(`Element ${index + 1} is missing accessibility label`);
      }
    });
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
};

/**
 * Create inclusive timing props for time-sensitive content
 */
export const createTimingProps = (config: {
  timeLimit: number; // in seconds
  canExtend: boolean;
  warningTime: number; // seconds before timeout to warn
}) => {
  return {
    accessibilityLabel: `Time limit: ${Math.floor(config.timeLimit / 60)} minutes${config.canExtend ? ', extensible' : ''}`,
    accessibilityHint: config.canExtend 
      ? 'You can extend this time limit if needed'
      : 'This time limit cannot be extended',
    accessibilityLiveRegion: LIVE_REGIONS.POLITE,
  };
};

/**
 * Create focus management utilities
 */
export const focusManagement = {
  /**
   * Set focus to a specific element (for screen readers)
   */
  setFocus: (elementRef: any) => {
    if (elementRef?.current && AccessibilityInfo.setAccessibilityFocus) {
      AccessibilityInfo.setAccessibilityFocus(elementRef.current);
    }
  },

  /**
   * Create skip link props
   */
  createSkipLinkProps: (targetDescription: string) => ({
    accessibilityLabel: `Skip to ${targetDescription}`,
    accessibilityHint: `Moves focus directly to ${targetDescription}, skipping navigation`,
    accessibilityRole: ACCESSIBILITY_ROLES.LINK,
  }),
};

/**
 * Error handling and validation props
 */
export const createErrorProps = (config: {
  hasError: boolean;
  errorMessage?: string;
  isRequired?: boolean;
}) => {
  const props: any = {};

  if (config.hasError && config.errorMessage) {
    props.accessibilityInvalid = true;
    props.accessibilityErrorMessage = config.errorMessage;
    props.accessibilityLiveRegion = LIVE_REGIONS.ASSERTIVE;
  }

  if (config.isRequired) {
    props.accessibilityRequired = true;
  }

  return props;
};

// Export types for TypeScript support
export type AccessibilityRole = keyof typeof ACCESSIBILITY_ROLES;
export type LiveRegion = keyof typeof LIVE_REGIONS;
export type ContrastLevel = 'AA' | 'AAA';

export interface AccessibilityPreferences {
  screenReader: boolean;
  reduceMotion: boolean;
  boldText: boolean;
  reduceTransparency: boolean;
  invertColors: boolean;
  grayscale: boolean;
}

export interface AccessibilityValidationResult {
  isValid: boolean;
  issues: string[];
}