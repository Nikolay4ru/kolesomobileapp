import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useStores } from '../useStores';
import CustomHeader from '../components/CustomHeader';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const CARD_HEIGHT = Math.min(CARD_WIDTH * 0.63, 220); // Соотношение сторон банковской карты
const QR_SIZE = Math.min(width * 0.6, 200);

const LoyaltyCardScreen = () => {
  const navigation = useNavigation();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const insets = useSafeAreaInsets();
  const { authStore } = useStores();
  
  // Mock data - в реальном приложении данные будут из authStore
  const [userCard, setUserCard] = useState({
    cardNumber: '1234567890123456',
    points: 12450,
    cashbackPercent: 3,
    welcomeBonus: 500,
    discount: 30,
    userName: authStore.user?.name || 'Пользователь',
  });

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Моя карта лояльности Колесо: ${userCard.cardNumber}`,
        title: 'Карта лояльности Колесо',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatCardNumber = (number) => {
    return number.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar 
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
        translucent={false}
      />
      
   <CustomHeader 
  title="Кастомный заголовок"
 
//  theme="dark" // для правильного цвета текста в StatusBar
/>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Card Container */}
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={theme === 'dark' ? ['#1a1a1a', '#2a2a2a'] : ['#000000', '#1a1a1a']}
            style={styles.loyaltyCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Card Content */}
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

              {/* Number */}
              <Text style={styles.cardNumber}>
                {formatCardNumber(userCard.cardNumber)}
              </Text>

              {/* Footer */}
              <View style={styles.cardFooter}>
                <View style={styles.cardHolderContainer}>
                  <Text style={styles.cardLabel}>Владелец карты</Text>
                  <Text style={styles.cardHolder} numberOfLines={1} ellipsizeMode="tail">
                    {userCard.userName}
                  </Text>
                </View>
                <View style={styles.cardPointsContainer}>
                  <Text style={styles.pointsValue}>{userCard.points.toLocaleString()}</Text>
                  <Text style={styles.pointsLabel}>баллов</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
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
                value={userCard.cardNumber}
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
              <Text style={styles.benefitValue}>{userCard.cashbackPercent}%</Text>
              <Text style={styles.benefitLabel}>Кэшбэк баллами</Text>
            </View>
            
            <View style={styles.benefitCard}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="gift" size={24} color={colors.success} />
              </View>
              <Text style={styles.benefitValue}>{userCard.welcomeBonus}</Text>
              <Text style={styles.benefitLabel}>Приветственные баллы</Text>
            </View>
            
            <View style={styles.benefitCard}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.warning + '20' }]}>
                <Ionicons name="pricetag" size={24} color={colors.warning} />
              </View>
              <Text style={styles.benefitValue}>-{userCard.discount}%</Text>
              <Text style={styles.benefitLabel}>На шиномонтаж</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Поделиться картой</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={20} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>История операций</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
   </SafeAreaView>
  );
};

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
    marginBottom: 32,
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
  
  // QR Section
  qrSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 40,
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
  
  // Actions
  actions: {
    paddingHorizontal: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '15',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
});

export default LoyaltyCardScreen;