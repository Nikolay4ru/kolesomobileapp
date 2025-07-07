// screens/CourierDeliveryScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  StatusBar,
  Animated,
  ActivityIndicator,
} from 'react-native';
import YandexMapView from '../components/YandexMapView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';
import axios from 'axios';
import { MMKV } from 'react-native-mmkv';
import { observer } from 'mobx-react-lite';
import { useStores } from '../useStores';

const API_URL = 'https://api.koleso.app/api';
const storage = new MMKV();

const CourierDeliveryScreen = observer(() => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { order } = route.params;
  const { authStore } = useStores();

  // States
  const [currentLocation, setCurrentLocation] = useState(null);
  const [orderStatus, setOrderStatus] = useState(order.status || 'assigned');
  const [loading, setLoading] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 60.07934823,
    longitude: 30.33669985,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Refs
  const mapRef = useRef(null);
  const locationWatch = useRef(null);
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    StatusBar.setBarStyle('dark-content', true);
    startLocationTracking();

    // Анимация появления
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    return () => {
      if (locationWatch.current) {
        Geolocation.clearWatch(locationWatch.current);
      }
    };
  }, []);

  const startLocationTracking = () => {
    // Получаем текущую позицию
    Geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCurrentLocation(location);
        updateLocationOnServer(location);
      },
      (error) => console.error('Error getting location:', error),
      { enableHighAccuracy: true, timeout: 20000 }
    );

    // Следим за изменениями позиции
    locationWatch.current = Geolocation.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCurrentLocation(location);
        updateLocationOnServer(location);
      },
      (error) => console.error('Error watching location:', error),
      { enableHighAccuracy: true, distanceFilter: 50 }
    );
  };

  const updateLocationOnServer = async (location) => {
    try {
      await axios.post(`${API_URL}/courier/location`, {
        order_id: order.id,
        latitude: location.latitude,
        longitude: location.longitude,
        speed: location.speed || null,
        heading: location.heading || null,
        accuracy: location.accuracy || null
      }, {
        headers: {
          'Authorization': `Bearer ${authStore.token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const updateOrderStatus = async (newStatus) => {
    setLoading(true);
    try {
      const courierId = authStore.courierProfile?.id || storage.getString('courierId');
      const response = await axios.post(
        `${API_URL}/courier/order/${order.id}/status`, 
        { status: newStatus }, // Теперь отправляем только статус
        {
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        }
      );
      
      setOrderStatus(newStatus);

      if (newStatus === 'delivered') {
        Alert.alert(
          'Заказ доставлен',
          'Отличная работа! Заказ успешно доставлен.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось обновить статус заказа');
    } finally {
      setLoading(false);
    }
  };

  const getStatusButtons = () => {
    switch (orderStatus) {
      case 'assigned':
        return (
          <TouchableOpacity
            style={[styles.statusButton, styles.primaryButton]}
            onPress={() => updateOrderStatus('on_way')}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="directions-car" size={20} color="#fff" />
                <Text style={styles.statusButtonText}>Начать доставку</Text>
              </>
            )}
          </TouchableOpacity>
        );
      case 'on_way':
        return (
          <TouchableOpacity
            style={[styles.statusButton, styles.warningButton]}
            onPress={() => updateOrderStatus('near')}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="location" size={20} color="#fff" />
                <Text style={styles.statusButtonText}>Я на месте</Text>
              </>
            )}
          </TouchableOpacity>
        );
      case 'near':
        return (
          <TouchableOpacity
            style={[styles.statusButton, styles.successButton]}
            onPress={() => updateOrderStatus('delivered')}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.statusButtonText}>Заказ доставлен</Text>
              </>
            )}
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  const openNavigation = () => {
    const destination = order.destination;
    const url = Platform.select({
      ios: `maps:0,0?q=${destination.address}@${destination.latitude},${destination.longitude}`,
      android: `geo:0,0?q=${destination.latitude},${destination.longitude}(${destination.address})`
    });
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Ошибка', 'Не удалось открыть навигацию');
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Доставка заказа №{order.id}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Map */}
      <YandexMapView
        ref={mapRef}
        style={styles.map}
        initialRegion={mapRegion}
        showsUserLocation={true}
        followsUserLocation={true}
        markers={order.destination ? [{
          coordinate: order.destination,
          title: "Адрес доставки",
          pinColor: "red",
          id: "destination"
        }] : []}
        polylines={currentLocation && order.destination ? [{
          coordinates: [currentLocation, order.destination],
          strokeColor: "#006363",
          strokeWidth: 3
        }] : []}
      />

      {/* Order Info Card */}
      <Animated.View style={[styles.infoCard, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.orderSection}>
          <Text style={styles.sectionTitle}>Информация о заказе</Text>
          
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{order.customerName}</Text>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}
            >
              <Ionicons name="call" size={18} color="#006363" />
            </TouchableOpacity>
          </View>

          <View style={styles.addressRow}>
            <Text style={styles.addressText}>{order.address}</Text>
            <TouchableOpacity
              style={styles.navigationButton}
              onPress={openNavigation}
            >
              <MaterialIcons name="navigation" size={18} color="#006363" />
            </TouchableOpacity>
          </View>

          <Text style={styles.detailText}>Заказ: {order.totalAmount} ₽</Text>
          <Text style={styles.detailText}>Доставка: {order.deliveryPrice} ₽</Text>
          {order.paymentMethod && (
            <Text style={styles.detailText}>Оплата: {order.paymentMethod}</Text>
          )}
          {order.comment && (
            <Text style={styles.commentText}>Комментарий: {order.comment}</Text>
          )}
        </View>

        {getStatusButtons()}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: '#006363',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  map: {
    flex: 1,
  },
  destinationMarker: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  infoCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  orderSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  customerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  customerName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  callButton: {
    padding: 8,
    backgroundColor: '#E8F5F5',
    borderRadius: 20,
  },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  addressText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  navigationButton: {
    padding: 8,
    backgroundColor: '#E8F5F5',
    borderRadius: 20,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  primaryButton: {
    backgroundColor: '#006363',
  },
  warningButton: {
    backgroundColor: '#FF9800',
  },
  successButton: {
    backgroundColor: '#4CAF50',
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default CourierDeliveryScreen;