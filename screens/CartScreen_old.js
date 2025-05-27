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

  const [deliveryOption, setDeliveryOption] = useState('pickup'); // 'pickup' или 'delivery'
const [selectedStore, setSelectedStore] = useState(null);
const [stores, setStores] = useState([]);
const [loadingStores, setLoadingStores] = useState(false);

  const insets = useSafeAreaInsets();
  const statusBarHeight = insets.top;
  

  const { cartStore, authStore } = useStores();

  const [updatingItems, setUpdatingItems] = useState({});
  const [quantities, setQuantities] = useState({});

  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSwiping, setIsSwiping] = useState(false);

  // Анимация для удаления
  const fadeAnim = new Animated.Value(1);


  useEffect(() => {
    const loadStores = async () => {
      if (!authStore.token || cartStore.items.length === 0) return;
      
      setLoadingStores(true);
      try {
        const response = await fetch('https://api.koleso.app/api/stores.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`
          },
          body: JSON.stringify({
            productIds: cartStore.items.map(item => item.id),
            lat: null,
            lng: null
          })
        });
  
        const data = await response.json();
        
        if (data.success) {
          // Нормализуем данные о наличии
          const normalizedStores = data.data.stores.map(store => ({
            ...store,
            stock_info: store.stock_info.map(item => ({
              ...item,
              product_id: item.product_id.toString(), // Приводим к строке
              in_stock: parseInt(item.in_stock) || 0
            }))
          }));
          
          setStores(normalizedStores); // Исключаем склад (.filter(store => store.id !== 8))
          
          // Логируем для отладки
          console.log('Loaded stores:', normalizedStores);
          console.log('Cart items:', cartStore.items);
        }
      } catch (error) {
        console.error('Failed to load stores:', error);
      } finally {
        setLoadingStores(false);
      }
    };
    
    loadStores();
  }, [authStore.token, cartStore.items]);

// Refs для FlatList
const storeListRef = useRef(null);

const selectedStoreRef = useRef(null);

// При выборе магазина обновляем и ref и state
const handleStoreSelect = (storeId) => {
  setSelectedStore(storeId);
};



// Удалите этот useEffect, так как он может вызывать нежелательную прокрутку
// useEffect(() => {
//   if (selectedStoreRef.current && stores.length > 0 && storeListRef.current) {
//     const index = stores.findIndex(store => store.id === selectedStoreRef.current);
//     if (index >= 0) {
//       requestAnimationFrame(() => {
//         storeListRef.current?.scrollToIndex({
//           index,
//           viewOffset: 0,
//           viewPosition: 0.5,
//           animated: false
//         });
//       });
//     }
//   }
// }, [stores, selectedStore]);

  useEffect(() => {
    if (authStore.isLoggedIn) {
      cartStore.loadCart(authStore.token);
    }
  }, [authStore.isLoggedIn]);

  const toggleSelectItem = (itemId) => {
    if (isSwiping) return;
    
    const item = cartStore.items.find(i => i.product_id === itemId);
    if (!item) return;
    console.log('itemId' + itemId);
    // Проверяем доступность с учетом количества
    if (!isItemAvailable(itemId, item.quantity)) {
      
      Alert.alert(
        'Недостаточно товара',
        `В выбранном магазине доступно только ${getAvailableQuantity(itemId)} шт. этого товара`
      );
      return;
    }
  
    setSelectedItems(prev => 
      prev.includes(item.id) 
        ? prev.filter(id => id !== item.id) 
        : [...prev, item.id]
    );
  };

  // Вспомогательная функция для получения доступного количества
