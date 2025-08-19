
# Pet Love Community - Gemini Development Guide

## 1. Project Overview

This document outlines the development plan and specifications for the Pet Love Community mobile application, a React Native-based client for iOS and Android. The goal is to create an enterprise-grade mobile application with a consistent user experience across all platforms, leveraging the existing web client's backend and design system.

### 1.1. Core Technologies

- **Framework**: Bare React Native CLI 0.74+
- **Language**: TypeScript 5.3+
- **UI**: React Native Core Components with a custom design system.
- **State Management**: Redux Toolkit + RTK Query
- **Real-time Communication**: .NET SignalR
- **Navigation**: React Navigation 6+

### 1.2. Key Features

- Pet Discovery and Adoption
- Service Marketplace
- Community Events and Social Platform
- AI-Powered Pet Care Guidance

## 2. Design System

The mobile application will adhere to the Pet Love Community design system, as defined in `design-system.json`. The design system is based on a warm, trustworthy, and modern aesthetic, with a focus on emotional connection and user-friendliness.

### 2.1. Color Palette

- **Primary**: Soft Coral (`#FF6B6B`) and Pale Teal (`#4ECDC4`)
- **Neutral**: Warm Beige (`#F7FFF7`) and Midnight Blue (`#1A535C`)
- **Semantic**: Colors for success, warning, error, and info messages.

### 2.2. Typography

A clear and readable typography scale is defined in the design system, using a professional and stable font.

### 2.3. Components

The application will use a library of custom components, including buttons, cards, and forms, all styled according to the design system.

## 3. Development Plan

The development process is divided into five phases, as outlined in the `tasks/todo.md` file. Each phase has a specific set of goals and deliverables.

### 3.1. Phase 1: Mobile Enterprise Foundation

This phase focuses on setting up the project's foundation, including the React Native project, Redux state management, SignalR integration, and enterprise features like correlation ID and idempotency.

### 3.2. Phase 2: Mobile Design System & Components

In this phase, the design system will be implemented in React Native, and a library of reusable components will be created. Authentication and session management will also be implemented.

### 3.3. Phase 3: Pet Adoption Features

This phase involves the development of the core pet adoption features, including pet discovery, adoption applications, and real-time updates.

### 3.4. Phase 4: Mobile Events & Calendar

This phase focuses on the implementation of the community events feature, including event management, calendar integration, and real-time updates.

### 3.5. Phase 5: Social Platform & Mobile Features

In the final phase, the social platform will be developed, including features like community posts, comments, and user interactions.

## 4. Task Management

All tasks for this project are tracked in the `tasks/todo.md` file. Please refer to this file for a detailed breakdown of the tasks and their current status.
