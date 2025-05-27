import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Dimensions
} from 'react-native';
import _ from 'lodash';
import FastImage from "@d11/react-native-fast-image";
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Slider } from '@miblanchard/react-native-slider';
import CustomLoader from '../components/CustomLoader';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getNextId } from 'mobx/dist/internal';
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const { width } = Dimensions.get('window');
const CARD_MARGIN = 8;
const CARD_WIDTH = (width - CARD_MARGIN * 3) / 2;

const ProductListScreen = () => {
  const navigation = useNavigation();
  // Состояния
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const [backdropOpacity, setBackdropOpacity] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false); // Отдельное состояние для ручного обновления
  const [isInitialLoad, setIsInitialLoad] = useState(true);
const [isManualRefresh, setIsManualRefresh] = useState(false);
const [isBackgroundLoad, setIsBackgroundLoad] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [loaderVisible, setLoaderVisible] = useState(true);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );




  
  const filterScale = isBottomSheetOpen ? 0.95 : 1;
  const filterTranslateY = Animated.add(
    scrollY.interpolate({
      inputRange: [0, 50],
      outputRange: [0, -50],
      extrapolate: 'clamp',
    }),
    isBottomSheetOpen ? new Animated.Value(10) : new Animated.Value(0)
  );
  
  const filterOpacity = scrollY.interpolate({
    inputRange: [0, 30],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });


    const insets = useSafeAreaInsets();
    const statusBarHeight = insets.top;
   // Состояния для UI фильтров
  // const [expandedFilter, setExpandedFilter] = useState(null);
   

  // Функция для обновления фильтров
  const updateFilter = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

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



  // В начале файла ProductListScreen.js
const [filterSheetOpen, setFilterSheetOpen] = useState(false);
const filterSheetRef = useRef(null);

// Настройки высоты BottomSheet
const filterSnapPoints = useMemo(() => ["90%"], []);

// Функции управления
const openFilterSheet = () => {
  setFilterSheetOpen(true);
  filterSheetRef.current?.expand();
};

const closeFilterSheet = () => {
  setFilterSheetOpen(false);
  filterSheetRef.current?.close();
};


 // Фильтры и сортировка
 const [filters, setFilters] = useState({
  //category: 'Автошины',
//  price_from: 0,
 // price_to: 99000,
 //priceRange: [0, 9999999],
  inStockOnly: false,
  season: null,
  spiked: null,
  runflat_tech: null,
  sort: null // 'price_asc' или 'price_desc'
});

 // Refs
  const isMounted = useRef(true);
  const flatListRef = useRef(null);

  // Отмена запросов при размонтировании
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);



// variables
// 1. Правильное создание ref
const sheetRef = useRef(0);

// 2. Настройки высоты
const snapPoints = useMemo(() => [ "35%"], []);

// 3. Функции управления
const handleOpen = () => sheetRef.current?.collapse();
const handleClose = () => sheetRef.current?.close();


 // callbacks
 const handleSheetChange = useCallback((index) => {
  const isOpen = index >= 0;
  setIsBottomSheetOpen(isOpen);
  setBackdropOpacity(isOpen ? 0.5 : 0);
}, []);


