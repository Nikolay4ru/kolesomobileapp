import React, { useCallback, useEffect, useRef } from 'react';
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { observer } from "mobx-react-lite";
import { useStores } from "./useStores";
import { useTheme } from "./contexts/ThemeContext";
import { View, StyleSheet, Platform, Text, TouchableOpacity, SafeAreaView, Animated } from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BlurView } from "@react-native-community/blur";
import { Linking } from 'react-native';
import { navigationRef } from './services/NavigationService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Импортируем экраны
import HomeScreen from "./screens/HomeScreen";
import FavoritesScreen from "./screens/FavoritesScreen";
import CartScreen from "./screens/CartScreen";
import ProfileScreen from "./screens/ProfileScreen";
import AuthScreen from "./screens/AuthScreen";
import NotificationsScreen from "./screens/NotificationsScreen";
import CodeVerificationScreen from "./screens/CodeVerificationScreen";
import BookingScreen from "./screens/BookingScreen";
import ServiceSelectionScreen from './screens/ServiceSelectionScreen';
import FilterAutoScreen from "./screens/FilterAutoScreen";
import FilterScreen from "./screens/FilterScreen";
import ProductListScreen from "./screens/ProductListScreen";
import FilterModalScreen from './screens/FilterModalScreen';
import ProductScreen from './screens/ProductScreen';
import OrdersScreen from './screens/OrdersScreen';
import OrderDetailScreen from './screens/OrderDetailScreen';
import StorageScreen from './screens/StorageScreen';
import GarageScreen from './screens/GarageScreen';
import AddToGarageScreen from './screens/AddToGarageScreen';
import StorageDetailScreen from './screens/StorageDetailScreen';
import CartIconWithBadge1 from './components/CartIconWithBadge';
import CheckoutScreen from './screens/CheckoutScreen';
import OrderSuccessScreen from './screens/OrderSuccessScreen';
import SettingsScreen from "./screens/SettingsScreen";
import LoyaltyCardScreen from './screens/LoyaltyCardScreen';
import PromotionsScreen from './screens/PromotionsScreen';
import StoresMapScreen from './screens/StoresMapScreen';

// Админские экраны
import ScanProductsScreen from './screens/AdminOrdersScreen';
import AdminOrdersScreen from './screens/AdminOrdersScreen';
import AdminOrderDetailScreen from './screens/AdminOrderDetail';
import VideoUploadScreen from './screens/VideoUploadScreen';
import AdminOrdersFilterScreen from './screens/AdminOrdersScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Вложенный Stack для вкладки "Home"
const HomeStack = () => {
  const { colors } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.headerBackground,
        },
        headerTintColor: colors.text,
        cardStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen name="HomeScreen" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProductList" component={ProductListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FilterAuto" component={FilterAutoScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Product" component={ProductScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }}/>
       <Stack.Screen name="LoyaltyCard" component={LoyaltyCardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Promotions" component={PromotionsScreen} options={{ headerShown: false }} />

       </Stack.Navigator>
  );
};

