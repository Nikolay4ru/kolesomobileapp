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
import RNLocation from 'react-native-location';
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
  
  // Refs
  const appStateRef = useRef(AppState.currentState);
  const locationSubscription = useRef(null);

  useEffect(() => {
    StatusBar.setBarStyle('light-content', true);
    loadCourierData();
    configureLocation();
    
    // Слушаем изменения состояния приложения
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
      stopLocationTracking();
    };
  }, []);

  const handleAppStateChange = (nextAppState) => {
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

  const configureLocation = async () => {
    // Настройка RNLocation
    RNLocation.configure({
      distanceFilter: 30, // Обновление каждые 30 метров
      desiredAccuracy: {
        ios: "best",
        android: "highAccuracy"
      },
      androidProvider: "auto",
      interval: 10000, // Обновление каждые 10 секунд
      fastestInterval: 5000, // Но не чаще чем раз в 5 секунд
      maxWaitTime: 10000,
      allowsBackgroundLocationUpdates: true,
      showsBackgroundLocationIndicator: true,
      notificationTitle: "Koleso Курьер",
      notificationText: "Отслеживание местоположения включено",
      notificationColor: "#006363",
      notificationIconColor: "#FFFFFF",
      notificationIconLarge: "ic_launcher",
      notificationIconSmall: "ic_notification"
    });

    await requestLocationPermission();
  };

  const requestLocationPermission = async () => {
    try {
      let permission = false;

      if (Platform.OS === 'ios') {
        permission = await RNLocation.requestPermission({
          ios: 'always',
          android: {
            detail: 'fine'
          }
        });
      } else {
        // Для Android запрашиваем разрешения поэтапно
        const fineLocationGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Разрешение на геолокацию',
            message: 'Приложению необходим доступ к вашему местоположению для отслеживания доставки',
            buttonNeutral: 'Позже',
            buttonNegative: 'Отмена',
            buttonPositive: 'OK',
          }
        );

        if (fineLocationGranted === PermissionsAndroid.RESULTS.GRANTED) {
          // Для Android 10+ запрашиваем фоновую геолокацию
          if (Platform.Version >= 29) {
            const backgroundGranted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
              {
                title: 'Фоновая геолокация',
                message: 'Приложению нужен доступ к местоположению в фоновом режиме для корректной работы доставки',
                buttonNeutral: 'Позже',
                buttonNegative: 'Отмена',
                buttonPositive: 'OK',
              }
            );
            permission = backgroundGranted === PermissionsAndroid.RESULTS.GRANTED;
          } else {
            permission = true;
          }
        }
      }

      setLocationEnabled(permission);
      
      if (!permission) {
        Alert.alert(
          'Требуется разрешение',
          'Для работы курьером необходимо разрешить доступ к геолокации',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  const startLocationTracking = async () => {
    try {
      // Проверяем разрешения
      const hasPermission = await RNLocation.checkPermission({
        ios: 'always',
        android: { detail: 'fine' }
      });

      if (!hasPermission) {
        await requestLocationPermission();
        return;
      }

      // Запускаем отслеживание
      locationSubscription.current = RNLocation.subscribeToLocationUpdates(
        async (locations) => {
          if (locations && locations.length > 0) {
            const location = locations[0];
            await updateLocationOnServer({
              latitude: location.latitude,
              longitude: location.longitude,
              speed: location.speed || 0,
              heading: location.course || 0,
              accuracy: location.accuracy || 0,
            });
          }
        }
      );
      
      console.log('Location tracking started with react-native-location');
    } catch (error) {
      console.error('Error starting location tracking:', error);
      Alert.alert('Ошибка', 'Не удалось запустить отслеживание местоположения');
    }
  };

  const stopLocationTracking = async () => {
    try {
      if (locationSubscription.current) {
        locationSubscription.current();
        locationSubscription.current = null;
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

      {/* Location Permission Warning */}
      {!locationEnabled && (
        <TouchableOpacity
          style={styles.permissionBanner}
          onPress={requestLocationPermission}
        >
          <MaterialIcons name="location-off" size={20} color="#FF9800" />
          <Text style={styles.permissionText}>
            Нажмите для включения геолокации
          </Text>
        </TouchableOpacity>
      )}

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
  permissionBanner: {
    backgroundColor: '#FFF3E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 8,
  },
  permissionText: {
    color: '#E65100',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
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