import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions
} from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { observer } from "mobx-react-lite";
import { useStores } from "../useStores";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const StorageScreen = observer(({ navigation }) => {
  const { authStore, storagesStore } = useStores();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const insets = useSafeAreaInsets();
  
  // Анимации
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [loading]);

  const fetchStorages = useCallback(async () => {
    try {
      await storagesStore.loadStorages(authStore.token);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [authStore.token, storagesStore]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (authStore.isLoggedIn) {
        await fetchStorages();
      }
      setLoading(false);
    };

    loadData();
  }, [authStore.isLoggedIn, fetchStorages]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStorages();
    setRefreshing(false);
  }, [fetchStorages]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'cancelled':
        return '#dc2626';
      case 'Выдано':
        return '#0ea5e9';
      default:
        return '#22c55e';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'cancelled':
        return 'cancel';
      case 'Выдано':
        return 'check-circle-outline';
      default:
        return 'inventory-2';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'Хранение на складе':
        return 'Активный';
      case 'Выдано':
        return 'Завершен';
      case 'cancelled':
        return 'Отменен';
      default:
        return status;
    }
  };

  const renderStorageItem = ({ item, index }) => {
    const translateX = new Animated.Value(50);
    const itemOpacity = new Animated.Value(0);
    
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(itemOpacity, {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      })
    ]).start();

    const statusColor = getStatusColor(item.status);

    return (
      <Animated.View style={{
        opacity: itemOpacity,
        transform: [{ translateX }]
      }}>
        <TouchableOpacity 
          style={styles.storageItem}
          onPress={() => navigation.navigate('StorageDetail', { storage: item })}
          activeOpacity={0.7}
        >
          <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
          
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.contractContainer}>
                <Text allowFontScaling={false} style={styles.contractLabel}>ДОГОВОР</Text>
                <Text allowFontScaling={false} style={styles.contractNumber}>№{item.contract_number}</Text>
              </View>
              
              <View style={[styles.statusContainer, { backgroundColor: `${statusColor}15` }]}>
                <Icon name={getStatusIcon(item.status)} size={18} color={statusColor} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {getStatusText(item.status)}
                </Text>
              </View>
            </View>
            
            <View style={styles.infoSection}>
              <View style={styles.dateContainer}>
                <Icon name="schedule" size={16} color="#94a3b8" />
                <Text style={styles.dateLabel}>Срок хранения до</Text>
                <Text style={styles.dateValue}>
                  {new Date(item.end_date).toLocaleDateString('ru-RU', { 
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  }).replace('.', '')}
                </Text>
              </View>
            </View>
            
            <View style={styles.goodsSection}>
              <Icon name="category" size={16} color="#94a3b8" />
              <Text style={styles.goodsText} numberOfLines={2}>
                {item.nomenclature}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (!authStore.isLoggedIn) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerContainer}>
          <View style={styles.authIconWrapper}>
            <Icon name="lock" size={48} color="#64748b" />
          </View>
          <Text style={styles.authTitle}>Авторизация</Text>
          <Text style={styles.authMessage}>
            Войдите в аккаунт для просмотра ваших договоров хранения
          </Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Войти в систему</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerContainer}>
          <View style={styles.errorIconWrapper}>
            <Icon name="warning" size={48} color="#ef4444" />
          </View>
          <Text style={styles.errorTitle}>Ошибка загрузки</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setLoading(true);
              fetchStorages().then(() => setLoading(false));
            }}
          >
            <Icon name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Хранение</Text>
        <View style={styles.headerInfo}>
          <Text style={styles.headerCount}>{storagesStore.storages.length}</Text>
          <Text style={styles.headerLabel}>активных</Text>
        </View>
      </View>

      <Animated.View style={[styles.listContainer, { opacity: fadeAnim }]}>
        <FlatList
          data={storagesStore.storages}
          renderItem={renderStorageItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3b82f6']}
              tintColor="#3b82f6"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrapper}>
                <Icon name="inbox" size={64} color="#e2e8f0" />
              </View>
              <Text style={styles.emptyTitle}>Пусто</Text>
              <Text style={styles.emptyMessage}>
                У вас пока нет договоров хранения
              </Text>
            </View>
          }
        />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  headerInfo: {
    alignItems: 'center',
  },
  headerCount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3b82f6',
  },
  headerLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  storageItem: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  statusIndicator: {
    height: 4,
    width: '100%',
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  contractContainer: {
    flex: 1,
  },
  contractLabel: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  contractNumber: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#0f172a',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(12),
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: moderateScale(12),
  },
  statusText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    marginLeft: 6,
  },
  infoSection: {
    marginBottom: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: moderateScale(14),
    color: '#64748b',
    marginLeft: 8,
    marginRight: 8,
  },
  dateValue: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#0f172a',
  },
  goodsSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 12,
  },
  goodsText: {
    fontSize: moderateScale(14),
    color: '#475569',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  // Состояния
  authIconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  authTitle: {
    fontSize: moderateScale(24),
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  authMessage: {
    fontSize: moderateScale(16),
    textAlign: 'center',
    color: '#64748b',
    marginBottom: 32,
    lineHeight: 24,
  },
  loginButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
  },
  loginButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  errorIconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    color: '#64748b',
    marginBottom: 32,
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    color: '#64748b',
    lineHeight: 24,
  },
});

export default StorageScreen;