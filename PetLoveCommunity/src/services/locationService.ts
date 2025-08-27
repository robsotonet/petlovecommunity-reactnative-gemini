// Pet Love Community - Location Service
// Enterprise location services for nearby pet discovery

import AsyncStorage from '@react-native-async-storage/async-storage';
import { loggingService } from './loggingService';
import correlationIdService from './correlationIdService';

interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

interface LocationPermissionResult {
  granted: boolean;
  error?: string;
}

interface LocationServiceOptions {
  timeout?: number;
  maximumAge?: number;
  enableHighAccuracy?: boolean;
}

interface NearbySearchParams {
  userLocation: Location;
  radiusKm: number;
  petLocation: { latitude: number; longitude: number; city?: string; state?: string };
}

class LocationService {
  private readonly CACHE_KEY = 'pet_love_user_location';
  private readonly CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes
  
  private cachedLocation: Location | null = null;

  constructor() {
    this.loadCachedLocation();
  }

  /**
   * Check and request location permissions
   */
  async checkLocationPermissions(): Promise<LocationPermissionResult> {
    const correlationId = await correlationIdService.getCorrelationId();
    
    try {
      loggingService.info('LocationService: Checking location permissions', { correlationId });

      // TODO: Implement actual permission checking
      // import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
      // const permission = Platform.OS === 'ios' 
      //   ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
      //   : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

      // const result = await check(permission);
      
      // if (result === RESULTS.DENIED) {
      //   const requestResult = await request(permission);
      //   return { granted: requestResult === RESULTS.GRANTED };
      // }

      // return { granted: result === RESULTS.GRANTED };

      // Simulate permission granted for development
      loggingService.info('LocationService: Location permission simulated as granted', { correlationId });
      return { granted: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Permission check failed';
      
      loggingService.error('LocationService: Permission check failed', {
        correlationId,
        error: errorMessage,
      });

      return { granted: false, error: errorMessage };
    }
  }

  /**
   * Get current user location
   */
  async getCurrentLocation(options: LocationServiceOptions = {}): Promise<Location> {
    const correlationId = await correlationIdService.getCorrelationId();
    const {
      timeout = 15000,
      maximumAge = 5 * 60 * 1000, // 5 minutes
      enableHighAccuracy = true,
    } = options;

    try {
      loggingService.info('LocationService: Getting current location', {
        correlationId,
        options: { timeout, maximumAge, enableHighAccuracy },
      });

      // Check if cached location is still valid
      if (this.cachedLocation && this.isCacheValid(this.cachedLocation, maximumAge)) {
        loggingService.info('LocationService: Using cached location', {
          correlationId,
          cacheAge: Date.now() - this.cachedLocation.timestamp,
        });
        return this.cachedLocation;
      }

      // Check permissions first
      const permissionResult = await this.checkLocationPermissions();
      if (!permissionResult.granted) {
        throw new Error(`Location permission denied: ${permissionResult.error}`);
      }

      // Get location using Geolocation API
      return new Promise<Location>((resolve, reject) => {
        // TODO: Replace with actual geolocation
        // navigator.geolocation.getCurrentPosition(
        //   (position) => {
        //     const location: Location = {
        //       latitude: position.coords.latitude,
        //       longitude: position.coords.longitude,
        //       accuracy: position.coords.accuracy,
        //       timestamp: position.timestamp,
        //     };
        //     this.cacheLocation(location);
        //     resolve(location);
        //   },
        //   (error) => {
        //     reject(new Error(`Location error: ${error.message}`));
        //   },
        //   {
        //     timeout,
        //     maximumAge,
        //     enableHighAccuracy,
        //   }
        // );

        // Simulate location for development (San Francisco coordinates)
        setTimeout(() => {
          const simulatedLocation: Location = {
            latitude: 37.7749 + (Math.random() - 0.5) * 0.1, // Add some random variance
            longitude: -122.4194 + (Math.random() - 0.5) * 0.1,
            accuracy: 10,
            timestamp: Date.now(),
          };

          this.cacheLocation(simulatedLocation);
          
          loggingService.info('LocationService: Simulated location obtained', {
            correlationId,
            latitude: simulatedLocation.latitude,
            longitude: simulatedLocation.longitude,
            accuracy: simulatedLocation.accuracy,
          });

          resolve(simulatedLocation);
        }, 1000); // Simulate 1 second delay
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Location error';
      
      loggingService.error('LocationService: Failed to get location', {
        correlationId,
        error: errorMessage,
      });

      throw new Error(errorMessage);
    }
  }

  /**
   * Calculate distance between two coordinates in kilometers
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Check if a pet is within a given radius
   */
  isPetNearby(params: NearbySearchParams): { isNearby: boolean; distance: number } {
    const distance = this.calculateDistance(
      params.userLocation.latitude,
      params.userLocation.longitude,
      params.petLocation.latitude,
      params.petLocation.longitude
    );

    return {
      isNearby: distance <= params.radiusKm,
      distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
    };
  }

  /**
   * Get nearby pets by adding distance information to search results
   */
  async enhanceSearchResultsWithDistance(
    pets: Array<any>,
    userLocation?: Location,
    radiusKm?: number
  ): Promise<Array<any>> {
    const correlationId = await correlationIdService.getCorrelationId();

    try {
      let location = userLocation;
      
      if (!location) {
        location = await this.getCurrentLocation();
      }

      const enhancedPets = pets.map(pet => {
        if (pet.location && pet.location.latitude && pet.location.longitude) {
          const { isNearby, distance } = this.isPetNearby({
            userLocation: location!,
            radiusKm: radiusKm || 50, // Default 50km radius
            petLocation: pet.location,
          });

          return {
            ...pet,
            distance,
            isNearby: radiusKm ? isNearby : true, // Only filter if radius is specified
          };
        }

        return pet;
      });

      // Sort by distance if location data is available
      const sortedPets = enhancedPets.sort((a, b) => {
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        return 0;
      });

      loggingService.info('LocationService: Enhanced search results with distance', {
        correlationId,
        totalPets: pets.length,
        petsWithLocation: sortedPets.filter(p => p.distance !== undefined).length,
        userLatitude: location.latitude,
        userLongitude: location.longitude,
      });

      return sortedPets;

    } catch (error) {
      loggingService.warn('LocationService: Failed to enhance search results', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return original pets if location fails
      return pets;
    }
  }

  /**
   * Get location display string
   */
  getLocationDisplayString(location: Location): string {
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  }

  /**
   * Private helper methods
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private isCacheValid(location: Location, maximumAge: number): boolean {
    return (Date.now() - location.timestamp) < maximumAge;
  }

  private async cacheLocation(location: Location): Promise<void> {
    try {
      this.cachedLocation = location;
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(location));
    } catch (error) {
      console.warn('LocationService: Failed to cache location:', error);
    }
  }

  private async loadCachedLocation(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const location = JSON.parse(cached) as Location;
        if (this.isCacheValid(location, this.CACHE_EXPIRY)) {
          this.cachedLocation = location;
        }
      }
    } catch (error) {
      console.warn('LocationService: Failed to load cached location:', error);
    }
  }

  /**
   * Clear cached location data
   */
  async clearCache(): Promise<void> {
    this.cachedLocation = null;
    try {
      await AsyncStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      console.warn('LocationService: Failed to clear location cache:', error);
    }
  }
}

// Export singleton instance
export const locationService = new LocationService();
export default locationService;