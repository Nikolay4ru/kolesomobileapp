import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';

const ProductListScreen = () => {
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

  // Функция загрузки товаров
  const fetchProducts = async (reset = false) => {
    try {
      if (reset) {
        setRefreshing(true);
        setPage(1);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams();
      
      // Добавляем параметры фильтрации
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
      params.append('page', reset ? 1 : page);
      params.append('per_page', 20);

      const response = await fetch(`https://api.koleso.app/api/filter_products.php?${params.toString()}`);
      const data = await response.json();

      if (reset) {
        setProducts(data.data);
        setRefreshing(false);
      } else {
        setProducts(prev => [...prev, ...data.data]);
      }
      
      setHasMore(data.pagination.current_page < data.pagination.last_page);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка при монтировании и изменении фильтров
  useEffect(() => {
    fetchProducts(true);
  }, [filters]);

  // Загрузка следующей страницы
  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
      fetchProducts();
    }
  };

  // Обновление при pull-to-refresh
  const handleRefresh = () => {
    fetchProducts(true);
  };

  // Рендер элемента списка
  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.itemContainer}>
      <Image 
        source={{ uri: item.image_url || 'https://via.placeholder.com/150' }} 
        style={styles.productImage}
        resizeMode="contain"
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productBrand}>{item.brand} {item.model}</Text>
        
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
  );

  // Рендер списка
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
          data={products}
          renderItem={renderItem}
          keyExtractor={item => item.sku}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListFooterComponent={
            loading && page > 1 ? <ActivityIndicator size="small" /> : null
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>Товары не найдены</Text>
          }
        />
      )}
    </View>
  );
};

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
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: {
    width: 100,
    height: 100,
    marginRight: 15,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productBrand: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  inStock: {
    color: 'green',
    fontSize: 14,
  },
  outOfStock: {
    color: 'red',
    fontSize: 14,
  },
  specsContainer: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  specText: {
    fontSize: 12,
    color: '#555',
    marginRight: 10,
    marginBottom: 5,
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
    fontSize: 16,
    color: '#666',
  },
});

export default ProductListScreen;