// Pet Love Community - Pet Domain Types
// Enterprise-grade type definitions for pet adoption features

export interface Pet {
  id: string;
  name: string;
  type: PetType;
  breed: string;
  age: number;
  gender: PetGender;
  size: PetSize;
  description: string;
  traits?: string[];
  photos: PetPhoto[];
  location: PetLocation;
  status: PetStatus;
  shelter: Shelter;
  characteristics: PetCharacteristics;
  medicalInfo: PetMedicalInfo;
  adoptionInfo: AdoptionInfo;
  createdAt: string;
  updatedAt: string;
}

export type PetType = 'dog' | 'cat' | 'bird' | 'rabbit' | 'other';

export type PetGender = 'male' | 'female' | 'unknown';

export type PetSize = 'small' | 'medium' | 'large' | 'extra-large';

export type PetStatus = 'available' | 'pending' | 'adopted' | 'unavailable';

export interface PetPhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  caption?: string;
  isPrimary: boolean;
  uploadedAt: string;
}

export interface PetLocation {
  id: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface Shelter {
  id: string;
  name: string;
  email: string;
  phone: string;
  website?: string;
  address: string;
  location: PetLocation;
  verified: boolean;
  rating: number;
  totalReviews: number;
}

export interface PetCharacteristics {
  energyLevel: 1 | 2 | 3 | 4 | 5;
  friendlinessWithChildren: 1 | 2 | 3 | 4 | 5;
  friendlinessWithPets: 1 | 2 | 3 | 4 | 5;
  trainability: 1 | 2 | 3 | 4 | 5;
  groomingNeeds: 1 | 2 | 3 | 4 | 5;
  specialNeeds: string[];
  goodWith: ('children' | 'dogs' | 'cats' | 'seniors')[];
  houseTrained: boolean;
  spayedNeutered: boolean;
}

export interface PetMedicalInfo {
  vaccinated: boolean;
  vaccinationDate?: string;
  microchipped: boolean;
  microchipId?: string;
  healthConditions: string[];
  medications: string[];
  veterinarianNotes?: string;
  lastCheckupDate?: string;
}

export interface AdoptionInfo {
  adoptionFee: number;
  currency: string;
  adoptionProcess: string[];
  requirements: string[];
  contactInfo: {
    primaryContact: string;
    email: string;
    phone: string;
  };
  availableForVisit: boolean;
  adoptionApplicationUrl?: string;
}

// Favorites Management
export interface PetFavorite {
  petId: string;
  userId: string;
  favoritedAt: string;
  notes?: string;
}

// Pet Search & Filtering
export interface PetSearchFilters {
  type?: PetType[];
  size?: PetSize[];
  age?: {
    min?: number;
    max?: number;
  };
  gender?: PetGender[];
  location?: {
    zipCode?: string;
    radius?: number; // in miles
  };
  characteristics?: {
    goodWithChildren?: boolean;
    goodWithPets?: boolean;
    houseTrained?: boolean;
    spayedNeutered?: boolean;
  };
  shelter?: string[];
}

export interface PetSearchRequest {
  filters?: PetSearchFilters;
  sortBy?: 'newest' | 'oldest' | 'distance' | 'name' | 'age';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  searchQuery?: string;
}

export interface PetSearchResponse {
  pets: Pet[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  filters: PetSearchFilters;
}

// Adoption Application
export interface AdoptionApplication {
  id: string;
  petId: string;
  userId: string;
  status: AdoptionApplicationStatus;
  submittedAt: string;
  updatedAt: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    dateOfBirth: string;
  };
  livingSituation: {
    housingType: 'house' | 'apartment' | 'condo' | 'other';
    ownOrRent: 'own' | 'rent';
    yardType: 'none' | 'small' | 'medium' | 'large';
    landlordApproval?: boolean;
  };
  experience: {
    previousPets: boolean;
    currentPets: Pet[];
    petExperience?: string;
    veterinarianInfo?: {
      name: string;
      phone: string;
      address: string;
    };
  };
  preferences?: {
    activityLevel?: 'low' | 'moderate' | 'high' | 'very-high';
    sizePreference?: 'small' | 'medium' | 'large' | 'extra-large' | 'no-preference';
    willingToTrain?: boolean;
    timeCommitment?: 'minimal' | 'moderate' | 'significant' | 'extensive';
    hasChildren?: boolean;
    needsPetCompatibility?: boolean;
    specialConsiderations?: string;
    whyThisPet?: string;
  };
  references: Reference[];
  documents: ApplicationDocument[];
  additionalNotes?: string;
}

export type AdoptionApplicationStatus = 
  | 'draft' 
  | 'submitted' 
  | 'under_review' 
  | 'approved' 
  | 'rejected' 
  | 'withdrawn';

export interface Reference {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  contacted: boolean;
  contactedAt?: string;
  notes?: string;
}

export interface ApplicationDocument {
  id: string;
  type: 'id' | 'proof_of_residence' | 'landlord_approval' | 'vet_records' | 'other';
  filename: string;
  url: string;
  uploadedAt: string;
  verified: boolean;
}

// API Response Types
export interface PetApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  correlationId: string;
  timestamp: string;
}

export interface PetApiError {
  code: string;
  message: string;
  details?: any;
  correlationId: string;
  timestamp: string;
}

// Real-time Updates
export interface PetStatusUpdate {
  petId: string;
  status: PetStatus;
  updatedAt: string;
  reason?: string;
}

export interface PetAvailabilityUpdate {
  petId: string;
  available: boolean;
  updatedAt: string;
  shelter: {
    id: string;
    name: string;
  };
}

// Analytics & Tracking
export interface PetViewEvent {
  petId: string;
  userId?: string;
  sessionId: string;
  deviceId: string;
  timestamp: string;
  source: 'search' | 'featured' | 'direct' | 'share';
  correlationId: string;
}

export interface PetInteractionEvent {
  petId: string;
  userId?: string;
  action: 'favorite' | 'unfavorite' | 'share' | 'contact' | 'application_start';
  timestamp: string;
  correlationId: string;
  metadata?: Record<string, any>;
}