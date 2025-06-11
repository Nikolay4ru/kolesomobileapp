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
  StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { MMKV } from 'react-native-mmkv';
import { authStore } from '../stores/AuthStore';

const storage = new MMKV();

const SettingsScreen = observer(() => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const statusBarHeight = insets.top;

  // Состояния для настроек
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [adminNotificationsEnabled, setAdminNotificationsEnabled] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

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

    const darkTheme = storage.getBoolean('darkTheme');
    if (typeof darkTheme === 'boolean') setIsDarkTheme(darkTheme);
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
  setNotificationsEnabled(value); // UI сразу обновится
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
    // В ЭТОМ МОМЕНТЕ НЕ НАДО ВЫЗЫВАТЬ loadServerSettings и loadSettings!
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


  const handleThemeToggle = (value) => {
    setIsDarkTheme(value);
    // Здесь можно добавить логику смены темы приложения
    Alert.alert(
      'Изменение темы',
      `Тема изменена на ${value ? 'темную' : 'светлую'}. Изменения вступят в силу после перезапуска приложения.`,
      [{ text: 'OK' }]
    );
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
          <Icon name={icon} size={22} color={disabled ? '#CCC' : '#4A9B8E'} />
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
        trackColor={{ false: '#E0E0E0', true: '#A1E3D8' }}
        thumbColor={value ? '#4A9B8E' : '#F5F5F5'}
        ios_backgroundColor="#E0E0E0"
        disabled={disabled}
      />
    </View>
  );

  const ActionItem = ({ icon, iconComponent = Icon, title, subtitle, onPress, isLast = false, danger = false }) => (
    <TouchableOpacity
      style={[styles.settingItem, isLast && styles.settingItemLast]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingItemLeft}>
        <View style={[styles.iconContainer, danger && styles.iconContainerDanger]}>
          {iconComponent === Icon ? (
            <Icon name={icon} size={22} color={danger ? '#EF4444' : '#4A9B8E'} />
          ) : (
            <Ionicons name={icon} size={22} color={danger ? '#EF4444' : '#4A9B8E'} />
          )}
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.settingTitle, danger && styles.dangerText]}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <Icon name="chevron-right" size={24} color="#C7C7CC" />
    </TouchableOpacity>
  );
console.log("notificationsEnabled:", notificationsEnabled, "adminNotificationsEnabled:", adminNotificationsEnabled);
  return (
    <View style={[styles.container, { paddingTop: statusBarHeight }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#1a1a1a" />
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
            <SettingItem
              icon="brightness-4"
              key="theme"
              title="Темная тема"
              subtitle="Использовать темное оформление"
              value={isDarkTheme}
              onValueChange={handleThemeToggle}
              isLast
            />
          </View>
        </View>

        {/* Общие настройки */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Общие</Text>
          <View style={styles.settingsCard}>
            <ActionItem
              icon="language"
              title="Язык приложения"
              subtitle="Русский"
              onPress={() => Alert.alert('Язык', 'В разработке')}
            />
            <ActionItem
              icon="info-outline"
              title="О приложении"
              subtitle="Версия 1.0.0"
              onPress={() => Alert.alert('О приложении', 'Koleso App v1.0.0\n\n© 2024 Все права защищены')}
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
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
    color: '#1a1a1a',
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
    color: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  settingsCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
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
    borderBottomColor: '#F2F2F7',
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
    backgroundColor: '#E6FFF9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainerDisabled: {
    backgroundColor: '#F5F5F5',
  },
  iconContainerDanger: {
    backgroundColor: '#FEE2E2',
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
  },
  disabledText: {
    color: '#CCC',
  },
  dangerText: {
    color: '#EF4444',
  },
  footer: {
    marginTop: 40,
    marginBottom: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#8E8E93',
  },
});

export default SettingsScreen;