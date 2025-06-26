// SBPPaymentScreen.js - Исправленный экран оплаты через СБП
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
  useColorScheme,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MMKV } from 'react-native-mmkv';
import axios from 'axios';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Инициализация MMKV
const storage = new MMKV();

const SBPPaymentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const { paymentData, orderNumber } = route.params || {};

  // Состояния
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, paid, failed, timeout
  const [timeLeft, setTimeLeft] = useState(1200); // 20 минут
  const [showQR, setShowQR] = useState(false);
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(true);

  // Refs
  const pollingInterval = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const qrScaleAnim = useRef(new Animated.Value(0)).current;

  // Цвета для темной темы
  const colors = {
    background: isDarkMode ? '#000000' : '#F5F5F7',
    cardBackground: isDarkMode ? '#1C1C1E' : 'white',
    text: isDarkMode ? '#FFFFFF' : '#000000',
    secondaryText: isDarkMode ? '#8E8E93' : '#666666',
    tertiaryText: isDarkMode ? '#636366' : '#999999',
    border: isDarkMode ? '#38383A' : '#E5E5E7',
    primaryButton: '#007AFF',
    successColor: '#34C759',
    errorColor: '#FF3B30',
    warningColor: '#FF9500',
    qrBackground: isDarkMode ? '#2C2C2E' : '#FFFFFF',
  };

  // Эффекты
  useEffect(() => {
    if (paymentData && isPolling) {
      startStatusPolling();
      fadeIn();
    }

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    };
  }, [paymentData, isPolling]);

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
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && paymentStatus === 'pending') {
      handleTimeout();
    }
  }, [timeLeft, paymentStatus]);

  // Анимация появления
  const fadeIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  // Анимация успеха
  const animateSuccess = () => {
    Animated.spring(successAnim, {
      toValue: 1,
      tension: 10,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  // Анимация показа QR
  const animateQR = (show) => {
    Animated.spring(qrScaleAnim, {
      toValue: show ? 1 : 0,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  // Проверка статуса платежа
  const startStatusPolling = () => {
    if (!paymentData?.sbpOrderId && !paymentData?.orderId) {
      console.error('No order ID provided');
      return;
    }

    // Очищаем предыдущий интервал если есть
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }

    checkPaymentStatus(); // Сразу проверяем

    pollingInterval.current = setInterval(() => {
      if (isPolling) {
        checkPaymentStatus();
      }
    }, 3000); // Каждые 3 секунды
  };

  const checkPaymentStatus = async () => {
    try {
      const orderId = paymentData?.sbpOrderId || paymentData?.orderId;
      if (!orderId) return;

      const response = await axios.get(
        `https://api.koleso.app/api/sbp-api.php?action=check-status&orderId=${orderId}`
      );
      
      const data = response.data;
      
      if (data.paid && paymentStatus !== 'paid') {
        setPaymentStatus('paid');
        setIsPolling(false);
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
        animateSuccess();
        handlePaymentSuccess();
      } else if (data.statusCode >= 3 && paymentStatus !== 'failed') {
        setPaymentStatus('failed');
        setError(data.errorMessage || 'Платеж отклонен');
        setIsPolling(false);
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    } catch (error) {
      console.error('Status check error:', error);
    }
  };

  // Обработчики
  const handlePaymentSuccess = async () => {
    try {
      // Очищаем корзину
      storage.delete('cart');

      // Показываем успех на 2 секунды
      setTimeout(() => {
        navigation.reset({
          index: 1,
          routes: [
            { name: 'Main' },
            {
              name: 'OrderSuccess',
              params: {
                orderNumber,
                orderId: paymentData?.orderId,
                amount: paymentData?.amount,
              },
            },
          ],
        });
      }, 2000);
    } catch (error) {
      console.error('Success handling error:', error);
    }
  };

  const handleTimeout = () => {
    setPaymentStatus('timeout');
    setError('Время оплаты истекло');
    setIsPolling(false);
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Отменить оплату?',
      'Вы уверены, что хотите отменить оплату?',
      [
        { text: 'Нет', style: 'cancel' },
        {
          text: 'Да',
          onPress: () => {
            setIsPolling(false);
            if (pollingInterval.current) {
              clearInterval(pollingInterval.current);
              pollingInterval.current = null;
            }
            navigation.goBack();
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleRetry = () => {
    // Сбрасываем состояния
    setPaymentStatus('pending');
    setError(null);
    setTimeLeft(1200);
    setIsPolling(true);
    setShowQR(false);
    
    // Перезапускаем проверку
    startStatusPolling();
  };

  // Открытие в банковском приложении
  const openInBankApp = async () => {
    const payload = paymentData?.qrCode?.payload;
    if (!payload) {
      Alert.alert('Ошибка', 'Ссылка для оплаты недоступна');
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(payload);
      if (canOpen) {
        await Linking.openURL(payload);
      } else {
        await Linking.openURL(payload);
      }
    } catch (error) {
      console.error('Error opening bank app:', error);
      Alert.alert(
        'Ошибка',
        'Не удалось открыть банковское приложение. Попробуйте показать QR-код и отсканировать его в приложении банка.'
      );
    }
  };

  // Показать/скрыть QR
  const toggleQR = () => {
    const newShowQR = !showQR;
    setShowQR(newShowQR);
    animateQR(newShowQR);
  };

  // Форматирование времени
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Рендер различных состояний
  const renderPaymentState = () => (
    <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
      <View style={styles.amountContainer}>
        <Text style={[styles.amountLabel, { color: colors.secondaryText }]}>К оплате</Text>
        <Text style={[styles.amount, { color: colors.text }]}>{paymentData?.amount} ₽</Text>
        <Text style={[styles.orderNumber, { color: colors.tertiaryText }]}>Заказ №{orderNumber}</Text>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: colors.primaryButton }]}
        onPress={openInBankApp}
      >
        <Text style={styles.primaryButtonText}>
          Оплатить через банковское приложение
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={toggleQR}
      >
        <Text style={[styles.secondaryButtonText, { color: colors.primaryButton }]}>
          {showQR ? 'Скрыть QR-код' : 'Показать QR-код'}
        </Text>
      </TouchableOpacity>

      {showQR && (
        <Animated.View 
          style={[
            styles.qrContainer,
            { 
              backgroundColor: colors.qrBackground,
              transform: [{ scale: qrScaleAnim }],
              opacity: qrScaleAnim
            }
          ]}
        >
          {paymentData?.qrCode?.image ? (
            <>
              <Image
                source={{ uri: paymentData.qrCode.image }}
                style={styles.qrCode}
                resizeMode="contain"
              />
              <Text style={[styles.qrInstruction, { color: colors.secondaryText }]}>
                Отсканируйте QR-код в приложении вашего банка
              </Text>
            </>
          ) : (
            <View style={styles.qrPlaceholder}>
              <ActivityIndicator size="large" color={colors.primaryButton} />
            </View>
          )}
        </Animated.View>
      )}

      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, { backgroundColor: colors.warningColor }]} />
        <Text style={[styles.statusText, { color: colors.secondaryText }]}>Ожидание оплаты...</Text>
      </View>

      <View style={[styles.timerContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
        <Text style={[styles.timerText, { color: colors.secondaryText }]}>
          Оставшееся время: {formatTime(timeLeft)}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.helpButton}
        onPress={() => {
          Alert.alert(
            'Как оплатить?',
            '1. Нажмите "Оплатить через банковское приложение"\n2. Выберите банк из списка\n3. Подтвердите оплату в приложении банка\n\nИли:\n\n1. Нажмите "Показать QR-код"\n2. Откройте приложение вашего банка\n3. Найдите раздел "Платежи" или "СБП"\n4. Отсканируйте QR-код',
            [{ text: 'Понятно' }]
          );
        }}
      >
        <Text style={[styles.helpButtonText, { color: colors.secondaryText }]}>Нужна помощь?</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderSuccessState = () => (
    <Animated.View
      style={[
        styles.successContainer,
        {
          opacity: successAnim,
          transform: [{
            scale: successAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 1],
            })
          }]
        }
      ]}
    >
      <View style={styles.successIcon}>
        <Text style={styles.successEmoji}>✅</Text>
      </View>
      <Text style={[styles.successTitle, { color: colors.text }]}>Оплата успешна!</Text>
      <Text style={[styles.successAmount, { color: colors.successColor }]}>{paymentData?.amount} ₽</Text>
      <Text style={[styles.successMessage, { color: colors.secondaryText }]}>
        Спасибо за покупку!{'\n'}Вы будете перенаправлены на страницу заказа
      </Text>
    </Animated.View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <View style={styles.errorIcon}>
        <Text style={styles.errorEmoji}>❌</Text>
      </View>
      <Text style={[styles.errorTitle, { color: colors.text }]}>
        {paymentStatus === 'timeout' ? 'Время истекло' : 'Ошибка оплаты'}
      </Text>
      <Text style={[styles.errorMessage, { color: colors.secondaryText }]}>{error}</Text>

      <TouchableOpacity 
        style={[styles.primaryButton, { backgroundColor: colors.primaryButton }]} 
        onPress={handleRetry}
      >
        <Text style={styles.primaryButtonText}>Попробовать снова</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
        <Text style={[styles.secondaryButtonText, { color: colors.primaryButton }]}>Вернуться к заказу</Text>
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
          <Text style={[styles.backButtonText, { color: colors.primaryButton }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Оплата через СБП</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryButton} />
          <Text style={[styles.loadingText, { color: colors.secondaryText }]}>Создание платежа...</Text>
        </View>
      ) : (
        renderContent()
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 28,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  amountContainer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 40,
  },
  amountLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  amount: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 14,
  },
  qrContainer: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  qrCode: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrInstruction: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
  },
  timerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  timerText: {
    fontSize: 14,
  },
  helpButton: {
    paddingVertical: 16,
  },
  helpButtonText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successIcon: {
    marginBottom: 24,
  },
  successEmoji: {
    fontSize: 80,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  successAmount: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorIcon: {
    marginBottom: 24,
  },
  errorEmoji: {
    fontSize: 80,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
});

export default SBPPaymentScreen;