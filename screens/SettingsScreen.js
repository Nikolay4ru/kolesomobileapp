import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  StatusBar,
  Modal,
  SafeAreaView
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { MMKV } from 'react-native-mmkv';
import { useStores } from '../useStores';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import BannerNotificationPermission from '../components/BannerNotificationPermission';
const storage = new MMKV();

// Компонент модального окна выбора темы
const ThemeSelector = ({ visible, onClose }) => {
  const { themeMode, changeTheme, colors } = useTheme();
  const styles = useThemedStyles(themeModalStyles);
  
  const themeOptions = [
    { label: 'Системная', value: 'system', icon: 'phone-iphone' },
    { label: 'Светлая', value: 'light', icon: 'light-mode' },
    { label: 'Темная', value: 'dark', icon: 'dark-mode' },
  ];

  const handleThemeChange = (value) => {
    changeTheme(value);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={(e) => e.stopPropagation()}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Выберите тему</Text>
              
              {themeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.themeOption,
                    themeMode === option.value && styles.selectedThemeOption
                  ]}
                  onPress={() => handleThemeChange(option.value)}
                >
                  <Icon 
                    name={option.icon} 
                    size={24} 
                    color={themeMode === option.value ? colors.primary : colors.text} 
                  />
                  <Text style={[
                    styles.themeOptionText,
                    themeMode === option.value && styles.selectedThemeText
                  ]}>
                    {option.label}
                  </Text>
                  {themeMode === option.value && (
                    <Icon name="check" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <Text style={styles.closeButtonText}>Закрыть</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const SettingsScreen = observer(() => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { authStore } = useStores();
  const { colors, theme, themeMode } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  // Состояния для настроек
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [adminNotificationsEnabled, setAdminNotificationsEnabled] = useState(true);


  useEffect(() => {
  loadSettings();
  loadServerSettings();
  setAppVersion(DeviceInfo.getReadableVersion());
  // Или если хотите видеть и билд: 
  // DeviceInfo.getReadableVersion();
}, []);


  // Загрузка сохраненных настроек при монтировании
  useEffect(() => {
    loadSettings();   
    loadServerSettings(); 
  }, []);

  const loadSettings = () => {
    try {
      const notifications = storage.getBoolean('notifications');
      if (typeof notifications === 'boolean') setNotificationsEnabled(notifications);

      const adminNotifications = storage.getBoolean('adminNotifications');
      if (typeof adminNotifications === 'boolean') setAdminNotificationsEnabled(adminNotifications);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSetting = (key, value) => {
    try {
      storage.set(key, value);
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  };

  const loadServerSettings = async () => {
    if (!authStore.isLoggedIn) return;
    try {
      const response = await fetch('https://api.koleso.app/api/update_push_settings.php', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      });
      const data = await response.json();
      if (data.success && data.settings) {
        if (typeof data.settings.push_enabled === 'boolean') {
          setNotificationsEnabled(data.settings.push_enabled);
          saveSetting('notifications', data.settings.push_enabled);
        }
        if (authStore.isAdmin && typeof data.settings.admin_push_enabled === 'boolean') {
          setAdminNotificationsEnabled(data.settings.admin_push_enabled);
          saveSetting('adminNotifications', data.settings.admin_push_enabled);
        }
      }
    } catch (error) {
      console.error('Error loading server settings:', error);
    }
  };

  const handleNotificationToggle = async (value) => {
    setNotificationsEnabled(value);
    saveSetting('notifications', value);

    try {
      const response = await fetch('https://api.koleso.app/api/update_push_settings.php', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          push_enabled: value,
          notification_type: 'general'
        })
      });
      const data = await response.json();
      if (!data.success) {
        Alert.alert('Ошибка', 'Не удалось обновить настройки уведомлений');
        setNotificationsEnabled(!value);
        saveSetting('notifications', !value);
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось обновить настройки уведомлений');
      setNotificationsEnabled(!value);
      saveSetting('notifications', !value);
    }
  };

  const handleAdminNotificationToggle = async (value) => {
    setAdminNotificationsEnabled(value);
    saveSetting('adminNotifications', value);

    try {
      const response = await fetch('https://api.koleso.app/api/update_push_settings.php', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          push_enabled: value,
          notification_type: 'admin'
        })
      });
      const data = await response.json();
      if (!data.success) {
        Alert.alert('Ошибка', 'Не удалось обновить настройки уведомлений');
        setAdminNotificationsEnabled(!value);
        saveSetting('adminNotifications', !value);
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось обновить настройки уведомлений');
      setAdminNotificationsEnabled(!value);
      saveSetting('adminNotifications', !value);
    }
  };

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'system': return 'Системная';
      case 'light': return 'Светлая';
      case 'dark': return 'Темная';
      default: return 'Системная';
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Выход из аккаунта',
      'Вы уверены, что хотите выйти из аккаунта?',
      [
        {
          text: 'Отмена',
          style: 'cancel'
        },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            try {
              await authStore.logout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось выйти из аккаунта');
            }
          }
        }
      ]
    );
  };

  const SettingItem = ({ icon, title, subtitle, value, onValueChange, isLast = false, disabled = false }) => (
    <View style={[styles.settingItem, isLast && styles.settingItemLast]}>
      <View style={styles.settingItemLeft}>
        <View style={[styles.iconContainer, disabled && styles.iconContainerDisabled]}>
          <Icon name={icon} size={22} color={disabled ? colors.textTertiary : colors.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.settingTitle, disabled && styles.disabledText]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, disabled && styles.disabledText]}>{subtitle}</Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary + '50' }}
        thumbColor={value ? colors.primary : colors.surface}
        ios_backgroundColor={colors.border}
        disabled={disabled}
      />
    </View>
  );

  const ActionItem = ({ icon, iconComponent = Icon, title, subtitle, onPress, isLast = false, danger = false, showArrow = true }) => (
    <TouchableOpacity
      style={[styles.settingItem, isLast && styles.settingItemLast]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingItemLeft}>
        <View style={[styles.iconContainer, danger && styles.iconContainerDanger]}>
          {iconComponent === Icon ? (
            <Icon name={icon} size={22} color={danger ? colors.error : colors.primary} />
          ) : (
            <Ionicons name={icon} size={22} color={danger ? colors.error : colors.primary} />
          )}
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.settingTitle, danger && styles.dangerText]}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {showArrow && <Icon name="chevron-right" size={24} color={colors.textTertiary} />}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar 
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Настройки</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Уведомления */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Уведомления</Text>
          <View style={styles.settingsCard}>
            <SettingItem
              icon="notifications"
              title="Push-уведомления"
              subtitle="Получать уведомления о заказах и акциях"
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              isLast={!authStore.isAdmin}
            />
            {authStore.isAdmin && (
              <SettingItem
                icon="admin-panel-settings"
                title="Уведомления администратора"
                subtitle="Получать уведомления о новых заказах магазина"
                value={adminNotificationsEnabled}
                onValueChange={handleAdminNotificationToggle}
                isLast
              />
            )}
          </View>
        </View>

        {/* Внешний вид */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Внешний вид</Text>
          <View style={styles.settingsCard}>
            <ActionItem
              icon="palette"
              title="Тема приложения"
              subtitle={getThemeLabel()}
              onPress={() => setThemeModalVisible(true)}
              isLast
            />
          </View>
        </View>

        {/* Общие настройки */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Общие</Text>
          <View style={styles.settingsCard}>
            <ActionItem
  icon="info-outline"
  title="О приложении"
  subtitle={`Версия ${appVersion || ''}`}
  onPress={() => Alert.alert(
    'О приложении', 
    `Колесо v${appVersion}\n\n© 2025 Все права защищены`
  )}
/>
            <ActionItem
              icon="shield"
              iconComponent={Ionicons}
              title="Политика конфиденциальности"
              onPress={() => Alert.alert('Политика конфиденциальности', 'Откроется в браузере')}
            />
            <ActionItem
              icon="document-text"
              iconComponent={Ionicons}
              title="Условия использования"
              onPress={() => Alert.alert('Условия использования', 'Откроется в браузере')}
              isLast
            />
          </View>
        </View>

        {/* Аккаунт */}
        {authStore.isLoggedIn && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Аккаунт</Text>
            <View style={styles.settingsCard}>
              <ActionItem
                icon="logout"
                title="Выйти из аккаунта"
                subtitle={authStore.user?.phone || authStore.user?.email}
                onPress={handleLogout}
                danger
                isLast
              />
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {authStore.isLoggedIn 
              ? `Вы вошли как ${authStore.user?.firstName || 'Пользователь'}`
              : 'Вы не авторизованы'
            }
          </Text>
        </View>
      </ScrollView>
      {authStore.isNotificationDenied && (
        <BannerNotificationPermission />
      )}
      <ThemeSelector 
        visible={themeModalVisible}
        onClose={() => setThemeModalVisible(false)}
      />
    </View>
  );
});

const themedStyles = (colors, theme) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  settingsCard: {
    backgroundColor: colors.card,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainerDisabled: {
    backgroundColor: colors.surface,
  },
  iconContainerDanger: {
    backgroundColor: colors.error + '15',
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  disabledText: {
    color: colors.textTertiary,
  },
  dangerText: {
    color: colors.error,
  },
  footer: {
    marginTop: 40,
    marginBottom: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

const themeModalStyles = (colors, theme) => ({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  safeArea: {
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedThemeOption: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  themeOptionText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
    marginLeft: 12,
  },
  selectedThemeText: {
    color: colors.primary,
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 10,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;