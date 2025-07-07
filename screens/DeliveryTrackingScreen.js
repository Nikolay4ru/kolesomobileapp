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
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
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
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);

  const { courierLocation, orderStatus, loading } = useOrderTracking(orderId);

  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 59.4370,
    longitude: 24.7536,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const mapRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    StatusBar.setBarStyle('dark-content', true);
    loadDeliveryInfo();
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (courierLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...courierLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  }, [courierLocation]);

  const loadDeliveryInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/delivery/${orderId}`, {
        headers: { 'Authorization': `Bearer ${authStore.token}` }
      });
      setDeliveryInfo(response.data);
      if (response.data.destination) {
        setMapRegion({
          latitude: response.data.destination.latitude,
          longitude: response.data.destination.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    } catch (error) {
      console.error('Error loading delivery info:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить информацию о доставке');
    }
  };

  const getStatusIcon = (status) => {
    switch (status || orderStatus) {
      case 'assigned': return 'assignment';
      case 'on_way': return 'local-shipping';
      case 'near': return 'place';
      case 'delivered': return 'check-circle';
      default: return 'pending';
    }
  };

  const getStatusText = (status) => {
    switch (status || orderStatus) {
      case 'assigned': return 'Курьер назначен';
      case 'on_way': return 'Курьер в пути';
      case 'near': return 'Курьер рядом';
      case 'delivered': return 'Доставлено';
      default: return 'Ожидание курьера';
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Загрузка информации о доставке...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Отслеживание доставки</Text>
        <TouchableOpacity onPress={loadDeliveryInfo} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={mapRegion}
        showsUserLocation={true}
      >
        {courierLocation && (
          <Marker coordinate={courierLocation} title="Курьер" description={deliveryInfo?.courier?.name}>
            <View style={styles.courierMarker}>
              <MaterialIcons name="delivery-dining" size={30} color="#006363" />
            </View>
          </Marker>
        )}
        {deliveryInfo?.destination && (
          <Marker coordinate={deliveryInfo.destination} title="Адрес доставки" description={deliveryInfo.address}>
            <View style={styles.destinationMarker}>
              <Ionicons name="location" size={30} color="#FF5252" />
            </View>
          </Marker>
        )}
        {courierLocation && deliveryInfo?.destination && (
          <Polyline coordinates={[courierLocation, deliveryInfo.destination]} strokeColor="#006363" strokeWidth={3} lineDashPattern={[5, 5]} />
        )}
      </MapView>

      <Animated.View style={[styles.infoCard, { transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.statusContainer}>
          <MaterialIcons name={getStatusIcon(deliveryInfo?.status)} size={24} color="#006363" />
          <Text style={styles.statusText}>{getStatusText(deliveryInfo?.status)}</Text>
        </View>
        <View style={styles.detailsContainer}>
          <Text style={styles.orderNumber}>Заказ №{orderId}</Text>
          {deliveryInfo?.estimatedTime && (
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.timeText}>Ожидаемое время: {deliveryInfo.estimatedTime}</Text>
            </View>
          )}
          <View style={styles.addressContainer}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.addressText}>{deliveryInfo?.address}</Text>
          </View>
        </View>
        {deliveryInfo?.courier && (
          <View style={styles.courierInfo}>
            <View style={styles.courierHeader}>
              <Text style={styles.courierTitle}>Ваш курьер</Text>
              <TouchableOpacity style={styles.callButton} onPress={() => Linking.openURL(`tel:${deliveryInfo.courier.phone}`)}>
                <Ionicons name="call" size={20} color="#fff" />
                <Text style={styles.callText}>Позвонить</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.courierName}>{deliveryInfo.courier.name}</Text>
            {deliveryInfo.courier.vehicle && (
              <Text style={styles.vehicleInfo}>{deliveryInfo.courier.vehicle.model} • {deliveryInfo.courier.vehicle.number}</Text>
            )}
          </View>
        )}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Поддержка', 'Связаться с поддержкой?')}>
            <Ionicons name="help-circle-outline" size={20} color="#006363" />
            <Text style={styles.actionText}>Поддержка</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={() => Alert.alert('Отменить доставку?', 'Вы уверены?')}>
            <Ionicons name="close-circle-outline" size={20} color="#FF5252" />
            <Text style={[styles.actionText, { color: '#FF5252' }]}>Отменить</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
});

const themedStyles = (colors, theme) => ({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: colors.textSecondary },
  header: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingBottom: 15, zIndex: 1000, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3 }, android: { elevation: 8 } }) },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  backButton: { padding: 5 },
  refreshButton: { padding: 5 },
  map: { flex: 1 },
  courierMarker: { backgroundColor: '#fff', padding: 8, borderRadius: 25, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3 }, android: { elevation: 5 } }) },
  destinationMarker: { backgroundColor: '#fff', padding: 5, borderRadius: 20, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3 }, android: { elevation: 5 } }) },
  infoCard: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 5 }, android: { elevation: 10 } }) },
  statusContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  statusText: { fontSize: 18, fontWeight: '600', color: colors.text, marginLeft: 10 },
  detailsContainer: { marginBottom: 20 },
  orderNumber: { fontSize: 16, fontWeight: '500', color: colors.text, marginBottom: 10 },
  timeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  timeText: { fontSize: 14, color: colors.textSecondary, marginLeft: 8 },
  addressContainer: { flexDirection: 'row', alignItems: 'flex-start' },
  addressText: { fontSize: 14, color: colors.textSecondary, marginLeft: 8, flex: 1 },
  courierInfo: { backgroundColor: colors.background, padding: 15, borderRadius: 12, marginBottom: 20 },
  courierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  courierTitle: { fontSize: 14, color: colors.textSecondary },
  callButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  callText: { color: '#fff', fontSize: 12, marginLeft: 5, fontWeight: '500' },
  courierName: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  vehicleInfo: { fontSize: 14, color: colors.textSecondary },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: colors.background, marginHorizontal: 5 },
  cancelButton: { backgroundColor: '#FFE5E5' },
  actionText: { fontSize: 14, fontWeight: '500', color: colors.primary, marginLeft: 5 },
});

export default DeliveryTrackingScreen;
