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
  ScrollView,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { observer } from "mobx-react-lite";
import { useStores } from "../useStores";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';

const ITEMS_PER_PAGE = 20;

// Упрощенная конфигурация статусов
const statusConfig = {
  'all': { label: 'Все заказы', color: '#000000' },
  'Новый': { label: 'Новые', color: '#007AFF' },
  'Товар зарезервирован': { label: 'Товар зарезервирован', color: '#FF9500' },
  'Отгружается': { label: 'В работе', color: '#FF9500' },
  'Завершен': { label: 'Завершен', color: '#30D158' },
  'Отменён (Удален)': { label: 'Отменены (Удален)', color: '#FF3B30' },
  'Отменён (Возврат товара)': { label: 'Отменены (Возврат)', color: '#FF3B30' },
  
};

const AdminOrdersScreen = observer(() => {
  const { authStore } = useStores();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState(route.params?.filter || 'all');
  const [totalCount, setTotalCount] = useState(0);

  const fetchOrders = useCallback(async (currentPage = 1, isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else if (currentPage === 1) {
        setLoading(true);
      }

      const filters = {
        store_id: authStore.admin?.storeId || 0,
        page: currentPage,
        per_page: ITEMS_PER_PAGE,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      };

      const response = await fetch('https://api.koleso.app/api/adminOrders.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`
        },
        body: JSON.stringify(filters)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Ошибка загрузки заказов');
      }

      if (isRefreshing || currentPage === 1) {
        setOrders(data.orders || []);
      } else {
        setOrders(prev => {
          const existingIds = new Set(prev.map(order => order.id));
          const newOrders = (data.orders || []).filter(order => !existingIds.has(order.id));
          return [...prev, ...newOrders];
        });
      }

      setTotalCount(data.total_count || 0);
      setHasMore(data.orders?.length === ITEMS_PER_PAGE);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authStore.token, authStore.admin?.storeId, selectedStatus]);

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

  useEffect(() => {
    setPage(1);
    setOrders([]);
    fetchOrders(1);
  }, [selectedStatus]);

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();

  const diffInMinutes = Math.floor((now - date) / (1000 * 60));

  if (diffInMinutes < 60) {
    return `${diffInMinutes} мин назад`;
  }

  const isToday = date.getDate() === now.getDate() &&
                  date.getMonth() === now.getMonth() &&
                  date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  });

  if (isToday) {
    return `Сегодня в ${timeStr}`;
  } else {
    const dateStr = date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short'
    });
    return `${dateStr}, ${timeStr}`;
  }
};

  const getStatusDisplay = (status) => {
    const normalizedStatus = status;
    const config = statusConfig[normalizedStatus] || statusConfig['Новый'];
    return config;
  };

  const renderOrderItem = ({ item, index }) => {
    const statusDisplay = getStatusDisplay(item.status);
    const isFirstItem = index === 0;
    
    return (
      <TouchableOpacity 
        style={[styles.orderItem, isFirstItem && styles.firstOrderItem]}
        onPress={() => navigation.navigate('AdminOrderDetail', { order: item })}
        activeOpacity={0.6}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderNumberContainer}>
            <Text style={styles.orderNumber}>#{item.number}</Text>
            <View style={[styles.statusDot, { backgroundColor: statusDisplay.color }]} />
          </View>
          <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
        </View>
        
        <View style={styles.orderContent}>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName} numberOfLines={1}>
              {item.client || 'Клиент'}
            </Text>
            {item.phone && (
              <Text style={styles.clientPhone}>{item.phone}</Text>
            )}
          </View>
          
          <View style={styles.orderDetails}>
            <Text style={styles.orderAmount}>
              {(item.total_amount || 0).toLocaleString('ru-RU')} ₽
            </Text>
            {item.items_count > 0 && (
              <Text style={styles.itemsCount}>
                {item.items_count} товар{item.items_count === 1 ? '' : item.items_count < 5 ? 'а' : 'ов'}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderStatusFilter = () => (
    <View style={styles.filterContainer}>
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContent}
      >
        {Object.entries(statusConfig).map(([key, config]) => {
          const isActive = selectedStatus === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.filterChip,
                isActive && styles.filterChipActive,
                isActive && { backgroundColor: config.color }
              ]}
              onPress={() => setSelectedStatus(key)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.filterChipText,
                isActive && styles.filterChipTextActive
              ]}>
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const ListHeaderComponent = () => (
    <>
      {renderStatusFilter()}
      {totalCount > 0 && (
        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            {totalCount} заказ{totalCount === 1 ? '' : totalCount < 5 ? 'а' : 'ов'}
          </Text>
        </View>
      )}
    </>
  );

  const ListEmptyComponent = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Icon name="inbox" size={48} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>Нет заказов</Text>
        <Text style={styles.emptySubtitle}>
          {selectedStatus !== 'all' 
            ? 'Нет заказов с выбранным статусом' 
            : 'Заказы появятся здесь после оформления'}
        </Text>
      </View>
    );
  };

  const ListFooterComponent = () => {
    if (!loading || !hasMore) return <View style={styles.footerSpace} />;
    
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.textSecondary} />
      </View>
    );
  };

  if (!authStore.isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={styles.centerContainer}>
          <Icon name="lock" size={48} color={colors.textTertiary} />
          <Text style={styles.errorTitle}>Доступ запрещён</Text>
          <Text style={styles.errorSubtitle}>Требуются права администратора</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back-ios" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Заказы</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.centerContainer}>
          <Icon name="wifi-off" size={48} color={colors.textTertiary} />
          <Text style={styles.errorTitle}>Ошибка подключения</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Минималистичный заголовок */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Icon name="arrow-back-ios" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Заказы</Text>
        <TouchableOpacity 
          onPress={onRefresh}
          style={styles.headerButton}
        >
          <Icon name="refresh" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={item => `${item.id}_${item.updated_at || item.created_at}`}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.2}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
});

const themedStyles = (colors, theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPlaceholder: {
    width: 44,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.4,
  },
  filterContainer: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: theme === 'dark' ? colors.surface : '#F2F2F7',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  countContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  countText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  listContent: {
    flexGrow: 1,
  },
  orderItem: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  firstOrderItem: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    marginTop: 8,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  orderDate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  orderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clientInfo: {
    flex: 1,
    marginRight: 16,
  },
  clientName: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 2,
  },
  clientPhone: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  orderDetails: {
    alignItems: 'flex-end',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  itemsCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 22,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerSpace: {
    height: 40,
  },
});

export default AdminOrdersScreen;