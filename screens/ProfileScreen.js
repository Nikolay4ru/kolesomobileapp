import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Alert, TouchableOpacity, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from "@react-navigation/native";
import { observer } from "mobx-react-lite";
import { authStore } from "../stores/AuthStore";
import ReactNativeBiometrics from 'react-native-biometrics';
import Keychain from 'react-native-keychain';

const rnBiometrics = new ReactNativeBiometrics();

const ProfileScreen = observer(() => {
  const insets = useSafeAreaInsets();
  const statusBarHeight = insets.top;
  const bottomInsets = insets.bottom; // Получаем отступ снизу
  const navigation = useNavigation();
  const [adminMode, setAdminMode] = useState(false);
  const [biometryType, setBiometryType] = useState(null);

  // Проверяем доступность биометрии при монтировании компонента
  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    try {
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      if (available) {
        setBiometryType(biometryType);
      }
    } catch (error) {
      console.log('Biometrics check error:', error);
    }
  };

  const handleAuthPress = () => {
    navigation.navigate('Auth');
  };

  const handleEditProfilePress = () => {
    navigation.navigate('EditProfile');
  };

  const handleOrdersPress = () => {
    if (!authStore.isLoggedIn) {
      navigation.navigate('Auth');
      return;
    }
    navigation.navigate('Orders');
  };

  const handleAdminOrdersPress = () => {
    if (!authStore.isLoggedIn) {
      navigation.navigate('Auth');
      return;
    }
    navigation.navigate('Admin', { screen: 'AdminOrders' });
  };

  const authenticateWithDeviceCredentials = async () => {
    try {
      // Сохраняем временные данные (если их нет)
      const options = {
        accessControl: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE, // Требует пароль/PIN/графический ключ
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
        authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE,
        securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE, // На случай, если биометрия недоступна
      };

      // Пытаемся прочитать данные (если они есть)
      const credentials = await Keychain.getGenericPassword(options);
      
      if (credentials) {
        return true; // Аутентификация успешна
      }

      // Если данных нет, сохраняем временные данные, чтобы вызвать системный запрос
      await Keychain.setGenericPassword(
        'auth_temp_username',
        'auth_temp_password',
        options
      );

      // Теперь запрашиваем их, чтобы вызвать системную аутентификацию
      const result = await Keychain.getGenericPassword(options);
      
      // Удаляем временные данные
      await Keychain.resetGenericPassword();

      return result !== false;
    } catch (error) {
      console.log('Device credentials auth error:', error);
      return false;
    }
  };

  const authenticateWithBiometrics = async () => {
    try {
      // Сначала проверяем доступность биометрии
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      
      if (!available) {
        // Если биометрия недоступна, запрашиваем системные учетные данные
        const authenticated = await authenticateWithDeviceCredentials();
        if (authenticated) {
          setAdminMode(!adminMode);
        } else {
          setAdminMode(!adminMode);
        }
        return;
      }

      // Если биометрия доступна, запрашиваем аутентификацию
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: 'Аутентификация для доступа к админ-панели',
        cancelButtonText: 'Отмена',
      });

      if (success) {
        setAdminMode(!adminMode);
      } else {
        Alert.alert('Ошибка', 'Аутентификация не удалась');
      }
    } catch (error) {
      console.log('Auth error:', error);
      Alert.alert('Ошибка', 'Не удалось выполнить аутентификацию');
    }
  };

  const toggleAdminMode = () => {
    if (authStore.isAdmin) {
      // На Android всегда требуем аутентификацию (биометрию или системные учетные данные)
      if (Platform.OS === 'android') {
        authenticateWithBiometrics();
      } else {
        // На iOS используем биометрию при первом включении
        if (biometryType && !adminMode) {
          authenticateWithBiometrics();
        } else {
          setAdminMode(!adminMode);
        }
      }
    }
  };

  const getUserName = () => {
    if (!authStore.user) return "Гость";
    
    const { firstName, lastName } = authStore.user;
    if (firstName && lastName) return `${firstName} ${lastName.charAt(0)}.`;
    if (firstName) return firstName;
    if (lastName) return lastName;
    
    return authStore.user.phone || "Пользователь";
  };

  const getInitials = () => {
    if (!authStore.user) return "Г";
    
    const { firstName, lastName } = authStore.user;
    if (firstName && lastName) return `${firstName.charAt(0)}${lastName.charAt(0)}`;
    if (firstName) return firstName.charAt(0);
    if (lastName) return lastName.charAt(0);
    
    return "П";
  };

  return (
    <View style={[styles.container, { paddingTop: statusBarHeight }]}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { 
            paddingBottom: Math.max(bottomInsets, 20) + 60 // 60px для TabBar + отступ для безопасной зоны
          }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Профиль</Text>
          {authStore.isAdmin && (
            <TouchableOpacity 
              style={[styles.adminToggle, adminMode && styles.adminToggleActive]}
              onPress={toggleAdminMode}
            >
              <Icon 
                name={adminMode ? "admin-panel-settings" : "visibility"} 
                size={20} 
                color={adminMode ? "#4A9B8E" : "#4A9B8E"} 
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
            {authStore.isLoggedIn && (
              <View style={styles.onlineIndicator} />
            )}
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{getUserName()}</Text>
            {authStore.isLoggedIn ? (
              <View style={styles.profileDetails}>
                
                {authStore.isAdmin && (
                  <View style={[styles.statusBadge, styles.adminBadge]}>
                    <Icon name="admin-panel-settings" size={16} color="#FF9500" />
                    <Text style={[styles.statusText, styles.adminText]}>Администратор</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.guestText}>Войдите для доступа ко всем функциям</Text>
            )}
          </View>

          {authStore.isLoggedIn ? (
            <TouchableOpacity 
              style={styles.editButton}
              onPress={handleEditProfilePress}
            >
              <Icon name="edit" size={20} color="#4A9B8E" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={handleAuthPress}
            >
              <Text style={styles.loginButtonText}>Войти</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Menu Sections */}
        {authStore.isLoggedIn && (
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Мои данные</Text>
            <View style={styles.menuCard}>
              <MenuItem 
                icon="shopping-bag" 
                title="Заказы" 
                subtitle="История покупок"
                onPress={handleOrdersPress}
              />
              <MenuItem 
                icon="shopping-cart" 
                title="Купленные товары" 
                subtitle="Мои покупки"
              />
              <MenuItem 
                icon="handyman" 
                title="Записи на услуги" 
                subtitle="Активные записи"
              />
              <MenuItem 
                icon="local-offer" 
                title="Хранения" 
                subtitle="Мои хранения"
                onPress={() => {
                  if (!authStore.isLoggedIn) {
                    navigation.navigate('Auth');
                    return;
                  }
                  navigation.navigate('Storages');
                }}
              />
               <MenuItem 
                icon="local-offer" 
                title="Гараж" 
                subtitle="Мои автомобили"
                onPress={() => {
                  if (!authStore.isLoggedIn) {
                    navigation.navigate('Auth');
                    return;
                  }
                  navigation.navigate('Garage');
                }}
              />
              <MenuItem 
                icon="favorite" 
                title="Избранное" 
                subtitle="Понравившиеся товары"
                isLast
              />
            </View>
          </View>
        )}

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Общее</Text>
          <View style={styles.menuCard}>
            <MenuItem 
              icon="wallet-giftcard" 
              title="Промокоды" 
              subtitle="Скидки и акции"
            />
            <MenuItem 
              icon="place" 
              title="Магазины" 
              subtitle="Найти ближайший"
            />
            <MenuItem 
              icon="settings" 
              title="Настройки" 
              subtitle="Параметры приложения"
              onPress={() => {
                  if (!authStore.isLoggedIn) {
                    navigation.navigate('Auth');
                    return;
                  }
                  navigation.navigate('Settings');
                }}
              isLast
            />
          </View>
        </View>

        {/* Admin Section */}
        {authStore.isAdmin && adminMode && (
          <View style={styles.menuSection}>
            <Text style={[styles.sectionTitle, styles.adminSectionTitle]}>
              <Icon name="admin-panel-settings" size={16} color="#FF9500" style={{ marginRight: 8 }} />
              Администрирование
            </Text>
            <View style={[styles.menuCard, styles.adminMenuCard]}>
              <MenuItem 
                icon="assignment" 
                title="Заказы магазина" 
                subtitle="Управление заказами"
                onPress={handleAdminOrdersPress}
                isAdmin
              />
              <MenuItem 
                icon="qr-code-scanner" 
                title="Сканер товаров" 
                subtitle="Сканирование QR-кодов"
                onPress={() => navigation.navigate('ScanProducts')}
                isAdmin
              />
              {authStore.admin.storeId === 8 && (
                <MenuItem 
                  icon="video-library" 
                  title="Загрузка видео" 
                  subtitle="Управление контентом"
                  onPress={() => navigation.navigate('Admin', { screen: 'VideoUpload' })}
                  isAdmin
                  isLast
                />
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
});

const MenuItem = ({ icon, title, subtitle, onPress, isAdmin = false, isLast = false }) => (
  <TouchableOpacity 
    style={[
      styles.menuItem, 
      isLast && styles.menuItemLast,
      isAdmin && styles.adminMenuItem
    ]} 
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.menuItemLeft}>
      <View style={[styles.menuIconContainer, isAdmin && styles.adminIconContainer]}>
        <Icon 
          name={icon} 
          size={22} 
          color={isAdmin ? "#FF9500" : "#4A9B8E"} 
        />
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={[styles.menuItemTitle, isAdmin && styles.adminMenuItemTitle]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.menuItemSubtitle}>{subtitle}</Text>
        )}
      </View>
    </View>
    <Icon name="chevron-right" size={20} color="#C7C7CC" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // Убираем статичный paddingBottom, теперь он динамический
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  adminToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E6FFF9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4A9B8E',
  },
  adminToggleActive: {
    backgroundColor: '#E6FFF9',
    borderColor: '#4A9B8E',
  },
  profileCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4A9B8E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#34C759',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  profileDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FFF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminBadge: {
    backgroundColor: '#FFF8F0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#34C759',
    marginLeft: 4,
  },
  adminText: {
    color: '#FF9500',
  },
  guestText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E6FFF9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  menuSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  adminSectionTitle: {
    color: '#FF9500',
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuCard: {
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
  adminMenuCard: {
    borderWidth: 1,
    borderColor: '#FFE5CC',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  adminMenuItem: {
    backgroundColor: 'rgba(255, 149, 0, 0.02)',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6FFF9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  adminIconContainer: {
    backgroundColor: '#FFF8F0',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  adminMenuItemTitle: {
    color: '#FF9500',
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
  },
});

export default ProfileScreen;