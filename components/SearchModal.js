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
  const [popular, setPopular] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(false);
  const { authStore, productStore } = useStores();
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

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
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

  // Единый поиск: товары, категории, авто
  const searchAll = async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const headers = {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      };
      // Запрашиваем и товары, и автомобили
      const response = await fetch(
        `https://api.koleso.app/api/search.php?q=${encodeURIComponent(searchQuery)}&type=all&limit=10&car_suggest=0`,
        { headers }
      );
      if (response.ok) {
        const data = await response.json();
        console.log(data);
        // Объединяем результат: товары, категории, авто
        let finalResults = [];
        if (data.success) {
          if (Array.isArray(data.data)) finalResults = finalResults.concat(data.data);
          if (Array.isArray(data.cars)) {
            // Приводим авто к единому виду
            finalResults = finalResults.concat(
              data.cars.map(car => ({
                ...car,
                type: 'car'
              }))
            );
          }
          setResults(finalResults);
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

  // Дебаунсированная функция поиска
  const debouncedSearch = useCallback(
    debounce(searchAll, 300),
    []
  );

  const handleQueryChange = (value) => {
    setQuery(value);
    debouncedSearch(value);
  };

  // Клик по любому результату
  const handleResultClick = async (result) => {
    onClose();

    if (result.type === 'category') {
      navigation.navigate('Catalog', { category: result.name });
    } else if (result.type === 'product') {
      navigation.navigate('Product', { productId: result.id });
    } else if (result.type === 'car') {
      try {
        // Получаем полные данные об авто через productStore
        const carData = await productStore.fetchCarById(result.carid);
        if (carData) {
          const filter = {
            marka: carData.marka,
            model: carData.model,
            modification: carData.modification,
            yearDisplay: carData.display || `${carData.beginyear}-${carData.endyear}`,
            yearData: {
              kuzov: carData.kuzov,
              beginyear: carData.beginyear,
              endyear: carData.endyear
            },
            carid: result.carid
          };
          await productStore.setCarFilter(filter);
          navigation.navigate('ProductList');
        } else {
          await productStore.setCarFilter({ carid: result.carid });
          navigation.navigate('ProductList');
        }
      } catch (e) {
        await productStore.setCarFilter({ carid: result.carid });
        navigation.navigate('ProductList');
      }
    }
  };

  // Быстрый поиск по популярному/недавнему запросу
  const handleQuickSearch = (searchQuery) => {
    setQuery(searchQuery);
    searchAll(searchQuery);
  };

  // Очистка недавних
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

  // Рендер универсального результата
  const renderResultItem = ({ item: result }) => {
    if (result.type === 'category') {
      return (
        <TouchableOpacity
          style={[styles.resultItem, { backgroundColor: colors.cardBackground }]}
          onPress={() => handleResultClick(result)}
          activeOpacity={0.7}
        >
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
        </TouchableOpacity>
      );
    } else if (result.type === 'product') {
      return (
        <TouchableOpacity
          style={[styles.resultItem, { backgroundColor: colors.cardBackground }]}
          onPress={() => handleResultClick(result)}
          activeOpacity={0.7}
        >
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
        </TouchableOpacity>
      );
    } else if (result.type === 'car') {
      return (
        <TouchableOpacity
          style={[styles.resultItem, { backgroundColor: colors.cardBackground }]}
          onPress={() => handleResultClick(result)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.tint }]}>
            <Icon name="car-sport-outline" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.resultInfo}>
            <Text style={[styles.resultName, { color: colors.label }]}>{result.label}</Text>
            <Text style={[styles.resultMeta, { color: colors.secondaryLabel }]}>
              ID: {result.carid}
            </Text>
          </View>
          <Icon name="chevron-forward" size={18} color={colors.tertiaryLabel} />
        </TouchableOpacity>
      );
    } else {
      return null;
    }
  };

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
                {/* Результаты поиска */}
                {results.length > 0 && (
                  <FlatList
                    data={results}
                    renderItem={renderResultItem}
                    keyExtractor={(item, idx) =>
                      item.type === 'category' ? `cat-${item.id || item.name}` :
                      item.type === 'car' ? `car-${item.carid}` :
                      item.type === 'product' ? `prod-${item.id}` : `item-${idx}`
                    }
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                  />
                )}

                {/* Пустые результаты */}
                {!loading && query.length >= 2 && results.length === 0 && (
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
                {!loading && query.length < 2 && (
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