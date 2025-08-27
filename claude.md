# Pet Love Community - React Native Mobile App

## Project Overview

**Enterprise-grade React Native mobile application for Pet Love Community** - A comprehensive platform for pet adoption, services marketplace, community events, and AI-powered pet care guidance. Built with React Native 0.74+, TypeScript, and enterprise-level architecture including .NET SignalR integration, idempotency management, correlation ID tracing, and transaction-level duplicate prevention.

**Platform**: React Native (iOS & Android)  
**Version**: 0.0.1  
**Tech Stack**: React Native 0.74+, TypeScript 5.3+, Redux Toolkit, SignalR

## Project Context

This mobile app is designed to work alongside the existing Pet Love Community web client, providing a consistent user experience across all platforms. The focus is on enterprise-grade reliability with real-time updates, offline support, and comprehensive transaction management.

## Architecture & Enterprise Features

### Core Enterprise Patterns
- **Correlation ID Tracing**: Every request tracked with unique correlation IDs for debugging and monitoring
- **Idempotency Management**: Prevents duplicate operations and ensures transaction safety
- **Transaction Management**: Enterprise-level transaction handling with offline queue support
- **SignalR Real-time**: .NET SignalR integration for real-time updates with mobile-specific handling

### Technology Stack
```
React Native 0.74+ (Cross-platform)
├── Language: TypeScript 5.3+
├── UI: React Native Core Components + Custom Design System
├── State: Redux Toolkit + RTK Query + Redux Persist
├── Navigation: React Navigation 6+
├── Real-time: @microsoft/signalr
├── Storage: AsyncStorage + Secure Storage (Keychain/Keystore)
├── Authentication: Biometric + Secure Token Storage
└── Testing: Jest + React Native Testing Library
```

## Project Structure

```
PetLoveCommunity/src/
├── components/           # Reusable UI components
│   ├── ui/              # Base components (Button, Card, Input)
│   ├── forms/           # Form-specific components
│   └── features/        # Feature-specific components
├── screens/             # Screen components
│   ├── auth/           # Authentication screens
│   ├── pets/           # Pet adoption screens (coming in Phase 3)
│   ├── services/       # Service booking screens (Phase 4)
│   ├── events/         # Event management screens (Phase 4)
│   └── social/         # Social platform screens (Phase 5)
├── services/           # Enterprise services
│   ├── apiClient.ts    # RTK Query API client
│   ├── signalrService.ts    # SignalR connection management
│   ├── correlationIdService.ts  # Request correlation tracking
│   ├── idempotencyService.ts    # Duplicate prevention
│   ├── transactionService.ts    # Transaction management
│   ├── authService.ts          # Authentication handling
│   ├── networkService.ts       # Network state monitoring
│   └── deviceInfoService.ts    # Device information collection
├── navigation/         # Navigation configuration
├── hooks/             # Custom React hooks
├── styles/            # Design system implementation
├── store.ts           # Redux store configuration
└── types/             # TypeScript definitions
```

## Design System

**Brand Identity**: Warm, trustworthy, professional, caring, modern, approachable

### Color Palette (from design-system.json)
```typescript
Primary Colors:
- Coral: #FF6B6B (adoption actions, emotional moments)
- Teal: #4ECDC4 (services, trust-building, professional actions)

Neutral Colors:
- Beige: #F7FFF7 (backgrounds, comfort)
- Midnight: #1A535C (text, professional content)

Extended Colors:
- Coral Light: #FF8E8E (hover states)
- Coral Dark: #E55555 (active states)
- Teal Light: #6ED4CC (backgrounds)
- Teal Dark: #3BB5B0 (active states)
```

