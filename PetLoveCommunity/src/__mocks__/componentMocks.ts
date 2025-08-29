// Centralized component mocks for consistent testing
// Import and use these mocks across test files for standardization

import React from 'react';

// Button Component Mock
export const mockButton = React.forwardRef(({ 
  title, 
  onPress, 
  disabled, 
  variant, 
  size, 
  testID,
  ...props 
}: any, ref: any) => {
  return React.createElement('View', {
    ...props,
    ref,
    testID: testID || `button-${title?.toLowerCase().replace(/\s+/g, '-') || 'button'}`,
    onPress: disabled ? undefined : onPress,
    disabled,
    accessibilityRole: 'button',
    children: title || 'Button'
  });
});

// Input Component Mock
export const mockInput = React.forwardRef(({
  value,
  onChangeText,
  placeholder,
  testID,
  ...props
}: any, ref: any) => {
  return React.createElement('TextInput', {
    ...props,
    ref,
    testID: testID || 'input',
    value,
    onChangeText,
    placeholder,
  });
});

// Card Component Mock
export const mockCard = ({ children, testID, ...props }: any) => {
  return React.createElement('View', {
    ...props,
    testID: testID || 'card',
    children,
  });
};

// Modal Component Mock
export const mockModal = ({ visible, children, testID, onRequestClose, ...props }: any) => {
  if (!visible) return null;
  
  return React.createElement('View', {
    ...props,
    testID: testID || 'modal',
    children: [
      children,
      React.createElement('View', {
        testID: 'modal-backdrop',
        onPress: onRequestClose,
        key: 'backdrop'
      })
    ],
  });
};

// Camera Modal Mock
export const mockCameraModal = ({ 
  isVisible, 
  onCapture, 
  onClose, 
  testID,
  ...props 
}: any) => {
  if (!isVisible) return null;
  
  return React.createElement('View', {
    ...props,
    testID: testID || 'camera-modal',
    children: [
      React.createElement('View', {
        testID: 'camera-view',
        key: 'camera'
      }),
      React.createElement('View', {
        testID: 'camera-capture-button',
        onPress: onCapture,
        key: 'capture'
      }),
      React.createElement('View', {
        testID: 'camera-close-button',
        onPress: onClose,
        key: 'close'
      })
    ],
  });
};

// Document Upload Modal Mock
export const mockDocumentUploadModal = ({
  isVisible,
  onUpload,
  onClose,
  testID,
  ...props
}: any) => {
  if (!isVisible) return null;
  
  return React.createElement('View', {
    ...props,
    testID: testID || 'document-upload-modal',
    children: [
      React.createElement('View', {
        testID: 'document-picker',
        onPress: onUpload,
        key: 'picker'
      }),
      React.createElement('View', {
        testID: 'upload-close-button',
        onPress: onClose,
        key: 'close'
      })
    ],
  });
};

// Swipeable Image Gallery Mock
export const mockSwipeableImageGallery = ({
  images = [],
  currentIndex = 0,
  onIndexChange,
  testID,
  ...props
}: any) => {
  return React.createElement('View', {
    ...props,
    testID: testID || 'swipeable-gallery',
    children: [
      React.createElement('View', {
        testID: `gallery-image-${currentIndex}`,
        key: 'current-image'
      }),
      React.createElement('View', {
        testID: 'gallery-prev-button',
        onPress: () => onIndexChange?.(Math.max(0, currentIndex - 1)),
        key: 'prev'
      }),
      React.createElement('View', {
        testID: 'gallery-next-button',
        onPress: () => onIndexChange?.(Math.min(images.length - 1, currentIndex + 1)),
        key: 'next'
      })
    ],
  });
};

// Loading Screen Mock
export const mockLoadingScreen = ({ testID, ...props }: any) => {
  return React.createElement('View', {
    ...props,
    testID: testID || 'loading-screen',
    children: React.createElement('ActivityIndicator', {
      testID: 'loading-indicator'
    })
  });
};

// Error Boundary Mock
export const mockErrorBoundary = ({ children, fallback, testID, ...props }: any) => {
  return React.createElement('View', {
    ...props,
    testID: testID || 'error-boundary',
    children: fallback || children,
  });
};

