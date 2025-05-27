import { makeAutoObservable, runInAction } from "mobx";
import { Alert } from "react-native";

class OrdersStore {
  orders = [];
  loading = false;
  error = null;

  constructor() {
    makeAutoObservable(this);
  }

  async loadOrders(token) {
    this.loading = true;
    this.error = null;

    try {
      const response = await fetch('https://api.koleso.app/api/orders.php', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      runInAction(() => {
        this.orders = data.orders.map(order => ({
          ...order,
          // Форматируем дату, если нужно
          created_at: this.formatDate(order.created_at)
        }));
      });
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
        Alert.alert('Ошибка', 'Не удалось загрузить заказы');
      });
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  async syncOrderWithBackend(orderId, token) {
    this.loading = true;
    
    try {
      const response = await fetch(`https://api.koleso.app/api/orders.php`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order_id: orderId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Обновляем заказ в локальном хранилище
        runInAction(() => {
          const index = this.orders.findIndex(o => o.id === orderId);
          if (index !== -1) {
            this.orders[index] = {
              ...this.orders[index],
              ...result.order,
              id_1c: result.order.external_id,
              status: result.order.status
            };
          }
        });
        
        return true;
      } else {
        throw new Error(result.error || 'Ошибка синхронизации');
      }
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
      });
      Alert.alert('Ошибка', 'Не удалось синхронизировать заказ');
      return false;
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  async syncAllOrders(token) {
    this.loading = true;
    
    try {
      const response = await fetch('https://api.koleso.app/api/orders.php', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sync_all: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Обновляем все заказы
        runInAction(() => {
          this.orders = this.orders.map(order => {
            const updatedOrder = result.orders.find(o => o.id === order.id);
            return updatedOrder ? {
              ...order,
              ...updatedOrder,
              id_1c: updatedOrder.external_id,
              status: updatedOrder.status
            } : order;
          });
        });
        
        return result.synced_count;
      } else {
        throw new Error(result.error || 'Ошибка синхронизации');
      }
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
      });
      Alert.alert('Ошибка', 'Не удалось синхронизировать заказы');
      return 0;
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  formatDate(dateString) {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${day}.${month}.${year}, ${hours}:${minutes}`;
    } catch (e) {
      return dateString;
    }
  }

  getOrderById(id) {
    return this.orders.find(order => order.id === id);
  }

  get activeOrders() {
    return this.orders.filter(order => 
      !['delivered', 'cancelled'].includes(order.status)
    );
  }

  get completedOrders() {
    return this.orders.filter(order => 
      ['delivered'].includes(order.status)
    );
  }

  get cancelledOrders() {
    return this.orders.filter(order => 
      ['cancelled'].includes(order.status)
    );
  }
}

export const ordersStore = new OrdersStore();