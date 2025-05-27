import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Animated,
  StatusBar,
  ImageBackground,
  Platform,
} from 'react-native';
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

const API_URL = 'https://api.koleso.app/api';
const { width: screenWidth } = Dimensions.get('window');

const HomeScreen = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
   const [popularProducts, setPopularProducts] = useState([]);
   const [error, setError] = useState(null);
  const slidesRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const statusBarHeight = insets.top;

  const slides = [
    {
      id: '1',
      title: '🔥 Сезонная распродажа',
      subtitle: 'Премиум шины со скидкой до 40%',
      image: 'https://www.koleso-russia.ru/upload/resize_cache/iblock/359/449_476_0/e6p4btxrzy26h2dzjys7f4n6jb7i3ilt.jpg',
      backgroundColor: '#262A56'
    },
    {
      id: '2',
      title: '🛠 Комплексное ТО',
      subtitle: 'Полная диагностика + замена масла',
      image: 'https://www.koleso-russia.ru/upload/resize_cache/iblock/359/449_476_0/e6p4btxrzy26h2dzjys7f4n6jb7i3ilt.jpg',
      backgroundColor: '#3B8EA5'
    },
    {
      id: '3',
      title: '✨ Автоаксессуары',
      subtitle: 'Новинки сезона, которые вы искали',
      image: 'https://www.koleso-russia.ru/upload/resize_cache/iblock/359/449_476_0/e6p4btxrzy26h2dzjys7f4n6jb7i3ilt.jpg',
      backgroundColor: '#272640'
    }
  ];

 // Загрузка популярных товаров
  useEffect(() => {
    const fetchPopularProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/popular_products.php?limit=8`);
        const data = await response.json();
        
        if (data.success) {
          setPopularProducts(data.data);
        } else {
          setError(data.message || 'Failed to load popular products');
          // Fallback to local data if API fails
          setPopularProducts(fallbackProducts);
        }
      } catch (err) {
        setError(err.message);
        // Fallback to local data if API fails
        setPopularProducts(fallbackProducts);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPopularProducts();
  }, []);



   // Обработчик нажатия на товар (для обновления статистики просмотров)
  const handleProductPress = async (productId) => {
    try {
      await fetch(`${API_URL}/update_product_stats.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          action: 'view'
        })
      });
      
      navigation.navigate('Home', {
                    screen: 'Product',
                    params: {
                      productId: productId,
                      fromCart: false,
                       modal: false
                    }
                  });
    } catch (err) {
      console.error('Error updating product stats:', err);
      navigation.navigate('Home', {
                    screen: 'Product',
                    params: {
                      productId: productId,
                      fromCart: false,
                      modal: false
                    }
                  });
    }
  };



  const categories = [
    { id: '1', name: 'Шины', icon: 'car-sport', color: '#3AB795', bgColor: '#E7FAF3' },
    { id: '2', name: 'Диски', icon: 'disc', color: '#4ECDC4', bgColor: '#E3F9F6' },
    { id: '3', name: 'Масла', icon: 'water', color: '#FFD447', bgColor: '#FFF9E3' },
    { id: '4', name: 'Батареи', icon: 'battery-full', color: '#277DA1', bgColor: '#E8F5E8' },
    { id: '5', name: 'Химия', icon: 'flask', color: '#FF6B6B', bgColor: '#FFE3E6' },
    { id: '6', name: 'Сервис', icon: 'build', color: '#B3D9FF', bgColor: '#E3F0FF' }
  ];

  const quickActions = [
    {
      id: '1',
      title: 'Подобрать авто',
      icon: 'car-sport-outline',
      backgroundColor: '#E7FAF3',
      color: '#34D399',
      route: 'FilterAuto'
    },
    {
      id: '2',
      title: 'Каталог',
      icon: 'search-outline',
      backgroundColor: '#F0F4FF',
      color: '#6366F1',
      route: 'ProductList'
    },
    {
      id: '3',
      title: 'Сервис',
      icon: 'calendar-outline',
      backgroundColor: '#FFF4E3',
      color: '#FBBF24',
      route: 'Booking'
    },
    {
      id: '4',
      title: 'Скидки',
      icon: 'card-outline',
      backgroundColor: '#FDF2F8',
      color: '#EC4899',
      route: 'DiscountCard'
    }
  ];

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      const nextSlide = (activeSlide + 1) % slides.length;
      slidesRef.current?.scrollToIndex({ index: nextSlide, animated: true });
      setActiveSlide(nextSlide);
    }, 5000);
    return () => clearTimeout(timer);
  }, [activeSlide]);

  const renderSlide = ({ item }) => (
    <View style={styles.slide}>
      <ImageBackground
        source={{ uri: item.image }}
        style={styles.slideImage}
        imageStyle={{ borderRadius: 20 }}
      >
        <View style={[styles.slideOverlay, { backgroundColor: item.backgroundColor + "CC" }]} />
        <View style={styles.slideTextWrap}>
          <Text style={styles.slideTitle}>{item.title}</Text>
          <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
          <TouchableOpacity style={styles.slideButton}>
            <Text style={styles.slideButtonText}>Подробнее</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );

  const renderProduct = (item) => (
    <TouchableOpacity 
      key={item.id} 
      style={styles.productCard} 
      activeOpacity={0.88}
      onPress={() => handleProductPress(item.id)}
    >
      {item.discount && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>-{item.discount}%</Text>
        </View>
      )}
      <View style={styles.productImageContainer}>
        <Image source={{ uri: item.image }} style={styles.productImage} />
        {!item.inStock && <View style={styles.outOfStockOverlay} />}
      </View>
      <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
      <View style={styles.priceBlock}>
        <Text style={styles.productPrice}>{item.price.toLocaleString()} ₽</Text>
        {item.originalPrice && (
          <Text style={styles.originalPrice}>{item.originalPrice.toLocaleString()} ₽</Text>
        )}
      </View>
      <View style={styles.productMeta}>
        <View style={[styles.stockDot, { backgroundColor: item.inStock ? "#22C55E" : "#F87171" }]} />
        <Text style={[styles.stockText, { color: item.inStock ? "#22C55E" : "#F87171" }]}>
          {item.inStock ? "В наличии" : "Разобрали"}
        </Text>
      </View>
    </TouchableOpacity>
  );


  return (
    <View style={[styles.container, { paddingTop: statusBarHeight }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FB" />
      <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
        {/* Slider */}
        <View style={styles.sliderContainer}>
          <Animated.FlatList
            ref={slidesRef}
            data={slides}
            renderItem={renderSlide}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            onViewableItemsChanged={({ viewableItems }) => {
              if (viewableItems.length > 0) {
                setActiveSlide(viewableItems[0].index ?? 0);
              }
            }}
            viewabilityConfig={viewConfigRef}
            keyExtractor={item => item.id}
          />
          <View style={styles.pagination}>
            {slides.map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.paginationDot,
                  i === activeSlide && styles.activeDot
                ]}
              />
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          {quickActions.map(action => (
            <TouchableOpacity
              key={action.id}
              style={[styles.quickActionCard, { backgroundColor: action.backgroundColor }]}
              onPress={() => navigation.navigate(action.route)}
              activeOpacity={0.85}
            >
              <Ionicons name={action.icon} size={28} color={action.color} style={{ marginBottom: 8 }} />
              <Text style={styles.quickActionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Секция популярных товаров */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionMainTitle}>Популярные товары</Text>
            <TouchableOpacity
              style={styles.seeAllButton}
              onPress={() => navigation.navigate("ProductList")}
            >
              <Ionicons name="chevron-forward" size={18} color="#6366F1" />
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <ActivityIndicator size="large" color="#6366F1" style={styles.loader} />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 2, paddingRight: 20 }}
            >
              {popularProducts.map(renderProduct)}
            </ScrollView>
          )}
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionMainTitle}>Категории</Text>
          <View style={styles.categoriesGrid}>
            {categories.map(category => (
              <TouchableOpacity key={category.id} style={styles.categoryCard} activeOpacity={0.88}>
                <View style={[styles.categoryIconContainer, { backgroundColor: category.bgColor }]}>
                  <Ionicons name={category.icon} size={24} color={category.color} />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Service Banner */}
        <View style={styles.serviceBanner}>
          <ImageBackground
            source={{ uri: 'https://i.imgur.com/4QfKuz1.jpg' }}
            style={styles.bannerImage}
            imageStyle={{ borderRadius: 20 }}
          >
            <View style={styles.bannerOverlay} />
            <View style={styles.bannerContent}>
              <Ionicons name="build-outline" size={34} color="#fff" style={styles.bannerIcon} />
              <Text style={styles.bannerTitle}>Профессиональный шиномонтаж</Text>
              <Text style={styles.bannerText}>Скидка 10% при онлайн записи</Text>
              <TouchableOpacity
                style={styles.bannerButton}
                onPress={() => navigation.navigate("Booking")}
              >
                <Text style={styles.bannerButtonText}>Записаться</Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FB' },
  sliderContainer: { height: 210, marginVertical: 10 },
  slide: { width: screenWidth - 40, marginHorizontal: 20 },
  slideImage: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  slideOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    backgroundColor: '#18181bBB'
  },
  slideTextWrap: {
    position: 'absolute',
    left: 24, bottom: 28, right: 24,
    zIndex: 3
  },
  slideTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.5
  },
  slideSubtitle: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
    opacity: 0.94,
    marginBottom: 16
  },
  slideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(99,102,241,0.9)',
    alignSelf: 'flex-start',
    marginTop: 8
  },
  slideButtonText: {
    color: 'white',
    fontWeight: '700',
    marginRight: 8,
    fontSize: 15
  },
  pagination: {
    position: 'absolute',
    bottom: 14,
    left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'center'
  },
  paginationDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#fff',
    opacity: 0.18,
    margin: 3
  },
  activeDot: {
    opacity: 0.95,
    width: 24
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
    marginBottom: 30,
    paddingHorizontal: 20
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2
  },
  quickActionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#22223B',
    textAlign: 'center'
  },
  section: { marginBottom: 32, paddingHorizontal: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    justifyContent: 'space-between'
  },
  sectionMainTitle: {
    fontSize: 20, fontWeight: '700', color: '#272640'
  },
  seeAllButton: {
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 30,
    backgroundColor: '#F0F4FF'
  },
  productCard: {
    width: 156,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    position: 'relative',
    marginBottom: 2
  },
  productImageContainer: { position: 'relative', marginBottom: 10 },
  productImage: { width: '100%', height: 75, resizeMode: 'contain', borderRadius: 10 },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.83)',
    borderRadius: 10
  },
  discountBadge: {
    position: 'absolute', top: 5, right: 5,
    backgroundColor: '#EF4444',
    paddingVertical: 2, paddingHorizontal: 8,
    borderRadius: 12, zIndex: 1
  },
  discountText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  productName: {
    fontSize: 14, color: '#1E293B', fontWeight: '600',
    marginBottom: 6, lineHeight: 18
  },
  priceBlock: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 7
  },
  productPrice: {
    fontSize: 15, fontWeight: '700', color: '#1E293B'
  },
  originalPrice: {
    fontSize: 13,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    marginLeft: 7
  },
  productMeta: {
    flexDirection: 'row', alignItems: 'center'
  },
  stockDot: {
    width: 7, height: 7, borderRadius: 4, marginRight: 7
  },
  stockText: {
    fontSize: 11, fontWeight: '500'
  },
  ratingText: {
    fontSize: 12, color: '#64748B', fontWeight: '500', marginLeft: 3
  },

  // Categories
  categoriesGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 12
  },
  categoryCard: {
    width: '30%',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 20,
    marginBottom: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1
  },
  categoryIconContainer: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center', marginBottom: 9
  },
  categoryName: {
    fontSize: 13, color: '#475569', fontWeight: '600', textAlign: 'center'
  },

  // Service Banner
  serviceBanner: {
    marginHorizontal: 20, borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 8, marginBottom: 15
  },
  bannerImage: { width: '100%', height: 170, justifyContent: 'flex-end' },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24,24,27,0.55)',
    borderRadius: 20
  },
  bannerContent: {
    padding: 22, alignItems: 'center'
  },
  bannerIcon: { marginBottom: 13 },
  bannerTitle: {
    fontSize: 19, fontWeight: '700', color: '#fff', marginBottom: 5, textAlign: 'center'
  },
  bannerText: {
    fontSize: 15, color: '#fff', fontWeight: '500', opacity: 0.95,
    textAlign: 'center', marginBottom: 18, lineHeight: 20
  },
  bannerButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 30, paddingVertical: 10,
    borderRadius: 16
  },
  bannerButtonText: {
    color: 'white', fontWeight: '700', fontSize: 15, letterSpacing: 0.2
  },
  loader: {
    paddingVertical: 40
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    paddingVertical: 20
  },
});

export default HomeScreen;