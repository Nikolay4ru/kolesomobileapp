import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Platform,
  ActivityIndicator,
  StatusBar,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useStores } from '../useStores';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import moment from 'moment';
import 'moment/locale/ru';

moment.locale('ru');

const NotificationsScreen = observer(() => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { authStore } = useStores();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Параметры пагинации
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 20; // Количество элементов на страницу
  
  useEffect(() => {
    loadNotifications(1, true);
  }, []);

  const loadNotifications = async (pageNumber = 1, isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const response = await fetch(`https://api.koleso.app/api/notifications_list.php?page=${pageNumber}&limit=${LIMIT}`, {
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      console.log(`Page ${pageNumber} data:`, data);
      
      if (data.success) {
        if (isInitial) {
          setNotifications(data.notifications);
        } else {
          // Добавляем новые уведомления к существующим
          setNotifications(prev => [...prev, ...data.notifications]);
        }
        
        setUnreadCount(data.unread_count);
        setPage(pageNumber);
        
        // Обновляем информацию о пагинации
        if (data.pagination) {
          setTotalPages(data.pagination.pages);
          setHasMore(pageNumber < data.pagination.pages);
        } else {
          // Если нет информации о пагинации, определяем по количеству элементов
          setHasMore(data.notifications.length === LIMIT);
        }
      } else {
        throw new Error(data.error || 'Failed to load notifications');
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      if (isInitial) {
        Alert.alert('Ошибка', 'Не удалось загрузить уведомления');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    loadNotifications(1, true).finally(() => {
      setRefreshing(false);
    });
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !refreshing) {
      const nextPage = page + 1;
      loadNotifications(nextPage, false);
    }
  }, [page, loadingMore, hasMore, refreshing]);

  const markAsRead = async (notificationId) => {
    if (!authStore.token) return;
    
    try {
      const response = await fetch('https://api.koleso.app/api/notifications_list.php', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'mark_read',
          notification_id: notificationId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifications(prev => 
            prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
          );
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = () => {
    Alert.alert(
      'Отметить все как прочитанные',
      'Вы уверены, что хотите отметить все уведомления как прочитанные?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Да', 
          onPress: async () => {
            if (!authStore.token) return;
            
            try {
              const response = await fetch('https://api.koleso.app/api/notifications_list.php', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authStore.token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  action: 'mark_all_read'
                })
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data.success) {
                  setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                  setUnreadCount(0);
                }
              }
            } catch (error) {
              console.error('Error marking all as read:', error);
              Alert.alert('Ошибка', 'Не удалось отметить все уведомления как прочитанные');
            }
          }
        }
      ]
    );
  };

  const deleteNotification = (notificationId) => {
    Alert.alert(
      'Удалить уведомление',
      'Вы уверены, что хотите удалить это уведомление?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: async () => {
            if (!authStore.token) return;
            
            try {
              const response = await fetch('https://api.koleso.app/api/notifications_list.php', {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${authStore.token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  notification_id: notificationId
                })
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data.success) {
                  const notification = notifications.find(n => n.id === notificationId);
                  setNotifications(prev => prev.filter(n => n.id !== notificationId));
                  if (notification && !notification.is_read) {
                    setUnreadCount(prev => Math.max(0, prev - 1));
                  }
                }
              }
            } catch (error) {
              console.error('Error deleting notification:', error);
              Alert.alert('Ошибка', 'Не удалось удалить уведомление');
            }
          }
        }
      ]
    );
  };

  const handleNotificationPress = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // Навигация в зависимости от типа уведомления
    switch (notification.type) {
      case 'order':
        navigation.navigate('Orders');
        break;
      case 'service':
        navigation.navigate('Booking');
        break;
      case 'storage':
        navigation.navigate('Storages');
        break;
      case 'promo':
        navigation.navigate('ProductList');
        break;
      case 'admin':
        if (authStore.isAdmin) {
          navigation.navigate('MainTabs', {
            screen: 'ProfileMenu',
            params: {
              screen: 'Admin',
              params: {
                screen: 'AdminOrders',
                params: {}
              }
            }
          });
        }
        break;
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = moment();
    const notificationTime = moment(timestamp);
    const diffHours = now.diff(notificationTime, 'hours');
    
    if (diffHours < 1) {
      return notificationTime.fromNow();
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'час' : diffHours < 5 ? 'часа' : 'часов'} назад`;
    } else if (diffHours < 48) {
      return 'Вчера';
    } else {
      return notificationTime.format('DD MMMM');
    }
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        !item.is_read && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
        <Icon name={item.icon} size={24} color={item.color} />
      </View>
      
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.notificationTitle, !item.is_read && styles.unreadText]}>
            {item.title}
          </Text>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.notificationTime}>
          {formatTimestamp(item.created_at)}
        </Text>
      </View>
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteNotification(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={20} color={colors.textTertiary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingMoreText}>Загрузка...</Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={64} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>Нет уведомлений</Text>
      <Text style={styles.emptyText}>
        Здесь будут отображаться все ваши уведомления
      </Text>
    </View>
  );

  if (loading && notifications.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <StatusBar 
          barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar 
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Уведомления</Text>
        {notifications.length > 0 && unreadCount > 0 && (
          <TouchableOpacity 
            style={styles.markAllButton}
            onPress={markAllAsRead}
          >
            <Ionicons name="checkmark-done" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 && styles.emptyListContent
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
});

const themedStyles = (colors, theme) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
    marginLeft: -8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  markAllButton: {
    padding: 8,
    marginRight: -8,
  },
  
  // Notifications
  listContent: {
    paddingTop: 16,
    paddingBottom: 90, // Увеличенный отступ для TabBar
  },
  emptyListContent: {
    flex: 1,
  },
notificationCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme === 'dark' ? 0.2 : 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 0, // попробуйте 1 или 2
        // Можно добавить border для легкой рамки
        borderWidth: 1,
        borderColor: colors.border + '20', // легкий прозрачный бордер
      },
    }),
  },
  unreadNotification: {
    backgroundColor: colors.primary + '10',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    marginRight: 8,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  unreadText: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  deleteButton: {
    padding: 4,
  },
  
  // Footer Loader
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.textSecondary,
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationsScreen;