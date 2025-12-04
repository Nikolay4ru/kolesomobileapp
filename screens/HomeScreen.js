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
  Platform,
} from 'react-native';
import { useNavigation } from "@react-navigation/native";
import { observer } from 'mobx-react-lite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import SearchModal from '../components/SearchModal';
import NotificationBadge from '../components/NotificationBadge';
import { useStores } from '../useStores';
import BannerNotificationPermission from '../components/BannerNotificationPermission';


const API_URL = 'https://api.koleso.app/api';
const { width: screenWidth } = Dimensions.get('window');

const HomeScreen = observer(() => {
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);

  const { authStore, ordersStore } = useStores();

  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(null);


  const [activeSlide, setActiveSlide] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [popularProducts, setPopularProducts] = useState([]);
  const [error, setError] = useState(null);
  const [userBooking, setUserBooking] = useState(null);
  const slidesRef = useRef(null);
  const [slides, setSlides] = useState([]);
  const [slidesLoading, setSlidesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  //authStore.debugNotificationState();

  const handleOpenSettings = () => {
    // Открыть настройки приложения (RN Linking)
    Linking.openSettings();
  };


  // Добавьте функцию загрузки новостей
const fetchNews = async () => {
  try {
    setSlidesLoading(true);
    const response = await fetch('https://api.koleso.app/api/news.php');
    
    const data = await response.json();
    console.log(data);
    if (data.success && data.news.length > 0) {
      // Преобразуем данные API в формат слайдов
      const newsSlides = data.news.map(item => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        image: item.image,
        linkUrl: item.linkUrl,
        backgroundColor: theme === 'dark' ? '#2C2C2E' : '#1a1a1a'
      }));
      setSlides(newsSlides);
    } else {
      // Если нет новостей, используем заглушки
      //setSlides(getDefaultSlides());
    }
  } catch (error) {
    console.error('Error fetching news:', error);
    setSlidesLoading(false);
  } finally {
    setSlidesLoading(false);
  }
};



// Загрузка заказов пользователя
useEffect(() => {
  const fetchOrders = async () => {
    if (!authStore.isLoggedIn) {
      setOrdersLoading(false);
      return;
    }
    
    try {
      setOrdersLoading(true);
      await ordersStore.loadOrders(authStore.token);
      setOrdersError(null);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setOrdersError(err.message);
    } finally {
      setOrdersLoading(false);
    }
  };
  
  fetchOrders();
}, [authStore.isLoggedIn, authStore.token]);


// Получение конфигурации статуса заказа
const getStatusConfig = (status) => {
  const statusConfigs = {
    'new': { 
      text: 'Новый', 
      color: colors.warning,
      dotColor: colors.warning
    },
    'processing': { 
      text: 'В обработке', 
      color: colors.primary,
      dotColor: colors.primary
    },
    'shipped': { 
      text: 'Отправлен', 
      color: '#5856D6',
      dotColor: '#5856D6'
    },
    'delivered': { 
      text: 'Доставлен', 
      color: colors.success,
      dotColor: colors.success
    },
    'cancelled': { 
      text: 'Отменен', 
      color: colors.error,
      dotColor: colors.error
    },
    'Отменён (Удален)': { 
      text: 'Отменен', 
      color: colors.error,
      dotColor: colors.error
    },
     'delivered': { 
      text: 'Завершен', 
      color: colors.success,
      dotColor: colors.success
    }
  };
  
 return statusConfigs[status] || { 
      text: status, 
      color: colors.primary,
      dotColor: colors.primary
    };
  };

