// ModalSelectorScreen.tsx

import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { TextInput, List, Button } from 'react-native-paper';

const ModalSelectorScreen = ({ title, items, onSelect }) => {
  const [search, setSearch] = useState('');

  const filteredItems = items.filter(item =>
    item.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <TextInput
        label={`Поиск ${title.toLowerCase()}`}
        value={search}
        onChangeText={setSearch}
        style={styles.searchInput}
        mode="outlined"
      />

      <FlatList
        data={filteredItems}
        keyExtractor={(item, idx) => `${idx}`}
        renderItem={({ item }) => (
          <List.Item
            title={item}
            onPress={() => onSelect(item)}
          />
        )}
      />
    </View>
  );
};

export default ModalSelectorScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
  },
  searchInput: {
    marginBottom: 12,
  },
});