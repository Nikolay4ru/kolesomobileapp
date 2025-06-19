import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
  Dimensions,
  Alert,
  Animated,
  StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useStores } from "../useStores";
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';

const { width } = Dimensions.get('window');

const AdminOrderDetailScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { authStore } = useStores();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const { order } = route.params;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleAction = async (action) => {
    try {
      setLoading(true);
      
      if (action === 'reserve') {
        const insufficientItems = order.items.filter(item => item.quantity > item.stock);
        if (insufficientItems.length > 0) {
          const itemNames = insufficientItems.map(item => item.name).join(', ');
          Alert.alert(
            'Недостаточно товара',
            `На складе недостаточно: ${itemNames}`,
            [{ text: 'Понятно', style: 'default' }]
          );
          setLoading(false);
          return;
        }
      }

      const response = await fetch('https://api.koleso.app/api/ordersAction.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`
        },
        body: JSON.stringify({
          order_id: order.id,
          action: action
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Ошибка выполнения действия');
      }
      
      navigation.goBack();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = () => {
    const configs = {
      'Отменён (Удален)': { color: colors.error, icon: 'cancel', bg: colors.error + '20' },
      'Отменён (Возврат товара)': { color: colors.error, icon: 'undo', bg: colors.error + '20' },
      'Завершен': { color: colors.success, icon: 'check-circle', bg: colors.success + '20' },
      'Новый': { color: colors.warning, icon: 'fiber-new', bg: colors.warning + '20' },
      'Товар зарезервирован': { color: colors.info, icon: 'inventory', bg: colors.info + '20' },
      'В обработке': { color: colors.primary, icon: 'sync', bg: colors.primary + '20' },
    };
    return configs[order.status] || { color: colors.textSecondary, icon: 'help-outline', bg: colors.surface };
  };

  const statusConfig = getStatusConfig();

  const renderStockInfo = (quantity, stock) => {
    const isInsufficient = quantity > stock;
    return (
      <View style={styles.stockContainer}>
        <Icon 
          name={isInsufficient ? 'warning' : 'check-circle'} 
          size={14} 
          color={isInsufficient ? colors.error : colors.success} 
        />
        <Text style={[styles.stockText, isInsufficient && styles.insufficientStock]}>
          {stock} шт. на складе
        </Text>
      </View>
    );
  };

  const InfoRow = ({ icon, label, value, valueStyle }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <View style={styles.iconContainer}>
          <Icon name={icon} size={20} color={colors.primary} />
        </View>
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, valueStyle]}>{value}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar 
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back-ios" size={22} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>Заказ #{order.number}</Text>
          <Text style={styles.subtitle}>{order.created_at}</Text>
        </View>
        <TouchableOpacity style={styles.moreButton} activeOpacity={0.7}>
          <Icon name="more-horiz" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Status Badge */}
      <Animated.View 
        style={[
          styles.statusContainer, 
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <Icon name={statusConfig.icon} size={22} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>{order.status}</Text>
        </View>
      </Animated.View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Info Card */}
        <Animated.View 
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIcon}>
                <Icon name="info" size={22} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Информация</Text>
            </View>
          </View>
          
          <View style={styles.cardContent}>
            <InfoRow icon="store" label="Магазин" value={order.store_name} />
            <InfoRow icon="person" label="Клиент" value={order.client} />
            <InfoRow icon="phone" label="Телефон" value={order.client_phone} />
            <View style={styles.divider} />
            <InfoRow 
              icon="account-balance-wallet" 
              label="К оплате" 
              value={`${order.total_amount.toLocaleString('ru-RU')} ₽`}
              valueStyle={styles.totalAmount}
            />
          </View>
        </Animated.View>

        {/* Products Card */}
        <Animated.View 
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIcon}>
                <Icon name="shopping-cart" size={22} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Товары</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{order.items.length}</Text>
            </View>
          </View>
          
          <View style={styles.cardContent}>
            {order.items.map((item, index) => (
              <TouchableOpacity 
                key={index} 
                style={[
                  styles.productItem,
                  index === order.items.length - 1 && styles.lastProductItem
                ]}
                onPress={() => navigation.navigate('Cart', {
                  screen: 'ProductModal',
                  params: {
                    productId: item.product_id,
                    fromCart: false
                  }
                })}
                activeOpacity={0.7}
              >
                <View style={styles.productImageContainer}>
                  {item.image_url ? (
                    <Image 
                      source={{ uri: item.image_url }} 
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.productImagePlaceholder}>
                      <Icon name="image" size={28} color={colors.textTertiary} />
                    </View>
                  )}
                </View>
                
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                  {renderStockInfo(item.quantity, item.stock)}
                  
                  <View style={styles.productBottom}>
                    <View style={styles.quantityBadge}>
                      <Text style={styles.quantityText}>{item.quantity} шт</Text>
                    </View>
                    <View style={styles.priceContainer}>
                      <Text style={styles.productPrice}>{item.price.toLocaleString('ru-RU')} ₽</Text>
                      <Text style={styles.productTotal}>
                        {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                      </Text>
                    </View>
                  </View>
                </View>
                
                <Icon name="chevron-right" size={22} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View 
          style={[
            styles.actionsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {order.status === 'Новый' && (
            <>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={() => handleAction('reserve')}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="inventory" size={22} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Зарезервировать товар</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.secondaryButton, { opacity: 0.5 }]}
                disabled={true}
                activeOpacity={0.8}
              >
                <Icon name="receipt-long" size={22} color={colors.primary} />
                <Text style={styles.secondaryButtonText}>Выставить счет</Text>
              </TouchableOpacity>
            </>
          )}
          
          {order.status !== 'Отменён (Возврат товара)' && 
           order.status !== 'Отменён (Удален)' && (
            <TouchableOpacity 
              style={styles.dangerButton}
              onPress={() => handleAction('cancel')}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.error} />
              ) : (
                <>
                  <Icon name="close" size={22} color={colors.error} />
                  <Text style={styles.dangerButtonText}>Отменить заказ</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Error Message */}
        {error && (
          <Animated.View style={[styles.errorContainer, { opacity: fadeAnim }]}>
            <Icon name="error-outline" size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
};

const themedStyles = (colors, theme) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  moreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    letterSpacing: -0.3,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.3 : 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.3,
  },
  badge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  cardContent: {
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    letterSpacing: -0.2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    letterSpacing: -0.2,
    textAlign: 'right',
    maxWidth: '50%',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lastProductItem: {
    borderBottomWidth: 0,
  },
  productImageContainer: {
    marginRight: 14,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  productImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  insufficientStock: {
    color: colors.error,
    fontWeight: '500',
  },
  productBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  productPrice: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  productTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  actionsContainer: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 10,
    letterSpacing: -0.3,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '15',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 10,
    letterSpacing: -0.3,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error + '15',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  dangerButtonText: {
    color: colors.error,
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 10,
    letterSpacing: -0.3,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error + '15',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 10,
    flex: 1,
  },
});

export default AdminOrderDetailScreen;