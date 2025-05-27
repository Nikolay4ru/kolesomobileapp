import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from "react-native";
import CustomHeader from "../components/CustomHeader";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';

const BookingScreen = ({ navigation }) => {
  const [stores, setStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedCarType, setSelectedCarType] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [showSelection, setShowSelection] = useState(true);
  
  const insets = useSafeAreaInsets();
  const statusBarHeight = insets.top;

  // Типы автомобилей
  const carTypes = [
    { id: 1, name: "Легковой" },
    { id: 2, name: "Кроссовер" },
    { id: 3, name: "Внедорожник" },
    { id: 4, name: "Легкогрузовой" }
  ];

  // Загрузка магазинов из базы данных
  useEffect(() => {
    const fetchStores = async () => {
      try {
        // Здесь должен быть ваш реальный запрос к API
        // const response = await axios.get('API_URL/stores');
        // Для примера используем моковые данные
        const mockStores = [
          { id: 1, name: "Магазин 1", address: "Адрес 1" },
          { id: 2, name: "Магазин 2", address: "Адрес 2" },
          { id: 3, name: "Магазин 3", address: "Адрес 3" },
          { id: 4, name: "Магазин 4", address: "Адрес 4" },
          { id: 5, name: "Магазин 5", address: "Адрес 5" },
          { id: 6, name: "Магазин 6", address: "Адрес 6" },
          { id: 7, name: "Магазин 7", address: "Адрес 7" },
        ];
        setStores(mockStores);
        setLoadingStores(false);
      } catch (error) {
        console.error("Error fetching stores:", error);
        setLoadingStores(false);
      }
    };

    fetchStores();
  }, []);

  // Обработчик выбора магазина
  const handleStoreSelect = (store) => {
    setSelectedStore(store);
  };

  // Обработчик выбора типа автомобиля
  const handleCarTypeSelect = (carType) => {
    setSelectedCarType(carType);
    if (selectedStore) {
      setShowSelection(false);
    }
  };

  // Вернуться к выбору магазина и авто
  const handleBackToSelection = () => {
    setShowSelection(true);
    setSelectedDate(null);
    setSelectedTime(null);
  };

  // Генерация дней для последних двух недель
  const generateDays = () => {
    const days = [];
    const today = new Date();
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(today.getDate() - 14);

    let currentDate = new Date(twoWeeksAgo);
    while (currentDate <= today) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  const days = generateDays();

  // Пример временных слотов
  const timeSlots = {
    morning: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"],
    afternoon: ["12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"],
    evening: ["18:00", "18:30", "19:00", "19:30"],
  };

  // Обработчик отправки формы
  const handleSubmit = () => {
    if (!selectedStore || !selectedCarType || !selectedDate || !selectedTime) {
      alert("Пожалуйста, заполните все поля.");
      return;
    }

    console.log({
      store: selectedStore,
      carType: selectedCarType,
      date: selectedDate.toLocaleDateString(),
      time: selectedTime,
    });

    alert("Запись успешно создана!");
  };

  return (
    <View style={[styles.container]}>
      <CustomHeader 
        title="Запись на сервис"
        statusBarProps={{
          barStyle: 'light-content',
          backgroundColor: '#f5f5f5'
        }}
        safeAreaStyle={{
          backgroundColor: '#f5f5f5'
        }}
        headerStyle={{
          backgroundColor: '#f5f5f5',
          borderBottomWidth: 0
        }}
        iconColor="#000"
        titleStyle={{ color: '#000' }}
      />

      <ScrollView style={styles.content}>
        {showSelection ? (
          <>
            {/* Выбор магазина */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Выберите магазин:</Text>
              {loadingStores ? (
                <ActivityIndicator size="small" color="#007bff" />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScroll}
                >
                  {stores.map((store) => (
                    <TouchableOpacity
                      key={store.id}
                      style={[
                        styles.storeButton,
                        selectedStore?.id === store.id && styles.selectedStoreButton,
                      ]}
                      onPress={() => handleStoreSelect(store)}
                    >
                      <Text
                        style={[
                          styles.storeButtonText,
                          selectedStore?.id === store.id && styles.selectedStoreButtonText,
                        ]}
                      >
                        {store.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Выбор типа автомобиля */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Выберите тип автомобиля:</Text>
              <View style={styles.carTypesGrid}>
                {carTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.carTypeButton,
                      selectedCarType?.id === type.id && styles.selectedCarTypeButton,
                    ]}
                    onPress={() => handleCarTypeSelect(type)}
                  >
                    <Text
                      style={[
                        styles.carTypeButtonText,
                        selectedCarType?.id === type.id && styles.selectedCarTypeButtonText,
                      ]}
                    >
                      {type.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        ) : (
          <>
            {/* Информация о выбранных параметрах */}
            <View style={styles.selectedInfoContainer}>
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={handleBackToSelection}
              >
                <Text style={styles.backButtonText}>← Назад</Text>
              </TouchableOpacity>
              
              <View style={styles.selectedInfoRow}>
                <Text style={styles.selectedInfoLabel}>Магазин:</Text>
                <Text style={styles.selectedInfoText}>{selectedStore.name}</Text>
              </View>
              
              <View style={styles.selectedInfoRow}>
                <Text style={styles.selectedInfoLabel}>Тип авто:</Text>
                <Text style={styles.selectedInfoText}>{selectedCarType.name}</Text>
              </View>
            </View>

            {/* Календарь */}
            <View style={styles.calendarContainer}>
              <Text style={styles.sectionTitle}>Выберите дату:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.daysScrollView}
              >
                {days.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayButton,
                      selectedDate &&
                        selectedDate.toDateString() === day.toDateString() &&
                        styles.selectedDayButton,
                    ]}
                    onPress={() => setSelectedDate(day)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        selectedDate &&
                          selectedDate.toDateString() === day.toDateString() &&
                          styles.selectedDayText,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                    <Text
                      style={[
                        styles.dayMonthText,
                        selectedDate &&
                          selectedDate.toDateString() === day.toDateString() &&
                          styles.selectedDayMonthText,
                      ]}
                    >
                      {day.toLocaleString("default", { month: "short" })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Временные слоты */}
            {selectedDate && (
              <View style={styles.timeSlotsContainer}>
                {/* Утро */}
                <Text style={styles.categoryTitle}>Утро</Text>
                <View style={styles.timeGrid}>
                  {timeSlots.morning.map((time, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.timeSlotButton,
                        selectedTime === time && styles.selectedTimeSlotButton,
                      ]}
                      onPress={() => setSelectedTime(time)}
                    >
                      <Text
                        style={[
                          styles.timeSlotText,
                          selectedTime === time && styles.selectedTimeSlotText,
                        ]}
                      >
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* День */}
                <Text style={styles.categoryTitle}>День</Text>
                <View style={styles.timeGrid}>
                  {timeSlots.afternoon.map((time, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.timeSlotButton,
                        selectedTime === time && styles.selectedTimeSlotButton,
                      ]}
                      onPress={() => setSelectedTime(time)}
                    >
                      <Text
                        style={[
                          styles.timeSlotText,
                          selectedTime === time && styles.selectedTimeSlotText,
                        ]}
                      >
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Вечер */}
                <Text style={styles.categoryTitle}>Вечер</Text>
                <View style={styles.timeGrid}>
                  {timeSlots.evening.map((time, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.timeSlotButton,
                        selectedTime === time && styles.selectedTimeSlotButton,
                      ]}
                      onPress={() => setSelectedTime(time)}
                    >
                      <Text
                        style={[
                          styles.timeSlotText,
                          selectedTime === time && styles.selectedTimeSlotText,
                        ]}
                      >
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Кнопка записаться (показывается только после выбора даты и времени) */}
      {!showSelection && selectedDate && selectedTime && (
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Записаться</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionContainer: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  horizontalScroll: {
    paddingRight: 10,
  },
  storeButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectedStoreButton: {
    backgroundColor: "#007bff",
    borderColor: "#007bff",
  },
  storeButtonText: {
    fontSize: 14,
    color: "#333",
  },
  selectedStoreButtonText: {
    color: "#fff",
  },
  carTypesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  carTypeButton: {
    width: "48%",
    paddingVertical: 15,
    marginBottom: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectedCarTypeButton: {
    backgroundColor: "#007bff",
    borderColor: "#007bff",
  },
  carTypeButtonText: {
    fontSize: 14,
    color: "#333",
  },
  selectedCarTypeButtonText: {
    color: "#fff",
  },
  selectedInfoContainer: {
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: "#007bff",
    fontSize: 16,
  },
  selectedInfoRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  selectedInfoLabel: {
    fontWeight: "bold",
    marginRight: 5,
    color: "#555",
  },
  selectedInfoText: {
    color: "#333",
  },
  calendarContainer: {
    marginBottom: 20,
  },
  daysScrollView: {
    flexDirection: "row",
    alignItems: "center",
  },
  dayButton: {
    width: 70,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    marginHorizontal: 5,
  },
  selectedDayButton: {
    backgroundColor: "#007bff",
    borderColor: "#007bff",
  },
  dayText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  selectedDayText: {
    color: "#fff",
  },
  dayMonthText: {
    fontSize: 12,
    color: "#666",
  },
  selectedDayMonthText: {
    color: "#fff",
  },
  timeSlotsContainer: {
    marginTop: 20,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "start",
  },
  timeSlotButton: {
    width: "22%",
    paddingVertical: 15,
    marginBottom: 10,
    paddingHorizontal: 15,
    marginEnd: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  selectedTimeSlotButton: {
    backgroundColor: "#007bff",
  },
  timeSlotText: {
    fontSize: 14,
    color: "#333",
  },
  selectedTimeSlotText: {
    color: "#fff",
  },
  submitButton: {
    position: "absolute",
    bottom: 20,
    width: "90%",
    marginHorizontal: "5%",
    paddingVertical: 15,
    backgroundColor: "#007bff",
    alignItems: "center",
    borderRadius: 10,
    justifyContent: "center",
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
});

export default BookingScreen;