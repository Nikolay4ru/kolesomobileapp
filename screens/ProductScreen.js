import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Dimensions,
  ActivityIndicator,
  FlatList,
  Share,
  Linking,
  Alert,
  StatusBar,
  Animated,
  Platform
} from 'react-native';
import { Haptics } from 'react-native-nitro-haptics';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSharedValue } from "react-native-reanimated";
import { useRoute, useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useStores } from '../useStores';
import CustomHeader from "../components/CustomHeader";
import AddToCartModal from '../components/AddToCartModal';
import ShareHelper from '../components/Share';
import CompatibleCarsSection from '../components/CompatibleCarsSection';
import { SafeAreaView } from 'react-native-safe-area-context';
import Carousel, {
  ICarouselInstance,
  Pagination,
} from "react-native-reanimated-carousel";
import MapView, { Marker } from 'react-native-maps';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ProductScreen = observer(() => {
  const DEFAULT_IMAGE = 'https://api.koleso.app/public/img/no-image.jpg';
  const API_URL = 'https://api.koleso.app/api';
  const route = useRoute();
  const navigation = useNavigation();
  const { productId, fromCart, modal } = route.params;
  console.log(route.params);
  const { cartStore, authStore, favoritesStore } = useStores();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const statusBarHeight = modal ? 0 : insets.top;
  // States
  const [product, setProduct] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [sameBrandProducts, setSameBrandProducts] = useState([]);
  const [localFavorites, setLocalFavorites] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [isUpdatingQuantity, setIsUpdatingQuantity] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(0);
  const mapRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;


  // --- Список совместимости автомобилей ---
  const [compatibleCars, setCompatibleCars] = useState([]);
  const [compatibleCarsLoading, setCompatibleCarsLoading] = useState(false);
  const [compatibleCarsError, setCompatibleCarsError] = useState(null);


  const [showCartModal, setShowCartModal] = useState(false);
const [addedProduct, setAddedProduct] = useState(null);
const [addedQuantity, setAddedQuantity] = useState(1);

  
  const width = Dimensions.get("window").width;
  const ref = useRef(null);
  const animatedIndex = useSharedValue(0);



  // Загрузка совместимых автомобилей
  useEffect(() => {
    if (!product) return;
    setCompatibleCars([]);
    setCompatibleCarsError(null);

    const fetchCompatibleCars = async () => {
      setCompatibleCarsLoading(true);
      try {
        const resp = await fetch(`https://api.koleso.app/api/product.php?action=compatible_cars&product_id=${product.id}`);
        const data = await resp.json();
        if (data.success) {
          setCompatibleCars(data.cars || []);
        } else {
          setCompatibleCarsError(data.error || 'Не удалось получить совместимость');
        }
      } catch (e) {
        setCompatibleCarsError('Ошибка загрузки совместимости');
      } finally {
        setCompatibleCarsLoading(false);
      }
    };

    fetchCompatibleCars();
  }, [product?.id]);


  // Получение максимального доступного количества товара
  const getMaxAvailableQuantity = useCallback(() => {
    if (!stores || stores.length === 0) return 20;
    
    const totalStock = stores.reduce((total, store) => {
      return total + (store.quantity > 0 ? store.quantity : 0);
    }, 0);
    
    return Math.min(totalStock, 20);
  }, [stores]);

  // Проверка доступности количества
  const isQuantityAvailable = useCallback((requestedQuantity) => {
    const maxAvailable = getMaxAvailableQuantity();
    return requestedQuantity <= maxAvailable;
  }, [getMaxAvailableQuantity]);

  const isInCart = useCallback(() => {
    if (!product) return false;
    return cartStore.items.some(item => item.product_id == product.id);
  }, [cartStore.items, product?.id]);

  // Получение текущего товара из корзины
  const getCartItem = useCallback(() => {
    if (!product) return null;
    return cartStore.items.find(item => item.product_id == product.id);
  }, [cartStore.items, product?.id]);

  // Исправленная синхронизация количества с корзиной
  useEffect(() => {
    if (product && isInCart()) {
      const cartItem = getCartItem();
      if (cartItem && cartItem.quantity !== quantity && !isUpdatingQuantity) {
        setQuantity(cartItem.quantity);
      }
    } else if (!isInCart() && quantity !== 1) {
      setQuantity(1);
    }
  }, [product, cartStore.items, isInCart, getCartItem, isUpdatingQuantity]);

  // Обновление статистики просмотров
  const updateProductViews = async (productId) => {
    try {
      await fetch(`${API_URL}/update_product_stats.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          action: 'view'
        })
      });
    } catch (err) {
      console.error('Error updating product views:', err);
    }
  };

  // Анимации при загрузке
  useEffect(() => {
    if (product) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        })
      ]).start();
      
      updateProductViews(product.id);
    }
  }, [product]);

  const handleBackPress = () => {
    if (fromCart) {
      navigation.navigate('Cart');
    } else {
      navigation.goBack();
    }
  };

  const handleShare = async () => {
    await ShareHelper.shareDeepLink(`product/${productId}`, {
      source: 'share',
      campaign: 'social',
    });
  };

  useEffect(() => {
    if (selectedStore && mapRef.current) {
      const region = {
        latitude: parseFloat(selectedStore.storeInfo.latitude),
        longitude: parseFloat(selectedStore.storeInfo.longitude),
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current.animateToRegion(region, 500);
    }
  }, [selectedStore]);

  const isFavorite = useCallback((productId) => {
    if (localFavorites.hasOwnProperty(productId)) {
      return localFavorites[productId];
    }
    return favoritesStore.items.some(item => item.product_id == productId);
  }, [localFavorites, favoritesStore.items]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      favoritesStore.refreshFavorites(authStore.token);
      setLocalFavorites(favoritesStore.items);
      if (authStore.isLoggedIn) {
        cartStore.loadCart(authStore.token);
      }
    });
    
    return unsubscribe;
  }, [navigation]);

  const toggleFavorite = useCallback(async () => {
    if (!product) return;
    Haptics.impact('light');
    const productId = product.id;
    const newValue = !isFavorite(productId);
    
    setLocalFavorites(prev => ({ ...prev, [productId]: newValue }));
    
    try {
      if (newValue) {
        await favoritesStore.addToFavorites(product, authStore.token);
      } else {
        await favoritesStore.removeFromFavorites(productId, authStore.token);
      }
    } catch (error) {
      setLocalFavorites(prev => ({ ...prev, [productId]: !newValue }));
    }
  }, [product, isFavorite, authStore.token]);

  const formatValue = (value) => {
    let num;
    if (typeof value === 'string') {
      num = Number(value.trim());
    } else if (typeof value === 'number') {
      num = value;
    } else {
      return value;
    }
    if (isNaN(num)) {
      return value;
    }
    const formatted = num.toFixed(2);
    return parseFloat(formatted).toString();
  };

  // Загрузка данных
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log(productId);
        const productResponse = await fetch(`https://api.koleso.app/api/product.php?id=${productId}`);
        if (!productResponse.ok) throw new Error(`HTTP error! status: ${productResponse.status}`);
        const productData = await productResponse.json();
        
        if (!productData.success) throw new Error(productData.error || 'Failed to load product');
        
        const storesResponse = await fetch('https://api.koleso.app/api/stores_products.php', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authStore.token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!storesResponse.ok) throw new Error(`HTTP error! status: ${storesResponse.status}`);
        const storesData = await storesResponse.json();
        
        const enrichedStocks = productData.product.stocks.map(stock => {
          const storeInfo = storesData.find(store => store.id === stock.store_id.toString());
          return {
            ...stock,
            storeInfo
          };
        }).filter(item => item.storeInfo); 

        enrichedStocks.sort((a, b) => {
          const isA8 = a.store_id === 8;
          const isB8 = b.store_id === 8;
          
          if ((a.quantity > 0 && b.quantity > 0) || (a.quantity <= 0 && b.quantity <= 0)) {
            if (isA8) return -1;
            if (isB8) return 1;
            return 0;
          }
          
          if (a.quantity > 0 && b.quantity <= 0) return -1;
          if (a.quantity <= 0 && b.quantity > 0) return 1;
          
          return 0;
        });

        const limitedStocks = enrichedStocks.map(item => ({
          ...item,
          quantity: item.quantity > 20 ? 20 : item.quantity
        }));
        
        setProduct(productData.product);
        setStores(limitedStocks);
        
        // Загрузка похожих товаров
        fetchSimilarProducts(productData.product);
        
      } catch (err) {
        console.error('Failed to load data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productId, authStore.token]);

  // Загружаем корзину при монтировании
  useEffect(() => {
    if (authStore.isLoggedIn) {
      cartStore.loadCart(authStore.token);
    }
  }, [authStore.isLoggedIn, authStore.token]);

  // Загрузка похожих товаров
  const fetchSimilarProducts = async (currentProduct) => {
    try {
      if (currentProduct.category === 'Автошины') {
        const sameBrandResponse = await fetch(
          `https://api.koleso.app/api/product.php?action=same-model&product_id=${currentProduct.id}&limit=10`
        );
        if (sameBrandResponse.ok) {
          const sameBrandData = await sameBrandResponse.json();
          if (sameBrandData.success) {
            const filtered = sameBrandData.products
              .filter(p => p.id !== currentProduct.id)
              .slice(0, 10);
            setSameBrandProducts(filtered);
          }
        }
      }

      const similarResponse = await fetch(
        `https://api.koleso.app/api/product.php?action=similar&product_id=${currentProduct.id}&limit=10`
      );
      if (similarResponse.ok) {
        const similarData = await similarResponse.json();
        if (similarData.success) {
          const filtered = similarData.products
            .filter(p => p.id !== currentProduct.id && p.brand !== currentProduct.brand)
            .slice(0, 10);
          setSimilarProducts(filtered);
        }
      }
    } catch (error) {
      console.error('Error fetching similar products:', error);
    }
  };

  // Исправленная функция изменения количества
  const handleQuantityChange = async (delta) => {
    if (!product || !isInCart() || isUpdatingQuantity) return;
    
    const cartItem = getCartItem();
    if (!cartItem) return;

    const newQuantity = quantity + delta;
    const maxAvailable = getMaxAvailableQuantity();
    
    // Проверяем ограничения
    if (newQuantity < 1) return;
    
    if (newQuantity > maxAvailable) {
      Alert.alert(
        'Недостаточно товара', 
        `На складе доступно только ${maxAvailable} шт. этого товара`
      );
      return;
    }
    
    if (newQuantity > 20) {
      Alert.alert('Ограничение', 'Максимально можно добавить 20 штук одного товара');
      return;
    }
    
    setIsUpdatingQuantity(true);
    
    try {
      // Оптимистичное обновление UI
      setQuantity(newQuantity);
      Haptics.impact('light');
      
      // Обновляем в корзине
      await cartStore.updateItemQuantity(cartItem.id, newQuantity, authStore.token);
      
      console.log(`Количество обновлено: ${newQuantity}`);
      
    } catch (error) {
      console.error('Error updating quantity:', error);
      // Откатываем изменения при ошибке
      const currentCartItem = getCartItem();
      if (currentCartItem) {
        setQuantity(currentCartItem.quantity);
      }
      Alert.alert('Ошибка', 'Не удалось обновить количество товара');
    } finally {
      setIsUpdatingQuantity(false);
    }
  };

const addToCart = async () => {
  if (!authStore.isLoggedIn) {
    Alert.alert(
      'Требуется авторизация',
      'Для добавления товаров в корзину необходимо войти в систему',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Войти', onPress: () => navigation.navigate('Auth') }
      ]
    );
    return;
  }

  if (addingToCart) return;

  // Проверяем доступность количества
  if (!isQuantityAvailable(quantity)) {
    const maxAvailable = getMaxAvailableQuantity();
    Alert.alert(
      'Недостаточно товара', 
      `На складе доступно только ${maxAvailable} шт. этого товара`
    );
    return;
  }

  try {
    setAddingToCart(true);

    // Обновляем статистику покупок
    await fetch(`${API_URL}/update_product_stats.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: product.id,
        action: 'purchase'
      })
    });

    const cartItem = getCartItem();
    
    if (cartItem) {
      // Если товар уже в корзине, проверяем итоговое количество
      const newTotalQuantity = cartItem.quantity + quantity;
      const maxAvailable = getMaxAvailableQuantity();
      
      if (newTotalQuantity > maxAvailable) {
        Alert.alert(
          'Недостаточно товара', 
          `На складе доступно только ${maxAvailable} шт. В корзине уже ${cartItem.quantity} шт.`
        );
        return;
      }
      
      await cartStore.updateItemQuantity(cartItem.id, newTotalQuantity, authStore.token);
      console.log(`Товар уже в корзине, обновляем количество до: ${newTotalQuantity}`);
    } else {
      // Если товара нет в корзине, добавляем
      await cartStore.addToCart({
        product_id: product.id,
        quantity,
        price: product.price,
        name: product.name,
        brand: product.brand,
        image_url: product.images?.[0] || DEFAULT_IMAGE
      }, authStore.token);
      console.log(`Добавляем новый товар в корзину с количеством: ${quantity}`);
      
      // Принудительно обновляем корзину после добавления
      setTimeout(() => {
        cartStore.loadCart(authStore.token);
      }, 500);
    }
    
    // Показываем модальное окно вместо Alert
    setAddedProduct(product);
    setAddedQuantity(quantity);
    setShowCartModal(true);
    
  } catch (error) {
    Alert.alert('Ошибка', 'Не удалось добавить товар в корзину');
    console.error('Add to cart error:', error);
  } finally {
    setAddingToCart(false);
  }
};

const FastBuyCart = async () => {
  if (!authStore.isLoggedIn) {
    Alert.alert(
      'Требуется авторизация',
      'Для добавления товаров в корзину необходимо войти в систему',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Войти', onPress: () => navigation.navigate('Auth') }
      ]
    );
    return;
  }

  if (addingToCart) return;

  // Проверяем доступность количества
  if (!isQuantityAvailable(quantity)) {
    const maxAvailable = getMaxAvailableQuantity();
    Alert.alert(
      'Недостаточно товара', 
      `На складе доступно только ${maxAvailable} шт. этого товара`
    );
    return;
  }

  try {
    setAddingToCart(true);
    const cartItem = getCartItem();
    
    if (cartItem) {
      // Если товар уже в корзине, проверяем можем ли обновить количество
      if (!isQuantityAvailable(quantity)) {
        const maxAvailable = getMaxAvailableQuantity();
        Alert.alert(
          'Недостаточно товара', 
          `На складе доступно только ${maxAvailable} шт. этого товара`
        );
        return;
      }
      
      await cartStore.updateItemQuantity(cartItem.id, quantity, authStore.token);
      console.log(`FastBuy: обновляем количество до ${quantity}`);
    } else {
      // Если товара нет в корзине, добавляем
      await cartStore.addToCart({
        product_id: product.id,
        quantity,
        price: product.price,
        name: product.name,
        brand: product.brand,
        image_url: product.images?.[0] || DEFAULT_IMAGE
      }, authStore.token);
      console.log(`FastBuy: добавляем товар с количеством ${quantity}`);
      
      // Принудительно обновляем корзину после добавления
      setTimeout(() => {
        cartStore.loadCart(authStore.token);
      }, 500);
    }
    
    // Сразу переходим в корзину без показа модального окна
    navigation.navigate('Cart');
  } catch (error) {
    Alert.alert('Ошибка', 'Не удалось добавить товар в корзину');
    console.error('Add to cart error:', error);
  } finally {
    setAddingToCart(false);
  }
};


const handleAddRelatedProducts = async (relatedProducts) => {
  console.log('Related products to add:', relatedProducts);
  // Логика добавления уже реализована в модальном окне
};

  const openStoreMap = (store) => {
    const { latitude, longitude, name } = store;
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}&query_place_id=${name}`;
    Linking.openURL(url);
  };

  const renderImage = ({ item }) => (
    <View style={styles.imageContainer}>
      <Image 
        source={{ uri: item || DEFAULT_IMAGE }} 
        style={styles.productImage} 
        resizeMode="contain"
      />
    </View>
  );

  const renderStoreItem = ({ item, index }) => {
    const isSelected = selectedStore?.store_id === item.store_id;
    const inStock = item.quantity > 0;

     const bottomPadding = Platform.select({
        ios: 0,
        android: insets.bottom > 0 ? insets.bottom : 0,
      });
    
    return (
      <TouchableOpacity 
        style={[
          styles.storeCard,
          isSelected && styles.selectedStoreCard,
          !inStock && styles.outOfStockCard
        ]}
        onPress={() => {
          Haptics.impact('light');
          setSelectedStore(isSelected ? null : item);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.storeCardHeader}>
          <View style={styles.storeIconContainer}>
            <Ionicons name="business" size={20} color={inStock ? colors.primary : colors.textTertiary} />
          </View>
          <View style={styles.storeInfo}>
            <Text style={styles.storeName} numberOfLines={1}>{item.storeInfo.name}</Text>
            <Text style={styles.storeAddress} numberOfLines={1}>
              {item.storeInfo.city}, {item.storeInfo.address}
            </Text>
          </View>
        </View>
        
        <View style={styles.storeCardFooter}>
          <View style={[styles.stockIndicator, inStock ? styles.inStockIndicator : styles.outOfStockIndicator]}>
            <Ionicons 
              name={inStock ? "checkmark-circle" : "close-circle"} 
              size={16} 
              color={inStock ? colors.success : colors.error} 
            />
            <Text style={[styles.stockStatus, inStock ? styles.inStockText : styles.outOfStockText]}>
              {inStock ? `${item.quantity} шт` : 'Нет'}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.mapLinkButton}
            onPress={() => openStoreMap(item.storeInfo)}
          >
            <Ionicons name="navigate-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderProductItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => navigation.push('Product', { productId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.productImageContainer}>
        <Image 
          source={{ uri: item.image_url || DEFAULT_IMAGE }} 
          style={styles.productCardImage}
          resizeMode="contain"
        />
        {item.old_price && item.old_price > item.price && (
          <View style={styles.productDiscountBadge}>
            <Text style={styles.productDiscountText}>
              -{Math.round(((item.old_price - item.price) / item.old_price) * 100)}%
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.productCardContent}>
        <Text style={styles.productCardBrand}>{item.brand}</Text>
        <Text style={styles.productCardName} numberOfLines={2}>{item.name}</Text>
        
        {item.category === 'Автошины' && (
          <Text style={styles.productCardSize}>
            {formatValue(item.width)}/{formatValue(item.profile)} R{formatValue(item.diameter)}
          </Text>
        )}
        
        <View style={styles.productCardPriceRow}>
          <Text style={styles.productCardPrice}>{parseFloat(item.price).toFixed(0)} ₽</Text>
          {item.old_price && item.old_price > item.price && (
            <Text style={styles.productCardOldPrice}>{parseFloat(item.old_price).toFixed(0)} ₽</Text>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.productCardButton}
          onPress={async () => {
  if (!authStore.isLoggedIn) {
    Alert.alert(
      'Требуется авторизация',
      'Для добавления товаров в корзину необходимо войти в систему',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Войти', onPress: () => navigation.navigate('Auth') }
      ]
    );
    return;
  }
  
  try {
    await cartStore.addToCart({
      product_id: item.id,
      quantity: 1,
      price: item.price,
      name: item.name,
      brand: item.brand,
      image_url: item.images?.[0] || DEFAULT_IMAGE
    }, authStore.token);
    
    // Показываем модальное окно для похожих товаров тоже
    setAddedProduct(item);
    setAddedQuantity(1);
    setShowCartModal(true);
  } catch (error) {
    Alert.alert('Ошибка', 'Не удалось добавить товар в корзину');
  }
}}
        >
          <Ionicons name="cart-outline" size={20} color={colors.primary} />
          <Text style={styles.productCardButtonText}>В корзину</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Загружаем детали товара...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIcon}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        </View>
        <Text style={styles.errorTitle}>Упс! Что-то пошло не так</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.errorButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorButtonText}>Вернуться назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIcon}>
          <Ionicons name="search-outline" size={64} color={colors.textTertiary} />
        </View>
        <Text style={styles.errorTitle}>Товар не найден</Text>
        <Text style={styles.errorText}>К сожалению, мы не смогли найти этот товар</Text>
        <TouchableOpacity 
          style={styles.errorButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorButtonText}>Вернуться назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const discount = product.old_price && product.old_price > product.price 
    ? Math.round(((product.old_price - product.price) / product.old_price) * 100)
    : 0;

  return (
    // statusBarHeight
    <View style={[styles.container,]}>
      <CustomHeader 
        title=""
        navigation={navigation}
        statusBarProps={{
          barStyle: theme === 'dark' ? 'light-content' : 'dark-content',
          backgroundColor: colors.headerBackground
        }}
        safeAreaStyle={{
          backgroundColor: colors.headerBackground,
          paddingTop: 0
        }}
        headerStyle={{
          backgroundColor: colors.headerBackground,
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          marginTop: 0
        }}
        rightAction={() => toggleFavorite()}
        onBackPress={handleBackPress}
        rightIcon={isFavorite(productId) ? "heart" : "heart-outline"}
        rightIcon2="share-outline"
        rightAction2={() => handleShare()}
        iconColorRight2={colors.text}              
        iconColorRight={isFavorite(productId) ? colors.error : colors.text}
        iconColorLeft={colors.text}
        titleStyle={{ color: colors.text }}
        withBackButton
        modal={modal}
      />
     
    
     
      <ScrollView 
    contentContainerStyle={[
      styles.content, 
      { 
        paddingBottom: tabBarHeight + 120 // bottomPanel height + небольшой отступ
      }
    ]}
    showsVerticalScrollIndicator={false}
  >
        {/* Карусель изображений */}
        <View style={styles.carouselWrapper}>
          <LinearGradient
            colors={theme === 'dark' 
              ? ['#000000', '#000000', '#1C1C1E'] 
              : ['#F5F5F5', '#F5F5F5', '#FFFFFF']
            }
            style={styles.carouselBackground}
            start={{x: 0, y: 0}}
            end={{x: 0, y: 1}}
          />
          <View style={styles.carouselContainer}>
            <Carousel
              ref={ref}
              data={product.images?.length ? product.images : [DEFAULT_IMAGE]}
              renderItem={renderImage}
              height={width * 0.85}
              width={width}
              onSnapToItem={(index) => {
                setActiveSlide(index);
                animatedIndex.value = index;
              }}
            />
            
            {product.images?.length > 1 && (
              <View style={styles.paginationContainer}>
                {product.images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      activeSlide === index && styles.paginationDotActive
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Основная информация */}
        <Animated.View 
          style={[
            styles.mainInfo,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          )}
          
          <View style={styles.brandContainer}>
            <Text style={styles.productBrand}>{product.brand}</Text>
          </View>
          
          <Text style={styles.productName}>{product.name}</Text>
          
          <View style={styles.priceRow}>
            <View style={styles.priceContainer}>
              <Text style={styles.productPrice}>{parseFloat(product.price).toFixed(0)} ₽</Text>
              {product.old_price && product.old_price > product.price && (
                <Text style={styles.productOldPrice}>{parseFloat(product.old_price).toFixed(0)} ₽</Text>
              )}
            </View>
            {product.out_of_stock === 0 && (
              <View style={styles.availabilityBadge}>
                <View style={styles.availabilityDot} />
                <Text style={styles.availabilityText}>В наличии</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Характеристики */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="list-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Характеристики</Text>
          </View>
          
          <View style={styles.specsContainer}>
            {product.category === 'Автошины' && (
              <>
                <SpecItem 
                  icon="resize-outline" 
                  title="Размер" 
                  value={`${formatValue(product.width)}/${formatValue(product.profile)} R${formatValue(product.diameter)}`} 
                  highlight
                  colors={colors}
                  theme={theme}
                  styles={styles}
                />
                <SpecItem icon="snow-outline" title="Сезон" value={product.season} colors={colors} theme={theme} styles={styles} />
                <SpecItem icon="speedometer-outline" title="Индексы" value={`${product.load_index}/${product.speed_index}`} colors={colors} theme={theme} styles={styles}/>
                <SpecItem icon="car-sport-outline" title="RunFlat" value={product.runflat ? 'Есть' : 'Нет'} colors={colors} theme={theme} styles={styles} />
                {product.spiked && <SpecItem icon="snow-outline" title="Шипы" value="Есть" highlight colors={colors} theme={theme} styles={styles} />}
              </>
            )}
            
            {product.category === 'Диски' && (
              <>
                <SpecItem 
                  icon="disc-outline" 
                  title="Тип" 
                  value={product.rim_type || 'Литой'} 
                  colors={colors}
                  theme={theme}
                  styles={styles}
                />
                <SpecItem 
                  icon="resize-outline" 
                  title="Диаметр" 
                  value={`R${formatValue(product.diameter)}`} 
                  highlight 
                  colors={colors}
                  theme={theme}
                  styles={styles}
                />
                <SpecItem 
                  icon="git-network-outline" 
                  title="PCD" 
                  value={product.pcd ? `${product.pcd}` : `${product.hole_count}x${product.bolt_pattern}`} 
                  colors={colors}
                  theme={theme}
                  styles={styles}
                />
                <SpecItem 
                  icon="arrow-forward-outline" 
                  title="Вылет (ET)" 
                  value={`ET${formatValue(product.et || product.offset)}`} 
                  colors={colors}
                  theme={theme}
                  styles={styles}
                />
                <SpecItem 
                  icon="radio-button-on-outline" 
                  title="Центральное отверстие (DIA)" 
                  value={`${formatValue(product.dia || product.center_bore)} мм`} 
                  colors={colors}
                  theme={theme}
                  styles={styles}
                />
                <SpecItem 
                  icon="resize-outline" 
                  title="Ширина" 
                  value={`${formatValue(product.width)} J`} 
                  colors={colors}
                  theme={theme}
                  styles={styles}
                />
                {product.rim_color && (
                  <SpecItem 
                    icon="color-palette-outline" 
                    title="Цвет" 
                    value={product.rim_color} 
                    colors={colors}
                    theme={theme}
                    styles={styles}
                  />
                )}
                {product.material && (
                  <SpecItem 
                    icon="build-outline" 
                    title="Материал" 
                    value={product.material} 
                    colors={colors}
                    theme={theme}
                    styles={styles}
                  />
                )}
              </>
            )}
            
            {product.category === 'Аккумуляторы' && (
              <>
                <SpecItem 
                  icon="battery-full-outline" 
                  title="Емкость" 
                  value={`${product.capacity} А·ч`} 
                  highlight 
                  colors={colors}
                  theme={theme}
                  styles={styles}
                />
                <SpecItem 
                  icon="flash-outline" 
                  title="Пусковой ток" 
                  value={`${product.starting_current} А`} 
                  colors={colors}
                  theme={theme}
                  styles={styles}
                />
                <SpecItem 
                  icon="swap-horizontal-outline" 
                  title="Полярность" 
                  value={product.polarity === '0' ? 'Прямая' : product.polarity === '1' ? 'Обратная' : product.polarity} 
                  colors={colors}
                  theme={theme}
                  styles={styles}
                />
                <SpecItem 
                  icon="cube-outline" 
                  title="Размеры (Д×Ш×В)" 
                  value={`${product.length}×${product.width}×${product.height} мм`} 
                  colors={colors}
                  theme={theme}
                  styles={styles}
                />
                {product.terminal_type && (
                  <SpecItem 
                    icon="hardware-chip-outline" 
                    title="Тип клемм" 
                    value={product.terminal_type} 
                    colors={colors}
                    theme={theme}
                    styles={styles}
                  />
                )}
              </>
            )}
            
            {product.category === 'Моторные масла' && (
              <>
                <SpecItem 
                  icon="water-outline" 
                  title="Вязкость" 
                  value={product.viscosity} 
                  highlight 
                  colors={colors}
                  theme={theme}
                  styles={styles}
                />
                <SpecItem 
                  icon="car-outline" 
                  title="Тип двигателя" 
                  value={product.engine_type} 
                  colors={colors}
                  theme={theme}
                  styles={styles}
                />
                <SpecItem 
                  icon="flask-outline" 
                  title="Объем" 
                  value={`${product.volume} л`} 
                  colors={colors}
                  theme={theme}
                  styles={styles}
                />
                {product.api_class && (
                  <SpecItem 
                    icon="ribbon-outline" 
                    title="Класс API" 
                    value={product.api_class} 
                    colors={colors}
                    theme={theme}
                    styles={styles}
                  />
                )}
                {product.acea_class && (
                  <SpecItem 
                    icon="medal-outline" 
                    title="Класс ACEA" 
                    value={product.acea_class} 
                    colors={colors}
                    theme={theme}
                    styles={styles}
                  />
                )}
              </>
            )}
            
            {/* Общие характеристики для всех товаров */}
            {product.brand && (
              <SpecItem 
                icon="business-outline" 
                title="Бренд" 
                value={product.brand} 
                colors={colors}
                theme={theme}
                styles={styles}
              />
            )}
            
            {product.country && (
              <SpecItem 
                icon="flag-outline" 
                title="Страна производства" 
                value={product.country} 
                colors={colors}
                theme={theme}
                styles={styles}
              />
            )}
            
            {product.warranty && (
              <SpecItem 
                icon="shield-checkmark-outline" 
                title="Гарантия" 
                value={product.warranty} 
                colors={colors}
                theme={theme}
                styles={styles}
              />
            )}
          </View>
        </View>

        {/* Наличие в магазинах */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="location-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Наличие в магазинах</Text>
          </View>
          
          {stores.length > 0 ? (
            <>
              <FlatList
                data={stores}
                renderItem={renderStoreItem}
                keyExtractor={(item) => item.store_id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.storesList}
                snapToInterval={width * 0.75 + 12}
                decelerationRate="fast"
                removeClippedSubviews={false}
                initialNumToRender={stores.length}
                maxToRenderPerBatch={stores.length}
                windowSize={stores.length}
                getItemLayout={(data, index) => ({
                  length: width * 0.75 + 12,
                  offset: (width * 0.75 + 12) * index,
                  index,
                })}
                maintainVisibleContentPosition={{
                  minIndexForVisible: 0,
                }}
              />
              
              {selectedStore && (
                <View style={styles.storeDetailsContainer}>
                  <View style={styles.storeDetailsHeader}>
                    <View style={styles.storeDetailsInfo}>
                      <Text style={styles.storeDetailsName}>{selectedStore.storeInfo.name}</Text>
                      <View style={styles.storeDetailsRow}>
                        <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.storeDetailsText}>
                          {selectedStore.storeInfo.city}, {selectedStore.storeInfo.address}
                        </Text>
                      </View>
                      {selectedStore.storeInfo.working_hours && (
                        <View style={styles.storeDetailsRow}>
                          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                          <Text style={styles.storeDetailsText}>
                            {selectedStore.storeInfo.working_hours}
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    {selectedStore.storeInfo.phone && (
                      <TouchableOpacity 
                        style={styles.callButton}
                        onPress={() => Linking.openURL(`tel:${selectedStore.storeInfo.phone}`)}
                      >
                        <Ionicons name="call" size={20} color="#FFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <View style={styles.mapWrapper}>
                    <MapView
                      ref={mapRef}
                      style={styles.map}
                      initialRegion={{
                        latitude: parseFloat(selectedStore.storeInfo.latitude),
                        longitude: parseFloat(selectedStore.storeInfo.longitude),
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }}
                    >
                      <Marker
                        coordinate={{
                          latitude: parseFloat(selectedStore.storeInfo.latitude),
                          longitude: parseFloat(selectedStore.storeInfo.longitude),
                        }}
                        title={selectedStore.storeInfo.name}
                        description={selectedStore.storeInfo.address}
                      />
                    </MapView>
                    
                    <TouchableOpacity 
                      style={styles.mapOverlayButton}
                      onPress={() => openStoreMap(selectedStore.storeInfo)}
                    >
                      <Ionicons name="navigate" size={20} color="#FFF" />
                      <Text style={styles.mapOverlayButtonText}>Проложить маршрут</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          ) : (
            <View style={styles.noStores}>
              <View style={styles.noStoresIcon}>
                <Ionicons name="cube-outline" size={48} color={colors.textTertiary} />
              </View>
              <Text style={styles.noStoresText}>Информация о наличии скоро появится</Text>
            </View>
          )}
        </View>

        {/* Описание */}
        {product.description && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="document-text-outline" size={22} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Описание</Text>
            </View>
            <Text 
              style={styles.descriptionText}
              numberOfLines={showFullDescription ? undefined : 3}
            >
              {product.description}
            </Text>
            {product.description.length > 150 && (
              <TouchableOpacity 
                style={styles.showMoreButton}
                onPress={() => setShowFullDescription(!showFullDescription)}
              >
                <Text style={styles.showMoreText}>
                  {showFullDescription ? 'Скрыть' : 'Показать полностью'}
                </Text>
                <Ionicons 
                  name={showFullDescription ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color={colors.primary} 
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        <CompatibleCarsSection
  cars={compatibleCars}
  loading={compatibleCarsLoading}
  error={compatibleCarsError}
  colors={colors}
  theme={theme}
/>

        {/* Похожие товары */}
        {similarProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="bulb-outline" size={22} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Похожие товары</Text>
            </View>
            <FlatList
              data={similarProducts}
              renderItem={renderProductItem}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productsList}
              snapToInterval={width * 0.45 + 12}
              decelerationRate="fast"
            />
          </View>
        )}
      </ScrollView>

      {/* Фиксированная панель покупки */}
      <View style={[
    styles.bottomPanel, 
    { 
      bottom: insets.bottom + 54,
      paddingBottom: 0 
    }
  ]}>
       
        
        <View style={[
      styles.bottomContent,
      {
        paddingBottom: Platform.select({
          ios: insets.bottom > 0 ? insets.bottom : 20,
          android: 20
        })
      }
    ]}>
          <View style={styles.bottomPriceInfo}>
            <Text style={styles.bottomPriceLabel}>Итого:</Text>
            <Text style={styles.bottomPriceValue}>{parseFloat(product.price * quantity).toFixed(0)} ₽</Text>
          </View>
          
          <View style={styles.bottomActions}>
            {isInCart() ? (
              <>
                <View style={styles.quantitySection}>
                  <TouchableOpacity 
                    style={[styles.quantityButton, (quantity <= 1 || isUpdatingQuantity) && styles.quantityButtonDisabled]}
                    onPress={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1 || isUpdatingQuantity}
                  >
                    {isUpdatingQuantity ? (
                      <ActivityIndicator size="small" color={colors.textSecondary} />
                    ) : (
                      <Ionicons name="remove" size={20} color={quantity <= 1 ? colors.textTertiary : colors.text} />
                    )}
                  </TouchableOpacity>
                  
                  <View style={styles.quantityValue}>
                    <Text style={styles.quantityText}>{quantity}</Text>
                    {stores.length > 0 && (
                      <Text style={styles.quantityAvailable}>
                        из {getMaxAvailableQuantity()}
                      </Text>
                    )}
                  </View>
                  
                  <TouchableOpacity 
                    style={[
                      styles.quantityButton, 
                      (quantity >= getMaxAvailableQuantity() || quantity >= 20 || isUpdatingQuantity) && styles.quantityButtonDisabled
                    ]}
                    onPress={() => handleQuantityChange(1)}
                    disabled={quantity >= getMaxAvailableQuantity() || quantity >= 20 || isUpdatingQuantity}
                  >
                    {isUpdatingQuantity ? (
                      <ActivityIndicator size="small" color={colors.textSecondary} />
                    ) : (
                      <Ionicons 
                        name="add" 
                        size={20} 
                        color={(quantity >= getMaxAvailableQuantity() || quantity >= 20) ? colors.textTertiary : colors.text} 
                      />
                    )}
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity 
                  style={styles.buyButton}
                  onPress={FastBuyCart}
                  disabled={addingToCart || isUpdatingQuantity}
                >
                  {addingToCart ? (
                    <View style={styles.buyButtonContent}>
                      <ActivityIndicator size="small" color="#FFF" />
                    </View>
                  ) : (
                    <LinearGradient
                      colors={['#006363', '#004545']}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 1}}
                      style={styles.buyButtonGradient}
                    >
                      <Text style={styles.buyButtonText}>Купить</Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity 
                style={styles.addToCartButtonFull}
                onPress={addToCart}
                disabled={addingToCart}
              >
                {addingToCart ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="cart-outline" size={24} color={colors.primary} />
                    <Text style={styles.addToCartButtonTextFull}>В корзину</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
            <AddToCartModal
  visible={showCartModal}
  onClose={() => setShowCartModal(false)}
  onGoToCart={() => {
    setShowCartModal(false);
    navigation.navigate('Cart');
  }}
  product={addedProduct}
  quantity={addedQuantity}
  onAddRelatedProducts={handleAddRelatedProducts}
  authStore={authStore}
  cartStore={cartStore}
/>
      </View>
      

  
    </View>
  );
});

// Компонент для отображения характеристик
const SpecItem = ({ icon, title, value, highlight, colors, theme, styles }) => (
  <View style={[
    styles.specItem, 
    highlight && styles.specItemHighlight,
    { borderBottomColor: colors.border }
  ]}>
    <View style={styles.specLeft}>
      <View style={[
        styles.specIconContainer, 
        highlight && styles.specIconHighlight,
        { backgroundColor: highlight ? colors.primaryLight : colors.surface }
      ]}>
        <Ionicons name={icon} size={18} color={highlight ? colors.primary : colors.textSecondary} />
      </View>
      <Text style={[
        styles.specTitle, 
        highlight && styles.specTitleHighlight,
        { color: highlight ? colors.text : colors.textSecondary }
      ]}>{title}</Text>
    </View>
    <Text style={[
      styles.specValue, 
      highlight && styles.specValueHighlight,
      { color: highlight ? colors.primary : colors.text }
    ]}>{value || '—'}</Text>
  </View>
);

const themedStyles = (colors, theme) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    // paddingBottom будет динамическим
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.background,
  },
  errorIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme === 'dark' ? colors.surface : '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  errorButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  errorButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  carouselWrapper: {
    position: 'relative',
    marginBottom: -40,
    backgroundColor: colors.headerBackground,
  },
  carouselBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '120%',
  },
  carouselContainer: {
    backgroundColor: 'transparent',
    position: 'relative',
  },
  imageContainer: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  productImage: {
    width: '85%',
    height: '85%',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    alignSelf: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  mainInfo: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    marginBottom: 12,
    paddingTop: 50,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: theme === 'dark' ? 0.3 : 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  discountBadge: {
    position: 'absolute',
    top: 24,
    right: 24,
    backgroundColor: colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  discountText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productBrand: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  productName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
    lineHeight: 36,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  productPrice: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
    marginRight: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  productOldPrice: {
    fontSize: 22,
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? colors.successDark : '#D1FAE5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: 8,
  },
  availabilityText: {
    fontSize: 14,
    color: theme === 'dark' ? colors.success : '#059669',
    fontWeight: '600',
  },
  section: {
    backgroundColor: colors.card,
    marginBottom: 12,
    borderRadius: 16,
    marginHorizontal: 12,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  specsContainer: {
    marginTop: -8,
  },
  specItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  specItemHighlight: {
    backgroundColor: theme === 'dark' ? colors.primaryDark : '#F0FFFE',
    marginHorizontal: -20,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderBottomWidth: 0,
    marginBottom: 8,
  },
  specLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  specIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  specIconHighlight: {
    backgroundColor: colors.primaryLight,
  },
  specTitle: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  specTitleHighlight: {
    fontWeight: '500',
  },
  specValue: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  specValueHighlight: {
    color: colors.primary,
  },
  storesList: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  storeCard: {
    width: Dimensions.get('window').width * 0.75,
    marginHorizontal: 6,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme === 'dark' ? 0.3 : 0.1,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedStoreCard: {
    backgroundColor: theme === 'dark' ? colors.primaryDark : '#F0FFFE',
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.15,
    elevation: 6,
    transform: [{ scale: 1.02 }],
  },
  outOfStockCard: {
    opacity: 0.6,
  },
  storeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  storeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  storeAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  storeCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  inStockIndicator: {
    backgroundColor: theme === 'dark' ? colors.successDark : '#D1FAE5',
  },
  outOfStockIndicator: {
    backgroundColor: theme === 'dark' ? colors.errorDark : '#FEE2E2',
  },
  stockStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  inStockText: {
    color: theme === 'dark' ? colors.success : '#059669',
  },
  outOfStockText: {
    color: colors.error,
  },
  mapLinkButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noStores: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noStoresIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noStoresText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  storeDetailsContainer: {
    marginTop: 20,
  },
  storeDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  storeDetailsInfo: {
    flex: 1,
    marginRight: 16,
  },
  storeDetailsName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  storeDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  storeDetailsText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  mapWrapper: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapOverlayButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  mapOverlayButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  descriptionText: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  showMoreText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginRight: 4,
  },
bottomPanel: {
    position: 'absolute',
    bottom: 0, // Убираем фиксированное значение
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: theme === 'dark' ? 0.4 : 0.15,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 100, // Добавляем для гарантии отображения поверх контента
  },
 bottomContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    // paddingBottom будет динамическим
  },
  bottomPriceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bottomPriceLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  bottomPriceValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    backgroundColor: theme === 'dark' ? colors.surface : '#F9FAFB',
    opacity: 0.6,
  },
  quantityValue: {
    paddingHorizontal: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  quantityAvailable: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  buyButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
  },
  buyButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButtonContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  buyButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  productsList: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  productCard: {
    width: Dimensions.get('window').width * 0.45,
    marginHorizontal: 6,
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.3 : 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  productImageContainer: {
    width: '100%',
    height: 160,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  productCardImage: {
    width: '80%',
    height: '80%',
  },
  productDiscountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  productDiscountText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  productCardContent: {
    padding: 12,
  },
  productCardBrand: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  productCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    lineHeight: 18,
  },
  productCardSize: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  productCardPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  productCardPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginRight: 8,
  },
  productCardOldPrice: {
    fontSize: 14,
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  productCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 10,
    borderRadius: 10,
  },
  productCardButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 6,
  },
  addToCartButtonFull: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addToCartButtonTextFull: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
});

export default ProductScreen;