const handleSnapPress = useCallback((index) => {
  sheetRef.current?.snapToIndex(index);
}, []);
const handleClosePress = useCallback(() => {
  sheetRef.current?.close();
}, []);





  // Функция загрузки товаров
  const fetchProducts = useCallback(async (reset = false, explicitPage = null) => {
    try {
      
      if (!isMounted.current) return;
      console.log(filters);
      const currentPage = explicitPage !== null ? explicitPage : (reset ? 1 : page);
      
      if (reset) {
        // Только для первоначальной загрузки
        if (!isManualRefresh) {
          setIsInitialLoad(true);
        }
      } else {
        setIsBackgroundLoad(true);
      }
      // Устанавливаем состояния загрузки
      if (reset) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams();
    
      // Добавляем все активные фильтры
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(`${key}[]`, v));
          } else if (typeof value === 'boolean') {
            if (value) params.append(key, '1');
          } else if (Array.isArray(value) && key === 'priceRange') {
            params.append('price_from', value[0]);
            params.append('price_to', value[1]);
          } else {
            params.append(key, value);
          }
        }
      });
      
      // Добавляем пагинацию
      params.append('page', currentPage);
      params.append('per_page', 16); // Четное число для двух колонок

      // Выполняем запрос
      const response = await fetch(`https://api.koleso.app/api/filter_products.php?${params.toString()}`);
      console.log(params.toString());
      const data = await response.json();

      if (!isMounted.current) return;

      // Обрабатываем ответ
      if (reset) {
        setProducts(data.data);
        setRefreshing(false);
      } else {
        // Удаляем дубликаты
        setProducts(prev => {
          const existingSkus = new Set(prev.map(p => p.sku));
          const newItems = data.data.filter(item => !existingSkus.has(item.sku));
          return [...prev, ...newItems];
        });
      }
      
      setHasMore(data.pagination.current_page < data.pagination.last_page);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }

      if (reset) {
        setIsInitialLoad(false);
        setIsManualRefresh(false);
      } else {
        setIsBackgroundLoad(false);
      }
      
      // Всегда запускаем анимацию по завершении
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

    }
  }, [filters, page]);






  // Загрузка при монтировании
  //useEffect(() => {
  //  fetchProducts(true);
  //}, []);


  // Загрузка следующей страницы
  const loadMore = useCallback(() => {
    if (!isBackgroundLoad) {
    if (!loading && hasMore) {
      setPage(prev => {
        const newPage = prev + 1;
        fetchProducts(false, newPage);
        return newPage;
      });
    }
  }
  }, [loading, hasMore, fetchProducts]);

  // Обновление при pull-to-refresh
  const handleRefresh = useCallback(() => {
    if (!isManualRefresh && !isInitialLoad) {
      setIsManualRefresh(true);
      fetchProducts(true);
    }
  }, [fetchProducts, isManualRefresh, isInitialLoad]);


  



   // Функция для определения иконки сезона
   const renderSeasonIcon = (season) => {
    if (!season) return null;
    
    const seasonLower = season.toLowerCase();
    
    if (seasonLower.includes('лет')) {
      return <Ionicons name="sunny" size={14} color="#FFA500" style={styles.seasonIcon} />;
    } else if (seasonLower.includes('зим')) {
      return <Ionicons name="snow" size={14} color="#4682B4" style={styles.seasonIcon} />;
    } else if (seasonLower.includes('всесезон') || seasonLower.includes('всесезон')) {
      return <MaterialCommunityIcons name="weather-partly-cloudy" size={14} color="#808080" style={styles.seasonIcon} />;
    }
    return null;
  };


  // Функция для форматирования размера шины
const formatTireSize = (width, profile, diameter) => {
  const formatNumber = (num) => {
    // Преобразуем в число, затем проверяем, является ли оно целым
    const number = parseFloat(num);
    return number % 1 === 0 ? number.toString() : num;
  };

  return `${formatNumber(width)}/${formatNumber(profile)} R${formatNumber(diameter)}`;
};


  // рендер элемента
  const renderItem = useCallback(({ item }) => (
    <TouchableOpacity style={styles.itemContainer} onPress={() => navigation.navigate('Product', { productId: item.id })}
    >
     
      <FastImage
    style={styles.productImage}
    resizeMode="contain"
    source={{
      uri: item.image_url || 'https://api.koleso.app/public/img/no-image.jpg'
    }}
    resizeMode={FastImage.resizeMode.contain}
  />
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
        {item.category === 'Аккумуляторы' && (
          <View style={styles.specsContainer}>
            <Text style={styles.specText}>{item.polarity}</Text>
          
      
          </View>
        )}
      </View>
    </TouchableOpacity>
  ), []);

  // Ключи для FlatList
  const keyExtractor = useCallback((item) => `product-${item.sku}-${item.last_sync_at || '0'}`, []);
// Функция открытия фильтров
const openFilters = () => {
  navigation.navigate('FilterScreen', {
    initialFilters: filters,
    onApplyFilters: (newFilters) => {
      setFilters(newFilters);
      // Сбрасываем страницу и загружаем товары с новыми фильтрами
      setPage(1);
      fetchProducts(true);
    }
  });
};


// Обновленный useEffect для фильтров
useEffect(() => {
  const timer = setTimeout(() => {
    isMounted.current = true;
    fetchProducts(true);
    
     
   
  }, 300);
  
  return () => clearTimeout(timer);
}, [filters]); // Зависимость от filters


// Обработчик выбора сортировки
const handleSortSelect = (sortType) => {
  console.log('select sort ' + sortType);
  
  setFilters(prev => ({ ...prev, sort: sortType }));
  setPage(1);
  fetchProducts(true);
  handleClose();
};


// Фильтры для отображения
const filtersList = [
  { id: 'sort', icon: 'swap-vertical-outline', onPress: handleOpen },
  { 
    id: 'options', 
    icon: 'options-outline',
    onPress: openFilters // Открываем BottomSheet с фильтрами
  },
];

  
  const scrollRef = useRef(null);
  const rotateAnim = new Animated.Value(0);

  const opacityValue = useRef(new Animated.Value(0)).current;

useEffect(() => {
  if (!loading) {
    Animated.timing(opacityValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }
}, [loading]);

  const toggleFilter = (id) => {
    Animated.timing(rotateAnim, {
      toValue: activeFilter === id ? 0 : 1,
      duration: 200,
      useNativeDriver: true
    }).start();

    setActiveFilter(activeFilter === id ? null : id);
    
    // Прокрутка к началу при открытии фильтра
    if (activeFilter !== id && scrollRef.current) {
      scrollRef.current.scrollTo({ x: 0, y: 0, animated: true });
    }
  };
  

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });



