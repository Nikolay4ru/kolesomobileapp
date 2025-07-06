import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Alert, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from "@react-navigation/native";
import { observer } from "mobx-react-lite";
import { useStores } from "../useStores";
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import ReactNativeBiometrics from 'react-native-biometrics';
import Keychain from 'react-native-keychain';

const rnBiometrics = new ReactNativeBiometrics();

const ProfileScreen = observer(() => {
  const insets = useSafeAreaInsets();
  const bottomInsets = insets.bottom;
  const navigation = useNavigation();
  const { authStore } = useStores();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  
  const [adminMode, setAdminMode] = useState(false);
  const [biometryType, setBiometryType] = useState(null);
console.log(authStore);
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

  const handleEmployeeDashboardPress = () => {
    navigation.navigate('EmployeeDashboard');
  };


  const authenticateWithDeviceCredentials = async () => {
    try {
      const options = {
        accessControl: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
        authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE,
        securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
      };

      const credentials = await Keychain.getGenericPassword(options);
      
      if (credentials) {
        return true;
      }

      await Keychain.setGenericPassword(
        'auth_temp_username',
        'auth_temp_password',
        options
      );

      const result = await Keychain.getGenericPassword(options);
      
      await Keychain.resetGenericPassword();

      return result !== false;
    } catch (error) {
      console.log('Device credentials auth error:', error);
      return false;
    }
  };

  const authenticateWithBiometrics = async () => {
    try {
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      
      if (!available) {
        const authenticated = await authenticateWithDeviceCredentials();
        if (authenticated) {
          setAdminMode(!adminMode);
        } else {
          setAdminMode(!adminMode);
        }
        return;
      }

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
      if (Platform.OS === 'android') {
        authenticateWithBiometrics();
      } else {
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

  const getRoleBadge = () => {
    if (!authStore.isAdmin) return null;
    
    const role = authStore.admin?.role;
    const configs = {
      director: { label: 'Директор', icon: 'business', color: colors.error },
      manager: { label: 'Менеджер', icon: 'supervisor-account', color: colors.info },
      admin: { label: 'Администратор', icon: 'admin-panel-settings', color: colors.warning }
    };
    
    const config = configs[role] || configs.admin;
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: config.color + '15' }]}>
        <Icon name={config.icon} size={16} color={config.color} />
        <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
      </View>
    );
  };

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
            color={isAdmin ? colors.warning : colors.primary} 
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
      <Icon name="chevron-right" size={20} color={colors.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar 
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { 
            paddingBottom: Math.max(bottomInsets, 20) + 60
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
                color={colors.primary} 
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
                {getRoleBadge()}
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
              <Icon name="edit" size={20} color={colors.primary} />
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



        {/* Employee Quick Access - показываем всегда для сотрудников */}
        {authStore.isLoggedIn && authStore.canAccessEmployeeDashboard && (
          <TouchableOpacity 
            style={styles.employeeDashboardCard}
            onPress={handleEmployeeDashboardPress}
          >
            <View style={styles.dashboardCardContent}>
              <View style={styles.dashboardIconContainer}>
                <Icon name="dashboard" size={32} color={colors.primary} />
              </View>
              <View style={styles.dashboardInfo}>
                <Text style={styles.dashboardTitle}>Панель сотрудника</Text>
                <Text style={styles.dashboardSubtitle}>
                  Быстрый доступ к заказам и статистике
                </Text>
              </View>
              <Icon name="arrow-forward" size={24} color={colors.primary} />
            </View>
          </TouchableOpacity>
        )}

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
                icon="directions-car" 
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


        {/* Courier Section */}
{authStore.user?.userType === 'courier' && (
  <View style={styles.menuSection}>
    <Text style={[styles.sectionTitle, styles.courierSectionTitle]}>
      <Icon name="local-shipping" size={16} color="#006363" style={{ marginRight: 8 }} />
      Курьерская служба
    </Text>
    <View style={[styles.menuCard, styles.courierMenuCard]}>
      <MenuItem 
        icon="list-alt" 
        title="Доступные заказы" 
        subtitle="Просмотр и принятие заказов"
        onPress={() => navigation.navigate('CourierMain')}
        isCourier
      />
      <MenuItem 
        icon="delivery-dining" 
        title="Активная доставка" 
        subtitle="Текущий заказ"
        onPress={() => {
          // Проверяем есть ли активный заказ
          if (authStore.courierProfile?.activeOrderId) {
            navigation.navigate('CourierDelivery', { 
              orderId: authStore.courierProfile.activeOrderId 
            });
          } else {
            Alert.alert('Нет активной доставки', 'У вас нет активных заказов');
          }
        }}
        isCourier
      />
      <MenuItem 
        icon="bar-chart" 
        title="Статистика" 
        subtitle="Ваши показатели"
        onPress={() => navigation.navigate('CourierProfile')}
        isCourier
      />
      <MenuItem 
        icon="schedule" 
        title="История доставок" 
        subtitle="Выполненные заказы"
        onPress={() => navigation.navigate('Orders', { courierMode: true })}
        isCourier
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
              onPress={() => navigation.navigate('StoresMap')}
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
            <View style={styles.adminSectionHeader}>
              <Icon name="admin-panel-settings" size={20} color={colors.warning} />
              <Text style={styles.adminSectionTitle}>Администрирование</Text>
            </View>
            <View style={styles.adminMenuCard}>
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
                onPress={() => navigation.navigate('Admin', { screen: 'ScanProducts' })}
                isAdmin
              />
              {authStore.admin?.storeId === 8 && (
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

const themedStyles = (colors, theme) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // paddingBottom динамический
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
    color: colors.text,
  },
  adminToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  adminToggleActive: {
    backgroundColor: colors.primary + '25',
    borderColor: colors.primary,
  },
  profileCard: {
    backgroundColor: colors.card,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme === 'dark' ? 0.3 : 0.1,
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
    backgroundColor: colors.primary,
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
    backgroundColor: colors.success,
    borderWidth: 3,
    borderColor: colors.card,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
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
    backgroundColor: colors.success + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminBadge: {
    backgroundColor: colors.warning + '15',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.success,
    marginLeft: 4,
  },
  adminText: {
    color: colors.warning,
  },
  guestText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: colors.primary,
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
    color: colors.text,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  adminSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  adminSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.warning,
  },
  menuCard: {
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
  adminMenuCard: {
    backgroundColor: colors.card,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  adminMenuItem: {
    backgroundColor: colors.warning + '05',
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
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  adminIconContainer: {
    backgroundColor: colors.warning + '15',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  adminMenuItemTitle: {
    color: colors.warning,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
   employeeDashboardCard: {
    backgroundColor: colors.primary + '10',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  dashboardCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dashboardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dashboardInfo: {
    flex: 1,
  },
  dashboardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  dashboardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});

export default ProfileScreen;