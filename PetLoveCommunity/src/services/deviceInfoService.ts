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

  public async getDeviceInfo(): Promise<DeviceInfoData> {
    if (this.deviceInfo) {
      return this.deviceInfo;
    }

    let storedInfo = await AsyncStorage.getItem(DEVICE_INFO_KEY);

    if (storedInfo) {
      this.deviceInfo = JSON.parse(storedInfo);
      return this.deviceInfo as DeviceInfoData;
    }

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

    await AsyncStorage.setItem(DEVICE_INFO_KEY, JSON.stringify(newDeviceInfo));
    this.deviceInfo = newDeviceInfo;
    return this.deviceInfo;
  }
}

const deviceInfoService = new DeviceInfoService();
export default deviceInfoService;
