
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Dimensions,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform
} from "react-native";

import CustomHeader from "../components/CustomHeader";

const { width, height } = Dimensions.get('window');

const CarSelectionScreen = ({ route, navigation }) => {
  const { service, store, carType } = route.params;
  const [loading, setLoading] = useState(true);
  const [carBrands, setCarBrands] = useState([]);
  const [carModels, setCarModels] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [licensePlate, setLicensePlate] = useState('');
  const [searchBrand, setSearchBrand] = useState('');
  const [searchModel, setSearchModel] = useState('');
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);

  const [licensePlateError, setLicensePlateError] = useState('');

const validateLicensePlate = (text) => {
  // Разрешенные буквы (кириллица) в обоих регистрах
  const allowedLetters = 'АВЕКМНОРСТУХавекмнорстухABEKMHOPCTYXabekmhopctyx';
  const allowedChars = allowedLetters + '0123456789';
  
  // Фильтруем введенные символы
  let filteredText = '';
  for (let i = 0; i < text.length; i++) {
    if (allowedChars.includes(text[i])) {
      filteredText += text[i];
    }
  }
  
  // Проверяем на валидность после ввода
  if (filteredText.length > 0) {
    const isValid = /^[АВЕКМНОРСТУХавекмнорстухABEKMHOPCTYXabekmhopctyx0-9]+$/.test(filteredText);
    setLicensePlateError(isValid ? '' : 'Только буквы АВЕКМНОРСТУХ и цифры');
  } else {
    setLicensePlateError('');
  }
  
  // Автоматически переводим разрешенные латинские буквы в кириллицу
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
  
  return convertedText.toUpperCase(); // Все буквы в верхний регистр
};

  // Загрузка марок автомобилей
  useEffect(() => {
    const fetchCarBrands = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://api.koleso.app/api/car-brands.php');
        const data = await response.json();
        setCarBrands(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching car brands:', error);
        setLoading(false);
      }
    };

    fetchCarBrands();
  }, []);

  // Загрузка моделей при выборе марки
  const fetchCarModels = async (brand) => {
    setLoading(true);
    setSelectedBrand(brand);
    setShowBrandModal(false);
    try {
      const response = await fetch(`https://api.koleso.app/api/car-models.php?brand=${brand}`);
      const data = await response.json();
      setCarModels(data);
      setLoading(false);
      setShowModelModal(true);
    } catch (error) {
      console.error('Error fetching car models:', error);
      setLoading(false);
    }
  };

  const filteredBrands = carBrands.filter(brand => 
    brand.toLowerCase().includes(searchBrand.toLowerCase())
  );

  const filteredModels = carModels.filter(model => 
    model.toLowerCase().includes(searchModel.toLowerCase())
  );

  const handleContinue = () => {
    if (!selectedBrand || !selectedModel || !licensePlate) {
      alert("Пожалуйста, заполните все данные об автомобиле");
      return;
    }
    
    navigation.navigate('DateTimeSelection', {
      service,
      store,

      carBrand: selectedBrand,
      carModel: selectedModel,
      licensePlate,
      carType
    });
  };

  const renderBrandItem = ({ item }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => fetchCarModels(item)}
    >
      <Text style={styles.listItemText}>{item}</Text>
      <MaterialIcons name="chevron-right" size={24} color="#8A94A6" />
    </TouchableOpacity>
  );

  const renderModelItem = ({ item }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => {
        setSelectedModel(item);
        setShowModelModal(false);
      }}
    >
      <Text style={styles.listItemText}>{item}</Text>
      {selectedModel === item && (
        <Ionicons name="checkmark" size={24} color="#4E60FF" />
      )}
    </TouchableOpacity>
  );

  return (
    <>
    <CustomHeader 
        title="Данные автомобиля"
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
     
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >


      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.serviceCard}>
          <Text style={styles.serviceTitle}>Услуга:</Text>
          <Text style={styles.serviceName}>{service.name}</Text>
        </View>

        <View style={styles.storeCard}>
          <Text style={styles.storeTitle}>Магазин:</Text>
          <Text style={styles.storeName}>{store.name}</Text>
          <Text style={styles.storeAddress}>{store.address}</Text>
        </View>

        {/* Поле выбора марки */}
        <Text style={styles.sectionTitle}>Марка автомобиля</Text>
        <TouchableOpacity
          style={styles.selectInput}
          onPress={() => setShowBrandModal(true)}
        >
          <Text style={selectedBrand ? styles.selectInputText : styles.selectInputPlaceholder}>
            {selectedBrand || 'Выберите марку'}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={24} color="#8A94A6" />
        </TouchableOpacity>

        {/* Поле выбора модели */}
        {selectedBrand && (
          <>
            <Text style={styles.sectionTitle}>Модель {selectedBrand}</Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setShowModelModal(true)}
              disabled={!selectedBrand}
            >
              <Text style={selectedModel ? styles.selectInputText : styles.selectInputPlaceholder}>
                {selectedModel || 'Выберите модель'}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#8A94A6" />
            </TouchableOpacity>
          </>
        )}

       {/* Поле гос. номера с валидацией */}
