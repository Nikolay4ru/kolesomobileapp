import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  StyleSheet,
} from 'react-native';
import { useStores } from '../useStores';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

const API_URL = 'https://api.koleso.app/api';

const SearchModal = ({ visible, onClose, userId, token }) => {
  const navigation = useNavigation();
  const { authStore } = useStores();
  const insets = useSafeAreaInsets();
  const searchInputRef = useRef(null);

  // Тема по-умолчанию
  let colors = {
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#000000',
    textSecondary: '#666666',
    textTertiary: '#999999',
    primary: '#007AFF',
    success: '#34C759',
    border: '#E0E0E0',
    divider: '#F0F0F0',
    surface: '#F5F5F5',
  };
  let theme = 'light';
  try {
    const themeData = useTheme();
    if (themeData && themeData.colors) {
      colors = themeData.colors;
      theme = themeData.theme || 'light';
    }
  } catch (error) {
    console.log('Using default theme');
  }

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [popularSearches, setPopularSearches] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Заголовки для авторизации
  const authHeaders = {
    'Authorization': `Bearer ${authStore.token || token || ''}`,
    'Content-Type': 'application/json'
  };

  // Загрузка популярных поисков
  const loadPopularSearches = async () => {
    try {
      const response = await fetch(`${API_URL}/search.php?popular=1`, {
        headers: authHeaders,
      });
      const data = await response.json();
      if (data.success && data.popular) {
        setPopularSearches(data.popular);
      }
    } catch (e) {
      console.error('Popular search error:', e);
    }
  };

  // Загрузка недавних поисков (по userId)
  const loadRecentSearches = async () => {
    try {
      let url = `${API_URL}/search.php?recent=1`;
      if (userId) url += `&user_id=${userId}`;
      const response = await fetch(url, { headers: authHeaders });
      const data = await response.json();
      if (data.success && data.recent) {
        setRecentSearches(data.recent);
      }
    } catch (e) {
      console.error('Recent search error:', e);
    }
  };

  // При открытии — грузим популярные и недавние поиски
  useEffect(() => {
    if (visible) {
      loadPopularSearches();
      loadRecentSearches();
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
      setSearchResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const fetchSuggestions = async (query) => {
    if (query.trim().length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const response = await fetch(`${API_URL}/search_suggestions.php?q=${encodeURIComponent(query)}`, {
        headers: authHeaders,
      });
      const data = await response.json();
      if (data.success && data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Suggestions error:', error);
    }
  };

  const performSearch = async (query) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      let url = `${API_URL}/search.php?q=${encodeURIComponent(query)}`;
      if (userId) url += `&user_id=${userId}`;
      const response = await fetch(url, { headers: authHeaders });
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.data);
        if (data.popular) setPopularSearches(data.popular);
        if (data.recent) setRecentSearches(data.recent);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.length >= 1 && text.length < 2) {
      fetchSuggestions(text);
    } else if (text.length >= 2) {
      setShowSuggestions(false);
      performSearch(text);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchResults([]);
    }
  };

  const renderSuggestions = () => {
    if (!showSuggestions || suggestions.length === 0) return null;
    return (
      <View style={[styles.suggestionsContainer, { backgroundColor: colors.card }]}>
        {suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.suggestionItem, { borderBottomColor: colors.divider }]}
            onPress={() => {
              setSearchQuery(suggestion.text);
              setShowSuggestions(false);
              performSearch(suggestion.text);
            }}
          >
            <Ionicons
              name={suggestion.type === 'recent' ? 'time-outline' : 'search-outline'}
              size={18}
              color={colors.textSecondary}
            />
            <Text style={[styles.suggestionText, { color: colors.text }]}>
              {suggestion.text}
            </Text>
            <Text style={[styles.suggestionType, { color: colors.textTertiary }]}>
              {suggestion.type === 'product'
                ? 'Товар'
                : suggestion.type === 'category'
                ? 'Категория'
                : 'Недавний поиск'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const handleResultPress = (item) => {
    if (!recentSearches.includes(item.name)) {
      setRecentSearches([item.name, ...recentSearches.slice(0, 9)]);
    }
    onClose();
    if (item.type === 'product') {
      navigation.navigate('Home', {
        screen: 'Product',
        params: { productId: item.id },
      });
    } else if (item.type === 'service') {
      navigation.navigate('Booking');
    } else if (item.type === 'category') {
      navigation.navigate('ProductList', { category: item.name });
    }
  };

  const handleRecentSearchPress = (search) => {
    setSearchQuery(search);
    performSearch(search);
  };

const clearRecentSearches = async () => {
  try {
    const response = await fetch(`${API_URL}/search.php`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token || token || ''}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ clear_recent: 1 })
    });
    const data = await response.json();
    console.log(data);
    setRecentSearches([]); // Локально очищаем
  } catch (e) {
    console.error('Clear recent error', e);
  }
};

  const renderSearchResult = ({ item }) => {
    if (item.type === 'product') {
      return (
        <TouchableOpacity
          style={[styles.resultItem, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}
          onPress={() => handleResultPress(item)}
          activeOpacity={0.7}
        >
          <Image source={{ uri: item.image }} style={[styles.resultImage, { backgroundColor: colors.surface }]} />
          <View style={styles.resultContent}>
            <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
            <Text style={[styles.resultPrice, { color: colors.primary }]}>{item.price ? item.price.toLocaleString() : ''} ₽</Text>
            {item.inStock && (
              <View style={[styles.stockBadge, { backgroundColor: colors.success + '15' }]}>
                <Text style={[styles.stockText, { color: colors.success }]}>В наличии</Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      );
    } else if (item.type === 'service' || item.type === 'category') {
      return (
        <TouchableOpacity
          style={[styles.resultItem, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}
          onPress={() => handleResultPress(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.resultIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name={item.icon || 'folder'} size={24} color={colors.primary} />
          </View>
          <View style={styles.resultContent}>
            <Text style={[styles.resultName, { color: colors.text }]}>{item.name}</Text>
            {item.type === 'service' && (
              <Text style={[styles.resultPrice, { color: colors.primary }]}>от {item.price} ₽</Text>
            )}
            {item.type === 'category' && (
              <Text style={[styles.resultSubtext, { color: colors.textSecondary }]}>{item.count} товаров</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      );
    }
    return null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Поиск товаров и услуг..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={handleSearch}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={[styles.cancelText, { color: colors.primary }]}>Отмена</Text>
          </TouchableOpacity>
        </View>
        {/* Suggestions */}
        {renderSuggestions()}
        {/* Content */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : searchQuery.length === 0 ? (
            // Recent & Popular Searches
            <View style={styles.recentSection}>
              <View style={styles.recentHeader}>
                <Text style={[styles.recentTitle, { color: colors.text }]}>Недавние поиски</Text>
                {recentSearches.length > 0 && (
                  <TouchableOpacity onPress={clearRecentSearches}>
                    <Text style={[styles.clearText, { color: colors.primary }]}>Очистить</Text>
                  </TouchableOpacity>
                )}
              </View>
              {recentSearches.length > 0 ? (
                <View style={styles.recentList}>
                  {recentSearches.map((search, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.recentItem}
                      onPress={() => handleRecentSearchPress(search)}
                    >
                      <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                      <Text style={[styles.recentText, { color: colors.text }]}>{search}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Нет недавних поисков</Text>
              )}
              {/* Popular Searches */}
              <View style={styles.popularSection}>
                <Text style={[styles.popularTitle, { color: colors.text }]}>Популярные запросы</Text>
                <View style={styles.popularTags}>
                  {popularSearches.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.popularTag, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => handleRecentSearchPress(tag)}
                    >
                      <Text style={[styles.popularTagText, { color: colors.text }]}>{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ) : searchResults.length > 0 ? (
            // Search Results
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.resultsList}
              keyboardShouldPersistTaps="handled"
            />
          ) : (
            // No Results
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.noResultsText, { color: colors.text }]}>Ничего не найдено</Text>
              <Text style={[styles.noResultsSubtext, { color: colors.textSecondary }]}>
                Попробуйте изменить запрос
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  clearButton: { padding: 4 },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelText: { fontSize: 16 },
  content: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Recent Searches
  recentSection: { padding: 16 },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentTitle: { fontSize: 18, fontWeight: '600' },
  clearText: { fontSize: 14 },
  recentList: { marginBottom: 32 },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  recentText: { fontSize: 16, marginLeft: 12 },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 24,
  },
  // Popular Searches
  popularSection: { marginTop: 16 },
  popularTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  popularTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  popularTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  popularTagText: { fontSize: 14 },
  // Search Results
  resultsList: { paddingVertical: 8 },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  resultImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  resultIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultContent: { flex: 1 },
  resultName: { fontSize: 16, fontWeight: '500', marginBottom: 4 },
  resultPrice: { fontSize: 16, fontWeight: '600' },
  resultSubtext: { fontSize: 14 },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  stockText: { fontSize: 12, fontWeight: '500' },
  // No Results
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtext: { fontSize: 16, textAlign: 'center' },
  suggestionsContainer: {
    position: 'absolute',
    top: 160,
    left: 16,
    right: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  suggestionText: { flex: 1, marginLeft: 12, fontSize: 16 },
  suggestionType: { fontSize: 12, marginLeft: 8 },
});

export default SearchModal;