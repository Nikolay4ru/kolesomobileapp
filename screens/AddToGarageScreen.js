import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useStores } from '../useStores';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

const AddToGarageScreen = ({ navigation }) => {
  const { productStore, authStore } = useStores();
  const tabBarHeight = useBottomTabBarHeight();
  const [selectedCar, setSelectedCar] = useState(null);
  const [nickname, setNickname] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCarSelector, setShowCarSelector] = useState(false);
  
  // Car selection state
  const [marks, setMarks] = useState([]);
  const [models, setModels] = useState([]);
  const [years, setYears] = useState([]);
  const [modifications, setModifications] = useState([]);
  
  const [marka, setMarka] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [modification, setModification] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('marks'); // 'marks', 'models', 'years', 'modifications'
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMarks();
  }, []);

  useEffect(() => {
    if (marka) {
      loadModels();
    }
  }, [marka]);

  useEffect(() => {
    if (marka && model) {
      loadYears();
    }
  }, [marka, model]);

  useEffect(() => {
    if (marka && model && year) {
      loadModifications();
    }
  }, [marka, model, year]);

  const loadMarks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productStore.fetchCarMarks();
      setMarks(data || []);
    } catch (error) {
      console.error('Error loading marks:', error);
      setError('Не удалось загрузить марки автомобилей');
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async () => {
    if (marka) {
      setLoading(true);
      setError(null);
      try {
        const data = await productStore.fetchCarModels(marka);
        setModels(data || []);
      } catch (error) {
        console.error('Error loading models:', error);
        setError('Не удалось загрузить модели автомобилей');
      } finally {
        setLoading(false);
      }
    }
  };

  const loadYears = async () => {
    if (marka && model) {
      setLoading(true);
      setError(null);
      try {
        const data = await productStore.fetchCarYears(marka, model);
        setYears(data || []);
      } catch (error) {
        console.error('Error loading years:', error);
        setError('Не удалось загрузить годы выпуска');
      } finally {
        setLoading(false);
      }
    }
  };

  const loadModifications = async () => {
    if (marka && model && year) {
      setLoading(true);
      setError(null);
      try {
        const data = await productStore.fetchCarModifications(marka, model, year);
        setModifications(data || []);
      } catch (error) {
        console.error('Error loading modifications:', error);
        setError('Не удалось загрузить модификации');
      } finally {
        setLoading(false);
      }
    }
  };

  const resetSelection = (fromStep) => {
    if (fromStep === 'marks') {
      setMarka('');
      setModel('');
      setYear('');
      setModification('');
      setModels([]);
      setYears([]);
      setModifications([]);
    } else if (fromStep === 'models') {
      setModel('');
      setYear('');
      setModification('');
      setYears([]);
      setModifications([]);
    } else if (fromStep === 'years') {
      setYear('');
      setModification('');
      setModifications([]);
    } else if (fromStep === 'modifications') {
      setModification('');
    }
  };

  const addToGarage = async () => {
    if (!selectedCar) {
      Alert.alert('Ошибка', 'Выберите автомобиль');
      return;
    }

    if (!nickname.trim()) {
      Alert.alert('Ошибка', 'Введите название для автомобиля');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('https://api.koleso.app/api/garage.php', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          car_id: selectedCar.id,
          nickname: nickname.trim(),
          is_primary: isPrimary,
        }),
      });

      const data = await response.json();
      
      if (data.status === 'added') {
        Alert.alert(
          'Успех!',
          data.message || 'Автомобиль успешно добавлен в гараж',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Ошибка', data.error || 'Не удалось добавить автомобиль');
      }
    } catch (error) {
      console.error('Error adding to garage:', error);
      Alert.alert('Ошибка', 'Проблема с подключением к серверу');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkSelect = (selectedMark) => {
    setMarka(selectedMark);
    resetSelection('models');
    setCurrentStep('models');
  };

  const handleModelSelect = (selectedModel) => {
    setModel(selectedModel);
    resetSelection('years');
    setCurrentStep('years');
  };

  const handleYearSelect = (selectedYear) => {
    setYear(selectedYear);
    resetSelection('modifications');
    setCurrentStep('modifications');
  };

  const handleModificationSelect = async (selectedModification) => {
    setModification(selectedModification);
    setLoading(true);
    setError(null);
    
    try {
      // Создаем полный фильтр автомобиля
      const filter = productStore.createCarFilter(
        marka,
        model,
        year,
        selectedModification
      );

      // Получаем параметры автомобиля с полными данными
      const yearData = productStore.getYearFullData(year);
      const carParams = await productStore.fetchCarParams(
        marka,
        model,
        selectedModification,
        yearData
      );

      if (carParams && carParams.carid) {
        setSelectedCar({
          id: carParams.carid,
          brand: marka,
          model: model,
          year: year,
          modification: selectedModification,
          yearData: yearData,
          ...carParams // Включаем все параметры автомобиля
        });
        
        setShowCarSelector(false);
        
        // Автоматически заполняем название
        if (!nickname.trim()) {
          setNickname(`${marka} ${model} ${year}`);
        }
      } else {
        setError('Не удалось получить информацию об автомобиле');
      }
    } catch (error) {
      console.error('Error fetching car params:', error);
      setError('Проблема с получением данных автомобиля');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setError(null);
    if (currentStep === 'models') {
      setCurrentStep('marks');
    } else if (currentStep === 'years') {
      setCurrentStep('models');
    } else if (currentStep === 'modifications') {
      setCurrentStep('years');
    }
  };

  const getCurrentStepTitle = () => {
    switch (currentStep) {
      case 'marks': return 'Выберите марку';
      case 'models': return 'Выберите модель';
      case 'years': return 'Выберите год';
      case 'modifications': return 'Выберите модификацию';
      default: return 'Выбор автомобиля';
    }
  };

  const getCurrentData = () => {
    switch (currentStep) {
      case 'marks': return marks;
      case 'models': return models;
      case 'years': return years;
      case 'modifications': return modifications;
      default: return [];
    }
  };

  const handleItemSelect = (item) => {
    const itemValue = item.name || item.title || item;
    
    switch (currentStep) {
      case 'marks':
        handleMarkSelect(itemValue);
        break;
      case 'models':
        handleModelSelect(itemValue);
        break;
      case 'years':
        handleYearSelect(itemValue);
        break;
      case 'modifications':
        handleModificationSelect(itemValue);
        break;
    }
  };

  const renderStepItem = ({ item }) => {
    const displayText = item.name || item.title || item.toString();
    
    return (
      <TouchableOpacity
        style={styles.modalItem}
        onPress={() => handleItemSelect(item)}
        activeOpacity={0.7}
      >
        <Text style={styles.modalItemText} numberOfLines={2}>
          {displayText}
        </Text>
        <Icon name="chevron-right" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="directions-car-filled" size={48} color="#D1D5DB" />
      <Text style={styles.emptyStateText}>
        {getCurrentData().length === 0 ? 'Данные не найдены' : 'Список пуст'}
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Icon name="error-outline" size={48} color="#EF4444" />
      <Text style={styles.errorStateText}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => {
          switch (currentStep) {
            case 'marks': loadMarks(); break;
            case 'models': loadModels(); break;
            case 'years': loadYears(); break;
            case 'modifications': loadModifications(); break;
          }
        }}
      >
        <Text style={styles.retryButtonText}>Повторить</Text>
      </TouchableOpacity>
    </View>
  );

  const formatSelectedCarDisplay = () => {
    if (!selectedCar) return null;
    
    return (
      <View>
        <Text style={styles.selectedText}>
          {selectedCar.brand} {selectedCar.model}
        </Text>
        <Text style={styles.selectedSubtext}>
          {selectedCar.year} • {selectedCar.modification}
        </Text>
        {selectedCar.yearData && (
          <Text style={styles.selectedDetailText}>
            {selectedCar.yearData.kuzov} ({selectedCar.yearData.beginyear} - {selectedCar.yearData.endyear})
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Добавить автомобиль</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Car Selection Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="directions-car" size={24} color="#3B82F6" />
            <Text style={styles.cardTitle}>Автомобиль</Text>
          </View>
          
          <TouchableOpacity
            style={[
              styles.selector,
              selectedCar && styles.selectorSelected
            ]}
            onPress={() => {
              setShowCarSelector(true);
              setCurrentStep('marks');
              setError(null);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.selectorContent}>
              {selectedCar ? (
                formatSelectedCarDisplay()
              ) : (
                <Text style={styles.placeholderText}>Выберите автомобиль</Text>
              )}
            </View>
            <View style={styles.selectorIcon}>
              <Icon name="expand-more" size={24} color="#6B7280" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Nickname Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="edit" size={24} color="#3B82F6" />
            <Text style={styles.cardTitle}>Название</Text>
          </View>
          
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="Например: Моя ежедневная машина"
            placeholderTextColor="#9CA3AF"
            maxLength={50}
          />
          <Text style={styles.inputHint}>
            {nickname.length}/50 символов
          </Text>
        </View>

        {/* Primary Car Card */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.switchRow}
            onPress={() => setIsPrimary(!isPrimary)}
            activeOpacity={0.7}
          >
            <View style={styles.switchContent}>
              <View style={styles.switchHeader}>
                <Icon name="star" size={24} color="#F59E0B" />
                <Text style={styles.switchTitle}>Основной автомобиль</Text>
              </View>
              <Text style={styles.switchDescription}>
                Этот автомобиль будет показываться первым в списке
              </Text>
            </View>
            <View style={[styles.switch, isPrimary && styles.switchActive]}>
              <View style={[styles.switchThumb, isPrimary && styles.switchThumbActive]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Car Details Card (if selected) */}
        {selectedCar && selectedCar.yearData && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="info" size={24} color="#10B981" />
              <Text style={styles.cardTitle}>Параметры автомобиля</Text>
            </View>
            
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Кузов</Text>
                <Text style={styles.detailValue}>{selectedCar.yearData.kuzov}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Годы выпуска</Text>
                <Text style={styles.detailValue}>
                  {selectedCar.yearData.beginyear} - {selectedCar.yearData.endyear}
                </Text>
              </View>
              {selectedCar.carid && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>ID автомобиля</Text>
                  <Text style={styles.detailValue}>{selectedCar.carid}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Button */}
      <View style={[styles.bottomContainer, { paddingBottom: tabBarHeight + 20 }]}>
        <TouchableOpacity
          style={[
            styles.addButton,
            (!selectedCar || !nickname.trim()) && styles.addButtonDisabled
          ]}
          onPress={addToGarage}
          disabled={isLoading || !selectedCar || !nickname.trim()}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Icon name="add" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.addButtonText}>Добавить в гараж</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Car Selection Modal */}
      <Modal
        visible={showCarSelector}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            {currentStep !== 'marks' ? (
              <TouchableOpacity
                style={styles.modalHeaderButton}
                onPress={goBack}
              >
                <Icon name="arrow-back" size={24} color="#3B82F6" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.modalHeaderButton}
                onPress={() => setShowCarSelector(false)}
              >
                <Text style={styles.modalCancelText}>Отмена</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.modalTitle}>{getCurrentStepTitle()}</Text>
            <View style={styles.modalSpacer} />
          </View>

          {/* Breadcrumb */}
          {(marka || model || year) && (
            <View style={styles.breadcrumb}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.breadcrumbContent}>
                  {marka && (
                    <View style={styles.breadcrumbItem}>
                      <Text style={styles.breadcrumbText}>{marka}</Text>
                    </View>
                  )}
                  {model && (
                    <>
                      <Icon name="chevron-right" size={16} color="#9CA3AF" style={styles.breadcrumbArrow} />
                      <View style={styles.breadcrumbItem}>
                        <Text style={styles.breadcrumbText}>{model}</Text>
                      </View>
                    </>
                  )}
                  {year && (
                    <>
                      <Icon name="chevron-right" size={16} color="#9CA3AF" style={styles.breadcrumbArrow} />
                      <View style={styles.breadcrumbItem}>
                        <Text style={styles.breadcrumbText}>{year}</Text>
                      </View>
                    </>
                  )}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Content */}
          {loading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.modalLoadingText}>Загрузка...</Text>
            </View>
          ) : error ? (
            renderErrorState()
          ) : (
            <FlatList
              data={getCurrentData()}
              renderItem={renderStepItem}
              keyExtractor={(item, index) => (item.id || item.name || item.title || item || index).toString()}
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalListContent}
              ListEmptyComponent={renderEmptyState}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 40,
  },
  
  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  
  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  
  // Selector
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectorSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  selectorContent: {
    flex: 1,
  },
  selectorIcon: {
    marginLeft: 12,
  },
  selectedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  selectedSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  selectedDetailText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  placeholderText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  
  // Input
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
  },
  
  // Details Grid
  detailsGrid: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  
  // Switch
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchContent: {
    flex: 1,
    marginRight: 16,
  },
  switchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  switchDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  switch: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: '#3B82F6',
  },
  switchThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },
  
  // Bottom Button
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonIcon: {
    marginRight: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalSpacer: {
    width: 40,
  },
  
  // Breadcrumb
  breadcrumb: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  breadcrumbContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbItem: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  breadcrumbText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  breadcrumbArrow: {
    marginHorizontal: 8,
  },
  
  // Modal List
  modalList: {
    flex: 1,
  },
  modalListContent: {
    paddingVertical: 8,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 4,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modalItemText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  },
  
  // Modal Loading
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLoadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  
  // Error State
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  errorStateText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default AddToGarageScreen;