### Usage Guidelines
- **Adoption Features**: Always use Coral (#FF6B6B) for adoption-related actions
- **Service Features**: Always use Teal (#4ECDC4) for service-related actions
- **Text**: Always use Midnight Blue (#1A535C) for primary text
- **Backgrounds**: Always use Warm Beige (#F7FFF7) for main content areas

## Development Guidelines

### Code Standards
- **TypeScript**: Strict mode enabled, comprehensive type definitions
- **Styling**: React Native StyleSheet only, following design system constants
- **Components**: Functional components with hooks, proper accessibility support
- **State Management**: Redux Toolkit patterns, RTK Query for API calls
- **Testing**: Jest + React Native Testing Library, 90%+ coverage target

### Enterprise Integration Requirements
All API requests must include enterprise headers:
```typescript
{
  'X-Correlation-ID': correlationId,      // Request tracing
  'X-Transaction-ID': transactionId,      // Transaction tracking
  'X-Idempotency-Key': idempotencyKey,   // Duplicate prevention
  'X-Device-ID': deviceId,               // Mobile device ID
  'X-Platform': 'ios'|'android',         // Platform type
  'X-App-Version': appVersion,           // App version
}
```

### Development Workflow
1. **Analysis & Planning**: Review requirements, update tasks/todo.md
2. **Implementation**: Write code following enterprise patterns
3. **Testing**: Unit tests for all services and components
4. **Integration**: Test SignalR, offline support, correlation tracking
5. **Review**: Ensure design system compliance and accessibility

## Current Development Status

### ✅ Completed (Phases 1-3)
- **Enterprise Foundation**: React Native setup, Redux Toolkit, SignalR, correlation ID service, transaction management, idempotency service
- **Navigation & Platform**: React Navigation, AsyncStorage integration, device info collection, network monitoring
- **Design System**: Color system implementation, comprehensive component library (Button, Card, Input, CameraModal, etc.), dark mode support
- **Authentication**: Secure storage, biometric authentication, session management, protected navigation
- **Pet Discovery**: Complete pet listing, detail screens, swipeable gallery, search/filtering, real-time updates
- **Adoption Workflow**: Multi-step application forms, document uploads, status tracking, draft management with auto-sync

### 🎯 Ready to Begin
- **Phase 4**: Enhanced features and calendar integration
- **Advanced Features**: Native calendar, enhanced analytics, location services

### 📋 Upcoming (Phases 4-5)
- **Events & Calendar**: Community events, native calendar integration, push notifications
- **Social Platform**: Community posts, real-time interactions, media sharing
- **Performance Optimization**: Bundle size optimization, advanced caching

## Key Services & Usage

### CorrelationIdService
```typescript
import correlationIdService from '@/services/correlationIdService';
const correlationId = await correlationIdService.getCorrelationId();
```

### SignalRService
```typescript
import signalRService from '@/services/signalrService';
const connection = signalRService.getConnection();
connection.on('PetAdoptionStatusChanged', (petId, status) => {
  // Handle real-time updates
});
```

### TransactionService
```typescript
import { executeWithTransaction } from '@/transactions/transactionService';
await executeWithTransaction(async () => {
  // Your operation here
});
```

## API Integration

**Base URL**: Configure in environment  
**SignalR Hub**: Configure SignalR endpoint  
**Documentation**: Available via Swagger/OpenAPI

## Testing Strategy

### Unit Tests
- All services (correlation, idempotency, transaction, SignalR)
- All components (Button, Card, Input, screens)
- Authentication flows and session management
- Navigation and routing logic

### Integration Tests
- SignalR real-time communication
- Offline queue and sync functionality
- Biometric authentication flows
- Redux state management

### E2E Tests (Future)
- Complete user journeys
- Cross-platform compatibility testing

## Development Commands

```bash
# Development
npm run start          # Start Metro bundler
npm run ios           # Run iOS simulator
npm run android       # Run Android emulator

# Testing
npm run test          # Run unit tests
npm run test:watch    # Watch mode

# Code Quality
npm run lint          # ESLint
npm run typecheck     # TypeScript validation
```

## Mobile-Specific Considerations

### Performance Targets
- App Launch: < 2.0s (cold start)
- Screen Transitions: < 300ms
- Bundle Size: < 25MB (iOS), < 20MB (Android)
- SignalR Connection: < 500ms establishment

### Platform Adaptations
- iOS: Human Interface Guidelines compliance
- Android: Material Design principles
- Accessibility: Screen reader support, high contrast modes
- Dark Mode: Automatic system preference detection

## Team Workflow

### Two-Developer Setup
- **Developer 1**: Backend integration, enterprise services, API integration
- **Developer 2**: UI/UX implementation, component library, design system

### Task Management
- All tasks tracked in `tasks/todo.md`
- Clear separation of responsibilities
- Regular progress updates and reviews

## Troubleshooting

### Common Issues
- **SignalR Connection**: Check network connectivity and endpoint configuration
- **Biometric Auth**: Ensure device capabilities and permissions
- **Redux Persist**: Clear AsyncStorage if state issues occur
- **Metro Bundler**: Reset cache with `npx react-native start --reset-cache`

### Enterprise Debugging
- Check correlation IDs in network requests
- Verify idempotency keys for duplicate operations
- Monitor transaction status in logs
- Review SignalR connection events

## Next Development Priorities

1. **Complete Phase 2 Testing**: Finalize component and auth tests
2. **Start Phase 3**: Pet discovery and adoption features
3. **Camera Integration**: Pet photo uploads and document scanning
4. **Location Services**: Nearby shelter discovery
5. **Push Notifications**: Real-time adoption status updates

---

**Maintained by**: Pet Love Community Development Team  
**Last Updated**: August 2025  
**Version**: 1.0.0