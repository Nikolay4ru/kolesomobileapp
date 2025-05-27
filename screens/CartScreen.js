import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Alert,
  ScrollView,
  Animated,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { useStores } from '../useStores';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Swipeable } from 'react-native-gesture-handler';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

const CartScreen = observer(({ navigation }) => {
  const { cartStore, authStore } = useStores();
  const [loading, setLoading] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [deliveryOption, setDeliveryOption] = useState('pickup');
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [stores, setStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [updatingItems, setUpdatingItems] = useState({});
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSwiping, setIsSwiping] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef(null);
  const flatListRef = useRef(null);

  // Refs для управления скроллом магазинов
  const storeScrollViewRef = useRef(null);
  const storeItemRefs = useRef({});
  const storePositions = useRef({});
  const isScrolling = useRef(false);
  const currentScrollPosition = useRef(0);
  const shouldRestoreScroll = useRef(false);
  const isUpdatingQuantity = useRef(false);

  const tabBarHeight = useBottomTabBarHeight();

  // Загрузка корзины
  useEffect(() => {
    const loadData = async () => {
      try {
        await cartStore.loadCart(authStore.token);
        setLoading(false);
      } catch (error) {
        Alert.alert('Ошибка', 'Не удалось загрузить корзину');
        setLoading(false);
      }
    };
    loadData();
  }, [authStore.token, forceUpdate]);

  // Загрузка магазинов
  useEffect(() => {
    const loadStores = async () => {
      if (!authStore.token || cartStore.items.length === 0) return;
      
      // Не перезагружаем магазины, если обновляем количество
      if (isUpdatingQuantity.current) return;
      
      setLoadingStores(true);
      try {
        const response = await fetch('https://api.koleso.app/api/stores.php', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authStore.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            productIds: cartStore.items.map(item => item.product_id),
            lat: null,
            lng: null
          })
        });
        
        const data = await response.json();
        if (data.success && data.data?.stores) {
          const normalizedStores = data.data.stores.map(store => ({
            ...store,
            stock_info: store.stock_info?.map(item => ({
              ...item,
              product_id: item.product_id.toString(),
              in_stock: parseInt(item.in_stock) || 0
            })) || []
          }));
          
          setStores(normalizedStores);
        }
      } catch (error) {
        console.error('Ошибка загрузки магазинов:', error);
      } finally {
        setLoadingStores(false);
      }
    };
    
    loadStores();
  }, [authStore.token, cartStore.items, deliveryOption]);

  // Проверка действительности промокода для выбранных товаров
  const checkPromoValidity = useCallback(() => {
    if (!appliedPromo) return true;
    
    if (!appliedPromo.validItems || appliedPromo.validItems.length === 0) {
      return true;
    }
    
    const hasValidItems = selectedItems.some(itemId => {
      return appliedPromo.validItems.includes(itemId.toString());
    });
    
    return hasValidItems;
  }, [appliedPromo, selectedItems]);

  // Эффект для проверки валидности промокода при изменении выбранных товаров
  useEffect(() => {
    if (appliedPromo && !checkPromoValidity()) {
      Alert.alert(
        'Промокод не действителен',
        'Выбранные товары не подходят под условия промокода'
      );
      clearPromo();
    }
  }, [selectedItems, appliedPromo, checkPromoValidity]);

  // Обновление при фокусе
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setForceUpdate(prev => !prev);
    });
    return unsubscribe;
  }, [navigation]);

  // Обработчик изменения способа доставки
  const handleDeliveryOptionChange = useCallback((option) => {
    setDeliveryOption(option);
    if (option === 'delivery') {
      setSelectedStoreId(null);
    }
  }, []);

  // Обработчик выбора магазина
  const handleStoreSelect = useCallback((storeId) => {
    if (isScrolling.current) return;
    
    setSelectedStoreId(storeId);
    
    // Центрируем выбранный магазин с анимацией
    requestAnimationFrame(() => {
      if (storePositions.current[storeId] && storeScrollViewRef.current) {
        const { x, width } = storePositions.current[storeId];
        const scrollViewWidth = Dimensions.get('window').width;
        const scrollToX = x - (scrollViewWidth / 2) + (width / 2);
        
        isScrolling.current = true;
        storeScrollViewRef.current.scrollTo({
          x: Math.max(0, scrollToX),
          y: 0,
          animated: true
        });
        
        setTimeout(() => {
          isScrolling.current = false;
        }, 300);
      }
    });
  }, []);

  // Проверка доступности товара
  const checkAvailability = useCallback((productId, requiredQuantity = 1) => {
    if (!stores || stores.length === 0) return false;
    
    if (deliveryOption === 'delivery') {
      const warehouse = stores.find(store => store.id === 8);
      if (!warehouse) return false;
      
      const stockItem = warehouse?.stock_info?.find(
        si => si.product_id.toString() === productId.toString()
      );
      return stockItem ? stockItem.in_stock >= requiredQuantity : false;
    }

    if (!selectedStoreId) return false;
    
    const store = stores.find(s => s.id === selectedStoreId);
    if (!store) return false;
    
    const stockItem = store.stock_info?.find(
      item => item.product_id.toString() === productId.toString()
    );
    
    if (stockItem && stockItem.in_stock >= requiredQuantity) {
      return true;
    }
    
    // Проверяем комбинацию магазин + склад
    const warehouse = stores.find(store => store.id === 8);
    const warehouseStockItem = warehouse?.stock_info?.find(
      si => si.product_id.toString() === productId.toString()
    );
    
    const totalAvailable = (stockItem?.in_stock || 0) + (warehouseStockItem?.in_stock || 0);
    return totalAvailable >= requiredQuantity;
  }, [deliveryOption, selectedStoreId, stores]);

  // Получение доступного количества товара
  const getAvailableQuantity = useCallback((productId) => {
    if (deliveryOption === 'delivery') {
      const warehouse = stores.find(store => store.id === 8);
      const stockItem = warehouse?.stock_info?.find(
        si => si.product_id.toString() === productId.toString()
      );
      if(stockItem?.in_stock >= 20) return 20;
      return stockItem?.in_stock || 0;
    }
    
    if (!selectedStoreId) return 0;
    
    const store = stores.find(s => s.id === selectedStoreId);
    if (!store) return 0;
    
    const stockItem = store.stock_info?.find(
      item => item.product_id.toString() === productId.toString()
    );
    
    const warehouse = stores.find(store => store.id === 8);
    const warehouseStockItem = warehouse?.stock_info?.find(
      si => si.product_id.toString() === productId.toString()
    );
    
    const totalAvailable = (stockItem?.in_stock || 0) + (warehouseStockItem?.in_stock || 0);
    return totalAvailable >= 20 ? 20 : totalAvailable;
  }, [deliveryOption, selectedStoreId, stores]);

  // Получение статуса доставки
  const getDeliveryStatus = useCallback((productId, requiredQuantity = 1) => {
    if (deliveryOption === 'delivery') return '1-2 дня';
    if (!selectedStoreId) return 'Недоступно';
    
    const store = stores.find(s => s.id === selectedStoreId);
    if (!store) return 'Недоступно';
    
    const stockItem = store.stock_info?.find(
      item => item.product_id.toString() === productId.toString()
    );
    
    const warehouse = stores.find(store => store.id === 8);
    const warehouseStockItem = warehouse?.stock_info?.find(
      si => si.product_id.toString() === productId.toString()
    );
    
    if (stockItem && stockItem.in_stock >= requiredQuantity) return 'Сегодня';
    if (stockItem && warehouseStockItem && 
        (stockItem.in_stock + warehouseStockItem.in_stock) >= requiredQuantity) return 'до 7 дней';
    if (warehouseStockItem && warehouseStockItem.in_stock >= requiredQuantity) return 'до 7 дней';
    
    return 'Недоступно';
  }, [deliveryOption, selectedStoreId, stores]);

  // Переключение выбора товара
  const toggleSelectItem = useCallback((itemId) => {
    if (isSwiping) return;
    
    const item = cartStore.items.find(i => i.id === itemId);
    if (!item) return;

    const isCurrentlySelected = selectedItems.includes(itemId);
    
    if (isCurrentlySelected) {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
      return;
    }

    if (!checkAvailability(item.product_id, item.quantity)) {
      Alert.alert(
        'Недостаточно товара',
        `Выберите другой магазин, или измените количество. С этого магазина можно заказать не более ${getAvailableQuantity(item.product_id)} шт.`
      );
      return;
    }
  
    setSelectedItems(prev => [...prev, itemId]);
  }, [isSwiping, cartStore.items, checkAvailability, getAvailableQuantity, selectedItems]);

  // Очистка выбранных товаров при удалении из корзины
  useEffect(() => {
    setSelectedItems(prev => {
      const validItems = prev.filter(itemId => 
        cartStore.items.some(item => item.id === itemId)
      );
      return validItems;
    });
  }, [cartStore.items]);

  // Обновление количества товара
  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    const item = cartStore.items.find(i => i.id === itemId);
    if (!item) return;

    const maxAvailable = getAvailableQuantity(item.product_id);
    
    if (newQuantity > maxAvailable && maxAvailable > 0) {
      newQuantity = maxAvailable;
      Alert.alert('Недостаточно товара', `Установлено максимально доступное количество: ${maxAvailable} шт.`);
    }

    try {
      setUpdatingItems(prev => ({ ...prev, [itemId]: true }));
      
      // Сохраняем текущую позицию скролла
      if (storeScrollViewRef.current) {
        currentScrollPosition.current = storeScrollViewRef.current.scrollLeft || 0;
      }
      
      // Устанавливаем флаг обновления количества
      isUpdatingQuantity.current = true;
      
      await cartStore.updateItemQuantity(itemId, newQuantity, authStore.token);
      
      // Небольшая задержка для завершения обновления
      setTimeout(() => {
        isUpdatingQuantity.current = false;
      }, 100);
      
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось обновить количество');
    } finally {
      setUpdatingItems(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // Удаление выбранных товаров
  const removeItems = async () => {
    try {
      setLoading(true);
      await cartStore.removeItems(selectedItems, authStore.token);
      setSelectedItems([]);
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось удалить товары');
    } finally {
      setLoading(false);
    }
  };

  // Удаление одного товара
  const removeSingleItem = async (itemId) => {
    try {
      await cartStore.removeItems([itemId], authStore.token);
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось удалить товар');
    }
  };

  // Проверка промокода
  const checkPromoCode = async () => {
    if (!promoCode || isCheckingPromo) return;

    setIsCheckingPromo(true);
    try {
      const response = await fetch('https://api.koleso.app/api/check-promo.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`
        },
        body: JSON.stringify({
          promoCode,
          userId: authStore.user?.id,
          cartItems: selectedItems.length > 0 ? selectedItems : cartStore.items.map(item => item.id)
        })
      });

      const result = await response.json();
      if (result.success) {
        setAppliedPromo({
          code: promoCode,
          type: result.discount_type,
          value: result.discount_value,
          validItems: result.valid_items || null
        });
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        setAppliedPromo(null);
        Alert.alert('Ошибка', result.message || 'Не удалось применить промокод');
      }
    } catch (error) {
      setAppliedPromo(null);
      Alert.alert('Ошибка', 'Не удалось проверить промокод');
    } finally {
      setIsCheckingPromo(false);
    }
  };

  // Очистка промокода
  const clearPromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
  };

  // Оформление заказа
  const checkout = async () => {
    const validSelectedItems = selectedItems.filter(itemId => 
      cartStore.items.some(item => item.id === itemId)
    );
    
    if (validSelectedItems.length === 0) {
      Alert.alert('Ошибка', 'Выберите товары для оформления');
      return;
    }
    
    if (deliveryOption === 'pickup' && !selectedStoreId) {
      Alert.alert('Выберите магазин', 'Для самовывоза необходимо выбрать магазин');
      return;
    }

    const unavailableItems = validSelectedItems.filter(itemId => {
      const item = cartStore.items.find(i => i.id === itemId);
      return item && !checkAvailability(item.product_id, item.quantity);
    });

    if (unavailableItems.length > 0) {
      Alert.alert('Ошибка', 'Некоторые товары стали недоступны');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('https://api.koleso.app/api/checkout.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`
        },
        body: JSON.stringify({
          items: validSelectedItems,
          userId: authStore.userId,
          delivery: deliveryOption,
          storeId: deliveryOption === 'pickup' ? selectedStoreId : null,
          promoCode: promoCode || null
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        await cartStore.loadCart(authStore.token);
        navigation.navigate('Checkout', { 
          items: validSelectedItems, 
          delivery: deliveryOption,  
          storeId: deliveryOption === 'pickup' ? selectedStoreId : null,
          orderId: result.orderId
        });
      } else {
        throw new Error(result.message || 'Ошибка оформления заказа');
      }
    } catch (error) {
      Alert.alert('Ошибка', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Плейсхолдер для выбора магазина
  const renderStoreSelectionPlaceholder = () => {
    if (deliveryOption !== 'pickup' || loadingStores) return null;
    
    if (!selectedStoreId && stores.length > 0) {
      return (
        <View style={styles.storeSelectionPlaceholder}>
          <Text style={styles.placeholderText}>Выберите магазин для самовывоза</Text>
        </View>
      );
    }
    
    return null;
  };

  // Расчет цены товара со скидкой
  const calculateItemDiscountPrice = useCallback((item) => {
    if (!appliedPromo) return parseFloat(item.price || 0);
    
    const isDiscountApplicable = !appliedPromo.validItems || 
      appliedPromo.validItems.includes(item.id.toString());
    
    if (!isDiscountApplicable) return parseFloat(item.price || 0);
    
    const itemPrice = parseFloat(item.price || 0);
    
    if (appliedPromo.type === 'percentage') {
      return itemPrice * (1 - parseFloat(appliedPromo.value || 0) / 100);
    } else {
      const selectedItemsData = cartStore.items.filter(i => selectedItems.includes(i.id));
      const total = selectedItemsData.reduce((sum, i) => sum + (parseFloat(i.price || 0) * parseInt(i.quantity || 1)), 0);
      if (total <= 0) return itemPrice;
      
      const itemRatio = (itemPrice * parseInt(item.quantity || 1)) / total;
      const discountValue = parseFloat(appliedPromo.value || 0) * itemRatio;
      return Math.max(0, itemPrice - discountValue);
    }
  }, [appliedPromo, cartStore.items, selectedItems]);

  // Расчет общей суммы со скидкой
  const calculateTotalWithDiscount = useMemo(() => {
    const selectedCartItems = cartStore.items.filter(item => 
      selectedItems.includes(item.id)
    );

    if (!appliedPromo) {
      return selectedCartItems.reduce(
        (sum, item) => sum + (parseFloat(item.price || 0) * parseInt(item.quantity || 1)), 
        0
      );
    }

    let itemsToApplyDiscount = selectedCartItems;
    if (appliedPromo.validItems && appliedPromo.validItems.length > 0) {
      itemsToApplyDiscount = selectedCartItems.filter(item =>
        appliedPromo.validItems.includes(item.id.toString())
      );
      
      if (itemsToApplyDiscount.length === 0) {
        return selectedCartItems.reduce(
          (sum, item) => sum + (parseFloat(item.price || 0) * parseInt(item.quantity || 1)), 
          0
        );
      }
    }

    const subtotal = selectedCartItems.reduce(
      (sum, item) => sum + (parseFloat(item.price || 0) * parseInt(item.quantity || 1)), 
      0
    );

    const discountSubtotal = itemsToApplyDiscount.reduce(
      (sum, item) => sum + (parseFloat(item.price || 0) * parseInt(item.quantity || 1)), 
      0
    );

    if (appliedPromo.type === 'percentage') {
      return subtotal - (discountSubtotal * parseFloat(appliedPromo.value || 0) / 100);
    } else {
      return Math.max(0, subtotal - parseFloat(appliedPromo.value || 0));
    }
  }, [cartStore.items, selectedItems, appliedPromo]);

  // Проверка валидности скидки
  const hasValidDiscount = useMemo(() => {
    if (!appliedPromo) return false;
    
    if (!appliedPromo.validItems || appliedPromo.validItems.length === 0) {
      return true;
    }
    
    const selectedCartItems = cartStore.items.filter(item => 
      selectedItems.includes(item.id)
    );
    
    return selectedCartItems.some(item =>
      appliedPromo.validItems.includes(item.id.toString())
    );
  }, [appliedPromo, cartStore.items, selectedItems]);

  // Общая сумма выбранных товаров
  const totalSelectedAmount = useMemo(() => {
    return selectedItems.reduce((sum, id) => {
      const item = cartStore.items.find(i => i.id === id);
      return sum + (item ? parseFloat(item.price || 0) * parseInt(item.quantity || 1) : 0);
    }, 0);
  }, [selectedItems, cartStore.items]);

  // Рендер элемента корзины
  const renderItem = useCallback(({ item }) => {
    if (!item) return null;
    
    const isSelected = selectedItems.includes(item.id);
    const isAvailable = stores.length > 0 ? checkAvailability(item.product_id, item.quantity) : true;
    const maxAvailable = getAvailableQuantity(item.product_id);
    const deliveryStatus = getDeliveryStatus(item.product_id, item.quantity);
    const discountedPrice = calculateItemDiscountPrice(item);
    const hasDiscount = appliedPromo && Math.abs(discountedPrice - item.price) > 0.01;

    const handleProductPress = () => {
      navigation.navigate('ProductModal', { 
        productId: item.product_id,
        fromCart: true,
        modal: true
      });
    };

    return (
      <Swipeable
        friction={2}
        rightThreshold={40}
        renderRightActions={() => (
          <TouchableOpacity 
            style={styles.deleteAction}
            onPress={() => removeSingleItem(item.id)}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={24} color="white" />
          </TouchableOpacity>
        )}
        onSwipeableWillOpen={() => setIsSwiping(true)}
        onSwipeableWillClose={() => setIsSwiping(false)}
      >
        <Pressable
          style={({ pressed }) => [
            styles.itemContainer,
            isSelected && styles.selectedItem,
            pressed && styles.itemPressed
          ]}
          onPress={() => toggleSelectItem(item.id)}
        >
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
          </View>

          <TouchableOpacity onPress={handleProductPress} activeOpacity={0.7}>
            <Image
              style={styles.itemImage}
              resizeMode='cover'
              source={{ uri: item.image_url }}
            />
          </TouchableOpacity>

          <View style={styles.itemInfo}>
            <TouchableOpacity onPress={handleProductPress} activeOpacity={0.7}>
              <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
            </TouchableOpacity>
            
            <View style={styles.itemDetails}>
              <View style={styles.priceContainer}>
                {hasDiscount ? (
                  <>
                    <Text style={styles.originalPrice}>{item.price}₽</Text>
                    <Text style={styles.discountedPrice}>{discountedPrice.toFixed(0)}₽</Text>
                  </>
                ) : (
                  <Text style={styles.itemPrice}>{item.price}₽</Text>
                )}
              </View>
              
              <View style={[styles.statusBadge, 
                deliveryStatus === 'Сегодня' && styles.statusToday,
                deliveryStatus === '1-2 дня' && styles.statusDelivery,
                deliveryStatus === 'до 7 дней' && styles.statusLater,
                deliveryStatus === 'Недоступно' && styles.statusUnavailable
              ]}>
                <Text style={[styles.statusText,
                  deliveryStatus === 'Недоступно' && styles.statusTextUnavailable
                ]}>
                  {deliveryStatus}
                </Text>
              </View>
            </View>

            <View style={styles.quantitySection}>
              <View style={styles.quantityControls}>
                <TouchableOpacity 
                  style={[styles.quantityButton, item.quantity <= 1 && styles.quantityButtonDisabled]}
                  onPress={() => updateQuantity(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1 || updatingItems[item.id]}
                >
                  <Ionicons name="remove" size={20} color={item.quantity <= 1 ? "#E0E0E0" : "#000"} />
                </TouchableOpacity>
                
                <View style={styles.quantityDisplay}>
                  {updatingItems[item.id] ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                  )}
                </View>
                
                <TouchableOpacity 
                  style={[styles.quantityButton, item.quantity >= maxAvailable && styles.quantityButtonDisabled]}
                  onPress={() => updateQuantity(item.id, item.quantity + 1)}
                  disabled={item.quantity >= maxAvailable || updatingItems[item.id]}
                >
                  <Ionicons name="add" size={20} color={item.quantity >= maxAvailable ? "#E0E0E0" : "#000"} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.totalPrice}>
                {(hasDiscount ? discountedPrice * item.quantity : item.price * item.quantity).toFixed(0)}₽
              </Text>
            </View>
          </View>
        </Pressable>
      </Swipeable>
    );
  }, [selectedItems, stores, checkAvailability, getAvailableQuantity, getDeliveryStatus, appliedPromo, updatingItems, navigation, toggleSelectItem, updateQuantity, removeSingleItem, calculateItemDiscountPrice]);

  // Компонент элемента магазина
  const StoreItem = React.memo(({ store, isSelected, onSelect, onLayout }) => {
    const calculateAvailability = (store) => {
      const allItems = cartStore.items;
      let allAvailable = true;
      let someAvailable = false;
      let someAvailableFromWarehouse = false;
      
      for (const item of allItems) {
        const stockItem = store.stock_info?.find(
          si => si.product_id.toString() === item.product_id.toString()
        );
        
        const warehouse = stores.find(s => s.id === 8);
        const warehouseStockItem = warehouse?.stock_info?.find(
          si => si.product_id.toString() === item.product_id.toString()
        );
        
        const totalAvailable = (stockItem?.in_stock || 0) + (warehouseStockItem?.in_stock || 0);
        
        if (totalAvailable >= item.quantity) {
          someAvailable = true;
          if (warehouseStockItem && warehouseStockItem.in_stock > 0) {
            someAvailableFromWarehouse = true;
          }
          if (!(stockItem && stockItem.in_stock >= item.quantity)) {
            allAvailable = false;
          }
        } else {
          allAvailable = false;
        }
      }
      
      if (allAvailable) return { status: 'full', text: 'Все есть' };
      if (someAvailableFromWarehouse) return { status: 'partial', text: 'Частично' };
      if (someAvailable) return { status: 'partial', text: 'Частично' };
      return { status: 'none', text: 'Нет' };
    };
    
    const availability = calculateAvailability(store);
    
    return (
      <Pressable
        style={({ pressed }) => [
          styles.storeCard,
          isSelected && styles.storeCardSelected,
          pressed && styles.storeCardPressed
        ]}
        onPress={() => onSelect(store.id)}
        onLayout={(event) => onLayout(store.id, event.nativeEvent.layout)}
      >
        <View style={styles.storeHeader}>
          <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
          <View style={[styles.availabilityDot, styles[`dot${availability.status}`]]} />
        </View>
        <Text style={styles.storeAddress} numberOfLines={2}>{store.address}</Text>
      </Pressable>
    );
  });

  // Компонент выбора магазина
  const StoreSelection = React.memo(({ stores, selectedStoreId, onStoreSelect }) => {
    const [isLayoutReady, setIsLayoutReady] = useState(false);
    const [forceScrollUpdate, setForceScrollUpdate] = useState(0);
    
    const handleStoreLayout = useCallback((storeId, layout) => {
      storePositions.current[storeId] = layout;
      
      if (Object.keys(storePositions.current).length === stores.length) {
        setIsLayoutReady(true);
      }
    }, [stores.length]);

    // Центрирование выбранного магазина после загрузки layout
    useEffect(() => {
      if (isLayoutReady && selectedStoreId && storePositions.current[selectedStoreId] && storeScrollViewRef.current) {
        const { x, width } = storePositions.current[selectedStoreId];
        const scrollViewWidth = Dimensions.get('window').width;
        const scrollToX = x - (scrollViewWidth / 2) + (width / 2);
        
        setTimeout(() => {
          if (storeScrollViewRef.current && !isUpdatingQuantity.current) {
            storeScrollViewRef.current.scrollTo({
              x: Math.max(0, scrollToX),
              y: 0,
              animated: false
            });
          }
        }, 50);
      }
    }, [isLayoutReady, selectedStoreId]);

    // Сохраняем позицию скролла при обновлении количества
    useEffect(() => {
      if (isUpdatingQuantity.current && storeScrollViewRef.current) {
        storeScrollViewRef.current.scrollTo({
          x: currentScrollPosition.current,
          y: 0,
          animated: false
        });
      }
    }, [forceScrollUpdate]);

    const handleScroll = useCallback((event) => {
      currentScrollPosition.current = event.nativeEvent.contentOffset.x;
    }, []);

    const handleMomentumScrollEnd = useCallback((event) => {
      currentScrollPosition.current = event.nativeEvent.contentOffset.x;
    }, []);

    return (
      <ScrollView
        ref={storeScrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storesContainer}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={212}
        snapToAlignment="start"
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEnabled={!isUpdatingQuantity.current}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 0
        }}
      >
        {stores.map(store => (
          <StoreItem 
            key={`store-${store.id}`}
            store={store}
            isSelected={selectedStoreId === store.id}
            onSelect={onStoreSelect}
            onLayout={handleStoreLayout}
          />
        ))}
      </ScrollView>
    );
  });

  // Компонент опций доставки
  const DeliveryOptions = React.memo(({ deliveryOption, onSelectOption }) => {
    return (
      <View style={styles.deliverySection}>
        <View style={styles.deliveryTabs}>
          <Pressable 
            style={({ pressed }) => [
              styles.deliveryTab,
              deliveryOption === 'pickup' && styles.deliveryTabActive,
              pressed && styles.deliveryTabPressed
            ]}
            onPress={() => onSelectOption('pickup')}
          >
            <Ionicons 
              name="storefront-outline" 
              size={22} 
              color={deliveryOption === 'pickup' ? '#fff' : '#999'} 
            />
            <Text style={[
              styles.deliveryTabText,
              deliveryOption === 'pickup' && styles.deliveryTabTextActive
            ]}>
              Самовывоз
            </Text>
          </Pressable>
          
          <Pressable 
            style={({ pressed }) => [
              styles.deliveryTab,
              deliveryOption === 'delivery' && styles.deliveryTabActive,
              pressed && styles.deliveryTabPressed
            ]}
            onPress={() => onSelectOption('delivery')}
          >
            <Ionicons 
              name="car-outline" 
              size={22} 
              color={deliveryOption === 'delivery' ? '#fff' : '#999'} 
            />
            <Text style={[
              styles.deliveryTabText,
              deliveryOption === 'delivery' && styles.deliveryTabTextActive
            ]}>
              Доставка
            </Text>
          </Pressable>
        </View>

        {deliveryOption === 'pickup' && (
          <Animated.View style={styles.storeSelectionContainer}>
            {loadingStores ? (
              <View style={styles.loadingStores}>
                <ActivityIndicator size="small" color="#000" />
              </View>
            ) : (
              <>
                {renderStoreSelectionPlaceholder()}
                <StoreSelection
                  stores={stores.filter(store => store.id !== 8)}
                  selectedStoreId={selectedStoreId}
                  onStoreSelect={handleStoreSelect}
                />
              </>
            )}
          </Animated.View>
        )}
      </View>
    );
  });

  // Рендер футера
  const renderFooter = () => {
    if (selectedItems.length === 0) return null;

    return (
      <View style={[styles.footer, { paddingBottom: tabBarHeight }]}>
        <View style={styles.footerContent}>
          {/* Promo Code Section */}
          {!appliedPromo && (
            <View style={styles.promoSection}>
              <TextInput
                style={styles.promoInput}
                placeholder="Есть промокод?"
                placeholderTextColor="#999"
                value={promoCode}
                onChangeText={setPromoCode}
                editable={!isCheckingPromo}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity 
                style={[
                  styles.promoButton,
                  (!promoCode || isCheckingPromo) && styles.promoButtonDisabled
                ]}
                onPress={checkPromoCode}
                disabled={!promoCode || isCheckingPromo}
              >
                {isCheckingPromo ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Ionicons name="arrow-forward" size={20} color="#000" />
                )}
              </TouchableOpacity>
            </View>
          )}

          {appliedPromo && (
            <View style={styles.promoApplied}>
              <View style={styles.promoAppliedInfo}>
                <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                <Text style={styles.promoAppliedText}>
                  Промокод "{appliedPromo.code}" • Скидка {appliedPromo.value}{appliedPromo.type === 'percentage' ? '%' : '₽'}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={clearPromo}
                style={styles.clearPromoButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={22} color="#666" />
              </TouchableOpacity>
            </View>
          )}

          {/* Total and Checkout */}
          <View style={styles.checkoutSection}>
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Итого</Text>
              <View style={styles.totalAmount}>
                {appliedPromo && hasValidDiscount && (
                  <Text style={styles.originalTotal}>
                    {totalSelectedAmount.toFixed(0)}₽
                  </Text>
                )}
                <Text style={styles.totalPrice}>
                  {calculateTotalWithDiscount.toFixed(0)}₽
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.checkoutButton, loading && styles.checkoutButtonDisabled]}
              onPress={checkout}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.checkoutButtonText}>Оформить заказ</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Выбрать все товары
  const selectAllItems = () => {
    const availableItems = cartStore.items.filter(item => 
      checkAvailability(item.product_id, item.quantity)
    );
    setSelectedItems(availableItems.map(item => item.id));
  };

  // Снять выбор со всех товаров
  const deselectAllItems = () => {
    setSelectedItems([]);
  };

  // Экран загрузки
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  // Основной рендер
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {cartStore.items.length === 0 ? (
        <View style={styles.emptyCart}>
          <View style={styles.emptyIconWrapper}>
            <Ionicons name="bag-outline" size={64} color="#E0E0E0" />
          </View>
          <Text style={styles.emptyTitle}>Корзина пуста</Text>
          <Text style={styles.emptySubtitle}>Добавьте товары для оформления заказа</Text>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.shopButtonText}>Начать покупки</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Корзина</Text>
            <View style={styles.headerActions}>
              {selectedItems.length > 0 && (
                <TouchableOpacity 
                  onPress={removeItems}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              )}
              {cartStore.items.length > 0 && (
                <TouchableOpacity onPress={selectedItems.length === cartStore.items.length ? deselectAllItems : selectAllItems}>
                  <Text style={styles.selectAllButton}>
                    {selectedItems.length === cartStore.items.length ? 'Снять выбор' : 'Выбрать все'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Main Content */}
          <FlatList
            ref={flatListRef}
            data={cartStore.items}
            renderItem={renderItem}
            keyExtractor={item => `cart-${item.id}`}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <DeliveryOptions 
                deliveryOption={deliveryOption}
                onSelectOption={handleDeliveryOptionChange}
              />
            }
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            removeClippedSubviews={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={21}
            updateCellsBatchingPeriod={50}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 0
            }}
          />

          {/* Footer */}
          {renderFooter()}
        </>
      )}
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Empty State
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrapper: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  shopButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: '#4A9B8E',
    borderRadius: 30,
  },
  shopButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  deleteButton: {
    padding: 8,
  },
  selectAllButton: {
    fontSize: 16,
    color: '#666',
  },

  // List
  listContent: {
    paddingBottom: 180,
  },
  separator: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginHorizontal: 16,
  },

  // Delivery Options
  deliverySection: {
    paddingVertical: 16,
    backgroundColor: '#FAFAFA',
  },
  deliveryTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  deliveryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFF',
    gap: 8,
  },
  deliveryTabActive: {
    backgroundColor: '#4A9B8E',
  },
  deliveryTabPressed: {
    opacity: 0.8,
  },
  deliveryTabText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  deliveryTabTextActive: {
    color: '#FFF',
  },

  // Store Selection
  storeSelectionContainer: {
    marginTop: 16,
  },
  loadingStores: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  storesContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  storeCard: {
    width: 200,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFF',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  storeCardSelected: {
    borderColor: '#000',
    backgroundColor: '#FAFAFA',
  },
  storeCardPressed: {
    opacity: 0.9,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  storeAddress: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotfull: {
    backgroundColor: '#4CAF50',
  },
  dotpartial: {
    backgroundColor: '#FFA726',
  },
  dotnone: {
    backgroundColor: '#EF5350',
  },

  // Cart Item
  itemContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  selectedItem: {
    backgroundColor: '#FAFAFA',
  },
  itemPressed: {
    backgroundColor: '#F5F5F5',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
    lineHeight: 22,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  originalPrice: {
    fontSize: 16,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  discountedPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF3B30',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
  },
  statusToday: {
    backgroundColor: '#E8F5E9',
  },
  statusDelivery: {
    backgroundColor: '#E3F2FD',
  },
  statusLater: {
    backgroundColor: '#FFF3E0',
  },
  statusUnavailable: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  statusTextUnavailable: {
    color: '#D32F2F',
  },
  quantitySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  quantityButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.3,
  },
  quantityDisplay: {
    minWidth: 40,
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },

  // Delete Action
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  footerContent: {
    padding: 16,
  },
  promoSection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  promoInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000',
  },
  promoButton: {
    width: 48,
    height: 48,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoButtonDisabled: {
    opacity: 0.5,
  },
  promoApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  promoAppliedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promoAppliedText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2E7D32',
  },
  checkoutSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalSection: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  totalAmount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  originalTotal: {
    fontSize: 18,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  totalPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  checkoutButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: '#4A9B8E',
    borderRadius: 30,
  },
  checkoutButtonDisabled: {
    opacity: 0.5,
  },
  checkoutButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  clearPromoButton: {
    padding: 4,
  },
  storeSelectionPlaceholder: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});

export default CartScreen;