// Админский Stack
const AdminStack = () => {
  const { colors } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.headerBackground,
        },
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen 
        name="ScanProducts" 
        component={ScanProductsScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="AdminOrders" 
        component={AdminOrdersScreen} 
        options={{ 
          title: 'Заказы',
          headerBackTitleVisible: false,
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="AdminOrderDetail" 
        component={AdminOrderDetailScreen} 
        options={{ 
          title: 'Детали заказа',
          headerBackTitleVisible: false,
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="AdminOrdersFilter" 
        component={AdminOrdersFilterScreen} 
        options={{ 
          presentation: 'modal',
          title: 'Фильтры',
          headerBackTitleVisible: false,
        }} 
      />
      <Stack.Screen 
        name="VideoUpload" 
        component={VideoUploadScreen} 
        options={{ 
          title: 'Загрузка видео',
          headerBackTitleVisible: false,
          headerShown: false
        }} 
      />
    </Stack.Navigator>
  );
};

const ProfileStack = () => {
  const { colors } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.headerBackground,
        },
        headerTintColor: colors.text,
        cardStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen 
        name="Orders" 
        component={OrdersScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="OrderDetail" 
        component={OrderDetailScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Storages" component={StorageScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Garage" component={GarageScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AddToGarage" component={AddToGarageScreen} options={{ headerShown: false }} />
      <Stack.Screen 
        name="StorageDetail" 
        component={StorageDetailScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right'
        }}
      />
      <Stack.Screen 
        name="StoresMap" 
        component={StoresMapScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="Admin" 
        component={AdminStack} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

// Вложенный Stack для вкладки "Cart"
const CartStack = () => {
  const { colors } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.headerBackground,
        },
        headerTintColor: colors.primary,
        cardStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen name="CartScreen" component={CartScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="ProductModal"
        component={ProductScreen}
        options={{
          presentation: 'modal',
          headerShown: false,
          cardOverlayEnabled: true,
          gestureEnabled: true
        }}
      />
      <Stack.Screen 
        name="Checkout" 
        component={CheckoutScreen} 
        options={{ 
          headerShown: true,
          headerTitle: 'Оформление заказа',
          headerBackTitleVisible: false,
          headerStyle: {
            backgroundColor: colors.headerBackground,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          }
        }} 
      />
      <Stack.Screen 
        name="OrderSuccess" 
        component={OrderSuccessScreen} 
        options={{ 
          headerShown: false,
          gestureEnabled: false
        }} 
      />
    </Stack.Navigator>
  );
};

const ServicePages = () => {
  return (
    <Stack.Navigator initialRouteName="ServiceSelection">
      <Stack.Screen 
        name="ServiceSelection" 
        component={ServiceSelectionScreen} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};




// Исправленный CustomTabBar с улучшенной поддержкой Android
const CustomTabBar = observer(({ state, descriptors, navigation }) => {
  const { cartStore } = useStores();
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const animatedValues = useRef(
    state.routes.map(() => new Animated.Value(0))
  ).current;

  // Вычисляем высоту TabBar с учетом системной навигации
  const tabBarHeight = Platform.select({
    ios: 88,
    android: 56,
  });

  // Добавляем отступ снизу для Android
  const bottomPadding = Platform.select({
    ios: 0,
    android: insets.bottom > 0 ? insets.bottom : 0, // Учитываем системную навигацию
  });

  const CartIconWithBadge = ({ count, focused }) => {
  const { colors } = useTheme();
  
  return (
    <View>
      <Ionicons
        name={focused ? 'cart' : 'cart-outline'}
        size={24}
        color={focused ? colors.primary : colors.textSecondary}
      />
      {count > 0 && (
        <View style={{
          position: 'absolute',
          right: -8,
          top: -4,
          backgroundColor: colors.error,
          borderRadius: 10,
          minWidth: 20,
          height: 20,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 4,
        }}>
          <Text style={{
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 'bold',
          }}>
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      )}
    </View>
  );
};

  useEffect(() => {
    animatedValues.forEach((animatedValue, index) => {
      const isFocused = state.index === index;
      Animated.spring(animatedValue, {
        toValue: isFocused ? 1 : 0,
        useNativeDriver: true,
        tension: 120,
        friction: 7,
      }).start();
    });
  }, [state.index, animatedValues]);

  const styles = StyleSheet.create({
    tabBarWrapper: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'transparent',
    },
    tabBarContainer: {
      height: tabBarHeight + bottomPadding,
      backgroundColor: 'transparent',
      elevation: 0,
    },
    blurView: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden',
    },
    tabBar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      height: tabBarHeight,
      backgroundColor: Platform.select({
        ios: theme === 'dark' ? 'rgba(28, 28, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        android: colors.tabBar,
      }),
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 8,
      paddingBottom: Platform.select({
        ios: 20,
        android: 8,
      }),
      // Тени для Android
      ...(Platform.OS === 'android' && {
        elevation: 8,
        shadowColor: colors.shadow,
      }),
      // Тени для iOS
      ...(Platform.OS === 'ios' && {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: theme === 'dark' ? 0.2 : 0.08,
        shadowRadius: 16,
      }),
      borderTopWidth: 0.5,
      borderTopColor: colors.tabBarBorder,
    },
    // Дополнительный контейнер для безопасной области на Android
    safeAreaPadding: {
      height: bottomPadding,
      backgroundColor: colors.tabBar,
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 44,
      minHeight: 44,
      position: 'relative',
    },
    tabIconContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 44,
      height: 44,
      borderRadius: 22,
      position: 'relative',
    },
    activeBackground: {
      position: 'absolute',
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme === 'dark' 
        ? 'rgba(10, 132, 255, 0.15)' 
        : 'rgba(37, 235, 232, 0.1)',
      // Упрощенные тени для Android
      ...(Platform.OS === 'android' && {
        elevation: 2,
      }),
      ...(Platform.OS === 'ios' && {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      }),
    },
    activeIndicator: {
      position: 'absolute',
      bottom: -8,
      width: 24,
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.primary,
      // Упрощенные тени для Android
      ...(Platform.OS === 'android' && {
        elevation: 1,
      }),
      ...(Platform.OS === 'ios' && {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
      }),
    },
  });

  const renderTabItem = (route, index) => {
    const { options } = descriptors[route.key];
    const isFocused = state.index === index;
    const iconName = getIconName(route.name, isFocused);
    const animatedValue = animatedValues[index];

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    const scaleValue = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.1],
    });

    const translateY = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -2],
    });

    return (
      <TouchableOpacity
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        testID={options.tabBarTestID}
        onPress={onPress}
        style={styles.tabItem}
        activeOpacity={0.7}
      >
        <Animated.View 
          style={[
            styles.tabIconContainer,
            {
              transform: [
                { scale: scaleValue },
                { translateY: translateY }
              ]
            }
          ]}
        >
          
          {route.name === 'Cart' ? (
            <CartIconWithBadge 
              count={cartStore.totalItems} 
              focused={isFocused} 
            />
          ) : (
            <Animated.View>
              <Ionicons
                name={iconName}
                size={24}
                color={isFocused ? colors.primary : colors.textSecondary}
                style={{
                  textShadowColor: isFocused ? 'transparent' : 'transparent',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: isFocused ? 0 : 0,
                }}
              />
            </Animated.View>
          )}
          {isFocused && (
            <Animated.View 
              style={[
                styles.activeIndicator,
                {
                  opacity: animatedValue,
                  transform: [
                    {
                      scaleX: animatedValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 1],
                      })
                    }
                  ]
                }
              ]} 
            />
          )}
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.tabBarWrapper}>
      <View style={styles.tabBarContainer}>
        {Platform.OS === 'ios' && (
          <BlurView
            style={styles.blurView}
            blurType={theme === 'dark' ? 'dark' : 'ultraThinMaterial'}
            blurAmount={25}
            reducedTransparencyFallbackColor={
              theme === 'dark' ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)'
            }
          />
        )}
        <View style={styles.tabBar}>
          {state.routes.map((route, index) => renderTabItem(route, index))}
        </View>
        {/* Дополнительный отступ для Android с системной навигацией */}
        {Platform.OS === 'android' && bottomPadding > 0 && (
          <View style={styles.safeAreaPadding} />
        )}
      </View>
    </View>
  );
});

