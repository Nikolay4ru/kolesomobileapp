// services/AppVersionTracker.tsx
import { useEffect } from 'react';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import axios from 'axios';
import { useStores } from '../useStores';
import { MMKV } from 'react-native-mmkv';

// Создаем экземпляр MMKV для хранения данных версий
const storage = new MMKV({
  id: 'app-version-storage',
  encryptionKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCGdjrOoXf9GW7li8eRFfovNaZipAJrh03DwBOIO8BQCnzlnxIsq8fjS95CNFRpcMaFiEO3Ok2U6ZRmw462HuuYAgyI/VnBr/orXDeTJhqZozJ8TrbCPEWaoNY301S6y8Hi3bBI8XACoAcwcMpnUeUaa000DtsOGhbvMBKSUZ8BgaRZQaAaAE5yOb7ZbkYPHzNIfoDkdoSA7RHJDIjsbicO8eDjlZqInE7+ATTHZ3yEDFRPqzH+TQw5o7GbNpPhitRDTChucW3s2kfhkxrKE/BXh9NKDk6O0KwgU6prtkiSdQ9UcLhpmNU4C8Ro1de8NczrnyXfbDpmt6kd9Rrs8ZfP' // Опционально для шифрования
});

const VERSION_CHECK_KEY = 'last_version_check';
const CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 часов
const DEVICE_ID_KEY = 'device_id';
const APP_VERSION_KEY = 'app_version';

export const useAppVersionTracker = () => {
  const { authStore } = useStores();

  const sendVersionInfo = async () => {
    try {
      // Проверяем, когда последний раз отправляли
      const lastCheck = storage.getNumber(VERSION_CHECK_KEY);
      if (lastCheck && Date.now() - lastCheck < CHECK_INTERVAL) {
      //  return; // Еще рано проверять
      }

      if (!authStore.isLoggedIn || !authStore.token) {
        return;
      }
      console.log('login');

      const version = DeviceInfo.getVersion();
      const buildNumber = DeviceInfo.getBuildNumber();
      const deviceId = storage.getString(DEVICE_ID_KEY);

      const data = {
        platform: Platform.OS,
        version: version,
        version_code: parseInt(buildNumber, 10),
        device_id: deviceId ? parseInt(deviceId, 10) : null
      };
      console.log(data);
      const response = await axios.post(
        'https://api.koleso.app/api/check_app_update.php',
        data,
        {
          headers: {
            'Authorization': `Bearer ${authStore.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log(response.data);
      if (response.data.success) {
        // Сохраняем время последней проверки
        storage.set(VERSION_CHECK_KEY, Date.now());

        // Если есть обновление и это не принудительное, показываем в UI
        if (response.data.update_available && !response.data.force_update) {
          // Уведомление будет отправлено с сервера через push
          // Здесь можно сохранить информацию об обновлении в стор
          if (global.updateStore) {
            global.updateStore.setUpdateInfo({
              isUpdateAvailable: true,
              currentVersion: version,
              newVersion: response.data.latest_version,
              downloadUrl: response.data.download_url,
              releaseNotes: response.data.release_notes,
              forceUpdate: response.data.force_update
            });
          }
        }
      }
    } catch (error) {
      console.error('Error sending version info:', error);
    }
  };

  // Также отправляем версию при обновлении OneSignal ID
  const updateDeviceVersion = async (deviceId: number) => {
    try {
      if (!authStore.isLoggedIn || !authStore.token) {
        return;
      }

      const version = DeviceInfo.getVersion();
      const buildNumber = DeviceInfo.getBuildNumber();
      const fullVersion = `${version}.${buildNumber}`;

      await axios.post(
        'https://api.koleso.app/api/update_device_info.php',
        {
          device_id: deviceId,
          app_version: fullVersion,
          platform: Platform.OS
        },
        {
          headers: {
            'Authorization': `Bearer ${authStore.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
     
      // Сохраняем версию локально
      storage.set(APP_VERSION_KEY, fullVersion);
    } catch (error) {
      console.error('Error updating device version:', error);
    }
  };

  // Функция для сохранения device_id в MMKV
  const saveDeviceId = (deviceId: string | number) => {
    storage.set(DEVICE_ID_KEY, String(deviceId));
  };

  // Функция для получения device_id из MMKV
  const getDeviceId = (): number | null => {
    const deviceId = storage.getString(DEVICE_ID_KEY);
    return deviceId ? parseInt(deviceId, 10) : null;
  };

  // Функция для очистки данных проверки версии
  const clearVersionCheck = () => {
    storage.delete(VERSION_CHECK_KEY);
  };

  // Функция для принудительной проверки версии
  const forceVersionCheck = async () => {
    clearVersionCheck();
    await sendVersionInfo();
  };

  // Функция для получения информации о последней проверке
  const getLastCheckInfo = () => {
    const lastCheck = storage.getNumber(VERSION_CHECK_KEY);
    const currentVersion = storage.getString(APP_VERSION_KEY);
    
    return {
      lastCheckTime: lastCheck ? new Date(lastCheck) : null,
      timeSinceLastCheck: lastCheck ? Date.now() - lastCheck : null,
      currentVersion: currentVersion || `${DeviceInfo.getVersion()}.${DeviceInfo.getBuildNumber()}`,
      nextCheckTime: lastCheck ? new Date(lastCheck + CHECK_INTERVAL) : null
    };
  };

  useEffect(() => {
    // Отправляем информацию о версии при входе в приложение
    if (authStore.isLoggedIn) {
      sendVersionInfo();

      // Проверяем каждые 6 часов пока приложение активно
      const interval = setInterval(sendVersionInfo, CHECK_INTERVAL);

      return () => clearInterval(interval);
    }
  }, [authStore.isLoggedIn]);

  return { 
    sendVersionInfo, 
    updateDeviceVersion, 
    saveDeviceId, 
    getDeviceId,
    forceVersionCheck,
    clearVersionCheck,
    getLastCheckInfo
  };
};

// Хук для интеграции с OneSignal
export const useOneSignalVersionTracking = () => {
  const { authStore } = useStores();
  const { updateDeviceVersion, saveDeviceId } = useAppVersionTracker();

  const handleDeviceRegistration = async (deviceInfo: any) => {
    if (deviceInfo.deviceId && authStore.isLoggedIn) {
      // Сохраняем device_id в MMKV
      saveDeviceId(deviceInfo.deviceId);
      // Обновляем версию на сервере
      await updateDeviceVersion(deviceInfo.deviceId);
    }
  };

  return { handleDeviceRegistration };
};

