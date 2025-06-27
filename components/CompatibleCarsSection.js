import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const ITEM_PREVIEW_COUNT = 5;

const CompatibleCarsSection = ({
  cars,
  loading,
  error,
  colors,
  theme = 'light'
}) => {
  const [showAll, setShowAll] = useState(false);

  if (loading) {
    return (
      <View style={styles.sectionContent}>
        <Ionicons name="car-outline" size={32} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>Загружаем совместимость...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.sectionContent}>
        <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
        <Text style={[styles.infoText, { color: colors.error }]}>{error}</Text>
      </View>
    );
  }
  if (!cars || cars.length === 0) {
    return (
      <View style={styles.sectionContent}>
        <Ionicons name="car-sport-outline" size={32} color={colors.textTertiary} />
        <Text style={[styles.infoText, { color: colors.textTertiary }]}>Нет данных о совместимости</Text>
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <View style={[
      styles.carItem,
      { backgroundColor: theme === 'dark' ? colors.surface : '#F9FAFB', borderColor: colors.border }
    ]}>
      <View style={styles.carIconWrap}>
        <Ionicons name="car-sport-outline" size={26} color={colors.primary} />
      </View>
      <View style={styles.carInfo}>
        <Text style={[styles.carTitle, { color: colors.text }]} numberOfLines={1}>
          {item.marka} {item.model}
        </Text>
        <View style={styles.carChipRow}>
          <View style={[styles.carChip, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.carChipText, { color: colors.primary }]}>{item.kuzov}</Text>
          </View>
          <View style={[styles.carChip, { backgroundColor: colors.surface, marginLeft: 6 }]}>
            <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
            <Text style={[styles.carChipText, { color: colors.textSecondary, marginLeft: 2 }]}>{item.beginyear}–{item.endyear}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const previewData = cars.slice(0, ITEM_PREVIEW_COUNT);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons name="car-outline" size={22} color={colors.primary} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Совместимость с авто</Text>
        {cars.length > ITEM_PREVIEW_COUNT && (
          <TouchableOpacity onPress={() => setShowAll(true)}>
            <Text style={[styles.showAllBtn, { color: colors.primary }]}>Показать все</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={previewData}
        keyExtractor={(item, idx) => `${item.carid}_${idx}`}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        style={{ marginTop: 8 }}
        scrollEnabled={false}
      />
      {/* Модальное окно со всеми авто */}
      <Modal visible={showAll} animationType="slide" onRequestClose={() => setShowAll(false)} transparent>
        <View style={[styles.modalOverlay, { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.35)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, maxHeight: Dimensions.get('window').height * 0.75 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Все совместимые авто</Text>
              <TouchableOpacity onPress={() => setShowAll(false)}>
                <Ionicons name="close" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={cars}
              renderItem={renderItem}
              keyExtractor={(item, idx) => `${item.carid}_${idx}`}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              style={{ marginTop: 12 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    borderRadius: 16,
    marginHorizontal: 12,
    backgroundColor: 'transparent',
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#E8F6F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  showAllBtn: {
    fontSize: 15,
    fontWeight: '600',
    padding: 8,
  },
  sectionContent: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  infoText: {
    fontSize: 15,
    marginTop: 10,
    textAlign: 'center',
  },
  carItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  carIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  carInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  carTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  carChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  carChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 2,
  },
  carChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    minHeight: 120,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
});

export default CompatibleCarsSection;