const filterLabels = {
  category: 'Категория',
  brand: 'Бренд',
  diameter: 'Диаметр',
  et: 'Вылет',
  capacity: 'Емкость',
  polarity: 'Полярность',
  starting_current: 'Пуск. ток',
  pcd: 'PCD',
  dia: 'DIA',
  rim_type: 'Вид диска',
  price_from: 'Цена от',
  price_to: 'Цена до',
  inStockOnly: 'В наличии',
  season: 'Сезон',
  spiked: 'Шипы',
  runflat_tech: 'RunFlat',
  sort: 'Сортировка',
};


  return (

    <GestureHandlerRootView style={{ flex: 1 }}>
    <View style={[styles.container, { paddingTop: statusBarHeight }]}>
      
      {/* Фильтры */}
      <Animated.View style={[
      styles.filterWrapper,
      {
        transform: [{ translateY: filterTranslateY }],
        opacity: filterOpacity,
        zIndex: isBottomSheetOpen ? 1 : 1, // Меняем при открытии BottomSheet
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
                activeFilter === filter.id && styles.activeFilter
              ]}
              onPress={filter.onPress}
            >
              <Ionicons
                name={filter.icon}
                size={20}
                color={activeFilter === filter.id ? '#fff' : '#000'}
              />
            </TouchableOpacity>
          ))}
         {Object.entries(filters)
  .filter(([key, value]) => value !== null && value !== false && value.length !== 0 && key !== 'sort')
  .map(([key, value]) => {
    const label = filterLabels[key] || key; // Используем перевод или оставляем ключ
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
          <Ionicons name="close-circle-outline" size={20} color="#fff" />
        </TouchableOpacity>
      );


    
  })}
        </ScrollView>
        </Animated.View>



         {/* Лоадер первой загрузки */}
         {isInitialLoad && !isManualRefresh && (
          <View style={styles.fullscreenLoader}>
            <CustomLoader 
      color="#005BFF" 
      size={48}
      // Дополнительные пропсы
    />
          </View>
        )}



<Animated.View style={[styles.listContainer, { opacity: fadeAnim }]}>
        <AnimatedFlatList
          ref={flatListRef}
          data={products}
          contentContainerStyle={{paddingTop:55, opacity: loading && page === 1 ? 0 : 1}} 
          onScroll={handleScroll}
          scrollEventThrottle={16}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={10}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={true}
          onEndReached={_.throttle(loadMore, 1000)}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isManualRefresh}
              onRefresh={handleRefresh}
              progressViewOffset={50}
              children={
                <View style={styles.customRefreshIndicator}>
                  {isManualRefresh && <CustomLoader size={20} />}
                </View>
              }
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
     
       <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose={true}
        onChange={handleSheetChange}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetHandle}
        style={styles.bottomSheet}
     
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
      </Animated.View>
      </View>
    </GestureHandlerRootView>
   
  );
};

// Оптимизированные стили для двух колонок
const styles = StyleSheet.create({
  container: {
    flex: 1,
  backgroundColor: '#fff',
  },
  filterContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: CARD_MARGIN,
    marginBottom: CARD_MARGIN,
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
  },
  productImage: {
    width: '100%',
    height: CARD_WIDTH - 20, // Квадратное изображение
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
    height: 36, // Фиксированная высота для двух строк
  },
  productBrand: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  seasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seasonIcon: {
    marginRight: 2,
    marginTop: -4,
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
  loader: {
    marginTop: 20,
  },
  footerLoader: {
    width: '100%',
    paddingVertical: 10,
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
  filterWrapper: {
    backgroundColor: '#fff',
    paddingVertical: 5,
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 0, // Обычное состояние
    elevation: 1,
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  fullscreenLoader: {
    position: 'absolute',
    top: 60, // Учитываем высоту фильтров
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    zIndex: 10,
  },
  absoluteLoader: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  loadingContainer: {
    height: 300, // Фиксированная высота, равная примерной высоте списка
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterScroll: {
    maxHeight: 48,
  },
  filterContainer: {
    paddingHorizontal: 12,
    alignItems: 'center',
    height: 48,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    borderWidth: 0,
    borderColor: '#e0e0e0',
    height: 36,
  },
  activeFilter: {
    backgroundColor: '#005BFF',
    borderColor: '#005BFF',
  },
  filterText: {
    marginLeft: 6,
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
    padding: 1
  },
  filterIcon: {
    marginRight: 0,
  },
  filterContent: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterContentText: {
    color: '#333',
    fontSize: 16,
  },
   // Стили для BottomSheet
   bottomSheetBackground: {
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
    zIndex: -1,
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  bottomSheet: {
    zIndex: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -5 },
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 6,
    marginBottom: 6,
  },
  filterPillText: {
    fontSize: 12,
    color: '#333',
    marginRight: 4,
  },
  
});

export default React.memo(ProductListScreen);