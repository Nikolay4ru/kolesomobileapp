import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { observer } from 'mobx-react-lite';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useStores } from '../useStores';

const { width: screenWidth } = Dimensions.get('window');

const StoreSelection = observer(() => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const { authStore, cartStore } = useStores();
  const route = useRoute();

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState(cartStore.selectedStore?.id || null);
  const [error, setError] = useState(null);

  // Для передачи selected store обратно, если вызов с навигации
  const onSelectStoreCallback = route.params?.onSelectStore;

  useEffect(() => {
    fetchStores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartStore.items]);

  // Функция для проверки, есть ли все товары (или часть) в магазине или на складе
  const checkStoreAvailability = (store, items) => {
    let allAvailable = true;
    let someAvailable = false;
    let someAvailableFromWarehouse = false;

    for (const item of items) {
      const stockItem = store.stock_info?.find(
        si => si.product_id.toString() === item.product_id.toString()
      );
      const warehouse = stores.find(s => s.id === 8);
      const warehouseStockItem = warehouse?.stock_info?.find(
        si => si.product_id.toString() === item.product_id.toString()
      );
      const totalAvailable = (stockItem?.in_stock || 0) + (warehouseStockItem?.in_stock || 0);

      if (totalAvailable >= item.quantity) {
        someAvailable = true;
        if (warehouseStockItem && warehouseStockItem.in_stock > 0) {
          someAvailableFromWarehouse = true;
        }
        if (!(stockItem && stockItem.in_stock >= item.quantity)) {
          allAvailable = false;
        }
      } else {
        allAvailable = false;
      }
    }

    if (allAvailable) return { status: 'full', text: 'Все есть' };
    if (someAvailableFromWarehouse) return { status: 'partial', text: 'Частично (со склада)' };
    if (someAvailable) return { status: 'partial', text: 'Частично' };
    return { status: 'none', text: 'Нет' };
  };

  // Реальный API-запрос как в cartStore
  const fetchStores = async () => {
    try {
      setLoading(true);
      setError(null);

      // Товары из корзины для передачи на бэкенд
      const productIds = cartStore.items.map(item => item.product_id);

      const response = await fetch('https://api.koleso.app/api/stores.php', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productIds,
          lat: null,
          lng: null
        })
      });

      const data = await response.json();
      if (data.success && data.data?.stores) {
        // stock_info для каждого магазина обязательно!
        setStores(
          data.data.stores.map(store => ({
            ...store,
            stock_info: store.stock_info?.map(item => ({
              ...item,
              product_id: item.product_id.toString(),
              in_stock: parseInt(item.in_stock) || 0
            })) || []
          }))
        );
      } else {
        setError('Не удалось загрузить список магазинов');
        setStores([]);
      }
    } catch (err) {
      setError('Не удалось загрузить список магазинов');
      setStores([]);
      console.error('Error fetching stores:', err);
    } finally {
      setLoading(false);
    }
  };

  // Выбор магазина: только если есть товары (allAvailable или someAvailable)
  const handleStoreSelect = (store) => {
    const availability = checkStoreAvailability(store, cartStore.items);
    if (availability.status === 'none') {
      Alert.alert(
        'Нет всех товаров',
        'В выбранном магазине нет ни одного из ваших товаров. Выберите другой магазин.'
      );
      return;
    }
    setSelectedStoreId(store.id);
    cartStore.setSelectedStore(store);
    authStore.setSelectedStore && authStore.setSelectedStore(store);
    if (onSelectStoreCallback) {
      onSelectStoreCallback(store);
    }
    navigation.goBack();
  };

  const renderStoreCard = (store) => {
    const availability = checkStoreAvailability(store, cartStore.items);

    return (
      <TouchableOpacity
        key={store.id}
        style={[
          styles.storeCard,
          selectedStoreId === store.id && { borderColor: colors.primary, borderWidth: 2 }
        ]}
        onPress={() => handleStoreSelect(store)}
        activeOpacity={availability.status === 'none' ? 0.4 : 0.8}
        disabled={availability.status === 'none'}
      >
        <Image
          source={{ uri: store.image }}
          style={styles.storeImage}
          resizeMode="cover"
        />

        <View style={styles.storeContent}>
          <View style={styles.storeHeader}>
            <Text style={styles.storeName}>{store.name}</Text>
            <View style={styles.distanceBadge}>
              <Ionicons name="location" size={14} color={colors.primary} />
              <Text style={styles.distanceText}>{store.distance}</Text>
            </View>
          </View>

          <Text style={styles.storeAddress}>{store.address}</Text>

          <View style={styles.storeInfo}>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFB800" />
              <Text style={styles.ratingText}>{store.rating}</Text>
              <Text style={styles.reviewsText}>({store.reviewsCount})</Text>
            </View>
            <View style={styles.workingHoursContainer}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.workingHoursText}>{store.workingHours}</Text>
            </View>
          </View>

          <View style={styles.servicesContainer}>
            {store.services?.slice(0, 3).map((service, index) => (
              <View key={index} style={styles.serviceBadge}>
                <Text style={styles.serviceText}>{service}</Text>
              </View>
            ))}
            {store.services && store.services.length > 3 && (
              <View style={styles.moreBadge}>
                <Text style={styles.moreText}>+{store.services.length - 3}</Text>
              </View>
            )}
          </View>

          <View style={styles.availabilityRow}>
            <Ionicons
              name={
                availability.status === 'full'
                  ? 'checkmark-circle'
                  : availability.status === 'partial'
                  ? 'alert-circle'
                  : 'close-circle'
              }
              size={18}
              color={
                availability.status === 'full'
                  ? colors.success
                  : availability.status === 'partial'
                  ? colors.warning
                  : colors.error
              }
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                color:
                  availability.status === 'full'
                    ? colors.success
                    : availability.status === 'partial'
                    ? colors.warning
                    : colors.error,
                fontWeight: '600',
                fontSize: 15,
              }}
            >
              {availability.text}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.selectButton,
              selectedStoreId === store.id && { backgroundColor: colors.success },
              availability.status === 'none' && { backgroundColor: colors.border },
            ]}
            onPress={() => handleStoreSelect(store)}
            disabled={availability.status === 'none'}
          >
            <Text style={styles.selectButtonText}>
              {availability.status === 'none'
                ? 'Нет в наличии'
                : selectedStoreId === store.id
                ? 'Выбрано'
                : 'Выбрать магазин'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Выберите магазин</Text>
        <TouchableOpacity style={styles.mapButton} disabled>
          <Ionicons name="map-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Выберите удобный магазин</Text>
            <Text style={styles.infoDescription}>
              Здесь вы можете забрать заказ или получить услуги. Выбор доступен только если товары есть в наличии в магазине или на складе.
            </Text>
          </View>
        </View>

        {/* Stores List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Загружаем магазины...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchStores}>
              <Text style={styles.retryButtonText}>Попробовать снова</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.storesList}>
            {stores.filter(s => s.id !== 8).map(renderStoreCard)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
});

const themedStyles = (colors, theme) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme === 'dark' ? 0.2 : 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  mapButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  infoIconContainer: {
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme === 'dark' ? colors.text : colors.primary,
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: theme === 'dark' ? colors.textSecondary : colors.primary,
    opacity: 0.8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  storesList: {
    paddingHorizontal: 20,
  },
  storeCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme === 'dark' ? 0.2 : 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  storeImage: {
    width: '100%',
    height: 160,
    backgroundColor: colors.surface,
  },
  storeContent: {
    padding: 16,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    marginLeft: 4,
  },
  storeAddress: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  storeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  workingHoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workingHoursText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  serviceBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  serviceText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  moreBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  moreText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
});

export default StoreSelection;