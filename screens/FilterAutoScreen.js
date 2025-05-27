import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, TextInput } from 'react-native';
import { useStores } from '../useStores';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

const FilterAutoScreen = ({ navigation }) => {
  const { productStore } = useStores();
  const [selectedMarka, setSelectedMarka] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedModification, setSelectedModification] = useState(null);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const tabBarHeight = useBottomTabBarHeight();
  
  const insets = useSafeAreaInsets();
  const statusBarHeight = insets.top;

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
      try {
        await productStore.setCarFilter({
          marka: selectedMarka,
          model: selectedModel,
          year: selectedYear,
          modification: selectedModification
        });
        
        // Явно вызываем загрузку товаров с новыми параметрами
        await productStore.fetchProducts(true);
        
        navigation.navigate('ProductList');
      } catch (error) {
        console.error('Error applying car filter:', error);
      }
    }
  };

  const clearSelection = () => {
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
            onSelect={setSelectedMarka} 
            onClose={closeModal} 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        );
      case 'model':
        return (
          <ModelModal 
            marka={selectedMarka} 
            onSelect={setSelectedModel} 
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
            onSelect={setSelectedYear} 
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

  return (
    <View style={[styles.container, { paddingTop: statusBarHeight, paddingBottom: tabBarHeight }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Подбор по автомобилю</Text>
        <TouchableOpacity 
          onPress={clearSelection} 
          style={styles.clearButton}
          disabled={!selectedMarka}
        >
          <Text style={[styles.clearText, !selectedMarka && styles.disabled]}>Очистить</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <SelectionButton 
          title="Марка"
          placeholder="марку"
          value={selectedMarka} 
          onPress={() => openModal('marka')} 
        />
        <SelectionButton 
          title="Модель"
          placeholder="модель"
          value={selectedModel} 
          onPress={() => openModal('model')} 
          disabled={!selectedMarka}
        />
        <SelectionButton 
          title="Год выпуска" 
          placeholder="год выпуска"
          value={selectedYear} 
          onPress={() => openModal('year')} 
          disabled={!selectedModel}
        />
        <SelectionButton 
          title="Модификация"
          placeholder="модификацию" 
          value={selectedModification} 
          onPress={() => openModal('modification')} 
          disabled={!selectedYear}
        />


      </View>
      <TouchableOpacity 
        style={[
          styles.applyButton, 
          (!selectedMarka || !selectedModel || !selectedYear || !selectedModification) && styles.disabledButton,
          { bottom: tabBarHeight + 40 }
        ]} 
        onPress={applyAutoFilter}
        disabled={!selectedMarka || !selectedModel || !selectedYear || !selectedModification}
      >
        <Text style={styles.applyButtonText}>Подобрать товары</Text>
      </TouchableOpacity>
      

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

const SelectionButton = ({ title, placeholder, value, onPress, disabled = false }) => (
  <TouchableOpacity
    style={[styles.selectionButton, disabled && styles.disabledButton]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={[styles.selectionTitle, disabled && styles.disabledText]}>{title}</Text>
    <Text style={styles.selectionValue} numberOfLines={1}>
      {value || `Выберите ${placeholder.toLowerCase()}`}
    </Text>
    <Ionicons name="chevron-forward" size={20} color={disabled ? '#ccc' : '#006363'} />
  </TouchableOpacity>
);

const MarkaModal = ({ onSelect, onClose, searchQuery, setSearchQuery }) => {
  const { productStore } = useStores();
  const [marks, setMarks] = useState([]);
  const insets = useSafeAreaInsets();
  const statusBarHeight = insets.top;

  useEffect(() => {
    const loadMarks = async () => {
      const data = await productStore.fetchCarMarks();
      setMarks(data);
    };
    loadMarks();
  }, []);

  const filteredMarks = marks.filter(marka => 
    marka.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.modalContainer, { paddingTop: statusBarHeight }]}>
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>Выберите марку</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск марки..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
         // autoFocus
        />
      </View>

      <FlatList
        data={filteredMarks}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.modalItem}
            onPress={() => {
              onSelect(item);
              onClose();
            }}
          >
            <Text style={styles.modalItemText}>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

// Аналогичные компоненты для ModelModal, YearModal и ModificationModal
// (реализация похожа на MarkaModal с соответствующими запросами к productStore)

const ModelModal = ({ marka, onSelect, onClose, searchQuery, setSearchQuery }) => {
  const { productStore } = useStores();
  const [models, setModels] = useState([]);
  const insets = useSafeAreaInsets();
  const statusBarHeight = insets.top;

  useEffect(() => {
    const loadModels = async () => {
      if (marka) {
        const data = await productStore.fetchCarModels(marka);
        setModels(data);
      }
    };
    loadModels();
  }, [marka]);

  const filteredModels = models.filter(model => 
    model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.modalContainer, { paddingTop: statusBarHeight }]}>
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>Выберите модель</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск модели..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
         // autoFocus
        />
      </View>

      <FlatList
        data={filteredModels}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.modalItem}
            onPress={() => {
              onSelect(item);
              onClose();
            }}
          >
            <Text style={styles.modalItemText}>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const YearModal = ({ marka, model, onSelect, onClose }) => {
  const { productStore } = useStores();
  const [years, setYears] = useState([]);
  const insets = useSafeAreaInsets();
  const statusBarHeight = insets.top;

  useEffect(() => {
    const loadYears = async () => {
      if (marka && model) {
        const data = await productStore.fetchCarYears(marka, model);
        setYears(data);
      }
    };
    loadYears();
  }, [marka, model]);

  return (
    <View style={[styles.modalContainer, { paddingTop: statusBarHeight }]}>
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>Выберите год</Text>
      </View>

      <FlatList
        data={years}
        keyExtractor={(item) => item.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.modalItem}
            onPress={() => {
              onSelect(item);
              onClose();
            }}
          >
            <Text style={styles.modalItemText}>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const ModificationModal = ({ marka, model, year, onSelect, onClose, searchQuery, setSearchQuery }) => {
  const { productStore } = useStores();
  const [modifications, setModifications] = useState([]);
  const insets = useSafeAreaInsets();
  const statusBarHeight = insets.top;

  useEffect(() => {
    const loadModifications = async () => {
      if (marka && model && year) {
        const data = await productStore.fetchCarModifications(marka, model, year);
        setModifications(data);
      }
    };
    loadModifications();
  }, [marka, model, year]);

  const filteredModifications = modifications.filter(mod => 
    mod.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.modalContainer, { paddingTop: statusBarHeight }]}>
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>Выберите модификацию</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск модификации..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
          autoFocus
        />
      </View>

      <FlatList
        data={filteredModifications}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.modalItem}
            onPress={() => {
              onSelect(item);
              onClose();
            }}
          >
            <Text style={styles.modalItemText}>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
      },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  clearButton: {
    padding: 8,
  },
  clearText: {
    color: '#006363',
    fontSize: 16,
  },
  disabled: {
    color: '#ccc',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    width: 100,
  },
  selectionValue: {
    flex: 1,
    fontSize: 16,
    color: '#666',
    marginHorizontal: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#ccc',
  },
  applyButton: {
    backgroundColor: '#006363',
    borderRadius: 8,
    paddingVertical: 16,
    marginHorizontal: 16,
    alignItems: 'center',
    position: 'absolute',
    left: 16,
    right: 16,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalCloseButton: {
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 16,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  modalItem: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
  },
});

export default FilterAutoScreen;