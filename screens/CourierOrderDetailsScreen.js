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
import YandexMapView from '../components/YandexMapView';
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
    zoom: 14,
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
                `${API_URL}/courier/order/${order.id}/accept`,
                {},
                {
                  headers: {
                    'Authorization': `Bearer ${authStore.token}`,
                    'Content-Type': 'application/json'
                  }
                }
              );

              console.log('courier log');
              console.log(response);
              
              if (response.data.success) {
                Alert.alert('Успешно', 'Заказ принят!', [
                  {
                    text: 'OK',
                    onPress: () => navigation.navigate('CourierDelivery', { order })
                  }
                ]);
              } else {
                Alert.alert('Ошибка', response.data.message || 'Не удалось принять заказ');
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
    const destination = order.destination || order.pickup;
    const url = Platform.select({
      ios: `yandexnavi://route?lat_to=${destination.latitude}&lon_to=${destination.longitude}`,
      android: `yandexnavi://route?lat_to=${destination.latitude}&lon_to=${destination.longitude}`
    });
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback на веб-версию
        const webUrl = `https://yandex.ru/maps/?rtext=~${destination.latitude},${destination.longitude}`;
        Linking.openURL(webUrl);
      }
    });
  };

  // Подготовка маркеров для карты
  const getMarkers = () => {
    const markers = [];
    
    if (order.pickup) {
      markers.push({
        id: 'pickup',
        coordinate: order.pickup,
        title: order.pickup.name || 'Магазин',
        description: order.pickup.address,
        pinColor: 'green'
      });
    }
    
    if (order.destination) {
      markers.push({
        id: 'destination',
        coordinate: order.destination,
        title: 'Адрес доставки',
        description: order.delivery_address,
        pinColor: 'red'
      });
    }
    
    return markers;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#006363" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Заказ №{order.order_number}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Map Preview */}
        <View style={styles.mapContainer}>
          <YandexMapView
            style={styles.map}
            initialRegion={mapRegion}
            markers={getMarkers()}
            scrollEnabled={false}
            zoomEnabled={false}
          />
          
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
            <Text style={styles.priceValue}>{order.delivery_price} ₽</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              Примерное время: {order.estimated_time} мин
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <MaterialIcons name="route" size={20} color="#666" />
            <Text style={styles.infoText}>
              Расстояние: {order.distance} км
            </Text>
          </View>
        </View>

        {/* Pickup Point */}
        {order.pickup && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Точка забора</Text>
            <Text style={styles.addressText}>{order.pickup.name}</Text>
            <Text style={styles.addressSubtext}>{order.pickup.address}</Text>
          </View>
        )}

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Адрес доставки</Text>
          <Text style={styles.addressText}>{order.delivery_address}</Text>
        </View>

        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Клиент</Text>
          <View style={styles.customerRow}>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{order.customer_name}</Text>
              <Text style={styles.customerPhone}>{order.customer_phone}</Text>
            </View>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => Linking.openURL(`tel:${order.customer_phone}`)}
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
            <Text style={styles.detailValue}>{order.total_amount} ₽</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Оплата:</Text>
            <Text style={styles.detailValue}>
              {order.payment_method === 'cash' ? 'Наличные' : 'Оплачено картой'}
            </Text>
          </View>
          {order.payment_method === 'cash' && (
            <View style={[styles.detailRow, styles.warningRow]}>
              <Ionicons name="warning-outline" size={20} color="#FF9800" />
              <Text style={styles.warningText}>
                Получите оплату наличными: {order.total_amount} ₽
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
        {order.items && order.items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Товары ({order.items.length})</Text>
            {order.items.map((item, index) => (
              <View key={item.id || index} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQuantity}>×{item.quantity}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Action */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity
          style={[styles.acceptButton, loading && styles.disabledButton]}
          onPress={acceptOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
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
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  mapContainer: {
    height: 200,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  navigationButton: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    backgroundColor: '#006363',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
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
  addressSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
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