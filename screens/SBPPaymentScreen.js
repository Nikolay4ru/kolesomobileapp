import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  Animated,
  Dimensions,
  BackHandler,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SBPPaymentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  
  const { paymentData, orderNumber, onSuccess } = route.params || {};

  // Состояния
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, paid, failed, timeout
  const [timeLeft, setTimeLeft] = useState(1200); // 20 минут
  const [error, setError] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [openingBank, setOpeningBank] = useState(false);

  // Refs
  const pollingInterval = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const qrHeight = useRef(new Animated.Value(0)).current;

  // Эффекты
  useEffect(() => {
    if (paymentData) {
      startAnimations();
      startStatusPolling();
    }

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [paymentData]);

  // Обработка кнопки "Назад"
useFocusEffect(
  React.useCallback(() => {
    const onBackPress = () => {
      handleCancel();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [])
);

  // Таймер обратного отсчета
  useEffect(() => {
    if (timeLeft > 0 && paymentStatus === 'pending') {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      
      // Анимация прогресса
      Animated.timing(progressAnim, {
        toValue: timeLeft / 1200,
        duration: 1000,
        useNativeDriver: false,
      }).start();
      
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && paymentStatus === 'pending') {
      handleTimeout();
    }
  }, [timeLeft, paymentStatus]);

  // Запуск анимаций
  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Анимация QR кода
  const toggleQR = () => {
    setShowQR(!showQR);
    Animated.spring(qrHeight, {
      toValue: showQR ? 0 : 1,
      tension: 20,
      friction: 7,
      useNativeDriver: false,
    }).start();
  };

  // Проверка статуса платежа
  const startStatusPolling = () => {
    const checkStatus = async () => {
      try {
        const response = await axios.get(
          `https://api.koleso.app/api/order-checkout.php?action=check-payment-status&sbp_order_id=${paymentData.sbpOrderId}`
        );

        if (response.data.paid) {
          setPaymentStatus('paid');
          clearInterval(pollingInterval.current);
          handleSuccess();
        }
      } catch (err) {
        console.error('Status check error:', err);
      }
    };

    // Первая проверка через 5 секунд
    setTimeout(checkStatus, 5000);
    
    // Затем каждые 3 секунды
    pollingInterval.current = setInterval(checkStatus, 3000);
  };

  // Обработчики
  const handleSuccess = () => {
    setPaymentStatus('paid');
    setTimeout(() => {
      if (onSuccess) {
        onSuccess();
      } else {
        navigation.replace('OrderSuccess', {
          orderId: paymentData.orderId,
          orderNumber: orderNumber
        });
      }
    }, 1500);
  };

  const handleTimeout = () => {
    setPaymentStatus('timeout');
    clearInterval(pollingInterval.current);
  };

  const handleCancel = () => {
    Alert.alert(
      'Отменить оплату?',
      'Вы действительно хотите отменить оплату заказа?',
      [
        { text: 'Продолжить оплату', style: 'cancel' },
        {
          text: 'Отменить',
          style: 'destructive',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  const handleRetry = () => {
    setPaymentStatus('pending');
    setTimeLeft(1200);
    setError(null);
    startStatusPolling();
  };

  const handleOpenSBP = async () => {
    setOpeningBank(true);
    const sbpUrl = paymentData.qrPayload;
    
    try {
      const supported = await Linking.canOpenURL(sbpUrl);
      if (supported) {
        await Linking.openURL(sbpUrl);
      } else {
        // Если прямая ссылка не работает, пробуем через браузер
        await Linking.openURL(sbpUrl);
      }
    } catch (err) {
      console.error('Error opening SBP link:', err);
      Alert.alert(
        'Не удалось открыть приложение', 
        'Убедитесь, что у вас установлено приложение банка с поддержкой СБП'
      );
    } finally {
      setOpeningBank(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Рендеры состояний
  const renderPaymentState = () => (
    <ScrollView 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View 
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        {/* Header Info */}
        <View style={styles.headerInfo}>
          <Text style={styles.orderLabel}>Заказ №{orderNumber}</Text>
          <Text style={styles.amountText}>{formatAmount(paymentData.amount)}</Text>
          
          {/* Timer */}
          <View style={styles.timerContainer}>
            <View style={styles.timerProgress}>
              <Animated.View 
                style={[
                  styles.timerProgressBar,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    })
                  }
                ]}
              />
            </View>
            <Text style={styles.timerText}>
              Осталось {formatTime(timeLeft)}
            </Text>
          </View>
        </View>

        {/* Main Payment Button */}
        <TouchableOpacity 
          style={styles.payButton}
          onPress={handleOpenSBP}
          activeOpacity={0.8}
          disabled={openingBank}
        >
          {openingBank ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="wallet-outline" size={24} color="#ffffff" />
              <Text style={styles.payButtonText}>Оплатить через СБП</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.hintText}>
          Нажмите кнопку выше для перехода на страницу оплаты
        </Text>

        {/* QR Code Section (Hidden by default) */}
        <View style={styles.qrSection}>
          <TouchableOpacity 
            style={styles.qrToggleButton}
            onPress={toggleQR}
            activeOpacity={0.7}
          >
            <Text style={styles.qrToggleText}>
              {showQR ? 'Скрыть QR-код' : 'Показать QR-код'}
            </Text>
            <Ionicons 
              name={showQR ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>

          <Animated.View 
            style={[
              styles.qrContainer,
              {
                maxHeight: qrHeight.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 400]
                }),
                opacity: qrHeight
              }
            ]}
          >
            {paymentData.qrCode && (
              <View style={styles.qrWrapper}>
                <Image 
                  source={{ uri: paymentData.qrCode }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
                <Text style={styles.qrHint}>
                  Отсканируйте QR-код в приложении банка
                </Text>
              </View>
            )}
          </Animated.View>
        </View>

        {/* Status Info */}
        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
          </View>
          <Text style={styles.statusText}>
            Ожидаем подтверждение оплаты...
          </Text>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={handleCancel}
        >
          <Text style={styles.cancelButtonText}>Отменить оплату</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );

  const renderSuccessState = () => (
    <View style={styles.stateContainer}>
      <Animated.View style={styles.successIcon}>
        <View style={styles.successCircle}>
          <Ionicons name="checkmark" size={60} color="#ffffff" />
        </View>
      </Animated.View>
      <Text style={styles.successTitle}>Оплата успешна!</Text>
      <Text style={styles.successAmount}>{formatAmount(paymentData.amount)}</Text>
      <Text style={styles.successMessage}>
        Заказ №{orderNumber} оплачен
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.stateContainer}>
      <View style={styles.errorIcon}>
        <Ionicons name="close-circle" size={80} color={colors.error} />
      </View>
      <Text style={styles.errorTitle}>
        {paymentStatus === 'timeout' ? 'Время истекло' : 'Ошибка оплаты'}
      </Text>
      <Text style={styles.errorMessage}>
        {error || 'Не удалось завершить оплату. Попробуйте еще раз.'}
      </Text>

      <TouchableOpacity 
        style={styles.primaryButton} 
        onPress={handleRetry}
      >
        <Text style={styles.primaryButtonText}>Попробовать снова</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.secondaryButton} 
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.secondaryButtonText}>Вернуться к заказу</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    switch (paymentStatus) {
      case 'paid':
        return renderSuccessState();
      case 'failed':
      case 'timeout':
        return renderErrorState();
      default:
        return renderPaymentState();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleCancel}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Оплата через СБП</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Обработка платежа...</Text>
        </View>
      ) : (
        renderContent()
      )}
    </SafeAreaView>
  );
};

const themedStyles = (colors, theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginRight: 40,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  contentContainer: {
    paddingTop: 32,
  },
  headerInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  orderLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  amountText: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  timerContainer: {
    width: '100%',
    maxWidth: 300,
  },
  timerProgress: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  timerProgressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  timerText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  payButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 12,
  },
  hintText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  qrSection: {
    marginBottom: 24,
  },
  qrToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  qrToggleText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 4,
  },
  qrContainer: {
    overflow: 'hidden',
  },
  qrWrapper: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  qrImage: {
    width: SCREEN_WIDTH - 112,
    height: SCREEN_WIDTH - 112,
    maxWidth: 240,
    maxHeight: 240,
    marginBottom: 16,
  },
  qrHint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statusIcon: {
    marginRight: 12,
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  successIcon: {
    marginBottom: 24,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  successAmount: {
    fontSize: 28,
    fontWeight: '600',
    color: '#22c55e',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorIcon: {
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  secondaryButtonText: {
    fontSize: 16,
    color: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
});



export default SBPPaymentScreen;