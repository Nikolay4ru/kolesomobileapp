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
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import CustomHeader from '../components/CustomHeader';

const { width } = Dimensions.get('window');
const API_URL = 'https://api.koleso.app/api';

const PromotionsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const insets = useSafeAreaInsets();
  
  const [activeTab, setActiveTab] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState([]);
  const [error, setError] = useState(null);
  
  // Получаем промо из параметров навигации (если есть)
  const selectedPromo = route.params?.promo;

  // Функция загрузки новостей/акций из API
  const fetchPromotions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/news.php`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.news && data.news.length > 0) {
        // Преобразуем новости в формат промо-акций
        const formattedPromotions = data.news.map(item => ({
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          description: item.subtitle,
          image: item.image,
          linkUrl: item.linkUrl,
          category: 'all',
          validUntil: new Date(item.createdAt).toLocaleDateString('ru-RU'),
          displayOrder: item.displayOrder || 0,
        }));
        
        setPromotions(formattedPromotions);
      } else {
        throw new Error('Нет доступных акций');
      }
    } catch (err) {
      console.error('Error fetching promotions:', err);
      setError(err.message || 'Не удалось загрузить акции');
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  // Загружаем акции при монтировании
  useEffect(() => {
    fetchPromotions();
  }, []);

  // Если передана конкретная акция через навигацию, показываем её детали
  useEffect(() => {
    if (selectedPromo) {
      navigation.navigate('PromotionDetail', { promotion: selectedPromo });
    }
  }, [selectedPromo]);

  const tabs = [
    { id: 'all', title: 'Все акции', icon: 'pricetags' },
    { id: 'discount', title: 'Скидки', icon: 'sale' },
    { id: 'service', title: 'Услуги', icon: 'build' },
    { id: 'bonus', title: 'Бонусы', icon: 'gift' },
  ];

  const filteredPromotions = activeTab === 'all' 
    ? promotions 
    : promotions.filter(p => p.category === activeTab || p.category === 'all');

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPromotions();
    setRefreshing(false);
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

  const handlePromotionPress = (item) => {
    // Если есть внешняя ссылка, открываем её
    if (item.linkUrl) {
      Linking.openURL(item.linkUrl).catch(err => 
        console.error('Failed to open URL:', err)
      );
    } else {
      // Иначе открываем детальную страницу
      navigation.navigate('PromotionDetail', { promotion: item });
    }
  };

  const renderPromotion = ({ item }) => (
    <TouchableOpacity 
      style={styles.promotionCard}
      activeOpacity={0.9}
      onPress={() => handlePromotionPress(item)}
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
        {item.linkUrl && (
          <View style={[styles.linkBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="link" size={12} color="#FFF" />
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

  // Экран ошибки
  if (error && !loading && !refreshing) {
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
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={80} color={colors.error} />
          <Text style={styles.errorTitle}>Ошибка загрузки</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={fetchPromotions}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#FFF" />
            <Text style={styles.retryButtonText}>Повторить попытку</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Индикатор загрузки
  if (loading && !refreshing) {
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
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Загрузка акций...</Text>
        </View>
      </View>
    );
  }

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
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetags-outline" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyText}>Нет доступных акций</Text>
            <Text style={styles.emptySubtext}>Потяните вниз, чтобы обновить</Text>
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
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  
  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Tabs
  tabsContainer: {
    backgroundColor: colors.card,
    maxHeight: 56,
    borderBottomWidth: 0,
    borderBottomColor: colors.border,
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 0,
    marginTop: 4,
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
    height: 220,
    overflow: 'hidden',
  },
  promotionImage: {
    width: '100%',
    height: '120%',
    resizeMode: 'contain',
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
  linkBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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