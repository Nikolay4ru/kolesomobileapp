import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import axios from 'axios';
import RNFS from 'react-native-fs';
import FileViewer from 'react-native-file-viewer';
import DeviceInfo from 'react-native-device-info';

// --- Используем ThemeContext как в вашем HomeScreen --- //
import { useTheme } from '../contexts/ThemeContext'; // путь поправьте на ваш

interface VersionResponse {
  android: {
    version: string;
    versionCode: number;
    url: string;
    releaseNotes?: string;
    forceUpdate?: boolean;
  };
}

interface UpdateInfo {
  isUpdateAvailable: boolean;
  currentVersion: string;
  newVersion: string;
  downloadUrl: string;
  releaseNotes?: string;
  forceUpdate?: boolean;
}

const compareVersions = (current: string, latest: string): boolean => {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);
  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;
    if (latestPart > currentPart) return true;
    if (latestPart < currentPart) return false;
  }
  return false;
};

export const useUpdateChecker = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkForUpdates = async () => {
    if (Platform.OS !== 'android') return;
    try {
      setIsChecking(true);
      const currentVersion = DeviceInfo.getVersion();
      const versionCode = DeviceInfo.getBuildNumber();
      const response = await axios.get<VersionResponse>('https://api.koleso.app/version.json');
      const androidVersion = response.data.android;
      const isNeeded = compareVersions(
        `${currentVersion}.${versionCode}`,
        `${androidVersion.version}.${androidVersion.versionCode}`
      );
      if (isNeeded) {
        setUpdateInfo({
          isUpdateAvailable: true,
          currentVersion: `${currentVersion}.${versionCode}`,
          newVersion: `${androidVersion.version}.${androidVersion.versionCode}`,
          downloadUrl: androidVersion.url,
          releaseNotes: androidVersion.releaseNotes,
          forceUpdate: androidVersion.forceUpdate || false,
        });
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkForUpdates();
  }, []);

  return { updateInfo, isChecking, checkForUpdates };
};

// Кастомный progress bar на чистом RN
const CustomProgressBar: React.FC<{ progress: number; color: string; backgroundColor: string }> = ({
  progress,
  color,
  backgroundColor,
}) => (
  <View style={[styles.progressBarBackground, { backgroundColor }]}>
    <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: color }]} />
  </View>
);

