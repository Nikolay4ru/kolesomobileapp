import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  Linking
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useStores } from '../useStores';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';

const { width } = Dimensions.get('window');

const CheckoutScreen = observer(() => {
  const { cartStore, authStore } = useStores();
  const navigation = useNavigation();
  
  // Состояния формы
  const [name, setName] = useState(authStore.user?.name || '');
  const [phone, setPhone] = useState(authStore.user?.phone || '');
  const [email, setEmail] = useState(authStore.user?.email || '');
  const [deliveryType, setDeliveryType] = useState('pickup');
  const [address, setAddress] = useState('');
  const [comment, setComment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [deliveryDate, setDeliveryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Анимация
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Запуск анимации при монтировании
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Создание платежа в Сбербанке
  const createSberbankPayment = async (orderId, amount) => {
    try {
      setLoading(true);
      
      // Отправка запроса на ваш бэкенд для создания платежа
      const response = await axios.post('https://your-backend-api.com/create-payment', {
        orderId,
        amount,
        currency: 'RUB',
        description: `Оплата заказа №${orderId}`,
        returnUrl: 'your-app-scheme://payment-result', // URL для возврата после оплаты
      }, {
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      });

      const { paymentUrl } = response.data;
      
      // Открываем платежную страницу Сбербанка
      const canOpen = await Linking.canOpenURL(paymentUrl);
      if (canOpen) {
        await Linking.openURL(paymentUrl);
      } else {
        throw new Error('Не удалось открыть платежную страницу');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось инициировать платеж');
      console.error('Payment error:', error);
      setLoading(false);
    }
  };

  // Обработчик оформления заказа
  const handleCheckout = async () => {
    if (!name || !phone) {
      Alert.alert('Ошибка', 'Пожалуйста, заполните обязательные поля');
      return;
    }

    setLoading(true);
    
    try {
      const orderData = {
        userId: authStore.user.id,
        items: cartStore.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        customer: { name, phone, email },
        delivery: {
          type: deliveryType,
          address: deliveryType === 'delivery' ? address : null,
          date: deliveryDate.toISOString()
        },
        payment: {
          method: paymentMethod
        },
        comment,
        promoCode: cartStore.appliedPromo?.code || null,
        totalAmount: cartStore.totalAmount
      };
      console.log(JSON.stringify(orderData));
      // Создаем заказ на бэкенде
      const response = await axios.post('https://your-backend-api.com/orders', orderData, {
        headers: {
          'Authorization': `Bearer ${authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      const { orderId } = response.data;

      if (paymentMethod === 'sberbank') {
        // Для оплаты через Сбербанк - создаем платеж
        await createSberbankPayment(orderId, cartStore.totalAmount);
      } else {
        // Для других способов оплаты просто очищаем корзину
        await cartStore.clearCart(authStore.token);
        navigation.navigate('OrderSuccess', { 
          orderId,
          deliveryType,
          deliveryDate
        });
      }
    } catch (error) {
      Alert.alert('Ошибка', error.response?.data?.message || 'Ошибка оформления заказа');
      console.error('Checkout error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Обработчик глубокой ссылки для возврата из платежной системы
  useEffect(() => {
    const handleDeepLink = async (url) => {
      if (!url) return;
      
      // Обрабатываем возврат из платежной системы
      if (url.includes('payment-result')) {
        const success = url.includes('success=true');
        
        if (success) {
          await cartStore.clearCart(authStore.token);
          navigation.navigate('OrderSuccess', { 
            orderId: url.match(/orderId=([^&]+)/)?.[1],
            deliveryType,
            deliveryDate
          });
        } else {
          Alert.alert('Ошибка', 'Платеж не был завершен');
        }
      }
    };

    // Получаем начальную ссылку при открытии приложения
    Linking.getInitialURL().then(handleDeepLink).catch(console.error);
    
    // Подписываемся на события глубоких ссылок
    Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    
    return () => {
      Linking.removeAllListeners('url');
    };
  }, []);

  // Форматирование даты
  const formatDate = (date) => {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Обработчик изменения даты
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDeliveryDate(selectedDate);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Animated.View 
          style={[
            styles.content,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }] 
            }
          ]}
        >
          {/* Заголовок */}
          <View style={styles.header}>
            <Text style={styles.title}>Оформление заказа</Text>
            <Text style={styles.subtitle}>
              {cartStore.items.length} товара на {cartStore.totalAmount} ₽
            </Text>
          </View>

          {/* Контактная информация */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Контактная информация</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Имя *"
                value={name}
                onChangeText={setName}
              />
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Телефон *"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* Способ получения */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Способ получения</Text>
            <View style={styles.deliveryOptions}>
              <TouchableOpacity
                style={[
                  styles.deliveryOption,
                  deliveryType === 'pickup' && styles.deliveryOptionActive
                ]}
                onPress={() => setDeliveryType('pickup')}
              >
                <Ionicons 
                  name="storefront-outline" 
                  size={24} 
                  color={deliveryType === 'pickup' ? '#006363' : '#666'} 
                />
                <Text style={styles.deliveryOptionText}>Самовывоз</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.deliveryOption,
                  deliveryType === 'delivery' && styles.deliveryOptionActive
                ]}
                onPress={() => setDeliveryType('delivery')}
              >
                <Ionicons 
                  name="car-outline" 
                  size={24} 
                  color={deliveryType === 'delivery' ? '#006363' : '#666'} 
                />
                <Text style={styles.deliveryOptionText}>Доставка</Text>
              </TouchableOpacity>
            </View>

            {deliveryType === 'delivery' && (
              <>
                <View style={styles.inputContainer}>
                  <Ionicons name="location-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Адрес доставки *"
                    value={address}
                    onChangeText={setAddress}
                  />
                </View>
                
                <TouchableOpacity 
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#006363" />
                  <Text style={styles.dateText}>
                    {formatDate(deliveryDate)}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={deliveryDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                  />
                )}
              </>
            )}
          </View>

          {/* Способ оплаты */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Способ оплаты</Text>
            
            <View style={styles.paymentOptions}>
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'card' && styles.paymentOptionActive
                ]}
                onPress={() => setPaymentMethod('card')}
              >
                <Ionicons 
                  name="card-outline" 
                  size={24} 
                  color={paymentMethod === 'card' ? '#006363' : '#666'} 
                />
                <Text style={styles.paymentOptionText}>Картой онлайн</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'sberbank' && styles.paymentOptionActive
                ]}
                onPress={() => setPaymentMethod('sberbank')}
              >
                <Ionicons 
                  name="logo-ruble" 
                  size={24} 
                  color={paymentMethod === 'sberbank' ? '#006363' : '#666'} 
                />
                <Text style={styles.paymentOptionText}>Сбербанк</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'cash' && styles.paymentOptionActive
                ]}
                onPress={() => setPaymentMethod('cash')}
              >
                <Ionicons 
                  name="cash-outline" 
                  size={24} 
                  color={paymentMethod === 'cash' ? '#006363' : '#666'} 
                />
                <Text style={styles.paymentOptionText}>Наличными</Text>
              </TouchableOpacity>
              
              {deliveryType === 'pickup' && (
                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    paymentMethod === 'card_on_delivery' && styles.paymentOptionActive
                  ]}
                  onPress={() => setPaymentMethod('card_on_delivery')}
                >
                  <Ionicons 
                    name="card-outline" 
                    size={24} 
                    color={paymentMethod === 'card_on_delivery' ? '#006363' : '#666'} 
                  />
                  <Text style={styles.paymentOptionText}>Картой при получении</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {paymentMethod === 'sberbank' && (
              <View style={styles.paymentNotice}>
                <Ionicons name="information-circle-outline" size={20} color="#006363" />
                <Text style={styles.paymentNoticeText}>
                  После оформления заказа вы будете перенаправлены на безопасную платежную страницу Сбербанка
                </Text>
              </View>
            )}
          </View>

          {/* Комментарий */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Комментарий к заказу</Text>
            <TextInput
              style={[styles.input, styles.commentInput]}
              placeholder="Ваши пожелания..."
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Кнопка оформления */}
          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={handleCheckout}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.checkoutButtonText}>
                Оформить заказ • {cartStore.totalAmount} ₽
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 20,
    paddingBottom: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 15,
    height: 100,
    textAlignVertical: 'top',
  },
  deliveryOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  deliveryOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    marginHorizontal: 5,
  },
  deliveryOptionActive: {
    borderColor: '#006363',
    backgroundColor: '#f0faf9',
  },
  deliveryOptionText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  paymentOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  paymentOption: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 10,
  },
  paymentOptionActive: {
    borderColor: '#006363',
    backgroundColor: '#f0faf9',
  },
  paymentOptionText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  paymentNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0faf9',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  paymentNoticeText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#006363',
    flex: 1,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 20,
  },
  dateText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  checkoutButton: {
    backgroundColor: '#006363',
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default CheckoutScreen;