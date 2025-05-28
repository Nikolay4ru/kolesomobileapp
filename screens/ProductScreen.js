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
import ShareHelper from '../components/Share';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Carousel, {
  ICarouselInstance,
  Pagination,
} from "react-native-reanimated-carousel";
import MapView, { Marker } from 'react-native-maps';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import LinearGradient from 'react-native-linear-gradient';

const ProductScreen = observer(() => {
  const DEFAULT_IMAGE = 'https://api.koleso.app/public/img/no-image.jpg';
  const API_URL = 'https://api.koleso.app/api';
  const route = useRoute();
  const navigation = useNavigation();
  const { productId, fromCart, modal } = route.params;
  const { cartStore, authStore, favoritesStore } = useStores();
  const [localFavorites, setLocalFavorites] = useState({});

  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
// Затем используйте это для определения statusBarHeight
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
  
  const mapRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  const width = Dimensions.get("window").width;
  const ref = useRef(null);
  const animatedIndex = useSharedValue(0);


 // Функция проверки наличия товара в корзине
  const isInCart = useCallback(() => {
    return cartStore.items.some(item => item.product_id == product?.id);
  }, [cartStore.items, product?.id]);


    // Получение количества товара из корзины
  const getCartQuantity = useCallback(() => {
    const cartItem = cartStore.items.find(item => item.product_id == product?.id);
    return cartItem ? cartItem.quantity : 0;
  }, [cartStore.items, product?.id]);


 const [quantity, setQuantity] = useState(1);
  const [isUpdatingQuantity, setIsUpdatingQuantity] = useState(false);

useEffect(() => {
  if (product && isInCart()) {
    const cartItem = cartStore.items.find(item => item.product_id == product.id);
    if (cartItem) {
      setQuantity(cartItem.quantity);
    }
  }
}, [product, cartStore.items, isInCart]);



   // Функция для обновления статистики просмотров
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
      
      // Обновляем статистику просмотров при загрузке товара
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



  useEffect(() => {
  const unsubscribe = navigation.addListener('focus', () => {
    favoritesStore.refreshFavorites(authStore.token);
    setLocalFavorites(favoritesStore.items);
    cartStore.loadCart(authStore.token); // Загружаем корзину при фокусе
  });
  
  return unsubscribe;
}, [navigation]);

 // Загружаем корзину при монтировании
  useEffect(() => {
    if (authStore.isLoggedIn) {
      cartStore.loadCart(authStore.token);
    }
  }, [authStore.isLoggedIn, authStore.token]);

  // Загрузка похожих товаров
  const fetchSimilarProducts = async (currentProduct) => {
    try {
     // // Загрузка товаров с таким же брендом и моделью (разные размеры)
     // if (currentProduct.category === 'Автошины') {
     //   const sameBrandResponse = await fetch(
     //     `https://api.koleso.app/api/product.php?action=same-model&product_id=${currentProduct.id}&limit=10`
     //   );
     //   if (sameBrandResponse.ok) {
     //     const sameBrandData = await sameBrandResponse.json();
     //     if (sameBrandData.success) {
     //       const filtered = sameBrandData.products
     //         .filter(p => p.id !== currentProduct.id)
     //         .slice(0, 10);
     //       setSameBrandProducts(filtered);
     //     }
     //   }
     // }

      // Загрузка похожих товаров
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
          console.log(filtered);
        }
      }
    } catch (error) {
      console.error('Error fetching similar products:', error);
    }
  };

