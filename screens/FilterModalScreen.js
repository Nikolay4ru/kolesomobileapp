import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const FilterModalScreen = ({ route, navigation }) => {
  const { title, items, selectedItems, filterKey, onSelect } = route.params;

  const handleSelect = (item) => {
    onSelect(filterKey, item);
    navigation.goBack();
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

  return (
    <View style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>{title}</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView contentContainerStyle={styles.modalContent}>
        {items.map(item => (
          <TouchableOpacity
            key={item}
            style={[
              styles.modalItem,
              selectedItems.includes(item) && styles.modalItemSelected
            ]}
            onPress={() => handleSelect(item)}
          >
            <Text style={[
              styles.modalItemText,
              selectedItems.includes(item) && styles.modalItemTextSelected
            ]}>
              {formatValue(item)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    padding: 16,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemSelected: {
    backgroundColor: '#FFF0E6',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
  },
  modalItemTextSelected: {
    color: '#FF6B00',
    fontWeight: '500',
  },
});

export default FilterModalScreen;