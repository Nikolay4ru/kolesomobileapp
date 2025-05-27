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
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { useStores } from '../useStores';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Swipeable } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');

// Вынесенные компоненты для оптимизации
const StoreItem = React.memo(({ store, isSelected, onSelect }) => {
  const handlePress = useCallback(() => {
    onSelect?.(store.id);
  }, [onSelect, store.id]);

  return (
    <TouchableOpacity
      style={[
        styles.storeItem,
        isSelected && styles.storeItemActive,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.storeHeader}>
        <Text style={styles.storeName}>{store.name}</Text>
        {isSelected && <Ionicons name="checkmark-circle" size={20} color="#FF6C00" />}
      </View>
      <Text style={styles.storeAddress} numberOfLines={2}>{store.address}</Text>
      <Text style={styles.storeDistance}>
        {store.distance ? `${store.distance.toFixed(1)} км` : 'Расстояние неизвестно'}
      </Text>
      <View style={styles.availabilityBadge}>
        <Text style={[
          styles.availabilityText,
          styles[`availability${store.availability?.charAt(0).toUpperCase() + store.availability?.slice(1)}`]
        ]}>
          {store.availability === 'full' ? 'Все в наличии' : 
           store.availability === 'high' ? 'Большинство' :
           store.availability === 'medium' ? 'Часть' : 
           store.availability === 'low' ? 'Мало' : 'Нет'}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const StoreSelection = React.memo(({ stores, selectedStoreId, onStoreSelect, loadingStores }) => {
  const scrollViewRef = useRef(null);
  const scrollPosition = useRef(0);
  const itemWidth = 180 + 12;
  const [initialized, setInitialized] = useState(false);

  const handleScroll = (event) => {
    scrollPosition.current = event.nativeEvent.contentOffset.x;
  };

  useEffect(() => {
    if (initialized || !selectedStoreId || !scrollViewRef.current) return;
    
    const storeIndex = stores.findIndex(store => store.id === selectedStoreId);
    if (storeIndex === -1) return;

    const scrollTo = storeIndex * itemWidth - (width / 2 - itemWidth / 2);
    
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({
        x: Math.max(0, scrollTo),
        animated: true
      });
      setInitialized(true);
    });
  }, [selectedStoreId, initialized]);

  useEffect(() => {
    if (!initialized || !scrollViewRef.current || scrollPosition.current === 0) return;
    scrollViewRef.current.scrollTo({ x: scrollPosition.current, animated: false });
  }, [stores]);

  if (loadingStores) return <ActivityIndicator size="small" color="#FF6C00" />;
  if (stores.length === 0) return <Text style={styles.noStoresText}>Нет доступных магазинов</Text>;

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.storesContainer}
      decelerationRate="fast"
      snapToInterval={itemWidth}
      snapToAlignment="center"
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      {stores.map(store => (
        <StoreItem 
          key={`store-${store.id}`}
          store={store}
          isSelected={selectedStoreId === store.id}
          onSelect={onStoreSelect}
        />
      ))}
    </ScrollView>
  );
}, (prev, next) => (
  prev.loadingStores === next.loadingStores &&
  prev.selectedStoreId === next.selectedStoreId &&
  prev.stores === next.stores &&
  prev.onStoreSelect === next.onStoreSelect
));

