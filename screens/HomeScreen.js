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
  const [userBooking, setUserBooking] = useState(null);
  const slidesRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const statusBarHeight = insets.top;

  const slides = [
    {
      id: '1',
      title: 'Сезонная распродажа',
      subtitle: 'Премиум шины со скидкой до 40%',
      image: 'https://images.unsplash.com/photo-1621839673705-6617adf9e890?w=800',
      backgroundColor: '#1a1a1a'
    },
    {
      id: '2',
      title: 'Комплексное ТО',
      subtitle: 'Полная диагностика + замена масла',
      image: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=800',
      backgroundColor: '#1a1a1a'
    },
    {
      id: '3',
      title: 'Автоаксессуары',
      subtitle: 'Новинки сезона',
      image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800',
      backgroundColor: '#1a1a1a'
    }
  ];

  // Загрузка данных пользователя и записей
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Загрузка записи пользователя
        const bookingResponse = await fetch(`${API_URL}/user_booking.php`);
        const bookingData = await bookingResponse.json();
        
        if (bookingData.success && bookingData.data) {
          setUserBooking(bookingData.data);
        }
      } catch (err) {
        console.error('Error fetching user booking:', err);
      }
    };
    
    fetchUserData();
  }, []);

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
          // Fallback data
          setPopularProducts([
            { id: '1', name: 'Шина Michelin Pilot Sport 4', price: 12500, image: 'https://www.koleso-russia.ru/upload/resize_cache/iblock/359/449_476_0/e6p4btxrzy26h2dzjys7f4n6jb7i3ilt.jpg', inStock: true },
            { id: '2', name: 'Диск Replica B125', price: 8900, image: 'https://www.koleso-russia.ru/upload/resize_cache/iblock/359/449_476_0/e6p4btxrzy26h2dzjys7f4n6jb7i3ilt.jpg', inStock: true, discount: 15 },
          ]);
        }
      } catch (err) {
        setError(err.message);
        setPopularProducts([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPopularProducts();
  }, []);

  // Обработчик нажатия на товар
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
    { id: '1', name: 'Шины', icon: 'car-sport', color: '#007AFF' },
    { id: '2', name: 'Диски', icon: 'disc', color: '#34C759' },
    { id: '3', name: 'Масла', icon: 'water', color: '#FF9500' },
    { id: '4', name: 'АКБ', icon: 'battery-full', color: '#5856D6' },
    { id: '5', name: 'Химия', icon: 'flask', color: '#FF3B30' },
    { id: '6', name: 'Сервис', icon: 'build', color: '#007AFF' }
  ];

  const quickActions = [
    {
      id: '1',
      title: 'Подбор по авто',
      subtitle: 'Найдем подходящие товары',
      icon: 'car-sport',
      color: '#007AFF',
      bgColor: '#E3F2FF',
      route: 'FilterAuto'
    },
    {
      id: '2',
      title: 'Записаться',
      subtitle: 'На сервис и шиномонтаж',
      icon: 'calendar',
      color: '#34C759',
      bgColor: '#E8F5E8',
      route: 'Booking'
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
    <TouchableOpacity style={styles.slide} activeOpacity={0.95}>
      <Image 
        source={{ uri: item.image }} 
        style={styles.slideImage}
        resizeMode="cover"
      />
      <View style={styles.slideGradient} />
      <View style={styles.slideTextWrap}>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
        <View style={styles.slideButton}>
          <Text style={styles.slideButtonText}>Подробнее</Text>
          <Ionicons name="arrow-forward" size={16} color="#000" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderProduct = (item) => (
    <TouchableOpacity 
      key={item.id} 
      style={styles.productCard} 
      activeOpacity={0.7}
      onPress={() => handleProductPress(item.id)}
    >
      {item.discount && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>-{item.discount}%</Text>
        </View>
      )}
      <View style={styles.productImageContainer}>
        <Image source={{ uri: item.image }} style={styles.productImage} />
      </View>
      <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
      <View style={styles.productBottom}>
        <Text style={styles.productPrice}>{item.price.toLocaleString()} ₽</Text>
        {item.originalPrice && (
          <Text style={styles.originalPrice}>{item.originalPrice.toLocaleString()} ₽</Text>
        )}
      </View>
      <View style={styles.stockIndicator}>
        <View style={[styles.stockDot, { backgroundColor: item.inStock ? "#34C759" : "#FF9500" }]} />
        <Text style={[styles.stockText, { color: item.inStock ? "#34C759" : "#FF9500" }]}>
          {item.inStock ? "В наличии" : "Под заказ"}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: statusBarHeight }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Добро пожаловать</Text>
          <Text style={styles.headerTitle}>Главная</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="search-outline" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="notifications-outline" size={24} color="#000" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scrollView}
      >
        {/* User Booking Card */}
        {userBooking && (
          <TouchableOpacity 
            style={styles.bookingCard}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('BookingDetails', { bookingId: userBooking.id })}
          >
            <View style={styles.bookingIconContainer}>
              <Ionicons name="calendar-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.bookingInfo}>
              <Text style={styles.bookingTitle}>Ваша запись</Text>
              <Text style={styles.bookingDate}>{userBooking.date} в {userBooking.time}</Text>
              <Text style={styles.bookingService}>{userBooking.service}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" style={{ opacity: 0.7 }} />
          </TouchableOpacity>
        )}

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
            snapToInterval={screenWidth - 40}
            decelerationRate="fast"
          />
          <View style={styles.pagination}>
            {slides.map((_, i) => (
              <View
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
              style={[styles.quickActionCard, { backgroundColor: action.bgColor }]}
              onPress={() => navigation.navigate(action.route)}
              activeOpacity={0.7}
            >
              <Ionicons name={action.icon} size={32} color={action.color} />
              <View style={styles.quickActionText}>
                <Text style={styles.quickActionTitle}>{action.title}</Text>
                <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Popular Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Популярные товары</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("ProductList")}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>Все</Text>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
          ) : error ? (
            <Text style={styles.errorText}>Ошибка загрузки</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productsScrollView}
            >
              {popularProducts.map(renderProduct)}
            </ScrollView>
          )}
        </View>

        {/* Recent Orders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Последние заказы</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Orders")}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>История</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.recentOrdersContainer}>
            <TouchableOpacity style={styles.orderCard} activeOpacity={0.7}>
              <View style={styles.orderStatus}>
                <View style={[styles.orderStatusDot, { backgroundColor: '#34C759' }]} />
                <Text style={styles.orderStatusText}>Доставлен</Text>
              </View>
              <Text style={styles.orderNumber}>Заказ #12345</Text>
              <Text style={styles.orderDate}>15 июня, 14:30</Text>
              <Text style={styles.orderItems}>Шины Michelin x4</Text>
              <Text style={styles.orderPrice}>48 900 ₽</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.orderCard} activeOpacity={0.7}>
              <View style={styles.orderStatus}>
                <View style={[styles.orderStatusDot, { backgroundColor: '#FF9500' }]} />
                <Text style={styles.orderStatusText}>В пути</Text>
              </View>
              <Text style={styles.orderNumber}>Заказ #12346</Text>
              <Text style={styles.orderDate}>16 июня, 10:00</Text>
              <Text style={styles.orderItems}>Моторное масло 5W30</Text>
              <Text style={styles.orderPrice}>3 200 ₽</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Special Offers */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Специальные предложения</Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.offersScrollView}
          >
            <TouchableOpacity style={styles.offerCard} activeOpacity={0.9}>
              <View style={[styles.offerBadge, { backgroundColor: '#FF3B30' }]}>
                <Text style={styles.offerBadgeText}>-30%</Text>
              </View>
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=400' }} 
                style={styles.offerImage}
              />
              <View style={styles.offerContent}>
                <Text style={styles.offerTitle}>Летние шины</Text>
                <Text style={styles.offerDescription}>Скидка на весь ассортимент</Text>
                <Text style={styles.offerExpiry}>До 30 июня</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.offerCard} activeOpacity={0.9}>
              <View style={[styles.offerBadge, { backgroundColor: '#5856D6' }]}>
                <Text style={styles.offerBadgeText}>Акция</Text>
              </View>
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=400' }} 
                style={styles.offerImage}
              />
              <View style={styles.offerContent}>
                <Text style={styles.offerTitle}>Бесплатная диагностика</Text>
                <Text style={styles.offerDescription}>При покупке от 10 000 ₽</Text>
                <Text style={styles.offerExpiry}>Постоянно</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Наши услуги</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Services")}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>Все услуги</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.servicesContainer}>
            <TouchableOpacity style={styles.serviceCard} activeOpacity={0.7}>
              <View style={[styles.serviceIcon, { backgroundColor: '#007AFF15' }]}>
                <Ionicons name="build" size={24} color="#007AFF" />
              </View>
              <Text style={styles.serviceName}>Шиномонтаж</Text>
              <Text style={styles.servicePrice}>от 1 200 ₽</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.serviceCard} activeOpacity={0.7}>
              <View style={[styles.serviceIcon, { backgroundColor: '#34C75915' }]}>
                <Ionicons name="color-fill" size={24} color="#34C759" />
              </View>
              <Text style={styles.serviceName}>Замена масла</Text>
              <Text style={styles.servicePrice}>от 800 ₽</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.serviceCard} activeOpacity={0.7}>
              <View style={[styles.serviceIcon, { backgroundColor: '#FF950015' }]}>
                <Ionicons name="car" size={24} color="#FF9500" />
              </View>
              <Text style={styles.serviceName}>Диагностика</Text>
              <Text style={styles.servicePrice}>от 1 500 ₽</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.serviceCard} activeOpacity={0.7}>
              <View style={[styles.serviceIcon, { backgroundColor: '#5856D615' }]}>
                <Ionicons name="snow" size={24} color="#5856D6" />
              </View>
              <Text style={styles.serviceName}>Развал-схождение</Text>
              <Text style={styles.servicePrice}>от 2 000 ₽</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Cards */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.infoCardsContainer}
        >
          <View style={[styles.infoCard, { backgroundColor: '#007AFF' }]}>
            <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
            <Text style={styles.infoCardTitle}>Гарантия качества</Text>
            <Text style={styles.infoCardText}>На все товары и услуги</Text>
          </View>
          <View style={[styles.infoCard, { backgroundColor: '#34C759' }]}>
            <Ionicons name="time" size={24} color="#FFFFFF" />
            <Text style={styles.infoCardTitle}>Быстрая доставка</Text>
            <Text style={styles.infoCardText}>От 2 часов по городу</Text>
          </View>
          <View style={[styles.infoCard, { backgroundColor: '#FF9500' }]}>
            <Ionicons name="card" size={24} color="#FFFFFF" />
            <Text style={styles.infoCardTitle}>Рассрочка 0%</Text>
            <Text style={styles.infoCardText}>До 12 месяцев</Text>
          </View>
        </ScrollView>

        {/* Loyalty Program */}
        <View style={styles.loyaltyCard}>
          <View style={styles.loyaltyHeader}>
            <View>
              <Text style={styles.loyaltyTitle}>Ваша карта лояльности</Text>
              <Text style={styles.loyaltyLevel}>Золотой уровень</Text>
            </View>
            <TouchableOpacity style={styles.loyaltyButton}>
              <Ionicons name="qr-code" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.loyaltyStats}>
            <View style={styles.loyaltyStat}>
              <Text style={styles.loyaltyStatValue}>12 450</Text>
              <Text style={styles.loyaltyStatLabel}>баллов</Text>
            </View>
            <View style={styles.loyaltyStatDivider} />
            <View style={styles.loyaltyStat}>
              <Text style={styles.loyaltyStatValue}>7%</Text>
              <Text style={styles.loyaltyStatLabel}>скидка</Text>
            </View>
            <View style={styles.loyaltyStatDivider} />
            <View style={styles.loyaltyStat}>
              <Text style={styles.loyaltyStatValue}>3</Text>
              <Text style={styles.loyaltyStatLabel}>до следующего</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  headerGreeting: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    backgroundColor: '#FF3B30',
    borderRadius: 4,
  },
  
  // Booking Card
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    margin: 20,
    marginBottom: 0,
    padding: 16,
    borderRadius: 16,
  },
  bookingIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingTitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  bookingDate: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  bookingService: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  
  // Slider
  sliderContainer: {
    height: 200,
    marginTop: 20,
  },
  slide: {
    width: screenWidth - 40,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  slideGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'transparent',
    backgroundImage: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.8))',
  },
  slideTextWrap: {
    position: 'absolute',
    left: 20,
    bottom: 20,
    right: 20,
  },
  slideTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  slideSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
  },
  slideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  slideButtonText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 14,
    marginRight: 4,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C7C7CC',
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: '#000000',
    width: 18,
  },
  
  // Quick Actions
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  quickActionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  quickActionText: {
    marginLeft: 12,
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },
  
  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  seeAllText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '400',
  },
  
  // Products
  productsScrollView: {
    paddingHorizontal: 20,
  },
  productCard: {
    width: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
  },
  productImageContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 1,
  },
  discountText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  productName: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 8,
    lineHeight: 18,
    minHeight: 36,
  },
  productBottom: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  originalPrice: {
    fontSize: 14,
    color: '#8E8E93',
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
  stockIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Recent Orders
  recentOrdersContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  orderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  orderStatusText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000000',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 8,
  },
  orderItems: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 4,
  },
  orderPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    marginTop: 4,
  },
  
  // Special Offers
  offersScrollView: {
    paddingHorizontal: 20,
  },
  offerCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
  },
  offerBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 1,
  },
  offerBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  offerImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#F2F2F7',
  },
  offerContent: {
    padding: 16,
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  offerDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  offerExpiry: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  
  // Services
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  serviceCard: {
    width: (screenWidth - 40 - 12) / 2,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
    textAlign: 'center',
  },
  servicePrice: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  
  // Info Cards
  infoCardsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  infoCard: {
    width: 140,
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },
  infoCardText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  
  // Loyalty Card
  loyaltyCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#000000',
    borderRadius: 16,
    padding: 20,
  },
  loyaltyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  loyaltyTitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  loyaltyLevel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFD700',
  },
  loyaltyButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 12,
  },
  loyaltyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loyaltyStat: {
    flex: 1,
    alignItems: 'center',
  },
  loyaltyStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  loyaltyStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  loyaltyStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  
  // Others
  loader: {
    paddingVertical: 40,
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 15,
  },
});

export default HomeScreen;