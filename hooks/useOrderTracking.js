// hooks/useOrderTracking.js
import { useState, useEffect, useRef } from 'react';
import DeliveryWebSocketService from '../services/DeliveryWebSocketService';
import axios from 'axios';
import { useStores } from '../useStores';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

export const useOrderTracking = (orderId) => {
  const [courierLocation, setCourierLocation] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollingInterval = useRef(null);
  const { authStore } = useStores();

  useEffect(() => {
    if (!orderId) return;

    let isSubscribed = true;

    const initializeTracking = async () => {
      try {
        // Инициализируем WebSocket, если еще не инициализирован
        if (!DeliveryWebSocketService.isConnected()) {
          await DeliveryWebSocketService.initialize();
        }

        // Подписываемся на обновления
        DeliveryWebSocketService.subscribeToOrderUpdates(orderId, {
          onLocationUpdate: (location) => {
            if (isSubscribed) {
              setCourierLocation(location);
              // Сохраняем последнее местоположение в MMKV для офлайн доступа
              storage.set(`courier_location_${orderId}`, JSON.stringify(location));
            }
          },
          onStatusUpdate: (status) => {
            if (isSubscribed) {
              setOrderStatus(status);
              // Сохраняем статус в MMKV
              storage.set(`order_status_${orderId}`, status);
            }
          },
          onETAUpdate: (eta) => {
            if (isSubscribed) {
              // Можно добавить обработку ETA
              storage.set(`order_eta_${orderId}`, eta);
            }
          }
        });

        // Загружаем начальные данные
        await loadInitialData();

        // Запускаем fallback polling на случай проблем с WebSocket
        startPolling();

      } catch (err) {
        console.error('Error initializing tracking:', err);
        setError(err.message);
        
        // При ошибке пытаемся загрузить кешированные данные
        loadCachedData();
        
        // При ошибке WebSocket используем только polling
        startPolling();
      } finally {
        setLoading(false);
      }
    };

    const loadInitialData = async () => {
      try {
        const response = await axios.get(
          `https://api.koleso.app/api/delivery/${orderId}`,
          {
            headers: {
              'Authorization': `Bearer ${authStore.token}`
            }
          }
        );
        
        if (response.data) {
          setOrderStatus(response.data.status);
          storage.set(`order_status_${orderId}`, response.data.status);
          
          // Загружаем начальное местоположение курьера
          if (response.data.courier_id) {
            const locationResponse = await axios.get(
              `https://api.koleso.app/api/courier/location/${orderId}`,
              {
                headers: {
                  'Authorization': `Bearer ${authStore.token}`
                }
              }
            );
            
            if (locationResponse.data.location) {
              setCourierLocation(locationResponse.data.location);
              storage.set(`courier_location_${orderId}`, JSON.stringify(locationResponse.data.location));
            }
          }
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
        // Если не удалось загрузить данные, пробуем кеш
        loadCachedData();
      }
    };

    const loadCachedData = () => {
      // Загружаем кешированные данные из MMKV
      const cachedLocation = storage.getString(`courier_location_${orderId}`);
      const cachedStatus = storage.getString(`order_status_${orderId}`);
      
      if (cachedLocation) {
        try {
          setCourierLocation(JSON.parse(cachedLocation));
        } catch (e) {
          console.error('Error parsing cached location:', e);
        }
      }
      
      if (cachedStatus) {
        setOrderStatus(cachedStatus);
      }
    };

    const startPolling = () => {
      // Polling каждые 10 секунд как запасной вариант
      pollingInterval.current = setInterval(async () => {
        try {
          const response = await axios.get(
            `https://api.koleso.app/api/courier/location/${orderId}`,
            {
              headers: {
                'Authorization': `Bearer ${authStore.token}`
              }
            }
          );
          
          if (isSubscribed && response.data.location) {
            setCourierLocation(response.data.location);
            storage.set(`courier_location_${orderId}`, JSON.stringify(response.data.location));
          }
          
          // Также обновляем статус
          const statusResponse = await axios.get(
            `https://api.koleso.app/api/delivery/${orderId}/status`,
            {
              headers: {
                'Authorization': `Bearer ${authStore.token}`
              }
            }
          );
          
          if (isSubscribed && statusResponse.data.status) {
            setOrderStatus(statusResponse.data.status);
            storage.set(`order_status_${orderId}`, statusResponse.data.status);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 10000);
    };

    initializeTracking();

    return () => {
      isSubscribed = false;
      DeliveryWebSocketService.unsubscribeFromOrder(orderId);
      
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [orderId, authStore.token]);

  // Функция для ручного обновления
  const refresh = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `https://api.koleso.app/api/courier/location/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        }
      );
      
      if (response.data.location) {
        setCourierLocation(response.data.location);
        storage.set(`courier_location_${orderId}`, JSON.stringify(response.data.location));
      }
      
      const statusResponse = await axios.get(
        `https://api.koleso.app/api/delivery/${orderId}/status`,
        {
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        }
      );
      
      if (statusResponse.data.status) {
        setOrderStatus(statusResponse.data.status);
        storage.set(`order_status_${orderId}`, statusResponse.data.status);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Функция для отправки местоположения курьера (для экрана курьера)
  const updateCourierLocation = async (location) => {
    try {
      await DeliveryWebSocketService.sendCourierLocation(orderId, location);
    } catch (err) {
      console.error('Error updating courier location:', err);
    }
  };

  // Функция для обновления статуса доставки (для экрана курьера)
  const updateDeliveryStatus = async (newStatus, additionalData = {}) => {
    try {
      await DeliveryWebSocketService.updateDeliveryStatus(orderId, newStatus, additionalData);
      setOrderStatus(newStatus);
      storage.set(`order_status_${orderId}`, newStatus);
    } catch (err) {
      console.error('Error updating delivery status:', err);
      throw err;
    }
  };

  return {
    courierLocation,
    orderStatus,
    loading,
    error,
    refresh,
    updateCourierLocation,
    updateDeliveryStatus,
  };
};