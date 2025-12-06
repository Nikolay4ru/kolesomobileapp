import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

const ServiceBookingFlow = ({ navigation, route }) => {
  const { colors, theme } = useTheme();

  // Steps
  const STEPS = {
    SERVICE: 0,
    STORE: 1,
    CAR: 2,
    DATETIME: 3,
  };

  const stepTitles = ['Услуга', 'Магазин', 'Авто', 'Дата'];

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
  const slideAnim = useRef(new Animated.Value(30)).current;

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
      description: 'Монтаж и балансировка',
      icon: 'tire-repair',
      duration: '30-60 мин',
      price: 'от 1500₽',
      emoji: '🔧',
    },
    {
      id: 2,
      name: 'Выдача с хранения',
      description: 'Получение колес',
      icon: 'inventory',
      duration: '15-30 мин',
      price: 'бесплатно',
      emoji: '📦',
    },
  ];

  // Car types
  const carTypes = [
    { id: 1, name: 'Легковой', emoji: '🚗' },
    { id: 2, name: 'Кроссовер', emoji: '🚙' },
    { id: 3, name: 'Внедорожник', emoji: '🚐' },
    { id: 4, name: 'Легкогрузовой', emoji: '🚚' },
  ];

  // Time slots
  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  ];

  // Animations on step change
  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
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
  const validateLicensePlate = useCallback((text) => {
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
  }, []);

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
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
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
    setTimeout(() => {
      alert('Запись успешно создана!');
      navigation.goBack();
    }, 300);
  };

  // Service step - Horizontal cards
  const renderServiceStep = () => (
    <Animated.View style={[styles.stepContainer, {
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }],
    }]}>
      <Text style={[styles.stepQuestion, { color: colors.text }]}>
        Какая услуга вам нужна?
      </Text>
      
      <View style={styles.servicesContainer}>
        {services.map((service) => {
          const isSelected = selectedService?.id === service.id;
          return (
            <TouchableOpacity
              key={service.id}
              style={[
                styles.serviceCardHorizontal,
                { 
                  backgroundColor: isSelected ? colors.primary : colors.card,
                },
              ]}
              onPress={() => setSelectedService(service)}
              activeOpacity={0.7}
            >
              <View style={styles.serviceLeft}>
                <Text style={styles.serviceEmoji}>{service.emoji}</Text>
                <View style={styles.serviceTextContainer}>
                  <Text style={[
                    styles.serviceNameHorizontal, 
                    { color: isSelected ? '#FFFFFF' : colors.text }
                  ]}>
                    {service.name}
                  </Text>
                  <Text style={[
                    styles.serviceDescriptionHorizontal, 
                    { color: isSelected ? 'rgba(255,255,255,0.8)' : colors.textSecondary }
                  ]}>
                    {service.description}
                  </Text>
                </View>
              </View>
              
              {isSelected && (
                <View style={[styles.serviceCheckmark, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Icon name="check" size={20} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );

  // Store step - Vertical list
  const renderStoreStep = () => (
    <Animated.View style={[styles.stepContainer, {
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }],
    }]}>
      <Text style={[styles.stepQuestion, { color: colors.text }]}>
        Где вам удобнее?
      </Text>
      
      {loading ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={styles.storesContainer}>
          {stores.map((store) => {
            const isSelected = selectedStore?.id === store.id;
            return (
              <TouchableOpacity
                key={store.id}
                style={[
                  styles.storeCardVertical,
                  { 
                    backgroundColor: colors.card,
                    borderColor: isSelected ? colors.primary : 'transparent',
                  },
                ]}
                onPress={() => setSelectedStore(store)}
                activeOpacity={0.7}
              >
                <View style={styles.storeMainInfo}>
                  <View style={styles.storeNameRow}>
                    <View style={[styles.storeIcon, { backgroundColor: colors.primaryLight }]}>
                      <Icon name="store" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.storeNameContainer}>
                      <Text style={[styles.storeNameVertical, { color: colors.text }]} numberOfLines={1}>
                        {store.name}
                      </Text>
                      <View style={[styles.statusBadgeSmall, { backgroundColor: colors.successLight }]}>
                        <View style={[styles.statusDotSmall, { backgroundColor: colors.success }]} />
                        <Text style={[styles.statusTextSmall, { color: colors.success }]}>
                          Открыто
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <Text style={[styles.storeAddressVertical, { color: colors.textSecondary }]} numberOfLines={2}>
                    {store.address}
                  </Text>
                  
                  <View style={styles.storeMetaRow}>
                    <View style={styles.storeMetaBadge}>
                      <Icon name="schedule" size={14} color={colors.textTertiary} />
                      <Text style={[styles.storeMetaTextVertical, { color: colors.textSecondary }]}>
                        {store.working_hours || '9:00 - 21:00'}
                      </Text>
                    </View>
                    <View style={styles.storeMetaBadge}>
                      <Icon name="near-me" size={14} color={colors.primary} />
                      <Text style={[styles.storeMetaTextVertical, { color: colors.primary }]}>
                        2.5 км
                      </Text>
                    </View>
                  </View>
                </View>
                
                {isSelected && (
                  <View style={[styles.checkmarkCircle, { backgroundColor: colors.primary }]}>
                    <Icon name="check" size={20} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </Animated.View>
  );

  // Car step - Compact form
  const renderCarStep = () => (
    <Animated.View style={[styles.stepContainer, {
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }],
    }]}>
      <Text style={[styles.stepQuestion, { color: colors.text }]}>
        Расскажите о вашем авто
      </Text>
      
      {/* Car Types - Horizontal Scroll */}
      <View style={styles.carTypeSection}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>ТИП КУЗОВА</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carTypesScroll}
        >
          {carTypes.map((type) => {
            const isSelected = selectedCarType?.id === type.id;
            return (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.carTypeChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedCarType(type)}
                activeOpacity={0.7}
              >
                <Text style={styles.carTypeChipEmoji}>{type.emoji}</Text>
                <Text style={[
                  styles.carTypeChipText,
                  { color: isSelected ? '#FFFFFF' : colors.text }
                ]}>
                  {type.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Car Details */}
      <View style={styles.carDetailsSection}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>ДЕТАЛИ</Text>
        
        <View style={styles.inputsContainer}>
          <TouchableOpacity
            style={[styles.inputBox, { backgroundColor: colors.inputBackground }]}
            onPress={() => setShowBrandModal(true)}
            activeOpacity={0.7}
          >
            <Icon name="directions-car" size={20} color={carBrand ? colors.primary : colors.textTertiary} />
            <Text style={[
              styles.inputBoxText,
              { color: carBrand ? colors.text : colors.placeholder }
            ]}>
              {carBrand || 'Марка'}
            </Text>
          </TouchableOpacity>

          {carBrand && (
            <TouchableOpacity
              style={[styles.inputBox, { backgroundColor: colors.inputBackground }]}
              onPress={() => fetchCarModels(carBrand)}
              activeOpacity={0.7}
            >
              <Icon name="build" size={20} color={carModel ? colors.primary : colors.textTertiary} />
              <Text style={[
                styles.inputBoxText,
                { color: carModel ? colors.text : colors.placeholder }
              ]}>
                {carModel || 'Модель'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={[styles.inputBox, { backgroundColor: colors.inputBackground }]}>
            <Icon name="confirmation-number" size={20} color={licensePlate ? colors.primary : colors.textTertiary} />
            <TextInput
              style={[styles.inputBoxInput, { color: colors.text }]}
              placeholder="А123АА777"
              placeholderTextColor={colors.placeholder}
              value={licensePlate}
              onChangeText={(text) => setLicensePlate(validateLicensePlate(text))}
              maxLength={9}
              autoCapitalize="characters"
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );

  // Date/time step - Calendar style
  const renderDateTimeStep = () => (
    <Animated.View style={[styles.stepContainer, {
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }],
    }]}>
      <Text style={[styles.stepQuestion, { color: colors.text }]}>
        Когда вам удобно?
      </Text>
      
      {/* Date Selector */}
      <View style={styles.dateSection}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>ДАТА</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.datesScrollHorizontal}
        >
          {generateDays().map((date, index) => {
            const isSelected = selectedDate?.toDateString() === date.toDateString();
            const isToday = index === 0;
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dateChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : (isToday ? colors.border : 'transparent'),
                  },
                ]}
                onPress={() => setSelectedDate(date)}
                activeOpacity={0.7}
              >
                {isToday && !isSelected && (
                  <View style={[styles.todayDot, { backgroundColor: colors.warning }]} />
                )}
                <Text style={[
                  styles.dateChipWeekday,
                  { color: isSelected ? 'rgba(255,255,255,0.8)' : colors.textTertiary }
                ]}>
                  {date.toLocaleDateString('ru-RU', { weekday: 'short' }).toUpperCase()}
                </Text>
                <Text style={[
                  styles.dateChipDay,
                  { color: isSelected ? '#FFFFFF' : colors.text }
                ]}>
                  {date.getDate()}
                </Text>
                <Text style={[
                  styles.dateChipMonth,
                  { color: isSelected ? 'rgba(255,255,255,0.7)' : colors.textSecondary }
                ]}>
                  {date.toLocaleDateString('ru-RU', { month: 'short' })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Time Selector */}
      {selectedDate && (
        <View style={styles.timeSection}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>ВРЕМЯ</Text>
          <View style={styles.timeSlotsWrap}>
            {timeSlots.map((time) => {
              const isSelected = selectedTime === time;
              return (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.card,
                    },
                  ]}
                  onPress={() => setSelectedTime(time)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.timeChipText,
                    { color: isSelected ? '#FFFFFF' : colors.text }
                  ]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Compact Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={currentStep === 0 ? () => navigation.goBack() : goToPreviousStep}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        {/* Step Indicators */}
        <View style={styles.stepIndicators}>
          {stepTitles.map((title, index) => (
            <View key={index} style={styles.stepIndicatorItem}>
              <View style={[
                styles.stepDot,
                {
                  backgroundColor: index === currentStep ? colors.primary : 
                                 index < currentStep ? colors.success : colors.border,
                }
              ]}>
                {index < currentStep ? (
                  <Icon name="check" size={12} color="#FFFFFF" />
                ) : (
                  <Text style={[
                    styles.stepDotText,
                    { color: index === currentStep ? '#FFFFFF' : colors.textTertiary }
                  ]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text style={[
                styles.stepIndicatorLabel,
                { 
                  color: index === currentStep ? colors.text : colors.textTertiary,
                  fontWeight: index === currentStep ? '600' : '400',
                }
              ]}>
                {title}
              </Text>
            </View>
          ))}
        </View>
        
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="close" size={24} color={colors.text} />
        </TouchableOpacity>
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

      {/* Bottom Fixed Button */}
      <View style={[styles.bottomBar, { 
        backgroundColor: colors.background,
        borderTopColor: colors.border,
      }]}>
        <TouchableOpacity
          style={[
            styles.mainButton, 
            { 
              backgroundColor: canProceed() ? colors.primary : colors.buttonDisabled,
            }
          ]}
          onPress={currentStep === STEPS.DATETIME ? handleSubmit : goToNextStep}
          disabled={!canProceed()}
          activeOpacity={0.8}
        >
          <Text style={styles.mainButtonText}>
            {currentStep === STEPS.DATETIME ? 'Записаться' : 'Продолжить'}
          </Text>
          <Icon name={currentStep === STEPS.DATETIME ? 'check' : 'arrow-forward'} size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Brand Modal */}
      <Modal
        visible={showBrandModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBrandModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeaderBar}>
              <Text style={[styles.modalTitleText, { color: colors.text }]}>Марка автомобиля</Text>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: colors.surface }]}
                onPress={() => setShowBrandModal(false)}
                activeOpacity={0.7}
              >
                <Icon name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.modalSearchBox, { backgroundColor: colors.inputBackground }]}>
              <Icon name="search" size={18} color={colors.textTertiary} />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.text }]}
                placeholder="Поиск..."
                placeholderTextColor={colors.placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            
            {loadingBrands ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.modalLoading} />
            ) : (
              <FlatList
                data={carBrands.filter(brand => 
                  brand.toLowerCase().includes(searchQuery.toLowerCase())
                )}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalListItem}
                    onPress={() => {
                      setCarBrand(item);
                      setCarModel(null);
                      setShowBrandModal(false);
                      setSearchQuery('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modalListItemText, { color: colors.text }]}>{item}</Text>
                    <Icon name="chevron-right" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => (
                  <View style={[styles.modalDivider, { backgroundColor: colors.divider }]} />
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
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeaderBar}>
              <Text style={[styles.modalTitleText, { color: colors.text }]}>Модель автомобиля</Text>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: colors.surface }]}
                onPress={() => setShowModelModal(false)}
                activeOpacity={0.7}
              >
                <Icon name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {loadingModels ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.modalLoading} />
            ) : (
              <FlatList
                data={carModels}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalListItem}
                    onPress={() => {
                      setCarModel(item);
                      setShowModelModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modalListItemText, { color: colors.text }]}>{item}</Text>
                    <Icon name="chevron-right" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => (
                  <View style={[styles.modalDivider, { backgroundColor: colors.divider }]} />
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
  
  // Compact Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Step Indicators
  stepIndicators: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  stepIndicatorItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  stepIndicatorLabel: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // Content
  content: {
    flex: 1,
    marginBottom: 80,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 8,
  },
  stepContainer: {
    flex: 1,
    gap: 24,
  },
  stepQuestion: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  
  // Service Step - Horizontal Cards
  servicesContainer: {
    gap: 16,
  },
  serviceCardHorizontal: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  serviceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  serviceEmoji: {
    fontSize: 36,
  },
  serviceTextContainer: {
    flex: 1,
    gap: 4,
  },
  serviceNameHorizontal: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  serviceDescriptionHorizontal: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  serviceCheckmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Store Step - Vertical List
  loaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  storesContainer: {
    gap: 12,
  },
  storeCardVertical: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storeMainInfo: {
    flex: 1,
    gap: 10,
  },
  storeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeNameContainer: {
    flex: 1,
    gap: 4,
  },
  storeNameVertical: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  statusBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  statusDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusTextSmall: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  storeAddressVertical: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginLeft: 52,
  },
  storeMetaRow: {
    flexDirection: 'row',
    gap: 12,
    marginLeft: 52,
  },
  storeMetaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  storeMetaTextVertical: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  checkmarkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Car Step - Compact Form
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  carTypeSection: {
    gap: 12,
  },
  carTypesScroll: {
    gap: 10,
  },
  carTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
  },
  carTypeChipEmoji: {
    fontSize: 20,
  },
  carTypeChipText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  carDetailsSection: {
    gap: 12,
  },
  inputsContainer: {
    gap: 10,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 12,
  },
  inputBoxText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  inputBoxInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // Date/Time Step
  dateSection: {
    gap: 12,
  },
  datesScrollHorizontal: {
    gap: 10,
  },
  dateChip: {
    width: 60,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    position: 'relative',
  },
  todayDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dateChipWeekday: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  dateChipDay: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  dateChipMonth: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  timeSection: {
    gap: 12,
  },
  timeSlotsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  timeChipText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  mainButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.75,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  modalHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalTitleText: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalLoading: {
    marginTop: 40,
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  modalListItemText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalDivider: {
    height: 0.5,
    marginLeft: 20,
  },
});

export default ServiceBookingFlow;