const DeliveryOptions = React.memo(({ 
  deliveryOption, 
  onSelectOption,
  storeSelectionProps 
}) => {
  return (
    <View style={styles.deliveryOptionsContainer}>
      <Text style={styles.sectionTitle}>Способ получения</Text>
      
      <TouchableOpacity 
        style={[
          styles.deliveryOption, 
          deliveryOption === 'pickup' && styles.deliveryOptionActive
        ]}
        onPress={() => onSelectOption('pickup')}
      >
        <Ionicons name="storefront-outline" size={24} color={deliveryOption === 'pickup' ? '#FF6C00' : '#666'} />
        <View style={styles.deliveryOptionText}>
          <Text style={styles.deliveryOptionTitle}>Самовывоз из магазина</Text>
          <Text style={styles.deliveryOptionSubtitle}>Бесплатно, сегодня-завтра</Text>
        </View>
        <Ionicons name="checkmark-circle" size={24} color={deliveryOption === 'pickup' ? '#FF6C00' : '#DDD'} />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[
          styles.deliveryOption, 
          deliveryOption === 'delivery' && styles.deliveryOptionActive
        ]}
        onPress={() => onSelectOption('delivery')}
      >
        <Ionicons name="car-outline" size={24} color={deliveryOption === 'delivery' ? '#FF6C00' : '#666'} />
        <View style={styles.deliveryOptionText}>
          <Text style={styles.deliveryOptionTitle}>Доставка</Text>
          <Text style={styles.deliveryOptionSubtitle}>1-3 дня, от 0₽</Text>
        </View>
        <Ionicons name="checkmark-circle" size={24} color={deliveryOption === 'delivery' ? '#FF6C00' : '#DDD'} />
      </TouchableOpacity>
      
      {deliveryOption === 'pickup' && (
        <View style={styles.storeSelection}>
          <Text style={styles.storeSelectionTitle}>Выберите магазин</Text>
          <StoreSelection {...storeSelectionProps} />
        </View>
      )}
    </View>
  );
});

