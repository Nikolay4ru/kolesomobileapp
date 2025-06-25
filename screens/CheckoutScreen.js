// CheckoutScreen.js - Экран оформления заказа с интеграцией СБП
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

const CheckoutScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [deliveryMethod, setDeliveryMethod] = useState('pickup');
  const [selectedStore, setSelectedStore] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('sbp');
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadCartAndUser();
  }, []);

  const loadCartAndUser = async () => {
    try {
      // Загружаем корзину
      const cartData = route.params?.cartItems || [];
      setCartItems(cartData);
      
      // Считаем общую сумму
      const total = cartData.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      setTotalAmount(total);
      
      // Загружаем данные пользователя
      const userData = storage.getString('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      Alert.alert('Ошибка', 'Необходимо авторизоваться');
      navigation.navigate('Login');
      return;
    }

    if (cartItems.length === 0) {
      Alert.alert('Ошибка', 'Корзина пуста');
      return;
    }

    if (deliveryMethod === 'pickup' && !selectedStore) {
      Alert.alert('Ошибка', 'Выберите магазин для самовывоза');
      return;
    }

    setLoading(true);

    try {
      // Формируем данные заказа
      const orderData = {
        user_id: user.id,
        items: cartItems.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price: item.price,
        })),
        delivery_method: deliveryMethod,
        store_id: selectedStore?.id,
        payment_method: paymentMethod,
      };

      // Отправляем запрос на создание заказа
      const response = await fetch(`${API_URL}/order-checkout.php?action=create-order-with-sbp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (result.success) {
        // Очищаем корзину
        storage.delete('cart');
        
        // Переходим к оплате СБП
        if (paymentMethod === 'sbp') {
          navigation.navigate('SBPPayment', {
            paymentData: result,
            orderNumber: result.orderNumber,
          });
        }
      } else {
        Alert.alert('Ошибка', result.error || 'Не удалось создать заказ');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert('Ошибка', 'Произошла ошибка при оформлении заказа');
    } finally {
      setLoading(false);
    }
  };

  const renderCartItem = (item) => (
    <View key={item.id} style={styles.cartItem}>
      <Image source={{ uri: item.image_url }} style={styles.itemImage} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.itemBrand}>{item.brand}</Text>
        <View style={styles.itemBottom}>
          <Text style={styles.itemQuantity}>x{item.quantity}</Text>
          <Text style={styles.itemPrice}>{item.price * item.quantity} ₽</Text>
        </View>
      </View>
    </View>
  );

  const renderDeliveryOptions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Способ получения</Text>
      
      <TouchableOpacity
        style={[styles.option, deliveryMethod === 'pickup' && styles.optionSelected]}
        onPress={() => setDeliveryMethod('pickup')}
      >
        <View style={styles.radioButton}>
          {deliveryMethod === 'pickup' && <View style={styles.radioButtonInner} />}
        </View>
        <View style={styles.optionInfo}>
          <Text style={styles.optionTitle}>Самовывоз</Text>
          <Text style={styles.optionDescription}>Бесплатно</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.option, deliveryMethod === 'delivery' && styles.optionSelected]}
        onPress={() => setDeliveryMethod('delivery')}
      >
        <View style={styles.radioButton}>
          {deliveryMethod === 'delivery' && <View style={styles.radioButtonInner} />}
        </View>
        <View style={styles.optionInfo}>
          <Text style={styles.optionTitle}>Доставка</Text>
          <Text style={styles.optionDescription}>от 300 ₽</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderPaymentOptions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Способ оплаты</Text>
      
      <TouchableOpacity
        style={[styles.option, paymentMethod === 'sbp' && styles.optionSelected]}
        onPress={() => setPaymentMethod('sbp')}
      >
        <View style={styles.radioButton}>
          {paymentMethod === 'sbp' && <View style={styles.radioButtonInner} />}
        </View>
        <View style={styles.optionInfo}>
          <Text style={styles.optionTitle}>Система быстрых платежей</Text>
          <Text style={styles.optionDescription}>Мгновенная оплата через банк</Text>
          <View style={styles.sbpBanks}>
            <Text style={styles.sbpBanksText}>Сбербанк, Тинькофф, Альфа-Банк и др.</Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.option, paymentMethod === 'cash' && styles.optionSelected]}
        onPress={() => setPaymentMethod('cash')}
      >
        <View style={styles.radioButton}>
          {paymentMethod === 'cash' && <View style={styles.radioButtonInner} />}
        </View>
        <View style={styles.optionInfo}>
          <Text style={styles.optionTitle}>Наличными при получении</Text>
          <Text style={styles.optionDescription}>Оплата в магазине или курьеру</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.option, paymentMethod === 'card' && styles.optionSelected]}
        onPress={() => setPaymentMethod('card')}
      >
        <View style={styles.radioButton}>
          {paymentMethod === 'card' && <View style={styles.radioButtonInner} />}
        </View>
        <View style={styles.optionInfo}>
          <Text style={styles.optionTitle}>Банковской картой</Text>
          <Text style={styles.optionDescription}>При получении</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Оформление заказа</Text>
      </View>

      {/* Товары в заказе */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Товары ({cartItems.length})</Text>
        {cartItems.map(renderCartItem)}
      </View>

      {/* Способ получения */}
      {renderDeliveryOptions()}

      {/* Выбор магазина для самовывоза */}
      {deliveryMethod === 'pickup' && (
        <TouchableOpacity
          style={styles.selectStore}
          onPress={() => navigation.navigate('StoreSelection', {
            onSelect: (store) => setSelectedStore(store)
          })}
        >
          <Text style={styles.selectStoreText}>
            {selectedStore ? selectedStore.name : 'Выбрать магазин'}
          </Text>
          <Text style={styles.selectStoreArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* Способ оплаты */}
      {renderPaymentOptions()}

      {/* Итого */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Товары:</Text>
          <Text style={styles.summaryValue}>{totalAmount} ₽</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Доставка:</Text>
          <Text style={styles.summaryValue}>
            {deliveryMethod === 'pickup' ? 'Бесплатно' : 'от 300 ₽'}
          </Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryTotal]}>
          <Text style={styles.summaryTotalLabel}>Итого:</Text>
          <Text style={styles.summaryTotalValue}>{totalAmount} ₽</Text>
        </View>
      </View>

      {/* Кнопка оформления */}
      <TouchableOpacity
        style={[styles.checkoutButton, loading && styles.checkoutButtonDisabled]}
        onPress={handleCheckout}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.checkoutButtonText}>
            {paymentMethod === 'sbp' ? 'Перейти к оплате' : 'Оформить заказ'}
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.footer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  cartItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    marginBottom: 4,
  },
  itemBrand: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  itemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
  },
  option: {
    flexDirection: 'row',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderRadius: 12,
    marginBottom: 12,
  },
  optionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
  },
  sbpBanks: {
    marginTop: 8,
  },
  sbpBanksText: {
    fontSize: 12,
    color: '#007AFF',
  },
  selectStore: {
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5E7',
  },
  selectStoreText: {
    fontSize: 16,
    color: '#007AFF',
  },
  selectStoreArrow: {
    fontSize: 24,
    color: '#C7C7CC',
  },
  summary: {
    backgroundColor: 'white',
    marginTop: 16,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
  },
  summaryTotal: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  checkoutButton: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButtonDisabled: {
    opacity: 0.6,
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    height: 50,
  },
});

// Константы
const API_URL = 'https://koleso.app/api';

export default CheckoutScreen;