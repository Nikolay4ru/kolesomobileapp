import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";

const ProductFilterScreen = () => {
  const [selectedCategory, setSelectedCategory] = useState("battery"); // Выбранная категория
  const [filters, setFilters] = useState({
    battery: {
      capacity: "",
      polarity: "",
      coldCranking: "",
      manufacturer: "",
    },
    tires: {
      width: "",
      profile: "",
      diameter: "",
      season: "",
    },
    wheels: {
      diameter: "",
      pcd: "",
      offset: "",
      tireCategory: "",
      dia: "",
      type: "",
      rimWidth: "",
    },
  });

  // Обработчик изменения фильтров
  const handleFilterChange = (category, key, value) => {
    setFilters((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  // Сброс фильтров
  const resetFilters = () => {
    setFilters({
      battery: {
        capacity: "",
        polarity: "",
        coldCrankin g: "",
        manufacturer: "",
      },
      tires: {
        width: "",
        profile: "",
        diameter: "",
        season: "",
      },
      wheels: {
        diameter: "",
        pcd: "",
        offset: "",
        tireCategory: "",
        dia: "",
        type: "",
        rimWidth: "",
      },
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Шапка */}
      <View style={styles.header}>
        <Text style={styles.title}>Подбор товаров</Text>
      </View>

      {/* Выбор категории */}
      <View style={styles.categorySelector}>
        <TouchableOpacity
          style={[
            styles.categoryButton,
            selectedCategory === "battery" && styles.selectedCategoryButton,
          ]}
          onPress={() => setSelectedCategory("battery")}
        >
          <Text
            style={[
              styles.categoryButtonText,
              selectedCategory === "battery" && styles.selectedCategoryButtonText,
            ]}
          >
            АКБ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.categoryButton,
            selectedCategory === "tires" && styles.selectedCategoryButton,
          ]}
          onPress={() => setSelectedCategory("tires")}
        >
          <Text
            style={[
              styles.categoryButtonText,
              selectedCategory === "tires" && styles.selectedCategoryButtonText,
            ]}
          >
            Шины
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.categoryButton,
            selectedCategory === "wheels" && styles.selectedCategoryButton,
          ]}
          onPress={() => setSelectedCategory("wheels")}
        >
          <Text
            style={[
              styles.categoryButtonText,
              selectedCategory === "wheels" && styles.selectedCategoryButtonText,
            ]}
          >
            Диски
          </Text>
        </TouchableOpacity>
      </View>

      {/* Фильтры */}
      {selectedCategory === "battery" && (
        <View style={styles.filtersContainer}>
          <Text style={styles.sectionTitle}>Фильтры для АКБ</Text>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Номинальная емкость:</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="Введите значение"
              value={filters.battery.capacity}
              onChangeText={(text) =>
                handleFilterChange("battery", "capacity", text)
              }
            />
          </View>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Полярность:</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="Прямая/Обратная"
              value={filters.battery.polarity}
              onChangeText={(text) =>
                handleFilterChange("battery", "polarity", text)
              }
            />
          </View>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Пусковой ток:</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="Введите значение"
              value={filters.battery.coldCranking}
              onChangeText={(text) =>
                handleFilterChange("battery", "coldCranking", text)
              }
            />
          </View>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Производитель:</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="Введите название"
              value={filters.battery.manufacturer}
              onChangeText={(text) =>
                handleFilterChange("battery", "manufacturer", text)
              }
            />
          </View>
        </View>
      )}

      {selectedCategory === "tires" && (
        <View style={styles.filtersContainer}>
          <Text style={styles.sectionTitle}>Фильтры для шин</Text>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Ширина шины:</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="Введите значение"
              value={filters.tires.width}
              onChangeText={(text) =>
                handleFilterChange("tires", "width", text)
              }
            />
          </View>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Профиль шины:</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="Введите значение"
              value={filters.tires.profile}
              onChangeText={(text) =>
                handleFilterChange("tires", "profile", text)
              }
            />
          </View>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Диаметр:</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="Введите значение"
              value={filters.tires.diameter}
              onChangeText={(text) =>
                handleFilterChange("tires", "diameter", text)
              }
            />
          </View>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Сезон:</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="Лето/Зима"
              value={filters.tires.season}
              onChangeText={(text) =>
                handleFilterChange("tires", "season", text)
              }
            />
          </View>
        </View>
      )}

      {selectedCategory === "wheels" && (
        <View style={styles.filtersContainer}>
          <Text style={styles.sectionTitle}>Фильтры для дисков</Text>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Диаметр:</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="Введите значение"
              value={filters.wheels.diameter}
              onChangeText={(text) =>
                handleFilterChange("wheels", "diameter", text)
              }
            />
          </View>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Разболтовка (PCD):</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="Введите значение"
              value={filters.wheels.pcd}
              onChangeText={(text) => handleFilterChange("wheels", "pcd", text)}
            />
          </View>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Вылет:</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="Введите значение"
              value={filters.wheels.offset}
              onChangeText={(text) =>
                handleFilterChange("wheels", "offset", text)
              }
            />
          </View>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Категория автошин:</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="Введите значение"
              value={filters.wheels.tireCategory}
              onChangeText={(text) =>
                handleFilterChange("wheels", "tireCategory", text)
              }
            />
          </View>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>DIA:</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="Введите значение"
              value={filters.wheels.dia}
              onChangeText={(text) => handleFilterChange("wheels", "dia", text)}
            />
          </View>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Вид диска:</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="Литой/Штампованный"
              value={filters.wheels.type}
              onChangeText={(text) =>
                handleFilterChange("wheels", "type", text)
              }
            />
          </View>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Ширина обода:</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="Введите значение"
              value={filters.wheels.rimWidth}
              onChangeText={(text) =>
                handleFilterChange("wheels", "rimWidth", text)
              }
            />
          </View>
        </View>
      )}

      {/* Кнопки управления */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetFilters}
        >
          <Text style={styles.resetButtonText}>Сбросить фильтры</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={() => console.log(filters[selectedCategory])}
        >
          <Text style={styles.applyButtonText}>Применить</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default ProductFilterScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  categorySelector: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  categoryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  selectedCategoryButton: {
    backgroundColor: "#007bff",
    borderColor: "#007bff",
  },
  categoryButtonText: {
    fontSize: 16,
    color: "#333",
  },
  selectedCategoryButtonText: {
    color: "#fff",
  },
  filtersContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  filterLabel: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  filterInput: {
    flex: 2,
    height: 40,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 15,
    backgroundColor: "#ccc",
    borderRadius: 10,
    alignItems: "center",
    marginRight: 10,
  },
  resetButtonText: {
    fontSize: 16,
    color: "#333",
  },
  applyButton: {
    flex: 1,
    paddingVertical: 15,
    backgroundColor: "#007bff",
    borderRadius: 10,
    alignItems: "center",
    marginLeft: 10,
  },
  applyButtonText: {
    fontSize: 16,
    color: "#fff",
  },
});