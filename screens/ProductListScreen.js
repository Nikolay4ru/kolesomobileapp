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
  Platform
} from 'react-native';
import _ from 'lodash';
import FastImage from "@d11/react-native-fast-image";
import { observer } from 'mobx-react-lite';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import CustomLoader from '../components/CustomLoader';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStores } from '../useStores';
import { Haptics } from 'react-native-nitro-haptics';

const { width, height } = Dimensions.get('window');
const CARD_MARGIN = 12;
const CARD_WIDTH = (width - CARD_MARGIN * 3) / 2;
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const ProductListScreen = observer(() => {
  const navigation = useNavigation();
  const DEFAULT_IMAGE = 'https://api.koleso.app/public/img/no-image.jpg';
  const { authStore, favoritesStore, productStore } = useStores();
  
  const [backdropOpacity, setBackdropOpacity] = useState(0);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [localFavorites, setLocalFavorites] = useState({});
  const [lastScrollY, setLastScrollY] = useState(0);
  const [scrollDirection, setScrollDirection] = useState('up');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const sheetRef = useRef(null);
  const cardScaleAnims = useRef({}).current;
  
  const insets = useSafeAreaInsets();
  const statusBarHeight = insets.top || 20; // Минимальный отступ 20 для старых устройств

  // Оптимизированная анимация для карточек
  const getCardAnimation = useCallback((itemId) => {
    if (!cardScaleAnims[itemId]) {
      cardScaleAnims[itemId] = new Animated.Value(1);
    }
    return cardScaleAnims[itemId];
  }, [cardScaleAnims]);

  // Анимации для фильтров с более плавным эффектом
  const filterTranslateY = scrollY.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [0, 0, -60],
    extrapolate: 'clamp',
  });
  
  const filterOpacity = scrollY.interpolate({
    inputRange: [-50, 0, 50],
    outputRange: [1, 1, 0.3],
    extrapolate: 'clamp',
  });

  const filterScale = scrollY.interpolate({
    inputRange: [-50, 0, 100],
    outputRange: [1, 1, 0.95],
    extrapolate: 'clamp',
  });

  // Обработка скролла с определением направления
  const handleScroll = useCallback((event) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const direction = currentScrollY > lastScrollY ? 'down' : 'up';
    
    // Обновляем анимированное значение для других анимаций
    scrollY.setValue(currentScrollY);
    
    // Анимация header в зависимости от направления скролла
    if (currentScrollY > 50) { // Начинаем скрывать после 50px скролла
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
      // Всегда показываем header в начале списка
      Animated.spring(headerTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 300,
        friction: 20,
      }).start();
    }
    
    setLastScrollY(currentScrollY);
  }, [lastScrollY, scrollDirection, headerTranslateY]);

  const snapPoints = useMemo(() => ["40%"], []);

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
        await productStore.fetchProducts(true);
        
        Animated.spring(fadeAnim, {
          toValue: 1,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }).start();
      } catch (error) {
        console.error('Error loading products:', error);
        fadeAnim.setValue(1);
      }
    };
    
    loadData();
    
    return () => {
      productStore.reset();
      fadeAnim.setValue(0);
    };
  }, []);

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
      return <Ionicons name="sunny" color="#FF9500" {...iconProps} />;
    } else if (seasonLower.includes('зим')) {
      return <Ionicons name="snow" color="#007AFF" {...iconProps} />;
    } else if (seasonLower.includes('всесезон')) {
      return <MaterialCommunityIcons name="weather-partly-cloudy" color="#8E8E93" {...iconProps} />;
    }
     return <></>; // Возвращаем фрагмент вместо null
}, []);

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

  const renderItem = useCallback(({ item, index }) => {
    const animatedStyle = {
      transform: [{ scale: getCardAnimation(item.id) }],
      opacity: fadeAnim,
    };

    return (

      <AnimatedTouchableOpacity 
        style={[styles.itemContainer, animatedStyle]}
        onPress={() => navigation.navigate('Product', { productId: item.id })}
        onPressIn={() => handleCardPressIn(item.id)}
        onPressOut={() => handleCardPressOut(item.id)}
        activeOpacity={1}
      >
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
                color={isFavorite(item.id) ? "#FF3B30" : "#3C3C43"}
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
            <Text style={styles.productPrice}>
              {item.price ? parseFloat(item.price).toLocaleString('ru-RU') + ' ₽' : 'Цена не указана'}
            </Text>
            {!item.out_of_stock && (
              <View style={styles.stockIndicator}>
                <View style={styles.stockDot} />
              </View>
            )}
          </View>
          
          {item.category === 'Автошины' && (
            <View style={styles.specsContainer}>
              <View style={styles.specBadge}>
                <Text style={styles.specText}>
                   {formatTireSize(item.width || 0, item.profile || 0, item.diameter || 0)}
                </Text>
              </View>
              {item.season && (
                <View style={styles.specBadge}>
                  {renderSeasonIcon(item.season)}
                  <Text style={styles.specText}>{item.season || ''}</Text>
                </View>
              )}
              {item.spiked === 1 && (
                <View style={styles.specBadge}>
                  <Text style={styles.specText}>Шипы</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </AnimatedTouchableOpacity>
    );
  }, [toggleFavorite, getCardAnimation, handleCardPressIn, handleCardPressOut, 
      formatTireSize, renderSeasonIcon, navigation, fadeAnim]);

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
  ], [productStore.filters, productStore.carFilter, openFilters, navigation]);

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
      <View style={[styles.container, { paddingTop: statusBarHeight }]}>
        {/* Современный заголовок с фильтрами */}
        <Animated.View style={[
          styles.filterWrapper,
          {
            transform: [
              { translateY: headerTranslateY }
            ],
            paddingTop: statusBarHeight + 8, // Добавляем отступ для Dynamic Island
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
                  filter.active && styles.filterChipActive
                ]}
                onPress={filter.onPress}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={filter.icon}
                  size={18}
                  color={filter.active ? '#FFFFFF' : '#3C3C43'}
                  style={styles.filterIcon}
                />
                <Text style={[
                  styles.filterLabel,
                  filter.active && styles.filterLabelActive
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
                <Ionicons name="close" size={16} color="#007AFF" />
              </TouchableOpacity>
            )}
          </ScrollView>
        </Animated.View>

        {/* Основной контент */}
        {productStore.isInitialLoad && !productStore.isManualRefresh ? (
          <View style={styles.fullscreenLoader}>
            <CustomLoader color="#007AFF" size={40} />
            <Text style={styles.loadingText}>Загружаем товары...</Text>
          </View>
        ) : (
          <Animated.View style={[styles.listContainer, { opacity: fadeAnim }]}>
            <AnimatedFlatList
              ref={flatListRef}
              data={productStore.products}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              numColumns={2}
              columnWrapperStyle={styles.columnWrapper}
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
                  tintColor="#007AFF"
                  progressViewOffset={100}
                />
              }
              ListFooterComponent={
                productStore.isBackgroundLoad ? (
                  <View style={styles.footerLoader}>
                    <CustomLoader size={24} color="#007AFF" />
                  </View>
                ) : null
              }
              ListEmptyComponent={
                !productStore.loading && (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={64} color="#C7C7CC" />
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
          onChange={handleSheetChange}
          backdropComponent={renderBackdrop}
          backgroundStyle={styles.bottomSheetBackground}
          handleIndicatorStyle={styles.bottomSheetHandle}
        >
          <BottomSheetView style={styles.bottomSheetContent}>
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
                    color={productStore.filters.sort === option.value ? '#007AFF' : '#8E8E93'}
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
                  color={productStore.filters.sort === option.value ? '#007AFF' : '#C7C7CC'}
                />
              </TouchableOpacity>
            ))}
          </BottomSheetView>
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
  );
});

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  filterWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
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
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterIcon: {
    marginRight: 6,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3C3C43',
  },
  filterLabelActive: {
    color: '#FFFFFF',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    backgroundColor: '#E5F1FF',
    borderRadius: 20,
    maxWidth: 180,
  },
  activeFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginRight: 6,
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  listContent: {
    paddingTop: 120, // Увеличиваем отступ сверху для компенсации фильтров и Dynamic Island
    paddingBottom: 20,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  listHeaderTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  listHeaderSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: CARD_MARGIN,
  },
  itemContainer: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: CARD_MARGIN,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: '#FAFAFA',
    height: CARD_WIDTH * 0.85,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
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
    color: '#8E8E93',
    letterSpacing: 0.3,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    lineHeight: 18,
    marginBottom: 8,
    minHeight: 54, // Увеличено для 3 строк
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  stockIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
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
    backgroundColor: '#F2F2F7',
    borderRadius: 6,
  },
  specText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#3C3C43',
    marginLeft: 1,
  },
  seasonIcon: {
    marginRight: 2,
  },
  fullscreenLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#8E8E93',
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
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  bottomSheetHandle: {
    backgroundColor: '#D1D1D6',
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
    color: '#000000',
    textAlign: 'center',
    marginVertical: 20,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
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
    color: '#000000',
  },
  sortOptionTextActive: {
    color: '#007AFF',
    fontWeight: '500',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default React.memo(ProductListScreen);