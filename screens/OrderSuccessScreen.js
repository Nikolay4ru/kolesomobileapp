import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

const OrderSuccessScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  
  const { orderId, orderNumber, deliveryType, deliveryDate } = route.params || {};
  
  // Анимации
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Запускаем анимации последовательно
    Animated.sequence([
      // Сначала показываем основной контент
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      // Затем анимируем галочку
      Animated.spring(checkmarkScale, {
        toValue: 1,
        tension: 50,
        friction: 3,
        delay: 200,
        useNativeDriver: true,
      }),
      // И наконец, показываем детали
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  const formatDeliveryDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };
  
  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };
  
  const handleViewOrder = () => {
    navigation.reset({
      index: 1,
      routes: [
        { name: 'Home' },
        { name: 'Profile', params: { screen: 'Orders' } }
      ],
    });
  };
  
  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.gradient}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Success Animation */}
          <Animated.View 
            style={[
              styles.successContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            <View style={styles.checkmarkContainer}>
              <View
                style={styles.checkmarkGradient}
              >
                <Animated.View
                  style={{
                    transform: [{ scale: checkmarkScale }]
                  }}
                >
                  <Ionicons 
                    name="checkmark-sharp" 
                    size={60} 
                    color="#ffffff"
                  />
                </Animated.View>
              </View>
              
              {/* Ripple effect */}
              <Animated.View 
                style={[
                  styles.ripple,
                  {
                    transform: [{ scale: checkmarkScale }],
                    opacity: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 0],
                    }),
                  }
                ]}
              />
            </View>
            
            <Text style={styles.successTitle}>Заказ успешно оформлен!</Text>
            <Text style={styles.successSubtitle}>
              Спасибо за ваш заказ
            </Text>
          </Animated.View>
          
          {/* Order Details */}
          <Animated.View 
            style={[
              styles.detailsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderNumberLabel}>Номер заказа</Text>
                <Text style={styles.orderNumber}>№ {orderNumber || orderId}</Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.orderDetails}>
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons 
                      name={deliveryType === 'delivery' ? 'car-outline' : 'storefront-outline'} 
                      size={24} 
                      color={colors.primary} 
                    />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Способ получения</Text>
                    <Text style={styles.detailValue}>
                      {deliveryType === 'delivery' ? 'Доставка' : 'Самовывоз'}
                    </Text>
                  </View>
                </View>
                
                {deliveryDate && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Ionicons 
                        name="calendar-outline" 
                        size={24} 
                        color={colors.primary} 
                      />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Дата доставки</Text>
                      <Text style={styles.detailValue}>
                        {formatDeliveryDate(deliveryDate)}
                      </Text>
                    </View>
                  </View>
                )}
                
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons 
                      name="time-outline" 
                      size={24} 
                      color={colors.primary} 
                    />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Статус заказа</Text>
                    <View style={styles.statusContainer}>
                      <View style={[styles.statusDot, { backgroundColor: '#22c55e' }]} />
                      <Text style={styles.detailValue}>В обработке</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Info Card */}
            <View style={styles.infoCard}>
              <Ionicons 
                name="information-circle" 
                size={20} 
                color={colors.primary} 
                style={styles.infoIcon}
              />
              <Text style={styles.infoText}>
                Мы отправили подтверждение заказа на ваш телефон. 
                Вы можете отслеживать статус заказа в разделе "Мои заказы".
              </Text>
            </View>
          </Animated.View>
          
          {/* Action Buttons */}
          <Animated.View 
            style={[
              styles.buttonsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleViewOrder}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Перейти к заказу</Text>
              <Ionicons name="arrow-forward" size={20} color="#ffffff" style={styles.buttonIcon} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={handleGoHome}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>На главную</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const themedStyles = (colors, theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
    backgroundColor: theme === 'dark' ? '#0d0d0d' : '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: Platform.select({
      ios: 88 + 20, // TabBar height + padding
      android: 56 + 20,
    }),
  },
  successContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  checkmarkContainer: {
    width: 120,
    height: 120,
    marginBottom: 24,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    ...Platform.select({
      ios: {
        shadowColor: '#22c55e',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  ripple: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#22c55e',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  detailsContainer: {
    marginBottom: 30,
  },
  orderCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  orderHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  orderNumberLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: -24,
  },
  orderDetails: {
    marginTop: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  infoCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
    lineHeight: 20,
  },
  buttonsContainer: {
    marginTop: 20,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    marginBottom: 12,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  secondaryButton: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
});

export default OrderSuccessScreen;