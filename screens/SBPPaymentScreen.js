// SBPPaymentScreen.js - Полноценный экран оплаты через СБП
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
  Platform,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
  BackHandler,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MMKV } from 'react-native-mmkv';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL = 'https://koleso.app/api';

// Инициализация MMKV
const storage = new MMKV();

const SBPPaymentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { paymentData, orderNumber } = route.params || {};

  // Состояния
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, paid, failed, timeout
  const [timeLeft, setTimeLeft] = useState(1200); // 20 минут
  const [showBankModal, setShowBankModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);
  const [error, setError] = useState(null);

  // Refs
  const pollingInterval = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  // Банки для выбора
  const banks = [
    { id: 'sber', name: 'Сбербанк', color: '#21A038', icon: '💚' },
    { id: 'tinkoff', name: 'Тинькофф', color: '#FFDD2D', icon: '🟡' },
    { id: 'alfa', name: 'Альфа-Банк', color: '#EF3124', icon: '🔴' },
    { id: 'vtb', name: 'ВТБ', color: '#002882', icon: '🔵' },
    { id: 'raiffeisen', name: 'Райффайзен', color: '#000000', icon: '⚫' },
    { id: 'otkritie', name: 'Открытие', color: '#00B6F0', icon: '🔷' },
    { id: 'gazprom', name: 'Газпромбанк', color: '#004B87', icon: '🔷' },
    { id: 'rosbank', name: 'Росбанк', color: '#E4022E', icon: '🔴' },
  ];

  // Эффекты
  useEffect(() => {
    if (paymentData) {
      startStatusPolling();
      startPulseAnimation();
      fadeIn();
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

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [])
  );

  // Таймер обратного отсчета
  useEffect(() => {
    if (timeLeft > 0 && paymentStatus === 'pending') {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleTimeout();
    }
  }, [timeLeft, paymentStatus]);

  // Анимация пульсации
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

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

  // Проверка статуса платежа
  const startStatusPolling = () => {
    checkPaymentStatus(); // Сразу проверяем

    pollingInterval.current = setInterval(() => {
      checkPaymentStatus();
    }, 3000); // Каждые 3 секунды
  };

  const checkPaymentStatus = async () => {
    try {
      const response = await fetch(
        `${API_URL}/sbp-api.php?action=check-status&orderId=${paymentData.sbpOrderId || paymentData.orderId}`
      );
      const data = await response.json();

      if (data.paid) {
        setPaymentStatus('paid');
        clearInterval(pollingInterval.current);
        animateSuccess();
        handlePaymentSuccess();
      } else if (data.statusCode >= 3) {
        setPaymentStatus('failed');
        setError(data.errorMessage || 'Платеж отклонен');
        clearInterval(pollingInterval.current);
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
            { name: 'Home' },
            {
              name: 'OrderSuccess',
              params: {
                orderNumber,
                orderId: paymentData.orderId,
                amount: paymentData.amount,
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
    clearInterval(pollingInterval.current);
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
            clearInterval(pollingInterval.current);
            navigation.goBack();
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleRetry = () => {
    // Перезапускаем процесс оплаты
    navigation.replace('SBPPayment', { paymentData, orderNumber });
  };

  // Открытие в банковском приложении
  const openInBankApp = async (bankId = null) => {
    const payload = paymentData?.qrCode?.payload;
    if (!payload) return;

    try {
      // Если выбран конкретный банк, можно добавить специфичные схемы
      let bankUrl = payload;

      if (bankId) {
        // Здесь можно добавить специфичные URL схемы для банков
        switch (bankId) {
          case 'sber':
            // bankUrl = `sberpay://qr?data=${encodeURIComponent(payload)}`;
            break;
          case 'tinkoff':
            // bankUrl = `tinkoffpay://qr?data=${encodeURIComponent(payload)}`;
            break;
          // Добавьте другие банки по необходимости
        }
      }

      const canOpen = await Linking.canOpenURL(bankUrl);
      if (canOpen) {
        await Linking.openURL(bankUrl);
      } else {
        // Если не можем открыть напрямую, открываем стандартную ссылку
        await Linking.openURL(payload);
      }

      setShowBankModal(false);
    } catch (error) {
      console.error('Error opening bank app:', error);
      Alert.alert(
        'Ошибка',
        'Не удалось открыть банковское приложение. Попробуйте отсканировать QR-код.'
      );
    }
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
        <Text style={styles.amountLabel}>К оплате</Text>
        <Text style={styles.amount}>{paymentData?.amount} ₽</Text>
        <Text style={styles.orderNumber}>Заказ №{orderNumber}</Text>
      </View>

      <Animated.View
        style={[
          styles.qrContainer,
          { transform: [{ scale: pulseAnim }] }
        ]}
      >
        {paymentData?.qrCode?.image ? (
          <Image
            source={{ uri: paymentData.qrCode.image }}
            style={styles.qrCode}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.qrPlaceholder}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        )}
      </Animated.View>

      <Text style={styles.instruction}>
        Отсканируйте QR-код в приложении{'\n'}вашего банка
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setShowBankModal(true)}
      >
        <Text style={styles.primaryButtonText}>
          Открыть в банковском приложении
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => {
          Alert.alert(
            'Как оплатить?',
            '1. Откройте приложение вашего банка\n2. Найдите раздел "Платежи" или "СБП"\n3. Отсканируйте QR-код\n4. Подтвердите оплату',
            [{ text: 'Понятно' }]
          );
        }}
      >
        <Text style={styles.secondaryButtonText}>Как оплатить?</Text>
      </TouchableOpacity>

      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, styles.statusPending]} />
        <Text style={styles.statusText}>Ожидание оплаты...</Text>
      </View>

      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>
          Оставшееся время: {formatTime(timeLeft)}
        </Text>
      </View>
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
      <Text style={styles.successTitle}>Оплата успешна!</Text>
      <Text style={styles.successAmount}>{paymentData?.amount} ₽</Text>
      <Text style={styles.successMessage}>
        Спасибо за покупку!{'\n'}Вы будете перенаправлены на страницу заказа
      </Text>
    </Animated.View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <View style={styles.errorIcon}>
        <Text style={styles.errorEmoji}>❌</Text>
      </View>
      <Text style={styles.errorTitle}>
        {paymentStatus === 'timeout' ? 'Время истекло' : 'Ошибка оплаты'}
      </Text>
      <Text style={styles.errorMessage}>{error}</Text>

      <TouchableOpacity style={styles.primaryButton} onPress={handleRetry}>
        <Text style={styles.primaryButtonText}>Попробовать снова</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
        <Text style={styles.secondaryButtonText}>Вернуться к заказу</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBankModal = () => (
    <Modal
      visible={showBankModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowBankModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Выберите банк</Text>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowBankModal(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bankList}>
            {banks.map((bank) => (
              <TouchableOpacity
                key={bank.id}
                style={styles.bankItem}
                onPress={() => openInBankApp(bank.id)}
              >
                <Text style={styles.bankIcon}>{bank.icon}</Text>
                <Text style={styles.bankName}>{bank.name}</Text>
                <Text style={styles.bankArrow}>›</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.bankItem}
              onPress={() => openInBankApp()}
            >
              <Text style={styles.bankIcon}>🏦</Text>
              <Text style={styles.bankName}>Другой банк</Text>
              <Text style={styles.bankArrow}>›</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Text style={styles.modalFooterText}>
              Поддерживаются все банки СБП
            </Text>
          </View>
        </View>
      </View>
    </Modal>
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Оплата через СБП</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Создание платежа...</Text>
        </View>
      ) : (
        renderContent()
      )}

      {renderBankModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 28,
    color: '#007AFF',
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
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  amount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 14,
    color: '#999',
  },
  qrContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 24,
  },
  qrCode: {
    width: 250,
    height: 250,
  },
  qrPlaceholder: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instruction: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
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
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusPending: {
    backgroundColor: '#FFA500',
    // Анимация мигания
    opacity: 0.8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  timerContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 20,
  },
  timerText: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
    color: '#000',
    marginBottom: 8,
  },
  successAmount: {
    fontSize: 24,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
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
    color: '#000',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalClose: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 24,
    color: '#666',
  },
  bankList: {
    paddingHorizontal: 20,
  },
  bankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  bankIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  bankName: {
    flex: 1,
    fontSize: 17,
  },
  bankArrow: {
    fontSize: 24,
    color: '#C7C7CC',
  },
  modalFooter: {
    padding: 20,
    alignItems: 'center',
  },
  modalFooterText: {
    fontSize: 14,
    color: '#999',
  },
});

export default SBPPaymentScreen;