// screens/CourierMainScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  RefreshControl,
  Switch
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Geolocation from '@react-native-community/geolocation';
import BackgroundGeolocation from 'react-native-background-geolocation';
import axios from 'axios';
import { MMKV } from 'react-native-mmkv';
import { observer } from 'mobx-react-lite';
import { useStores } from '../useStores';

const API_URL = 'https://api.koleso.app/api';
const storage = new MMKV();

const CourierMainScreen = observer(({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { authStore } = useStores();
  
  // States
  const [courierId, setCourierId] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);

  useEffect(() => {
    StatusBar.setBarStyle('light-content', true);
    loadCourierData();
    configureBackgroundGeolocation();
  }, []);

  const loadCourierData = async () => {
    try {
      // Получаем ID курьера из MMKV
      const courierProfile = authStore.courierProfile;
      if (courierProfile && courierProfile.id) {
        setCourierId(courierProfile.id);
        await loadOrders(courierProfile.id);
      } else {
        // Если нет профиля курьера, отправляем на экран авторизации
        navigation.replace('Auth');
      }
    } catch (error) {
      console.error('Error loading courier data:', error);
    } finally {
      setLoading(false);
    }
  };

  const configureBackgroundGeolocation = async () => {
    try {
      // Конфигурация для отслеживания местоположения в фоне
      BackgroundGeolocation.configure({
        desiredAccuracy: BackgroundGeolocation.HIGH_ACCURACY,
        stationaryRadius: 50,
        distanceFilter: 50,
        notificationTitle: 'Koleso Доставка',
        notificationText: 'Отслеживание местоположения активно',
        debug: false,
        startOnBoot: false,
        stopOnTerminate: true,
        locationProvider: BackgroundGeolocation.ACTIVITY_PROVIDER,
        interval: 10000,
        fastestInterval: 5000,
        activitiesInterval: 10000,
        stopOnStillActivity: false,
      });

      BackgroundGeolocation.on('location', (location) => {
        // Отправляем местоположение на сервер
        updateCourierLocation(location);
      });

      BackgroundGeolocation.on('error', (error) => {
        console.warn('[ERROR] BackgroundGeolocation error:', error);
      });

      BackgroundGeolocation.on('authorization', (status) => {
        setLocationEnabled(status === BackgroundGeolocation.AUTHORIZED);
      });

      // Проверяем разрешения
      const status = await BackgroundGeolocation.checkStatus();
      setLocationEnabled(status.isRunning);
    } catch (error) {
      console.error('Error configuring background geolocation:', error);
    }
  };

  const updateCourierLocation = async (location) => {
    if (!courierId || !isOnline) return;

    try {
      await axios.post(
        `${API_URL}/courier/update-location`,
        {
          courier_id: courierId,
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            'Authorization': `Bearer ${authStore.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const toggleOnlineStatus = async (value) => {
    setIsOnline(value);
    
    if (value) {
      // Включаем отслеживание местоположения
      BackgroundGeolocation.start();
      // Сохраняем статус в MMKV
      storage.set('courier_online_status', true);
    } else {
      // Выключаем отслеживание
      BackgroundGeolocation.stop();
      storage.set('courier_online_status', false);
    }

    // Обновляем статус на сервере
    try {
      await axios.post(
        `${API_URL}/courier/update-status`,
        {
          courier_id: courierId,
          is_online: value,
        },
        {
          headers: {
            'Authorization': `Bearer ${authStore.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  const loadOrders = async (id) => {
    try {
      const response = await axios.get(
        `${API_URL}/courier/available-orders`,
        {
          headers: {
            'Authorization': `Bearer ${authStore.token}`,
          },
          params: {
            courier_id: id,
          },
        }
      );

      if (response.data.success) {
        setOrders(response.data.orders || []);
        
        // Проверяем активный заказ
        const active = response.data.orders.find(order => 
          order.status === 'assigned' || order.status === 'on_way'
        );
        setActiveOrder(active);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить заказы');
    }
  };

  const acceptOrder = async (order) => {
    try {
      const response = await axios.post(
        `${API_URL}/courier/accept-order`,
        {
          courier_id: courierId,
          order_id: order.id,
        },
        {
          headers: {
            'Authorization': `Bearer ${authStore.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        setActiveOrder(order);
        navigation.navigate('CourierDelivery', { order });
      } else {
        Alert.alert('Ошибка', response.data.message || 'Не удалось принять заказ');
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      Alert.alert('Ошибка', 'Не удалось принять заказ');
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadOrders(courierId);
    setRefreshing(false);
  }, [courierId]);

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => navigation.navigate('CourierOrderDetails', { order: item })}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>Заказ №{item.id}</Text>
        <Text style={styles.orderPrice}>{item.deliveryPrice} ₽</Text>
      </View>
      
      <View style={styles.orderInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.infoText} numberOfLines={2}>
            {item.address}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {item.estimatedTime} мин
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <MaterialIcons name="route" size={16} color="#666" />
          <Text style={styles.infoText}>
            {item.distance} км
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.acceptButton}
        onPress={() => acceptOrder(item)}
      >
        <Text style={styles.acceptButtonText}>Принять заказ</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#006363" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Доступные заказы</Text>
        
        <View style={styles.onlineToggle}>
          <Text style={styles.onlineText}>
            {isOnline ? 'В сети' : 'Не в сети'}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={toggleOnlineStatus}
            trackColor={{ false: '#ccc', true: '#4CAF50' }}
            thumbColor={isOnline ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Active Order Banner */}
      {activeOrder && (
        <TouchableOpacity 
          style={styles.activeOrderBanner}
          onPress={() => navigation.navigate('CourierDelivery', { order: activeOrder })}
        >
          <MaterialIcons name="local-shipping" size={24} color="#fff" />
          <View style={styles.activeOrderInfo}>
            <Text style={styles.activeOrderText}>Активная доставка</Text>
            <Text style={styles.activeOrderId}>Заказ №{activeOrder.id}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Orders List */}
      {!activeOrder && isOnline ? (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#006363']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inbox" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Нет доступных заказов</Text>
              <Text style={styles.emptySubtext}>Потяните вниз для обновления</Text>
            </View>
          }
        />
      ) : !isOnline ? (
        <View style={styles.offlineContainer}>
          <MaterialIcons name="wifi-off" size={64} color="#ccc" />
          <Text style={styles.offlineText}>Вы не в сети</Text>
          <Text style={styles.offlineSubtext}>
            Включите статус "В сети", чтобы получать заказы
          </Text>
        </View>
      ) : null}

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="list" size={24} color="#006363" />
          <Text style={styles.navText}>Заказы</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('CourierProfile')}
        >
          <Ionicons name="person" size={24} color="#006363" />
          <Text style={styles.navText}>Профиль</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#006363',
    paddingHorizontal: 20,
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineText: {
    color: '#fff',
    marginRight: 10,
    fontSize: 14,
  },
  activeOrderBanner: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    margin: 15,
    borderRadius: 12,
  },
  activeOrderInfo: {
    flex: 1,
    marginLeft: 10,
  },
  activeOrderText: {
    color: '#fff',
    fontSize: 12,
  },
  activeOrderId: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 15,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  orderPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#006363',
  },
  orderInfo: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  acceptButton: {
    backgroundColor: '#006363',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  offlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
  },
  offlineSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  bottomNav: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navText: {
    fontSize: 12,
    color: '#006363',
    marginTop: 4,
  },
});

export default CourierMainScreen;