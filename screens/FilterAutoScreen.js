import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  TextInput,
  Animated,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
  Alert
} from 'react-native';
import { useStores } from '../useStores';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';

const { width, height } = Dimensions.get('window');

const FilterAutoScreen = ({ navigation }) => {
  const { productStore } = useStores();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  
  const [selectedMarka, setSelectedMarka] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedModification, setSelectedModification] = useState(null);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [applying, setApplying] = useState(false);
  const tabBarHeight = useBottomTabBarHeight();
  
  const insets = useSafeAreaInsets();
  const statusBarHeight = insets.top;

  // Анимации
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Установка цвета StatusBar
  useEffect(() => {
    StatusBar.setBarStyle('light-content', true);
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(theme === 'dark' ? '#004040' : '#006363', true);
    }
  }, [theme]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
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
      })
    ]).start();
  }, []);

  // Анимация прогресса при выборе
  useEffect(() => {
    const progress = selectedMarka ? 0.25 : 0;
    const progress2 = selectedModel ? 0.5 : progress;
    const progress3 = selectedYear ? 0.75 : progress2;
    const progress4 = selectedModification ? 1 : progress3;

    Animated.timing(progressAnim, {
      toValue: progress4,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [selectedMarka, selectedModel, selectedYear, selectedModification]);

  // Сброс зависимых выборов при изменении родительских
  useEffect(() => {
    if (selectedMarka && selectedModel) {
      setSelectedYear(null);
      setSelectedModification(null);
    }
  }, [selectedMarka, selectedModel]);

  useEffect(() => {
    if (selectedYear) {
      setSelectedModification(null);
    }
  }, [selectedYear]);

  const openModal = (content) => {
    setModalContent(content);
    setModalVisible(true);
    setSearchQuery('');
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const applyAutoFilter = async () => {
    if (selectedMarka && selectedModel && selectedYear && selectedModification) {
      setApplying(true);
      try {
        const filter = productStore.createCarFilter(
          selectedMarka,
          selectedModel,
          selectedYear,
          selectedModification
        );
        
        await productStore.setCarFilter(filter);
        navigation.navigate('ProductList');
      } catch (error) {
        console.error('Error applying car filter:', error);
        Alert.alert(
          'Ошибка',
          'Не удалось применить фильтр. Попробуйте еще раз.',
          [{ text: 'OK' }]
        );
      } finally {
        setApplying(false);
      }
    }
  };

  const clearSelection = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();

    setSelectedMarka(null);
    setSelectedModel(null);
    setSelectedYear(null);
    setSelectedModification(null);
    productStore.clearCarFilter();
  };

  const renderModalContent = () => {
    switch (modalContent) {
      case 'marka':
        return (
          <MarkaModal 
            onSelect={(marka) => {
              setSelectedMarka(marka);
              setSelectedModel(null);
              setSelectedYear(null);
              setSelectedModification(null);
            }}
            onClose={closeModal} 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        );
      case 'model':
        return (
          <ModelModal 
            marka={selectedMarka} 
            onSelect={(model) => {
              setSelectedModel(model);
              setSelectedYear(null);
              setSelectedModification(null);
            }}
            onClose={closeModal}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        );
      case 'year':
        return (
          <YearModal 
            marka={selectedMarka} 
            model={selectedModel} 
            onSelect={(year) => {
              setSelectedYear(year);
              setSelectedModification(null);
            }}
            onClose={closeModal}
          />
        );
      case 'modification':
        return (
          <ModificationModal 
            marka={selectedMarka} 
            model={selectedModel} 
            year={selectedYear} 
            onSelect={setSelectedModification}
            onClose={closeModal}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        );
      default:
        return null;
    }
  };

  const getStepProgress = () => {
    if (selectedModification) return 4;
    if (selectedYear) return 3;
    if (selectedModel) return 2;
    if (selectedMarka) return 1;
    return 0;
  };

  const gradientColors = theme === 'dark' 
    ? ['#004040', '#003030']
    : ['#006363', '#004545'];

  return (
    <View style={styles.container}>
      {!!insets.top && (
        <View style={[styles.statusBarBackground, { height: insets.top }]} />
      )}
      <StatusBar
        translucent={false}
        backgroundColor={theme === 'dark' ? '#004040' : '#006363'}
        barStyle="light-content"
      />
      
      <LinearGradient
        colors={gradientColors}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <View style={styles.closeButtonInner}>
              <Ionicons name="close" size={24} color="#FFF" />
            </View>
          </TouchableOpacity>
          
          <Text style={styles.title}>Подбор по автомобилю</Text>
          
          <TouchableOpacity 
            onPress={clearSelection} 
            style={[styles.clearButton, !selectedMarka && styles.clearButtonDisabled]}
            disabled={!selectedMarka}
          >
            <Text style={[styles.clearText, !selectedMarka && styles.disabled]}>
              Сбросить
            </Text>
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
                    outputRange: ['0%', '100%']
                  })
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {getStepProgress()} из 4 шагов
          </Text>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }}>
          {/* Welcome Card */}
          <View style={styles.welcomeCard}>
            <MaterialCommunityIcons name="car-sports" size={48} color={colors.primary} />
            <Text style={styles.welcomeTitle}>Найдите идеальные товары</Text>
            <Text style={styles.welcomeSubtitle}>
              Выберите параметры вашего автомобиля для точного подбора
            </Text>
          </View>

          {/* Selection Cards */}
          <SelectionCard
            step="1"
            title="Марка"
            placeholder="Выберите марку автомобиля"
            value={selectedMarka}
            onPress={() => openModal('marka')}
            enabled={true}
            icon="car"
          />

          <SelectionCard
            step="2"
            title="Модель"
            placeholder="Выберите модель"
            value={selectedModel}
            onPress={() => openModal('model')}
            enabled={!!selectedMarka}
            icon="car-side"
          />

          <SelectionCard
            step="3"
            title="Год выпуска"
            placeholder="Выберите год"
            value={selectedYear}
            onPress={() => openModal('year')}
            enabled={!!selectedModel}
            icon="calendar"
          />

          <SelectionCard
            step="4"
            title="Модификация"
            placeholder="Выберите модификацию"
            value={selectedModification}
            onPress={() => openModal('modification')}
            enabled={!!selectedYear}
            icon="cog"
          />

          {/* Error Display */}
          {productStore.error && (
            <View style={styles.errorCard}>
              <MaterialCommunityIcons name="alert-circle" size={24} color={colors.error} />
              <Text style={styles.errorText}>{productStore.error}</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottomContainer, { paddingBottom: tabBarHeight + 20 }]}>
        <TouchableOpacity 
          style={[
            styles.applyButton, 
            (!selectedMarka || !selectedModel || !selectedYear || !selectedModification || applying) && styles.disabledButton
          ]} 
          onPress={applyAutoFilter}
          disabled={!selectedMarka || !selectedModel || !selectedYear || !selectedModification || applying}
        >
          {applying ? (
            <View style={styles.applyButtonContent}>
              <ActivityIndicator size="small" color="#FFF" style={styles.applyButtonLoader} />
              <Text style={styles.applyButtonText}>Применяем...</Text>
            </View>
          ) : (
            <Text style={styles.applyButtonText}>Подобрать товары</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        {renderModalContent()}
      </Modal>
    </View>
  );
};

