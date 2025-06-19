import { useState, useEffect, useCallback } from 'react';
import { useStores } from '../useStores';
import { OneSignal } from 'react-native-onesignal';

export const useNotifications = () => {
  const { authStore } = useStores();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Инициализация OneSignal
  useEffect(() => {
    if (authStore.isLoggedIn && authStore.user?.id) {
      // Устанавливаем External User Id для OneSignal
      OneSignal.login(authStore.user.id.toString());
      
      // Подписываемся на события уведомлений
      // В OneSignal 5.x используются другие методы
      
      // Слушатель для получения уведомлений в foreground
      const foregroundWillDisplayListener = (event) => {
        console.log('OneSignal: notification will display in foreground:', event);
        
        // Обновляем счетчик непрочитанных
        fetchUnreadCount();
      };
      
      // Слушатель для клика по уведомлению
      const notificationClickListener = (event) => {
        console.log('OneSignal: notification clicked:', event);
        handleNotificationOpen(event);
      };
      
      // Добавляем слушатели
      OneSignal.Notifications.addEventListener('foregroundWillDisplay', foregroundWillDisplayListener);
      OneSignal.Notifications.addEventListener('click', notificationClickListener);
      
      // Cleanup функция
      return () => {
        OneSignal.Notifications.removeEventListener('foregroundWillDisplay', foregroundWillDisplayListener);
        OneSignal.Notifications.removeEventListener('click', notificationClickListener);
        
        if (!authStore.isLoggedIn) {
          OneSignal.logout();
        }
      };
    }
  }, [authStore.isLoggedIn, authStore.user?.id, fetchUnreadCount]);
  
  // Загрузка количества непрочитанных уведомлений
  const fetchUnreadCount = useCallback(async () => {
    if (!authStore.token) return;
    
    try {
      const response = await fetch('https://api.koleso.app/api/notifications.php?page=1&limit=1', {
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUnreadCount(data.unread_count);
        }
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [authStore.token]);
  
  // Обработка открытия уведомления
  const handleNotificationOpen = useCallback((event) => {
    const { type, notification_id, order_id, booking_id, storage_id } = event.notification.additionalData || {};
    
    // Здесь можно добавить навигацию к соответствующему экрану
    // Например, используя NavigationService
    switch (type) {
      case 'order':
        if (order_id) {
          // NavigationService.navigate('OrderDetail', { orderId: order_id });
        }
        break;
      case 'service':
        if (booking_id) {
          // NavigationService.navigate('BookingDetail', { bookingId: booking_id });
        }
        break;
      case 'storage':
        if (storage_id) {
          // NavigationService.navigate('StorageDetail', { storageId: storage_id });
        }
        break;
    }
    
    // Отмечаем уведомление как прочитанное
    if (notification_id) {
      markAsRead(notification_id);
    }
  }, [markAsRead]);
  
  // Отметить уведомление как прочитанное
  const markAsRead = useCallback(async (notificationId) => {
    if (!authStore.token) return;
    
    try {
      const response = await fetch('https://api.koleso.app/api/notifications.php', {
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
        // Обновляем счетчик
        fetchUnreadCount();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [authStore.token, fetchUnreadCount]);
  
  // Отметить все как прочитанные
  const markAllAsRead = useCallback(async () => {
    if (!authStore.token) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('https://api.koleso.app/api/notifications.php', {
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
        setUnreadCount(0);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error marking all as read:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [authStore.token]);
  
  // Удалить уведомление
  const deleteNotification = useCallback(async (notificationId) => {
    if (!authStore.token) return false;
    
    try {
      const response = await fetch('https://api.koleso.app/api/notifications.php', {
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
        // Обновляем счетчик
        fetchUnreadCount();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }, [authStore.token, fetchUnreadCount]);
  
  // Обновление OneSignal ID на сервере
  const updateOneSignalId = useCallback(async (oneSignalId) => {
    if (!authStore.token || !oneSignalId) return;
    
    try {
      const response = await fetch('https://api.koleso.app/api/update_onesignal_id.php', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          onesignal_id: oneSignalId
        })
      });
      
      if (response.ok) {
        console.log('OneSignal ID updated successfully');
      }
    } catch (error) {
      console.error('Error updating OneSignal ID:', error);
    }
  }, [authStore.token]);
  
  // Загружаем количество непрочитанных при входе
  useEffect(() => {
    if (authStore.isLoggedIn) {
      fetchUnreadCount();
      
      // Обновляем каждые 30 секунд
      const interval = setInterval(fetchUnreadCount, 30000);
      
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
    }
  }, [authStore.isLoggedIn, fetchUnreadCount]);
  
  // Получаем OneSignal Player ID при инициализации
  useEffect(() => {
    if (authStore.isLoggedIn) {
      // В OneSignal 5.x используется новый метод для получения ID
      OneSignal.User.pushSubscription.getIdAsync().then(id => {
        if (id) {
          updateOneSignalId(id);
        }
      });
      
      // Подписываемся на изменение статуса подписки
      const subscriptionChangedListener = (event) => {
        console.log('OneSignal subscription changed:', event);
        if (event.current.id) {
          updateOneSignalId(event.current.id);
        }
      };
      
      OneSignal.User.pushSubscription.addEventListener('change', subscriptionChangedListener);
      
      return () => {
        OneSignal.User.pushSubscription.removeEventListener('change', subscriptionChangedListener);
      };
    }
  }, [authStore.isLoggedIn, updateOneSignalId]);
  
  return {
    unreadCount,
    isLoading,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateOneSignalId
  };
};