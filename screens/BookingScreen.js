import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import CustomHeader from "../components/CustomHeader";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';

const BookingScreen = ({ navigation }) => {
  const [stores, setStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [showSelection, setShowSelection] = useState(true);
  
  // Новые состояния для калькулятора
  const [vehicleType, setVehicleType] = useState(null); // Внедорожники, Кроссоверы, Легковые
  const [rimSize, setRimSize] = useState(null); // R19, R20, R21, R22, R23+
  const [tireProfile, setTireProfile] = useState(null); // < 30%, < 50%, > 50%
  const [hasRunFlat, setHasRunFlat] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [discountedPrice, setDiscountedPrice] = useState(0);
  
  const insets = useSafeAreaInsets();
  const statusBarHeight = insets.top;

  // Типы транспортных средств
  const vehicleTypes = [
    { id: 'suv', name: 'Внедорожники (джипы)', icon: 'directions-car' },
    { id: 'crossover', name: 'Кроссоверы', icon: 'airport-shuttle' },
    { id: 'sedan', name: 'Легковые', icon: 'directions-car' },
  ];

  // Размеры дисков
  const rimSizes = ['R19', 'R20', 'R21', 'R22', 'R23+'];

  // Профили шин
  const tireProfiles = [
    { id: 'low', name: '< 30%', description: 'Низкий профиль' },
    { id: 'medium', name: '< 50%', description: 'Средний профиль' },
    { id: 'high', name: '> 50%', description: 'Высокий профиль' },
  ];

  // Услуги шиномонтажа
  const servicesList = [
    { id: 'balance', name: 'Балансировка, оптимизация, установка грузов' },
    { id: 'dismount', name: 'Демонтаж' },
    { id: 'mount', name: 'Монтаж' },
    { id: 'optimization', name: 'Оптимизация расположения на автомобиле' },
    { id: 'removal', name: 'Снятие/Установка' },
    { id: 'wash', name: 'Техническая мойка колес' },
  ];

  // База данных цен (из вашего документа)
  const priceDatabase = {
    R19: {
      suv: {
        'low_runflat': { balance: 549, dismount: 705, mount: 653, optimization: 318, removal: 642, wash: 76 },
        'low': { balance: 549, dismount: 705, mount: 653, optimization: 318, removal: 642, wash: 76 },
        'medium': { balance: 572, dismount: 399, mount: 462, optimization: 318, removal: 642, wash: 76 },
        'high': { balance: 480, dismount: 376, mount: 411, optimization: 318, removal: 757, wash: 76 },
      },
      crossover: {
        'low_runflat': { balance: 515, dismount: 612, mount: 549, optimization: 312, removal: 480, wash: 76 },
        'low': { balance: 515, dismount: 612, mount: 549, optimization: 312, removal: 480, wash: 76 },
        'medium': { balance: 515, dismount: 330, mount: 370, optimization: 312, removal: 688, wash: 76 },
        'high': { balance: 515, dismount: 300, mount: 330, optimization: 312, removal: 688, wash: 76 },
      },
      sedan: {
        'low_runflat': { balance: 491, dismount: 445, mount: 491, optimization: 312, removal: 665, wash: 76 },
        'low': { balance: 491, dismount: 445, mount: 491, optimization: 312, removal: 665, wash: 76 },
        'medium': { balance: 515, dismount: 260, mount: 300, optimization: 312, removal: 665, wash: 76 },
        'high': { balance: 491, dismount: 260, mount: 272, optimization: 295, removal: 665, wash: 76 },
      },
    },
    R20: {
      suv: {
        'low_runflat': { balance: 610, dismount: 869, mount: 771, optimization: 364, removal: 746, wash: 81 },
        'low': { balance: 610, dismount: 869, mount: 771, optimization: 364, removal: 746, wash: 81 },
        'medium': { balance: 647, dismount: 480, mount: 524, optimization: 364, removal: 746, wash: 81 },
        'high': { balance: 610, dismount: 450, mount: 463, optimization: 339, removal: 746, wash: 81 },
      },
      crossover: {
        'low_runflat': { balance: 586, dismount: 727, mount: 653, optimization: 352, removal: 610, wash: 81 },
        'low': { balance: 586, dismount: 727, mount: 653, optimization: 352, removal: 610, wash: 81 },
        'medium': { balance: 586, dismount: 407, mount: 450, optimization: 352, removal: 734, wash: 81 },
        'high': { balance: 586, dismount: 376, mount: 407, optimization: 352, removal: 734, wash: 81 },
      },
      sedan: {
        'low_runflat': { balance: 573, dismount: 542, mount: 573, optimization: 333, removal: 752, wash: 81 },
        'low': { balance: 573, dismount: 542, mount: 573, optimization: 333, removal: 752, wash: 81 },
        'medium': { balance: 598, dismount: 302, mount: 413, optimization: 333, removal: 752, wash: 81 },
        'high': { balance: 431, dismount: 302, mount: 320, optimization: 315, removal: 752, wash: 81 },
      },
    },
    R21: {
      suv: {
        'low_runflat': { balance: 694, dismount: 1050, mount: 905, optimization: 396, removal: 892, wash: 86 },
        'low': { balance: 694, dismount: 1050, mount: 905, optimization: 396, removal: 892, wash: 86 },
        'medium': { balance: 733, dismount: 548, mount: 594, optimization: 396, removal: 1552, wash: 86 },
        'high': { balance: 581, dismount: 515, mount: 502, optimization: 396, removal: 892, wash: 86 },
      },
      crossover: {
        'low_runflat': { balance: 654, dismount: 865, mount: 799, optimization: 390, removal: 700, wash: 86 },
        'low': { balance: 654, dismount: 865, mount: 799, optimization: 390, removal: 700, wash: 86 },
        'medium': { balance: 654, dismount: 469, mount: 515, optimization: 396, removal: 1228, wash: 86 },
        'high': { balance: 654, dismount: 436, mount: 436, optimization: 377, removal: 700, wash: 86 },
      },
      sedan: {
        'low_runflat': { balance: 628, dismount: 628, mount: 700, optimization: 377, removal: 905, wash: 86 },
        'low': { balance: 628, dismount: 628, mount: 700, optimization: 377, removal: 905, wash: 86 },
        'medium': { balance: 654, dismount: 356, mount: 403, optimization: 377, removal: 905, wash: 86 },
        'high': { balance: 482, dismount: 356, mount: 377, optimization: 356, removal: 905, wash: 86 },
      },
    },
    R22: {
      suv: {
        'low_runflat': { balance: 750, dismount: 1238, mount: 1073, optimization: 454, removal: 1713, wash: 90 },
        'low': { balance: 750, dismount: 1238, mount: 1073, optimization: 454, removal: 1713, wash: 90 },
        'medium': { balance: 1135, dismount: 605, mount: 681, optimization: 454, removal: 1369, wash: 90 },
        'high': { balance: 619, dismount: 654, mount: 605, optimization: 454, removal: 1025, wash: 90 },
      },
      crossover: {
        'low_runflat': { balance: 715, dismount: 976, mount: 908, optimization: 440, removal: 1300, wash: 90 },
        'low': { balance: 715, dismount: 976, mount: 908, optimization: 440, removal: 1300, wash: 90 },
        'medium': { balance: 1094, dismount: 516, mount: 571, optimization: 440, removal: 1265, wash: 90 },
        'high': { balance: 709, dismount: 481, mount: 503, optimization: 406, removal: 784, wash: 90 },
      },
      sedan: {
        'low_runflat': { balance: 695, dismount: 778, mount: 805, optimization: 393, removal: 1273, wash: 90 },
        'low': { balance: 695, dismount: 778, mount: 805, optimization: 393, removal: 1273, wash: 90 },
        'medium': { balance: 1011, dismount: 406, mount: 448, optimization: 393, removal: 1238, wash: 90 },
        'high': { balance: 516, dismount: 406, mount: 413, optimization: 371, removal: 998, wash: 90 },
      },
    },
    'R23+': {
      suv: {
        'low_runflat': { balance: 899, dismount: 1485, mount: 1288, optimization: 545, removal: 1229, wash: 90 },
        'low': { balance: 899, dismount: 1485, mount: 1288, optimization: 545, removal: 1229, wash: 90 },
        'medium': { balance: 949, dismount: 726, mount: 835, optimization: 545, removal: 1229, wash: 90 },
        'high': { balance: 743, dismount: 784, mount: 726, optimization: 545, removal: 1229, wash: 90 },
      },
      crossover: {
        'low_runflat': { balance: 858, dismount: 1171, mount: 1089, optimization: 528, removal: 940, wash: 90 },
        'low': { balance: 858, dismount: 1171, mount: 1089, optimization: 528, removal: 940, wash: 90 },
        'medium': { balance: 858, dismount: 619, mount: 685, optimization: 528, removal: 940, wash: 90 },
        'high': { balance: 850, dismount: 578, mount: 603, optimization: 528, removal: 940, wash: 90 },
      },
      sedan: {
        'low_runflat': { balance: 834, dismount: 933, mount: 965, optimization: 486, removal: 1196, wash: 90 },
        'low': { balance: 834, dismount: 933, mount: 965, optimization: 486, removal: 1196, wash: 90 },
        'medium': { balance: 0, dismount: 486, mount: 536, optimization: 440, removal: 1196, wash: 90 },
        'high': { balance: 619, dismount: 486, mount: 495, optimization: 470, removal: 1196, wash: 90 },
      },
    },
  };

  // Загрузка магазинов
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const mockStores = [
          { id: 1, name: "Центральный", address: "ул. Ленина, 10" },
          { id: 2, name: "Северный", address: "пр. Победы, 25" },
          { id: 3, name: "Южный", address: "ул. Мира, 15" },
          { id: 4, name: "Восточный", address: "ул. Гагарина, 8" },
          { id: 5, name: "Западный", address: "пр. Строителей, 30" },
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

  // Расчет стоимости
  useEffect(() => {
    if (vehicleType && rimSize && tireProfile && selectedServices.length > 0) {
      calculatePrice();
    }
  }, [vehicleType, rimSize, tireProfile, hasRunFlat, selectedServices]);

  const calculatePrice = () => {
    const vehicleKey = vehicleType;
    const profileKey = hasRunFlat && tireProfile === 'low' ? 'low_runflat' : 
                       tireProfile === 'low' ? 'low' :
                       tireProfile === 'medium' ? 'medium' : 'high';
    
    const prices = priceDatabase[rimSize]?.[vehicleKey]?.[profileKey];
    
    if (!prices) {
      setTotalPrice(0);
      setDiscountedPrice(0);
      return;
    }

    let total = 0;
    selectedServices.forEach(serviceId => {
      const serviceKey = serviceId === 'balance' ? 'balance' :
                        serviceId === 'dismount' ? 'dismount' :
                        serviceId === 'mount' ? 'mount' :
                        serviceId === 'optimization' ? 'optimization' :
                        serviceId === 'removal' ? 'removal' : 'wash';
      
      total += prices[serviceKey] || 0;
    });

    setTotalPrice(total);
    setDiscountedPrice(Math.round(total * 0.7)); // Скидка 30%
  };

  const toggleService = (serviceId) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const handleSubmit = () => {
    if (!selectedStore || !selectedDate || !selectedTime) {
      Alert.alert('Ошибка', 'Пожалуйста, выберите магазин, дату и время');
      return;
    }
    if (!vehicleType || !rimSize || !tireProfile || selectedServices.length === 0) {
      Alert.alert('Ошибка', 'Пожалуйста, выберите параметры автомобиля и услуги');
      return;
    }

    Alert.alert(
      'Подтверждение записи',
      `Магазин: ${selectedStore.name}\nДата: ${selectedDate}\nВремя: ${selectedTime}\nСтоимость: ${discountedPrice} руб.`,
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Подтвердить', 
          onPress: () => {
            // Здесь отправка данных на сервер
            Alert.alert('Успешно', 'Запись создана!');
            navigation.goBack();
          }
        }
      ]
    );
  };

  // Генерация дат
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const dates = generateDates();
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

  // Временные слоты
  const timeSlots = {
    morning: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'],
    afternoon: ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'],
    evening: ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'],
  };

  return (
    <View style={styles.container}>
      <CustomHeader
        title="Запись на шиномонтаж"
        onBackPress={() => navigation.goBack()}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Выбор магазина */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Выберите магазин</Text>
          {loadingStores ? (
            <ActivityIndicator size="large" color="#007bff" />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {stores.map(store => (
                <TouchableOpacity
                  key={store.id}
                  style={[
                    styles.storeCard,
                    selectedStore?.id === store.id && styles.storeCardSelected
                  ]}
                  onPress={() => setSelectedStore(store)}
                >
                  <Icon 
                    name="store" 
                    size={24} 
                    color={selectedStore?.id === store.id ? '#fff' : '#007bff'} 
                  />
                  <Text style={[
                    styles.storeName,
                    selectedStore?.id === store.id && styles.storeNameSelected
                  ]}>
                    {store.name}
                  </Text>
                  <Text style={[
                    styles.storeAddress,
                    selectedStore?.id === store.id && styles.storeAddressSelected
                  ]}>
                    {store.address}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Калькулятор стоимости */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Параметры автомобиля</Text>
          
          {/* Тип транспортного средства */}
          <Text style={styles.subsectionTitle}>Тип транспортного средства</Text>
          <View style={styles.optionGrid}>
            {vehicleTypes.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.optionCard,
                  vehicleType === type.id && styles.optionCardSelected
                ]}
                onPress={() => setVehicleType(type.id)}
              >
                <Icon 
                  name={type.icon} 
                  size={28} 
                  color={vehicleType === type.id ? '#fff' : '#007bff'} 
                />
                <Text style={[
                  styles.optionText,
                  vehicleType === type.id && styles.optionTextSelected
                ]}>
                  {type.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Размер диска */}
          <Text style={styles.subsectionTitle}>Размер диска</Text>
          <View style={styles.rimSizeRow}>
            {rimSizes.map(size => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.rimSizeButton,
                  rimSize === size && styles.rimSizeButtonSelected
                ]}
                onPress={() => setRimSize(size)}
              >
                <Text style={[
                  styles.rimSizeText,
                  rimSize === size && styles.rimSizeTextSelected
                ]}>
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Профиль шины */}
          <Text style={styles.subsectionTitle}>Профиль шины</Text>
          <View style={styles.profileColumn}>
            {tireProfiles.map(profile => (
              <TouchableOpacity
                key={profile.id}
                style={[
                  styles.profileCard,
                  tireProfile === profile.id && styles.profileCardSelected
                ]}
                onPress={() => setTireProfile(profile.id)}
              >
                <View style={styles.profileContent}>
                  <Text style={[
                    styles.profileName,
                    tireProfile === profile.id && styles.profileNameSelected
                  ]}>
                    {profile.name}
                  </Text>
                  <Text style={[
                    styles.profileDescription,
                    tireProfile === profile.id && styles.profileDescriptionSelected
                  ]}>
                    {profile.description}
                  </Text>
                </View>
                {tireProfile === profile.id && (
                  <Icon name="check-circle" size={24} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* RunFlat */}
          {tireProfile === 'low' && (
            <TouchableOpacity
              style={[
                styles.runFlatCard,
                hasRunFlat && styles.runFlatCardSelected
              ]}
              onPress={() => setHasRunFlat(!hasRunFlat)}
            >
              <View style={styles.runFlatContent}>
                <Icon 
                  name={hasRunFlat ? 'check-box' : 'check-box-outline-blank'} 
                  size={24} 
                  color={hasRunFlat ? '#007bff' : '#999'} 
                />
                <View style={styles.runFlatTextContainer}>
                  <Text style={styles.runFlatTitle}>RunFlat шины</Text>
                  <Text style={styles.runFlatDescription}>
                    Шины с усиленной боковиной
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Выбор услуг */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Выберите услуги</Text>
          {servicesList.map(service => (
            <TouchableOpacity
              key={service.id}
              style={[
                styles.serviceCard,
                selectedServices.includes(service.id) && styles.serviceCardSelected
              ]}
              onPress={() => toggleService(service.id)}
            >
              <Icon 
                name={selectedServices.includes(service.id) ? 'check-box' : 'check-box-outline-blank'} 
                size={24} 
                color={selectedServices.includes(service.id) ? '#007bff' : '#999'} 
              />
              <Text style={[
                styles.serviceText,
                selectedServices.includes(service.id) && styles.serviceTextSelected
              ]}>
                {service.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Стоимость */}
        {totalPrice > 0 && (
          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Стоимость без скидки:</Text>
              <Text style={styles.priceOld}>{totalPrice} ₽</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabelMain}>Итого со скидкой:</Text>
              <Text style={styles.priceMain}>{discountedPrice} ₽</Text>
            </View>
            <View style={styles.savingsBox}>
              <Icon name="local-offer" size={16} color="#28a745" />
              <Text style={styles.savingsText}>
                Экономия: {totalPrice - discountedPrice} ₽
              </Text>
            </View>
          </View>
        )}

        {/* Выбор даты */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Выберите дату</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {dates.map((date, index) => {
              const dateString = date.toLocaleDateString('ru-RU');
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayButton,
                    selectedDate === dateString && styles.selectedDayButton,
                  ]}
                  onPress={() => setSelectedDate(dateString)}
                >
                  <Text style={[
                    styles.dayText,
                    selectedDate === dateString && styles.selectedDayText,
                  ]}>
                    {date.getDate()}
                  </Text>
                  <Text style={[
                    styles.dayMonthText,
                    selectedDate === dateString && styles.selectedDayMonthText,
                  ]}>
                    {months[date.getMonth()]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Выбор времени */}
        {selectedDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Выберите время</Text>
            
            <Text style={styles.timeCategory}>Утро</Text>
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
                  <Text style={[
                    styles.timeSlotText,
                    selectedTime === time && styles.selectedTimeSlotText,
                  ]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.timeCategory}>День</Text>
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
                  <Text style={[
                    styles.timeSlotText,
                    selectedTime === time && styles.selectedTimeSlotText,
                  ]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.timeCategory}>Вечер</Text>
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
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Кнопка записи */}
      {selectedStore && selectedDate && selectedTime && totalPrice > 0 && (
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarContent}>
            <View>
              <Text style={styles.bottomBarLabel}>Итого:</Text>
              <Text style={styles.bottomBarPrice}>{discountedPrice} ₽</Text>
            </View>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
            >
              <Text style={styles.submitButtonText}>Записаться</Text>
              <Icon name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginTop: 16,
    marginBottom: 12,
  },
  
  // Магазины
  storeCard: {
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  storeCardSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  storeNameSelected: {
    color: '#fff',
  },
  storeAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  storeAddressSelected: {
    color: '#e6f0ff',
  },
  
  // Тип транспортного средства
  optionGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  optionCardSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 12,
  },
  optionTextSelected: {
    color: '#fff',
  },
  
  // Размер диска
  rimSizeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rimSizeButton: {
    flex: 1,
    minWidth: 60,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  rimSizeButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  rimSizeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  rimSizeTextSelected: {
    color: '#fff',
  },
  
  // Профиль шины
  profileColumn: {
    gap: 12,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  profileCardSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  profileContent: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  profileNameSelected: {
    color: '#fff',
  },
  profileDescription: {
    fontSize: 14,
    color: '#666',
  },
  profileDescriptionSelected: {
    color: '#e6f0ff',
  },
  
  // RunFlat
  runFlatCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  runFlatCardSelected: {
    borderColor: '#007bff',
  },
  runFlatContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  runFlatTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  runFlatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  runFlatDescription: {
    fontSize: 14,
    color: '#666',
  },
  
  // Услуги
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  serviceCardSelected: {
    borderColor: '#007bff',
    backgroundColor: '#f0f7ff',
  },
  serviceText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  serviceTextSelected: {
    fontWeight: '600',
    color: '#007bff',
  },
  
  // Стоимость
  priceSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceOld: {
    fontSize: 16,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  priceLabelMain: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  priceMain: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007bff',
  },
  savingsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#e8f5e9',
    padding: 10,
    borderRadius: 8,
  },
  savingsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#28a745',
    marginLeft: 6,
  },
  
  // Даты
  dayButton: {
    width: 70,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  selectedDayButton: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  dayText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedDayText: {
    color: '#fff',
  },
  dayMonthText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  selectedDayMonthText: {
    color: '#fff',
  },
  
  // Время
  timeCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginTop: 16,
    marginBottom: 12,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlotButton: {
    width: '22%',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  selectedTimeSlotButton: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  selectedTimeSlotText: {
    color: '#fff',
    fontWeight: '600',
  },
  
  // Нижняя панель
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  bottomBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomBarLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  bottomBarPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007bff',
  },
  submitButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 8,
  },
});

export default BookingScreen;
