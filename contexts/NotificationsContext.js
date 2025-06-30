// contexts/NotificationsContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { MMKV } from 'react-native-mmkv';

const API_URL = 'https://api.koleso.app/api';
const storage = new MMKV();

const NotificationsContext = createContext({
  unreadCount: 0,
  refreshUnreadCount: () => {},
  markAllAsRead: () => {},
});

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
};

export const NotificationsProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const navigation = useNavigation();

  const fetchUnreadCount = async () => {
    try {
      const token = storage.getString('authToken');
      
      if (!token) {
        setUnreadCount(0);
        return;
      }

      const response = await fetch(`${API_URL}/notifications_count.php`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread notifications count:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = storage.getString('authToken');
      
      if (!token) return;

      const response = await fetch(`${API_URL}/notifications_list.php`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'mark_all_read'
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchUnreadCount();

    // Set up interval for periodic updates
    const interval = setInterval(fetchUnreadCount, 30000); // Every 30 seconds

    // Listen for navigation focus events
    const unsubscribe = navigation?.addListener('focus', () => {
      fetchUnreadCount();
    });

    return () => {
      clearInterval(interval);
      unsubscribe?.();
    };
  }, []);

  const value = {
    unreadCount,
    refreshUnreadCount: fetchUnreadCount,
    markAllAsRead,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

// Обновленный компонент NotificationBadge с использованием контекста
export const NotificationBadgeWithContext = ({ style }) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { unreadCount, markAllAsRead } = useNotifications();

  const handlePress = () => {
    navigation.navigate('Notifications');
    // Можно вызвать markAllAsRead() здесь или на экране уведомлений
  };

  return (
    <TouchableOpacity 
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons name="notifications-outline" size={24} color={colors.text} />
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.error }]}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};