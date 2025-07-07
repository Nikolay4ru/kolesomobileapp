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
  Switch,
  AppState,
  PermissionsAndroid
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Geolocation from '@react-native-community/geolocation';
import BackgroundActions from 'react-native-background-actions';
import axios from 'axios';
import { MMKV } from 'react-native-mmkv';
import { observer } from 'mobx-react-lite';
import { useStores } from '../useStores';

const API_URL = 'https://api.koleso.app/api';
const storage = new MMKV();

// Конфигурация для фонового сервиса
const locationTaskOptions = {
  taskName: 'Отслеживание местоположения',
  taskTitle: 'Koleso Курьер',
  taskDesc: 'Отслеживание местоположения включено',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  color: '#006363',
  linkingURI: 'koleso://courier',
  parameters: {
    delay: 10000, // 10 секунд
  },
};

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
  
  // Refs
  const appStateRef = useRef(AppState.currentState);
  const locationWatchId = useRef(null);

  useEffect(() => {
    StatusBar.setBarStyle('light-content', true);
    loadCourierData();
    setupLocationPermissions();
    
    // Слушаем изменения состояния приложения
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
      stopLocationTracking();
    };
  }, []);

  const handleAppStateChange = (nextAppState) => {
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      // Приложение вернулось в активное состояние
      if (isOnline) {
        startLocationTracking();
      }
    }
    appStateRef.current = nextAppState;
  };

  const loadCourierData = async () => {
    try {
      // Получаем профиль курьера
      const response = await axios.get(`${API_URL}/courier/profile`, {
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      });

      if (response.data.success) {
        const courierData = response.data.courier;
        setCourierId(courierData.id);
        setIsOnline(courierData.is_online);
        authStore.saveCourierProfile(courierData);
        
        // Если курьер онлайн, запускаем отслеживание
        if (courierData.is_online) {
          await startLocationTracking();
        }
        
        // Загружаем заказы
        await loadOrders();
      } else {
        navigation.replace('Auth');
      }
    } catch (error) {
      console.error('Error loading courier data:', error);
      navigation.replace('Auth');
    } finally {
      setLoading(false);
    }
  };

  const setupLocationPermissions = async () => {
    try {
      if (Platform.OS === 'ios') {
        Geolocation.requestAuthorization(
          () => {
            // Успешно получили разрешение
            console.log('Location permission granted');
            setLocationEnabled(true);
          },
          (error) => {
            // Ошибка получения разрешения
            console.error('Location permission denied:', error);
            Alert.alert(
              'Разрешение на геолокацию',
              'Для работы курьером необходимо разрешить доступ к местоположению',
              [{ text: 'OK' }]
            );
          }
        );
      } else {
        // Для Android проверяем разрешения через PermissionsAndroid
        const { PermissionsAndroid } = require('react-native');
        
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Разрешение на геолокацию',
            message: 'Приложению необходим доступ к вашему местоположению для отслеживания доставки',
            buttonNeutral: 'Позже',
            buttonNegative: 'Отмена',
            buttonPositive: 'OK',
          }
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Location permission granted');
          setLocationEnabled(true);
        } else {
          console.log('Location permission denied');
          Alert.alert(
            'Разрешение на геолокацию',
            'Для работы курьером необходимо разрешить доступ к местоположению',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  // Фоновая задача для отслеживания местоположения
  const locationTask = async (taskDataArguments) => {
    await new Promise(async (resolve) => {
      const { delay } = taskDataArguments;
      
      const intervalId = setInterval(async () => {
        if (BackgroundActions.isRunning()) {
          Geolocation.getCurrentPosition(
            async (position) => {
              await updateLocationOnServer({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                speed: position.coords.speed,
                heading: position.coords.heading,
                accuracy: position.coords.accuracy,
              });
            },
            (error) => console.error('Background location error:', error),
            { 
              enableHighAccuracy: true, 
              timeout: 20000, 
              maximumAge: 0 
            }
          );
        }
      }, delay);
      
      // Сохраняем ID интервала для последующей очистки
      storage.set('locationIntervalId', intervalId);
    });
  };

  const startLocationTracking = async () => {
    try {
      // Запускаем отслеживание в foreground
      locationWatchId.current = Geolocation.watchPosition(
        async (position) => {
          await updateLocationOnServer({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speed: position.coords.speed,
            heading: position.coords.heading,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => console.error('Location error:', error),
        { 
          enableHighAccuracy: true,
          distanceFilter: 50, // Обновление каждые 50 метров
          interval: 10000, // Обновление каждые 10 секунд
          fastestInterval: 5000
        }
      );

      // Запускаем фоновую задачу
      if (Platform.OS === 'android') {
        await BackgroundActions.start(locationTask, locationTaskOptions);
      }
      
      console.log('Location tracking started');
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  const stopLocationTracking = async () => {
    try {
      // Останавливаем foreground отслеживание
      if (locationWatchId.current !== null) {
        Geolocation.clearWatch(locationWatchId.current);
        locationWatchId.current = null;
      }
      
      // Останавливаем фоновую задачу
      if (Platform.OS === 'android' && BackgroundActions.isRunning()) {
        await BackgroundActions.stop();
      }
      
      console.log('Location tracking stopped');
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  };

  const updateLocationOnServer = async (location) => {
    try {
      const orderId = activeOrder?.id;
      await axios.post(
        `${API_URL}/courier/location`,
        {
          latitude: location.latitude,
          longitude: location.longitude,
          speed: location.speed,
          heading: location.heading,
          accuracy: location.accuracy,
          order_id: orderId
        },
        {
          headers: {
            'Authorization': `Bearer ${authStore.token}`,
            'Content-Type': 'application/json',
          }
        }
      );
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const toggleOnlineStatus = async (value) => {
    setIsOnline(value);
    
    if (value) {
      // Включаем отслеживание
      await startLocationTracking();
      storage.set('courier_online_status', true);
    } else {
      // Выключаем отслеживание
      await stopLocationTracking();
      storage.set('courier_online_status', false);
    }

    // Обновляем статус на сервере
    try {
      await axios.post(
        `${API_URL}/courier/status`,
        {
          is_online: value,
        },
        {
          headers: {
            'Authorization': `Bearer ${authStore.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      // Обновляем профиль в store
      authStore.updateCourierOnlineStatus(value);
    } catch (error) {
      console.error('Error updating online status:', error);
      // Откатываем изменения
      setIsOnline(!value);
      await stopLocationTracking();
    }
  };

  const loadOrders = async () => {
    try {
      // Загружаем доступные заказы
      const response = await axios.get(
        `${API_URL}/courier/orders`,
        {
          headers: {
            'Authorization': `Bearer ${authStore.token}`,
          }
        }
      );

      if (response.data.success) {
        setOrders(response.data.orders || []);
      }

      // Загружаем активный заказ
      const activeResponse = await axios.get(
        `${API_URL}/courier/orders/active`,
        {
          headers: {
            'Authorization': `Bearer ${authStore.token}`,
          }
        }
      );

      if (activeResponse.data.success && activeResponse.data.order) {
        setActiveOrder(activeResponse.data.order);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить заказы');
    }
  };

  const acceptOrder = async (order) => {
    try {
      const response = await axios.post(
        `${API_URL}/courier/order/${order.id}/accept`,
        {},
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('CourierOrderDetails', { order: item })}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>Заказ №{item.order_number}</Text>
        <Text style={styles.orderPrice}>{item.delivery_price} ₽</Text>
      </View>
      
      <View style={styles.orderInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{item.delivery_address}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <MaterialIcons name="route" size={16} color="#666" />
          <Text style={styles.infoText}>
            {item.distance} км • ~{item.estimated_time} мин
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {item.payment_method === 'cash' ? 'Наличные' : 'Безналичная оплата'}
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
        <Text style={styles.headerTitle}>Курьерская доставка</Text>
        <View style={styles.onlineToggle}>
          <Text style={styles.onlineText}>
            {isOnline ? 'В сети' : 'Не в сети'}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={toggleOnlineStatus}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isOnline ? '#006363' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Active Order Banner */}
      {activeOrder && (
        <TouchableOpacity
          style={styles.activeOrderBanner}
          onPress={() => navigation.navigate('CourierDelivery', { order: activeOrder })}
        >
          <MaterialIcons name="delivery-dining" size={24} color="#fff" />
          <View style={styles.activeOrderInfo}>
            <Text style={styles.activeOrderText}>Активная доставка</Text>
            <Text style={styles.activeOrderId}>Заказ №{activeOrder.order_number}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Orders List */}
      <FlatList
        data={isOnline ? orders : []}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListEmptyComponent={
          isOnline ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inbox" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Нет доступных заказов</Text>
              <Text style={styles.emptySubtext}>
                Новые заказы появятся здесь
              </Text>
            </View>
          ) : (
            <View style={styles.offlineContainer}>
              <MaterialIcons name="wifi-off" size={64} color="#ccc" />
              <Text style={styles.offlineText}>Вы не в сети</Text>
              <Text style={styles.offlineSubtext}>
                Включите статус "В сети", чтобы получать заказы
              </Text>
            </View>
          )
        }
      />

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