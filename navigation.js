import React, { useCallback, useEffect, useRef } from 'react';
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { observer } from "mobx-react-lite";
import { useStores } from "./useStores";
import { View, StyleSheet, Platform, TouchableOpacity, Animated } from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BlurView } from "@react-native-community/blur";
// Импортируем экраны
import HomeScreen from "./screens/HomeScreen";
import FavoritesScreen from "./screens/FavoritesScreen";
import CartScreen from "./screens/CartScreen";
import ProfileScreen from "./screens/ProfileScreen";
import AuthScreen from "./screens/AuthScreen";
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
import CartIconWithBadge from './components/CartIconWithBadge';
import CheckoutScreen from './screens/CheckoutScreen';
import OrderSuccessScreen from './screens/OrderSuccessScreen';
import DeepLinkHandler from './components/DeepLinkHandler';
import ShareHelper from './components/Share';
import { Linking } from 'react-native';

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
  return (
    <Stack.Navigator>
      <Stack.Screen name="HomeScreen" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProductList" component={ProductListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FilterAuto" component={FilterAutoScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Product" component={ProductScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

// Админский Stack
const AdminStack = () => {
  return (
    <Stack.Navigator>
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
          headerTintColor: '#2563eb',
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="AdminOrderDetail" 
        component={AdminOrderDetailScreen} 
        options={{ 
          title: 'Детали заказа',
          headerBackTitleVisible: false,
          headerTintColor: '#2563eb',
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
          headerTintColor: '#2563eb',
        }} 
      />
       
      <Stack.Screen 
        name="VideoUpload" 
        component={VideoUploadScreen} 
        options={{ 
          title: 'Загрузка видео',
          headerBackTitleVisible: false,
          headerTintColor: '#2563eb',
          headerShown: false
        }} 
      />
    </Stack.Navigator>
  );
};

const ProfileStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen 
        name="Orders" 
        component={OrdersScreen} 
        options={{ 
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="OrderDetail" 
        component={OrderDetailScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Storages" component={StorageScreen} options={{ headerShown: false }}  />
      <Stack.Screen name="Garage" component={GarageScreen} options={{ headerShown: false }}  />
       <Stack.Screen name="AddToGarage" component={AddToGarageScreen} options={{ headerShown: false }}  />
      <Stack.Screen 
        name="StorageDetail" 
        component={StorageDetailScreen} 
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
  return (
    <Stack.Navigator>
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
          headerTintColor: '#2563eb',
          headerStyle: {
            backgroundColor: '#ffffff',
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

const CustomTabBar = observer(({ state, descriptors, navigation }) => {
  const { cartStore } = useStores();
  const animatedValues = useRef(
    state.routes.map(() => new Animated.Value(0))
  ).current;

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

  return (
    <View style={styles.tabBarContainer}>
      {Platform.OS === 'ios' && (
        <BlurView
          style={styles.blurView}
          blurType="ultraThinMaterial"
          blurAmount={25}
          reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.95)"
        />
      )}
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
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
                {isFocused && (
                  <Animated.View 
                    style={[
                      styles.activeBackground,
                      {
                        opacity: animatedValue,
                      }
                    ]} 
                  />
                )}
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
                      color={isFocused ? '#4A9B8E' : '#64748b'}
                      style={{
                        textShadowColor: isFocused ? '#E6FFF9' : 'transparent',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 4,
                      }}
                    />
                  </Animated.View>
                )}
              </Animated.View>
              {isFocused && (
                <Animated.View 
                  style={[
                    styles.activeIndicator,
                    {
                      opacity: animatedValue,
                      transform: [{
                        scaleX: animatedValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 1],
                        })
                      }]
                    }
                  ]} 
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

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
      return 'home';
  }
};

const MainTabs = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Cart" component={CartStack} />
      <Tab.Screen name="ProfileMenu" component={ProfileStack} />
    </Tab.Navigator>
  );
};

const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CodeVerification" component={CodeVerificationScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 88 : 70,
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
    height: Platform.OS === 'ios' ? 88 : 70,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.9)' : '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 20,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  tabItem: {
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
    backgroundColor: 'rgba(37, 235, 232, 0.1)',
    shadowColor: '#E6FFF9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -12,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#E6FFF9',
    shadowColor: '#E6FFF9',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },
});

const Navigation = () => {
  const { authStore } = useStores();
  const navigationRef = useRef();
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

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator>
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
};

export default observer(Navigation);