const getAvailableQuantity = (itemId) => {
  if (deliveryOption === 'delivery') {
    const warehouse = stores.find(store => store.product_id === 8);
    const stockItem = warehouse?.stock_info?.find(
      si => si.product_id.toString() === itemId.toString()
    );
    return stockItem?.in_stock || 0;
  }
  
  const store = stores.find(s => s.id === selectedStore);
  if (!store) return 0;
  
  const stockItem = store.stock_info?.find(
    item => item.product_id.toString() === itemId.toString()
  );
  
  return stockItem?.in_stock || 0;
};

  // Инициализируем количества при загрузке
  useEffect(() => {
    const initialQuantities = {};
    cartStore.items.forEach(item => {
      initialQuantities[item.id] = item.quantity;
    });
    setQuantities(initialQuantities);
  }, [cartStore.items]);

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1 || newQuantity > 20) return;
    
    try {
      setUpdatingItems(prev => ({ ...prev, [itemId]: true }));
      setQuantities(prev => ({ ...prev, [itemId]: newQuantity }));
      
      await cartStore.updateItemQuantity(itemId, newQuantity, authStore.token);
    } catch (error) {
      // Откат при ошибке
      setQuantities(prev => ({ ...prev, [itemId]: cartStore.items.find(i => i.id === itemId)?.quantity || 1 }));
      Alert.alert('Ошибка', 'Не удалось обновить количество');
    } finally {
      setUpdatingItems(prev => ({ ...prev, [itemId]: false }));
    }
  };


  useEffect(() => {
    console.log('Current selected store:', selectedStore);
    console.log('Stores data:', stores.map(s => ({
      id: s.id,
      name: s.name,
      stock_info: s.stock_info?.length
    })));
  }, [selectedStore, stores]);


  const isItemAvailable = (itemId, requiredQuantity = 1) => {
    const item = cartStore.items.find(i => i.product_id === itemId);
  if (!item) return false;

    if (deliveryOption === 'delivery') {
      const warehouse = stores.find(store => store.id === 8); // Склад
      const stockItem = warehouse?.stock_info?.find(
        si => si.product_id.toString() === itemId.toString()
      );
      return stockItem ? stockItem.in_stock >= item.quantity : false;
    }
  
    // Если магазин не выбран, недоступно
    if (!selectedStore) return false;
  
    // Находим выбранный магазин
    const selectedStoreData = stores.find(store => store.id === selectedStore);
    if (!selectedStoreData) return false;
  
    // Находим товар в корзине
    const cartItem = cartStore.items.find(item => item.product_id === itemId);
    if (!cartItem) return false;
  
    // Проверяем наличие товара в магазине
    const stockItem = selectedStoreData.stock_info?.find(
      item => item.product_id.toString() === itemId.toString()
    );
  
    // Если нет информации, считаем товар недоступным
    if (!stockItem) {
      console.warn(`No stock info for product ${itemId} in store ${selectedStore}`);
      return false;
    }
  
    // Проверяем, что в магазине достаточно товара
    return stockItem.in_stock >= (requiredQuantity || cartItem.quantity);
  };



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
    
    if (deliveryOption === 'pickup' && !selectedStore) {
      Alert.alert('Ошибка', 'Выберите магазин для самовывоза');
      return;
    }
    console.log('selectedItems');
  console.log(selectedItems);
  console.log('selectedItems');
    // Проверяем доступность всех выбранных товаров
  const unavailableItems = selectedItems.filter(itemId => {
    const item = cartStore.items.find(i => i.id === itemId);
    return item && !isItemAvailable(itemId, item.quantity);
  });

  if (unavailableItems.length > 0) {
    Alert.alert(
      'Ошибка',
      'Некоторые выбранные товары стали недоступны. Пожалуйста, обновите ваш выбор.'
    );
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
          storeId: deliveryOption === 'pickup' ? selectedStore : null
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


  const StoreItem = React.memo(({ store, isSelected, onSelect }) => {
    return (
      <TouchableOpacity 
        style={[
          styles.storeItem,
          isSelected && styles.storeItemActive,
        ]}
        onPress={() => onSelect(store.id)}
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


  const StoreSelection = ({ stores, selectedStore, onSelectStore, loadingStores }) => {
    const scrollViewRef = useRef(null);
  
    // Прокрутка к выбранному магазину при изменении
    useEffect(() => {
      if (!selectedStore || !scrollViewRef.current) return;
  
      const storeIndex = stores.findIndex(store => store.id === selectedStore);
      if (storeIndex === -1) return;
  
      const itemWidth = 180 + 12; // Ширина элемента + marginRight
      const scrollPosition = storeIndex * itemWidth - (width / 2 - itemWidth / 2);
  
      scrollViewRef.current.scrollTo({
        x: Math.max(0, scrollPosition),
        animated: true
      });
    }, [selectedStore, stores]);
  
    if (loadingStores) {
      return <ActivityIndicator size="small" color="#FF6C00" />;
    }
  
    if (stores.length === 0) {
      return (
        <Text style={styles.noStoresText}>
          Нет доступных магазинов для самовывоза
        </Text>
      );
    }
  
    return (
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storesContainer}
        decelerationRate="fast"
        snapToInterval={180 + 12} // Ширина элемента + marginRight
        snapToAlignment="center"
      >
        {stores.map(store => (
          <TouchableOpacity
            key={`store-${store.id}`}
            style={[
              styles.storeItem,
              selectedStore === store.id && styles.storeItemActive,
            ]}
            onPress={() => onSelectStore(store.id)}
          >
            <View style={styles.storeHeader}>
              <Text style={styles.storeName}>{store.name}</Text>
              {selectedStore === store.id && (
                <Ionicons name="checkmark-circle" size={20} color="#FF6C00" />
              )}
            </View>
            <Text style={styles.storeAddress} numberOfLines={2}>
              {store.address}
            </Text>
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
        ))}
      </ScrollView>
    );
  };


  const DeliveryOptions = () => (
    <View style={styles.deliveryOptionsContainer}>
      <Text style={styles.sectionTitle}>Способ получения</Text>
      
      <TouchableOpacity 
        style={[
          styles.deliveryOption, 
          deliveryOption === 'pickup' && styles.deliveryOptionActive
        ]}
        onPress={() => setDeliveryOption('pickup')}
      >
        <Ionicons 
          name="storefront-outline" 
          size={24} 
          color={deliveryOption === 'pickup' ? '#FF6C00' : '#666'} 
        />
        <View style={styles.deliveryOptionText}>
          <Text style={styles.deliveryOptionTitle}>Самовывоз из магазина</Text>
          <Text style={styles.deliveryOptionSubtitle}>Бесплатно, сегодня-завтра</Text>
        </View>
        <Ionicons 
          name="checkmark-circle" 
          size={24} 
          color={deliveryOption === 'pickup' ? '#FF6C00' : '#DDD'} 
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[
          styles.deliveryOption, 
          deliveryOption === 'delivery' && styles.deliveryOptionActive
        ]}
        onPress={() => setDeliveryOption('delivery')}
      >
        <Ionicons 
          name="car-outline" 
          size={24} 
          color={deliveryOption === 'delivery' ? '#FF6C00' : '#666'} 
        />
        <View style={styles.deliveryOptionText}>
          <Text style={styles.deliveryOptionTitle}>Доставка</Text>
          <Text style={styles.deliveryOptionSubtitle}>
            {selectedItems.some(item => item.inStock) 
              ? '1-3 дня, от 0₽' 
              : 'До 7 дней, от 0₽'}
          </Text>
        </View>
        <Ionicons 
          name="checkmark-circle" 
          size={24} 
          color={deliveryOption === 'delivery' ? '#FF6C00' : '#DDD'} 
        />
      </TouchableOpacity>
      
      {deliveryOption === 'pickup' && (
  <View style={styles.storeSelection}>
  <Text style={styles.storeSelectionTitle}>Выберите магазин</Text>
  <Text style={styles.storeSelectionTitle}>Выберите магазин</Text>
          <StoreSelection
            stores={stores.filter(store => store.id !== 8)}
            selectedStore={selectedStore}
            onSelectStore={handleStoreSelect}
            loadingStores={loadingStores}
          />
   </View>


)}
    </View>
  );


  useEffect(() => {
    cartStore.items.forEach(item => {
      const available = getAvailableQuantity(item.id);
      if (item.quantity > available) {
        updateQuantity(item.id, available > 0 ? available : 1);
      }
    });
  }, [selectedStore]);

  const renderItem = ({ item }) => {
    const isSelected = selectedItems.includes(item.id);
    console.log('renderItem '+ item.product_id);
    const isAvailable = isItemAvailable(item.product_id);
    const opacity = isAvailable ? 1 : 1;
    const isUpdating = updatingItems[item.id] || false;
    const currentQuantity = quantities[item.id] || item.quantity;

    const handleQuantityChange = (change) => {
      const newValue = currentQuantity + change;
      updateQuantity(item.id, newValue);
    };
console.log(stores);
    const debugStockInfo = stores
    .find(store => store.id === selectedStore)
    ?.stock_info
    ?.find(si => si.product_id.toString() === item.product_id.toString());

    
    
    return (
      <Swipeable
        friction={2}
        rightThreshold={40}
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item.id)}
        onSwipeableWillOpen={() => setIsSwiping(true)}
        onSwipeableWillClose={() => setIsSwiping(false)}
      >
        <Animated.View 
          style={[
            styles.itemContainer,
            isSelected && styles.selectedItem,
            
          ]}
        >
          <TouchableOpacity 
            style={styles.selectButton}
            onPress={() => isAvailable && toggleSelectItem(item.product_id)}
           // disabled={!isAvailable}
          >
            <Ionicons 
              name={isSelected ? "checkbox" : "square-outline"} 
              size={24} 
              color={
                !isAvailable ? "#DDD" : 
                isSelected ? "#FF6C00" : "#DDD"
              } 
            />
          </TouchableOpacity>

          {/* Остальное содержимое item */}
          <Image
            style={[styles.itemImage, ]}
            resizeMode='contain'
            source={{ uri: item.image_url }}
          />

          <View style={styles.itemInfo}>
            <Text style={[styles.itemName,]} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={[styles.itemBrand, ]}>
              {item.brand}
            </Text>
            <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            Store: {selectedStore || 'none'}
          </Text>
          <Text style={styles.debugText}>
            Stock: {debugStockInfo?.in_stock ?? 'unknown'}
          </Text>
          <Text style={styles.debugText}>
            Available: {isAvailable.toString()}
          </Text>
        </View>
            {!isAvailable && (
  <Text style={styles.unavailableNotice}>
    Товар отсутствует в выбранном магазине
  </Text>
)}
            
            <View style={styles.priceRow}>
              <Text style={[styles.itemPrice, ]}>
                {item.price} ₽
              </Text>
              <Text style={[styles.totalPrice, ]}>
                {item.price * item.quantity} ₽
              </Text>
            </View>
            
            <View style={[styles.quantityContainer, ]}>
              <TouchableOpacity 
                onPress={() => updateQuantity(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1}
                style={styles.quantityButton}
              >
                <Ionicons 
                  name="remove" 
                  size={20} 
                  color={
                    !isAvailable ? "#DDD" :
                    item.quantity <= 1 ? "#DDD" : "#FF6C00"
                  } 
                />
              </TouchableOpacity>
              
              <Text style={[styles.quantity, ]}>
                {item.quantity}
              </Text>
              
              <TouchableOpacity 
    onPress={() => {
      const available = getAvailableQuantity(item.product_id);
      if (item.quantity + 1 > available) {
        Alert.alert(
          'Недостаточно товара', 
          `Максимально доступное количество: ${available} шт.`
        );
      } else {
        updateQuantity(item.id, item.quantity + 1);
      }
    }}
    style={styles.quantityButton}
  >
    <Ionicons 
      name="add" 
      size={20} 
      color={
        getAvailableQuantity(item.product_id) <= item.quantity ? "#DDD" : "#FF6C00"
      } 
    />
  </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Swipeable>
    );
  };

  const totalSelectedAmount = selectedItems.reduce((sum, id) => {
    const item = cartStore.items.find(i => i.id === id);
    return sum + (item ? item.price * item.quantity : 0);
  }, 0);


  const storeListExtraData = useMemo(() => ({
    selectedStore,
    timestamp: Date.now() // только для принудительного обновления при необходимости
  }), [selectedStore]);

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
            keyExtractor={item => `cart-${item.id}-${item.quantity}`} 
            extraData={storeListExtraData} // Форсируем обновление только при изменении selectedStore
            contentContainerStyle={styles.list}
            ListHeaderComponent={<DeliveryOptions />}
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
    marginBottom: 70,
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
    paddingBottom: 20, // Дополнительный отступ для футера
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
  selectedStoreHighlight: {
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
  storeList: {
    paddingBottom: 8,
    paddingHorizontal: 16,
    paddingRight: 8,
  },
  unavailableItem: {
    backgroundColor: '#F9F9F9',
  },
  unavailableImage: {
    opacity: 0.6,
  },
  unavailableText: {
    color: '#999',
  },
  unavailableQuantity: {
    backgroundColor: '#EEE',
  },
  unavailableQuantityText: {
    color: '#AAA',
  },
  unavailableNotice: {
    fontSize: 12,
    color: '#FF3B30',
    marginBottom: 4,
  },
});

export default CartScreen;