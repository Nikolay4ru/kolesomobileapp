import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { observer } from "mobx-react-lite";
import { useStores } from "./useStores";
import { View, StyleSheet, Platform, TouchableOpacity } from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BlurView } from "@react-native-community/blur";
// Импортируем экраны
import HomeScreen from "./screens/HomeScreen1";
import FavoritesScreen from "./screens/FavoritesScreen";
import CartScreen from "./screens/CartScreen";
import ProfileScreen from "./screens/ProfileScreen";
import AuthScreen from "./screens/AuthScreen";
import CodeVerificationScreen from "./screens/CodeVerificationScreen";
import BookingScreen from "./screens/BookingScreen";
import FilterScreen from "./screens/FilterScreen";
import ProductListScreen from "./screens/ProductListScreen";
import FilterModalScreen from './screens/FilterModalScreen';
import ProductScreen from './screens/ProductScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Вложенный Stack для вкладки "Home"
const HomeStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="HomeScreen" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProductList" component={ProductListScreen} options={{ headerShown: false,  }} />
      <Stack.Screen name="Product" component={ProductScreen} options={{ headerShown: false }} />
      
    </Stack.Navigator>
  );
};

// Кастомный TabBar
const CustomTabBar = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.tabBarContainer}>
      {/* Blur эффект (для iOS) */}
      {Platform.OS === 'ios' && (
        <BlurView
          style={styles.blurView}
          blurType="light"
          blurAmount={10}
          reducedTransparencyFallbackColor="white"
        />
      )}
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const iconName = getIconName(route.name, isFocused);

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

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              style={styles.tabItem}
            >
              <Ionicons
                name={iconName}
                size={24}
                color={isFocused ? '#3d3c3a' : '#c3bfbc'}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const getIconName = (routeName, isFocused) => {
  switch (routeName) {
    case 'Home':
      return isFocused ? 'home' : 'home-outline';
    case 'Favorites':
      return isFocused ? 'heart' : 'heart-outline';
    case 'Cart':
      return isFocused ? 'cart' : 'cart-outline';
    case 'Profile':
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
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: 'transparent',
    elevation: 0,
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 70,
    backgroundColor: 'white',
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginBottom: 20,
  },
  activeIndicator: {
    width: 5,
    height: 5,
    borderRadius: 5,
    backgroundColor: '#FF6C00',
    marginTop: 5,
  },
});

const Navigation = () => {
  const { authStore } = useStores();

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {authStore.isLoggedIn ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="Booking" component={BookingScreen} options={{ headerShown: false }} />
            <Stack.Screen name="FilterScreen" component={FilterScreen} options={{ presentation: 'modal', headerShown: false, }} />
            <Stack.Screen name="FilterModalScreen" component={FilterModalScreen} options={{ presentation: 'modal', headerShown: false, }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Auth" component={AuthScreen} options={{ headerTitle: 'Авторизация' }} />
            <Stack.Screen name="CodeVerification" component={CodeVerificationScreen} options={{ headerTitle: 'Подтверждение' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default observer(Navigation);