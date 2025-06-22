import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  StatusBar,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import CustomHeader from '../components/CustomHeader';

const { width } = Dimensions.get('window');

const PromotionsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const insets = useSafeAreaInsets();
  
  const [activeTab, setActiveTab] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  
  // Получаем промо из параметров навигации (если есть)
  const selectedPromo = route.params?.promo;

  // Моковые данные акций
  const [promotions] = useState([
    {
      id: '1',
      title: 'Сезонная распродажа',
      subtitle: 'Премиум шины со скидкой до 40%',
      description: 'Успейте приобрести премиальные летние шины с невероятной скидкой до 40%. В акции участвуют бренды Michelin, Continental, Bridgestone.',
      image: 'https://images.unsplash.com/photo-1621839673705-6617adf9e890?w=800',
      category: 'discount',
      discount: '-40%',
      validUntil: '30 июня 2025',
      conditions: [
        'Скидка действует на летние шины',
        'При покупке комплекта из 4 шин',
        'Не суммируется с другими акциями'
      ]
    },
    {
      id: '2',
      title: 'Комплексное ТО',
      subtitle: 'Полная диагностика + замена масла',
      description: 'Комплексное техническое обслуживание вашего автомобиля по специальной цене. Включает полную диагностику и замену масла.',
      image: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=800',
      category: 'service',
      price: '2 990 ₽',
      oldPrice: '4 500 ₽',
      validUntil: 'Постоянно',
      includes: [
        'Компьютерная диагностика',
        'Замена моторного масла',
        'Замена масляного фильтра',
        'Проверка всех систем'
      ]
    },
    {
      id: '3',
      title: 'Автоаксессуары',
      subtitle: 'Новинки сезона',
      description: 'Новое поступление автоаксессуаров. Скидка 20% на весь ассортимент при покупке от 5000 рублей.',
      image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800',
      category: 'products',
      discount: '-20%',
      minOrder: 'от 5 000 ₽',
      validUntil: '15 июля 2025'
    },
    {
      id: '4',
      title: 'Бесплатная диагностика',
      subtitle: 'При покупке от 10 000 ₽',
      description: 'Получите бесплатную компьютерную диагностику при покупке товаров или услуг на сумму от 10 000 рублей.',
      image: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=400',
      category: 'bonus',
      type: 'Бонус',
      validUntil: 'Постоянно'
    },
    {
      id: '5',
      title: 'Летние шины',
      subtitle: 'Скидка на весь ассортимент',
      description: 'Специальные цены на летние шины всех размеров. Успейте купить до конца сезона!',
      image: 'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=400',
      category: 'discount',
      discount: '-30%',
      validUntil: '30 июня 2025'
    }
  ]);

  const tabs = [
    { id: 'all', title: 'Все акции', icon: 'pricetags' },
    { id: 'discount', title: 'Скидки', icon: 'sale' },
    { id: 'service', title: 'Услуги', icon: 'build' },
    { id: 'bonus', title: 'Бонусы', icon: 'gift' },
  ];

  const filteredPromotions = activeTab === 'all' 
    ? promotions 
    : promotions.filter(p => p.category === activeTab);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'discount': return colors.error;
      case 'service': return colors.primary;
      case 'bonus': return colors.success;
      case 'products': return colors.warning;
      default: return colors.primary;
    }
  };

  const renderPromotion = ({ item }) => (
    <TouchableOpacity 
      style={styles.promotionCard}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('PromotionDetail', { promotion: item })}
    >
      <View style={styles.promotionImageContainer}>
        <Image source={{ uri: item.image }} style={styles.promotionImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.imageGradient}
        />
        {item.discount && (
          <View style={[styles.badge, { backgroundColor: colors.error }]}>
            <Text style={styles.badgeText}>{item.discount}</Text>
          </View>
        )}
        {item.type && (
          <View style={[styles.badge, { backgroundColor: getCategoryColor(item.category) }]}>
            <Text style={styles.badgeText}>{item.type}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.promotionContent}>
        <Text style={styles.promotionTitle}>{item.title}</Text>
        <Text style={styles.promotionSubtitle}>{item.subtitle}</Text>
        
        <View style={styles.promotionFooter}>
          <View style={styles.validityContainer}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.validityText}>{item.validUntil}</Text>
          </View>
          
          {item.price && (
            <View style={styles.priceContainer}>
              {item.oldPrice && (
                <Text style={styles.oldPrice}>{item.oldPrice}</Text>
              )}
              <Text style={styles.price}>{item.price}</Text>
            </View>
          )}
          
          {item.minOrder && (
            <Text style={styles.minOrder}>{item.minOrder}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      
      <CustomHeader 
        title="Акции и предложения"
        showBackButton={true}
      />

      {/* Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab,
              activeTab === tab.id && { backgroundColor: colors.primary + '15' }
            ]}
            onPress={() => setActiveTab(tab.id)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={tab.icon} 
              size={18} 
              color={activeTab === tab.id ? colors.primary : colors.textSecondary} 
            />
            <Text style={[
              styles.tabText,
              activeTab === tab.id && { color: colors.primary }
            ]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Promotions List */}
      <FlatList
        data={filteredPromotions}
        renderItem={renderPromotion}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetags-outline" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyText}>Нет доступных акций</Text>
            <Text style={styles.emptySubtext}>Проверьте позже</Text>
          </View>
        }
      />
    </View>
  );
};

const themedStyles = (colors, theme) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Tabs
  tabsContainer: {
    backgroundColor: colors.card,
    maxHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    gap: 6,
  },
  activeTab: {
    backgroundColor: colors.primary + '15',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  
  // List
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  
  // Promotion Card
  promotionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  promotionImageContainer: {
    position: 'relative',
    height: 180,
    overflow: 'hidden',
  },
  promotionImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  promotionContent: {
    padding: 16,
  },
  promotionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  promotionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  promotionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  validityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  validityText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  oldPrice: {
    fontSize: 14,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  minOrder: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default PromotionsScreen;