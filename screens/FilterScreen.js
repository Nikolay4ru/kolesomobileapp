import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, StyleSheet, Switch, TextInput, ActivityIndicator } from 'react-native';
import { Slider } from '@miblanchard/react-native-slider';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const MAX_VISIBLE_ITEMS = 8;

const FilterScreen = ({ route, navigation }) => {
  const { initialFilters, onApplyFilters } = route.params;
   const insets = useSafeAreaInsets();
  const [filters, setFilters] = useState(initialFilters || {
    category: null,
    brand: [],
    priceRange: [0, 100000],
    width: [],
    profile: [],
    diameter: [],
    season: [],
    spiked: [],
    pcd: [],
    et: [],
    dia: [],
    rim_type: [],
    capacity: [],
    polarity: [],
    starting_current: []
  });
  
  const [filterOptions, setFilterOptions] = useState({
    categories: [],
    brands: [],
    widths: [],
    profiles: [],
    diameters: [],
    seasons: [],
    spikeds: [],
    pcds: [],
    offsets: [],
    dias: [],
    sorts: null,
    rim_types: [],
    capacities: [],
    polarities: [],
    starting_currents: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
const [categoryLoading, setCategoryLoading] = useState(false);
   const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;



    const getActiveFiltersCount = () => {
    let count = 0;
    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'priceRange') {
        if (value[0] !== 0 || value[1] !== 100000) count++;
      } else if (Array.isArray(value) && value.length > 0) {
        count++;
      } else if (value && !Array.isArray(value)) {
        count++;
      }
    });
    return count;
  };

  // Анимация при первой загрузке
  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [loading]);

  
   const resetFilters = () => {
    setFilters({
      category: null,
      brand: [],
      width: [],
      profile: [],
      diameter: [],
      season: [],
      spiked: [],
      pcd: [],
      et: [],
      dia: [],
      rim_type: [],
      capacity: [],
      polarity: [],
      starting_current: []
    });
  };


  // Загрузка доступных фильтров
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        setLoading(false);
        setError(null);
        console.log(filters);
        const response = await fetch('https://api.koleso.app/api/filter_options.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            selectedFilters: filters
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Unknown server error');
        }
        
        setFilterOptions(prev => ({
          ...prev,
          categories: data.categories || [],
          brands: data.brands || [],
          widths: data.widths || [],
          profiles: data.profiles || [],
          diameters: data.diameters || [],
          seasons: data.seasons || [],
          spikeds: data.spikeds || [],
          pcds: data.pcds || [],
          offsets: data.offsets || [],
          dias: data.dias || [],
          rim_types: data.rim_types || [],
          capacities: data.capacities || [],
          polarities: data.polarities || [],
          starting_currents: data.starting_currents || [],
        }));
        
      } catch (err) {
        console.error('Failed to load filters:', err);
        setError(err.message);
        Alert.alert('Ошибка', 'Не удалось загрузить фильтры. Пожалуйста, попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };

    fetchFilterOptions();
  }, [filters]);




  const handleFilterChange = (filterType, value) => {
    console.log('spiked' + value);
    setFilters(prev => {
      // Сброс зависимых фильтров при смене категории
      if (filterType === 'category' && value !== prev.category) {
        const newFilters = {
          ...prev,
          category: value,
          brand: [],
          width: [],
          profile: [],
          diameter: [],
          season: [],
          spiked: [],
          pcd: [],
          et: [],
          dia: [],
          rim_type: [],
          capacity: [],
          polarity: [],
          starting_current: []
        };
        return newFilters;
      }
      
      // Для массивов (множественный выбор)
      if (Array.isArray(prev[filterType])) {
        return {
          ...prev,
          [filterType]: prev[filterType].includes(value)
            ? prev[filterType].filter(v => v !== value)
            : [...prev[filterType], value]
        };
      }
      
      // Для одиночных значений
      return {
        ...prev,
        [filterType]: value
      };
    });
  };

  const formatValue = (value) => {
    let num;
  
    // Пытаемся преобразовать в число
    if (typeof value === 'string') {
      num = Number(value.trim());
    } else if (typeof value === 'number') {
      num = value;
    } else {
      return value; // Не число — возвращаем как есть
    }
  
    // Проверяем, действительно ли получилось число
    if (isNaN(num)) {
      return value;
    }
  
    // Округляем до 2 знаков и превращаем в строку
    const formatted = num.toFixed(2);
  
    // Убираем лишние нули после точки
    return parseFloat(formatted).toString();
  };

  const renderFilterSection = (title, filterKey, items, icon) => {
    if (!items || items.length === 0) return null;

    const currentValues = filters[filterKey] || [];
    const isArray = Array.isArray(currentValues);
  
    const displayItems = title === 'Шипы' ? ['ВСЕ', ...items] : items;
    const showMoreButton = displayItems.length > MAX_VISIBLE_ITEMS;
    const visibleItems = showMoreButton ? displayItems.slice(0, MAX_VISIBLE_ITEMS) : displayItems;
    const selectedCount = isArray ? currentValues.length : (currentValues ? 1 : 0);

    return (
      <Animated.View 
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            {icon && <Icon name={icon} size={20} color="#006363" style={styles.sectionIcon} />}
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
          {selectedCount > 0 && (
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedBadgeText}>{selectedCount}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.gridContainer}>
          {visibleItems.map((item, index) => {
            let displayText = formatValue(item);
            if (title === 'Шипы') {
              if (item === 'ВСЕ') displayText = 'Все';
              else if (item === 0) displayText = 'Без шипов';
              else if (item === 1) displayText = 'Шипованные';
            }
            
            let isSelected;
            if (item === 'ВСЕ') {
              isSelected = currentValues.length === 0;
            } else {
              isSelected = isArray ? currentValues.includes(item) : currentValues === item;
            }

            return (
              <TouchableOpacity
                key={`${filterKey}-${item}-${index}`}
                style={[
                  styles.filterItem,
                  isSelected && styles.filterItemSelected
                ]}
                onPress={() => {
                  if (item === 'ВСЕ') {
                    setFilters(prev => ({
                      ...prev,
                      [filterKey]: []
                    }));
                  } else {
                    handleFilterChange(filterKey, item);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.filterText,
                  isSelected && styles.filterTextSelected
                ]}>
                  {displayText}
                </Text>
                {isSelected && (
                  <Icon name="check" size={16} color="#fff" style={styles.checkIcon} />
                )}
              </TouchableOpacity>
            );
          })}

          {showMoreButton && (
            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => navigation.navigate('FilterModalScreen', {
                title: title,
                items: displayItems,
                selectedItems: currentValues,
                filterKey: filterKey,
                onSelect: handleFilterChange
              })}
              activeOpacity={0.7}
            >
              <Text style={styles.moreButtonText}>Еще</Text>
              <View style={styles.moreBadge}>
                <Text style={styles.moreBadgeText}>+{displayItems.length - MAX_VISIBLE_ITEMS}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#006363" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => setFilters({...filters})} // Повторная загрузка
        >
          <Text style={styles.retryButtonText}>Попробовать снова</Text>
        </TouchableOpacity>
      </View>
    );
  }


   const activeFiltersCount = getActiveFiltersCount();


  return (
    <View style={[styles.container, { paddingTop: 0 }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
          activeOpacity={0.7}
        >
          <Icon name="close" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Фильтры</Text>
          {activeFiltersCount > 0 && (
            <View style={styles.activeFiltersBadge}>
              <Text style={styles.activeFiltersBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </View>
        
        {activeFiltersCount > 0 ? (
          <TouchableOpacity 
            onPress={resetFilters}
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <Text style={styles.clearButtonText}>Сбросить</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderFilterSection('Категория', 'category', filterOptions.categories, 'category')}
        {renderFilterSection('Бренд', 'brand', filterOptions.brands, 'business')}
        
        
        {filters.category === 'Автошины' && !categoryLoading && (
          <>
            {renderFilterSection('Диаметр шины', 'diameter', filterOptions.diameters, 'radio-button-unchecked')}
            {renderFilterSection('Ширина шины', 'width', filterOptions.widths, 'straighten')}
            {renderFilterSection('Профиль шины', 'profile', filterOptions.profiles, 'height')}
            {renderFilterSection('Сезон', 'season', filterOptions.seasons, 'ac-unit')}
            {(filters.season.includes('Зимние')) && 
              renderFilterSection('Шипы', 'spiked', filterOptions.spikeds, 'terrain')}
          </>
        )}
        
        {filters.category === 'Диски' && !categoryLoading && (
          <>
            {renderFilterSection('Вид диска', 'rim_type', filterOptions.rim_types, 'album')}
            {renderFilterSection('Диаметр', 'diameter', filterOptions.diameters, 'radio-button-unchecked')}
            {renderFilterSection('PCD', 'pcd', filterOptions.pcds, 'blur-circular')}
            {renderFilterSection('Вылет (ET)', 'et', filterOptions.offsets, 'trending-flat')}
            {renderFilterSection('DIA', 'dia', filterOptions.dias, 'circle')}
          </>
        )}
        
        {filters.category === 'Аккумуляторы' && !categoryLoading && (
          <>
            {renderFilterSection('Емкость', 'capacity', filterOptions.capacities, 'battery-full')}
            {renderFilterSection('Полярность', 'polarity', filterOptions.polarities, 'swap-horiz')}
            {renderFilterSection('Пусковой ток', 'starting_current', filterOptions.starting_currents, 'flash-on')}
          </>
        )}
        
        {categoryLoading && filters.category && (
          <View style={styles.categoryLoadingContainer}>
            <ActivityIndicator size="small" color="#006363" />
            <Text style={styles.categoryLoadingText}>Загрузка фильтров...</Text>
          </View>
        )}
      </ScrollView>
      
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity 
          style={styles.applyButton}
          onPress={() => {
            onApplyFilters(filters);
            navigation.goBack();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.applyButtonText}>Применить фильтры</Text>
          <Icon name="arrow-forward" size={20} color="#fff" style={styles.applyButtonIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
};



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
   centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  headerButton: {
    padding: 4,
    minWidth: 60,
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  activeFiltersBadge: {
    marginLeft: 8,
    backgroundColor: '#006363',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  activeFiltersBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  clearButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  section: {
    marginVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
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
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  selectedBadge: {
    backgroundColor: '#E6F2F2',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  selectedBadgeText: {
    color: '#006363',
    fontSize: 12,
    fontWeight: '600',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  filterItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    margin: 4,
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
    borderRadius: 24,
    backgroundColor: '#FAFAFA',
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterItemSelected: {
    borderColor: '#006363',
    backgroundColor: '#006363',
    elevation: 2,
    shadowColor: '#006363',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  filterText: {
    fontSize: 14,
    color: '#4A4A4A',
    fontWeight: '500',
  },
  filterTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: 6,
  },
  moreButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    margin: 4,
    borderWidth: 1.5,
    borderColor: '#006363',
    borderRadius: 24,
    backgroundColor: '#E6F2F2',
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreButtonText: {
    fontSize: 14,
    color: '#006363',
    fontWeight: '600',
    marginRight: 6,
  },
  moreBadge: {
    backgroundColor: '#006363',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  moreBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  priceContainer: {
    marginTop: 8,
  },
  priceInputsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  priceInputContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  priceInput: {
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#FAFAFA',
  },
  priceDivider: {
    width: 20,
    height: 1,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 12,
    marginTop: 20,
  },
  errorContainer: {
    padding: 20,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    marginTop: 12,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#006363',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    backgroundColor: '#006363',
    borderRadius: 16,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginRight: 8,
  },
  applyButtonIcon: {
    marginLeft: 4,
  },
  categoryLoadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
});

export default FilterScreen;