// Обновленная функция изменения количества
  const handleQuantityChange = async (value) => {
    if (!product || isUpdatingQuantity) return;
    
    const newValue = quantity + value;
    if (newValue < 1 || newValue > 20) return;
    
    try {
      setIsUpdatingQuantity(true);
      Haptics.impact('light');
      
      if (isInCart()) {
        // Если товар в корзине, обновляем через cartStore
        const cartItem = cartStore.items.find(item => item.product_id == product.id);
        if (cartItem) {
          await cartStore.updateItemQuantity(cartItem.id, newValue, authStore.token);
          setQuantity(newValue);
        }
      } else {
        // Если товара нет в корзине, просто обновляем локальное состояние
        setQuantity(newValue);
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      Alert.alert('Ошибка', 'Не удалось обновить количество');
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


       const cartItem = cartStore.items.find(item => item.product_id == product.id);
    
    if (cartItem) {
      // Если товар уже в корзине, обновляем количество
      await cartStore.updateItemQuantity(cartItem.id, quantity, authStore.token);
    } else {
      // Если товара нет в корзине, добавляем
      await cartStore.addToCart({
        product_id: product.id,
        quantity,
        price: product.price,
        name: product.name,
        brand: product.brand,
        image_url: product.images[0]
      }, authStore.token);
    }
       
      Alert.alert('Успешно', 'Товар добавлен в корзину', [
        { text: 'OK', onPress: () => {} },
        { 
          text: 'Перейти в корзину', 
          onPress: () => navigation.navigate('Cart')
        }
      ]);
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

    try {
      setAddingToCart(true);
      const cartItem = cartStore.items.find(item => item.product_id == product.id);
    
    if (cartItem) {
      // Если товар уже в корзине, обновляем количество
      await cartStore.updateItemQuantity(cartItem.id, quantity, authStore.token);
    } else {
      // Если товара нет в корзине, добавляем
      await cartStore.addToCart({
        product_id: product.id,
        quantity,
        price: product.price,
        name: product.name,
        brand: product.brand,
        image_url: product.images[0]
      }, authStore.token);
    }
      
      navigation.navigate('Cart');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось добавить товар в корзину');
      console.error('Add to cart error:', error);
    } finally {
      setAddingToCart(false);
    }
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

  const renderStoreItem = ({ item }) => {
    const isSelected = selectedStore?.store_id === item.store_id;
    const inStock = item.quantity > 0;
    
    return (
      <TouchableOpacity 
        style={[
          styles.storeCard,
          isSelected && styles.selectedStoreCard,
          !inStock && styles.outOfStockCard
        ]}
        onPress={() => setSelectedStore(isSelected ? null : item)}
        activeOpacity={0.7}
      >
        <View style={styles.storeCardHeader}>
          <View style={styles.storeIconContainer}>
            <Ionicons name="business" size={20} color={inStock ? "#006363" : "#CCC"} />
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
              color={inStock ? "#10B981" : "#EF4444"} 
            />
            <Text style={[styles.stockStatus, inStock ? styles.inStockText : styles.outOfStockText]}>
              {inStock ? `${item.quantity} шт` : 'Нет'}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.mapLinkButton}
            onPress={() => openStoreMap(item.storeInfo)}
          >
            <Ionicons name="navigate-outline" size={18} color="#006363" />
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
              
              Alert.alert('Успешно', 'Товар добавлен в корзину');
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось добавить товар в корзину');
            }
          }}
        >
          <Ionicons name="cart-outline" size={20} color="#006363" />
          <Text style={styles.productCardButtonText}>В корзину</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#006363" />
        <Text style={styles.loadingText}>Загружаем детали товара...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIcon}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
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
          <Ionicons name="search-outline" size={64} color="#999" />
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
    <View style={[styles.container, { paddingTop: statusBarHeight }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" translucent={false} />
      
      <CustomHeader 
        title=""
        navigation={navigation}
        statusBarProps={{
          barStyle: 'dark-content',
          backgroundColor: '#F5F5F5'
        }}
        safeAreaStyle={{
          backgroundColor: '#F5F5F5',
          paddingTop: 0 || 0
        }}
        headerStyle={{
          backgroundColor: '#F5F5F5',
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          marginTop: 0 || 0
        }}
        rightAction={() => toggleFavorite()}
        onBackPress={handleBackPress}
        rightIcon={isFavorite(productId) ? "heart" : "heart-outline"}
        rightIcon2="share-outline"
        rightAction2={() => handleShare()}
        iconColorRight2="#333"              
        iconColorRight={isFavorite(productId) ? "#FF6B6B" : "#333"}
        iconColorLeft="#333"
        titleStyle={{ color: '#333' }}
        withBackButton
      />
     
      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 140 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Карусель изображений */}
        <View style={styles.carouselWrapper}>
          <LinearGradient
            colors={['#F5F5F5', '#F5F5F5', '#FFFFFF']}
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
            <View style={styles.ratingContainer}>
              <Ionicons name="" size={16} color="" />
              <Text style={styles.ratingText}></Text>
              <Text style={styles.reviewsText}></Text>
            </View>
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
              <>
            <View style={styles.availabilityBadge}>
              <View style={styles.availabilityDot} />
              <Text style={styles.availabilityText}>В наличии</Text>
            </View>
             </>
            )}
          </View>
         
          
          {/* Быстрые действия */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="analytics-outline" size={20} color="#006363" />
              <Text style={styles.quickActionText}>Сравнить</Text>
            </TouchableOpacity>
            
            <View style={styles.quickActionDivider} />
            
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#006363" />
              <Text style={styles.quickActionText}>Гарантия</Text>
            </TouchableOpacity>
            
            <View style={styles.quickActionDivider} />
            
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="cube-outline" size={20} color="#006363" />
              <Text style={styles.quickActionText}>Доставка</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Характеристики */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="list-outline" size={22} color="#006363" />
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
                />
                <SpecItem icon="snow-outline" title="Сезон" value={product.season} />
                <SpecItem icon="speedometer-outline" title="Индексы" value={`${product.load_index}/${product.speed_index}`} />
                <SpecItem icon="car-sport-outline" title="RunFlat" value={product.runflat ? 'Есть' : 'Нет'} />
                {product.spiked && <SpecItem icon="snow-outline" title="Шипы" value="Есть" highlight />}
              </>
            )}
            
            {product.category === 'Диски' && (
              <>
                <SpecItem icon="disc-outline" title="Тип" value={product.rim_type} />
                <SpecItem icon="resize-outline" title="Диаметр" value={`R${formatValue(product.diameter)}`} highlight />
                <SpecItem icon="git-network-outline" title="PCD" value={`${product.hole}x${formatValue(product.pcd)}`} />
                <SpecItem icon="arrow-forward-outline" title="Вылет" value={`ET${formatValue(product.et)}`} />
                <SpecItem icon="disc-outline" title="DIA" value={formatValue(product.dia)} />
                <SpecItem icon="color-palette-outline" title="Цвет" value={product.rim_color} />
              </>
            )}
            
            {product.category === 'Аккумуляторы' && (
              <>
                <SpecItem icon="battery-full-outline" title="Емкость" value={`${product.capacity} А·ч`} highlight />
                <SpecItem icon="flash-outline" title="Пусковой ток" value={`${product.starting_current} А`} />
                <SpecItem icon="swap-horizontal-outline" title="Полярность" value={product.polarity} />
              </>
            )}
          </View>
        </View>

        {/* Наличие в магазинах */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="location-outline" size={22} color="#006363" />
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
                snapToInterval={width * 0.85 + 12}
                decelerationRate="fast"
              />
              
              {selectedStore && (
                <View style={styles.storeDetailsContainer}>
                  <View style={styles.storeDetailsHeader}>
                    <View style={styles.storeDetailsInfo}>
                      <Text style={styles.storeDetailsName}>{selectedStore.storeInfo.name}</Text>
                      <View style={styles.storeDetailsRow}>
                        <Ionicons name="location-outline" size={16} color="#6B7280" />
                        <Text style={styles.storeDetailsText}>
                          {selectedStore.storeInfo.city}, {selectedStore.storeInfo.address}
                        </Text>
                      </View>
                      {selectedStore.storeInfo.working_hours && (
                        <View style={styles.storeDetailsRow}>
                          <Ionicons name="time-outline" size={16} color="#6B7280" />
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
                <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
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
                <Ionicons name="document-text-outline" size={22} color="#006363" />
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
                  color="#006363" 
                />
              </TouchableOpacity>
            )}
          </View>
        )}



        {/* Похожие товары */}
        {similarProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="bulb-outline" size={22} color="#006363" />
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
      <View style={[styles.bottomPanel, { paddingBottom: tabBarHeight }]}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,1)']}
          style={styles.bottomPanelGradient}
        />
        
        <View style={styles.bottomContent}>
          <View style={styles.bottomPriceInfo}>
            <Text style={styles.bottomPriceLabel}>Итого:</Text>
            <Text style={styles.bottomPriceValue}>{parseFloat(product.price * quantity).toFixed(0)} ₽</Text>
          </View>
          
          <View style={styles.bottomActions}>
            {isInCart() ? (
              <>
                <View style={styles.quantitySection}>
                  <TouchableOpacity 
                    style={[styles.quantityButton, quantity <= 1 && styles.quantityButtonDisabled]}
                    onPress={() => handleQuantityChange(-1)}
                    disabled={quantity <= 0}
                  >
                    <Ionicons name="remove" size={20} color={quantity <= 0 ? "#D1D5DB" : "#374151"} />
                  </TouchableOpacity>
                  
                  <View style={styles.quantityValue}>
                    <Text style={styles.quantityText}>{quantity}</Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={[styles.quantityButton, quantity >= 20 && styles.quantityButtonDisabled]}
                    onPress={() => handleQuantityChange(1)}
                    disabled={quantity >= 20}
                  >
                    <Ionicons name="add" size={20} color={quantity >= 20 ? "#D1D5DB" : "#374151"} />
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity 
                  style={styles.buyButton}
                  onPress={FastBuyCart}
                  disabled={addingToCart}
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
                  <ActivityIndicator size="small" color="#006363" />
                ) : (
                  <>
                    <Ionicons name="cart-outline" size={24} color="#006363" />
                    <Text style={styles.addToCartButtonText}>В корзину</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
});


// Компонент для отображения характеристик
const SpecItem = ({ icon, title, value, highlight }) => (
  <View style={[styles.specItem, highlight && styles.specItemHighlight]}>
    <View style={styles.specLeft}>
      <View style={[styles.specIconContainer, highlight && styles.specIconHighlight]}>
        <Ionicons name={icon} size={18} color={highlight ? "#006363" : "#6B7280"} />
      </View>
      <Text style={[styles.specTitle, highlight && styles.specTitleHighlight]}>{title}</Text>
    </View>
    <Text style={[styles.specValue, highlight && styles.specValueHighlight]}>{value || '—'}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  content: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F8FAFB',
  },
  errorIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  errorButton: {
    backgroundColor: '#006363',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#006363',
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
    backgroundColor: '#F5F5F5',
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
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#006363',
    width: 24,
  },
  mainInfo: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    marginBottom: 12,
    paddingTop: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  discountBadge: {
    position: 'absolute',
    top: 24,
    right: 24,
    backgroundColor: '#EF4444',
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
    color: '#006363',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  productName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
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
    color: '#111827',
    marginRight: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  productOldPrice: {
    fontSize: 22,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  availabilityText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  quickActionText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 6,
    fontWeight: '500',
  },
  quickActionDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
  },
  section: {
    backgroundColor: '#FFF',
    marginBottom: 12,
    borderRadius: 16,
    marginHorizontal: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
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
    backgroundColor: '#E6F4F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionActionText: {
    fontSize: 14,
    color: '#006363',
    fontWeight: '500',
    marginRight: 4,
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
    borderBottomColor: '#F3F4F6',
  },
  specItemHighlight: {
    backgroundColor: '#F0FFFE',
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
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  specIconHighlight: {
    backgroundColor: '#E6F4F4',
  },
  specTitle: {
    fontSize: 15,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  specTitleHighlight: {
    color: '#374151',
    fontWeight: '500',
  },
  specValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  specValueHighlight: {
    color: '#006363',
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
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  selectedStoreCard: {
    backgroundColor: '#F0FFFE',
    shadowColor: '#006363',
    shadowOpacity: 0.2,
    elevation: 6,
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
    backgroundColor: '#E6F4F4',
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
    color: '#111827',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  storeAddress: {
    fontSize: 14,
    color: '#6B7280',
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
    backgroundColor: '#D1FAE5',
  },
  outOfStockIndicator: {
    backgroundColor: '#FEE2E2',
  },
  stockStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  inStockText: {
    color: '#059669',
  },
  outOfStockText: {
    color: '#DC2626',
  },
  mapLinkButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F4F4',
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
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noStoresText: {
    fontSize: 16,
    color: '#6B7280',
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
    color: '#111827',
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
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  mapWrapper: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
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
    backgroundColor: '#006363',
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
    color: '#4B5563',
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
    borderTopColor: '#F3F4F6',
  },
  showMoreText: {
    fontSize: 14,
    color: '#006363',
    fontWeight: '600',
    marginRight: 4,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  bottomPanelGradient: {
    position: 'absolute',
    top: -60,
    left: 0,
    right: 0,
    height: 60,
  },
  bottomContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  bottomPriceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bottomPriceLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  bottomPriceValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 4,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    backgroundColor: '#F9FAFB',
  },
  quantityValue: {
    paddingHorizontal: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  addToCartButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#006363',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: '#006363',
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
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  productImageContainer: {
    width: '100%',
    height: 160,
    backgroundColor: '#F8FAFB',
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
    backgroundColor: '#EF4444',
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
    color: '#006363',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  productCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 18,
  },
  productCardSize: {
    fontSize: 13,
    color: '#6B7280',
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
    color: '#111827',
    marginRight: 8,
  },
  productCardOldPrice: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  productCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F4F4',
    paddingVertical: 10,
    borderRadius: 10,
  },
  productCardButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#006363',
    marginLeft: 6,
  },
  addToCartButtonActive: {
  backgroundColor: '#006363',
  borderWidth: 0,
},
addToCartButtonText: {
  color: '#FFF',
  fontSize: 14,
  fontWeight: '600',
  marginLeft: 6,
},
addToCartButtonFull: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  height: 52,
  borderRadius: 16,
  backgroundColor: '#FFF',
  borderWidth: 2,
  borderColor: '#006363',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},
addToCartButtonText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#006363',
  marginLeft: 8,
},
reviewsPreview: {
    marginTop: 16,
  },
  reviewsStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  reviewsRating: {
    flex: 1,
  },
  reviewsRatingNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  reviewsStars: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  reviewsCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F4F4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  writeReviewText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#006363',
    marginLeft: 8,
  },
});

export default ProductScreen;