import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { authStore } from '../stores/AuthStore';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';

const EmployeeDashboardScreen = observer(() => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [statistics, setStatistics] = useState({
    todaySales: 0,
    monthSales: 0,
    newOrdersCount: 0,
    processingOrdersCount: 0,
    completedOrdersCount: 0,
  });

  const isDirector = authStore.admin?.role === 'director';
  const isManager = authStore.admin?.role === 'manager';
  const isAdmin = authStore.admin?.role === 'admin';

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Загружаем заказы
      const ordersResponse = await fetch('https://api.koleso.app/api/adminOrders.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`
        },
        body: JSON.stringify({
          store_id: authStore.admin?.storeId,
          page: 1,
          per_page: 1000
        })
      });

      const ordersData = await ordersResponse.json();
      if (ordersData.success) {
        setOrders(ordersData.orders || []);
      }

      // Загружаем статистику (для директора)
      if (isDirector) {
        const statsResponse = await fetch('https://api.koleso.app/api/salesStatistics.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`
          },
          body: JSON.stringify({
            store_id: authStore.admin?.storeId,
            date: new Date().toISOString().split('T')[0]
          })
        });

        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStatistics({
            todaySales: statsData.todaySales || 0,
            monthSales: statsData.monthSales || 0,
            newOrdersCount: ordersData.orders?.filter(o => o.status === 'Новый').length || 0,
            processingOrdersCount: ordersData.orders?.filter(o => o.status === 'Отгружается').length || 0,
            completedOrdersCount: ordersData.orders?.filter(o => o.status === 'Завершен').length || 0,
          });
        }
      } else {
        // Для менеджеров и админов показываем только количество заказов
        setStatistics({
          ...statistics,
          newOrdersCount: ordersData.orders?.filter(o => o.status === 'Новый').length || 0,
          processingOrdersCount: ordersData.orders?.filter(o => o.status === 'Отгружается').length || 0,
          completedOrdersCount: ordersData.orders?.filter(o => o.status === 'Завершен').length || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authStore.token, authStore.admin?.storeId, isDirector]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

const getStatusConfig = (status) => {
  const statusConfig = {
    'Новый': { label: 'Новый', color: '#FF9500', bg: '#FF950020', icon: 'fiber-new' },
    'Товар зарезервирован': { label: 'Товар зарезервирован', color: '#007AFF', bg: '#007AFF20', icon: 'bookmark' },
    'Готов к выдаче': { label: 'Готов к выдаче', color: '#34C759', bg: '#34C75920', icon: 'check-circle' },
    'Выдан': { label: 'Выдан', color: '#30D158', bg: '#30D15820', icon: 'done-all' },
    'Отменён (Удален)': { label: 'Отменён (Удален)', color: '#FF3B30', bg: '#FF3B3020', icon: 'cancel' },
    'Отменён (Возврат товара)': { label: 'Отменён (Возврат товара)', color: '#FF3B30', bg: '#FF3B3020', icon: 'undo' },
    'Завершен': { label: 'Завершен', color: '#32D74B', bg: '#32D74B20', icon: 'check-circle-outline' },
    'default': { label: 'Статус неизвестен', color: '#8E8E93', bg: '#8E8E9320', icon: 'help-outline' }
  };
  return statusConfig[status] || statusConfig['default'];
};

  // --- MAIN CHANGE: open order details in this stack, not in Profile/Admin ---
  const renderOrderItem = ({ item }) => {
    const statusConfig = getStatusConfig(item.status);
    console.log(item);
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => navigation.push('AdminOrderDetail', { order: item })}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>Заказ #{item.number}</Text>
            <Text style={styles.orderDate}>{new Date(item.created_at).toLocaleDateString('ru-RU')}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Icon name={statusConfig.icon} size={16} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </View>

        <View style={styles.orderDivider} />

        <View style={styles.orderFooter}>
          <Text style={styles.orderClient}>{item.client?.name || 'Клиент'}</Text>
          <Text style={styles.orderAmount}>{item.total_amount?.toLocaleString('ru-RU')} ₽</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderStatCard = (title, value, icon, color) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Icon name={icon} size={24} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Панель сотрудника</Text>
            <Text style={styles.headerSubtitle}>
              {isDirector ? 'Директор' : isManager ? 'Менеджер' : 'Администратор'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.push('EmployeeSettings')}
          >
            <Icon name="settings" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Statistics Cards */}
        {isDirector && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Статистика продаж</Text>
            <View style={styles.statsGrid}>
              {renderStatCard(
                'Продажи за сегодня',
                `${statistics.todaySales.toLocaleString('ru-RU')} ₽`,
                'today',
                colors.success
              )}
              {renderStatCard(
                'Продажи за месяц',
                `${statistics.monthSales.toLocaleString('ru-RU')} ₽`,
                'date-range',
                colors.info
              )}
            </View>
          </View>
        )}

        {/* Orders Summary */}
        <View style={styles.ordersSection}>
          <Text style={styles.sectionTitle}>Заказы</Text>
          <View style={styles.ordersSummary}>
            <TouchableOpacity
              style={[styles.summaryCard, { backgroundColor: colors.primary + '20' }]}
             onPress={() => navigation.navigate('EmployeeOrderList', { filter: 'Новый' })}
            >
              <Icon name="fiber-new" size={32} color={colors.primary} />
              <Text style={[styles.summaryCount, { color: colors.primary }]}>
                {statistics.newOrdersCount}
              </Text>
              <Text style={styles.summaryLabel}>Новые</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.summaryCard, { backgroundColor: colors.warning + '20' }]}
              onPress={() => navigation.navigate('EmployeeOrderList', { filter: 'Отгружается' })}
              
            >
              <Icon name="hourglass-empty" size={32} color={colors.warning} />
              <Text style={[styles.summaryCount, { color: colors.warning }]}>
                {statistics.processingOrdersCount}
              </Text>
              <Text style={styles.summaryLabel}>В работе</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.summaryCard, { backgroundColor: colors.success + '20' }]}
              onPress={() => navigation.navigate('EmployeeOrderList', { filter: 'Завершен' })}
              
            >
              <Icon name="check-circle" size={32} color={colors.success} />
              <Text style={[styles.summaryCount, { color: colors.success }]}>
                {statistics.completedOrdersCount}
              </Text>
              <Text style={styles.summaryLabel}>Завершены</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Orders */}
        <View style={styles.recentOrdersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Последние заказы</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('EmployeeOrderList')}
            >
              <Text style={styles.viewAllLink}>Все заказы</Text>
            </TouchableOpacity>
          </View>

          {orders.slice(0, 5).map((order) => (
            <View key={order.id}>
              {renderOrderItem({ item: order })}
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Быстрые действия</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('EmployeeOrderList')}
            >
              <Icon name="assignment" size={32} color={colors.primary} />
              <Text style={styles.actionLabel}>Заказы</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('MainTabs', {
                screen: 'ProfileMenu',
                params: {
                  screen: 'Admin',
                  params: {
                    screen: 'ScanProducts'
                  }
                }
              })}
            >
              <Icon name="qr-code-scanner" size={32} color={colors.primary} />
              <Text style={styles.actionLabel}>Сканер</Text>
            </TouchableOpacity>

            {isDirector && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('Reports')}
              >
                <Icon name="analytics" size={32} color={colors.primary} />
                <Text style={styles.actionLabel}>Отчеты</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
});

const themedStyles = (colors, theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  settingsButton: {
    padding: 8,
  },
  statsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  ordersSection: {
    padding: 20,
    paddingTop: 0,
  },
  ordersSummary: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: '700',
    marginVertical: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  recentOrdersSection: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  orderCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  orderDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  orderDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderClient: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  quickActionsSection: {
    padding: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionLabel: {
    fontSize: 14,
    color: colors.text,
    marginTop: 8,
    fontWeight: '500',
  },
});

export default EmployeeDashboardScreen;