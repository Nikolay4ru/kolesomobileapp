// screens/DeliveryTrackingScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
  Animated,
  Alert
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';

const { width, height } = Dimensions.get('window');
const API_URL = 'https://api.koleso.app/api'; // Используем тот же API

const DeliveryTrackingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { orderId } = route.params;

  // States
  const [courierLocation, setCourierLocation] = useState(null);
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapRegion, setMapRegion] = useState({
    latitude: 59.4370,
    longitude: 24.7536,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Refs
  const mapRef = useRef(null);
  const pollingInterval = useRef(null);
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    StatusBar.setBarStyle('dark-content', true);
    loadDeliveryInfo();
    startLocationPolling();

    // Анимация появления карточки
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  const loadDeliveryInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/delivery/${orderId}`);
      setDeliveryInfo(response.data);
      
      if (response.data.destination) {
        setMapRegion({
          latitude: response.data.destination.latitude,
          longitude: response.data.destination.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading delivery info:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить информацию о доставке');
      setLoading(false);
    }
  };

  const startLocationPolling = () => {
    // Получаем позицию курьера каждые 5 секунд
    pollingInterval.current = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/courier/location/${orderId}`);
        if (response.data && response.data.location) {
          setCourierLocation(response.data.location);
          
          // Центрируем карту на курьере
          if (mapRef.current && response.data.location) {
            mapRef.current.animateToRegion({
              ...response.data.location,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }, 1000);
          }
        }
      } catch (error) {
        console.error('Error fetching courier location:', error);
      }
    }, 5000);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'assigned':
        return 'assignment';
      case 'on_way':
        return 'local-shipping';
      case 'near':
        return 'place';
      case 'delivered':
        return 'check-circle';
      default:
        return 'pending';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'assigned':
        return 'Курьер назначен';
      case 'on_way':
        return 'Курьер в пути';
      case 'near':
        return 'Курьер рядом';
      case 'delivered':
        return 'Доставлено';
      default:
        return 'Ожидание курьера';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#006363" />
        <Text style={styles.loadingText}>Загрузка информации о доставке...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Отслеживание доставки</Text>
        <TouchableOpacity onPress={loadDeliveryInfo} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={mapRegion}
        showsUserLocation={true}
      >
        {/* Маркер курьера */}
        {courierLocation && (
          <Marker
            coordinate={courierLocation}
            title="Курьер"
            description={deliveryInfo?.courier?.name}
          >
            <View style={styles.courierMarker}>
              <MaterialIcons name="delivery-dining" size={30} color="#006363" />
            </View>
          </Marker>
        )}

        {/* Маркер места доставки */}
        {deliveryInfo?.destination && (
          <Marker
            coordinate={deliveryInfo.destination}
            title="Адрес доставки"
            description={deliveryInfo.address}
          >
            <View style={styles.destinationMarker}>
              <Ionicons name="location" size={30} color="#FF5252" />
            </View>
          </Marker>
        )}

        {/* Линия маршрута */}
        {courierLocation && deliveryInfo?.destination && (
          <Polyline
            coordinates={[courierLocation, deliveryInfo.destination]}
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
        {/* Status */}
        <View style={styles.statusContainer}>
          <MaterialIcons 
            name={getStatusIcon(deliveryInfo?.status)} 
            size={24} 
            color="#006363" 
          />
          <Text style={styles.statusText}>{getStatusText(deliveryInfo?.status)}</Text>
        </View>

        {/* Delivery Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.orderNumber}>Заказ №{orderId}</Text>
          
          {deliveryInfo?.estimatedTime && (
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.timeText}>
                Ожидаемое время: {deliveryInfo.estimatedTime}
              </Text>
            </View>
          )}

          <View style={styles.addressContainer}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.addressText}>{deliveryInfo?.address}</Text>
          </View>
        </View>

        {/* Courier Info */}
        {deliveryInfo?.courier && (
          <View style={styles.courierInfo}>
            <View style={styles.courierHeader}>
              <Text style={styles.courierTitle}>Ваш курьер</Text>
              <TouchableOpacity 
                style={styles.callButton}
                onPress={() => Linking.openURL(`tel:${deliveryInfo.courier.phone}`)}
              >
                <Ionicons name="call" size={20} color="#fff" />
                <Text style={styles.callText}>Позвонить</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.courierName}>{deliveryInfo.courier.name}</Text>
            {deliveryInfo.courier.vehicle && (
              <Text style={styles.vehicleInfo}>
                {deliveryInfo.courier.vehicle.model} • {deliveryInfo.courier.vehicle.number}
              </Text>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Alert.alert('Поддержка', 'Связаться с поддержкой?')}
          >
            <Ionicons name="help-circle-outline" size={20} color="#006363" />
            <Text style={styles.actionText}>Поддержка</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => Alert.alert('Отменить доставку?', 'Вы уверены?')}
          >
            <Ionicons name="close-circle-outline" size={20} color="#FF5252" />
            <Text style={[styles.actionText, { color: '#FF5252' }]}>Отменить</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
  refreshButton: {
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
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  detailsContainer: {
    marginBottom: 20,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  courierInfo: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  courierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  courierTitle: {
    fontSize: 14,
    color: '#666',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#006363',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  callText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 5,
    fontWeight: '500',
  },
  courierName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#FFE5E5',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#006363',
    marginLeft: 5,
  },
});

export default DeliveryTrackingScreen;