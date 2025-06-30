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
  SafeAreaView,
  FlatList,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useStores } from '../useStores';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomHeader from '../components/CustomHeader';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

const { width } = Dimensions.get('window');

const CheckoutScreen = observer(() => {
  const { cartStore, authStore } = useStores();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);

  // Состояния формы
  const [name, setName] = useState(authStore.user?.firstName || authStore.user?.name || '');
  const [phone, setPhone] = useState(authStore.user?.phone || '');
  const [email, setEmail] = useState(authStore.user?.email || '');
  const [deliveryType, setDeliveryType] = useState('pickup');
  const [address, setAddress] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [comment, setComment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [deliveryDate, setDeliveryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);

  // Таймер для debounce при поиске адреса
  const searchTimer = useRef(null);

  // selectedStore только из cartStore!
  const selectedStore = cartStore.selectedStore;

  // Анимация
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Синхронизация данных профиля если пользователь залогинен/обновил профиль
  useEffect(() => {
    setName(authStore.user?.firstName || authStore.user?.name || '');
    setEmail(authStore.user?.email || '');
    setPhone(authStore.user?.phone || '');
  }, [authStore.user?.firstName, authStore.user?.name, authStore.user?.email, authStore.user?.phone]);

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

  // Поиск адресов через DaData
  const searchAddress = async (query) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }

    setSearchingAddress(true);

    try {
      const response = await axios.post(
        'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address',
        {
          query: query,
          count: 5,
          locations: [
            {
              country_iso_code: 'KZ'
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Token YOUR_DADATA_API_KEY' // Замените на ваш API ключ
          }
        }
      );

      if (response.data && response.data.suggestions) {
        setAddressSuggestions(response.data.suggestions);
        setShowAddressSuggestions(true);
      }
    } catch (error) {
      console.error('Ошибка поиска адреса:', error);
    } finally {
      setSearchingAddress(false);
    }
  };

  // Обработчик изменения адреса с debounce
  const handleAddressChange = (text) => {
    setAddress(text);
    setSelectedAddress(null);

    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    searchTimer.current = setTimeout(() => {
      searchAddress(text);
    }, 500);
  };

  // Выбор адреса из подсказок
  const selectAddress = (suggestion) => {
    setAddress(suggestion.value);
    setSelectedAddress(suggestion);
    setShowAddressSuggestions(false);
    setAddressSuggestions([]);
  };

  // Обработка оформления заказа
  const handleCheckout = async () => {
    if (!name.trim()) {
      Alert.alert('Ошибка', 'Пожалуйста, введите ваше имя');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Ошибка', 'Пожалуйста, введите номер телефона');
      return;
    }
    if (deliveryType === 'delivery' && !selectedAddress) {
      Alert.alert('Ошибка', 'Пожалуйста, выберите адрес доставки из предложенных вариантов');
      return;
    }
    if (!selectedStore) {
      Alert.alert('Ошибка', 'Пожалуйста, выберите магазин');
      return;
    }

    try {
      setLoading(true);

      const orderData = {
         user_id: authStore.user?.id,
        items: cartStore.items.map(item => ({
          product_id: item.product_id || item.id,
          quantity: item.quantity,
          price: item.price,
        })),
        total: cartStore.totalAmount,
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
        deliveryType,
        deliveryAddress: deliveryType === 'delivery' ? selectedAddress.value : null,
        storeId: selectedStore.id,
        storeName: selectedStore.name,
        paymentMethod,
        deliveryDate: deliveryType === 'delivery' ? deliveryDate.toISOString() : null,
        comment,
      };

      // Определяем URL в зависимости от способа оплаты
      const apiUrl = paymentMethod === 'sbp' 
        ? 'https://api.koleso.app/api/order-checkout.php?action=create-order-with-sbp'
        : 'https://api.koleso.app/api/order-checkout.php?action=create-order';
        console.log(apiUrl);
        console.log(JSON.stringify(orderData));
      // Создаем заказ
      const response = await axios.post(
        apiUrl,
        orderData,
        {
          headers: {
            'Authorization': `Bearer ${authStore.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.data && response.data.success) {
        const orderId = response.data.orderId;

        if (paymentMethod === 'sbp' && response.data.qrCode) {
    // Переходим на экран оплаты СБП
    navigation.navigate('SBPPayment', {
      paymentData: {
        orderId,
        qrCode: response.data.qrCode.image, // Используем изображение QR-кода
        amount: response.data.amount || cartStore.totalAmount,
        sbpOrderId: response.data.sbpOrderId,
        qrPayload: response.data.qrCode.payload, // Сохраняем payload для открытия в банке
        expiresAt: response.data.expiresAt
      },
      orderNumber: response.data.orderNumber || orderId,
      onSuccess: () => {
        cartStore.clearCart();
        navigation.replace('OrderSuccess', { 
          orderId,
          deliveryType,
          orderNumber: response.data.orderNumber || orderId,
          deliveryDate: deliveryType === 'delivery' ? deliveryDate : null
        });
      }
    });
  } else {
          cartStore.clearCart();
          navigation.replace('OrderSuccess', { 
            orderId,
            deliveryType,
             orderNumber: response.data.orderNumber || orderId,
            deliveryDate: deliveryType === 'delivery' ? deliveryDate : null
          });
        }
      } else {
        throw new Error(response.data?.message || 'Не удалось создать заказ');
      }
    } catch (error) {
      console.error('Ошибка оформления заказа:', error);
      Alert.alert(
        'Ошибка', 
        error.response?.data?.message || 'Не удалось оформить заказ. Попробуйте позже.'
      );
    } finally {
      setLoading(false);
    }
  };

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

  // Добавляем отступ снизу для TabBar
  const tabBarHeight = Platform.select({
    ios: 88 + insets.bottom,
    android: 56 + insets.bottom,
  });

  // Рендер подсказки адреса
  const renderAddressSuggestion = ({ item }) => (
    <TouchableOpacity
      style={styles.addressSuggestion}
      onPress={() => selectAddress(item)}
    >
      <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
      <View style={styles.addressSuggestionContent}>
        <Text style={styles.addressSuggestionText} numberOfLines={2}>
          {item.value}
        </Text>
        {item.data.city && (
          <Text style={styles.addressSuggestionCity}>
            {item.data.city}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader 
        title="Оформление заказа"
        leftIcon="arrow-back"
        backgroundColor={colors.card}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingBottom: tabBarHeight + 20 }
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Информация о магазине */}
            {selectedStore ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Магазин</Text>
                <View style={styles.storeInfo}>
                  <View style={styles.storeIconContainer}>
                    <Ionicons name="storefront" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.storeDetails}>
                    <Text style={styles.storeName}>{selectedStore.name}</Text>
                    <Text style={styles.storeAddress}>{selectedStore.address}</Text>
                    {selectedStore.workingHours && (
                      <Text style={styles.storeHours}>{selectedStore.workingHours}</Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.changeStoreButton}
                  onPress={() => navigation.navigate('StoreSelection', { 
                    onSelectStore: (store) => {
                      cartStore.setSelectedStore(store);
                      authStore.setSelectedStore && authStore.setSelectedStore(store);
                    }
                  })}
                >
                  <Text style={styles.changeStoreButtonText}>Изменить магазин</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.errorText}>Не удалось загрузить информацию о магазине</Text>
              </View>
            )}

            {/* Контактные данные */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Контактные данные</Text>
              
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ваше имя"
                  placeholderTextColor={colors.placeholder}
                  value={name}
                  onChangeText={setName}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Номер телефона"
                  placeholderTextColor={colors.placeholder}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={colors.placeholder}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
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
                    size={20} 
                    color={deliveryType === 'pickup' ? colors.primary : colors.textSecondary} 
                  />
                  <Text style={[
                    styles.deliveryOptionText,
                    deliveryType === 'pickup' && { color: colors.primary }
                  ]}>
                    Самовывоз
                  </Text>
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
                    size={20} 
                    color={deliveryType === 'delivery' ? colors.primary : colors.textSecondary} 
                  />
                  <Text style={[
                    styles.deliveryOptionText,
                    deliveryType === 'delivery' && { color: colors.primary }
                  ]}>
                    Доставка
                  </Text>
                </TouchableOpacity>
              </View>
              
              {deliveryType === 'delivery' && (
                <>
                  <View style={styles.addressInputContainer}>
                    <TextInput
                      style={[styles.input, styles.addressInput]}
                      placeholder="Начните вводить адрес доставки"
                      placeholderTextColor={colors.placeholder}
                      value={address}
                      onChangeText={handleAddressChange}
                    />
                    {searchingAddress && (
                      <ActivityIndicator 
                        size="small" 
                        color={colors.primary} 
                        style={styles.addressLoader}
                      />
                    )}
                  </View>
                  
                  {selectedAddress && (
                    <View style={styles.selectedAddressContainer}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                      <Text style={styles.selectedAddressText}>
                        Адрес выбран
                      </Text>
                    </View>
                  )}
                  
                  {showAddressSuggestions && addressSuggestions.length > 0 && (
                    <View style={styles.addressSuggestionsContainer}>
                      <FlatList
                        data={addressSuggestions}
                        renderItem={renderAddressSuggestion}
                        keyExtractor={(item) => item.value}
                        style={styles.addressSuggestionsList}
                        scrollEnabled={false}
                      />
                    </View>
                  )}
                  
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                    <Text style={styles.dateText}>Дата доставки: {formatDate(deliveryDate)}</Text>
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
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
                    paymentMethod === 'cash' && styles.paymentOptionActive
                  ]}
                  onPress={() => setPaymentMethod('cash')}
                >
                  <Ionicons 
                    name="cash-outline" 
                    size={20} 
                    color={paymentMethod === 'cash' ? colors.primary : colors.textSecondary} 
                  />
                  <Text style={[
                    styles.paymentOptionText,
                    paymentMethod === 'cash' && { color: colors.primary }
                  ]}>
                    Наличными
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    paymentMethod === 'card' && styles.paymentOptionActive
                  ]}
                  onPress={() => setPaymentMethod('card')}
                >
                  <Ionicons 
                    name="card-outline" 
                    size={20} 
                    color={paymentMethod === 'card' ? colors.primary : colors.textSecondary} 
                  />
                  <Text style={[
                    styles.paymentOptionText,
                    paymentMethod === 'card' && { color: colors.primary }
                  ]}>
                    Картой при получении
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    styles.paymentOptionFull,
                    paymentMethod === 'sbp' && styles.paymentOptionActive
                  ]}
                  onPress={() => setPaymentMethod('sbp')}
                >
                  <Ionicons 
                    name="qr-code-outline" 
                    size={20} 
                    color={paymentMethod === 'sbp' ? colors.primary : colors.textSecondary} 
                  />
                  <Text style={[
                    styles.paymentOptionText,
                    paymentMethod === 'sbp' && { color: colors.primary }
                  ]}>
                    СБП (Система быстрых платежей)
                  </Text>
                </TouchableOpacity>
              </View>
              
              {paymentMethod === 'sbp' && (
                <View style={styles.paymentNotice}>
                  <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                  <Text style={styles.paymentNoticeText}>
                    После оформления заказа вам будет показан QR-код для оплаты через приложение вашего банка
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
                placeholderTextColor={colors.placeholder}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Итоговая сумма */}
            <View style={styles.totalSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Товары ({cartStore.items.length})</Text>
                <Text style={styles.totalValue}>{cartStore.totalAmount} ₽</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Доставка</Text>
                <Text style={styles.totalValue}>{deliveryType === 'delivery' ? '300 ₽' : 'Бесплатно'}</Text>
              </View>
              <View style={[styles.totalRow, styles.totalRowFinal]}>
                <Text style={styles.totalFinalLabel}>Итого</Text>
                <Text style={styles.totalFinalValue}>
                  {cartStore.totalAmount + (deliveryType === 'delivery' ? 300 : 0)} ₽
                </Text>
              </View>
            </View>

            {/* Кнопка оформления */}
            <TouchableOpacity
              style={[styles.checkoutButton, loading && styles.checkoutButtonDisabled]}
              onPress={handleCheckout}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.checkoutButtonText}>
                  Оформить заказ
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
});

const themedStyles = (colors, theme) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme === 'dark' ? 0.2 : 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  storeDetails: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  storeAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  storeHours: {
    fontSize: 13,
    color: colors.primary,
  },
  changeStoreButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  changeStoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 20,
    paddingBottom: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  addressInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 10,
    paddingBottom: 10,
    position: 'relative',
  },
  addressInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  addressLoader: {
    marginLeft: 10,
  },
  addressSuggestionsContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 0,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addressSuggestionsList: {
    maxHeight: 160,
  },
  addressSuggestion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  addressSuggestionContent: {
    flex: 1,
    marginLeft: 10,
  },
  addressSuggestionText: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 2,
  },
  addressSuggestionCity: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  selectedAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  selectedAddressText: {
    fontSize: 14,
    color: colors.success,
    marginLeft: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 6,
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    marginLeft: 10,
  },
  deliveryOptions: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  deliveryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginRight: 12,
  },
  deliveryOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  deliveryOptionText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginLeft: 8,
    fontWeight: '500',
  },
  paymentOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginRight: 10,
    marginBottom: 10,
  },
  paymentOptionFull: {
    minWidth: width * 0.44,
    flexGrow: 1,
  },
  paymentOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  paymentOptionText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginLeft: 8,
    fontWeight: '500',
  },
  paymentNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: 8,
  },
  paymentNoticeText: {
    fontSize: 13,
    color: colors.primary,
    marginLeft: 10,
    flex: 1,
  },
  commentInput: {
    minHeight: 60,
    textAlignVertical: 'top',
    paddingTop: 10,
    paddingBottom: 10,
  },
  totalSection: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme === 'dark' ? 0.18 : 0.07,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalRowFinal: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  totalFinalLabel: {
    fontSize: 17,
    color: colors.text,
    fontWeight: '700',
  },
  totalFinalValue: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
  checkoutButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  checkoutButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  checkoutButtonDisabled: {
    opacity: 0.7,
  },
});

export default CheckoutScreen;