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
  Dimensions
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

const { width } = Dimensions.get('window');
const CARD_MARGIN = 8;
const CARD_WIDTH = (width - CARD_MARGIN * 3) / 2;
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const ProductListScreen = observer(() => {


  const navigation = useNavigation();
  const { authStore, favoritesStore } = useStores();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeFilter, setActiveFilter] = useState(null);
  const [backdropOpacity, setBackdropOpacity] = useState(0);
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isBackgroundLoad, setIsBackgroundLoad] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);
  const flatListRef = useRef(null);
  const sheetRef = useRef(null);
  
  const insets = useSafeAreaInsets();
  const statusBarHeight = insets.top;

  const [filters, setFilters] = useState({
    inStockOnly: false,
    season: null,
    spiked: null,
    runflat_tech: null,
    sort: null
  });

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        opacity={backdropOpacity}
        enableTouchThrough={false}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        style={styles.backdrop}
      />
    ),
    [backdropOpacity]
  );

  // Анимации для фильтров
  const filterTranslateY = scrollY.interpolate({
    inputRange: [-50, 0, 50],
    outputRange: [0, 0, -50],
    extrapolate: 'clamp',
  });
  
  const filterOpacity = scrollY.interpolate({
    inputRange: [-30, 0, 30],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  const snapPoints = useMemo(() => ["35%"], []);
  
  const fetchProducts = useCallback(async (reset = false, explicitPage = null) => {
    try {
      if (!isMounted.current) return;
      
      const currentPage = explicitPage !== null ? explicitPage : (reset ? 1 : page);
      
      if (reset) {
        if (!isManualRefresh) setIsInitialLoad(true);
        setIsManualRefresh(true);
      } else {
        setIsBackgroundLoad(true);
      }
      
      setLoading(true);

      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(`${key}[]`, v));
          } else if (typeof value === 'boolean') {
            if (value) params.append(key, '1');
          } else {
            params.append(key, value);
          }
        }
      });
      
      params.append('page', currentPage);
      params.append('per_page', 16);

      const response = await fetch(`https://api.koleso.app/api/filter_products.php?${params.toString()}`);
      const data = await response.json();

      if (!isMounted.current) return;


     

      if (reset) {
        setProducts(data.data);
        favoritesStore.updateFavoritesPrices(data.data);
        setIsManualRefresh(false);
      } else {
        setProducts(prev => {
          const existingSkus = new Set(prev.map(p => p.sku));
          const newItems = data.data.filter(item => !existingSkus.has(item.sku));
          favoritesStore.updateFavoritesPrices(newItems);
          return [...prev, ...newItems];
        });
      }
      
      setHasMore(data.pagination.current_page < data.pagination.last_page);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        if (reset) {
          setIsInitialLoad(false);
        } else {
          setIsBackgroundLoad(false);
        }
        
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [filters, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      isMounted.current = true;
      fetchProducts(true);
    }, 300);
    
    return () => {
      isMounted.current = false;
      clearTimeout(timer);
    };
  }, [filters]);

  const loadMore = useCallback(() => {
    if (!isBackgroundLoad && !loading && hasMore) {
      setPage(prev => {
        const newPage = prev + 1;
        fetchProducts(false, newPage);
        return newPage;
      });
    }
  }, [loading, hasMore, fetchProducts, isBackgroundLoad]);

  const handleRefresh = useCallback(() => {
    if (!isManualRefresh && !isInitialLoad) {
      setIsManualRefresh(true);
      fetchProducts(true);
    }
  }, [fetchProducts, isManualRefresh, isInitialLoad]);

  const renderSeasonIcon = (season) => {
    if (!season) return null;
    
    const seasonLower = season.toLowerCase();
    
    if (seasonLower.includes('лет')) {
      return <Ionicons name="sunny" size={14} color="#FFA500" style={styles.seasonIcon} />;
    } else if (seasonLower.includes('зим')) {
      return <Ionicons name="snow" size={14} color="#4682B4" style={styles.seasonIcon} />;
    } else if (seasonLower.includes('всесезон')) {
      return <MaterialCommunityIcons name="weather-partly-cloudy" size={14} color="#808080" style={styles.seasonIcon} />;
    }
    return null;
  };

  const formatTireSize = (width, profile, diameter) => {
    const formatNumber = (num) => {
      const number = parseFloat(num);
      return number % 1 === 0 ? number.toString() : num;
    };

    return `${formatNumber(width)}/${formatNumber(profile)} R${formatNumber(diameter)}`;
  };
  

  const isFavorite = (productId) => {
    console.log('Current favorites:', favoritesStore.items);
    console.log('Checking for product:', productId);
    const found = favoritesStore.items.some(item => {
      console.log('Comparing with:', item.product_id, 'Type:', typeof item.product_id);
      return item.product_id == productId; // Используем нестрогое сравнение
    });
    console.log('Result:', found);
    return found;
  };

