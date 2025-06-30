import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useNavigation } from "@react-navigation/native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useStores } from '../useStores';
import { MMKV } from 'react-native-mmkv';
import axios from 'axios';

const API_URL = 'https://api.koleso.app/api';
const storage = new MMKV();

const NotificationBadge = ({ style }) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { authStore } = useStores();
  const [unreadCount, setUnreadCount] = useState(0);
console.log('NotificationBadge mounted');
console.log('AuthStore isAuthenticated:', authStore);
  useEffect(() => {
    // Получаем количество непрочитанных уведомлений при монтировании
    if (authStore.isLoggedIn) {
      fetchUnreadCount();

      // Обновляем каждые 30 секунд
      const interval = setInterval(fetchUnreadCount, 30000);

      // Подписываемся на события навигации для обновления при возврате на экран
      const unsubscribe = navigation.addListener('focus', () => {
        fetchUnreadCount();
      });

      return () => {
        clearInterval(interval);
        unsubscribe();
      };
    }
  }, [navigation, authStore.isLoggedIn]);

  const fetchUnreadCount = async () => {
    try {
      // Получаем токен из MMKV
      const token = authStore.token;
      console.log('Fetching unread notifications count with token:', token);
      if (!token) {
        setUnreadCount(0);
        return;
      }

      const response = await axios.get(`${API_URL}/notifications_count.php`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = response.data;
      console.log(response);
      
      if (data.success) {
        setUnreadCount(data.unread_count || 0);
      } else {
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error fetching unread notifications count:', error);
      setUnreadCount(0);
    }
  };

  const handlePress = () => {
    if (!authStore.isLoggedIn) {
      // Если пользователь не авторизован, перенаправляем на экран входа
      navigation.navigate('Auth', { screen: 'Login' });
      return;
    }
    
    navigation.navigate('Notifications');
    // Не сбрасываем счетчик здесь - пусть сбрасывается после фактического прочтения
  };

  // Если пользователь не авторизован, не показываем счетчик
  const showBadge = authStore.isLoggedIn && unreadCount > 0;
  console.log('Unread notifications count:', unreadCount);

  return (
    <TouchableOpacity 
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons name="notifications-outline" size={24} color={colors.text} />
      {showBadge && (
        <View style={[styles.badge, { backgroundColor: colors.error }]}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default NotificationBadge;