// Selection Card Component
const SelectionCard = ({ step, title, placeholder, value, onPress, enabled, icon }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.selectionCard, !enabled && styles.disabledCard]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!enabled}
        activeOpacity={0.9}
      >
        <View style={styles.selectionCardContent}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepText}>{step}</Text>
          </View>
          
          <View style={styles.selectionInfo}>
            <Text style={[styles.selectionTitle, !enabled && styles.disabledText]}>
              {title}
            </Text>
            <Text style={[
              styles.selectionValue,
              !value && styles.placeholderText,
              !enabled && styles.disabledText
            ]}>
              {value || placeholder}
            </Text>
          </View>
          
          <View style={[styles.iconContainer, value && styles.iconContainerActive]}>
            <MaterialCommunityIcons 
              name={value ? "check-circle" : icon} 
              size={24} 
              color={value ? colors.primary : (enabled ? colors.textSecondary : colors.textTertiary)} 
            />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Modal Components
const MarkaModal = ({ onSelect, onClose, searchQuery, setSearchQuery }) => {
  const { productStore } = useStores();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadMarks = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await productStore.fetchCarMarks();
        setMarks(data || []);
      } catch (error) {
        console.error('Error loading marks:', error);
        setError('Ошибка загрузки марок');
      } finally {
        setLoading(false);
      }
    };
    loadMarks();
  }, []);

  const filteredMarks = marks.filter(marka => 
    marka.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ModalHeader title="Выберите марку" onClose={onClose} />
      
      <SearchBar 
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Поиск марки..."
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadMarks()} />
      ) : (
        <FlatList
          data={filteredMarks}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <ModalItem
              text={item}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            />
          )}
          contentContainerStyle={styles.modalList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState message="Марки не найдены" />}
        />
      )}
    </View>
  );
};

