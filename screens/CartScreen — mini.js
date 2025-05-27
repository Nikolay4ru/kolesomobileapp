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
import { SafeAreaView } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useStores } from '../useStores';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

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
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();

  // Загрузка корзины
  useEffect(() => {
    const loadCart = async () => {
      try {
        await cartStore.loadCart(authStore.token);
      } catch (error) {
        Alert.alert('Ошибка', 'Не удалось загрузить корзину');
      } finally {
        setLoading(false);
      }
    };
    loadCart();
  }, [authStore.token, forceUpdate]);

  // Загрузка магазинов
  useEffect(() => {
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
    loadStores();
  }, [authStore.token, cartStore.items]);

  // Выбор магазина
  const handleStoreSelect = useCallback((storeId) => {
    setSelectedStoreId(storeId);
  }, []);

  // Проверка доступности товара
  const checkAvailability = useCallback((productId, requiredQuantity = 1) => {
    if (deliveryOption === 'delivery') {
      const warehouse = stores.find(store => store.id === 8);
      const stockItem = warehouse?.stock_info?.find(
        si => si.product_id.toString() === productId.toString()
      );
      return stockItem ? stockItem.in_stock >= requiredQuantity : false;
    }

    if (!selectedStoreId) return false;
    
    const store = stores.find(s => s.id === selectedStoreId);
    const stockItem = store?.stock_info?.find(
      item => item.product_id.toString() === productId.toString()
    );
    
    return stockItem ? stockItem.in_stock >= requiredQuantity : false;
  }, [deliveryOption, selectedStoreId, stores]);

  // Получение доступного количества
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

  // Обновление количества товара
  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1 || newQuantity > 20) return;
    
    const item = cartStore.items.find(i => i.id === itemId);
    if (!item) return;

    const available = checkAvailability(item.product_id, newQuantity);
    if (!available) {
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

  // Удаление товаров
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
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(async () => {
      try {
        await cartStore.removeItems([itemId], authStore.token);
        setSelectedItems(prev => prev.filter(id => id !== itemId));
      } catch (error) {
        Alert.alert('Ошибка', 'Не удалось удалить товар');
      }
    });
  };

  // Оформление заказа
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
          items: selectedItems,
          userId: authStore.userId,
          deliveryOption,
          storeId: deliveryOption === 'pickup' ? selectedStoreId : null
        })
      });
  
      const result = await response.json();
  
      if (response.ok) {
        await cartStore.loadCart(authStore.token);
        navigation.navigate('OrderSuccess', { orderId: result.orderId });
      } else {
        throw new Error(result.message || 'Ошибка оформления заказа');
      }
    } catch (error) {
      Alert.alert('Ошибка', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Компонент элемента магазина
  const StoreItem = React.memo(({ store, isSelected, onSelect }) => {
    return (
      <TouchableOpacity
        style={[
          styles.storeItem,
          isSelected && styles.storeItemSelected,
        ]}
        onPress={() => onSelect(store.id)}
      >
        <View style={styles.storeHeader}>
          <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
          {isSelected && <Ionicons name="checkmark-circle" size={20} color="#FF6C00" />}
        </View>
        <Text style={styles.storeAddress} numberOfLines={2}>{store.address}</Text>
        <View style={styles.availabilityBadge}>
          <Text style={styles.availabilityText}>
            {store.availability === 'full' ? 'Все в наличии' : 
             store.availability === 'high' ? 'Большинство' :
             store.availability === 'medium' ? 'Часть' : 
             store.availability === 'low' ? 'Мало' : 'Нет'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  });

  // Компонент выбора магазина
  const StoreSelection = React.memo(({ stores, selectedStoreId, onStoreSelect }) => {
    const scrollViewRef = useRef(null);
    const scrollX = useRef(0);

    const handleScroll = (event) => {
      scrollX.current = event.nativeEvent.contentOffset.x;
    };

    return (
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storesContainer}
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
  });

  // Компонент выбора способа доставки
  const DeliveryOptions = React.memo(({ deliveryOption, onSelectOption }) => {
    return (
      <View style={styles.deliveryOptionsContainer}>
        <View style={styles.deliveryOptionsRow}>
          <TouchableOpacity 
            style={[
              styles.deliveryOption,
              deliveryOption === 'pickup' && styles.deliveryOptionActive
            ]}
            onPress={() => onSelectOption('pickup')}
          >
            <Ionicons 
              name="storefront-outline" 
              size={20} 
              color={deliveryOption === 'pickup' ? '#FF6C00' : '#666'} 
            />
            <Text style={styles.deliveryOptionText}>Самовывоз</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.deliveryOption,
              deliveryOption === 'delivery' && styles.deliveryOptionActive
            ]}
            onPress={() => onSelectOption('delivery')}
          >
            <Ionicons 
              name="car-outline" 
              size={20} 
              color={deliveryOption === 'delivery' ? '#FF6C00' : '#666'} 
            />
            <Text style={styles.deliveryOptionText}>Доставка</Text>
          </TouchableOpacity>
        </View>

        {deliveryOption === 'pickup' && (
          <View style={styles.storeSelectionContainer}>
            <Text style={styles.sectionTitle}>Выберите магазин</Text>
            <StoreSelection
              stores={stores.filter(store => store.id !== 8)}
              selectedStoreId={selectedStoreId}
              onStoreSelect={handleStoreSelect}
            />
          </View>
        )}
      </View>
    );
  });

  // Рендер товара в корзине
  const renderItem = ({ item }) => {
    const isSelected = selectedItems.includes(item.id);
    const isAvailable = checkAvailability(item.product_id);
    const maxAvailable = getAvailableQuantity(item.product_id);

    return (
      <Swipeable
        friction={2}
        rightThreshold={40}
        renderRightActions={(progress, dragX) => (
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => removeSingleItem(item.id)}
          >
            <Ionicons name="trash-bin" size={24} color="white" />
          </TouchableOpacity>
        )}
        onSwipeableWillOpen={() => setIsSwiping(true)}
        onSwipeableWillClose={() => setIsSwiping(false)}
      >
        <View style={[styles.itemContainer, isSelected && styles.selectedItem]}>
          <TouchableOpacity 
            style={styles.selectButton}
            onPress={() => !isSwiping && toggleSelectItem(item.id)}
          >
            <Ionicons 
              name={isSelected ? "checkbox" : "square-outline"} 
              size={24} 
              color={isSelected ? "#FF6C00" : "#DDD"} 
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
              <Text style={styles.unavailableNotice}>Товар недоступен</Text>
            )}
            
            <View style={styles.priceRow}>
              <Text style={styles.itemPrice}>{item.price} ₽</Text>
              <Text style={styles.totalPrice}>{item.price * item.quantity} ₽</Text>
            </View>
            
            <View style={styles.quantityContainer}>
              <TouchableOpacity 
                onPress={() => updateQuantity(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1}
              >
                <Ionicons 
                  name="remove" 
                  size={20} 
                  color={item.quantity <= 1 ? "#DDD" : "#FF6C00"} 
                />
              </TouchableOpacity>
              
              <Text style={styles.quantity}>{item.quantity}</Text>
              
              <TouchableOpacity 
                onPress={() => {
                  if (item.quantity + 1 > maxAvailable) {
                    Alert.alert('Недостаточно товара', `Доступно: ${maxAvailable} шт.`);
                  } else {
                    updateQuantity(item.id, item.quantity + 1);
                  }
                }}
                disabled={item.quantity >= maxAvailable}
              >
                <Ionicons 
                  name="add" 
                  size={20} 
                  color={item.quantity >= maxAvailable ? "#DDD" : "#FF6C00"} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Swipeable>
    );
  };

  // Итоговая сумма
  const totalSelectedAmount = useMemo(() => {
    return selectedItems.reduce((sum, id) => {
      const item = cartStore.items.find(i => i.id === id);
      return sum + (item ? item.price * item.quantity : 0);
    }, 0);
  }, [selectedItems, cartStore.items]);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#FF6C00" />
      </View>
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
            ListHeaderComponent={
              <DeliveryOptions 
                deliveryOption={deliveryOption}
                onSelectOption={setDeliveryOption}
              />
            }
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
                    <Text style={styles.buttonText}>Удалить</Text>
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
    paddingBottom: 70,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedItem: {
    backgroundColor: '#FFF9F2',
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
    alignItems: 'center',
    width: 80,
    marginBottom: 8,
    marginRight: 16,
    borderRadius: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 16,
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
    color: '#FF3B30',
  },
  deliveryOptionsContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
  },
  deliveryOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  deliveryOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEE',
    marginHorizontal: 4,
  },
  deliveryOptionActive: {
    borderColor: '#FF6C00',
    backgroundColor: '#FFF9F2',
  },
  deliveryOptionText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  storeSelectionContainer: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  storesContainer: {
    paddingBottom: 8,
  },
  storeItem: {
    width: 140,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  storeItemSelected: {
    borderColor: '#FF6C00',
    backgroundColor: '#FFF9F2',
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  storeAddress: {
    fontSize: 12,
    color: '#666',
    marginVertical: 4,
  },
  availabilityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F0F0F0',
    marginTop: 4,
  },
  availabilityText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#4E9F3D',
  },
  unavailableNotice: {
    fontSize: 12,
    color: '#FF3B30',
    marginBottom: 4,
  },
});

export default CartScreen;