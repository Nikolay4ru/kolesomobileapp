import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Modal, Portal, Text, Button, Searchbar } from 'react-native-paper';

const BrandSelector = ({ brands, selectedBrand, onSelect, loading }) => {
  const [visible, setVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const showModal = () => setVisible(true);
  const hideModal = () => setVisible(false);
  const handleSelect = (brand) => {
    onSelect(brand);
    hideModal();
  };

  const filteredBrands = brands.filter(brand =>
    brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Марка автомобиля</Text>
      <TouchableOpacity onPress={showModal} style={styles.input}>
        <Text style={selectedBrand ? styles.selectedText : styles.placeholderText}>
          {selectedBrand || 'Выберите марку'}
        </Text>
      </TouchableOpacity>

      <Portal>
        <Modal 
          visible={visible} 
          onDismiss={hideModal}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Searchbar
              placeholder="Поиск марки"
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
            />
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text>Загрузка...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredBrands}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.listItem} 
                    onPress={() => handleSelect(item)}
                  >
                    <Text style={styles.itemText}>{item}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text>Марки не найдены</Text>
                  </View>
                }
              />
            )}
            <Button 
              mode="outlined" 
              onPress={hideModal}
              style={styles.closeButton}
            >
              Закрыть
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: 'rgba(0, 0, 0, 0.6)',
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
    borderRadius: 4,
    justifyContent: 'center',
  },
  selectedText: {
    fontSize: 16,
  },
  placeholderText: {
    fontSize: 16,
    color: 'rgba(0, 0, 0, 0.38)',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 0,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalContent: {
    padding: 0,
  },
  searchBar: {
    margin: 16,
    marginBottom: 8,
  },
  listItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  itemText: {
    fontSize: 16,
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  closeButton: {
    margin: 16,
    marginTop: 8,
  },
});

export default BrandSelector;