// Функция для получения имени иконки
const getIconName = (routeName, isFocused) => {
   switch (routeName) {
    case 'Home':
      return isFocused ? 'home' : 'home-outline';
    case 'Favorites':
      return isFocused ? 'heart' : 'heart-outline';
    case 'Cart':
      return isFocused ? 'cart' : 'cart-outline';
    case 'ProfileMenu':
      return isFocused ? 'person' : 'person-outline';
    default:
      return 'help-circle-outline';
  }
};


const MainTabs = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Важно: отключаем стандартные safe area для Android
        tabBarHideOnKeyboard: true,
        // Добавляем отступ для контента
        sceneContainerStyle: {
          backgroundColor: colors.background,
          // Добавляем отступ снизу для контента, чтобы он не перекрывался TabBar
          paddingBottom: Platform.select({
            ios: 0,
            android: 56 + insets.bottom, // высота TabBar + системная навигация
          }),
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
       <Tab.Screen name="Cart" component={CartStack} />
      <Tab.Screen name="ProfileMenu" component={ProfileStack} />
    </Tab.Navigator>
  );
};

const AuthStack = () => {
  const { colors } = useTheme();
  
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        cardStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="CodeVerification" component={CodeVerificationScreen} />
    </Stack.Navigator>
  );
};

// Основной навигационный компонент
const NavigationContent = observer(() => {
  const { authStore } = useStores();
  const { colors, theme } = useTheme();
  //const navigationRef = useRef();
  const routeQueueRef = useRef([]); 

  const processRouteQueue = useCallback(() => {
    if (navigationRef.current && routeQueueRef.current.length > 0) {
      routeQueueRef.current.forEach(route => {
        navigationRef.current?.navigate(...route);
      });
      routeQueueRef.current = [];
    }
  }, []);

  const handleDeepLink = useCallback((url) => {
    if (!url) return;

    console.log('Processing deep link:', url);
    
    if (url.includes('koleso.app://product/')) {
      const productId = url.split('koleso.app://product/')[1].split('?')[0];
      const route = [
        'MainTabs', 
        { 
          screen: 'Home', 
          params: { 
            screen: 'Product', 
            params: { productId } 
          } 
        }
      ];

      if (navigationRef.current) {
        navigationRef.current.navigate(...route);
      } else {
        routeQueueRef.current.push(route);
      }
    }
  }, []);

  useEffect(() => {
    const processInitialUrl = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        handleDeepLink(initialUrl);
      } catch (error) {
        console.error('Error processing initial URL:', error);
      }
    };

    processInitialUrl();

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleDeepLink]);

  useEffect(() => {
    processRouteQueue();
  }, [processRouteQueue]);

  const linking = {
    prefixes: ['koleso.app://', 'https://koleso.app'],
    config: {
      screens: {
        Home: 'home',
        Product: {
          path: 'product/:id',
          screens: {}
        },
      },
    },
  };

  // Тема для NavigationContainer
  const navigationTheme = {
    dark: theme === 'dark',
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.error,
    },
  };

  return (
    <NavigationContainer ref={navigationRef} linking={linking} theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          cardStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        {authStore.isLoggedIn ? (
          <>
            <Stack.Screen 
              name="MainTabs" 
              component={MainTabs} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="Booking" 
              component={ServicePages} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="FilterScreen" 
              component={FilterScreen} 
              options={{ presentation: 'modal', headerShown: false }} 
            />
            <Stack.Screen 
              name="FilterModalScreen" 
              component={FilterModalScreen} 
              options={{ presentation: 'modal', headerShown: false }} 
            />
          </>
        ) : (
          <Stack.Screen 
            name="AuthStack" 
            component={AuthStack} 
            options={{ headerShown: false, gestureEnabled: false }} 
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
});

// Обертка для использования вне провайдеров
const Navigation = () => {
  return <NavigationContent />;
};

export default Navigation;