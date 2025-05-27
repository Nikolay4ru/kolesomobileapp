import React, { useState } from 'react';
import { View, Image, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { observer } from "mobx-react-lite";
import { useStores } from "../useStores";

const OrderDetailScreen = observer(() => {
  const { ordersStore, authStore } = useStores();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  
  const order = ordersStore.orders.find(o => o.id === orderId);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${day}.${month}.${year}, ${hours}:${minutes}`;
    } catch (e) {
      return dateString;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Новый': return '#FF9500';
      case 'В обработке': return '#007AFF';
      case 'Готов к выдаче': return '#32D74B';
      case 'Завершен': return '#34C759';
      case 'Отменён (Удален)': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Новый': return 'schedule';
      case 'В обработке': return 'autorenew';
      case 'Готов к выдаче': return 'local-shipping';
      case 'Завершен': return 'check-circle';
      case 'Отменён (Удален)': return 'cancel';
      default: return 'info';
    }
  };

  const handleCancelOrder = async () => {
    try {
      setLoading(true);
      await ordersStore.cancelOrder(authStore.token, orderId);
      navigation.goBack();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePayOrder = () => {
    navigation.navigate('Payment', { orderId });
  };

  const renderProductItem = ({ item, index }) => (
    <View style={[styles.productItem, index === 0 && styles.firstProductItem]}>
      <View style={styles.productImageContainer}>
        {item.image_url ? (
          <Image 
            source={{ uri: item.image_url }}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Icon name="inventory-2" size={24} color="#C7C7CC" />
          </View>
        )}
      </View>
      
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.productDetailsRow}>
          <Text style={styles.productPrice}>{item.price} ₽</Text>
          <View style={styles.quantityBadge}>
            <Text style={styles.quantityText}>×{item.quantity}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.productTotalContainer}>
        <Text style={styles.productTotal}>{item.price * item.quantity} ₽</Text>
      </View>
    </View>
  );

  if (!order) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back-ios" size={20} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Заказ</Text>
          <View style={{ width: 44 }} />
        </View>
        
        <View style={styles.errorState}>
          <View style={styles.errorIconContainer}>
            <Icon name="receipt-long" size={64} color="#E5E5EA" />
          </View>
          <Text style={styles.errorTitle}>Заказ не найден</Text>
          <Text style={styles.errorSubtitle}>Попробуйте обновить список заказов</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Современный заголовок */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back-ios" size={20} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Заказ #{order.order_number}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Статус заказа - большая карточка */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusIconContainer, { backgroundColor: getStatusColor(order.status) + '20' }]}>
              <Icon name={getStatusIcon(order.status)} size={24} color={getStatusColor(order.status)} />
            </View>
            <View style={styles.statusInfo}>
              <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                {order.status}
              </Text>
              <Text style={styles.statusDate}>{formatDate(order.created_at)}</Text>
            </View>
          </View>
          
          {/* Прогресс бар */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: order.status === 'Завершен' ? '100%' : 
                           order.status === 'Готов к выдаче' ? '75%' :
                           order.status === 'В обработке' ? '50%' : '25%',
                    backgroundColor: getStatusColor(order.status)
                  }
                ]} 
              />
            </View>
          </View>
        </View>

        {/* Товары */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="shopping-bag" size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Товары ({order.items?.length || 0})</Text>
          </View>
          
          <View style={styles.productsContainer}>
            <FlatList
              data={order.items}
              renderItem={renderProductItem}
              keyExtractor={item => item.id.toString()}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.productSeparator} />}
            />
          </View>
        </View>

        {/* Информация о доставке */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="local-shipping" size={20} color="#FF9500" />
            <Text style={styles.sectionTitle}>Доставка и оплата</Text>
          </View>
          
          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <Icon name="location-on" size={16} color="#8E8E93" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Адрес доставки</Text>
                <Text style={styles.infoValue}>{order.delivery_address || 'Не указано'}</Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <Icon name="delivery-dining" size={16} color="#8E8E93" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Способ доставки</Text>
                <Text style={styles.infoValue}>{order.delivery_method || 'Стандартная доставка'}</Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <Icon name="payment" size={16} color="#8E8E93" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Способ оплаты</Text>
                <Text style={styles.infoValue}>{order.payment_method || 'Наличными'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Итого */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="receipt" size={20} color="#34C759" />
            <Text style={styles.sectionTitle}>Итого к оплате</Text>
          </View>
          
          <View style={styles.totalContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Товары</Text>
              <Text style={styles.totalValue}>{order.total_amount} ₽</Text>
            </View>
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Доставка</Text>
              <Text style={styles.totalValue}>
                {order.delivery_cost ? `${order.delivery_cost} ₽` : 'Бесплатно'}
              </Text>
            </View>
            
            <View style={styles.totalSeparator} />
            
            <View style={styles.finalTotalRow}>
              <Text style={styles.finalTotalLabel}>Общая сумма</Text>
              <Text style={styles.finalTotalValue}>{order.total_amount} ₽</Text>
            </View>
          </View>
        </View>

        {/* Действия */}
        {order.status === 'Новый' && (
          <View style={styles.actionsSection}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handlePayOrder}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Icon name="payment" size={20} color="#fff" />
                  <Text style={styles.primaryButtonText}>Оплатить заказ</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={handleCancelOrder}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Icon name="cancel" size={20} color="#FF3B30" />
              <Text style={styles.secondaryButtonText}>Отменить заказ</Text>
            </TouchableOpacity>
          </View>
        )}

        {error && (
          <View style={styles.errorBanner}>
            <Icon name="error" size={20} color="#FF3B30" />
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#C6C6C8',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24, // Базовый отступ, будет дополнен динамически
  },
  
  // Статус карточка
  statusCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusDate: {
    fontSize: 14,
    color: '#8E8E93',
  },
  progressContainer: {
    marginTop: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Секции
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 8,
  },

  // Товары
  productsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  firstProductItem: {
    paddingTop: 0,
  },
  productSeparator: {
    height: 0.5,
    backgroundColor: '#E5E5EA',
    marginVertical: 8,
  },
  productImageContainer: {
    marginRight: 16,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  productImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
    lineHeight: 20,
  },
  productDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 14,
    color: '#8E8E93',
    marginRight: 12,
  },
  quantityBadge: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  quantityText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
  },
  productTotalContainer: {
    alignItems: 'flex-end',
  },
  productTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },

  // Информация
  infoContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoIcon: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 22,
  },

  // Итого
  totalContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 16,
    color: '#8E8E93',
  },
  totalValue: {
    fontSize: 16,
    color: '#000000',
  },
  totalSeparator: {
    height: 0.5,
    backgroundColor: '#E5E5EA',
    marginVertical: 8,
  },
  finalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  finalTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  finalTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },

  // Действия
  actionsSection: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16, // Дополнительный отступ перед TabBar
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  secondaryButtonText: {
    color: '#FF3B30',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Ошибки
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorIconContainer: {
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorMessage: {
    color: '#FF3B30',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
});

export default OrderDetailScreen;