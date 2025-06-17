import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  FlatList,
  useColorScheme,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { MMKV } from 'react-native-mmkv';
import { useStores } from '../useStores';

const storage = new MMKV();

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const SearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [carResults, setCarResults] = useState([]);
  const [popular, setPopular] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
   const { authStore } = useStores();
  
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const inputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Цвета для темной и светлой темы (iOS стиль)
  const colors = {
    background: isDarkMode ? '#000000' : '#FFFFFF',
    secondaryBackground: isDarkMode ? '#1C1C1E' : '#F2F2F7',
    tertiaryBackground: isDarkMode ? '#2C2C2E' : '#FFFFFF',
    label: isDarkMode ? '#FFFFFF' : '#000000',
    secondaryLabel: isDarkMode ? '#8E8E93' : '#3C3C43',
    tertiaryLabel: isDarkMode ? '#48484A' : '#C7C7CC',
    separator: isDarkMode ? '#38383A' : '#C6C6C8',
    tint: '#007AFF',
    destructive: '#FF3B30',
    success: '#34C759',
    searchBackground: isDarkMode ? '#1C1C1E' : '#E5E5EA',
    cardBackground: isDarkMode ? '#1C1C1E' : '#FFFFFF',
  };

  // Простая реализация debounce
  const debounce = (func, wait) => {
    return (...args) => {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => func(...args), wait);
    };
  };

  // Загрузка популярных и недавних запросов при открытии
  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // Очистка при закрытии
      setQuery('');
      setResults([]);
      setCarResults([]);
      setActiveTab('products');
    }
  }, [isOpen]);

  const fetchInitialData = async () => {
    try {
      
      const headers = {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      };

      // Загружаем популярные запросы
      const popularRes = await fetch('https://api.koleso.app/api/search.php?popular=1', { headers });
      if (popularRes.ok) {
        const data = await popularRes.json();
        setPopular(data.popular || []);
      }

      // Загружаем недавние запросы
      const recentRes = await fetch('https://api.koleso.app/api/search.php?recent=1', { headers });
      if (recentRes.ok) {
        const data = await recentRes.json();
        setRecent(data.recent || []);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  // Поиск товаров и категорий
  const searchProducts = async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      
      const response = await fetch(
        `https://api.koleso.app/api/search.php?q=${encodeURIComponent(searchQuery)}&type=all&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${authStore.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setResults(data.data || []);
          // Обновляем популярные и недавние после поиска
          if (data.popular) setPopular(data.popular);
          if (data.recent) setRecent(data.recent);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Поиск автомобилей
  const searchCars = async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setCarResults([]);
      return;
    }

    setLoading(true);
    try {
      
      const response = await fetch(
        `https://api.koleso.app/api/search.php?car_suggest=1&q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${authStore.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCarResults(data.cars || []);
        }
      }
    } catch (error) {
      console.error('Car search error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Дебаунсированные функции поиска
  const debouncedProductSearch = useCallback(
    debounce(searchProducts, 300),
    []
  );

  const debouncedCarSearch = useCallback(
    debounce(searchCars, 300),
    []
  );

  // Обработчик изменения поискового запроса
  const handleQueryChange = (value) => {
    setQuery(value);

    if (activeTab === 'products') {
      debouncedProductSearch(value);
    } else {
      debouncedCarSearch(value);
    }
  };

  // Переключение вкладок
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setResults([]);
    setCarResults([]);
    
    // Если есть запрос, выполняем поиск для новой вкладки
    if (query.length >= 2) {
      if (tab === 'products') {
        searchProducts(query);
      } else {
        searchCars(query);
      }
    }
  };

  // Клик по результату товара/категории
  const handleResultClick = (result) => {
    onClose();
    
    if (result.type === 'category') {
      navigation.navigate('Catalog', { category: result.name });
    } else if (result.type === 'product') {
      navigation.navigate('Product', { productId: result.id });
    }
  };

  // Клик по результату автомобиля
  const handleCarClick = (car) => {
    onClose();
    
    // Переходим в каталог с фильтром по автомобилю
    navigation.navigate('Catalog', {
      car_id: car.carid,
      car_brand: car.marka,
      car_model: car.model,
      car_year_from: car.beginyear,
      car_year_to: car.endyear,
    });
  };

  // Клик по популярному/недавнему запросу
  const handleQuickSearch = (searchQuery) => {
    setQuery(searchQuery);
    if (activeTab === 'products') {
      searchProducts(searchQuery);
    } else {
      searchCars(searchQuery);
    }
  };

  // Очистка недавних запросов
  const clearRecent = async () => {
    try {
      
      const response = await fetch('https://api.koleso.app/api/search.php', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ clear_recent: true })
      });

      if (response.ok) {
        setRecent([]);
      }
    } catch (error) {
      console.error('Error clearing recent searches:', error);
    }
  };

  // Рендер элемента результата товара
  const renderProductItem = ({ item: result }) => (
    <TouchableOpacity
      style={[styles.resultItem, { backgroundColor: colors.cardBackground }]}
      onPress={() => handleResultClick(result)}
      activeOpacity={0.7}
    >
      {result.type === 'category' ? (
        <>
          <View style={[styles.iconContainer, { backgroundColor: colors.secondaryBackground }]}>
            <Icon name="folder-outline" size={20} color={colors.tint} />
          </View>
          <View style={styles.resultInfo}>
            <Text style={[styles.resultName, { color: colors.label }]}>{result.name}</Text>
            <Text style={[styles.resultMeta, { color: colors.secondaryLabel }]}>
              {result.count} товаров
            </Text>
          </View>
          <Icon name="chevron-forward" size={18} color={colors.tertiaryLabel} />
        </>
      ) : (
        <>
          {result.image ? (
            <Image source={{ uri: result.image }} style={styles.resultImage} />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.secondaryBackground }]}>
              <Icon name="image-outline" size={24} color={colors.tertiaryLabel} />
            </View>
          )}
          <View style={styles.resultInfo}>
            <Text style={[styles.resultName, { color: colors.label }]} numberOfLines={2}>
              {result.name}
            </Text>
            <View style={styles.metaRow}>
              {result.brand && (
                <Text style={[styles.resultMeta, { color: colors.secondaryLabel }]}>
                  {result.brand}
                </Text>
              )}
              {result.size && (
                <Text style={[styles.resultMeta, { color: colors.secondaryLabel }]}>
                  {result.size}
                </Text>
              )}
            </View>
            {result.price && (
              <Text style={[styles.resultPrice, { color: colors.success }]}>
                {result.price.toLocaleString()} ₽
              </Text>
            )}
          </View>
          {!result.inStock && (
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockText}>Нет</Text>
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );

  // Рендер элемента автомобиля
  const renderCarItem = ({ item: car }) => (
    <TouchableOpacity
      style={[styles.carItem, { backgroundColor: colors.cardBackground, borderColor: colors.separator }]}
      onPress={() => handleCarClick(car)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.tint }]}>
        <Icon name="car-sport-outline" size={20} color="#FFFFFF" />
      </View>
      <View style={styles.resultInfo}>
        <Text style={[styles.resultName, { color: colors.label }]}>{car.label}</Text>
        <Text style={[styles.resultMeta, { color: colors.secondaryLabel }]}>
          ID: {car.carid}
        </Text>
      </View>
      <Icon name="chevron-forward" size={18} color={colors.tertiaryLabel} />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          {/* Заголовок */}
          <View style={[styles.header, { borderBottomColor: colors.separator }]}>
            <View style={[styles.searchContainer, { backgroundColor: colors.searchBackground }]}>
              <Icon name="search" size={20} color={colors.tertiaryLabel} />
              <TextInput
                ref={inputRef}
                style={[styles.searchInput, { color: colors.label }]}
                placeholder="Поиск..."
                placeholderTextColor={colors.tertiaryLabel}
                value={query}
                onChangeText={handleQueryChange}
                autoFocus
                returnKeyType="search"
              />
              {query.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setQuery('');
                    setResults([]);
                    setCarResults([]);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="close-circle" size={20} color={colors.tertiaryLabel} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelText, { color: colors.tint }]}>Отмена</Text>
            </TouchableOpacity>
          </View>

          {/* Вкладки */}
          <View style={[styles.tabContainer, { backgroundColor: colors.secondaryBackground }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'products' && { backgroundColor: colors.background }
              ]}
              onPress={() => handleTabChange('products')}
              activeOpacity={0.7}
            >
              <Icon 
                name="basket-outline" 
                size={18} 
                color={activeTab === 'products' ? colors.tint : colors.secondaryLabel} 
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'products' ? colors.tint : colors.secondaryLabel }
                ]}
              >
                Товары
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'cars' && { backgroundColor: colors.background }
              ]}
              onPress={() => handleTabChange('cars')}
              activeOpacity={0.7}
            >
              <Icon 
                name="car-sport-outline" 
                size={18} 
                color={activeTab === 'cars' ? colors.tint : colors.secondaryLabel} 
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'cars' ? colors.tint : colors.secondaryLabel }
                ]}
              >
                Автомобили
              </Text>
            </TouchableOpacity>
          </View>

          {/* Контент */}
          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
                <Text style={[styles.loadingText, { color: colors.secondaryLabel }]}>
                  Поиск...
                </Text>
              </View>
            ) : (
              <>
                {/* Результаты поиска товаров */}
                {activeTab === 'products' && results.length > 0 && (
                  <FlatList
                    data={results}
                    renderItem={renderProductItem}
                    keyExtractor={(item) => `${item.type}-${item.id}`}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                  />
                )}

                {/* Результаты поиска автомобилей */}
                {activeTab === 'cars' && carResults.length > 0 && (
                  <FlatList
                    data={carResults}
                    renderItem={renderCarItem}
                    keyExtractor={(item) => item.carid.toString()}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                  />
                )}

                {/* Пустые результаты */}
                {!loading && query.length >= 2 && 
                 ((activeTab === 'products' && results.length === 0) ||
                  (activeTab === 'cars' && carResults.length === 0)) && (
                  <View style={styles.emptyContainer}>
                    <Icon name="search-outline" size={64} color={colors.tertiaryLabel} />
                    <Text style={[styles.emptyText, { color: colors.label }]}>
                      Ничего не найдено
                    </Text>
                    <Text style={[styles.emptySubtext, { color: colors.secondaryLabel }]}>
                      Попробуйте изменить запрос
                    </Text>
                  </View>
                )}

                {/* Популярные и недавние запросы */}
                {!loading && query.length < 2 && activeTab === 'products' && (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Недавние поиски */}
                    {recent.length > 0 && (
                      <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                          <View style={styles.sectionTitleContainer}>
                            <Icon name="time-outline" size={18} color={colors.secondaryLabel} />
                            <Text style={[styles.sectionTitle, { color: colors.label }]}>
                              Недавние
                            </Text>
                          </View>
                          <TouchableOpacity onPress={clearRecent}>
                            <Text style={[styles.clearButton, { color: colors.tint }]}>
                              Очистить
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.tagsContainer}>
                          {recent.map((item, index) => (
                            <TouchableOpacity
                              key={`recent-${index}`}
                              style={[styles.tag, { backgroundColor: colors.secondaryBackground }]}
                              onPress={() => handleQuickSearch(item)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.tagText, { color: colors.label }]}>
                                {item}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Популярные запросы */}
                    {popular.length > 0 && (
                      <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                          <View style={styles.sectionTitleContainer}>
                            <Icon name="trending-up" size={18} color={colors.secondaryLabel} />
                            <Text style={[styles.sectionTitle, { color: colors.label }]}>
                              Популярные
                            </Text>
                          </View>
                        </View>
                        <View style={styles.tagsContainer}>
                          {popular.map((item, index) => (
                            <TouchableOpacity
                              key={`popular-${index}`}
                              style={[styles.tag, { backgroundColor: colors.secondaryBackground }]}
                              onPress={() => handleQuickSearch(item)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.tagText, { color: colors.label }]}>
                                {item}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </ScrollView>
                )}
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 36,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 8,
    paddingVertical: 0,
  },
  cancelButton: {
    paddingLeft: 12,
  },
  cancelText: {
    fontSize: 17,
    fontWeight: '400',
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 4,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 9,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 7,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  listContent: {
    paddingVertical: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
  },
  carItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  imagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  resultName: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 2,
  },
  resultMeta: {
    fontSize: 13,
    marginRight: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  resultPrice: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  outOfStockBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  outOfStockText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  clearButton: {
    fontSize: 15,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '400',
  },
});

export default SearchModal;