import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Platform,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useStores } from '../useStores';
import CustomHeader from '../components/CustomHeader';
import { observer } from 'mobx-react-lite';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const CARD_HEIGHT = Math.min(CARD_WIDTH * 0.63, 220);
const QR_SIZE = Math.min(width * 0.6, 200);

const LoyaltyCardScreen = observer(() => {
  const navigation = useNavigation();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const { authStore } = useStores();
  
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [loyaltyData, setLoyaltyData] = useState({
    balance: 0,
    earned: 0,
    used: 0,
    expiringPoints: 0,
    expiringDate: null,
    cached: false,
    cacheAge: 0,
    warning: null
  });

  // Загрузка баланса
  const loadBalance = async (forceSync = false) => {
    try {
      const result = forceSync 
        ? await authStore.syncLoyaltyBalance()
        : await authStore.fetchLoyaltyPoints(true);
      
      if (result && result.success) {
        setLoyaltyData({
          balance: result.balance || 0,
          earned: result.earned || 0,
          used: result.used || 0,
          expiringPoints: result.expiring_points || 0,
          expiringDate: result.expiring_date,
          cached: result.cached || false,
          cacheAge: result.cache_age || 0,
          warning: result.warning
        });
      }
    } catch (error) {
      console.error('Failed to load balance:', error);
      // Используем данные из authStore если есть
      if (authStore.user?.loyaltyPoints !== undefined) {
        setLoyaltyData({
          balance: authStore.user.loyaltyPoints,
          earned: authStore.user.earnedPoints || 0,
          used: authStore.user.usedPoints || 0,
          expiringPoints: authStore.user.expiringPoints || 0,
          expiringDate: authStore.user.expiringDate,
          cached: true,
          cacheAge: 0,
          warning: 'Используются кэшированные данные'
        });
      }
    }
  };

  // Загрузка истории
  const loadHistory = async (page = 1, append = false) => {
    if (isLoadingHistory) return;
    
    setIsLoadingHistory(true);
    
    try {
      const result = await authStore.fetchLoyaltyHistory(page, 10);
      
      if (result && result.success) {
        const newHistory = result.data || [];
        
        setHistory(prev => append ? [...prev, ...newHistory] : newHistory);
        setHistoryPage(page);
        
        // Проверяем есть ли еще страницы
        const pagination = result.pagination;
        setHasMoreHistory(pagination?.current_page < pagination?.last_page);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadBalance(true), // Принудительная синхронизация
        loadHistory(1, false)
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // Загрузка следующей страницы истории
  const loadMoreHistory = () => {
    if (!isLoadingHistory && hasMoreHistory) {
      console.log('Loading more history, page:', historyPage + 1);
      loadHistory(historyPage + 1, true);
    }
  };

  // Обработчик скролла для ручной проверки
  const handleScroll = (event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 100; // Загружаем за 100px до конца
    
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= 
      contentSize.height - paddingToBottom;
    
    if (isCloseToBottom && !isLoadingHistory && hasMoreHistory) {
      loadMoreHistory();
    }
  };

  // Загрузка данных при открытии экрана
  useFocusEffect(
    useCallback(() => {
      loadBalance(false);
      loadHistory(1, false);
    }, [])
  );

  // Форматирование номера карты
  const formatCardNumber = (number) => {
    if (!number) return '•••• •••• •••• ••••';
    return number.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  // Форматирование даты
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Форматирование даты истечения
  const formatExpiringDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'long'
    });
  };

  // Рендер элемента истории
  const renderHistoryItem = ({ item }) => {
    const isEarned = item.type === 'earned';
    const iconName = isEarned ? 'add-circle' : 'remove-circle';
    const iconColor = isEarned ? colors.success : colors.error;
    const pointsText = isEarned ? `+${item.points}` : `${item.points}`;

    return (
      <View style={styles.historyItem}>
        <View style={[styles.historyIcon, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={iconName} size={24} color={iconColor} />
        </View>
        
        <View style={styles.historyContent}>
          <Text style={styles.historyDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
          {item.order_number && (
            <Text style={styles.historyOrderNumber}>Заказ №{item.order_number}</Text>
          )}
        </View>
        
        <View style={styles.historyPoints}>
          <Text style={[styles.historyPointsText, { color: iconColor }]}>
            {pointsText}
          </Text>
        </View>
      </View>
    );
  };

  const cardNumber = authStore.user?.loyaltyCardNumber || authStore.user?.phone || '0000000000';
  const userName = [
    authStore.user?.lastName,
    authStore.user?.firstName,
    authStore.user?.middleName
  ].filter(Boolean).join(' ') || 'Пользователь';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar 
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
        translucent={false}
      />
      
      <CustomHeader title="Карта лояльности" />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={400}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Card Container */}
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={theme === 'dark' ? ['#1a1a1a', '#2a2a2a'] : ['#000000', '#1a1a1a']}
            style={styles.loyaltyCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardContent}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardBrandContainer}>
                  <Text style={styles.cardBrand}>КОЛЕСО</Text>
                  <Text style={styles.cardType}>Premium Card</Text>
                </View>
                <View style={styles.cardLogo}>
                  <Ionicons name="shield-checkmark" size={24} color="#FFD700" />
                </View>
              </View>

             

              {/* Footer */}
              <View style={styles.cardFooter}>
                <View style={styles.cardHolderContainer}>
                  <Text style={styles.cardLabel}>Владелец карты</Text>
                  <Text style={styles.cardHolder} numberOfLines={1} ellipsizeMode="tail">
                    {userName}
                  </Text>
                </View>
                <View style={styles.cardPointsContainer}>
                  {authStore.isLoadingLoyalty ? (
                    <ActivityIndicator size="small" color="#FFD700" />
                  ) : (
                    <>
                      <Text style={styles.pointsValue}>
                        {loyaltyData.balance.toLocaleString('ru-RU')}
                      </Text>
                      <Text style={styles.pointsLabel}>баллов</Text>
                    </>
                  )}
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* Cache indicator */}
          {loyaltyData.cached && loyaltyData.cacheAge > 0 && (
            <View style={styles.cacheIndicator}>
              <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.cacheText}>
                Обновлено {Math.floor(loyaltyData.cacheAge / 60)} мин назад
              </Text>
            </View>
          )}

          {/* Warning */}
          {loyaltyData.warning && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning-outline" size={16} color={colors.warning} />
              <Text style={styles.warningText}>{loyaltyData.warning}</Text>
            </View>
          )}
        </View>

        {/* Balance Details */}
        <View style={styles.balanceSection}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceValue}>
                +{loyaltyData.earned.toLocaleString('ru-RU')}
              </Text>
              <Text style={styles.balanceLabel}>Начислено</Text>
            </View>
            
            <View style={styles.balanceDivider} />
            
            <View style={styles.balanceItem}>
              <Text style={[styles.balanceValue, { color: colors.error }]}>
                -{loyaltyData.used.toLocaleString('ru-RU')}
              </Text>
              <Text style={styles.balanceLabel}>Потрачено</Text>
            </View>
          </View>

          {/* Expiring points warning */}
          {loyaltyData.expiringPoints > 0 && loyaltyData.expiringDate && (
            <View style={styles.expiringWarning}>
              <Ionicons name="time" size={16} color="#FFD700" />
              <Text style={styles.expiringText}>
                {loyaltyData.expiringPoints.toLocaleString('ru-RU')} баллов сгорят {formatExpiringDate(loyaltyData.expiringDate)}
              </Text>
            </View>
          )}
        </View>

        {/* QR Code Section */}
        <View style={styles.qrSection}>
          <Text style={styles.qrTitle}>QR-код для оплаты</Text>
          <Text style={styles.qrSubtitle}>
            Покажите код на кассе для начисления баллов
          </Text>
          
          <View style={styles.qrContainer}>
            <View style={styles.qrWrapper}>
              <QRCode
                value={cardNumber}
                size={QR_SIZE}
                color={theme === 'dark' ? '#FFFFFF' : '#000000'}
                backgroundColor={theme === 'dark' ? '#1a1a1a' : '#FFFFFF'}
              />
            </View>
            <View style={styles.qrCorners}>
              <View style={[styles.qrCorner, styles.qrCornerTL]} />
              <View style={[styles.qrCorner, styles.qrCornerTR]} />
              <View style={[styles.qrCorner, styles.qrCornerBL]} />
              <View style={[styles.qrCorner, styles.qrCornerBR]} />
            </View>
          </View>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>Ваши привилегии</Text>
          
          <View style={styles.benefitsGrid}>
            <View style={styles.benefitCard}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="wallet" size={24} color={colors.primary} />
              </View>
              <Text style={styles.benefitValue}>3%</Text>
              <Text style={styles.benefitLabel}>Кэшбэк баллами</Text>
            </View>
            
            
            
            <View style={styles.benefitCard}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.warning + '20' }]}>
                <Ionicons name="pricetag" size={24} color={colors.warning} />
              </View>
              <Text style={styles.benefitValue}>-30%</Text>
              <Text style={styles.benefitLabel}>На шиномонтаж</Text>
            </View>
          </View>
        </View>

        {/* History Section */}
        <View style={styles.historySection}>
          <View style={styles.historySectionHeader}>
            <Text style={styles.historyTitle}>История операций</Text>
            {isLoadingHistory && historyPage === 1 && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
          </View>

          {history.length === 0 && !isLoadingHistory ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyHistoryText}>История операций пуста</Text>
            </View>
          ) : (
            <FlatList
              data={history}
              renderItem={renderHistoryItem}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              scrollEnabled={false}
              ListFooterComponent={() => (
                isLoadingHistory && historyPage > 1 ? (
                  <View style={styles.loadingMore}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadingMoreText}>Загрузка...</Text>
                  </View>
                ) : hasMoreHistory ? (
                  <TouchableOpacity 
                    style={styles.loadMoreButton}
                    onPress={loadMoreHistory}
                    disabled={isLoadingHistory}
                  >
                    <Text style={styles.loadMoreButtonText}>Загрузить еще</Text>
                    <Ionicons name="chevron-down" size={16} color={colors.primary} />
                  </TouchableOpacity>
                ) : history.length > 0 ? (
                  <View style={styles.endOfHistory}>
                    <Text style={styles.endOfHistoryText}>Это всё</Text>
                  </View>
                ) : null
              )}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
});

