// services/DeliveryWebSocketService.js

import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

class DeliveryWebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectInterval = 5000;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.listeners = new Map();
    this.subscriptions = new Set();
    this.isConnected = false;
    this.token = null;
    this.userId = null;
    this.role = null;
    this.pingInterval = null;
  }

  async initialize() {
    // Получаем токен из MMKV
    const token = storage.getString('userToken');
    if (token) {
      this.token = token;
      this.connect();
    }
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // WebSocket URL
      this.ws = new WebSocket('wss://api.koleso.app/ws');
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Авторизация
        this.send({
          type: 'auth',
          token: this.token
        });

        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        this.stopPing();
        this.reconnect();
      };

    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.reconnect();
    }
  }

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval * this.reconnectAttempts);
  }

  handleMessage(data) {
    switch (data.type) {
      case 'auth_success':
        this.userId = data.userId;
        this.role = data.role;
        console.log('WebSocket authenticated:', { userId: this.userId, role: this.role });
        
        // Переподписываемся на все каналы
        this.subscriptions.forEach(orderId => {
          this.send({
            type: 'subscribe_order',
            orderId: orderId
          });
        });
        break;

      case 'subscribed':
        console.log('Subscribed to order:', data.orderId);
        break;

      case 'location_update':
        this.emit('location_update', data);
        this.emit(`order_${data.orderId}_location`, data);
        break;

      case 'status_update':
        this.emit('status_update', data);
        this.emit(`order_${data.orderId}_status`, data);
        break;

      case 'order_cancelled':
        this.emit('order_cancelled', data);
        this.emit(`order_${data.orderId}_cancelled`, data);
        break;

      case 'error':
        console.error('WebSocket error:', data.message);
        this.emit('error', data);
        break;

      case 'pong':
        // Ответ на ping
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected');
    }
  }

  // Подписка на обновления заказа
  subscribeToOrder(orderId) {
    this.subscriptions.add(orderId);
    
    if (this.isConnected) {
      this.send({
        type: 'subscribe_order',
        orderId: orderId
      });
    }
  }

  // Отписка от заказа
  unsubscribeFromOrder(orderId) {
    this.subscriptions.delete(orderId);
    // WebSocket сервер автоматически отпишет при отключении
  }

  // Отправка местоположения курьера
  sendCourierLocation(orderId, location) {
    this.send({
      type: 'courier_location',
      orderId: orderId,
      latitude: location.latitude,
      longitude: location.longitude,
      speed: location.speed || null,
      heading: location.heading || null,
      accuracy: location.accuracy || null
    });
  }

  // Обновление статуса заказа
  updateOrderStatus(orderId, status) {
    this.send({
      type: 'order_status',
      orderId: orderId,
      status: status
    });
  }

  // Event emitter функции
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Event listener error:', error);
        }
      });
    }
  }

  // Ping для поддержания соединения
  startPing() {
    this.pingInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping' });
      }
    }, 30000); // каждые 30 секунд
  }

  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // Отключение
  disconnect() {
    this.stopPing();
    this.subscriptions.clear();
    this.listeners.clear();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
  }
}

export default new DeliveryWebSocketService();