const CartScreen = observer(({ navigation }) => {
  const { cartStore, authStore } = useStores();
  const [deliveryOption, setDeliveryOption] = useState('pickup');
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [stores, setStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [updatingItems, setUpdatingItems] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSwiping, setIsSwiping] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [forceUpdate, setForceUpdate] = useState(false);

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await cartStore.loadCart(authStore.token);
        await loadStores();
      } catch (error) {
        Alert.alert('Ошибка', 'Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [authStore.token, forceUpdate]);

  const loadStores = async () => {
    if (!authStore.token || cartStore.items.length === 0) return;
    
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
      if (data.success) {
        setStores(data.data.stores.map(store => ({
          ...store,
          stock_info: store.stock_info.map(item => ({
            ...item,
            product_id: item.product_id.toString(),
            in_stock: parseInt(item.in_stock) || 0
          }))
        })));
      }
    } catch (error) {
      console.error('Ошибка загрузки магазинов:', error);
    } finally {
      setLoadingStores(false);
    }
  };

  const handleStoreSelect = useCallback((storeId) => {
    setSelectedStoreId(storeId);
  }, []);

  const getAvailableQuantity = useCallback((productId) => {
    if (deliveryOption === 'delivery') {
      const warehouse = stores.find(store => store.id === 8);
      const stockItem = warehouse?.stock_info?.find(
        si => si.product_id.toString() === productId.toString()
      );
      return stockItem?.in_stock || 0;
    }
    
    const store = stores.find(s => s.id === selectedStoreId);
    const stockItem = store?.stock_info?.find(
      item => item.product_id.toString() === productId.toString()
    );
    
    return stockItem?.in_stock || 0;
  }, [deliveryOption, selectedStoreId, stores]);

  const isItemAvailable = useCallback((productId, requiredQuantity = 1) => {
    const available = getAvailableQuantity(productId);
    return available >= requiredQuantity;
  }, [getAvailableQuantity]);

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1 || newQuantity > 20) return;
    
    const item = cartStore.items.find(i => i.id === itemId);
    if (!item) return;

    if (!isItemAvailable(item.product_id, newQuantity)) {
      Alert.alert('Недостаточно товара', `Доступно: ${getAvailableQuantity(item.product_id)} шт.`);
      return;
    }

    try {
      setUpdatingItems(prev => ({ ...prev, [itemId]: true }));
      await cartStore.updateItemQuantity(itemId, newQuantity, authStore.token);
      setForceUpdate(prev => !prev);
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось обновить количество');
    } finally {
      setUpdatingItems(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const toggleSelectItem = useCallback((itemId) => {
    if (isSwiping) return;
    
    const item = cartStore.items.find(i => i.id === itemId);
    if (!item || !isItemAvailable(item.product_id, item.quantity)) {
      Alert.alert('Недостаточно товара', `Доступно: ${getAvailableQuantity(item.product_id)} шт.`);
      return;
    }
  
    setSelectedItems(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  }, [isSwiping, isItemAvailable]);

  const removeItems = async () => {
    try {
      setLoading(true);
      await cartStore.removeItems(selectedItems, authStore.token);
      setSelectedItems([]);
      setForceUpdate(prev => !prev);
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось удалить товары');
    } finally {
      setLoading(false);
    }
  };

  const removeSingleItem = async (itemId) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(async () => {
      try {
        await cartStore.removeItems([itemId], authStore.token);
        setSelectedItems(prev => prev.filter(id => id !== itemId));
        setForceUpdate(prev => !prev);
      } catch (error) {
        Alert.alert('Ошибка', 'Не удалось удалить товар');
      }
    });
  };

  const renderRightActions = (progress, dragX, itemId) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0.9],
      extrapolate: 'clamp',
    });
    
    return (
      <TouchableOpacity 
        onPress={() => removeSingleItem(itemId)}
        style={styles.deleteButton}
      >
        <Animated.View style={[styles.deleteBox, { transform: [{ scale }] }]}>
          <Ionicons name="trash-bin" size={24} color="white" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const checkout = async () => {
    if (selectedItems.length === 0) {
      Alert.alert('Ошибка', 'Выберите товары для оформления');
      return;
    }
    
    if (deliveryOption === 'pickup' && !selectedStoreId) {
      Alert.alert('Ошибка', 'Выберите магазин для самовывоза');
      return;
    }
    
    const unavailableItems = selectedItems.filter(itemId => {
      const item = cartStore.items.find(i => i.id === itemId);
      return item && !isItemAvailable(item.product_id, item.quantity);
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
          items: selectedItems,
          userId: authStore.userId,
          deliveryOption,
          storeId: deliveryOption === 'pickup' ? selectedStoreId : null
        })
      });
  
      const result = await response.json();
      if (response.ok) {
        navigation.navigate('OrderSuccess', { orderId: result.orderId });
        cartStore.clearCart();
      } else {
        throw new Error(result.message || 'Ошибка оформления');
      }
    } catch (error) {
      Alert.alert('Ошибка', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedItems.includes(item.id);
    const isAvailable = isItemAvailable(item.product_id);
    const maxAvailable = getAvailableQuantity(item.product_id);
    const isUpdating = updatingItems[item.id];

    return (
      <Swipeable
        friction={2}
        rightThreshold={40}
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item.id)}
        onSwipeableWillOpen={() => setIsSwiping(true)}
        onSwipeableWillClose={() => setIsSwiping(false)}
      >
        <Animated.View style={[styles.itemContainer, isSelected && styles.selectedItem]}>
          <TouchableOpacity 
            style={styles.selectButton}
            onPress={() => toggleSelectItem(item.id)}
            disabled={!isAvailable}
          >
            <Ionicons 
              name={isSelected ? "checkbox" : "square-outline"} 
              size={24} 
              color={!isAvailable ? "#DDD" : isSelected ? "#FF6C00" : "#DDD"} 
            />
          </TouchableOpacity>

          <Image
            style={styles.itemImage}
            resizeMode='contain'
            source={{ uri: item.image_url }}
          />

          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.itemBrand}>{item.brand}</Text>
            
            {!isAvailable && (
              <Text style={styles.unavailableNotice}>Товар отсутствует в выбранном магазине</Text>
            )}
            
            <View style={styles.priceRow}>
              <Text style={styles.itemPrice}>{item.price} ₽</Text>
              <Text style={styles.totalPrice}>{item.price * item.quantity} ₽</Text>
            </View>
            
            <View style={styles.quantityContainer}>
              <TouchableOpacity 
                onPress={() => updateQuantity(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1 || isUpdating}
              >
                <Ionicons 
                  name="remove" 
                  size={20} 
                  color={item.quantity <= 1 ? "#DDD" : "#FF6C00"} 
                />
              </TouchableOpacity>
              
              {isUpdating ? (
                <ActivityIndicator size="small" color="#FF6C00" />
              ) : (
                <Text style={styles.quantity}>{item.quantity}</Text>
              )}
              
              <TouchableOpacity 
                onPress={() => updateQuantity(item.id, item.quantity + 1)}
                disabled={item.quantity >= maxAvailable || isUpdating}
              >
                <Ionicons 
                  name="add" 
                  size={20} 
                  color={item.quantity >= maxAvailable ? "#DDD" : "#FF6C00"} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Swipeable>
    );
  };

  const totalSelectedAmount = useMemo(() => 
    selectedItems.reduce((sum, id) => {
      const item = cartStore.items.find(i => i.id === id);
      return sum + (item ? item.price * item.quantity : 0);
    }, 0),
    [selectedItems, cartStore.items]
  );

  const storeSelectionProps = useMemo(() => ({
    stores: stores.filter(store => store.id !== 8),
    selectedStoreId,
    onStoreSelect: handleStoreSelect,
    loadingStores
  }), [stores, selectedStoreId, handleStoreSelect, loadingStores]);

  const deliveryOptionsProps = useMemo(() => ({
    deliveryOption,
    onSelectOption: setDeliveryOption,
    storeSelectionProps
  }), [deliveryOption, storeSelectionProps]);

  if (loading && cartStore.items.length === 0) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#FF6C00" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {cartStore.items.length === 0 ? (
        <View style={styles.emptyCart}>
          <Ionicons name="cart-outline" size={64} color="#EEE" />
          <Text style={styles.emptyText}>Ваша корзина пуста</Text>
          <TouchableOpacity 
            style={styles.continueShoppingButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.continueShoppingText}>Продолжить покупки</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cartStore.items}
            renderItem={renderItem}
            keyExtractor={item => `cart-${item.id}`}
            contentContainerStyle={styles.list}
            ListHeaderComponent={<DeliveryOptions {...deliveryOptionsProps} />}
            showsVerticalScrollIndicator={false}
          />

          {selectedItems.length > 0 && (
            <View style={styles.footer}>
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryText}>Выбрано {selectedItems.length} товара</Text>
                <Text style={styles.summaryAmount}>{totalSelectedAmount} ₽</Text>
              </View>
              
              <View style={styles.actionsRow}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.removeButton]}
                  onPress={removeItems}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FF3B30" />
                  ) : (
                    <Text style={[styles.buttonText, { color: '#FF3B30' }]}>Удалить</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionButton, styles.checkoutButton]}
                  onPress={checkout}
                  disabled={loading}
                >
                  <Text style={[styles.buttonText, { color: 'white' }]}>Оформить</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
    marginTop: 16,
    marginBottom: 24,
  },
  continueShoppingButton: {
    backgroundColor: '#FF6C00',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  continueShoppingText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  list: {
    padding: 16,
    paddingBottom: 20,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedItem: {
    backgroundColor: '#FFF9F2',
    borderColor: '#FF6C00',
  },
  selectButton: {
    marginRight: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemBrand: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemPrice: {
    fontSize: 16,
    color: '#666',
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6C00',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  quantityButton: {
    padding: 6,
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'flex-end',
    borderRadius: 12,
    marginBottom: 12,
    paddingRight: 20,
    height: '80%',
    marginTop: 10,
  },
  deleteBox: {
    width: 60,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 16,
    color: '#666',
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6C00',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    backgroundColor: '#FFF0F0',
    marginRight: 8,
  },
  checkoutButton: {
    backgroundColor: '#FF6C00',
    marginLeft: 8,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  deliveryOptionsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  deliveryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  deliveryOptionActive: {
    borderColor: '#FF6C00',
    backgroundColor: '#FFF9F2',
  },
  deliveryOptionText: {
    flex: 1,
    marginLeft: 12,
  },
  deliveryOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  deliveryOptionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  storeSelection: {
    marginTop: 12,
  },
  storeSelectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    color: '#333',
  },
  storesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    minWidth: '100%',
  },
  storeItem: {
    width: 180,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  storeItemActive: {
    borderColor: '#FF6C00',
    backgroundColor: '#FFF9F2',
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  storeAddress: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    height: 36,
  },
  storeDistance: {
    fontSize: 13,
    color: '#FF6C00',
    marginBottom: 8,
  },
  availabilityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#F0F0F0',
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '500',
  },
  availabilityFull: {
    color: '#4E9F3D',
  },
  availabilityHigh: {
    color: '#8BC34A',
  },
  availabilityMedium: {
    color: '#FFC107',
  },
  availabilityLow: {
    color: '#FF9800',
  },
  noStoresText: {
    color: '#666', 
    textAlign: 'center',
    paddingVertical: 16,
  },
  unavailableNotice: {
    fontSize: 12,
    color: '#FF3B30',
    marginBottom: 4,
  },
});

export default CartScreen;