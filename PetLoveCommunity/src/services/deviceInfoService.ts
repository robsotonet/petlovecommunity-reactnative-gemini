import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_INFO_KEY = 'DEVICE_INFO';

interface DeviceInfoData {
  uniqueId: string;
  deviceId: string;
  bundleId: string;
  systemVersion: string;
  // Add other relevant device info here
}

class DeviceInfoService {
  private deviceInfo: DeviceInfoData | null = null;
  private initializationPromise: Promise<DeviceInfoData> | null = null;

  public async getDeviceInfo(): Promise<DeviceInfoData> {
    // Return cached data if available
    if (this.deviceInfo) {
      return this.deviceInfo;
    }

    // Handle concurrent calls with singleton pattern
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Create initialization promise for concurrent call handling
    this.initializationPromise = this.initializeDeviceInfo();
    
    try {
      const result = await this.initializationPromise;
      return result;
    } finally {
      // Clear initialization promise once complete
      this.initializationPromise = null;
    }
  }

  private async initializeDeviceInfo(): Promise<DeviceInfoData> {
    // Try to load from AsyncStorage with error handling
    try {
      const storedInfo = await AsyncStorage.getItem(DEVICE_INFO_KEY);
      
      if (storedInfo) {
        try {
          const parsed = JSON.parse(storedInfo);
          this.deviceInfo = parsed;
          return this.deviceInfo as DeviceInfoData;
        } catch (parseError) {
          // Handle corrupted JSON data gracefully by continuing to collect fresh data
          console.warn('DeviceInfoService: Corrupted stored data, collecting fresh device info');
        }
      }
    } catch (storageError) {
      // Handle AsyncStorage read failures gracefully
      console.warn('DeviceInfoService: Storage read failed, collecting fresh device info');
    }

    // Collect fresh device info
    const [uniqueId, deviceId, bundleId, systemVersion] = await Promise.all([
      DeviceInfo.getUniqueId(),
      DeviceInfo.getDeviceId(),
      DeviceInfo.getBundleId(),
      DeviceInfo.getSystemVersion(),
    ]);

    const newDeviceInfo: DeviceInfoData = {
      uniqueId,
      deviceId,
      bundleId,
      systemVersion,
    };

    // Try to store with error handling
    try {
      await AsyncStorage.setItem(DEVICE_INFO_KEY, JSON.stringify(newDeviceInfo));
    } catch (storageError) {
      // Handle storage write failures gracefully - still cache in memory
      console.warn('DeviceInfoService: Storage write failed, using memory cache only');
    }

    this.deviceInfo = newDeviceInfo;
    return this.deviceInfo;
  }
}

const deviceInfoService = new DeviceInfoService();
export default deviceInfoService;