const themedStyles = (colors, theme) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  
  // Card styles
  cardContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 24,
  },
  loyaltyCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardBrandContainer: {
    flex: 1,
  },
  cardBrand: {
    fontSize: Platform.OS === 'ios' ? 20 : 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  cardType: {
    fontSize: Platform.OS === 'ios' ? 10 : 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardNumber: {
    fontSize: Platform.OS === 'ios' ? 16 : 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 1,
    alignSelf: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardHolderContainer: {
    flex: 1,
    marginRight: 10,
  },
  cardLabel: {
    fontSize: Platform.OS === 'ios' ? 9 : 10,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cardHolder: {
    fontSize: Platform.OS === 'ios' ? 13 : 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
  },
  cardPointsContainer: {
    alignItems: 'flex-end',
  },
  pointsValue: {
    fontSize: Platform.OS === 'ios' ? 18 : 20,
    fontWeight: '700',
    color: '#FFD700',
  },
  pointsLabel: {
    fontSize: Platform.OS === 'ios' ? 10 : 11,
    color: 'rgba(255, 215, 0, 0.8)',
  },
  
  // Cache indicator
  cacheIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 4,
  },
  cacheText: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  // Warning
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: colors.warning,
  },

  // Balance section
  balanceSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  balanceRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.success,
    marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Expiring warning
  expiringWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD70020',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  expiringText: {
    flex: 1,
    fontSize: 13,
    color: '#FFD700',
    fontWeight: '500',
  },
  
  // QR Section
  qrSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  qrSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  qrContainer: {
    position: 'relative',
  },
  qrWrapper: {
    padding: 20,
    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#FFFFFF',
    borderRadius: 20,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: theme === 'dark' ? 0.3 : 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  qrCorners: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  qrCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: colors.primary,
    borderWidth: 3,
  },
  qrCornerTL: {
    top: -5,
    left: -5,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  qrCornerTR: {
    top: -5,
    right: -5,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  qrCornerBL: {
    bottom: -5,
    left: -5,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  qrCornerBR: {
    bottom: -5,
    right: -5,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  
  // Benefits
  benefitsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  benefitsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  benefitsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  benefitCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  benefitLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // History section
  historySection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  historySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: theme === 'dark' ? 0.1 : 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  historyOrderNumber: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 2,
  },
  historyPoints: {
    marginLeft: 12,
  },
  historyPointsText: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyHistoryText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '15',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
    gap: 6,
  },
  loadMoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  endOfHistory: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  endOfHistoryText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export default LoyaltyCardScreen;