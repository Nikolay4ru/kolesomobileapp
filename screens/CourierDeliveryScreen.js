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
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://api.koleso.app/api';

const CourierDeliveryScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { order } = route.params;

  // States
  const [currentLocation, setCurrentLocation] = useState(null);
  const [orderStatus, setOrderStatus] = useState(order.status || 'assigned');
  const [loading, setLoading] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 59.4370,
    longitude: 24.7536,
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
      const courierId = await AsyncStorage.getItem('courierId');
      await axios.post(`${API_URL}/courier/${courierId}/location`, {
        orderId: order.id,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const updateOrderStatus = async (newStatus) => {
    setLoading(true);
    try {
      const courierId = await AsyncStorage.getItem('courierId');
      await axios.post(`${API_URL}/courier/${courierId}/order/status`, {
        orderId: order.id,
        status: newStatus
      });
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
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={mapRegion}
        showsUserLocation={true}
      >
        {/* Маркер текущей позиции курьера */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Ваша позиция"
          >
            <View style={styles.courierMarker}>
              <MaterialIcons name="delivery-dining" size={30} color="#006363" />
            </View>
          </Marker>
        )}

        {/* Маркер места доставки */}
        <Marker
          coordinate={order.destination}
          title="Адрес доставки"
          description={order.address}
        >
          <View style={styles.destinationMarker}>
            <Ionicons name="location" size={30} color="#FF5252" />
          </View>
        </Marker>

        {/* Линия маршрута */}
        {currentLocation && (
          <Polyline
            coordinates={[currentLocation, order.destination]}
            strokeColor="#006363"
            strokeWidth={3}
            lineDashPattern={[5, 5]}
          />
        )}
      </MapView>

      {/* Info Card */}
      <Animated.View
        style={[
          styles.infoCard,
          {
            transform: [{ translateY: slideAnim }],
            paddingBottom: insets.bottom + 20
          }
        ]}
      >
        {/* Order Info */}
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>Заказ №{order.id}</Text>
          <Text style={styles.orderAmount}>{order.totalAmount} ₽</Text>
        </View>

        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Клиент</Text>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{order.customerName}</Text>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}
            >
              <Ionicons name="call" size={20} color="#006363" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Адрес доставки</Text>
          <View style={styles.addressRow}>
            <Text style={styles.addressText}>{order.address}</Text>
            <TouchableOpacity
              style={styles.navigationButton}
              onPress={openNavigation}
            >
              <MaterialIcons name="navigation" size={20} color="#006363" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Детали заказа</Text>
          <Text style={styles.detailText}>
            Оплата: {order.paymentMethod === 'cash' ? 'Наличными' : 'Картой'}
          </Text>
          {order.comment && (
            <Text style={styles.commentText}>Комментарий: {order.comment}</Text>
          )}
        </View>

        {/* Status Button */}
        {getStatusButtons()}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#006363',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingBottom: 15,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  backButton: {
    padding: 5,
  },
  map: {
    flex: 1,
  },
  courierMarker: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 25,
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
  destinationMarker: {
    backgroundColor: '#fff',
    padding: 5,
    borderRadius: 20,
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
    maxHeight: '60%',
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
  orderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  orderAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#006363',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  customerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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