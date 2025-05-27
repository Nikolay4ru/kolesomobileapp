import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  TextInput,
  Animated,
  Easing,
  Dimensions,
  Platform
} from 'react-native';
import { Slider } from '@miblanchard/react-native-slider';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FilterScreen = () => {
  // Состояния для фильтров
  const [priceRange, setPriceRange] = useState([0, 100000]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [discountedOnly, setDiscountedOnly] = useState(false);
  const [searchBrandQuery, setSearchBrandQuery] = useState('');
  const [searchCategoryQuery, setSearchCategoryQuery] = useState('');
  const [totalProducts, setTotalProducts] = useState(1245);
  
  // Анимации для секций
  const [animations] = useState({
    category: new Animated.Value(1),
    price: new Animated.Value(1),
    brand: new Animated.Value(1),
    features: new Animated.Value(1),
  });
  
  const [expandedSections, setExpandedSections] = useState({
    category: true,
    price: true,
    brand: true,
    features: true,
  });

  // Пример данных с количеством товаров
  const categories = [
    { id: 1, name: 'Смартфоны', count: 452 },
    { id: 2, name: 'Ноутбуки', count: 198 },
    { id: 3, name: 'Телевизоры', count: 76 },
    { id: 4, name: 'Наушники', count: 321 },
    { id: 5, name: 'Планшеты', count: 143 },
    { id: 6, name: 'Умные часы', count: 87 },
  ];

  const brands = [
    { id: 1, name: 'Apple', count: 256 },
    { id: 2, name: 'Samsung', count: 389 },
    { id: 3, name: 'Xiaomi', count: 215 },
    { id: 4, name: 'Huawei', count: 178 },
    { id: 5, name: 'Sony', count: 92 },
    { id: 6, name: 'LG', count: 64 },
  ];

  // Фильтрация брендов и категорий по поисковому запросу
  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(searchBrandQuery.toLowerCase())
  );

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchCategoryQuery.toLowerCase())
  );

  // Обработчики
  const toggleCategory = (categoryId) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
    updateProductCount();
  };

  const toggleBrand = (brandId) => {
    if (selectedBrands.includes(brandId)) {
      setSelectedBrands(selectedBrands.filter(id => id !== brandId));
    } else {
      setSelectedBrands([...selectedBrands, brandId]);
    }
    updateProductCount();
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
    
    Animated.timing(animations[section], {
      toValue: expandedSections[section] ? 0 : 1,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: false,
    }).start();
  };

  const resetAllFilters = () => {
    setPriceRange([0, 100000]);
    setSelectedCategories([]);
    setSelectedBrands([]);
    setInStockOnly(false);
    setDiscountedOnly(false);
    setSearchBrandQuery('');
    setSearchCategoryQuery('');
    updateProductCount(true);
  };

  // Обновление счетчика товаров (упрощенная логика)
  const updateProductCount = (reset = false) => {
    if (reset) {
      setTotalProducts(1245);
      return;
    }
    
    // Здесь должна быть реальная логика подсчета товаров
    // Для примера используем упрощенный вариант
    let count = 1245;
    
    if (selectedCategories.length > 0) {
      count = Math.floor(count * 0.7);
    }
    
    if (selectedBrands.length > 0) {
      count = Math.floor(count * 0.6);
    }
    
    if (inStockOnly) {
      count = Math.floor(count * 0.8);
    }
    
    if (discountedOnly) {
      count = Math.floor(count * 0.4);
    }
    
    setTotalProducts(count);
  };

  // Анимация высоты для секций
  const getSectionStyle = (section) => {
    return {
      height: animations[section].interpolate({
        inputRange: [0, 1],
        outputRange: [0, expandedSections[section] ? 'auto' : 0],
      }),
      overflow: 'hidden',
    };
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Фильтры</Text>
        <TouchableOpacity onPress={resetAllFilters}>
          <Text style={styles.resetButton}>Сбросить всё</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {/* Фильтр по цене */}
        <View style={styles.filterSection}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('price')}
            activeOpacity={0.8}
          >
            <Text style={styles.sectionTitle}>Цена, ₽</Text>
            <Icon 
              name={expandedSections.price ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>
          
          <Animated.View style={getSectionStyle('price')}>
            <View style={styles.priceRangeContainer}>
              <View style={styles.priceInputs}>
                <TextInput
                  style={styles.priceInput}
                  value={priceRange[0].toString()}
                  onChangeText={(text) => {
                    const value = parseInt(text) || 0;
                    setPriceRange([value, priceRange[1]]);
                  }}
                  keyboardType="numeric"
                />
                <Text style={styles.priceSeparator}>–</Text>
                <TextInput
                  style={styles.priceInput}
                  value={priceRange[1].toString()}
                  onChangeText={(text) => {
                    const value = parseInt(text) || 0;
                    setPriceRange([priceRange[0], value]);
                  }}
                  keyboardType="numeric"
                />
              </View>
              
              <Slider
                minimumValue={0}
                maximumValue={100000}
                step={100}
                minimumTrackTintColor="#FF6B00"
                maximumTrackTintColor="#eaeaea"
                thumbTintColor="#FF6B00"
                value={priceRange}
                onValueChange={(value) => setPriceRange(value)}
                containerStyle={styles.sliderContainer}
                trackStyle={styles.sliderTrack}
                thumbStyle={styles.sliderThumb}
              />
            </View>
          </Animated.View>
        </View>

        {/* Фильтр по категориям */}
        <View style={styles.filterSection}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('category')}
            activeOpacity={0.8}
          >
            <Text style={styles.sectionTitle}>Категории</Text>
            <Icon 
              name={expandedSections.category ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>
          
          <Animated.View style={getSectionStyle('category')}>
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Поиск категорий"
                value={searchCategoryQuery}
                onChangeText={setSearchCategoryQuery}
                placeholderTextColor="#999"
              />
            </View>
            
            <View style={styles.optionsContainer}>
              {filteredCategories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.optionItem}
                  onPress={() => toggleCategory(category.id)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.checkbox,
                    selectedCategories.includes(category.id) && styles.checkboxSelected
                  ]}>
                    {selectedCategories.includes(category.id) && (
                      <Icon name="check" size={14} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.optionText}>{category.name}</Text>
                  <Text style={styles.optionCount}>({category.count})</Text>
                </TouchableOpacity>
              ))}
              
              {filteredCategories.length === 0 && (
                <Text style={styles.noResultsText}>Категории не найдены</Text>
              )}
            </View>
          </Animated.View>
        </View>

        {/* Фильтр по брендам */}
        <View style={styles.filterSection}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('brand')}
            activeOpacity={0.8}
          >
            <Text style={styles.sectionTitle}>Бренды</Text>
            <Icon 
              name={expandedSections.brand ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>
          
          <Animated.View style={getSectionStyle('brand')}>
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Поиск брендов"
                value={searchBrandQuery}
                onChangeText={setSearchBrandQuery}
                placeholderTextColor="#999"
              />
            </View>
            
            <View style={styles.optionsContainer}>
              {filteredBrands.map(brand => (
                <TouchableOpacity
                  key={brand.id}
                  style={styles.optionItem}
                  onPress={() => toggleBrand(brand.id)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.checkbox,
                    selectedBrands.includes(brand.id) && styles.checkboxSelected
                  ]}>
                    {selectedBrands.includes(brand.id) && (
                      <Icon name="check" size={14} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.optionText}>{brand.name}</Text>
                  <Text style={styles.optionCount}>({brand.count})</Text>
                </TouchableOpacity>
              ))}
              
              {filteredBrands.length === 0 && (
                <Text style={styles.noResultsText}>Бренды не найдены</Text>
              )}
            </View>
          </Animated.View>
        </View>

        {/* Дополнительные фильтры */}
        <View style={styles.filterSection}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('features')}
            activeOpacity={0.8}
          >
            <Text style={styles.sectionTitle}>Дополнительно</Text>
            <Icon 
              name={expandedSections.features ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>
          
          <Animated.View style={getSectionStyle('features')}>
            <View style={styles.optionsContainer}>
              <View style={styles.switchOption}>
                <View style={styles.switchTextContainer}>
                  <Text style={styles.optionText}>Только в наличии</Text>
                  <Text style={styles.optionSubText}>Показать только доступные товары</Text>
                </View>
                <Switch
                  value={inStockOnly}
                  onValueChange={(value) => {
                    setInStockOnly(value);
                    updateProductCount();
                  }}
                  trackColor={{ false: '#eaeaea', true: '#FF6B00' }}
                  thumbColor="#fff"
                />
              </View>
              
              <View style={styles.switchOption}>
                <View style={styles.switchTextContainer}>
                  <Text style={styles.optionText}>Только со скидкой</Text>
                  <Text style={styles.optionSubText}>Товары с акциями и скидками</Text>
                </View>
                <Switch
                  value={discountedOnly}
                  onValueChange={(value) => {
                    setDiscountedOnly(value);
                    updateProductCount();
                  }}
                  trackColor={{ false: '#eaeaea', true: '#FF6B00' }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.applyButton}
          activeOpacity={0.8}
        >
          <Text style={styles.applyButtonText}>Показать {totalProducts} товаров</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  resetButton: {
    color: '#FF6B00',
    fontSize: 16,
  },
  filtersContainer: {
    flex: 1,
  },
  filtersContent: {
    paddingBottom: 80,
  },
  filterSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  priceRangeContainer: {
    paddingBottom: 16,
  },
  priceInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#eaeaea',
    borderRadius: 8,
    padding: 12,
    width: '45%',
    fontSize: 16,
    color: '#333',
  },
  priceSeparator: {
    fontSize: 16,
    color: '#666',
    width: '10%',
    textAlign: 'center',
  },
  sliderContainer: {
    marginHorizontal: 0,
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#333',
  },
  optionsContainer: {
    marginBottom: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  optionText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  optionCount: {
    fontSize: 14,
    color: '#999',
    marginLeft: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 16,
  },
  switchOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  optionSubText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
  },
  applyButton: {
    backgroundColor: '#FF6B00',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FilterScreen;