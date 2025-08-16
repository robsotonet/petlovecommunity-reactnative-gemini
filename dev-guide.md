
# Pet Love Community - Enterprise React Native Mobile Client Development Guide
## Project Overview  
Enterprise-grade native mobile application for Pet Love Community using React Native 0.74+, TypeScript, React Native StyleSheet, and Redux Toolkit with comprehensive .NET SignalR integration, idempotency management, correlation ID tracing, and transaction-level duplicate prevention. Perfectly aligned with the Pet Love Community web client for consistent user experience across all platforms.
## Standard Workflow
1. **Analysis & Planning**: Think through problems, review API integration, write plan to `tasks/mobile-todo.md`
2. **Task Management**: Create detailed todo items that can be checked off as completed
3. **Approval Process**: Check in for plan verification before implementation  
4. **Implementation**: Work on todo items, marking complete as you go
5. **Progress Updates**: Provide high-level summaries of changes made
6. **Simplicity First**: Make minimal, focused changes impacting as little code as possible
7. **Documentation**: Add review section to mobile-todo.md with summary and relevant information
## Enterprise Technology Stack - MOBILE NATIVE
- **Framework**: React Native 0.74+ (Cross-platform iOS/Android)
- **UI Library**: React Native Core Components + Custom Design System
- **Language**: TypeScript 5.3+
- **Styling**: React Native StyleSheet + Design System Constants
- **Navigation**: React Navigation 6+ (Stack, Tab, Drawer navigation)
- **State Management**: Redux Toolkit + RTK Query (same as web)
- **Storage**: AsyncStorage + Redux Persist for offline support
- **Real-time**: @microsoft/signalr for .NET SignalR integration
- **Authentication**: React Native compatible auth with secure storage
- **Enterprise Features**: Idempotency, Correlation IDs, Transaction Management
- **Forms**: React Hook Form + Zod validation (adapted for mobile)
- **Testing**: Jest + React Native Testing Library + Detox E2E
- **Performance**: Bundle optimization, native module integration
- **Deployment**: iOS App Store + Google Play Store
## Enterprise Architecture Requirements - MOBILE ADAPTED
### .NET SignalR Real-Time Integration (Mobile)
```typescript
// SignalR Hub Connection with mobile reliability and background handling
import { HubConnectionBuilder, HubConnection, LogLevel } from '@microsoft/signalr'
import { AppState } from 'react-native'
const hubConnection = new HubConnectionBuilder()
  .withUrl(`${process.env.API_URL}/hubs/petLove`)
  .withAutomaticReconnect([0, 2000, 10000, 30000])
  .configureLogging(LogLevel.Information)
  .build()
// Mobile-specific connection management
AppState.addEventListener('change', (nextAppState) => {
  if (nextAppState === 'active') {
    // Reconnect when app becomes active
    hubConnection.start()
  } else if (nextAppState === 'background') {
    // Handle background state
    hubConnection.stop()
  }
})
// Real-time event handlers with mobile notifications
hubConnection.on('PetAdoptionStatusChanged', (petId, status) => {
  store.dispatch(petApi.util.invalidateTags(['Pet']))
  // Trigger push notification if app is in background
  scheduleLocalNotification({
    title: 'Pet Adoption Update',
    body: `Pet ${petId} status changed to ${status}`,
  })
})
```
### Mobile-Optimized Idempotency & Duplicate Prevention
```typescript
// Transaction-level idempotency management with offline support
interface MobileTransaction extends Transaction {
  id: string                    // Unique transaction identifier
  correlationId: string        // Request tracing
  idempotencyKey: string      // Duplicate prevention
  type: TransactionType       // Operation classification
  status: TransactionStatus   // Current state
  retryCount: number         // Retry attempts
  isOffline: boolean         // Offline transaction flag
  queuedAt?: number          // When queued for offline sync
}
// Prevent duplicate submissions with offline queue
const executeWithIdempotency = async (operation: () => Promise<any>) => {
  const idempotencyKey = generateIdempotencyKey(operation)
  
  if (isOffline()) {
    // Queue for later execution
    return idempotencyService.queueForOfflineSync(idempotencyKey, operation)
  }
  
  return idempotencyService.executeIdempotent(idempotencyKey, operation)
}
```
### Mobile Correlation ID Request Tracing
```typescript
// Every request includes mobile-specific correlation context
interface MobileCorrelationContext extends CorrelationContext {
  correlationId: string       // Unique request identifier
  parentCorrelationId?: string // Parent request (for nested calls)
  userId?: string            // User context
  sessionId: string         // Session context
  deviceId: string          // Unique device identifier
  platform: 'ios' | 'android' // Platform type
  appVersion: string        // App version for debugging
  networkType: string       // Network connection type
  timestamp: number         // Request timestamp
}
// RTK Query integration with mobile headers
prepareHeaders: (headers, { getState }) => {
  const context = getMobileCorrelationContext(getState())
  headers.set('X-Correlation-ID', context.correlationId)
  headers.set('X-Transaction-ID', generateTransactionId())
  headers.set('X-Device-ID', context.deviceId)
  headers.set('X-Platform', context.platform)
  headers.set('X-App-Version', context.appVersion)
  return headers
}
```
## Key Features - MOBILE NATIVE FOCUS
- **Native Mobile Interface**: Touch-optimized design with native iOS/Android components
- **Social Features**: Community posts, comments, user interactions with mobile sharing
- **Pet Discovery**: Advanced search, filtering, swipeable galleries with camera integration
- **Event Management**: Community events, RSVP system, native calendar integration
- **Real-time Updates**: .NET SignalR integration with background notifications
- **Enterprise Reliability**: Idempotency, correlation tracing, transaction management
- **Mobile Enhancements**: Camera, location services, push notifications, offline support
## Development Phases - MOBILE ENTERPRISE INTEGRATION
### Phase 1: Mobile Enterprise Foundation (Weeks 1-2)
**MOBILE-SETUP-001: Enterprise Project Setup**
- [ ] React Native 0.74+ + TypeScript initialization with enterprise config
- [ ] Redux Toolkit + RTK Query with mobile-specific middleware
- [ ] SignalR client integration (@microsoft/signalr) with background handling
- [ ] Correlation ID service implementation with device tracking
- [ ] Transaction management system with offline queue
- [ ] Idempotency service configuration with AsyncStorage
**MOBILE-SETUP-002: Navigation & Platform Integration**
- [ ] React Navigation 6+ setup with enterprise routing patterns
- [ ] Platform-specific configurations (iOS/Android)
- [ ] AsyncStorage integration with Redux Persist
- [ ] Device information collection and secure storage
- [ ] Network state monitoring and offline detection
- [ ] App state management for background/foreground transitions
### Phase 2: Mobile Design System & Components (Weeks 3-4)  
**MOBILE-DESIGN-001: React Native Design System**
- [ ] Pet Love Community StyleSheet constants (coral, teal, midnight, beige)
- [ ] Mobile-optimized component library (Button, Card, Input, etc.)
- [ ] Touch-friendly sizing and spacing system
- [ ] Platform-specific adaptations (iOS/Android guidelines)
- [ ] Dark mode support with brand consistency
- [ ] Accessibility compliance (screen readers, high contrast)
**MOBILE-AUTH-001: Mobile Authentication**
- [ ] React Native authentication flow with secure storage
- [ ] Correlation ID context for auth flows
- [ ] Biometric authentication integration (Touch ID/Face ID)
- [ ] Session management with transaction tracking
- [ ] Protected navigation with correlation context
- [ ] Authentication state synchronization via SignalR
### Phase 3: Pet Adoption Features (Weeks 5-8)
**MOBILE-PET-001: Enhanced Pet Discovery**  
- [ ] Real-time pet availability updates via SignalR with notifications
- [ ] Camera integration for pet photo uploads
- [ ] Location services for nearby pet shelters
- [ ] Idempotent favorite/unfavorite operations with offline support
- [ ] Transaction-tracked adoption applications
- [ ] Swipeable pet gallery with smooth animations
- [ ] Pet viewing analytics with correlation IDs
**MOBILE-PET-002: Mobile Adoption Transaction Management**
- [ ] Adoption application with mobile-optimized forms
- [ ] Camera integration for document uploads
- [ ] Push notifications for adoption status updates
- [ ] Offline application drafts with auto-sync
- [ ] Correlation-traced adoption workflow
- [ ] Calendar integration for appointment scheduling
### Phase 4: Mobile Events & Calendar (Weeks 9-10)
**MOBILE-EVENT-001: Native Event Management**
- [ ] Native calendar integration (iOS/Android calendars)
- [ ] Real-time event updates via SignalR with push notifications
- [ ] Location services for event directions
- [ ] Idempotent RSVP operations with offline support
- [ ] Event sharing via native sharing APIs
- [ ] Geofencing for event reminders
### Phase 5: Social Platform & Mobile Features (Weeks 11-12)
**MOBILE-SOCIAL-001: Enhanced Social Platform**
- [ ] Camera integration for post creation
- [ ] Real-time post updates and push notifications
- [ ] Native sharing capabilities (social media, contacts)
- [ ] Idempotent like/comment operations with offline queue
- [ ] Image optimization and caching
- [ ] Voice message support for community interactions
## Mobile-First Touch Design System
```typescript
// React Native StyleSheet with Pet Love Community brand
import { StyleSheet, Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');
export const designSystem = StyleSheet.create({
  // Pet Love Community Color Palette
  colors: {
    coral: '#FF6B6B',           // Adoption actions
    coralLight: '#FF8E8E',      // Hover/touch states
    coralDark: '#E55555',       // Active states
    teal: '#4ECDC4',            // Service actions
    tealLight: '#6ED4CC',       // Background tints
    tealDark: '#3BB5B0',        // Active states
    midnight: '#1A535C',        // Primary text
    beige: '#F7FFF7',           // Backgrounds
    white: '#FFFFFF',           // Cards
    border: '#E8F8F7',          // Borders
    shadow: 'rgba(26, 83, 92, 0.08)', // Drop shadows
  },
  
  // Mobile-optimized spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  // Touch-friendly sizing
  touchTargets: {
    small: 44,      // Minimum iOS touch target
    medium: 56,     // Material Design minimum
    large: 64,      // Comfortable large buttons
  },
  
  // Typography scale
  typography: {
    h1: { fontSize: 32, fontWeight: '700', color: '#1A535C' },
    h2: { fontSize: 24, fontWeight: '600', color: '#1A535C' },
    h3: { fontSize: 20, fontWeight: '600', color: '#1A535C' },
    body: { fontSize: 16, fontWeight: '400', color: '#1A535C' },
    caption: { fontSize: 14, fontWeight: '400', color: '#2C6B73' },
  },
});
// Mobile component example with enterprise features
export const PetAdoptionButton = ({ onPress, petId, disabled }) => (
  <TouchableOpacity
    style={[
      styles.adoptionButton,
      disabled && styles.adoptionButtonDisabled
    ]}
    onPress={() => executeWithIdempotency(() => onPress(petId))}
    disabled={disabled}
    activeOpacity={0.7}
    accessibilityLabel="Adopt this pet"
    accessibilityRole="button"
  >
    <Text style={styles.adoptionButtonText}>❤️ Adopt Me</Text>
  </TouchableOpacity>
);
const styles = StyleSheet.create({
  adoptionButton: {
    backgroundColor: designSystem.colors.coral,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    minHeight: designSystem.touchTargets.medium,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: designSystem.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4, // Android shadow
  },
  adoptionButtonText: {
    color: designSystem.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  adoptionButtonDisabled: {
    backgroundColor: designSystem.colors.coral,
    opacity: 0.4,
  },
});
```
## Performance & Mobile Optimization
### Mobile Performance Targets
- **App Launch Time**: < 2.0s (cold start)
- **Screen Transitions**: < 300ms (smooth 60fps)
- **Image Loading**: < 1.0s with progressive loading
- **Bundle Size**: < 25MB (iOS), < 20MB (Android)
- **SignalR Connection**: < 500ms establishment
- **Transaction Processing**: < 200ms average
- **Offline Sync**: < 5s when connectivity restored
### React Native Optimization Strategies
```typescript
// Enterprise-grade lazy loading and code splitting
import { lazy, Suspense } from 'react';
import { ActivityIndicator } from 'react-native';
// Lazy load screens for better performance
const PetDetailScreen = lazy(() => import('@/screens/pets/PetDetailScreen'));
const LazyPetDetail = () => (
  <Suspense fallback={<ActivityIndicator size="large" color="#FF6B6B" />}>
    <PetDetailScreen />
  </Suspense>
);
// Image optimization with caching
import FastImage from 'react-native-fast-image';
const OptimizedPetImage = ({ source, style }) => (
  <FastImage
    source={{
      uri: source,
      priority: FastImage.priority.normal,
      cache: FastImage.cacheControl.immutable,
    }}
    style={style}
    resizeMode={FastImage.resizeMode.cover}
  />
);
// Memory management for lists
import { FlatList, VirtualizedList } from 'react-native';
const PetList = ({ pets }) => (
  <FlatList
    data={pets}
    renderItem={renderPetItem}
    keyExtractor={(item) => item.id}
    removeClippedSubviews={true}
    maxToRenderPerBatch={10}
    windowSize={5}
    initialNumToRender={8}
    getItemLayout={getItemLayout} // For better scrolling performance
  />
);
```
## Enterprise File Structure - REACT NATIVE
```
petlovecommunity-mobile/
├── src/
│   ├── screens/                      # Screen components
│   │   ├── auth/                     # Authentication screens
│   │   ├── pets/                     # Pet adoption screens
│   │   ├── services/                 # Service booking screens
│   │   ├── events/                   # Event management screens
│   │   ├── social/                   # Social platform screens
│   │   └── profile/                  # User profile screens
│   ├── components/                   # Component library
│   │   ├── ui/                       # Base components
│   │   ├── forms/                    # Form components
│   │   ├── enterprise/               # Enterprise components
│   │   │   ├── CorrelationProvider.tsx
│   │   │   ├── TransactionWrapper.tsx
│   │   │   ├── IdempotencyGuard.tsx
│   │   │   └── OfflineQueue.tsx
│   │   └── features/                 # Feature components
│   ├── navigation/                   # Navigation configuration
│   │   ├── AppNavigator.tsx          # Main navigation
│   │   ├── AuthNavigator.tsx         # Auth flow navigation
│   │   ├── TabNavigator.tsx          # Bottom tab navigation
│   │   └── types.ts                  # Navigation types
│   ├── lib/                         # Enterprise utilities
│   │   ├── store/                    # Redux Toolkit configuration
│   │   │   ├── index.ts             # Enterprise store setup
│   │   │   ├── middleware/          # Custom middleware
│   │   │   └── slices/              # Redux slices
│   │   ├── services/                # Enterprise services
│   │   │   ├── SignalRService.ts    # SignalR with mobile handling
│   │   │   ├── CorrelationService.ts # Mobile correlation tracking
│   │   │   ├── TransactionManager.ts # Mobile transaction handling
│   │   │   ├── IdempotencyService.ts # Mobile duplicate prevention
│   │   │   ├── StorageService.ts    # AsyncStorage wrapper
│   │   │   ├── NotificationService.ts # Push notification handling
│   │   │   ├── CameraService.ts     # Camera integration
│   │   │   └── LocationService.ts   # Location services
│   │   ├── api/                     # RTK Query slices
│   │   └── utils/                   # Helper functions
│   ├── hooks/                       # Custom React hooks
│   │   ├── useSignalR.ts           # SignalR with mobile lifecycle
│   │   ├── useCorrelation.ts       # Mobile correlation context
│   │   ├── useTransaction.ts       # Mobile transaction management
│   │   ├── useOfflineQueue.ts      # Offline operation management
│   │   ├── useCamera.ts            # Camera integration
│   │   ├── usePushNotifications.ts # Push notification handling
│   │   └── useLocation.ts          # Location services
│   ├── styles/                     # Style definitions
│   │   ├── designSystem.ts         # Design system constants
│   │   ├── colors.ts              # Pet Love Community colors
│   │   ├── typography.ts          # Typography scale
│   │   └── spacing.ts             # Spacing system
│   └── types/                      # TypeScript definitions
│       ├── enterprise.ts           # Enterprise type definitions
│       ├── signalr.ts             # SignalR types
│       ├── navigation.ts          # Navigation types
│       └── platform.ts            # Platform-specific types
├── android/                        # Android platform code
├── ios/                           # iOS platform code
├── __tests__/                     # Test files
├── package.json
├── metro.config.js               # Metro bundler configuration
├── babel.config.js              # Babel configuration
└── react-native.config.js      # React Native configuration
```
## API Integration - MOBILE ENTERPRISE READY
**Base URL**: `http://localhost:5000/api` (same as web)
**SignalR Hub**: `http://localhost:5000/hubs/petLove` (same as web)
**Documentation**: `http://localhost:5000/swagger` (same as web)
### Mobile Enterprise Headers (All Requests)
```typescript
{
  'X-Correlation-ID': correlationId,      // Request tracing
  'X-Transaction-ID': transactionId,      // Transaction tracking  
  'X-Idempotency-Key': idempotencyKey,   // Duplicate prevention
  'Authorization': `Bearer ${jwtToken}`,   // Authentication
  'X-User-ID': userId,                    // User context
  'X-Session-ID': sessionId,              // Session tracking
  'X-Device-ID': deviceId,                // Mobile device ID
  'X-Platform': platform,                 // iOS/Android
  'X-App-Version': appVersion,            // App version
  'X-Network-Type': networkType,          // WiFi/Cellular
}
```
## Development Environment Setup - MOBILE
```bash
# React Native CLI and dependencies
npm install -g @react-native-community/cli
npx react-native@latest init PetLoveCommunityMobile --template react-native-template-typescript
# Core mobile dependencies
npm install @reduxjs/toolkit react-redux @microsoft/signalr
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install @react-native-async-storage/async-storage redux-persist
npm install react-hook-form zod uuid react-native-uuid
# Mobile-specific dependencies
npm install react-native-fast-image react-native-camera
npm install @react-native-community/push-notification-ios
npm install react-native-permissions react-native-geolocation-service
npm install react-native-keychain react-native-biometrics
# Development dependencies
npm install -D @types/uuid @types/node jest
npm install -D @testing-library/react-native @testing-library/jest-native
npm install -D detox @config/detox metro-react-native-babel-preset
```
## Mobile Development Commands
```bash
# Development
npx react-native start              # Start Metro bundler
npx react-native run-ios            # Run on iOS simulator
npx react-native run-android        # Run on Android emulator
# Testing
npm run test                        # Unit tests with Jest
npm run test:detox:ios             # E2E tests on iOS
npm run test:detox:android         # E2E tests on Android
# Building
npx react-native build-ios         # Build iOS
npx react-native build-android     # Build Android
# Platform management
cd ios && pod install              # Install iOS dependencies
npx react-native doctor           # Check environment setup
```
## Claude Code Integration - MOBILE ENTERPRISE USAGE
Run `claude-code` for mobile enterprise tasks like:
- "Implement SignalR real-time pet adoption updates for React Native"
- "Add camera integration for pet photo uploads with idempotency"
- "Create push notifications for adoption status changes"
- "Build offline queue for transaction management in mobile app"
- "Add biometric authentication with correlation ID tracing"
- "Implement location services for nearby pet shelter discovery"
## Mobile Quality Assurance - ENTERPRISE GRADE
- **Unit Tests**: 90%+ coverage including mobile enterprise features
- **Integration Tests**: SignalR, idempotency, transaction management, offline sync
- **E2E Tests**: Complete user flows with Detox testing framework
- **Device Testing**: Physical iOS/Android devices across different versions
- **Performance Testing**: Memory usage, battery impact, network efficiency
- **Security Testing**: Secure storage, biometric authentication, API security
- **Accessibility Testing**: Screen reader support, high contrast, voice control
- **Store Compliance**: App Store and Play Store guidelines adherence
## Mobile-Specific Considerations
### Platform Adaptations
```typescript
// iOS-specific styling
const iosStyles = StyleSheet.create({
  header: {
    backgroundColor: designSystem.colors.coral,
    paddingTop: getStatusBarHeight(), // Safe area handling
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});
// Android-specific styling  
const androidStyles = StyleSheet.create({
  header: {
    backgroundColor: designSystem.colors.coral,
    elevation: 4, // Material Design shadow
    paddingTop: StatusBar.currentHeight,
  },
});
// Platform-specific component
const HeaderComponent = () => (
  <View style={Platform.OS === 'ios' ? iosStyles.header : androidStyles.header}>
    <Text style={designSystem.typography.h2}>Pet Love Community</Text>
  </View>
);
```
### Offline Support Strategy
```typescript
// Offline transaction queue
interface OfflineTransaction {
  id: string;
  action: string;
  payload: any;
  correlationId: string;
  timestamp: number;
  retryCount: number;
}
class OfflineQueueService {
  private queue: OfflineTransaction[] = [];
  
  async queueTransaction(transaction: OfflineTransaction) {
    await AsyncStorage.setItem('offline_queue', JSON.stringify([...this.queue, transaction]));
  }
  
  async syncPendingTransactions() {
    const isOnline = await NetInfo.fetch().then(state => state.isConnected);
    if (isOnline) {
      for (const transaction of this.queue) {
        await this.retryTransaction(transaction);
      }
    }
  }
}
```
### Push Notification Integration
```typescript
// Enterprise push notifications with correlation tracking
import PushNotification from 'react-native-push-notification';
class NotificationService {
  static configure() {
    PushNotification.configure({
      onNotification: (notification) => {
        const correlationId = notification.data?.correlationId;
        if (correlationId) {
          correlationService.setCurrentCorrelationId(correlationId);
        }
        
        // Handle Pet Love Community specific notifications
        switch (notification.data?.type) {
          case 'pet_adoption_status':
            navigateToPetDetail(notification.data.petId);
            break;
          case 'event_reminder':
            navigateToEvent(notification.data.eventId);
            break;
        }
      },
    });
  }
  
  static scheduleAdoptionStatusNotification(petId: string, status: string) {
    PushNotification.localNotification({
      title: 'Pet Adoption Update',
      message: `Your adoption application status: ${status}`,
      userInfo: { 
        type: 'pet_adoption_status', 
        petId,
        correlationId: generateCorrelationId()
      },
    });
  }
}
```
---
*This enterprise mobile guide ensures Pet Love Community React Native client meets production-grade reliability requirements with .NET SignalR integration, comprehensive duplicate prevention, enterprise-level request tracing, and optimal mobile user experience that perfectly co