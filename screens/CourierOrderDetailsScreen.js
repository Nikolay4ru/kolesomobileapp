// screens/CourierOrderDetailsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useStores } from '../useStores';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import axios from 'axios';

const API_URL = 'https://api.koleso.app/api';

const CourierOrderDetailsScreen = observer(() => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { order } = route.params;
  const { authStore } = useStores();
  
  const [loading, setLoading] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: order.destination?.latitude || 59.4370,
    longitude: order.destination?.longitude || 24.7536,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const acceptOrder = async () => {
    Alert.alert(
      'Принять заказ',
      `Вы уверены, что хотите принять заказ №${order.id}?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Принять',
          onPress: async () => {
            setLoading(true);
            try {
              const response = await axios.post(
                `${API_URL}/courier/${authStore.courierProfile.id}/accept`,
                { orderId: order.id },
                {
                  headers: {
                    'Authorization': `Bearer ${authStore.token}`
                  }
                }
              );
              
              if (response.data.success) {
                Alert.alert('Успешно', 'Заказ принят!');
                navigation.replace('CourierDelivery', { order: response.data.order });
              }
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось принять заказ');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const openNavigation = () => {
    const destination = order.destination;
    const url = Platform.select({
      ios: `maps:0,0?q=${order.address}@${destination.latitude},${destination.longitude}`,
      android: `geo:0,0?q=${destination.latitude},${destination.longitude}(${order.address})`
    });
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Ошибка', 'Не удалось открыть навигацию');
    });
  };

  const formatPaymentMethod = (method) => {
    switch (method) {
      case 'cash':
        return 'Наличными';
      case 'card':
        return 'Картой курьеру';
      case 'online':
        return 'Оплачено онлайн';
      default:
        return method;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Заказ №{order.id}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Map Preview */}
        <View style={styles.mapContainer}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={mapRegion}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            <Marker
              coordinate={order.destination}
              title="Адрес доставки"
            >
              <View style={styles.markerContainer}>
                <Ionicons name="location" size={30} color="#FF5252" />
              </View>
            </Marker>
          </MapView>
          
          <TouchableOpacity 
            style={styles.navigationButton}
            onPress={openNavigation}
          >
            <MaterialIcons name="navigation" size={20} color="#fff" />
            <Text style={styles.navigationText}>Навигация</Text>
          </TouchableOpacity>
        </View>

        {/* Order Info */}
        <View style={styles.section}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Стоимость доставки:</Text>
            <Text style={styles.priceValue}>{order.deliveryPrice} ₽</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              Примерное время: {order.estimatedTime} мин
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <MaterialIcons name="route" size={20} color="#666" />
            <Text style={styles.infoText}>
              Расстояние: {order.distance} км
            </Text>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Адрес доставки</Text>
          <Text style={styles.addressText}>{order.address}</Text>
        </View>

        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Клиент</Text>
          <View style={styles.customerRow}>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{order.customerName}</Text>
              <Text style={styles.customerPhone}>{order.customerPhone}</Text>
            </View>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}
            >
              <Ionicons name="call" size={20} color="#006363" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Детали заказа</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Сумма заказа:</Text>
            <Text style={styles.detailValue}>{order.totalAmount} ₽</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Оплата:</Text>
            <Text style={styles.detailValue}>
              {formatPaymentMethod(order.paymentMethod)}
            </Text>
          </View>
          {order.paymentMethod === 'cash' && (
            <View style={[styles.detailRow, styles.warningRow]}>
              <Ionicons name="alert-circle" size={20} color="#FF9800" />
              <Text style={styles.warningText}>
                Необходимо получить {order.totalAmount} ₽ наличными
              </Text>
            </View>
          )}
        </View>

        {/* Comment */}
        {order.comment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Комментарий</Text>
            <Text style={styles.commentText}>{order.comment}</Text>
          </View>
        )}

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Товары в заказе</Text>
          {order.items?.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQuantity}>x{item.quantity}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Accept Button */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.acceptButton, loading && styles.disabledButton]}
          onPress={acceptOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="check-circle" size={24} color="#fff" />
              <Text style={styles.acceptButtonText}>Принять заказ</Text>
            </>
          )}
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
  header: {
    backgroundColor: '#006363',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  backButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    height: 200,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
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
  navigationButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#006363',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
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
  navigationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  priceLabel: {
    fontSize: 16,
    color: '#666',
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#006363',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  addressText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
  },
  callButton: {
    width: 44,
    height: 44,
    backgroundColor: '#E8F5F5',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  warningRow: {
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
  },
  warningText: {
    fontSize: 14,
    color: '#FF9800',
    marginLeft: 8,
    flex: 1,
  },
  commentText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  bottomContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  acceptButton: {
    backgroundColor: '#006363',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default CourierOrderDetailsScreen;