<Text style={styles.sectionTitle}>Гос. номер</Text>
<View style={styles.plateContainer}>
  <View style={[styles.plateDesign, licensePlateError && styles.inputError]}>
    <TextInput
      style={styles.plateInput}
      placeholder="A123AA777"
      value={licensePlate}
      onChangeText={(text) => {
        const validatedText = validateLicensePlate(text);
        setLicensePlate(validatedText);
      }}
      autoCapitalize="characters"
      placeholderTextColor="#B5B9C2"
      maxLength={9}
    />
    <MaterialIcons 
    name="directions-car" 
    size={24} 
    color="#006363" 
    style={styles.carIcon} 
  />
  </View>
  
</View>
{licensePlateError && (
  <Text style={styles.errorText}>{licensePlateError}</Text>
)}
      </ScrollView>

      {/* Кнопка продолжения */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!selectedBrand || !selectedModel || !licensePlate) && styles.disabledButton
          ]}
          onPress={handleContinue}
          disabled={!selectedBrand || !selectedModel || !licensePlate}
        >
          <Text style={styles.continueButtonText}>Продолжить</Text>
          <MaterialIcons name="arrow-forward" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Модальное окно выбора марки */}
      <Modal
        visible={showBrandModal}
        animationType="slide"
        transparent={false}
      >
        <View style={styles.modalContainer}>
          <CustomHeader 
            title="Выберите марку"
            navigation={navigation}
            leftAction={() => setShowBrandModal(false)}
            
            onBackPress={() => setShowBrandModal(false)}
          />
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Поиск марки..."
              value={searchBrand}
              onChangeText={setSearchBrand}
              placeholderTextColor="#8A94A6"
              autoFocus
            />
            <Ionicons name="search" size={24} color="#8A94A6" style={styles.searchIcon} />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#4E60FF" style={styles.loader} />
          ) : (
            <FlatList
              data={filteredBrands}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderBrandItem}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Марки не найдены</Text>
              }
            />
          )}
        </View>
      </Modal>

      {/* Модальное окно выбора модели */}
      <Modal
        visible={showModelModal}
        animationType="slide"
        transparent={false}
      >
        <View style={styles.modalContainer}>
          <CustomHeader 
            title={`Модели ${selectedBrand}`}
            navigation={navigation}
            leftAction={() => setShowModelModal(false)}
            onBackPress={() => setShowModelModal(false)}
          />
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Поиск модели..."
              value={searchModel}
              onChangeText={setSearchModel}
              placeholderTextColor="#8A94A6"
              autoFocus
            />
            <Ionicons name="search" size={24} color="#8A94A6" style={styles.searchIcon} />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#4E60FF" style={styles.loader} />
          ) : (
            <FlatList
              data={filteredModels}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderModelItem}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Модели не найдены</Text>
              }
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
    </>
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
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 10,
    marginBottom: 16,
    shadowColor: '#4E60FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  serviceTitle: {
    fontSize: 14,
    color: '#8A94A6',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2B2F3A',
  },
  storeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#4E60FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  storeTitle: {
    fontSize: 14,
    color: '#8A94A6',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B2F3A',
    marginBottom: 4,
  },
  storeAddress: {
    fontSize: 14,
    color: '#8A94A6',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B2F3A',
    marginBottom: 8,
    marginTop: 16,
  },
  selectInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EDEEF2',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectInputText: {
    fontSize: 16,
    color: '#2B2F3A',
  },
  selectInputPlaceholder: {
    fontSize: 16,
    color: '#8A94A6',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDEEF2',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#2B2F3A',
  },
  inputIcon: {
    marginRight: 16,
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
  continueButton: {
    backgroundColor: '#006363',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#006363',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  searchContainer: {
    position: 'relative',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    paddingLeft: 48,
    borderWidth: 1,
    borderColor: '#EDEEF2',
    fontSize: 16,
    color: '#2B2F3A',
  },
  searchIcon: {
    position: 'absolute',
    left: 32,
    top: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  listItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EDEEF2',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemText: {
    fontSize: 16,
    color: '#2B2F3A',
  },
  emptyText: {
    textAlign: 'center',
    color: '#8A94A6',
    marginTop: 20,
  },
  loader: {
    marginTop: 40,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#545A66',
    marginBottom: 8,
    fontFamily: 'Roboto-Regular',
  },
  plateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plateDesign: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E1E4EB',
    height: 48,
    paddingLeft: 16,
    paddingRight: 12,
    flex: 1,
    shadowColor: '#4E60FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  plateInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2633',
    letterSpacing: 0.5,
    paddingRight: 8,
    height: '100%',
    fontFamily: 'Roboto-Medium',
  },
  russianFlag: {
    width: 20,
    marginLeft: 8,
  },
  flagStrip: {
    height: 4,
    width: '100%',
    marginBottom: 0,
  },
  carIcon: {
    marginLeft: 12,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default CarSelectionScreen;