// Форматирование даты заказа
const formatOrderDate = (dateString) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day} ${month}, ${hours}:${minutes}`;
  } catch (e) {
    return dateString;
  }
};

// Получение названия первого товара в заказе
const getFirstItemName = (order) => {
  if (!order.items || order.items.length === 0) {
    return 'Товары';
  }
  
  const firstItem = order.items[0];
  const itemCount = order.items.length;
  
  if (itemCount > 1) {
    return `${firstItem.name} и еще ${itemCount - 1}`;
  }
  
  return firstItem.name;
};



  // Загрузка данных пользователя и записей
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const bookingResponse = await fetch(`${API_URL}/user_booking.php`);
        const bookingData = await bookingResponse.json();
        
        if (bookingData.success && bookingData.data) {
          setUserBooking(bookingData.data);
        }
      } catch (err) {
        console.error('Error fetching user booking:', err);
      }
    };
      fetchNews();
   // fetchUserData();
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

  const quickActions = [
    {
      id: '1',
      title: 'Подбор по авто',
      subtitle: 'Найдем подходящие товары',
      icon: 'car-sport',
      color: colors.primary,
      bgColor: theme === 'dark' ? colors.surface : '#E3F2FF',
      route: 'FilterAuto'
    },
    {
      id: '2',
      title: 'Записаться',
      subtitle: 'На сервис и шиномонтаж',
      icon: 'calendar',
      color: colors.success,
      bgColor: theme === 'dark' ? colors.surface : '#E8F5E8',
      route: 'Booking'
    }
  ];

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

useEffect(() => {
  // Проверяем, что слайды загружены и их больше одного
  if (!slides?.length || slides.length <= 1) {
    return; // Нет смысла крутить карусель с 0 или 1 слайдом
  }

  const timer = setTimeout(() => {
    const nextSlide = (activeSlide + 1) % slides.length;
    slidesRef.current?.scrollToIndex({ index: nextSlide, animated: true });
    setActiveSlide(nextSlide);
  }, 5000);
  
  return () => clearTimeout(timer);
}, [activeSlide, slides]);

const renderSlide = ({ item }) => (
    <TouchableOpacity 
      style={styles.slide} 
      activeOpacity={0.95}
      onPress={() => navigation.navigate('Promotions', { promo: item })}
    >
      <Image 
        source={{ uri: item.image }} 
        style={styles.slideImage}
        resizeMode="cover"
      />
      {/* Градиентный оверлей */}
      <View style={styles.slideGradientOverlay} />
      
      <View style={styles.slideTextWrap}>
        {/* Полупрозрачная подложка под текстом */}
        <View style={styles.slideTextBackground}>
          <Text style={styles.slideTitle}>{item.title}</Text>
          <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
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
        <View style={[styles.stockDot, { backgroundColor: item.inStock ? colors.success : colors.warning }]} />
        <Text style={[styles.stockText, { color: item.inStock ? colors.success : colors.warning }]}>
          {item.inStock ? "В наличии" : "Под заказ"}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar 
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setSearchModalVisible(true)}
          >
            <Ionicons name="search-outline" size={24} color={colors.text} />
          </TouchableOpacity>
         <NotificationBadge style={styles.headerButton} />
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scrollView}
      >
  
  {slidesLoading && (
  <View>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
)}
        {/* Slider */}
        {slides.length == 0 ? (
  <View>

  </View>
) : (
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
      viewabilityConfig={viewConfigRef.current}
      keyExtractor={(item) => item.id}
    />
    {/* Индикаторы слайдов */}
    <View style={styles.pagination}>
      {slides.map((_, index) => (
        <View
          key={index}
          style={[
            styles.paginationDot,
            activeSlide === index && styles.paginationDotActive
          ]}
        />
      ))}
    </View>
  </View>
)}


  <TouchableOpacity 
          style={styles.loyaltyCard} 
          activeOpacity={0.95}
          onPress={() => navigation.navigate('LoyaltyCard')}
        >
          <View style={styles.loyaltyHeader}>
            <View>
              <Text style={styles.loyaltyTitle}>Ваша карта лояльности</Text>
              <Text style={[styles.loyaltyStatValue, { fontSize: 20, marginTop: 4 }]}>12 450 <Text style={styles.loyaltyStatLabel}>баллов</Text></Text>
            </View>
            <View style={styles.loyaltyButton}>
              <Ionicons name="qr-code" size={24} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.loyaltyStats}>
            <View style={styles.loyaltyStat}>
              <Text style={styles.loyaltyStatValue}>3%</Text>
              <Text style={styles.loyaltyStatLabel}>Оплата баллами</Text>
            </View>
            <View style={styles.loyaltyStatDivider} />
            <View style={styles.loyaltyStat}>
              <Text style={styles.loyaltyStatValue}>500</Text>
              <Text style={styles.loyaltyStatLabel}>Приветственные баллы</Text>
            </View>
            <View style={styles.loyaltyStatDivider} />
            <View style={styles.loyaltyStat}>
              <Text style={styles.loyaltyStatValue}>-30%</Text>
              <Text style={styles.loyaltyStatLabel}>на шиномонтаж</Text>
            </View>
          </View>
        </TouchableOpacity>


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
            <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
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
{authStore.isLoggedIn && (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Последние заказы</Text>
      <TouchableOpacity
       onPress={() => navigation.navigate("ProfileMenu", { 
    screen: "Orders" 
  })}
        activeOpacity={0.7}
      >
        <Text style={styles.seeAllText}>История</Text>
      </TouchableOpacity>
    </View>
    
    {ordersLoading ? (
      <View style={styles.ordersLoadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    ) : ordersError ? (
      <View style={styles.ordersErrorContainer}>
        <Text style={styles.ordersErrorText}>Не удалось загрузить заказы</Text>
      </View>
    ) : ordersStore.orders.length === 0 ? (
      <View style={styles.noOrdersContainer}>
        <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} />
        <Text style={styles.noOrdersText}>У вас пока нет заказов</Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('FilterAuto')}
          activeOpacity={0.7}
        >
          <Text style={styles.browseButtonText}>Начать покупки</Text>
        </TouchableOpacity>
      </View>
    ) : (
      <View style={styles.recentOrdersContainer}>
        {ordersStore.orders.slice(0, 2).map((order) => {
          const statusConfig = getStatusConfig(order.status);
          
          return (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ProfileMenu', {
    screen: 'OrderDetail',
    params: { orderId: order.id }
  })}
            >
              <View style={styles.orderStatus}>
                <View style={[styles.orderStatusDot, { backgroundColor: statusConfig.dotColor }]} />
                <Text style={[styles.orderStatusText, { color: statusConfig.color }]}>
                  {statusConfig.text}
                </Text>
              </View>
              <Text style={styles.orderNumber}>Заказ №{order.order_number}</Text>
              <Text style={styles.orderDate}>{formatOrderDate(order.created_at)}</Text>
              <Text style={styles.orderItems} numberOfLines={1}>
                {getFirstItemName(order)}
              </Text>
              <Text style={styles.orderPrice}>
                {parseFloat(order.total_amount).toLocaleString('ru-RU')} ₽
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    )}
  </View>
)}


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
            <TouchableOpacity style={styles.offerCard} activeOpacity={0.9}
            onPress={() => navigation.navigate('Promotions')}>
              <View style={[styles.offerBadge, { backgroundColor: colors.error }]}>
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
            
            <TouchableOpacity style={styles.offerCard} activeOpacity={0.9}
            onPress={() => navigation.navigate('Promotions')}>
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
              onPress={() => navigation.navigate("Booking")}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>Записаться</Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.servicesScrollView}
            style={styles.servicesContainer}
          >
            <TouchableOpacity 
              style={styles.serviceCard} 
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Booking")}
            >
              <View style={[styles.serviceIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="build" size={24} color={colors.primary} />
              </View>
              <Text style={styles.serviceName}>Шиномонтаж</Text>
              <Text style={styles.servicePrice}>от 1 200 ₽</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.serviceCard} 
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Storages")}
            >
              <View style={[styles.serviceIcon, { backgroundColor: colors.success + '15' }]}>
                <Ionicons name="archive" size={24} color={colors.success} />
              </View>
              <Text style={styles.serviceName}>Хранение</Text>
              <Text style={styles.servicePrice}>от 2 500 ₽</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.serviceCard} 
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Booking")}
            >
              <View style={[styles.serviceIcon, { backgroundColor: colors.warning + '15' }]}>
                <Ionicons name="disc" size={24} color={colors.warning} />
              </View>
              <Text style={styles.serviceName}>Правка дисков</Text>
              <Text style={styles.servicePrice}>от 1 500 ₽</Text>
            </TouchableOpacity>
            
            {/* Можно добавить больше услуг здесь */}
          </ScrollView>
        </View>

        {/* Info Cards */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.infoCardsContainer}
        >
          <View style={[styles.infoCard, { backgroundColor: colors.primary }]}>
            <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
            <Text style={styles.infoCardTitle}>Гарантия качества</Text>
            <Text style={styles.infoCardText}>На все товары и услуги</Text>
          </View>
          <View style={[styles.infoCard, { backgroundColor: colors.success }]}>
            <Ionicons name="time" size={24} color="#FFFFFF" />
            <Text style={styles.infoCardTitle}>Быстрая доставка</Text>
            <Text style={styles.infoCardText}>От 2 часов по городу</Text>
          </View>
          <View style={[styles.infoCard, { backgroundColor: colors.warning }]}>
            <Ionicons name="card" size={24} color="#FFFFFF" />
            <Text style={styles.infoCardTitle}>Рассрочка 0%</Text>
            <Text style={styles.infoCardText}>До 12 месяцев</Text>
          </View>
        </ScrollView>

        <View style={{ height: 100 }} />
      </ScrollView>
     {/* {authStore.isNotificationDenied && (
        <BannerNotificationPermission onPressSettings={handleOpenSettings} />
      )} */}
      {/* Search Modal */}
      <SearchModal 
        isOpen={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
      />
    </View>
  );
});

const themedStyles = (colors, theme) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.card,
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
    backgroundColor: colors.error,
    borderRadius: 4,
  },
  
  // Loyalty Card
  loyaltyCard: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 0,
    backgroundColor: theme === 'dark' ? colors.primary : '#000000',
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
    textAlign: 'center',
  },
  loyaltyStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Стили для состояния загрузки заказов
  ordersLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Стили для состояния ошибки
  ordersErrorContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ordersErrorText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  
  // Стили для пустого состояния
  noOrdersContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noOrdersText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 20,
  },
  browseButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Booking Card
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
  height: 220,
  marginTop: 5,
},
slide: {
  width: screenWidth - 40,
  marginHorizontal: 20,
  borderRadius: 16,
  overflow: 'hidden',
  backgroundColor: theme === 'dark' ? colors.surface : '#000',
},
slideImage: {
  width: '100%',
  height: '100%',
},
// Новый градиентный оверлей
slideGradientOverlay: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: '60%', // Градиент занимает 60% высоты снизу
  backgroundColor: 'rgba(0, 0, 0, 0)',
  // Для Android используем простой фон, для iOS можно использовать библиотеку linear-gradient
  ...Platform.select({
    ios: {
      // Для iOS можно установить react-native-linear-gradient
      opacity: 0.8,
    },
    android: {
      opacity: 0.8,
    },
  }),
  // Эмуляция градиента через несколько слоев
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -50 },
  shadowOpacity: 0.9,
  shadowRadius: 50,
  elevation: 5,
},
slideTextWrap: {
  position: 'absolute',
  left: 0,
  bottom: 0,
  right: 0,
},
// Полупрозрачная подложка под текстом с blur эффектом
slideTextBackground: {
  backgroundColor: 'rgba(0, 0, 0, 0.5)', // Полупрозрачный черный фон
  borderRadius: 0,
  padding: 12,
  marginBottom: 0,
  // Эффект размытия (работает на iOS, на Android будет просто полупрозрачный фон)
  ...(Platform.OS === 'ios' && {
    backdropFilter: 'blur(10px)',
  }),
},
slideTitle: {
  fontSize: 20,
  fontWeight: '700',
  color: '#FFFFFF',
  marginBottom: 4,
  // Тень для текста для дополнительной читаемости
  textShadowColor: 'rgba(0, 0, 0, 0.8)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
},
slideSubtitle: {
  fontSize: 14,
  color: 'rgba(255, 255, 255, 0.95)',
  lineHeight: 18,
  // Тень для текста
  textShadowColor: 'rgba(0, 0, 0, 0.8)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
},
slideButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FFFFFF',
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 100,
  alignSelf: 'flex-start',
  // Тень для кнопки
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 5,
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
  backgroundColor: colors.textTertiary,
  marginHorizontal: 3,
  opacity: 0.4,
},
paginationDotActive: {
  backgroundColor: theme === 'dark' ? colors.primary : '#FFFFFF',
  width: 18,
  opacity: 1,
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
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    marginLeft: 12,
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
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
    color: colors.text,
  },
  seeAllText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '400',
  },
  
  // Products
  productsScrollView: {
    paddingHorizontal: 20,
  },
  productCard: {
    width: 160,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImageContainer: {
    backgroundColor: colors.surface,
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
    backgroundColor: colors.error,
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
    color: colors.text,
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
    color: colors.text,
  },
  originalPrice: {
    fontSize: 14,
    color: colors.textSecondary,
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
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    color: colors.text,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  orderItems: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  orderPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  
  // Special Offers
  offersScrollView: {
    paddingHorizontal: 20,
  },
  offerCard: {
    width: 280,
    backgroundColor: colors.card,
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: colors.surface,
  },
  offerContent: {
    padding: 16,
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  offerDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  offerExpiry: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  
  // Services
 servicesContainer: {
    paddingHorizontal: 20,
  },
  servicesScrollView: {
    paddingVertical: 4,
  },
  serviceCard: {
    width: screenWidth < 380 ? 110 : 120, // Адаптивная ширина
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginRight: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  servicePrice: {
    fontSize: 14,
    color: colors.textSecondary,
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
  
  // Others
  loader: {
    paddingVertical: 40,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 15,
  },
});

export default HomeScreen;