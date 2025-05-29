import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { BlurView } from '@react-native-community/blur';

const { width, height } = Dimensions.get('window');

const ServiceBookingFlow = ({ navigation, route }) => {
  // Steps
  const STEPS = {
    SERVICE: 0,
    STORE: 1,
    CAR: 2,
    DATETIME: 3,
  };

  // State
  const [currentStep, setCurrentStep] = useState(STEPS.SERVICE);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedCarType, setSelectedCarType] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [carBrand, setCarBrand] = useState(null);
  const [carModel, setCarModel] = useState(null);
  const [licensePlate, setLicensePlate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [carBrands, setCarBrands] = useState([]);
  const [carModels, setCarModels] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null); // для fetchCarModels
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;

  // Colors (minimalist, modern)
  const COLORS = {
    primary: '#22223B',
    secondary: '#4A4E69',
    accent: '#F2E9E4',
    background: '#FAFAFA',
    text: '#22223B',
    textSecondary: '#6E6E6E',
    border: '#ECECEC',
    card: '#FFFFFF',
    cardSelected: '#F4F4F4',
    success: '#38B000',
    warning: '#FFAA00',
    error: '#EF233C',
  };


   // --- Загрузка марок автомобилей ---
  useEffect(() => {
    const fetchCarBrands = async () => {
      try {
        setLoadingBrands(true);
        const response = await fetch('https://api.koleso.app/api/car-brands.php');
        const data = await response.json();
        setCarBrands(data);
        setLoadingBrands(false);
      } catch (error) {
        setLoadingBrands(false);
      }
    };
    fetchCarBrands();
  }, []);


   // --- Загрузка моделей по выбранной марке ---
  const fetchCarModels = async (brand) => {
    setLoadingModels(true);
    setSelectedBrand(brand);
    setShowBrandModal(false);
    try {
      const response = await fetch(`https://api.koleso.app/api/car-models.php?brand=${encodeURIComponent(brand)}`);
      const data = await response.json();
      setCarModels(data);
      setLoadingModels(false);
      setShowModelModal(true);
    } catch (error) {
      setLoadingModels(false);
    }
  };

  // Services data
  const services = [
    {
      id: 1,
      name: 'Шиномонтаж',
      description: 'Профессиональный монтаж и балансировка колес',
      icon: 'tire-repair',
      duration: '30-60 мин',
      price: 'от 1500₽',
    },
    {
      id: 2,
      name: 'Заявка на выдачу с хранения',
      description: 'Забронируйте время для получения хранения',
      icon: 'inventory',
      duration: '15-30 мин',
      price: 'бесплатно',
    },
  ];

  // Car types
  const carTypes = [
    { id: 1, name: 'Легковой', icon: 'directions-car' },
    { id: 2, name: 'Кроссовер', icon: 'airport-shuttle' },
    { id: 3, name: 'Внедорожник', icon: 'terrain' },
    { id: 4, name: 'Легкогрузовой', icon: 'local-shipping' },
  ];

  // Time slots
  const timeSlots = {
    morning: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'],
    afternoon: [
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    ],
    evening: ['18:00', '18:30', '19:00', '19:30'],
  };

  // Animations on step change
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 7,
        tension: 38,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 38,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(progressAnim, {
      toValue: (currentStep + 1) / Object.keys(STEPS).length,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  // Load stores
  useEffect(() => {
    if (currentStep === STEPS.STORE) {
      fetchStores();
    }
  }, [currentStep]);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://api.koleso.app/api/stores_service.php');
      const data = await response.json();
      const filteredStores = data.filter(store => store.id !== 8 && store.is_active === '1');
      setStores(filteredStores);
    } catch (error) {
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  // License plate validation
  const validateLicensePlate = (text) => {
    const allowedLetters = 'АВЕКМНОРСТУХавекмнорстухABEKMHOPCTYXabekmhopctyx';
    const allowedChars = allowedLetters + '0123456789';
    let filteredText = '';
    for (let i = 0; i < text.length; i++) {
      if (allowedChars.includes(text[i])) {
        filteredText += text[i];
      }
    }
    const latinToCyrillic = {
      'A': 'А', 'B': 'В', 'E': 'Е', 'K': 'К', 'M': 'М',
      'H': 'Н', 'O': 'О', 'P': 'Р', 'C': 'С', 'T': 'Т',
      'Y': 'У', 'X': 'Х',
      'a': 'а', 'b': 'в', 'e': 'е', 'k': 'к', 'm': 'м',
      'h': 'н', 'o': 'о', 'p': 'р', 'c': 'с', 't': 'т',
      'y': 'у', 'x': 'х'
    };
    let convertedText = '';
    for (let i = 0; i < filteredText.length; i++) {
      const char = filteredText[i];
      convertedText += latinToCyrillic[char] || char;
    }
    return convertedText.toUpperCase();
  };

  // Generate days
  const generateDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  // Step navigation
  const goToNextStep = () => {
    if (currentStep < Object.keys(STEPS).length - 1) {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      scaleAnim.setValue(0.97);
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      fadeAnim.setValue(0);
      slideAnim.setValue(-50);
      scaleAnim.setValue(0.97);
      setCurrentStep(currentStep - 1);
    }
  };

  // Submit booking
  const handleSubmit = () => {
    const bookingData = {
      service: selectedService,
      store: selectedStore,
      carType: selectedCarType,
      carBrand,
      carModel,
      licensePlate,
      date: selectedDate,
      time: selectedTime,
    };
    alert('Запись успешно создана!');
    navigation.goBack();
  };

  // Service step
  const renderServiceStep = () => (
    <Animated.View style={[styles.stepContainer, {
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
    }]}>
      <Text style={styles.stepTitle}>Выберите услугу</Text>
      <Text style={styles.stepSubtitle}>Какая услуга вас интересует?</Text>
      <View style={styles.servicesGrid}>
        {services.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={[
              styles.serviceCard,
              selectedService?.id === service.id && styles.selectedCard,
            ]}
            onPress={() => setSelectedService(service)}
            activeOpacity={0.8}
          >
            <View style={styles.serviceIconContainer}>
              <MaterialCommunityIcons
                name={service.icon}
                size={28}
                color={selectedService?.id === service.id ? COLORS.primary : COLORS.secondary}
              />
            </View>
            <View style={styles.serviceInfoBlock}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceDescription}>{service.description}</Text>
              <View style={styles.serviceInfoRow}>
                <View style={styles.serviceInfoItem}>
                  <Icon name="schedule" size={15} color={COLORS.textSecondary} />
                  <Text style={styles.serviceInfoText}>{service.duration}</Text>
                </View>
                <View style={styles.serviceInfoItem}>
                  <Icon name="payments" size={15} color={COLORS.textSecondary} />
                  <Text style={styles.serviceInfoText}>{service.price}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  // Store step
  const renderStoreStep = () => (
    <Animated.View style={[styles.stepContainer, {
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
    }]}>
      <Text style={styles.stepTitle}>Выберите магазин</Text>
      <Text style={styles.stepSubtitle}>Магазины с выбранной услугой</Text>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storesScroll}>
          {stores.map((store) => (
            <TouchableOpacity
              key={store.id}
              style={[
                styles.storeCard,
                selectedStore?.id === store.id && styles.selectedStoreCard,
              ]}
              onPress={() => setSelectedStore(store)}
              activeOpacity={0.85}
            >
              <View style={styles.storeHeader}>
                <View style={styles.storeIcon}>
                  <Icon name="store" size={21} color={COLORS.primary} />
                </View>
                <View style={styles.storeStatus}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Открыто</Text>
                </View>
              </View>
              <Text style={styles.storeName}>{store.name}</Text>
              <Text style={styles.storeAddress}>{store.address}</Text>
              <View style={styles.storeFooter}>
                <View style={styles.storeInfoItem}>
                  <Icon name="schedule" size={13} color={COLORS.textSecondary} />
                  <Text style={styles.storeInfoText}>{store.working_hours || '9:00 - 21:00'}</Text>
                </View>
                <View style={styles.storeInfoItem}>
                  <Icon name="near-me" size={13} color={COLORS.textSecondary} />
                  <Text style={styles.storeInfoText}>2.5 км</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </Animated.View>
  );

  // Car step
const renderCarStep = () => (
    <Animated.View style={[styles.stepContainer, {
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
    }]}>
      <Text style={styles.stepTitle}>Данные автомобиля</Text>
      <Text style={styles.stepSubtitle}>Информация о вашем авто</Text>
      <Text style={styles.fieldLabel}>Тип автомобиля</Text>
      <View style={styles.carTypesGrid}>
        {carTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.carTypeCard,
              selectedCarType?.id === type.id && styles.selectedCarType,
            ]}
            onPress={() => setSelectedCarType(type)}
            activeOpacity={0.85}
          >
            <Icon
              name={type.icon}
              size={24}
              color={selectedCarType?.id === type.id ? COLORS.primary : COLORS.textSecondary}
            />
            <Text style={[
              styles.carTypeName,
              selectedCarType?.id === type.id && styles.selectedCarTypeName,
            ]}>
              {type.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.carDetailsContainer}>
        {/* Выбор марки автомобиля */}
        <TouchableOpacity
          style={styles.selectField}
          onPress={() => setShowBrandModal(true)}
        >
          <Text style={[styles.selectFieldText, !carBrand && styles.placeholder]}>
            {carBrand || 'Марка автомобиля'}
          </Text>
          <Icon name="chevron-right" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
        {/* Выбор модели автомобиля */}
        {carBrand && (
          <TouchableOpacity
            style={styles.selectField}
            onPress={() => {
              fetchCarModels(carBrand);
            }}
          >
            <Text style={[styles.selectFieldText, !carModel && styles.placeholder]}>
              {carModel || 'Модель'}
            </Text>
            <Icon name="chevron-right" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
        <Text style={styles.fieldLabel}>Гос. номер</Text>
        <View style={styles.licensePlateContainer}>
          <TextInput
            style={styles.licensePlateInput}
            placeholder="А123АА777"
            value={licensePlate}
            onChangeText={(text) => setLicensePlate(validateLicensePlate(text))}
            maxLength={9}
            autoCapitalize="characters"
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>
      </View>
    </Animated.View>
  );

  // Date/time step
  const renderDateTimeStep = () => (
    <Animated.View style={[styles.stepContainer, {
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
    }]}>
      <Text style={styles.stepTitle}>Выберите дату и время</Text>
      <Text style={styles.stepSubtitle}>Доступные слоты</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.datesScroll}
      >
        {generateDays().map((date, index) => {
          const isSelected = selectedDate?.toDateString() === date.toDateString();
          const isToday = index === 0;
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dateCard,
                isSelected && styles.selectedDateCard,
                isToday && styles.todayCard,
              ]}
              onPress={() => setSelectedDate(date)}
              activeOpacity={0.87}
            >
              <Text style={[styles.dateWeekday, isSelected && styles.selectedDateText]}>
                {date.toLocaleDateString('ru-RU', { weekday: 'short' })}
              </Text>
              <Text style={[styles.dateDay, isSelected && styles.selectedDateText]}>
                {date.getDate()}
              </Text>
              <Text style={[styles.dateMonth, isSelected && styles.selectedDateText]}>
                {date.toLocaleDateString('ru-RU', { month: 'short' })}
              </Text>
              {isToday && <Text style={styles.todayLabel}>Сегодня</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {selectedDate && (
        <View style={styles.timeSlotsContainer}>
          {Object.entries(timeSlots).map(([period, slots]) => (
            <View key={period} style={styles.timePeriod}>
              <Text style={styles.timePeriodTitle}>
                {period === 'morning' ? 'Утро' : period === 'afternoon' ? 'День' : 'Вечер'}
              </Text>
              <View style={styles.timeSlotsGrid}>
                {slots.map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.timeSlot,
                      selectedTime === time && styles.selectedTimeSlot,
                    ]}
                    onPress={() => setSelectedTime(time)}
                    activeOpacity={0.87}
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
          ))}
        </View>
      )}
    </Animated.View>
  );

  // Can proceed?
  const canProceed = () => {
    switch (currentStep) {
      case STEPS.SERVICE:
        return selectedService !== null;
      case STEPS.STORE:
        return selectedStore !== null;
      case STEPS.CAR:
        return selectedCarType && carBrand && carModel && licensePlate.length >= 8;
      case STEPS.DATETIME:
        return selectedDate && selectedTime;
      default:
        return false;
    }
  };

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case STEPS.SERVICE:
        return renderServiceStep();
      case STEPS.STORE:
        return renderStoreStep();
      case STEPS.CAR:
        return renderCarStep();
      case STEPS.DATETIME:
        return renderDateTimeStep();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={currentStep === 0 ? () => navigation.goBack() : goToPreviousStep}
          >
            <Icon name="arrow-back" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Запись на сервис</Text>
            <Text style={styles.headerSubtitle}>Шаг {currentStep + 1} из 4</Text>
          </View>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <Icon name="close" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <View style={styles.progressSteps}>
            {Object.keys(STEPS).map((step, index) => (
              <View
                key={step}
                style={[
                  styles.progressStep,
                  index <= currentStep && styles.progressStepActive,
                ]}
              >
                <View style={[
                  styles.progressStepDot,
                  index <= currentStep && styles.progressStepDotActive,
                ]} />
                <Text style={styles.progressStepLabel}>
                  {['Услуга', 'Магазин', 'Авто', 'Время'][index]}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {renderCurrentStep()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !canProceed() && styles.continueButtonDisabled,
          ]}
          onPress={currentStep === STEPS.DATETIME ? handleSubmit : goToNextStep}
          disabled={!canProceed()}
          activeOpacity={0.9}
        >
          <Text style={[
            styles.continueButtonText,
            !canProceed() && styles.continueButtonTextDisabled,
          ]}>
            {currentStep === STEPS.DATETIME ? 'Записаться' : 'Продолжить'}
          </Text>
          <Icon
            name={currentStep === STEPS.DATETIME ? 'check' : 'arrow-forward'}
            size={19}
            color={canProceed() ? COLORS.primary : COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Модальное окно выбора марки */}
  <Modal
    visible={showBrandModal}
    animationType="slide"
    transparent={true}
    onRequestClose={() => setShowBrandModal(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Выберите марку</Text>
          <TouchableOpacity onPress={() => setShowBrandModal(false)}>
            <Icon name="close" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        {loadingBrands ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={carBrands}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  setCarBrand(item);
                  setCarModel(null);
                  setShowBrandModal(false);
                }}
              >
                <Text style={styles.modalItemText}>{item}</Text>
                <Icon name="chevron-right" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </View>
  </Modal>

  {/* Модальное окно выбора модели */}
  <Modal
    visible={showModelModal}
    animationType="slide"
    transparent={true}
    onRequestClose={() => setShowModelModal(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Выберите модель</Text>
          <TouchableOpacity onPress={() => setShowModelModal(false)}>
            <Icon name="close" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        {loadingModels ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={carModels}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  setCarModel(item);
                  setShowModelModal(false);
                }}
              >
                <Text style={styles.modalItemText}>{item}</Text>
                <Icon name="chevron-right" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </View>
  </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 44 : 24,
    paddingBottom: 10,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F4F4F4'
  },
  headerTextContainer: { alignItems: 'center' },
  headerTitle: {
    fontSize: 20, fontWeight: '700', color: '#22223B',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  headerSubtitle: {
    fontSize: 13, color: '#6E6E6E', marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  progressContainer: { paddingHorizontal: 18, marginBottom: 2 },
  progressBar: {
    height: 3,
    backgroundColor: '#ECECEC',
    borderRadius: 1.5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22223B',
    borderRadius: 1.5,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 0,
  },
  progressStep: { alignItems: 'center', flex: 1 },
  progressStepActive: {},
  progressStepDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: '#ECECEC', marginBottom: 2,
  },
  progressStepDotActive: {
    backgroundColor: '#22223B',
  },
  progressStepLabel: {
    fontSize: 11,
    color: '#6E6E6E',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    textAlign: 'center',
  },
  content: { flex: 1 },
  scrollContent: { padding: 18, paddingBottom: 80 },
  stepContainer: { flex: 1 },
  stepTitle: {
    fontSize: 24, fontWeight: '700', color: '#22223B', marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  stepSubtitle: {
    fontSize: 15, color: '#6E6E6E', marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  servicesGrid: { gap: 12, marginBottom: 8 },
  serviceCard: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECECEC',
    marginBottom: 2,
  },
  selectedCard: {
    backgroundColor: '#F4F4F4',
    borderColor: '#22223B',
  },
  serviceIconContainer: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  serviceInfoBlock: { flex: 1 },
  serviceName: {
    fontSize: 16, fontWeight: '700', color: '#22223B', marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  serviceDescription: {
    fontSize: 13, color: '#6E6E6E', marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  serviceInfoRow: { flexDirection: 'row', gap: 12 },
  serviceInfoItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  serviceInfoText: {
    fontSize: 12, color: '#6E6E6E', marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 120 },
  storesScroll: { paddingRight: 10 },
  storeCard: {
    width: width * 0.78,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  selectedStoreCard: {
    borderColor: '#22223B',
    backgroundColor: '#F4F4F4',
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  storeIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center', alignItems: 'center',
  },
  storeStatus: { flexDirection: 'row', alignItems: 'center' },
  statusDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#38B000', marginRight: 5,
  },
  statusText: {
    fontSize: 11, color: '#38B000', fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  storeName: {
    fontSize: 16, fontWeight: '700', color: '#22223B', marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  storeAddress: {
    fontSize: 13, color: '#6E6E6E', marginBottom: 7, lineHeight: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  storeFooter: { gap: 5 },
  storeInfoItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  storeInfoText: {
    fontSize: 11, color: '#6E6E6E', marginLeft: 5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  fieldLabel: {
    fontSize: 15, fontWeight: '600', color: '#22223B', marginBottom: 8, marginTop: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  carTypesGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, marginBottom: 14,
  },
  carTypeCard: {
    width: (width - 64) / 2,
    borderRadius: 9,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    paddingVertical: 13,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  selectedCarType: {
    backgroundColor: '#F4F4F4',
    borderColor: '#22223B',
  },
  carTypeName: {
    fontSize: 13, fontWeight: '500', color: '#6E6E6E', marginTop: 7,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  selectedCarTypeName: { color: '#22223B' },
  carDetailsContainer: { gap: 13 },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 13,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  selectFieldText: {
    fontSize: 15,
    color: '#22223B',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  placeholder: { color: '#6E6E6E' },
  licensePlateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#ECECEC',
    paddingHorizontal: 13,
  },
  licensePlateInput: {
    flex: 1,
    fontSize: 15,
    color: '#22223B',
    paddingVertical: 13,
    fontWeight: '600',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  datesScroll: { paddingRight: 10, marginBottom: 18 },
  dateCard: {
    width: 62,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  selectedDateCard: {
    borderColor: '#22223B',
    backgroundColor: '#F4F4F4',
  },
  todayCard: { borderColor: '#FFAA00' },
  dateWeekday: {
    fontSize: 11, color: '#6E6E6E', fontWeight: '500',
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  dateDay: {
    fontSize: 17, fontWeight: '700', color: '#22223B', marginVertical: 1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  dateMonth: {
    fontSize: 11, color: '#6E6E6E', fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  selectedDateText: { color: '#22223B', fontWeight: '700' },
  todayLabel: {
    fontSize: 8, color: '#FFAA00', fontWeight: '700', marginTop: 2,
    textTransform: 'uppercase', fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  timeSlotsContainer: { gap: 18 },
  timePeriod: { gap: 10 },
  timePeriodTitle: {
    fontSize: 16, fontWeight: '700', color: '#22223B',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 5,
  },
  timeSlotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  timeSlot: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#F7F7F7',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#ECECEC',
    marginBottom: 5,
  },
  selectedTimeSlot: {
    backgroundColor: '#22223B',
    borderColor: '#22223B',
  },
  timeSlotText: {
    fontSize: 13, fontWeight: '500', color: '#22223B',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  selectedTimeSlotText: { color: '#FFFFFF' },
  bottomActions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', padding: 18, paddingBottom: Platform.OS === 'ios' ? 24 : 18,
    borderTopWidth: 1, borderTopColor: '#ECECEC',
    alignItems: 'center',
    zIndex: 2,
  },
  continueButton: {
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 26,
    gap: 8,
  },
  continueButtonDisabled: {
    opacity: 0.6,
    backgroundColor: '#F7F7F7',
  },
  continueButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#22223B',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginRight: 5,
  },
  continueButtonTextDisabled: {
    color: '#6E6E6E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(34,34,59,0.10)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: height * 0.8,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 20 : 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#22223B',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  searchInput: {
    backgroundColor: '#F7F7F7',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 7,
    fontSize: 15,
    color: '#22223B',
    borderWidth: 1,
    borderColor: '#ECECEC',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalItem: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F7F7',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalItemText: {
    fontSize: 15, color: '#22223B', fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});

export default ServiceBookingFlow;