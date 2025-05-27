import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, TextInput, ActivityIndicator } from 'react-native';
import { Slider } from '@miblanchard/react-native-slider';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const MAX_VISIBLE_ITEMS = 8;

const FilterScreen = ({ route, navigation }) => {
  const { initialFilters, onApplyFilters } = route.params;
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

  // Загрузка доступных фильтров
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        setLoading(true);
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
        console.log(filters);
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

  const renderFilterSection = (title, filterKey, items) => {
    if (!items || items.length === 0) return null;

    const currentValues = filters[filterKey] || [];
    const isArray = Array.isArray(currentValues);
  
    // Добавляем вариант "ВСЕ" только для поля spiked
    const displayItems = title === 'Шипы' ? ['ВСЕ', ...items] : items;


     // Определяем, нужно ли показывать кнопку "Еще"
  const showMoreButton = displayItems.length > MAX_VISIBLE_ITEMS;
  const visibleItems = showMoreButton ? displayItems.slice(0, MAX_VISIBLE_ITEMS) : displayItems;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.gridContainer}>
          {visibleItems.map(item => {
            // Определяем текст для отображения
            let displayText = formatValue(item);
            if (title === 'Шипы') {
              if (item === 'ВСЕ') displayText = 'Все';
              else if (item === 0) displayText = 'Без шипов';
              else if (item === 1) displayText = 'Шипованные';
            }
            
  
            // Проверяем, выбран ли элемент
            let isSelected;
            if (item === 'ВСЕ') {
              isSelected = currentValues.length === 0;
              console.log(item);
            } else {
              isSelected = isArray ? currentValues.includes(item) : currentValues === item;
            }
  
            return (
              <TouchableOpacity
                key={item}
                style={[
                  styles.filterItem,
                  isSelected && styles.filterItemSelected
                ]}
                onPress={() => {
                  if (item === 'ВСЕ') {
                    // Очищаем фильтр для этого поля
                    setFilters(prev => ({
                      ...prev,
                      [filterKey]: []
                    }));
                  } else {
                    handleFilterChange(filterKey, item);
                  }
                }}
              >
                <Text style={[
                  styles.filterText,
                  isSelected && styles.filterTextSelected
                ]}>
                  {displayText}
                </Text>
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
          >
            <Text style={styles.moreButtonText}>Еще +{displayItems.length - MAX_VISIBLE_ITEMS}</Text>
          </TouchableOpacity>
        )}
        </View>
      </View>
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


  return (
    <View style={[styles.container, { paddingBottom: 1 }]}>
      {/* Шапка */}
      <View style={[styles.header, { paddingTop: 20 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Фильтры</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Основные фильтры */}
        {renderFilterSection('Категория', 'category', filterOptions.categories)}

        {renderFilterSection('Бренд', 'brand', filterOptions.brands)} 
        
        {/* Специфичные фильтры */}
        {filters.category === 'Автошины' && (
          <>
             {renderFilterSection('Диаметр шины', 'diameter', filterOptions.diameters)}
            {renderFilterSection('Ширина шины', 'width', filterOptions.widths)}
            {renderFilterSection('Профиль шины', 'profile', filterOptions.profiles)}
            {renderFilterSection('Сезон', 'season', filterOptions.seasons)}
            {/* Показываем шипы только если выбран зимний сезон */}
            {(filters.season.includes('Зимние')) && 
            renderFilterSection('Шипы', 'spiked', filterOptions.spikeds)}
          </>
        )}
        
        {filters.category === 'Диски' && (
          <>
            {renderFilterSection('Вид диска', 'rim_type', filterOptions.rim_types)}
            {renderFilterSection('Диаметр', 'diameter', filterOptions.diameters)}
            {renderFilterSection('PCD', 'pcd', filterOptions.pcds)}
            {renderFilterSection('Вылет (ET)', 'et', filterOptions.offsets)}
            {renderFilterSection('DIA', 'dia', filterOptions.dias)}
          </>
        )}
        
        {filters.category === 'Аккумуляторы' && (
          <>
            {renderFilterSection('Емкость', 'capacity', filterOptions.capacities)}
            {renderFilterSection('Полярность', 'polarity', filterOptions.polarities)}
            {renderFilterSection('Пусковой ток', 'starting_current', filterOptions.starting_currents)}
          </>
        )}
      </ScrollView>
      
      {/* Кнопка применения */}
      <TouchableOpacity 
        style={styles.applyButton}
        onPress={() => {
          onApplyFilters(filters);
          navigation.goBack();
        }}
      >
        <Text style={styles.applyButtonText}>Применить фильтры</Text>
      </TouchableOpacity>
    </View>
  );
};


const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  section: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  priceInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    padding: 8,
    width: '45%',
  },
  priceSeparator: {
    marginHorizontal: 8,
    color: '#666',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  gridItem: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
  },
  gridItemSelected: {
    borderColor: '#FF6B00',
    backgroundColor: '#FFF0E6',
  },
  gridText: {
    fontSize: 14,
    color: '#333',
  },
  gridTextSelected: {
    color: '#FF6B00',
  },
  switchOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  optionText: {
    fontSize: 14,
    color: '#333',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  showButton: {
    backgroundColor: '#FF6B00',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  showButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 16 + 1, // Учитываем нижний инсет
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    
    position: "absolute",
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF0000',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FF6B00',
    padding: 12,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  filterItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
  },
  filterItemSelected: {
    borderColor: '#006363',
    backgroundColor: '#006363',
  },
  filterText: {
    fontSize: 14,
    color: '#333',
  },
  filterTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  applyButton: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    marginBottom: 20,
    backgroundColor: '#006363',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  moreButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
  },
  moreButtonText: {
    fontSize: 14,
    color: '#666',
  },
});

export default FilterScreen;