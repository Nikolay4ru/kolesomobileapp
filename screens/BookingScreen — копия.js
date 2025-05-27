import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";

const BookingScreen = ({ navigation }) => {
  const [selectedDate, setSelectedDate] = useState(null); // Выбранная дата
  const [selectedTime, setSelectedTime] = useState(null); // Выбранное время

  // Генерация дней для последних двух недель
  const generateDays = () => {
    const days = [];
    const today = new Date();
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(today.getDate() - 14); // Последние две недели

    let currentDate = new Date(twoWeeksAgo);
    while (currentDate <= today) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  const days = generateDays();

  // Пример временных слотов
  const timeSlots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"];

  // Обработчик отправки формы
  const handleSubmit = () => {
    if (!selectedDate || !selectedTime) {
      alert("Пожалуйста, выберите дату и время.");
      return;
    }

    // Здесь можно добавить логику отправки данных на сервер
    console.log({
      date: selectedDate.toLocaleDateString(),
      time: selectedTime,
    });

    alert("Запись успешно создана!");
  };

  return (
    <View style={styles.container}>
      {/* Шапка */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>Назад</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Выберите дату и время</Text>
      </View>

      {/* Контент */}
      <ScrollView style={styles.content}>
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Выберите время:</Text>
            <View style={styles.timeSlotsContainer}>
              {timeSlots.map((time, index) => (
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
      </ScrollView>

      {/* Кнопка записаться */}
      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={!selectedDate || !selectedTime}
      >
        <Text style={styles.submitButtonText}>Записаться</Text>
      </TouchableOpacity>
    </View>
  );
};

export default BookingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    backgroundColor: "#fff",
  },
  backButton: {
    fontSize: 16,
    color: "#007bff",
    marginRight: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  calendarContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
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
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  timeSlotButton: {
    width: "48%",
    paddingVertical: 15,
    marginVertical: 5,
    backgroundColor: "#fff",
    borderRadius: 10,
    alignItems: "center",
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
    fontSize: 16,
    color: "#333",
  },
  selectedTimeSlotText: {
    color: "#fff",
  },
  submitButton: {
    position: "absolute",
    bottom: 60,
    width: "90%",
    marginHorizontal: "5%",
    paddingVertical: 15,
    backgroundColor: "#007bff",
    alignItems: "center",
    borderRadius: 10,
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
});


 
 
