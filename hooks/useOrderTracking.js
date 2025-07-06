// hooks/useOrderTracking.js
import { useState, useEffect, useRef } from 'react';
import WebSocketService from '../services/WebSocketService';
import axios from 'axios';
import { useStores } from '../useStores';

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
        if (!WebSocketService.echo) {
          await WebSocketService.initialize();
        }

        // Подписываемся на обновления
        WebSocketService.subscribeToOrderUpdates(orderId, {
          onLocationUpdate: (location) => {
            if (isSubscribed) {
              setCourierLocation(location);
            }
          },
          onStatusUpdate: (status) => {
            if (isSubscribed) {
              setOrderStatus(status);
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
        setOrderStatus(response.data.status);
        
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
          setCourierLocation(locationResponse.data.location);
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
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
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 10000);
    };

    initializeTracking();

    return () => {
      isSubscribed = false;
      WebSocketService.unsubscribeFromOrder(orderId);
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [orderId, authStore.token]);

  return {
    courierLocation,
    orderStatus,
    loading,
    error
  };
};