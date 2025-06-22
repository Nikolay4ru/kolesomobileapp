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
  Appearance,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';


const { width, height } = Dimensions.get('window');

const ServiceBookingFlow = ({ navigation, route }) => {
  // Theme detection
  const [isDarkMode, setIsDarkMode] = useState(Appearance.getColorScheme() === 'dark');

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setIsDarkMode(colorScheme === 'dark');
    });
    return () => subscription?.remove();
  }, []);

  // Dynamic colors based on theme
  const COLORS = {
    primary: '#007AFF',
    secondary: isDarkMode ? '#5AC8FA' : '#007AFF',
    accent: '#FF9500',
    background: isDarkMode ? '#000000' : '#F2F1F6',
    elevated: isDarkMode ? '#1C1C1E' : '#FFFFFF',
    elevatedSecondary: isDarkMode ? '#2C2C2E' : '#FFFFFF',
    separator: isDarkMode ? '#3A3A3C' : '#E5E5EA',
    text: isDarkMode ? '#FFFFFF' : '#000000',
    textSecondary: isDarkMode ? '#8E8E93' : '#6E6E73',
    textTertiary: isDarkMode ? '#48484A' : '#C7C7CC',
    success: isDarkMode ? '#32D74B' : '#34C759',
    warning: isDarkMode ? '#FF9F0A' : '#FF9500',
    error: isDarkMode ? '#FF453A' : '#FF3B30',
    modalOverlay: isDarkMode ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.4)',
    inputBackground: isDarkMode ? '#1C1C1E' : '#F2F2F7',
    cardSelected: isDarkMode ? '#0A84FF' : '#007AFF',
  };

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
  const [searchQuery, setSearchQuery] = useState('');

  const [carBrands, setCarBrands] = useState([]);
  const [carModels, setCarModels] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;

  // Load car brands
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

  // Load car models
  const fetchCarModels = async (brand) => {
    setLoadingModels(true);
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
      color: '#007AFF',
    },
    {
      id: 2,
      name: 'Заявка на выдачу с хранения',
      description: 'Забронируйте время для получения хранения',
      icon: 'inventory',
      duration: '15-30 мин',
      price: 'бесплатно',
      color: '#34C759',
    },
  ];

  // Car types
  const carTypes = [
    { id: 1, name: 'Легковой', icon: 'directions-car', emoji: '🚗' },
    { id: 2, name: 'Кроссовер', icon: 'airport-shuttle', emoji: '🚙' },
    { id: 3, name: 'Внедорожник', icon: 'terrain', emoji: '🚐' },
    { id: 4, name: 'Легкогрузовой', icon: 'local-shipping', emoji: '🚚' },
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
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(progressAnim, {
      toValue: (currentStep + 1) / Object.keys(STEPS).length,
      duration: 500,
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

  // Button animation
  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Step navigation
  const goToNextStep = () => {
    if (currentStep < Object.keys(STEPS).length - 1) {
      animateButton();
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      scaleAnim.setValue(0.95);
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      fadeAnim.setValue(0);
      slideAnim.setValue(-50);
      scaleAnim.setValue(0.95);
      setCurrentStep(currentStep - 1);
    }
  };

  // Submit booking
  const handleSubmit = () => {
    animateButton();
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
    setTimeout(() => {
      alert('Запись успешно создана!');
      navigation.goBack();
    }, 300);
  };

  // Service step
  const renderServiceStep = () => (
    <Animated.View style={[styles.stepContainer, {
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
    }]}>
      <Text style={[styles.stepTitle, { color: COLORS.text }]}>Выберите услугу</Text>
      <Text style={[styles.stepSubtitle, { color: COLORS.textSecondary }]}>
        Какая услуга вас интересует?
      </Text>
      <View style={styles.servicesGrid}>
        {services.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={[
              styles.serviceCard,
              { 
                backgroundColor: COLORS.elevated,
                borderColor: selectedService?.id === service.id ? COLORS.primary : COLORS.separator,
              },
              selectedService?.id === service.id && styles.selectedServiceCard,
            ]}
            onPress={() => setSelectedService(service)}
            activeOpacity={0.7}
          >
            <View style={[styles.serviceIconContainer, { backgroundColor: COLORS.primary + '15' }]}>
              <MaterialCommunityIcons
                name={service.icon}
                size={32}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.serviceContent}>
              <Text style={[styles.serviceName, { color: COLORS.text }]}>{service.name}</Text>
              <Text style={[styles.serviceDescription, { color: COLORS.textSecondary }]}>
                {service.description}
              </Text>
              <View style={styles.serviceMetaRow}>
                <View style={styles.serviceMetaItem}>
                  <Icon name="schedule" size={16} color={COLORS.textSecondary} />
                  <Text style={[styles.serviceMetaText, { color: COLORS.textSecondary }]}>
                    {service.duration}
                  </Text>
                </View>
                <View style={styles.serviceMetaItem}>
                  <Icon name="payments" size={16} color={COLORS.textSecondary} />
                  <Text style={[styles.serviceMetaText, { color: COLORS.textSecondary }]}>
                    {service.price}
                  </Text>
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
      <Text style={[styles.stepTitle, { color: COLORS.text }]}>Выберите магазин</Text>
      <Text style={[styles.stepSubtitle, { color: COLORS.textSecondary }]}>
        Магазины с выбранной услугой
      </Text>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.storesScroll}
        >
          {stores.map((store) => (
            <TouchableOpacity
              key={store.id}
              style={[
                styles.storeCard,
                { 
                  backgroundColor: COLORS.elevated,
                  borderColor: selectedStore?.id === store.id ? COLORS.primary : COLORS.separator,
                },
                selectedStore?.id === store.id && styles.selectedStoreCard,
              ]}
              onPress={() => setSelectedStore(store)}
              activeOpacity={0.7}
            >
              <View style={styles.storeHeader}>
                <View style={[styles.storeIconContainer, { backgroundColor: COLORS.primary + '15' }]}>
                  <Icon name="store" size={24} color={COLORS.primary} />
                </View>
                <View style={[styles.storeStatus, { backgroundColor: COLORS.success + '20' }]}>
                  <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
                  <Text style={[styles.statusText, { color: COLORS.success }]}>Открыто</Text>
                </View>
              </View>
              <Text style={[styles.storeName, { color: COLORS.text }]}>{store.name}</Text>
              <Text style={[styles.storeAddress, { color: COLORS.textSecondary }]}>
                {store.address}
              </Text>
              <View style={styles.storeMetaContainer}>
                <View style={styles.storeMetaItem}>
                  <Icon name="schedule" size={14} color={COLORS.textSecondary} />
                  <Text style={[styles.storeMetaText, { color: COLORS.textSecondary }]}>
                    {store.working_hours || '9:00 - 21:00'}
                  </Text>
                </View>
                <View style={styles.storeMetaItem}>
                  <Icon name="near-me" size={14} color={COLORS.textSecondary} />
                  <Text style={[styles.storeMetaText, { color: COLORS.textSecondary }]}>
                    2.5 км
                  </Text>
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
      <Text style={[styles.stepTitle, { color: COLORS.text }]}>Данные автомобиля</Text>
      <Text style={[styles.stepSubtitle, { color: COLORS.textSecondary }]}>
        Информация о вашем авто
      </Text>
      
      <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Тип автомобиля</Text>
      <View style={styles.carTypesGrid}>
        {carTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.carTypeCard,
              {
                backgroundColor: selectedCarType?.id === type.id ? COLORS.primary : COLORS.elevated,
                borderColor: selectedCarType?.id === type.id ? COLORS.primary : COLORS.separator,
              },
            ]}
            onPress={() => setSelectedCarType(type)}
            activeOpacity={0.7}
          >
            <Text style={styles.carTypeEmoji}>{type.emoji}</Text>
            <Text style={[
              styles.carTypeName,
              { color: selectedCarType?.id === type.id ? COLORS.elevated : COLORS.text }
            ]}>
              {type.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputSection}>
        <TouchableOpacity
          style={[styles.inputField, { backgroundColor: COLORS.inputBackground }]}
          onPress={() => setShowBrandModal(true)}
          activeOpacity={0.7}
        >
          <Icon name="directions-car" size={20} color={COLORS.textSecondary} />
          <Text style={[
            styles.inputFieldText,
            { color: carBrand ? COLORS.text : COLORS.textSecondary }
          ]}>
            {carBrand || 'Марка автомобиля'}
          </Text>
          <Icon name="chevron-right" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {carBrand && (
          <TouchableOpacity
            style={[styles.inputField, { backgroundColor: COLORS.inputBackground }]}
            onPress={() => fetchCarModels(carBrand)}
            activeOpacity={0.7}
          >
            <Icon name="build" size={20} color={COLORS.textSecondary} />
            <Text style={[
              styles.inputFieldText,
              { color: carModel ? COLORS.text : COLORS.textSecondary }
            ]}>
              {carModel || 'Модель'}
            </Text>
            <Icon name="chevron-right" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}

        <View style={[styles.inputField, { backgroundColor: COLORS.inputBackground }]}>
          <Icon name="confirmation-number" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={[styles.textInput, { color: COLORS.text }]}
            placeholder="А123АА777"
            placeholderTextColor={COLORS.textSecondary}
            value={licensePlate}
            onChangeText={(text) => setLicensePlate(validateLicensePlate(text))}
            maxLength={9}
            autoCapitalize="characters"
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
      <Text style={[styles.stepTitle, { color: COLORS.text }]}>Выберите дату и время</Text>
      <Text style={[styles.stepSubtitle, { color: COLORS.textSecondary }]}>
        Доступные слоты для записи
      </Text>
      
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
                {
                  backgroundColor: isSelected ? COLORS.primary : COLORS.elevated,
                  borderColor: isToday && !isSelected ? COLORS.accent : COLORS.separator,
                },
              ]}
              onPress={() => setSelectedDate(date)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.dateWeekday,
                { color: isSelected ? COLORS.elevated : COLORS.textSecondary }
              ]}>
                {date.toLocaleDateString('ru-RU', { weekday: 'short' })}
              </Text>
              <Text style={[
                styles.dateDay,
                { color: isSelected ? COLORS.elevated : COLORS.text }
              ]}>
                {date.getDate()}
              </Text>
              <Text style={[
                styles.dateMonth,
                { color: isSelected ? COLORS.elevated : COLORS.textSecondary }
              ]}>
                {date.toLocaleDateString('ru-RU', { month: 'short' })}
              </Text>
              {isToday && (
                <View style={[styles.todayBadge, { backgroundColor: COLORS.accent }]}>
                  <Text style={styles.todayText}>Сегодня</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {selectedDate && (
        <View style={styles.timeSlotsContainer}>
          {Object.entries(timeSlots).map(([period, slots]) => (
            <View key={period} style={styles.timePeriod}>
              <Text style={[styles.timePeriodTitle, { color: COLORS.text }]}>
                {period === 'morning' ? '🌅 Утро' : period === 'afternoon' ? '☀️ День' : '🌙 Вечер'}
              </Text>
              <View style={styles.timeSlotsGrid}>
                {slots.map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.timeSlot,
                      {
                        backgroundColor: selectedTime === time ? COLORS.primary : COLORS.elevated,
                        borderColor: selectedTime === time ? COLORS.primary : COLORS.separator,
                      },
                    ]}
                    onPress={() => setSelectedTime(time)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.timeSlotText,
                        { color: selectedTime === time ? COLORS.elevated : COLORS.text }
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

  // Can proceed check
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
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: COLORS.background }]}>
        <View style={styles.headerContent}>>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: COLORS.elevated }]}
            onPress={currentStep === 0 ? () => navigation.goBack() : goToPreviousStep}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: COLORS.text }]}>Запись на сервис</Text>
            <Text style={[styles.headerSubtitle, { color: COLORS.textSecondary }]}>
              Шаг {currentStep + 1} из 4
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: COLORS.elevated }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Icon name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        
        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: COLORS.separator }]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: COLORS.primary,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
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

      {/* Bottom Action */}
      <View style={[styles.bottomContainer, { backgroundColor: COLORS.background }]}>
        <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              {
                backgroundColor: canProceed() ? COLORS.primary : COLORS.separator,
                opacity: canProceed() ? 1 : 0.5,
              },
            ]}
            onPress={currentStep === STEPS.DATETIME ? handleSubmit : goToNextStep}
            disabled={!canProceed()}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.continueButtonText,
              { color: canProceed() ? '#FFFFFF' : COLORS.textSecondary }
            ]}>
              {currentStep === STEPS.DATETIME ? 'Записаться' : 'Продолжить'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Brand Modal */}
      <Modal
        visible={showBrandModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBrandModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: COLORS.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: COLORS.elevated }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: COLORS.text }]}>Выберите марку</Text>
              <TouchableOpacity
                style={[styles.modalCloseButton, { backgroundColor: COLORS.inputBackground }]}
                onPress={() => setShowBrandModal(false)}
                activeOpacity={0.7}
              >
                <Icon name="close" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.searchContainer, { backgroundColor: COLORS.inputBackground }]}>
              <Icon name="search" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: COLORS.text }]}
                placeholder="Поиск марки..."
                placeholderTextColor={COLORS.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            
            {loadingBrands ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={styles.modalLoader} />
            ) : (
              <FlatList
                data={carBrands.filter(brand => 
                  brand.toLowerCase().includes(searchQuery.toLowerCase())
                )}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalItem, { backgroundColor: COLORS.elevated }]}
                    onPress={() => {
                      setCarBrand(item);
                      setCarModel(null);
                      setShowBrandModal(false);
                      setSearchQuery('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modalItemText, { color: COLORS.text }]}>{item}</Text>
                    <Icon name="chevron-right" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => (
                  <View style={[styles.modalSeparator, { backgroundColor: COLORS.separator }]} />
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Model Modal */}
      <Modal
        visible={showModelModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModelModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: COLORS.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: COLORS.elevated }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: COLORS.text }]}>Выберите модель</Text>
              <TouchableOpacity
                style={[styles.modalCloseButton, { backgroundColor: COLORS.inputBackground }]}
                onPress={() => setShowModelModal(false)}
                activeOpacity={0.7}
              >
                <Icon name="close" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            {loadingModels ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={styles.modalLoader} />
            ) : (
              <FlatList
                data={carModels}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalItem, { backgroundColor: COLORS.elevated }]}
                    onPress={() => {
                      setCarModel(item);
                      setShowModelModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modalItemText, { color: COLORS.text }]}>{item}</Text>
                    <Icon name="chevron-right" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => (
                  <View style={[styles.modalSeparator, { backgroundColor: COLORS.separator }]} />
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
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  progressContainer: {
    paddingHorizontal: 20,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 120 : 100,
    marginBottom: 100,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  stepSubtitle: {
    fontSize: 17,
    marginBottom: 32,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  // Service styles
  servicesGrid: {
    gap: 16,
  },
  serviceCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    marginBottom: 4,
  },
  selectedServiceCard: {
    transform: [{ scale: 0.98 }],
  },
  serviceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceContent: {
    flex: 1,
  },
  serviceName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  serviceDescription: {
    fontSize: 15,
    marginBottom: 16,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  serviceMetaRow: {
    flexDirection: 'row',
    gap: 20,
  },
  serviceMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  serviceMetaText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  // Store styles
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  storesScroll: {
    paddingRight: 20,
  },
  storeCard: {
    width: width * 0.8,
    borderRadius: 16,
    padding: 20,
    marginRight: 16,
    borderWidth: 2,
  },
  selectedStoreCard: {
    transform: [{ scale: 0.98 }],
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  storeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  storeName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  storeAddress: {
    fontSize: 15,
    marginBottom: 16,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  storeMetaContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  storeMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storeMetaText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  // Car styles
  carTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  carTypeCard: {
    width: (width - 52) / 2,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 2,
  },
  carTypeEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  carTypeName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  inputSection: {
    gap: 12,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  inputFieldText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  textInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  // Date/time styles
  datesScroll: {
    paddingRight: 20,
    marginBottom: 32,
  },
  dateCard: {
    width: 80,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  dateWeekday: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  dateDay: {
    fontSize: 24,
    fontWeight: '700',
    marginVertical: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  dateMonth: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  todayBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  todayText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  timeSlotsContainer: {
    gap: 24,
  },
  timePeriod: {
    gap: 12,
  },
  timePeriodTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  timeSlotText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  // Bottom action
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  continueButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalLoader: {
    marginTop: 40,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalItemText: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalSeparator: {
    height: 0.5,
    marginLeft: 20,
  },
});

export default ServiceBookingFlow;