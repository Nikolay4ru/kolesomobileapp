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
  Alert,
  Linking
} from 'react-native';
import YandexMapView from '../components/YandexMapView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useStores } from '../useStores';
import { useOrderTracking } from '../hooks/useOrderTracking';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import axios from 'axios';

const { width, height } = Dimensions.get('window');
const API_URL = 'https://api.koleso.app/api';

const DeliveryTrackingScreen = observer(() => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { orderId } = route.params;
  const { authStore } = useStores();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);

  // Используем хук для отслеживания в реальном времени
  const { courierLocation, orderStatus, loading, error } = useOrderTracking(orderId);

  // States
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 59.4370,
    longitude: 24.7536,
    zoom: 12,
  });

  // Refs
  const mapRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    StatusBar.setBarStyle('dark-content', true);
    loadDeliveryInfo();

    // Анимация появления карточки
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  // Центрируем карту при обновлении местоположения курьера
  useEffect(() => {
    if (courierLocation && mapRef.current) {
      const newRegion = {
        latitude: courierLocation.latitude,
        longitude: courierLocation.longitude,
        zoom: 15,
      };
      mapRef.current.animateToRegion(newRegion, 500);
    }
  }, [courierLocation]);

  const loadDeliveryInfo = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/order/${orderId}/delivery-info`,
        {
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        }
      );
      
      if (response.data.success) {
        setDeliveryInfo(response.data.delivery);
        
        // Обновляем регион карты
        if (response.data.delivery.destination) {
          setMapRegion({
            latitude: response.data.delivery.destination.latitude,
            longitude: response.data.delivery.destination.longitude,
            zoom: 14,
          });
        }
      }
    } catch (err) {
      console.error('Error loading delivery info:', err);
    }
  };

  const callCourier = () => {
    if (deliveryInfo?.courier?.phone) {
      Linking.openURL(`tel:${deliveryInfo.courier.phone}`);
    }
  };

  const cancelDelivery = () => {
    Alert.alert(
      'Отменить доставку',
      'Вы уверены, что хотите отменить доставку?',
      [
        { text: 'Нет', style: 'cancel' },
        {
          text: 'Да, отменить',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.post(
                `${API_URL}/order/${orderId}/cancel-delivery`,
                {},
                {
                  headers: {
                    'Authorization': `Bearer ${authStore.token}`
                  }
                }
              );
              navigation.goBack();
            } catch (err) {
              Alert.alert('Ошибка', 'Не удалось отменить доставку');
            }
          }
        }
      ]
    );
  };

  const getStatusText = (status) => {
    const statuses = {
      'assigned': 'Курьер назначен',
      'pickup': 'Курьер забирает заказ',
      'on_way': 'Курьер в пути',
      'near': 'Курьер рядом',
      'delivered': 'Доставлено'
    };
    return statuses[status] || 'Ожидание';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'assigned': 'person-circle',
      'pickup': 'cube-outline',
      'on_way': 'car-outline',
      'near': 'location',
      'delivered': 'checkmark-circle'
    };
    return icons[status] || 'time-outline';
  };

  // Подготавливаем маркеры для карты
  const getMapMarkers = () => {
    const markers = [];
    
    // Маркер назначения
    if (deliveryInfo?.destination) {
      markers.push({
        id: 'destination',
        coordinate: deliveryInfo.destination,
        title: 'Адрес доставки',
        pinColor: 'red'
      });
    }
    
    // Маркер курьера
    if (courierLocation) {
      markers.push({
        id: 'courier',
        coordinate: courierLocation,
        title: 'Курьер',
        pinColor: 'green'
      });
    }
    
    return markers;
  };

  // Линия маршрута
  const getMapPolylines = () => {
    if (courierLocation && deliveryInfo?.destination) {
      return [{
        coordinates: [courierLocation, deliveryInfo.destination],
        strokeColor: '#006363',
        strokeWidth: 3
      }];
    }
    return [];
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
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
        <View style={{ width: 24 }} />
      </View>

      {/* Map */}
      <YandexMapView
        ref={mapRef}
        style={styles.map}
        initialRegion={mapRegion}
        markers={getMapMarkers()}
        polylines={getMapPolylines()}
        showsUserLocation={false}
      />

      {/* Info Card */}
      <Animated.View style={[styles.infoCard, { transform: [{ translateY: slideAnim }] }]}>
        {/* Status */}
        <View style={styles.statusContainer}>
          <Ionicons name={getStatusIcon(orderStatus)} size={24} color={colors.primary} />
          <Text style={styles.statusText}>{getStatusText(orderStatus)}</Text>
        </View>

        {/* Order Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.orderNumber}>Заказ №{deliveryInfo?.orderNumber}</Text>
          
          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.timeText}>
              Ожидаемое время: {deliveryInfo?.estimatedTime || '30-40'} мин
            </Text>
          </View>
          
          <View style={styles.addressContainer}>
            <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.addressText}>{deliveryInfo?.address}</Text>
          </View>
        </View>

        {/* Courier Info */}
        {deliveryInfo?.courier && (
          <View style={styles.courierInfo}>
            <View style={styles.courierHeader}>
              <Text style={styles.courierTitle}>Курьер</Text>
              <TouchableOpacity style={styles.callButton} onPress={callCourier}>
                <Ionicons name="call" size={16} color="#fff" />
                <Text style={styles.callText}>Позвонить</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.courierName}>{deliveryInfo.courier.name}</Text>
            <Text style={styles.vehicleInfo}>
              {deliveryInfo.courier.vehicleModel} • {deliveryInfo.courier.vehicleNumber}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
            <MaterialIcons name="message" size={20} color={colors.primary} />
            <Text style={styles.actionText}>Сообщение</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.cancelButton]} 
            onPress={cancelDelivery}
          >
            <Ionicons name="close-circle-outline" size={20} color="#FF3B30" />
            <Text style={[styles.actionText, { color: '#FF3B30' }]}>Отменить</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
});

const themedStyles = (colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: colors.primary,
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
  infoCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
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
    color: colors.text,
    marginLeft: 10,
  },
  detailsContainer: {
    marginBottom: 20,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 10,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  courierInfo: {
    backgroundColor: colors.background,
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
    color: colors.textSecondary,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
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
    color: colors.text,
    marginBottom: 4,
  },
  vehicleInfo: {
    fontSize: 14,
    color: colors.textSecondary,
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
    backgroundColor: colors.background,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#FFE5E5',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    marginLeft: 5,
  },
});

export default DeliveryTrackingScreen;