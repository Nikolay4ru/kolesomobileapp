import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";

const Dropdown = ({ label, options, onSelect, value }) => {
  const [isOpen, setIsOpen] = useState(false); // Состояние видимости выпадающего списка

  // Обработчик выбора значения
  const handleSelect = (option) => {
    onSelect(option);
    setIsOpen(false); // Скрываем выпадающий список после выбора
  };

  return (
    <View style={styles.dropdownContainer}>
      {/* Заголовок */}
      <Text style={styles.label}>{label}</Text>

      {/* Кнопка для открытия/закрытия выпадающего списка */}
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={styles.dropdownButtonText}>
          {value || "Выберите значение"}
        </Text>
      </TouchableOpacity>

      {/* Выпадающий список */}
      {isOpen && (
        <ScrollView
          style={styles.dropdownMenu}
          contentContainerStyle={styles.dropdownContent}
        >
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.dropdownMenuItem}
              onPress={() => handleSelect(option)}
            >
              <Text style={styles.dropdownMenuItemText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

export default Dropdown;

const styles = StyleSheet.create({
  dropdownContainer: {
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    color: "#333",
    marginBottom: 5,
  },
  dropdownButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  dropdownButtonText: {
    fontSize: 16,
    color: "#333",
  },
  dropdownMenu: {
    maxHeight: 150, // Ограничиваем высоту для скролла
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    backgroundColor: "#fff",
    marginTop: 5,
  },
  dropdownContent: {
    paddingHorizontal: 5,
  },
  dropdownMenuItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  dropdownMenuItemText: {
    fontSize: 16,
    color: "#333",
  },
});