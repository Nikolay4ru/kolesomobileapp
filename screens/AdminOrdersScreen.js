import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl, 
  ActivityIndicator, 
  TouchableOpacity,
  StatusBar,
  Animated
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { observer } from "mobx-react-lite";
import { useStores } from "../useStores";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';

const ITEMS_PER_PAGE = 20;

const statusConfig = {
  'Новый': { color: '#FF9500', bg: '#FF950020', icon: 'fiber-new' },
  'Товар зарезервирован': { color: '#007AFF', bg: '#007AFF20', icon: 'bookmark' },
  'Готов к выдаче': { color: '#34C759', bg: '#34C75920', icon: 'check-circle' },
  'Выдан': { color: '#30D158', bg: '#30D15820', icon: 'done-all' },
  'Отменён (Удален)': { color: '#FF3B30', bg: '#FF3B3020', icon: 'cancel' },
  'Отменён (Возврат товара)': { color: '#FF3B30', bg: '#FF3B3020', icon: 'undo' },
  'Завершен': { color: '#32D74B', bg: '#32D74B20', icon: 'check-circle-outline' },
  'default': { color: '#8E8E93', bg: '#8E8E9320', icon: 'help-outline' }
};

const paymentMethodConfig = {
  'При получении': { label: 'Наличными', icon: 'payments', color: '#34C759' },
  'По счету': { label: 'По счету', icon: 'receipt-long', color: '#007AFF' },
  'card': { label: 'Картой', icon: 'credit-card', color: '#007AFF' },
  'online': { label: 'Онлайн', icon: 'account-balance-wallet', color: '#FF9500' },
  'default': { label: 'Не указано', icon: 'help-outline', color: '#8E8E93' }
};

const AdminOrdersScreen = observer(() => {
  const { authStore } = useStores();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const scrollY = new Animated.Value(0);
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

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
          store_id: authStore.user?.storeId || authStore.admin?.storeId,
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
  }, [authStore.token, authStore.user?.storeId, authStore.admin?.storeId]);

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
        <ActivityIndicator size="small" color={colors.primary} />
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
    
    return (
      <TouchableOpacity 
        style={styles.orderCard}
        onPress={() => navigation.navigate('AdminOrderDetail', { order: item })}
        activeOpacity={0.7}
      >
        {/* Header with order number and status */}
        <View style={styles.cardHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber}>Заказ #{item.number}</Text>
            <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConf.bg }]}>
            <Icon name={statusConf.icon} size={16} color={statusConf.color} />
            <Text style={[styles.statusText, { color: statusConf.color }]}>
              {item.status}
            </Text>
          </View>
        </View>

        {/* Client info */}
        {item.client && (
          <View style={styles.clientSection}>
            <Icon name="person" size={18} color={colors.textSecondary} />
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{item.client}</Text>
              {item.client.phone && (
                <Text style={styles.clientPhone}>{item.client.phone}</Text>
              )}
            </View>
          </View>
        )}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Footer with payment and price */}
        <View style={styles.cardFooter}>
          <View style={styles.paymentInfo}>
            <Icon name={paymentConf.icon} size={18} color={paymentConf.color} />
            <Text style={[styles.paymentText, { color: paymentConf.color }]}>
              {paymentConf.label}
            </Text>
          </View>
          <View style={styles.priceSection}>
            <Text style={styles.priceText}>{item.total_amount.toLocaleString('ru-RU')} ₽</Text>
            <Icon name="chevron-right" size={22} color={colors.textTertiary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!authStore.isAdmin) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar 
          barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Icon name="admin-panel-settings" size={72} color={colors.error} />
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
        <StatusBar 
          barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Загрузка заказов...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar 
          barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Icon name="error-outline" size={72} color={colors.error} />
          </View>
          <Text style={styles.errorTitle}>Ошибка загрузки</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Icon name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Повторить попытку</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      
      {/* iOS-style Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Animated.View 
          style={[
            styles.headerBackground, 
            { opacity: headerOpacity }
          ]} 
        />
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back-ios" size={22} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Заказы</Text>
          <View style={styles.headerRight} />
        </View>
      </View>

      <Animated.FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={item => `${item.id}_${item.updated_at || item.created_at}`}
        contentContainerStyle={styles.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.2}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressBackgroundColor={colors.card}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Icon name="shopping-bag" size={72} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Нет заказов</Text>
            <Text style={styles.emptySubtitle}>Заказы появятся здесь после оформления</Text>
          </View>
        }
      />
    </View>
  );
});

const themedStyles = (colors, theme) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: colors.background,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.4,
  },
  headerRight: {
    width: 44,
  },
  listContent: {
    paddingTop: 120,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  orderCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.3 : 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
    paddingBottom: 12,
  },
  orderInfo: {
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  clientSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  clientInfo: {
    marginLeft: 12,
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  clientPhone: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginRight: 8,
  },
  // Error and empty states
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 17,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 17,
    color: colors.textSecondary,
    marginTop: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 17,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AdminOrdersScreen;