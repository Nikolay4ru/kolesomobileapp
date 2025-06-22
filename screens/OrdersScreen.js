import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { observer } from "mobx-react-lite";
import { useStores } from "../useStores";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

// --- Добавляем контекст темы, как в HomeScreen --- //
import { useTheme } from '../contexts/ThemeContext';

const OrdersScreen = observer(({ navigation }) => {
  const { authStore, ordersStore } = useStores();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        await ordersStore.loadOrders(authStore.token);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (authStore.isLoggedIn) {
      fetchOrders();
    }
  }, [authStore.isLoggedIn, authStore.token]);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${day}.${month}.${year} в ${hours}:${minutes}`;
    } catch (e) {
      return dateString;
    }
  };

  const getStatusConfig = (status) => {
    const statusConfigs = {
      'new': { 
        text: 'Новый', 
        color: colors.warning,
        backgroundColor: theme === 'dark' ? '#3B2A10' : '#FFF3E0',
        icon: 'fiber-new'
      },
      'processing': { 
        text: 'В обработке', 
        color: colors.primary,
        backgroundColor: theme === 'dark' ? '#162940' : '#E3F2FD',
        icon: 'autorenew'
      },
      'shipped': { 
        text: 'Отправлен', 
        color: colors.info || '#5856D6', 
        backgroundColor: theme === 'dark' ? '#231D37' : '#F3E5F5',
        icon: 'local-shipping'
      },
      'delivered': { 
        text: 'Доставлен', 
        color: colors.success, 
        backgroundColor: theme === 'dark' ? '#163120' : '#E8F5E8',
        icon: 'check-circle'
      },
      'cancelled': { 
        text: 'Отменен', 
        color: colors.error, 
        backgroundColor: theme === 'dark' ? '#341010' : '#FFEBEE',
        icon: 'cancel'
      },
      'Отменён (Удален)': { 
        text: 'Отменен', 
        color: colors.error, 
        backgroundColor: theme === 'dark' ? '#341010' : '#FFEBEE',
        icon: 'cancel'
      },
      'Завершен': { 
        text: 'Завершен', 
        color: colors.success, 
        backgroundColor: theme === 'dark' ? '#163120' : '#E8F5E8',
        icon: 'check-circle'
      }
    };
    return statusConfigs[status] || { 
      text: status, 
      color: colors.textSecondary, 
      backgroundColor: theme === 'dark' ? '#23232A' : '#F2F2F7',
      icon: 'info'
    };
  };

  const OrderItem = ({ item, index }) => {
    const statusConfig = getStatusConfig(item.status);
    const animatedValue = new Animated.Value(0);

    React.useEffect(() => {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 300,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={[
          styles.orderItemContainer,
          {
            opacity: animatedValue,
            transform: [
              {
                translateY: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity 
          style={[
            styles.orderItem,
            { 
              backgroundColor: theme === 'dark' ? colors.card : '#FFFFFF',
              borderColor: theme === 'dark' ? colors.surface : '#E5E5EA',
              shadowColor: theme === 'dark' ? '#00000000' : '#000000',
            }
          ]}
          onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
          activeOpacity={0.7}
        >
          <View style={styles.orderHeader}>
            <View style={styles.orderTitleContainer}>
              <Text style={[styles.orderNumber, { color: colors.text }]} >Заказ №{item.order_number}</Text>
              <Text style={[styles.orderDate, { color: colors.textSecondary }]} >
                {formatDate(item.created_at)}
              </Text>
            </View>
            
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.backgroundColor }]}>
              <Icon 
                name={statusConfig.icon} 
                size={14} 
                color={statusConfig.color} 
                style={styles.statusIcon}
              />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.text}
              </Text>
            </View>
          </View>
          
          <View style={[
            styles.orderBody,
            { borderTopColor: theme === 'dark' ? colors.surface : '#F2F2F7' }
          ]}>
            <View style={styles.priceContainer}>
              <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Сумма заказа</Text>
              <Text style={[styles.orderPrice, { color: colors.text }]}>{item.total_amount} ₽</Text>
            </View>
            
            <View style={styles.chevronContainer}>
              <Icon name="arrow-forward-ios" size={16} color={theme === 'dark' ? colors.textSecondary : "#C7C7CC"} />
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderOrderItem = ({ item, index }) => (
    <OrderItem item={item} index={index} />
  );

  if (!authStore.isLoggedIn) {
    return (
      <LinearGradient
        colors={theme === 'dark' ? [colors.primary, colors.surface] : ['#667eea', '#764ba2']}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <View style={styles.centerContent}>
          <View style={styles.authIconContainer}>
            <Icon name="lock-outline" size={60} color="#FFFFFF" />
          </View>
          <Text style={[styles.authTitle, { color: '#FFFFFF' }]}>Вход в систему</Text>
          <Text style={styles.authMessage}>
            Войдите в свой аккаунт, чтобы просматривать историю заказов
          </Text>
        </View>
      </LinearGradient>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme === 'dark' ? colors.background : '#F2F2F7', paddingTop: insets.top }]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Загружаем ваши заказы...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme === 'dark' ? colors.background : '#F2F2F7', paddingTop: insets.top }]}>
        <View style={styles.centerContent}>
          <View style={styles.errorIconContainer}>
            <Icon name="error-outline" size={60} color={colors.error} />
          </View>
          <Text style={[styles.errorTitle, { color: colors.text } ]}>Что-то пошло не так</Text>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>Не удалось загрузить заказы</Text>
          <Text style={[styles.errorDetail, { color: colors.error }]}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme === 'dark' ? colors.background : '#F2F2F7', paddingTop: insets.top }]}>
      <View style={[
        styles.header,
        { backgroundColor: theme === 'dark' ? colors.card : '#FFFFFF', borderBottomColor: theme === 'dark' ? colors.surface : '#E5E5EA' }
      ]}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back-ios" size={24} color={colors.primary} />
          </TouchableOpacity>
          
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Мои заказы</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {ordersStore.orders.length} {ordersStore.orders.length === 1 ? 'заказ' : 'заказов'}
            </Text>
          </View>
        </View>
      </View>
      
      <FlatList
        data={ordersStore.orders}
        renderItem={renderOrderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Icon name="shopping-bag" size={80} color={theme === 'dark' ? colors.surface : "#E5E5EA"} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Пока нет заказов</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Когда вы сделаете первый заказ, он появится здесь
            </Text>
          </View>
        }
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  orderItemContainer: {
    marginBottom: 12,
  },
  orderItem: {
    borderRadius: 16,
    padding: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 0.5,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderTitleContainer: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  orderDate: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '400',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 12,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 16,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '500',
  },
  orderPrice: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  chevronContainer: {
    padding: 8,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  authIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  authMessage: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
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
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default OrdersScreen;