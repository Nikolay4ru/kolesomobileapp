import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Animated,
  SafeAreaView,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import CustomHeader from '../components/CustomHeader';
import axios from 'axios';
import { useStores } from '../useStores';

const YandexSplitPaymentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const { authStore } = useStores();

  const { paymentData, orderNumber, onSuccess } = route.params;
  const {
    orderId,
    paymentUrl,
    amount,
    splitOrderId,
    expiresAt
  } = paymentData;

  const [loading, setLoading] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [timeLeft, setTimeLeft] = useState(null);

  // Рефы для интервалов
  const checkInterval = useRef(null);
  const timerInterval = useRef(null);

  // Анимация
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Запускаем проверку статуса
    startStatusChecking();

    // Запускаем таймер обратного отсчета
    if (expiresAt) {
      startTimer();
    }

    // Очистка интервалов при размонтировании
    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, []);

  // Таймер обратного отсчета
  const startTimer = () => {
    timerInterval.current = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const timeRemaining = expiresAt - now;

      if (timeRemaining <= 0) {
        setTimeLeft(0);
        clearInterval(timerInterval.current);
        Alert.alert(
          'Время истекло',
          'Время для оплаты заказа истекло. Пожалуйста, оформите заказ заново.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        setTimeLeft(timeRemaining);
      }
    }, 1000);
  };

  // Форматирование времени
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Проверка статуса платежа
  const checkPaymentStatus = async () => {
    try {
      setCheckingStatus(true);
      
      const response = await axios.get(
        `https://api.koleso.app/api/order-checkout.php?action=check-yandex-split-status&split_order_id=${splitOrderId}`,
        {
          headers: {
            'Authorization': `Bearer ${authStore.token}`,
          },
        }
      );

      if (response.data && response.data.paid) {
        setPaymentStatus('paid');
        clearInterval(checkInterval.current);
        
        // Небольшая задержка для лучшего UX
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          }
        }, 1500);
      } else if (response.data && response.data.status === 'failed') {
        setPaymentStatus('failed');
        clearInterval(checkInterval.current);
      }
    } catch (error) {
      console.error('Ошибка проверки статуса:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  // Запуск периодической проверки статуса
  const startStatusChecking = () => {
    // Первая проверка через 5 секунд
    setTimeout(() => {
      checkPaymentStatus();
    }, 5000);

    // Затем проверяем каждые 5 секунд
    checkInterval.current = setInterval(() => {
      checkPaymentStatus();
    }, 5000);
  };

  // Обработка навигации в WebView
  const handleNavigationStateChange = (navState) => {
    // Проверяем URL на предмет успешной оплаты
    if (navState.url.includes('success') || navState.url.includes('payment/success')) {
      // Проверяем статус немедленно
      checkPaymentStatus();
    }
  };

  // Обработка сообщений от WebView
  const handleWebViewMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      if (message.type === 'payment_success') {
        setPaymentStatus('paid');
        if (onSuccess) {
          onSuccess();
        }
      } else if (message.type === 'payment_failed') {
        setPaymentStatus('failed');
      }
    } catch (error) {
      console.error('Ошибка обработки сообщения WebView:', error);
    }
  };

  // Инжектируемый JavaScript для WebView
  const injectedJavaScript = `
    (function() {
      // Перехватываем события оплаты
      window.addEventListener('message', function(e) {
        if (e.data && typeof e.data === 'string') {
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'payment' && data.status) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'payment_' + data.status
              }));
            }
          } catch (err) {}
        }
      });

      // Отправляем сообщение о загрузке
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'loaded'
      }));
    })();
  `;

  const renderContent = () => {
    if (paymentStatus === 'paid') {
      return (
        <View style={styles.statusContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={colors.success} />
          </View>
          <Text style={styles.statusTitle}>Оплата прошла успешно!</Text>
          <Text style={styles.statusDescription}>
            Заказ №{orderNumber} успешно оплачен
          </Text>
          <Text style={styles.redirectText}>
            Перенаправление...
          </Text>
        </View>
      );
    }

    if (paymentStatus === 'failed') {
      return (
        <View style={styles.statusContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="close-circle" size={80} color={colors.error} />
          </View>
          <Text style={styles.statusTitle}>Оплата не прошла</Text>
          <Text style={styles.statusDescription}>
            Попробуйте оплатить заказ еще раз
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Вернуться к оформлению</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        <View style={styles.header}>
          <Text style={styles.orderInfo}>Заказ №{orderNumber}</Text>
          <Text style={styles.amountText}>{amount} ₽</Text>
          {timeLeft !== null && timeLeft > 0 && (
            <View style={styles.timerContainer}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.timerText}>
                Осталось времени: {formatTime(timeLeft)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.webViewContainer}>
          <WebView
            source={{ uri: paymentUrl }}
            style={styles.webView}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onNavigationStateChange={handleNavigationStateChange}
            onMessage={handleWebViewMessage}
            injectedJavaScript={injectedJavaScript}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Загрузка формы оплаты...</Text>
              </View>
            )}
          />
          
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Безопасная оплата через Яндекс
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Оплата частями без процентов
            </Text>
          </View>
        </View>

        {checkingStatus && (
          <View style={styles.checkingStatus}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.checkingStatusText}>
              Проверка статуса платежа...
            </Text>
          </View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader
        title="Оплата через Яндекс Сплит"
        leftIcon="close"
        backgroundColor={colors.card}
        onLeftPress={() => {
          Alert.alert(
            'Отменить оплату?',
            'Вы уверены, что хотите отменить оплату?',
            [
              {
                text: 'Нет',
                style: 'cancel'
              },
              {
                text: 'Да',
                onPress: () => navigation.goBack()
              }
            ]
          );
        }}
      />

      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        {renderContent()}
      </Animated.View>
    </SafeAreaView>
  );
};

const themedStyles = (colors, theme) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.card,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderInfo: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  amountText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  infoSection: {
    backgroundColor: colors.card,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 10,
    flex: 1,
  },
  checkingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: colors.primaryLight,
  },
  checkingStatusText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 8,
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successIcon: {
    marginBottom: 24,
  },
  errorIcon: {
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  statusDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  redirectText: {
    fontSize: 14,
    color: colors.primary,
    fontStyle: 'italic',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginTop: 20,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default YandexSplitPaymentScreen;