const ModelModal = ({ marka, onSelect, onClose, searchQuery, setSearchQuery }) => {
  const { productStore } = useStores();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadModels = async () => {
      if (marka) {
        try {
          setLoading(true);
          setError(null);
          const data = await productStore.fetchCarModels(marka);
          setModels(data || []);
        } catch (error) {
          console.error('Error loading models:', error);
          setError('Ошибка загрузки моделей');
        } finally {
          setLoading(false);
        }
      }
    };
    loadModels();
  }, [marka]);

  const filteredModels = models.filter(model => 
    model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ModalHeader title={`Модели ${marka}`} onClose={onClose} />
      
      <SearchBar 
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Поиск модели..."
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadModels()} />
      ) : (
        <FlatList
          data={filteredModels}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <ModalItem
              text={item}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            />
          )}
          contentContainerStyle={styles.modalList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState message="Модели не найдены" />}
        />
      )}
    </View>
  );
};

const YearModal = ({ marka, model, onSelect, onClose }) => {
  const { productStore } = useStores();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadYears = async () => {
      if (marka && model) {
        try {
          setLoading(true);
          setError(null);
          const data = await productStore.fetchCarYears(marka, model);
          setYears(data || []);
        } catch (error) {
          console.error('Error loading years:', error);
          setError('Ошибка загрузки годов');
        } finally {
          setLoading(false);
        }
      }
    };
    loadYears();
  }, [marka, model]);

  return (
    <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ModalHeader title="Выберите год" onClose={onClose} />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadYears()} />
      ) : (
        <FlatList
          data={years}
          keyExtractor={(item) => item.toString()}
          numColumns={1}
          renderItem={({ item }) => (
            <ModalItem
              text={item}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            />
          )}
          contentContainerStyle={styles.modalList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState message="Годы не найдены" />}
        />
      )}
    </View>
  );
};

const ModificationModal = ({ marka, model, year, onSelect, onClose, searchQuery, setSearchQuery }) => {
  const { productStore } = useStores();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const [modifications, setModifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadModifications = async () => {
      if (marka && model && year) {
        try {
          setLoading(true);
          setError(null);
          const data = await productStore.fetchCarModifications(marka, model, year);
          setModifications(data || []);
        } catch (error) {
          console.error('Error loading modifications:', error);
          setError('Ошибка загрузки модификаций');
        } finally {
          setLoading(false);
        }
      }
    };
    loadModifications();
  }, [marka, model, year]);

  const filteredModifications = modifications.filter(mod => 
    mod.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ModalHeader title="Выберите модификацию" onClose={onClose} />
      
      <SearchBar 
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Поиск модификации..."
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadModifications()} />
      ) : (
        <FlatList
          data={filteredModifications}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <ModalItem
              text={item}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
              multiline
            />
          )}
          contentContainerStyle={styles.modalList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState message="Модификации не найдены" />}
        />
      )}
    </View>
  );
};

// Helper Components
const ModalHeader = ({ title, onClose }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);
  
  return (
    <View style={styles.modalHeader}>
      <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.modalTitle}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
};