export const UpdateModal: React.FC<{
  updateInfo: UpdateInfo;
  onClose: () => void;
}> = ({ updateInfo, onClose }) => {
  // --- используем вашу тему --- //
  const { colors, theme } = useTheme();

  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [contentLength, setContentLength] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const contentLengthRef = useRef(0);

  const requestStoragePermission = async () => {
    if (Platform.Version >= 33) {
      // Android 13+ не требует WRITE_EXTERNAL_STORAGE для Downloads
      return true;
    }
    
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Разрешение на сохранение файлов',
          message: 'Приложению необходимо разрешение для загрузки обновления',
          buttonNeutral: 'Позже',
          buttonNegative: 'Отмена',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  // Функция для получения правильного пути к директории
  const getDownloadPath = async () => {
    // Сначала пробуем использовать CachesDirectoryPath
    // который гарантированно доступен без дополнительных разрешений
    const cacheDir = RNFS.CachesDirectoryPath;
    const fileName = `koleso_update_${Date.now()}.apk`;
    return `${cacheDir}/${fileName}`;
  };

  const downloadAndInstall = async () => {
    const hasPermission = await requestStoragePermission();
    if (!hasPermission && Platform.Version < 33) {
      setError('Необходимо разрешение на сохранение файлов');
      return;
    }
    
    try {
      setError(null);
      setDownloading(true);
      setProgress(0);
      setContentLength(0);
      contentLengthRef.current = 0;

      // Используем кэш директорию вместо Downloads
      const filePath = await getDownloadPath();
      
      console.log('Download path:', filePath);

      // Проверяем существование директории
      const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
      const dirExists = await RNFS.exists(dirPath);
      
      if (!dirExists) {
        console.log('Creating directory:', dirPath);
        await RNFS.mkdir(dirPath);
      }

      const download = RNFS.downloadFile({
        fromUrl: updateInfo.downloadUrl,
        toFile: filePath,
        background: true,
        discretionary: true,
        cacheable: false, // Отключаем кэширование
        begin: (res) => {
          console.log('Download started, size:', res.contentLength);
          if (res.contentLength && res.contentLength > 0) {
            contentLengthRef.current = res.contentLength;
            setContentLength(res.contentLength);
          }
        },
        progress: (res) => {
          if (contentLengthRef.current > 0) {
            const percentage = (res.bytesWritten / contentLengthRef.current) * 100;
            setProgress(Math.round(percentage));
          }
        },
        progressDivider: 1,
      });

      const result = await download.promise;
      console.log('Download result:', result);
      
      if (result.statusCode === 200) {
        // Проверяем, что файл действительно существует
        const fileExists = await RNFS.exists(filePath);
        if (!fileExists) {
          throw new Error('Файл не был сохранен');
        }
        
        // Получаем информацию о файле
        const fileStat = await RNFS.stat(filePath);
        console.log('File info:', fileStat);
        
        if (fileStat.size === 0) {
          throw new Error('Загруженный файл пустой');
        }
        
        // Открываем файл для установки
        await FileViewer.open(filePath, {
          showOpenWithDialog: false,
          displayName: 'Обновление Koleso',
        });
        
        // Удаляем файл через 20 минут
        setTimeout(() => {
          RNFS.unlink(filePath).catch((err) => {
            console.log('Error deleting file:', err);
          });
        }, 1200000);
      } else {
        throw new Error(`Ошибка загрузки: код ${result.statusCode}`);
      }
    } catch (e) {
      console.error('Download error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Произошла ошибка при обновлении';
      setError(errorMessage);
      
      // Показываем более подробную информацию об ошибке
      Alert.alert(
        'Ошибка обновления',
        `${errorMessage}\n\nПопробуйте скачать обновление вручную с сайта.`,
        [
          { text: 'OK' }
        ]
      );
    } finally {
      setDownloading(false);
    }
  };

  // --- стили, зависящие от темы --- //
  const modalBg = theme === 'dark' ? colors.surface : '#fff';
  const textColor = colors.text;
  const subtextColor = colors.textSecondary || '#666';
  const progressBg = theme === 'dark' ? colors.surface : '#E0E0E0';
  const progressFill = colors.primary || '#2196F3';
  const errorColor = colors.error || '#FF3333';

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={updateInfo.forceUpdate ? undefined : onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: modalBg }]}>
          <Text style={[styles.title, { color: textColor }]}>Доступно обновление</Text>
          <Text style={[styles.versionText, { color: subtextColor }]}>
            Текущая версия: {updateInfo.currentVersion}
          </Text>
          <Text style={[styles.versionText, { color: subtextColor }]}>
            Новая версия: {updateInfo.newVersion}
          </Text>
          {updateInfo.releaseNotes && (
            <View style={styles.releaseNotesContainer}>
              <Text style={[styles.releaseNotesTitle, { color: textColor }]}>Что нового:</Text>
              <Text style={[styles.releaseNotes, { color: subtextColor }]}>{updateInfo.releaseNotes}</Text>
            </View>
          )}
          {error && (
            <Text style={[styles.errorText, { color: errorColor }]}>{error}</Text>
          )}
          {downloading && (
            <View style={styles.progressContainer}>
              <Text style={[styles.progressText, { color: textColor }]}>
                Загрузка{contentLength > 0 ? `: ${progress}%` : '...'}
              </Text>
              {contentLength > 0 ? (
                <CustomProgressBar
                  progress={progress}
                  color={progressFill}
                  backgroundColor={progressBg}
                />
              ) : (
                <ActivityIndicator color={progressFill} style={{ marginTop: 8 }} />
              )}
            </View>
          )}
          <View style={styles.buttonContainer}>
            {!updateInfo.forceUpdate && !downloading && (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme === 'dark' ? colors.surface : '#E0E0E0', marginRight: 10 }]}
                onPress={onClose}
              >
                <Text style={[styles.buttonText, { color: textColor }]}>Позже</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: progressFill, marginLeft: 10 }]}
              onPress={downloadAndInstall}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.buttonText, { color: '#fff' }]}>
                  Обновить
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const UpdateChecker: React.FC = () => {
  const { updateInfo } = useUpdateChecker();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (updateInfo?.isUpdateAvailable) {
      setShowModal(true);
    }
  }, [updateInfo]);

  if (!updateInfo || !showModal) return null;

  return (
    <UpdateModal
      updateInfo={updateInfo}
      onClose={() => setShowModal(false)}
    />
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  versionText: {
    fontSize: 14,
    marginBottom: 5,
  },
  releaseNotesContainer: {
    marginTop: 15,
    marginBottom: 15,
  },
  releaseNotesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  releaseNotes: {
    fontSize: 14,
    lineHeight: 20,
  },
  progressContainer: {
    marginVertical: 15,
  },
  progressText: {
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});