// Оптимизированное переключение избранного
const toggleFavorite = useCallback(async (product) => {
  const favorite = isFavorite(product.id);
  try {
    if (favorite) {
      await favoritesStore.removeFromFavorites(product.id, authStore.token);
    } else {
      await favoritesStore.addToFavorites({
        id: product.id,
        name: product.name,
        brand: product.brand,
        model: product.model,
        price: product.price,
        image_url: product.image_url,
        out_of_stock: product.out_of_stock,
        // Другие необходимые поля
      }, authStore.token);
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
  }
}, [isFavorite, authStore.token]);
  

const renderItem = useCallback(({ item }) => {
  const favorite = isFavorite(item.id);
  
  
  
  return (
    <TouchableOpacity 
      style={styles.itemContainer} 
      onPress={() => navigation.navigate('Product', { productId: item.id })}
    >
       <View style={styles.imageContainer}>
        <FastImage
          style={styles.productImage}
          source={{ uri: item.image_url || DEFAULT_IMAGE }}
        />
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation();
            toggleFavorite(item);
          }}
        >
          <Ionicons
            name={favorite ? "heart" : "heart-outline"}
            size={24}
            //style={styles.favoriteIcon}
            color={favorite ? "#FF3B30" : "#000"}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productBrand} numberOfLines={1}>
          {item.brand} {item.model}
        </Text>
        
        <Text style={styles.productPrice}>{item.price} ₽</Text>
        
        {item.out_of_stock ? (
          <Text style={styles.outOfStock}>Нет в наличии</Text>
        ) : (
          <Text style={styles.inStock}>В наличии</Text>
        )}
        
        {item.category === 'Автошины' && (
          <View style={styles.specsContainer}>
            <Text style={styles.specText}>{formatTireSize(item.width, item.profile, item.diameter)}</Text>
            {item.season && (
              <View style={styles.seasonContainer}>
               {renderSeasonIcon(item.season)}
                <Text style={styles.specText}> {item.season}</Text>
              </View>
            )}
            {item.spiked === 1 && <Text style={styles.specText}>Шипованные</Text>}
            {item.runflat_tech && <Text style={styles.specText}>{item.runflat_tech}</Text>}
          </View>
        )}
      </View>
    </TouchableOpacity>
 );
}, [isFavorite, toggleFavorite]);

  const keyExtractor = useCallback((item) => `product-${item.sku}-${item.last_sync_at || '0'}`, []);

  const openFilters = () => {
    isBottomSheetOpen ? sheetRef.current?.close() : null ;
    navigation.navigate('FilterScreen', {
      initialFilters: filters,
      onApplyFilters: (newFilters) => {
        setFilters(newFilters);
        setPage(1);
        fetchProducts(true);
      }
    });
  };

  const handleSortSelect = (sortType) => {
    setFilters(prev => ({ ...prev, sort: sortType }));
    setPage(1);
    fetchProducts(true);
    handleClose();
  };

  const handleSheetChange = useCallback((index) => {
    const isOpen = index >= 0;
    setIsBottomSheetOpen(isOpen);
    setBackdropOpacity(isOpen ? 0.5 : 0);
  }, []);

  const handleClose = useCallback(() => {
    sheetRef.current?.close();
  }, []);

  const filterLabels = {
    category: 'Категория',
    brand: 'Бренд',
    diameter: 'Диаметр',
    inStockOnly: 'В наличии',
    season: 'Сезон',
    spiked: 'Шипы',
    runflat_tech: 'RunFlat',
    sort: 'Сортировка',
  };

  const filtersList = [
    { 
      id: 'sort', 
      icon: 'swap-vertical-outline', 
      onPress: () => isBottomSheetOpen ? sheetRef.current?.close() : sheetRef.current?.expand(),
      active: filters.sort !== null
    },
    { 
      id: 'options', 
      icon: 'options-outline', 
      onPress: openFilters,
      active: Object.entries(filters).some(([key, value]) => 
        key !== 'sort' && value !== null && value !== false && value.length !== 0
      )
    },
  ];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: statusBarHeight }]}>
        {/* Фильтры */}
        <Animated.View style={[
          styles.filterWrapper,
          {
            transform: [{ translateY: filterTranslateY }],
            opacity: filterOpacity,
            zIndex: 10,
            top: statusBarHeight,
          }
        ]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          >
            {filtersList.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterItem,
                  filter.active && styles.activeFilter
                ]}
                onPress={filter.onPress}
              >
                <Ionicons
                  name={filter.icon}
                  size={20}
                  color={filter.active ? '#fff' : '#000'}
                />
                
              </TouchableOpacity>
            ))}
            {Object.entries(filters)
              .filter(([key, value]) => value !== null && value !== false && value.length !== 0 && key !== 'sort')
              .map(([key, value]) => {
                const label = filterLabels[key] || key;
                if(key === 'spiked') {
                  if (value === 0) value = 'Без шипов';
                  else if (value === 1) value = 'Шипованные';
                  else if(value.length === 2) value = 'Все';
                }
                const displayValue = Array.isArray(value) ? value.join(', ') : value;
                
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.filterItem, styles.activeFilter]}
                    onPress={() => setFilters((prev) => ({ ...prev, [key]: null }))}
                  >
                    <Text style={styles.activeFilterText}>{`${label}: ${displayValue}`}</Text>
                    <Ionicons name="close-circle-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                );
              })}
          </ScrollView>
        </Animated.View>

        {isInitialLoad && !isManualRefresh && (
          <View style={styles.fullscreenLoader}>
            <CustomLoader 
              color="#005BFF" 
              size={48}
            />
          </View>
        )}

        <Animated.View style={[styles.listContainer, { opacity: fadeAnim }]}>
          <AnimatedFlatList
            ref={flatListRef}
            data={products}
            contentContainerStyle={{ paddingTop: 60 }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={10}
            onEndReached={_.throttle(loadMore, 1000)}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={isManualRefresh}
                onRefresh={handleRefresh}
                progressViewOffset={60}
              />
            }
            ListFooterComponent={
              isBackgroundLoad ? (
                <View style={styles.footerLoader}>
                  <CustomLoader size={25} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              !loading && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Товары не найдены. Попробуйте изменить фильтры.</Text>
                </View>
              )
            }
          />
        </Animated.View>

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
            
            <TouchableOpacity 
              style={styles.sortOption}
              onPress={() => handleSortSelect('price_asc')}
            >
              <Ionicons
                name={filters.sort === 'price_asc' ? 'radio-button-on' : 'radio-button-off'}
                size={24}
                color={filters.sort === 'price_asc' ? '#005BFF' : '#ccc'}
              />
              <Text style={styles.sortOptionText}>По возрастанию цены</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.sortOption}
              onPress={() => handleSortSelect('price_desc')}
            >
              <Ionicons
                name={filters.sort === 'price_desc' ? 'radio-button-on' : 'radio-button-off'}
                size={24}
                color={filters.sort === 'price_desc' ? '#005BFF' : '#ccc'}
              />
              <Text style={styles.sortOptionText}>По убыванию цены</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.sortOption}
              onPress={() => handleSortSelect(null)}
            >
              <Ionicons
                name={filters.sort === null ? 'radio-button-on' : 'radio-button-off'}
                size={24}
                color={filters.sort === null ? '#005BFF' : '#ccc'}
              />
              <Text style={styles.sortOptionText}>Без сортировки</Text>
            </TouchableOpacity>
          </BottomSheetView>
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
  
);
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  filterWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingVertical: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filterContainer: {
    paddingHorizontal: 12,
    alignItems: 'center',
    height: 40,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    height: 36,
  },
  activeFilter: {
    backgroundColor: '#005BFF',
  },
  activeFilterText: {
    color: '#fff',
    marginRight: 4,
    fontSize: 12,
  },
  filterCloseIcon: {
    marginLeft: 4,
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  itemContainer: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: CARD_MARGIN,
  },
  productImage: {
    width: '100%',
    height: CARD_WIDTH - 20,
    borderRadius: 4,
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
    height: 36,
  },
  productBrand: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  inStock: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '500',
  },
  outOfStock: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: '500',
  },
  specsContainer: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  specText: {
    fontSize: 10,
    color: '#555',
    marginRight: 6,
    marginBottom: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  seasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seasonIcon: {
    marginRight: 2,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: CARD_MARGIN,
  },
  fullscreenLoader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    zIndex: 10,
  },
  footerLoader: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 15,
    color: '#666',
  },
  bottomSheetBackground: {
    backgroundColor: '#fff',
    borderRadius: 20,
  },
  bottomSheetHandle: {
    backgroundColor: '#ccc',
    width: 40,
    height: 4,
  },
  bottomSheetContent: {
    padding: 20,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sortOptionText: {
    fontSize: 16,
    marginLeft: 12,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0)',
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: '#fff',
  },
  favoriteButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteIcon: {
    
    textShadowColor: 'rgb(0, 0, 0)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    backgroundColor: '#fff',
  },
});

export default React.memo(ProductListScreen);