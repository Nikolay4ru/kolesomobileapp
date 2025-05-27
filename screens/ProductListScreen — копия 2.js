import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import _ from 'lodash';

const ProductListScreen = () => {
  // Состояния
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    category: 'Автошины',
    priceRange: [0, 100000],
    inStockOnly: false,
    season: null,
    spiked: null,
    runflat_tech: null
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

  // Функция загрузки товаров
  const fetchProducts = useCallback(async (reset = false, explicitPage = null) => {
    try {
      if (!isMounted.current) return;

      const currentPage = explicitPage !== null ? explicitPage : (reset ? 1 : page);
      
      // Устанавливаем состояния загрузки
      if (reset) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Формируем параметры запроса
      const params = new URLSearchParams();
      
      // Добавляем фильтры
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(`${key}[]`, v));
          } else {
            params.append(key, value);
          }
        }
      });
      
      // Добавляем пагинацию
      params.append('page', currentPage);
      params.append('per_page', 15); // Уменьшаем количество для плавности

      // Выполняем запрос
      const response = await fetch(`https://api.koleso.app/api/filter_products.php?${params.toString()}`);
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
    }
  }, [filters, page]);

  // Загрузка при монтировании
  useEffect(() => {
    fetchProducts(true);
  }, []);

  // Обновление при изменении фильтров
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [filters]);

  // Загрузка следующей страницы
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => {
        const newPage = prev + 1;
        fetchProducts(false, newPage);
        return newPage;
      });
    }
  }, [loading, hasMore, fetchProducts]);

  // Обновление при pull-to-refresh
  const handleRefresh = useCallback(() => {
    fetchProducts(true);
  }, [fetchProducts]);

  // Оптимизированный рендер элемента
  const renderItem = useCallback(({ item }) => (
    <TouchableOpacity style={styles.itemContainer}>
      <Image 
        source={{ uri: item.image_url || 'https://via.placeholder.com/150' }} 
        style={styles.productImage}
        resizeMode="contain"
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productBrand} numberOfLines={1}>
          {item.brand} {item.model}
        </Text>
        
        <View style={styles.detailsRow}>
          <Text style={styles.productPrice}>{item.price} ₽</Text>
          {item.out_of_stock ? (
            <Text style={styles.outOfStock}>Нет в наличии</Text>
          ) : (
            <Text style={styles.inStock}>В наличии</Text>
          )}
        </View>
        
        {item.category === 'Автошины' && (
          <View style={styles.specsContainer}>
            <Text style={styles.specText}>{item.width}/{item.profile} R{item.diameter}</Text>
            <Text style={styles.specText}>{item.season}</Text>
            {item.spiked === 1 && <Text style={styles.specText}>Шипованные</Text>}
            {item.runflat_tech && <Text style={styles.specText}>RunFlat ({item.runflat_tech})</Text>}
          </View>
        )}
      </View>
    </TouchableOpacity>
  ), []);

  // Ключи для FlatList
  const keyExtractor = useCallback((item) => `product-${item.sku}-${item.last_sync_at || '0'}`, []);

  return (
    <View style={styles.container}>
      {/* Фильтры можно вынести в отдельный компонент */}
      <View style={styles.filterContainer}>
        {/* Здесь будут компоненты фильтрации */}
      </View>
      
      {loading && page === 1 ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={products}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={true}
          onEndReached={_.throttle(loadMore, 1000)}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#FF6B00']}
              tintColor={'#FF6B00'}
            />
          }
          ListFooterComponent={
            loading && page > 1 ? (
              <ActivityIndicator size="small" color="#FF6B00" />
            ) : null
          }
          ListEmptyComponent={
            !loading && (
              <Text style={styles.emptyText}>Товары не найдены. Попробуйте изменить фильтры.</Text>
            )
          }
        />
      )}
    </View>
  );
};

// Оптимизированные стили
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filterContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 10,
    marginVertical: 5,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  productImage: {
    width: 100,
    height: 100,
    marginRight: 12,
    borderRadius: 4,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  productBrand: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B00',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  inStock: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '500',
  },
  outOfStock: {
    color: '#F44336',
    fontSize: 13,
    fontWeight: '500',
  },
  specsContainer: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  specText: {
    fontSize: 12,
    color: '#555',
    marginRight: 8,
    marginBottom: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  loader: {
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 15,
    color: '#666',
    paddingHorizontal: 20,
  },
});

export default React.memo(ProductListScreen);