// screens/CourierProfileScreen.js
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
  Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useStores } from '../useStores';

const CourierProfileScreen = observer(() => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { authStore } = useStores();
  
  const [isOnline, setIsOnline] = useState(authStore.courierProfile?.isOnline || false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleOnlineToggle = async (value) => {
    setIsOnline(value);
    try {
      await authStore.updateCourierOnlineStatus(value);
    } catch (error) {
      setIsOnline(!value);
      Alert.alert('Ошибка', 'Не удалось изменить статус');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            await authStore.logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Auth' }],
            });
          }
        }
      ]
    );
  };

  const MenuItem = ({ icon, title, subtitle, rightComponent, onPress, isDanger = false }) => (
    <TouchableOpacity 
      style={styles.menuItem} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIconContainer, isDanger && styles.dangerIconContainer]}>
          <Ionicons name={icon} size={22} color={isDanger ? '#FF3B30' : '#006363'} />
        </View>
        <View style={styles.menuItemContent}>
          <Text style={[styles.menuItemTitle, isDanger && styles.dangerText]}>{title}</Text>
          {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightComponent || <Ionicons name="chevron-forward" size={20} color="#C4C4C6" />}
    </TouchableOpacity>
  );

  const courierProfile = authStore.courierProfile;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Профиль курьера</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {courierProfile?.name ? courierProfile.name.charAt(0).toUpperCase() : 'К'}
              </Text>
            </View>
            <View style={[styles.statusIndicator, isOnline ? styles.online : styles.offline]} />
          </View>
          
          <Text style={styles.profileName}>{courierProfile?.name || 'Курьер'}</Text>
          <Text style={styles.profilePhone}>{courierProfile?.phone}</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{courierProfile?.completedOrders || 0}</Text>
              <Text style={styles.statLabel}>Доставок</Text>
            </View>
            <View style={[styles.statItem, styles.statItemBorder]}>
              <View style={styles.ratingContainer}>
                <Text style={styles.statValue}>{courierProfile?.rating || '5.0'}</Text>
                <Ionicons name="star" size={16} color="#FFD700" />
              </View>
              <Text style={styles.statLabel}>Рейтинг</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {courierProfile?.vehicleType === 'car' ? '🚗' : 
                 courierProfile?.vehicleType === 'bike' ? '🚴' : '🚶'}
              </Text>
              <Text style={styles.statLabel}>Транспорт</Text>
            </View>
          </View>
        </View>

        {/* Online Status */}
        <View style={styles.section}>
          <View style={styles.onlineStatusCard}>
            <View style={styles.onlineStatusLeft}>
              <MaterialIcons 
                name="wifi-tethering" 
                size={24} 
                color={isOnline ? '#4CAF50' : '#999'} 
              />
              <View style={styles.onlineStatusContent}>
                <Text style={styles.onlineStatusTitle}>
                  {isOnline ? 'Вы в сети' : 'Вы не в сети'}
                </Text>
                <Text style={styles.onlineStatusSubtitle}>
                  {isOnline ? 'Готовы принимать заказы' : 'Заказы не поступают'}
                </Text>
              </View>
            </View>
            <Switch
              value={isOnline}
              onValueChange={handleOnlineToggle}
              trackColor={{ false: '#ccc', true: '#4CAF50' }}
              thumbColor={isOnline ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Vehicle Info */}
        {courierProfile?.vehicleModel && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Транспорт</Text>
            <View style={styles.vehicleCard}>
              <MaterialIcons name="directions-car" size={24} color="#006363" />
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleModel}>{courierProfile.vehicleModel}</Text>
                <Text style={styles.vehicleNumber}>{courierProfile.vehicleNumber}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Настройки</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="notifications-outline"
              title="Уведомления"
              subtitle={notificationsEnabled ? 'Включены' : 'Выключены'}
              rightComponent={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#ccc', true: '#006363' }}
                  thumbColor="#fff"
                />
              }
            />
            <MenuItem
              icon="volume-high-outline"
              title="Звук уведомлений"
              subtitle={soundEnabled ? 'Включен' : 'Выключен'}
              rightComponent={
                <Switch
                  value={soundEnabled}
                  onValueChange={setSoundEnabled}
                  trackColor={{ false: '#ccc', true: '#006363' }}
                  thumbColor="#fff"
                />
              }
            />
            <MenuItem
              icon="car-outline"
              title="Изменить транспорт"
              onPress={() => Alert.alert('В разработке', 'Функция будет доступна в следующем обновлении')}
            />
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Поддержка</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="help-circle-outline"
              title="Помощь"
              onPress={() => Alert.alert('Поддержка', 'Телефон: +7 (999) 123-45-67')}
            />
            <MenuItem
              icon="document-text-outline"
              title="Правила работы"
              onPress={() => {}}
            />
            <MenuItem
              icon="information-circle-outline"
              title="О приложении"
              subtitle="Версия 1.0.0"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="exit-outline" size={22} color="#FF3B30" />
            <Text style={styles.logoutText}>Выйти</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  profileCard: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#006363',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#fff',
  },
  online: {
    backgroundColor: '#4CAF50',
  },
  offline: {
    backgroundColor: '#999',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  profilePhone: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statItemBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#f0f0f0',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  onlineStatusCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  onlineStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  onlineStatusContent: {
    marginLeft: 15,
  },
  onlineStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  onlineStatusSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  vehicleCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleInfo: {
    marginLeft: 15,
  },
  vehicleModel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  vehicleNumber: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  menuCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerIconContainer: {
    backgroundColor: '#FFE5E5',
  },
  menuItemContent: {
    marginLeft: 12,
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    color: '#333',
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  dangerText: {
    color: '#FF3B30',
  },
  logoutButton: {
    backgroundColor: '#FFE5E5',
    marginHorizontal: 20,
    marginBottom: 30,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 8,
  },
});

export default CourierProfileScreen;