import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Animated,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import _ from 'lodash';
import FastImage from "@d11/react-native-fast-image";
import { observer } from 'mobx-react-lite';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import CustomLoader from '../components/CustomLoader';
import Tooltip from '../components/Tooltip'; 
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStores } from '../useStores';
import { Haptics } from 'react-native-nitro-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { MMKV } from 'react-native-mmkv';

const { width, height } = Dimensions.get('window');
const CARD_MARGIN = 12;
const CARD_WIDTH = (width - CARD_MARGIN * 3) / 2;
const LIST_ITEM_HEIGHT = 140; // высота элемента в режиме списка
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// Инициализация MMKV
const storage = new MMKV();

const ProductListScreen = observer(() => {
  const navigation = useNavigation();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const DEFAULT_IMAGE = 'https://api.koleso.app/public/img/no-image.jpg';
  const { authStore, favoritesStore, productStore } = useStores();
  
  const [backdropOpacity, setBackdropOpacity] = useState(0);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [localFavorites, setLocalFavorites] = useState({});
  const [lastScrollY, setLastScrollY] = useState(0);
  const [scrollDirection, setScrollDirection] = useState('up');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' или 'list'
  const [stores, setStores] = useState([]); // Информация о магазинах
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const sheetRef = useRef(null);
  const cardScaleAnims = useRef({}).current;

  const [tooltip, setTooltip] = useState({
    visible: false,
    title: '',
    description: '',
    position: { x: 0, y: 0 },
  });

  // Создаем refs на уровне компонента для хранения ссылок на элементы
  const badgeRefs = useRef({}).current;

  // Загрузка сохраненного режима отображения
  useEffect(() => {
    const savedViewMode = storage.getString('productListViewMode');
    if (savedViewMode) {
      setViewMode(savedViewMode);
    }
  }, []);

  // Функция переключения режима отображения
  const toggleViewMode = useCallback(() => {
    Haptics.impact('light');
    const newMode = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(newMode);
    
    // Сохраняем выбор пользователя
    storage.set('productListViewMode', newMode);
  }, [viewMode]);

  // Функция для получения или создания ref для элемента
  const getBadgeRef = useCallback((itemId, badgeType) => {
    const key = `${itemId}-${badgeType}`;
    if (!badgeRefs[key]) {
      badgeRefs[key] = React.createRef();
    }
    return badgeRefs[key];
  }, [badgeRefs]);

  // Функция для показа tooltip
  const showTooltip = useCallback((title, description, elementRef) => {
    if (elementRef && elementRef.current) {
      elementRef.current.measureInWindow((x, y, width, height) => {
        setTooltip({
          visible: true,
          title,
          description,
          position: {
            x: x + width / 2,
            y: y + height,
          },
        });
      });
    }
  }, []);

  // Функция для скрытия tooltip
  const hideTooltip = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  // Функции для разных типов tooltip
  const showDiscountTooltip = useCallback((discount, itemId) => {
    const ref = getBadgeRef(itemId, 'discount');
    showTooltip(
      'Скидка', 
      `На этот товар действует скидка ${discount}%. Цена уже указана с учетом скидки. Экономия составляет значительную сумму от первоначальной стоимости.`,
      ref
    );
  }, [showTooltip, getBadgeRef]);

  const showCashbackTooltip = useCallback((cashback, itemId) => {
    const ref = getBadgeRef(itemId, 'cashback');
    showTooltip(
      'Кешбек', 
      `Вы получите ${cashback.toLocaleString('ru-RU')} ₽ кешбека при покупке этого товара. Кешбек начисляется на ваш счет после получения и подтверждения заказа. Средства можно использовать для следующих покупок.`,
      ref
    );
  }, [showTooltip, getBadgeRef]);

  const showSpecTooltip = useCallback((specType, value, itemId) => {
    const ref = getBadgeRef(itemId, specType);
    let title = '';
    let description = '';
    
    switch (specType) {
      case 'size':
        title = 'Размер шины';
        description = `${value} - это размер шины в международном обозначении. Первое число (${value.split('/')[0]}) обозначает ширину профиля в миллиметрах, второе число (${value.split('/')[1]}) - высоту профиля в процентах от ширины, а R${value.split(' R')[1]} указывает на радиальную конструкцию и диаметр диска в дюймах.`;
        break;
      case 'season':
        title = 'Сезонность шин';
        if (value.toLowerCase().includes('лет')) {
          description = 'Летние шины разработаны для использования при температуре выше +7°C. Они обеспечивают отличное сцепление с дорогой на сухом и мокром асфальте, имеют оптимальный тормозной путь и управляемость в теплую погоду.';
        } else if (value.toLowerCase().includes('зим')) {
          description = 'Зимние шины предназначены для эксплуатации при температуре ниже +7°C. Специальный состав резиновой смеси сохраняет эластичность в мороз и обеспечивает надежное сцепление на снегу, льду и слякоти.';
        } else {
          description = 'Всесезонные шины представляют собой компромиссное решение для круглогодичного использования. Они подходят для регионов с мягким климатом, но уступают специализированным шинам в экстремальных условиях.';
        }
        break;
      case 'spikes':
        title = 'Шипованные шины';
        description = 'Шипы из твердосплавных материалов обеспечивают дополнительное сцепление на обледенелых участках дороги и укатанном снегу. Использование шипованных шин имеет сезонные ограничения и регулируется местным законодательством.';
        break;
    }
    
    showTooltip(title, description, ref);
  }, [showTooltip, getBadgeRef]);
  
  const insets = useSafeAreaInsets();
  const statusBarHeight = insets.top || 20;

  // Оптимизированная анимация для карточек
  const getCardAnimation = useCallback((itemId) => {
    if (!cardScaleAnims[itemId]) {
      cardScaleAnims[itemId] = new Animated.Value(1);
    }
    return cardScaleAnims[itemId];
  }, [cardScaleAnims]);

  // Обработка скролла с определением направления
  const handleScroll = useCallback((event) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const direction = currentScrollY > lastScrollY ? 'down' : 'up';
    
    scrollY.setValue(currentScrollY);
    
    if (currentScrollY > 50) {
      if (direction !== scrollDirection) {
        setScrollDirection(direction);
        
        Animated.spring(headerTranslateY, {
          toValue: direction === 'down' ? -80 : 0,
          useNativeDriver: true,
          tension: 300,
          friction: 20,
        }).start();
      }
    } else {
      Animated.spring(headerTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 300,
        friction: 20,
      }).start();
    }
    
    setLastScrollY(currentScrollY);
  }, [lastScrollY, scrollDirection, headerTranslateY]);

  const snapPoints = useMemo(() => {
    const tabBarHeight = 60;
    const sheetHeight = Math.min(height * 0.3, height - tabBarHeight - 100);
    return [sheetHeight];
  }, [height]);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        opacity={0.7}
        enableTouchThrough={false}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        style={[styles.backdrop, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
      />
    ),
    []
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        // Загружаем информацию о магазинах
        const storesResponse = await fetch('https://api.koleso.app/api/stores_products.php', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authStore.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (storesResponse.ok) {
          const storesData = await storesResponse.json();
          setStores(storesData);
        }

        // Загружаем товары
        await productStore.fetchProducts(true);
        
        Animated.spring(fadeAnim, {
          toValue: 1,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }).start();
      } catch (error) {
        console.error('Error loading data:', error);
        fadeAnim.setValue(1);
      }
    };
    
    loadData();
    
    return () => {
      productStore.reset();
      fadeAnim.setValue(0);
    };
  }, [authStore.token]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      favoritesStore.refreshFavorites(authStore.token);
      setLocalFavorites({});
    });
  
    return unsubscribe;
  }, [navigation, authStore.token, favoritesStore]);

  const loadMore = useCallback(
    _.throttle(() => {
      if (!productStore.isBackgroundLoad && !productStore.loading && productStore.hasMore) {
        productStore.fetchProducts(false);
      }
    }, 1000),
    [productStore.isBackgroundLoad, productStore.loading, productStore.hasMore]
  );

  const handleRefresh = useCallback(() => {
    if (!productStore.isManualRefresh && !productStore.isInitialLoad) {
      productStore.fetchProducts(true);
    }
  }, [productStore.isManualRefresh, productStore.isInitialLoad]);

  const renderSeasonIcon = useCallback((season) => {
    if (!season) return <></>;
    
    const seasonLower = season.toLowerCase();
    const iconProps = {
      size: 16,
      style: styles.seasonIcon
    };
    
    if (seasonLower.includes('лет')) {
      return <Ionicons name="sunny" color={colors.warning} {...iconProps} />;
    } else if (seasonLower.includes('зим')) {
      return <Ionicons name="snow" color={colors.primary} {...iconProps} />;
    } else if (seasonLower.includes('всесезон')) {
      return <MaterialCommunityIcons name="weather-partly-cloudy" color={colors.textSecondary} {...iconProps} />;
    }
    return <></>;
  }, [colors]);

  const formatTireSize = useCallback((width, profile, diameter) => {
    const formatNumber = (num) => {
      const number = parseFloat(num);
      return number % 1 === 0 ? number.toString() : num;
    };

    return `${formatNumber(width)}/${formatNumber(profile)} R${formatNumber(diameter)}`;
  }, []);

  const isFavorite = useCallback((productId) => {
    if (localFavorites.hasOwnProperty(productId)) {
      return localFavorites[productId];
    }
    return favoritesStore.items.some(item => item.product_id == productId);
  }, [localFavorites, favoritesStore.items]);

  const toggleFavorite = useCallback(async (product) => {
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
  }, [authStore.token, isFavorite, favoritesStore]);

  const handleCardPressIn = useCallback((itemId) => {
    Animated.spring(getCardAnimation(itemId), {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  }, [getCardAnimation]);

  const handleCardPressOut = useCallback((itemId) => {
    Animated.spring(getCardAnimation(itemId), {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  }, [getCardAnimation]);

  const calculatePriceWithCashback = useCallback((price, cashback) => {
    const numPrice = parseFloat(price) || 0;
    const numCashback = parseFloat(cashback) || 0;
    
    if (numCashback > 0) {
      return numPrice - numCashback;
    }
    return numPrice;
  }, []);

  // Рендер элемента в режиме списка (1 колонка)
  const renderListItem = useCallback(({ item }) => {
    const animatedStyle = {
      transform: [{ scale: getCardAnimation(item.id) }],
      opacity: fadeAnim,
    };

    const discount = item.old_price && item.old_price > item.price
      ? Math.round(((item.old_price - item.price) / item.old_price) * 100)
      : 0;

    const cashback = parseFloat(item.cashback) || 0;
    const hasCashback = cashback > 0;
    const finalPrice = calculatePriceWithCashback(item.price, cashback);

    // Получаем остатки с названиями магазинов
    const stocksData = [];
if (item.stocks && typeof item.stocks === 'object') {
  Object.entries(item.stocks).forEach(([storeId, quantity]) => {
    if (quantity > 0) { // Только если quantity > 0
      const store = stores.find(s => s.id === storeId);
      stocksData.push({
        id: storeId,
        name: store ? store.name : `Магазин ${storeId}`,
        available: true, // quantity точно > 0
        quantity: quantity,
        isActive: store ? store.is_active === '1' : true
      });
    }
  });
}

// Сортируем: сначала активные магазины с наличием, потом остальные
stocksData.sort((a, b) => {
  if (a.isActive && !b.isActive) return -1;
  if (!a.isActive && b.isActive) return 1;
  if (a.available && !b.available) return -1;
  if (!a.available && b.available) return 1;
  return b.quantity - a.quantity;
});

    return (
      <AnimatedTouchableOpacity
        style={[styles.listItemContainer, animatedStyle]}
        onPress={() => navigation.navigate('Product', { productId: item.id })}
        onPressIn={() => handleCardPressIn(item.id)}
        onPressOut={() => handleCardPressOut(item.id)}
        activeOpacity={1}
      >
        <View style={styles.listItemContent}>
          {/* Изображение товара */}
          <View style={styles.listItemImageContainer}>
            <FastImage
              style={styles.listItemImage}
              source={{ uri: item.image_url || DEFAULT_IMAGE }}
              resizeMode="contain"
            />
            {item.out_of_stock && (
              <View style={styles.listItemOutOfStock}>
                <Text style={styles.listItemOutOfStockText}>Нет в наличии</Text>
              </View>
            )}
            {discount > 0 && (
              <View style={styles.listItemDiscountBadge}>
                <Text style={styles.discountText}>-{discount}%</Text>
              </View>
            )}
          </View>

          {/* Информация о товаре */}
          <View style={styles.listItemInfo}>
            <View style={styles.listItemHeader}>
              <View style={styles.listItemTitleSection}>
                <Text style={styles.listItemBrand} numberOfLines={1}>
                  {item.brand || ''}{item.model ? ` • ${item.model}` : ''}
                </Text>
                <Text style={styles.listItemName} numberOfLines={2}>
                  {item.name || ''}
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.listItemFavoriteButton}
                onPress={(e) => {
                  e.stopPropagation();
                  toggleFavorite(item);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={isFavorite(item.id) ? "heart" : "heart-outline"}
                  size={24}
                  color={isFavorite(item.id) ? colors.error : colors.text}
                />
              </TouchableOpacity>
            </View>

            {/* Характеристики для шин */}
            {item.category === 'Автошины' && (
              <View style={styles.listItemSpecs}>
                <View style={styles.specBadge}>
                  <Text style={styles.specText}>
                    {formatTireSize(item.width || 0, item.profile || 0, item.diameter || 0)}
                  </Text>
                </View>
                {item.season && (
                  <View style={styles.specBadge}>
                    {renderSeasonIcon(item.season)}
                    <Text style={styles.specText}>{item.season}</Text>
                  </View>
                )}
                {item.spiked === 1 && (
                  <View style={styles.specBadge}>
                    <Text style={styles.specText}>Шипы</Text>
                  </View>
                )}
              </View>
            )}

            {/* Характеристики для дисков */}
            {item.category === 'Диски' && (
              <View style={styles.listItemSpecs}>
                <View style={styles.specBadge}>
                  <Text style={styles.specText}>
                    {item.width}x{item.diameter} {item.pcd}
                  </Text>
                </View>
                {item.et && (
                  <View style={styles.specBadge}>
                    <Text style={styles.specText}>ET{item.et}</Text>
                  </View>
                )}
                {item.dia && (
                  <View style={styles.specBadge}>
                    <Text style={styles.specText}>DIA{item.dia}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Цена и кешбек */}
            <View style={styles.listItemPriceSection}>
              <View>
                <Text style={styles.listItemPrice}>
                  {item.price ? parseFloat(item.price).toLocaleString('ru-RU') + ' ₽' : 'Цена не указана'}
                </Text>
                {item.old_price && item.old_price > item.price && (
                  <Text style={styles.listItemOldPrice}>
                    {parseFloat(item.old_price).toLocaleString('ru-RU')} ₽
                  </Text>
                )}
              </View>
              {hasCashback && (
                <View style={styles.listItemCashback}>
                  <Ionicons name="refresh-circle" size={16} color={colors.success} />
                  <Text style={styles.listItemCashbackText}>
                    Цена с кешбеком: {finalPrice.toLocaleString('ru-RU')} ₽
                  </Text>
                </View>
              )}
            </View>

            {/* Наличие в магазинах - отображаем все */}
            {stocksData.length > 0 && (
              <View style={styles.listItemStores}>
                <View style={styles.listItemStoresHeader}>
                  <Text style={styles.listItemStoresTitle}>Наличие в магазинах:</Text>
                  {item.total_store_stock > 0 && (
                    <Text style={styles.listItemTotalStock}>
                      Всего: {item.total_store_stock} шт.
                    </Text>
                  )}
                </View>
                <View style={styles.listItemStoresFullList}>
                  {stocksData.map((store) => (
                    <View key={store.id} style={styles.listItemStoreRow}>
                      <View style={[
                        styles.listItemStoreIndicator,
                        { backgroundColor: store.available ? colors.success : colors.textTertiary }
                      ]} />
                      <Text style={[
                        styles.listItemStoreNameFull,
                        { 
                          color: store.available ? colors.text : colors.textTertiary,
                          opacity: store.isActive ? 1 : 0.6
                        }
                      ]} numberOfLines={1}>
                        {store.name}
                      </Text>
                      <Text style={styles.listItemStoreQuantity}>
    {store.quantity} шт.
  </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      </AnimatedTouchableOpacity>
    );
  }, [
    toggleFavorite,
    getCardAnimation,
    handleCardPressIn,
    handleCardPressOut,
    formatTireSize,
    renderSeasonIcon,
    navigation,
    fadeAnim,
    calculatePriceWithCashback,
    colors,
    stores
  ]);

  // Оригинальный рендер элемента в режиме сетки (2 колонки)
  const renderGridItem = useCallback(({ item, index }) => {
    const animatedStyle = {
      transform: [{ scale: getCardAnimation(item.id) }],
      opacity: fadeAnim,
    };

    const discount = item.old_price && item.old_price > item.price
      ? Math.round(((item.old_price - item.price) / item.old_price) * 100)
      : 0;

    const cashback = parseFloat(item.cashback) || 0;
    const hasCashback = cashback > 0;
    const finalPrice = calculatePriceWithCashback(item.price, cashback);

    return (
      <AnimatedTouchableOpacity
        style={[styles.itemContainer, animatedStyle]}
        onPress={() => navigation.navigate('Product', { productId: item.id })}
        onPressIn={() => handleCardPressIn(item.id)}
        onPressOut={() => handleCardPressOut(item.id)}
        activeOpacity={1}
      >
        <View style={styles.badgesWrapper}>
          {discount > 0 && (
            <TouchableOpacity
              ref={getBadgeRef(item.id, 'discount')}
              style={[styles.discountBadge, { top: 8 }]}
              onPress={(e) => {
                e.stopPropagation();
                showDiscountTooltip(discount, item.id);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.discountText}>-{discount}%</Text>
            </TouchableOpacity>
          )}

          {hasCashback && (
            <TouchableOpacity
              ref={getBadgeRef(item.id, 'cashback')}
              style={[styles.cashbackBadge, { top: discount > 0 ? 34 : 8 }]}
              onPress={(e) => {
                e.stopPropagation();
                showCashbackTooltip(cashback, item.id);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-circle" size={14} color="#FFFFFF" />
              <Text style={styles.cashbackBadgeText}>-{cashback.toLocaleString('ru-RU')} ₽</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.imageContainer}>
          <FastImage
            style={styles.productImage}
            source={{ uri: item.image_url || DEFAULT_IMAGE }}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={(e) => {
              e.stopPropagation();
              toggleFavorite(item);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.favoriteIconContainer}>
              <Ionicons
                name={isFavorite(item.id) ? "heart" : "heart-outline"}
                size={20}
                color={isFavorite(item.id) ? colors.error : colors.text}
              />
            </View>
          </TouchableOpacity>

          {item.out_of_stock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Нет в наличии</Text>
            </View>
          )}
        </View>

        <View style={styles.productInfo}>
          <View style={styles.productHeader}>
            <Text style={styles.productBrand} numberOfLines={1}>
              {item.brand || ''}{item.model ? ` • ${item.model}` : ''}
            </Text>
          </View>

          <Text style={styles.productName} numberOfLines={3}>
            {item.name || ''}
          </Text>

          <View style={styles.priceRow}>
            <View style={styles.priceContainer}>
              <Text style={styles.productPrice}>
                {item.price ? parseFloat(item.price).toLocaleString('ru-RU') + ' ₽' : 'Цена не указана'}
              </Text>
              {item.old_price && item.old_price > item.price && (
                <Text style={styles.productOldPrice}>
                  {parseFloat(item.old_price).toLocaleString('ru-RU')} ₽
                </Text>
              )}
            </View>
            {!item.out_of_stock && (
              <View style={styles.stockIndicator}>
                <View style={styles.stockDot} />
              </View>
            )}
          </View>

          {hasCashback && (
            <View style={styles.cashbackInfo}>
              <Ionicons name="refresh-circle-outline" size={14} color={colors.success} />
              <Text style={styles.cashbackText}>
                Цена с кешбеком: {finalPrice.toLocaleString('ru-RU')} ₽
              </Text>
            </View>
          )}

          {item.category === 'Автошины' && (
            <View style={styles.specsContainer}>
              <TouchableOpacity
                ref={getBadgeRef(item.id, 'size')}
                style={styles.specBadge}
                onPress={(e) => {
                  e.stopPropagation();
                  showSpecTooltip('size', formatTireSize(item.width || 0, item.profile || 0, item.diameter || 0), item.id);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.specText}>
                  {formatTireSize(item.width || 0, item.profile || 0, item.diameter || 0)}
                </Text>
              </TouchableOpacity>
              
              {item.season && (
                <TouchableOpacity
                  ref={getBadgeRef(item.id, 'season')}
                  style={styles.specBadge}
                  onPress={(e) => {
                    e.stopPropagation();
                    showSpecTooltip('season', item.season, item.id);
                  }}
                  activeOpacity={0.8}
                >
                  {renderSeasonIcon(item.season)}
                  <Text style={styles.specText}>{item.season || ''}</Text>
                </TouchableOpacity>
              )}
              
              {item.spiked === 1 && (
                <TouchableOpacity
                  ref={getBadgeRef(item.id, 'spikes')}
                  style={styles.specBadge}
                  onPress={(e) => {
                    e.stopPropagation();
                    showSpecTooltip('spikes', 'Шипы', item.id);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.specText}>Шипы</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </AnimatedTouchableOpacity>
    );
  }, [
    toggleFavorite, 
    getCardAnimation, 
    handleCardPressIn, 
    handleCardPressOut,
    formatTireSize, 
    renderSeasonIcon, 
    navigation, 
    fadeAnim, 
    calculatePriceWithCashback,
    getBadgeRef,
    showDiscountTooltip,
    showCashbackTooltip,
    showSpecTooltip,
    colors
  ]);

  // Выбор функции рендера в зависимости от режима
  const renderItem = viewMode === 'grid' ? renderGridItem : renderListItem;

  const keyExtractor = useCallback((item) => `product-${item.id}-${item.sku}`, []);

  const openFilters = useCallback(() => {
    sheetRef.current?.close();
    navigation.navigate('FilterScreen', {
      initialFilters: productStore.filters,
      onApplyFilters: (newFilters) => {
        productStore.setFilters(newFilters);
        productStore.fetchProducts(true);
      }
    });
  }, [navigation, productStore]);

  const handleSortSelect = useCallback((sortType) => {
    productStore.setSort(sortType);
    productStore.fetchProducts(true);
    sheetRef.current?.close();
  }, [productStore]);

  const handleSheetChange = useCallback((index) => {
    setIsBottomSheetOpen(index >= 0);
  }, []);

  const filtersList = useMemo(() => [
     {
      id: 'view',
      icon: viewMode === 'grid' ? 'list' : 'grid',
      onPress: toggleViewMode,
      active: false,
      label: viewMode === 'grid' ? 'Список' : 'Сетка'
    },
    { 
      id: 'sort', 
      icon: 'swap-vertical-outline', 
      onPress: () => sheetRef.current?.expand(),
      active: productStore.filters.sort !== null,
      label: 'Сортировка'
    },
    { 
      id: 'options', 
      icon: 'options-outline', 
      onPress: openFilters,
      active: Object.entries(productStore.filters).some(([key, value]) => 
        key !== 'sort' && value !== null && value !== false && value?.length !== 0
      ),
      label: 'Фильтры'
    },
    { 
      id: 'auto', 
      icon: 'car', 
      onPress: () => navigation.navigate('FilterAuto', { presentation: 'modal' }),
      active: productStore.carFilter !== null,
      label: 'Авто'
    },
  ], [productStore.filters, productStore.carFilter, openFilters, navigation, viewMode, toggleViewMode]);

  const ListHeaderComponent = useMemo(() => (
    <View style={styles.listHeader}>
      <Text style={styles.listHeaderTitle}>Каталог товаров</Text>
      <Text style={styles.listHeaderSubtitle}>
        {productStore.products.length} товаров
      </Text>
    </View>
  ), [productStore.products.length]);

  return (
    <GestureHandlerRootView style={styles.rootContainer}>
      <StatusBar 
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.background} 
      />
      <View style={[styles.container, { paddingTop: statusBarHeight }]}>
        {/* Современный заголовок с фильтрами */}
        <Animated.View style={[
          styles.filterWrapper,
          {
            transform: [{ translateY: headerTranslateY }],
            paddingTop: statusBarHeight + 8,
          }
        ]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
            bounces={false}
          >
            {filtersList.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterChip,
                  filter.active && styles.filterChipActive,
                  filter.id === 'view' && styles.viewModeChip
                ]}
                onPress={filter.onPress}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={filter.icon}
                  size={18}
                  color={filter.active ? '#FFFFFF' : (filter.id === 'view' ? colors.primary : colors.text)}
                  style={styles.filterIcon}
                />
                <Text style={[
                  styles.filterLabel,
                  filter.active && styles.filterLabelActive,
                  filter.id === 'view' && styles.viewModeLabel
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
            
            {/* Активные фильтры */}
            {productStore.carFilter && (
              <TouchableOpacity
                style={styles.activeFilterChip}
                onPress={() => productStore.clearCarFilter()}
                activeOpacity={0.7}
              >
                <Text style={styles.activeFilterText} numberOfLines={1}>
                  {`${productStore.carFilter.marka} ${productStore.carFilter.model}`}
                </Text>
                <Ionicons name="close" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </ScrollView>
        </Animated.View>

        {/* Основной контент */}
        {productStore.isInitialLoad && !productStore.isManualRefresh ? (
          <View style={styles.fullscreenLoader}>
            <CustomLoader color={colors.primary} size={40} />
            <Text style={styles.loadingText}>Загружаем товары...</Text>
          </View>
        ) : (
          <Animated.View style={[styles.listContainer, { opacity: fadeAnim }]}>
            <AnimatedFlatList
              ref={flatListRef}
              data={productStore.products}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              numColumns={viewMode === 'grid' ? 2 : 1}
              key={viewMode} // Важно для переключения количества колонок
              columnWrapperStyle={viewMode === 'grid' ? styles.columnWrapper : null}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={ListHeaderComponent}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              initialNumToRender={6}
              maxToRenderPerBatch={6}
              windowSize={10}
              removeClippedSubviews={Platform.OS === 'android'}
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              refreshControl={
                <RefreshControl
                  refreshing={productStore.isManualRefresh}
                  onRefresh={handleRefresh}
                  tintColor={colors.primary}
                  progressViewOffset={100}
                />
              }
              ListFooterComponent={
                productStore.isBackgroundLoad ? (
                  <View style={styles.footerLoader}>
                    <CustomLoader size={24} color={colors.primary} />
                  </View>
                ) : null
              }
              ListEmptyComponent={
                !productStore.loading && (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={64} color={colors.textTertiary} />
                    <Text style={styles.emptyTitle}>Ничего не найдено</Text>
                    <Text style={styles.emptyText}>
                      Попробуйте изменить параметры поиска
                    </Text>
                  </View>
                )
              }
            />
          </Animated.View>
        )}

        {/* Модернизированный BottomSheet */}
        <BottomSheet
          ref={sheetRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose={true}
          bottomInset={insets.bottom + 20}
          onChange={handleSheetChange}
          backdropComponent={renderBackdrop}
          backgroundStyle={[styles.bottomSheetBackground, { backgroundColor: colors.card }]}
          handleIndicatorStyle={styles.bottomSheetHandle}
        >
          <BottomSheetView style={[styles.bottomSheetContent, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.bottomSheetTitle}>Сортировка</Text>
            
            {[
              { value: 'price_asc', label: 'Сначала дешевле', icon: 'trending-up' },
              { value: 'price_desc', label: 'Сначала дороже', icon: 'trending-down' },
              { value: null, label: 'По умолчанию', icon: 'list' },
            ].map((option) => (
              <TouchableOpacity 
                key={option.value}
                style={styles.sortOption}
                onPress={() => handleSortSelect(option.value)}
                activeOpacity={0.7}
              >
                <View style={styles.sortOptionLeft}>
                  <Ionicons
                    name={option.icon}
                    size={24}
                    color={productStore.filters.sort === option.value ? colors.primary : colors.textSecondary}
                    style={styles.sortIcon}
                  />
                  <Text style={[
                    styles.sortOptionText,
                    productStore.filters.sort === option.value && styles.sortOptionTextActive
                  ]}>
                    {option.label}
                  </Text>
                </View>
                <Ionicons
                  name={productStore.filters.sort === option.value ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={productStore.filters.sort === option.value ? colors.primary : colors.textTertiary}
                />
              </TouchableOpacity>
            ))}
          </BottomSheetView>
        </BottomSheet>
        
        {tooltip.visible && (
          <Tooltip
            visible={tooltip.visible}
            onClose={hideTooltip}
            title={tooltip.title}
            description={tooltip.description}
            position={tooltip.position}
          />
        )}
      </View>
    </GestureHandlerRootView>
  );
});

const themedStyles = (colors, theme) => ({
  rootContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    zIndex: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  viewModeChip: {
    backgroundColor: theme === 'dark' ? 'rgba(0, 122, 255, 0.15)' : '#E5F1FF',
    borderColor: colors.primary,
  },
  filterIcon: {
    marginRight: 6,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  filterLabelActive: {
    color: '#FFFFFF',
  },
  viewModeLabel: {
    color: colors.primary,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    backgroundColor: theme === 'dark' ? 'rgba(0, 122, 255, 0.15)' : '#E5F1FF',
    borderRadius: 20,
    maxWidth: 180,
  },
  activeFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    marginRight: 6,
  },
  listContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingTop: 120,
    paddingBottom: 20,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  listHeaderTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  listHeaderSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: CARD_MARGIN,
  },
  
  // Стили для режима сетки (2 колонки)
  itemContainer: {
    width: CARD_WIDTH,
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: CARD_MARGIN,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: colors.surface,
    height: CARD_WIDTH * 0.85,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  productImage: {
    width: '85%',
    height: '85%',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  favoriteIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  outOfStockText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  productInfo: {
    padding: 12,
    flex: 1,
  },
  productHeader: {
    marginBottom: 2,
  },
  productBrand: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 18,
    marginBottom: 8,
    minHeight: 54,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priceContainer: {
    flex: 1,
  },
  productPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  productOldPrice: {
    fontSize: 13,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  stockIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  cashbackBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  cashbackBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 2,
  },
  cashbackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: theme === 'dark' ? 'rgba(52, 199, 89, 0.15)' : '#F0F9F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cashbackText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.success,
    marginLeft: 4,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 1,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  specsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginHorizontal: -2,
  },
  specBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginHorizontal: 2,
    marginBottom: 3,
    backgroundColor: colors.surface,
    borderRadius: 6,
  },
  specText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.text,
    marginLeft: 1,
  },
  seasonIcon: {
    marginRight: 2,
  },
  
  // Стили для режима списка (1 колонка)
  listItemContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginHorizontal: CARD_MARGIN,
    marginBottom: CARD_MARGIN,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  listItemContent: {
    flexDirection: 'row',
    padding: 12,
  },
  listItemImageContainer: {
    width: 100,
    height: 100,
    backgroundColor: colors.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  listItemImage: {
    width: '85%',
    height: '85%',
  },
  listItemOutOfStock: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  listItemOutOfStockText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.error,
  },
  listItemDiscountBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    backgroundColor: colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  listItemTitleSection: {
    flex: 1,
    marginRight: 8,
  },
  listItemBrand: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  listItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 20,
  },
  listItemFavoriteButton: {
    padding: 4,
  },
  listItemSpecs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 8,
    marginHorizontal: -2,
  },
  listItemPriceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  listItemPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  listItemOldPrice: {
    fontSize: 14,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  listItemCashback: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? 'rgba(52, 199, 89, 0.15)' : '#F0F9F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  listItemCashbackText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.success,
    marginLeft: 4,
  },
  listItemStores: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  listItemStoresHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  listItemStoresTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  listItemTotalStock: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  listItemStoresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  listItemStore: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  listItemStoreIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  listItemMoreStores: {
    fontSize: 11,
    color: colors.textTertiary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  
  // Остальные стили
  fullscreenLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: colors.textSecondary,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomSheetBackground: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  bottomSheetHandle: {
    backgroundColor: colors.textTertiary,
    width: 36,
    height: 5,
    borderRadius: 3,
    marginTop: 8,
  },
  bottomSheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginVertical: 20,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sortOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortIcon: {
    marginRight: 12,
  },
  sortOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  sortOptionTextActive: {
    color: colors.primary,
    fontWeight: '500',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  badgesWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 2,
  },
  listItemStoreRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: 2,
  // можно добавить marginBottom: 2, если хочется немного разделить строки
},
listItemStoreNameFull: {
  flex: 1,
  fontSize: 13,
  color: colors.text,
  fontWeight: '500',
  marginRight: 8,
  opacity: 1, // если нужно менять прозрачность для неактивных магазинов, делай это inline
},

listItemStoreQuantity: {
  fontSize: 13,
  color: colors.success,
  fontWeight: '600',
  minWidth: 48, // чтобы числа были выровнены по правому краю
  textAlign: 'right',
},

});

export default React.memo(ProductListScreen);