const SearchBar = ({ value, onChangeText, placeholder }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);
  
  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputWrapper}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={colors.textSecondary}
          autoCorrect={false}
          returnKeyType="search"
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearSearchButton}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const ModalItem = ({ text, onPress, multiline = false }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);
  
  return (
    <TouchableOpacity 
      style={styles.modalItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.modalItemText, multiline && styles.modalItemTextMultiline]} numberOfLines={multiline ? 3 : 1}>
        {text}
      </Text>
      <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
    </TouchableOpacity>
  );
};

const LoadingState = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);
  
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Загрузка...</Text>
    </View>
  );
};

const ErrorState = ({ message, onRetry }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);
  
  return (
    <View style={styles.errorContainer}>
      <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.error} />
      <Text style={styles.errorText}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Повторить</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const EmptyState = ({ message }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);
  
  return (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="car-off" size={48} color={colors.textSecondary} />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
};

const themedStyles = (colors, theme) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statusBarBackground: {
    backgroundColor: theme === 'dark' ? '#004040' : '#006363',
  },
  headerGradient: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  clearButtonDisabled: {
    opacity: 0.5,
  },
  disabled: {
    opacity: 0.5,
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingBottom: 20,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  welcomeCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme === 'dark' ? 0.3 : 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginTop: 10,
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  selectionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabledCard: {
    opacity: 0.6,
    backgroundColor: theme === 'dark' ? colors.surface : '#FAFAFA',
  },
  selectionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme === 'dark' ? 'rgba(78, 165, 142, 0.2)' : '#E6F4F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  selectionInfo: {
    flex: 1,
  },
  selectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  selectionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  placeholderText: {
    color: colors.textSecondary,
    fontWeight: '400',
  },
  disabledText: {
    color: colors.textTertiary,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  iconContainerActive: {
    backgroundColor: theme === 'dark' ? 'rgba(78, 165, 142, 0.2)' : '#E6F4F4',
  },
  errorCard: {
    backgroundColor: theme === 'dark' ? 'rgba(255, 107, 107, 0.1)' : '#FFF2F2',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme === 'dark' ? 'rgba(255, 107, 107, 0.3)' : '#FFE6E6',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: colors.error,
    marginLeft: 12,
    lineHeight: 20,
  },
  bottomContainer: {
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: theme === 'dark' ? 0.3 : 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  applyButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  applyButtonLoader: {
    marginRight: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginRight: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: colors.text,
  },
  clearSearchButton: {
    padding: 4,
  },
  modalList: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme === 'dark' ? 0.15 : 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  modalItemText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    marginRight: 12,
  },
  modalItemTextMultiline: {
    lineHeight: 22,
  },
  yearGrid: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  yearItem: {
    flex: 1,
    backgroundColor: colors.card,
    margin: 4,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme === 'dark' ? 0.15 : 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  yearText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Selected items styles
  selectedContainer: {
    backgroundColor: theme === 'dark' ? 'rgba(78, 165, 142, 0.2)' : '#E6F4F4',
    borderColor: colors.primary,
    borderWidth: 2,
  },
  selectedItemText: {
    color: colors.primary,
    fontWeight: '600',
  },
  selectedYearItem: {
    backgroundColor: theme === 'dark' ? 'rgba(78, 165, 142, 0.2)' : '#E6F4F4',
    borderColor: colors.primary,
    borderWidth: 2,
  },
  selectedYearText: {
    color: colors.primary,
    fontWeight: '700',
  },
  
  // Check icon styles
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Separator styles
  sectionSeparator: {
    height: 12,
    backgroundColor: 'transparent',
  },
  
  // Special case for transmission type
  transmissionIcon: {
    width: 20,
    height: 20,
  },
  
  // Additional spacing styles
  firstModalItem: {
    marginTop: 8,
  },
  lastModalItem: {
    marginBottom: 20,
  },
  
  // Animation styles for smooth transitions
  fadeIn: {
    opacity: 1,
  },
  fadeOut: {
    opacity: 0.5,
  },
  
  // Safe area styles
  safeAreaTop: {
    backgroundColor: theme === 'dark' ? '#004040' : '#006363',
  },
  safeAreaBottom: {
    backgroundColor: colors.card,
  },
});

export default FilterAutoScreen;