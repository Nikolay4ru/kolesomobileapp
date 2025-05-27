import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Modal, Portal, Text, Button, Searchbar } from 'react-native-paper';

const ModificationSelector = ({ 
  modifications, 
  selectedModification, 
  onSelect, 
  disabled, 
  loading 
}) => {
  const [visible, setVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const showModal = () => !disabled && setVisible(true);
  const hideModal = () => setVisible(false);
  const handleSelect = (mod) => {
    onSelect(mod);
    hideModal();
  };

  const filteredModifications = modifications.filter(mod =>
    mod.modification.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mod.beginyear.toString().includes(searchQuery) ||
    mod.endyear.toString().includes(searchQuery)
  );

  const renderModification = (mod) => {
    return `${mod.modification} (${mod.beginyear}-${mod.endyear})`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Модификация</Text>
      <TouchableOpacity 
        onPress={showModal} 
        style={[styles.input, disabled && styles.disabledInput]}
        disabled={disabled}
      >
        <Text style={[
          selectedModification ? styles.selectedText : styles.placeholderText,
          disabled && styles.disabledText
        ]}>
          {selectedModification ? renderModification(selectedModification) : 'Выберите модификацию'}
        </Text>
      </TouchableOpacity>

      <Portal>
        <Modal 
          visible={visible} 
          onDismiss={hideModal}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Выберите модификацию</Text>
            <Searchbar
              placeholder="Поиск модификации"
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
                data={filteredModifications}
                keyExtractor={(item) => item.carid.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.listItem} 
                    onPress={() => handleSelect(item)}
                  >
                    <Text style={styles.itemText}>{renderModification(item)}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text>Модификации не найдены</Text>
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
  disabledInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  selectedText: {
    fontSize: 16,
  },
  placeholderText: {
    fontSize: 16,
    color: 'rgba(0, 0, 0, 0.38)',
  },
  disabledText: {
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
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    marginHorizontal: 16,
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

export default ModificationSelector;