import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  Dimensions,
  Animated,
  Platform
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

const ITEM_PREVIEW_COUNT = 3;
const { width } = Dimensions.get('window');

// Отдельный компонент для элемента списка
const CarItem = ({ item, index, colors, theme, showSeparator }) => {
  const itemAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.spring(itemAnim, {
      toValue: 1,
      delay: index * 50,
      friction: 8,
      tension: 65,
      useNativeDriver: true,
    }).start();
  }, [index]);

  return (
    <>
      <Animated.View
        style={{
          opacity: itemAnim,
          transform: [{
            translateY: itemAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0]
            })
          }]
        }}
      >
        <TouchableOpacity 
          style={[
            styles.carItem,
            { 
              backgroundColor: theme === 'dark' ? colors.surface : '#FFFFFF',
              borderColor: theme === 'dark' ? colors.border : '#F0F0F0',
            }
          ]}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[colors.primary + '15', colors.primary + '05']}
            style={styles.carIconGradient}
          >
            <Ionicons name="car-sport" size={24} color={colors.primary} />
          </LinearGradient>
          
          <View style={styles.carInfo}>
            <Text style={[styles.carTitle, { color: colors.text }]} numberOfLines={1}>
              {item.marka} {item.model}
            </Text>
            <View style={styles.carDetails}>
              <View style={[styles.carBadge, { backgroundColor: colors.primary + '12' }]}>
                <Text style={[styles.carBadgeText, { color: colors.primary }]}>
                  {item.kuzov}
                </Text>
              </View>
              <View style={styles.carYears}>
                <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.carYearsText, { color: colors.textSecondary }]}>
                  {item.beginyear}–{item.endyear}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.carArrow}>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </View>
        </TouchableOpacity>
      </Animated.View>
      {showSeparator && (
        <View style={[styles.separator, { backgroundColor: colors.border + '30' }]} />
      )}
    </>
  );
};

const CompatibleCarsSection = ({
  cars,
  loading,
  error,
  colors,
  theme = 'light'
}) => {
  const [showAll, setShowAll] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const loadingRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading && cars && cars.length > 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [loading, cars]);

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.timing(loadingRotation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [loading]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.card }]}>
        <View style={styles.loadingContent}>
          <Animated.View style={[
            styles.loadingIcon,
            {
              transform: [{
                rotate: loadingRotation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg']
                })
              }]
            }
          ]}>
            <Ionicons name="car-outline" size={28} color={colors.primary} />
          </Animated.View>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Проверяем совместимость...
          </Text>
        </View>
      </View>
    );
  }
  
  // Не отображаем компонент при ошибке или отсутствии данных
  if (error || !cars || cars.length === 0) {
    return null;
  }

  const previewData = cars.slice(0, ITEM_PREVIEW_COUNT);
  const hasMore = cars.length > ITEM_PREVIEW_COUNT;

  return (
    <Animated.View 
      style={[
        styles.section,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="car" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>
                Подходит для
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {cars.length} {cars.length === 1 ? 'автомобиль' : cars.length < 5 ? 'автомобиля' : 'автомобилей'}
              </Text>
            </View>
          </View>
          
          {hasMore && (
            <TouchableOpacity 
              style={styles.showAllButton}
              onPress={() => setShowAll(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.showAllText, { color: colors.primary }]}>
                Все
              </Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.carsList}>
          {previewData.map((item, index) => (
            <CarItem
              key={`${item.carid}_${index}`}
              item={item}
              index={index}
              colors={colors}
              theme={theme}
              showSeparator={index < previewData.length - 1}
            />
          ))}
        </View>

        {hasMore && (
          <TouchableOpacity 
            style={[styles.viewMoreButton, { backgroundColor: colors.primary + '08' }]}
            onPress={() => setShowAll(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.viewMoreText, { color: colors.primary }]}>
              Показать еще {cars.length - ITEM_PREVIEW_COUNT} совместимых
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Модальное окно со всеми авто */}
      <Modal 
        visible={showAll} 
        animationType="slide" 
        onRequestClose={() => setShowAll(false)} 
        transparent
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowAll(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Совместимые автомобили
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Найдено {cars.length} совпадений
                </Text>
              </View>
              <TouchableOpacity 
                style={[styles.closeButton, { backgroundColor: colors.surface }]}
                onPress={() => setShowAll(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={cars}
              renderItem={({ item, index }) => (
                <CarItem
                  item={item}
                  index={index}
                  colors={colors}
                  theme={theme}
                  showSeparator={index < cars.length - 1}
                />
              )}
              keyExtractor={(item, idx) => `${item.carid}_${idx}`}
              contentContainerStyle={styles.modalList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  container: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  loadingContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingIcon: {
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  showAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  showAllText: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 4,
  },
  carsList: {
    marginHorizontal: -8,
  },
  carItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    marginVertical: 4,
  },
  carIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  carInfo: {
    flex: 1,
  },
  carTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  carDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  carBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  carBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  carYears: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  carYearsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  carArrow: {
    marginLeft: 12,
    opacity: 0.5,
  },
  separator: {
    height: 1,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 6,
  },
  viewMoreText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    maxHeight: '85%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00000020',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#00000010',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 15,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalList: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
});

export default CompatibleCarsSection;