// Time Slot Picker Mock
export const mockTimeSlotPicker = ({
  slots = [],
  selectedSlot,
  onSlotSelect,
  testID,
  ...props
}: any) => {
  return React.createElement('View', {
    ...props,
    testID: testID || 'time-slot-picker',
    children: slots.map((slot: any, index: number) => 
      React.createElement('View', {
        testID: `time-slot-${index}`,
        onPress: () => onSlotSelect?.(slot),
        key: index,
        children: slot.time || 'Time Slot'
      })
    ),
  });
};

// Calendar Scheduler Mock
export const mockCalendarScheduler = ({
  events = [],
  onEventSelect,
  onDateSelect,
  testID,
  ...props
}: any) => {
  return React.createElement('View', {
    ...props,
    testID: testID || 'calendar-scheduler',
    children: [
      React.createElement('View', {
        testID: 'calendar-header',
        key: 'header'
      }),
      React.createElement('View', {
        testID: 'calendar-grid',
        key: 'grid'
      }),
      ...events.map((event: any, index: number) =>
        React.createElement('View', {
          testID: `calendar-event-${index}`,
          onPress: () => onEventSelect?.(event),
          key: `event-${index}`,
          children: event.title || 'Event'
        })
      )
    ],
  });
};

// PostCard Mock
export const mockPostCard = ({
  post,
  onLike,
  onComment,
  onShare,
  onAuthorPress,
  onImagePress,
  testID,
  ...props
}: any) => {
  return React.createElement('View', {
    ...props,
    testID: testID || `post-card-${post?.id || 'unknown'}`,
    children: [
      React.createElement('View', {
        testID: 'post-header',
        onPress: () => onAuthorPress?.(post?.authorId),
        key: 'header',
        children: post?.authorName || 'Author'
      }),
      React.createElement('View', {
        testID: 'post-content',
        key: 'content',
        children: post?.content || 'Post content'
      }),
      post?.images?.map((image: any, index: number) =>
        React.createElement('View', {
          testID: `post-image-${index}`,
          onPress: () => onImagePress?.(image, index),
          key: `image-${index}`,
          children: `Image ${index + 1}`
        })
      ),
      React.createElement('View', {
        testID: 'post-actions',
        key: 'actions',
        children: [
          React.createElement('View', {
            testID: 'like-button',
            onPress: () => onLike?.(post?.id),
            key: 'like',
            children: `♥ ${post?.likesCount || 0}`
          }),
          React.createElement('View', {
            testID: 'comment-button',
            onPress: () => onComment?.(post?.id),
            key: 'comment',
            children: `💬 ${post?.commentsCount || 0}`
          }),
          React.createElement('View', {
            testID: 'share-button',
            onPress: () => onShare?.(post?.id),
            key: 'share',
            children: '🔗 Share'
          })
        ]
      })
    ],
  });
};

// Component mock factory for jest.mock() usage
export const createComponentMocks = () => ({
  '../Button': () => mockButton,
  '../../Button': () => mockButton,
  '../../../Button': () => mockButton,
  '../Input': () => mockInput,
  '../../Input': () => mockInput,
  '../Card': () => mockCard,
  '../../Card': () => mockCard,
  '../CameraModal': () => mockCameraModal,
  '../DocumentUploadModal': () => mockDocumentUploadModal,
  '../SwipeableImageGallery': () => mockSwipeableImageGallery,
  '../LoadingScreen': () => mockLoadingScreen,
  '../ErrorBoundary': () => mockErrorBoundary,
  '../calendar/TimeSlotPicker': () => mockTimeSlotPicker,
  '../calendar/CalendarScheduler': () => mockCalendarScheduler,
  './PostCard': () => ({ PostCard: mockPostCard, PostContent: {} }),
  '../social/PostCard': () => ({ PostCard: mockPostCard, PostContent: {} }),
  '../../social/PostCard': () => ({ PostCard: mockPostCard, PostContent: {} }),
});

// Reset all component mocks
export const resetAllComponentMocks = () => {
  // Component mocks don't typically need resetting as they're stateless
  // But this function exists for consistency
};