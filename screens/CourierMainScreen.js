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
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://api.koleso.app/api';

const CourierMainScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  
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
      // Получаем ID курьера из AsyncStorage
      const id = await AsyncStorage.getItem('courierId');
      if (id) {
        setCourierId(id);
        await loadOrders(id);
      } else {
        // Если нет ID, отправляем на экран авторизации
        navigation.replace('CourierAuth');
      }
    } catch (error) {
      console.error('Error loading courier data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async (id) => {
    try {
      const response = await axios.get(`${API_URL}/courier/${id}/orders`);
      setOrders(response.data.available || []);
      setActiveOrder(response.data.active || null);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить заказы');
    }
  };

  const configureBackgroundGeolocation = async () => {
    BackgroundGeolocation.configure({
      desiredAccuracy: BackgroundGeolocation.HIGH_ACCURACY,
      stationaryRadius: 50,
      distanceFilter: 50,
      notificationTitle: 'Отслеживание местоположения',
      notificationText: 'Включено',
      startOnBoot: false,
      stopOnTerminate: true,
      locationProvider: BackgroundGeolocation.ACTIVITY_PROVIDER,
      interval: 5000,
      fastestInterval: 3000,
      activitiesInterval: 10000,
      stopOnStillActivity: false,
    });

    BackgroundGeolocation.on('location', (location) => {
      sendLocationUpdate(location);
    });

    BackgroundGeolocation.on('error', (error) => {
      console.error('[ERROR] BackgroundGeolocation error:', error);
    });

    BackgroundGeolocation.checkStatus((status) => {
      setLocationEnabled(status.isRunning);
    });
  };

  const toggleOnlineStatus = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);

    if (newStatus) {
      // Начинаем отслеживание
      BackgroundGeolocation.start();
      setLocationEnabled(true);
      
      // Обновляем статус на сервере
      try {
        await axios.post(`${API_URL}/courier/${courierId}/status`, {
          status: 'online'
        });
      } catch (error) {
        console.error('Error updating status:', error);
      }
    } else {
      // Останавливаем отслеживание
      BackgroundGeolocation.stop();
      setLocationEnabled(false);
      
      // Обновляем статус на сервере
      try {
        await axios.post(`${API_URL}/courier/${courierId}/status`, {
          status: 'offline'
        });
      } catch (error) {
        console.error('Error updating status:', error);
      }
    }
  };

  const sendLocationUpdate = async (location) => {
    if (!courierId || !activeOrder) return;

    try {
      await axios.post(`${API_URL}/courier/${courierId}/location`, {
        orderId: activeOrder.id,
        latitude: location.latitude,
        longitude: location.longitude,
        speed: location.speed,
        heading: location.heading,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error sending location:', error);
    }
  };

  const acceptOrder = async (order) => {
    Alert.alert(
      'Принять заказ',
      `Вы хотите принять заказ №${order.id}?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Принять',
          onPress: async () => {
            try {
              await axios.post(`${API_URL}/courier/${courierId}/accept`, {
                orderId: order.id
              });
              
              setActiveOrder(order);
              setOrders(orders.filter(o => o.id !== order.id));
              
              // Переходим на экран активной доставки
              navigation.navigate('CourierDelivery', { order });
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось принять заказ');
            }
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders(courierId);
    setRefreshing(false);
  };

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
              <Text style={styles.emptySubtext}>
                Потяните вниз для обновления
              </Text>
            </View>
          }
        />
      ) : !isOnline ? (
        <View style={styles.offlineContainer}>
          <MaterialIcons name="wifi-off" size={64} color="#ccc" />
          <Text style={styles.offlineText}>Вы не в сети</Text>
          <Text style={styles.offlineSubtext}>
            Включите статус "В сети" для получения заказов
          </Text>
        </View>
      ) : null}

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={24} color="#006363" />
          <Text style={styles.navText}>Главная</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('CourierEarnings')}
        >
          <Ionicons name="cash-outline" size={24} color="#666" />
          <Text style={[styles.navText, { color: '#666' }]}>Заработок</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('CourierProfile')}
        >
          <Ionicons name="person-outline" size={24} color="#666" />
          <Text style={[styles.navText, { color: '#666' }]}>Профиль</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

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