import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions
} from "react-native";

import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AntDesign from 'react-native-vector-icons/AntDesign';
import CustomHeader from "../components/CustomHeader";

const { width } = Dimensions.get('window');

const DateTimeSelectionScreen = ({ route, navigation }) => {
  const { service, store, carType } = route.params;
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

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

  const timeSlots = {
    morning: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"],
    afternoon: ["12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"],
    evening: ["18:00", "18:30", "19:00", "19:30"],
  };

  const handleSubmit = () => {
    if (!selectedDate || !selectedTime) {
      alert("Пожалуйста, выберите дату и время.");
      return;
    }

    console.log({
      service,
      store,
      carType,
      date: selectedDate.toLocaleDateString(),
      time: selectedTime,
    });

    alert("Запись успешно создана!");
    navigation.goBack();
  };

  const formatWeekday = (date) => {
    return date.toLocaleString("ru-RU", { weekday: 'short' }).substring(0, 2);
  };

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Выбор даты и времени"
        navigation={navigation}
        statusBarProps={{
            barStyle: 'light-content',
            backgroundColor: '#f8f9fa'
          }}
          safeAreaStyle={{
            backgroundColor: '#f8f9fa'
          }}
          headerStyle={{
            backgroundColor: '#f8f9fa',
            borderBottomWidth: 0
          }}
          iconColor="#000"
          titleStyle={{ color: '#000' }}
        withBackButton
      />

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <MaterialIcons name="construction" size={20} color="#006363" />
            <Text style={styles.summaryText}>{service.name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <MaterialIcons name="store" size={20} color="#006363" />
            <Text style={styles.summaryText}>{store.name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <MaterialIcons name="directions-car" size={20} color="#006363" />
            <Text style={styles.summaryText}>{carType.name}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Выберите дату</Text>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daysScrollView}
        >
          {days.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCard,
                selectedDate &&
                  selectedDate.toDateString() === day.toDateString() &&
                  styles.selectedDayCard,
              ]}
              onPress={() => setSelectedDate(day)}
            >
              <Text style={[
                styles.weekdayText,
                selectedDate?.toDateString() === day.toDateString() && styles.selectedDayText
              ]}>
                {formatWeekday(day)}
              </Text>
              <Text style={[
                styles.dayNumber,
                selectedDate?.toDateString() === day.toDateString() && styles.selectedDayText
              ]}>
                {day.getDate()}
              </Text>
              <Text style={[
                styles.monthText,
                selectedDate?.toDateString() === day.toDateString() && styles.selectedDayText
              ]}>
                {day.toLocaleString("ru-RU", { month: 'short' })}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {selectedDate && (
          <View style={styles.timeSection}>
            <Text style={styles.sectionTitle}>Доступное время</Text>
            
            <View style={styles.timeCategory}>
              <Text style={styles.timeCategoryTitle}>Утро</Text>
              <View style={styles.timeSlotsGrid}>
                {timeSlots.morning.map((time, index) => (
                  <TouchableOpacity
                    key={`morning-${index}`}
                    style={[
                      styles.timeSlot,
                      selectedTime === time && styles.selectedTimeSlot,
                    ]}
                    onPress={() => setSelectedTime(time)}
                  >
                    <Text style={[
                      styles.timeSlotText,
                      selectedTime === time && styles.selectedTimeSlotText,
                    ]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.timeCategory}>
              <Text style={styles.timeCategoryTitle}>День</Text>
              <View style={styles.timeSlotsGrid}>
                {timeSlots.afternoon.map((time, index) => (
                  <TouchableOpacity
                    key={`afternoon-${index}`}
                    style={[
                      styles.timeSlot,
                      selectedTime === time && styles.selectedTimeSlot,
                    ]}
                    onPress={() => setSelectedTime(time)}
                  >
                    <Text style={[
                      styles.timeSlotText,
                      selectedTime === time && styles.selectedTimeSlotText,
                    ]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.timeCategory}>
              <Text style={styles.timeCategoryTitle}>Вечер</Text>
              <View style={styles.timeSlotsGrid}>
                {timeSlots.evening.map((time, index) => (
                  <TouchableOpacity
                    key={`evening-${index}`}
                    style={[
                      styles.timeSlot,
                      selectedTime === time && styles.selectedTimeSlot,
                    ]}
                    onPress={() => setSelectedTime(time)}
                  >
                    <Text style={[
                      styles.timeSlotText,
                      selectedTime === time && styles.selectedTimeSlotText,
                    ]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {selectedDate && selectedTime && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleSubmit}
          >
            <Text style={styles.confirmButtonText}>Подтвердить запись</Text>
            <AntDesign name="checkcircle" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#4E60FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    color: '#2B2F3A',
    marginLeft: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2B2F3A',
    marginBottom: 16,
  },
  daysScrollView: {
    paddingBottom: 10,
  },
  dayCard: {
    width: 70,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#EDEEF2',
  },
  selectedDayCard: {
    backgroundColor: '#006363',
    borderColor: '#006363',
    shadowColor: '#006363',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  weekdayText: {
    fontSize: 14,
    color: '#8A94A6',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dayNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2B2F3A',
    marginBottom: 4,
  },
  monthText: {
    fontSize: 12,
    color: '#8A94A6',
    textTransform: 'lowercase',
  },
  selectedDayText: {
    color: '#fff',
  },
  timeSection: {
    marginTop: 24,
  },
  timeCategory: {
    marginBottom: 10,
  },
  timeCategoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B2F3A',
    marginBottom: 12,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeSlot: {
    width: (width - (width/5)) / 3,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EDEEF2',
  },
  selectedTimeSlot: {
    backgroundColor: '#006363',
    borderColor: '#006363',
  },
  timeSlotText: {
    fontSize: 16,
    color: '#2B2F3A',
  },
  selectedTimeSlotText: {
    color: '#fff',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#EDEEF2',
  },
  confirmButton: {
    backgroundColor: '#006363',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#006363',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default DateTimeSelectionScreen;