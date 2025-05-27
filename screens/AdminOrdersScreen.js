import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { observer } from "mobx-react-lite";
import { useStores } from "../useStores";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import CustomHeader from "../components/CustomHeader";

const ITEMS_PER_PAGE = 20;

const statusConfig = {
  'Новый': { color: '#FF9500', bg: '#FFF3E0', icon: 'fiber-new' },
  'Товар зарезервирован': { color: '#007AFF', bg: '#E3F2FD', icon: 'bookmark' },
  'Готов к выдаче': { color: '#34C759', bg: '#E8F5E8', icon: 'check-circle' },
  'Выдан': { color: '#30D158', bg: '#E8F8E8', icon: 'done-all' },
  'Отменён (Удален)': { color: '#FF3B30', bg: '#FFEBEE', icon: 'cancel' },
  'Отменён (Возврат товара)': { color: '#FF3B30', bg: '#FFEBEE', icon: 'undo' },
  'Завершен': { color: '#32D74B', bg: '#E8F8E8', icon: 'check-circle-outline' },
  'default': { color: '#8E8E93', bg: '#F2F2F7', icon: 'help-outline' }
};

const paymentMethodConfig = {
  'При получении': { label: 'Наличными', icon: 'payments', color: '#34C759' },
  'По счету': { label: 'по счету', icon: 'credit-card', color: '#007AFF' },
  'card': { label: 'Картой', icon: 'credit-card', color: '#007AFF' },
  'online': { label: 'Онлайн', icon: 'account-balance-wallet', color: '#FF9500' },
  'default': { label: 'Не указано', icon: 'help-outline', color: '#8E8E93' }
};

const AdminOrdersScreen = observer(() => {
  const { authStore } = useStores();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchOrders = useCallback(async (currentPage = 1, isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else if (currentPage === 1) {
        setLoading(true);
      }

      const response = await fetch('https://api.koleso.app/api/adminOrders.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`
        },
        body: JSON.stringify({
          store_id: authStore.admin?.storeId,
          page: currentPage,
          per_page: ITEMS_PER_PAGE
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Ошибка загрузки заказов');
      }

      if (isRefreshing || currentPage === 1) {
        setOrders(data.orders);
      } else {
        setOrders(prev => {
          const existingIds = new Set(prev.map(order => order.id));
          const newOrders = data.orders.filter(order => !existingIds.has(order.id));
          return [...prev, ...newOrders];
        });
      }

      setHasMore(data.orders.length === ITEMS_PER_PAGE);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authStore.token, authStore.admin?.storeId]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore]);

  const onRefresh = useCallback(() => {
    setPage(1);
    setHasMore(true);
    fetchOrders(1, true);
  }, [fetchOrders]);

  useEffect(() => {
    fetchOrders(page);
  }, [fetchOrders, page]);

  const renderFooter = () => {
    if (!loading || !hasMore) return null;
    
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  const getStatusConfig = (status) => {
    return statusConfig[status] || statusConfig['default'];
  };

  const getPaymentConfig = (method) => {
    return paymentMethodConfig[method] || paymentMethodConfig['default'];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return `Сегодня, ${date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`;
    } else if (diffInHours < 48) {
      return `Вчера, ${date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`;
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const renderOrderItem = ({ item }) => {
    
    const statusConf = getStatusConfig(item.status);
    const paymentConf = getPaymentConfig(item.payment_method);
    console.log(paymentConf);
    
    return (
      <TouchableOpacity 
        style={styles.orderCard}
        onPress={() => navigation.navigate('AdminOrderDetail', { order: item })}
        activeOpacity={0.7}
      >
        {/* Header with status badge */}
        <View style={styles.cardHeader}>
          <View style={styles.orderNumberContainer}>
            <Text style={styles.orderNumber}>#{item.number}</Text>
            <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConf.bg }]}>
            <Icon name={statusConf.icon} size={14} color={statusConf.color} />
            <Text style={[styles.statusText, { color: statusConf.color }]}>
              {item.status}
            </Text>
          </View>
        </View>

        {/* Store info if needed */}
        {!authStore.admin?.storeId && item.store_name && (
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Icon name="store" size={16} color="#8E8E93" />
              <Text style={styles.infoText}>{item.store_name}</Text>
            </View>
          </View>
        )}

        {/* Client info */}
        {item.client && (
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Icon name="person-outline" size={16} color="#8E8E93" />
              <Text style={styles.infoText}>
                {item.client}{item.client.phone ? ` • ${item.client.phone}` : ''}
              </Text>
            </View>
          </View>
        )}

        {/* Footer with payment and price */}
        <View style={styles.cardFooter}>
          <View style={styles.paymentContainer}>
            <Icon name={paymentConf.icon} size={16} color={paymentConf.color} />
            <Text style={[styles.paymentText, { color: paymentConf.color }]}>
              {paymentConf.label}
            </Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>{item.total_amount} ₽</Text>
            <Icon name="chevron-right" size={20} color="#C7C7CC" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!authStore.isAdmin) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Icon name="admin-panel-settings" size={64} color="#FF3B30" />
          </View>
          <Text style={styles.errorTitle}>Доступ запрещён</Text>
          <Text style={styles.errorSubtitle}>У вас нет прав администратора</Text>
        </View>
      </View>
    );
  }

  if (loading && !refreshing && orders.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Загрузка заказов...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Icon name="error-outline" size={64} color="#FF3B30" />
          </View>
          <Text style={styles.errorTitle}>Ошибка загрузки</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Icon name="refresh" size={20} color="#FFFFFF" style={styles.retryButtonIcon} />
            <Text style={styles.retryButtonText}>Повторить попытку</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <CustomHeader 
        title="Заказы"
        statusBarProps={{
          barStyle: 'dark-content',
          backgroundColor: '#FFFFFF'
        }}
        safeAreaStyle={{
          backgroundColor: '#FFFFFF'
        }}
        headerStyle={{
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0
        }}
        iconColor="#000000"
        titleStyle={{ 
          color: '#000000', 
          fontSize: 24, 
          fontWeight: '700' 
        }}
      />
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={item => `${item.id}_${item.updated_at || item.created_at}`}
        contentContainerStyle={styles.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.2}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
            progressBackgroundColor="#FFFFFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Icon name="shopping-bag" size={64} color="#C7C7CC" />
            </View>
            <Text style={styles.emptyTitle}>Нет заказов</Text>
            <Text style={styles.emptySubtitle}>Заказы появятся здесь после оформления</Text>
          </View>
        }
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumberContainer: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  infoRow: {
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#48484A',
    marginLeft: 8,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  paymentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginRight: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  retryButtonIcon: {
    marginRight: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AdminOrdersScreen;