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
  Animated
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useStores } from "../useStores";

const { width } = Dimensions.get('window');

const AdminOrderDetailScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { authStore } = useStores();
  const { order } = route.params;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fadeAnim = new Animated.Value(0);

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleAction = async (action) => {
    try {
      setLoading(true);
      
      if (action === 'reserve') {
        const insufficientItems = order.items.filter(item => item.quantity > item.stock);
        if (insufficientItems.length > 0) {
          const itemNames = insufficientItems.map(item => item.name).join(', ');
          Alert.alert(
            'Недостаточно товара на складе',
            `Следующих товаров недостаточно для резервирования: ${itemNames}`,
            [{ text: 'OK', style: 'default' }]
          );
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
    switch(order.status) {
      case 'Отменён (Удален)': 
      case 'Отменён (Возврат товара)': 
        return { color: '#E53E3E', icon: 'cancel', bgColor: '#FFE5E5' };
      case 'Завершен': 
        return { color: '#38A169', icon: 'check-circle', bgColor: '#E6FFEC' };
      case 'Новый': 
        return { color: '#F6AD55', icon: 'fiber-new', bgColor: '#FFFAF0' };
      case 'Товар зарезервирован': 
        return { color: '#4A9B8E', icon: 'inventory', bgColor: '#E6FFF9' };
      case 'В обработке': 
        return { color: '#3182CE', icon: 'sync', bgColor: '#E6F7FF' };
      default: 
        return { color: '#718096', icon: 'help-outline', bgColor: '#F7FAFC' };
    }
  };

  const statusConfig = getStatusConfig();

  const renderStockInfo = (quantity, stock) => {
    const isInsufficient = quantity > stock;
    return (
      <View style={styles.stockContainer}>
        <Icon 
          name={isInsufficient ? 'warning' : 'check-circle'} 
          size={14} 
          color={isInsufficient ? '#E53E3E' : '#38A169'} 
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
          <Icon name={icon} size={18} color="#4A9B8E" />
        </View>
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, valueStyle]}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.mainContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-back-ios" size={20} color="#000000" />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.title}>Заказ #{order.number}</Text>
            <Text style={styles.subtitle}>{order.created_at}</Text>
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <Icon name="more-vert" size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* Status Badge */}
        <Animated.View style={[styles.statusContainer, { opacity: fadeAnim }]}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Icon name={statusConfig.icon} size={20} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{order.status}</Text>
          </View>
        </Animated.View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Order Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.sectionTitleContainer}>
                <Icon name="info" size={20} color="#4A9B8E" />
                <Text style={styles.sectionTitle}>Информация о заказе</Text>
              </View>
            </View>
            
            <View style={styles.cardContent}>
              <InfoRow icon="store" label="Магазин" value={order.store_name} />
              <InfoRow icon="person" label="Клиент" value={order.client} />
              <InfoRow icon="phone" label="Телефон" value={order.client_phone} />
              <View style={styles.divider} />
              <InfoRow 
                icon="payments" 
                label="Итого к оплате" 
                value={`${order.total_amount.toLocaleString('ru-RU')} ₽`}
                valueStyle={styles.totalAmount}
              />
            </View>
          </View>

          {/* Products Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.sectionTitleContainer}>
                <Icon name="shopping-bag" size={20} color="#4A9B8E" />
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
                        <Icon name="image" size={24} color="#C7C7CC" />
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
                  
                  <Icon name="chevron-right" size={20} color="#C7C7CC" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
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
                      <Icon name="inventory" size={20} color="#FFFFFF" />
                      <Text style={styles.primaryButtonText}>Зарезервировать товар</Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.secondaryButton, { opacity: 0.5 }]}
                  disabled={true}
                  activeOpacity={0.8}
                >
                  <Icon name="description" size={20} color="#4A9B8E" />
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
                  <ActivityIndicator color="#E53E3E" />
                ) : (
                  <>
                    <Icon name="close" size={20} color="#E53E3E" />
                    <Text style={styles.dangerButtonText}>Отменить заказ</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Error Message */}
          {error && (
            <Animated.View style={[styles.errorContainer, { opacity: fadeAnim }]}>
              <Icon name="error-outline" size={20} color="#E53E3E" />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  mainContainer: {
    flex: 1,
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: -0.3,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 10,
    letterSpacing: -0.3,
  },
  badge: {
    backgroundColor: '#9BDDD3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C5F56',
  },
  cardContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E6FFF9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 15,
    color: '#8E8E93',
    letterSpacing: -0.2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
    letterSpacing: -0.2,
    textAlign: 'right',
    maxWidth: '50%',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A9B8E',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 8,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  lastProductItem: {
    borderBottomWidth: 0,
  },
  productImageContainer: {
    marginRight: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  stockText: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 4,
  },
  insufficientStock: {
    color: '#E53E3E',
    fontWeight: '500',
  },
  productBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityBadge: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  quantityText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  productPrice: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 2,
  },
  productTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
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
    backgroundColor: '#4A9B8E',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 12,
    shadowColor: '#4A9B8E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: -0.3,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6FFF9',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#4A9B8E',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: -0.3,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE5E5',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  dangerButtonText: {
    color: '#E53E3E',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: -0.3,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE5E5',
    borderRadius: 10,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#E53E3E',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
});

export default AdminOrderDetailScreen;