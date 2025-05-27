import { makeAutoObservable, runInAction } from "mobx";
import { Alert } from "react-native";

class StoragesStore {
  storages = [];
  loading = false;
  error = null;

  constructor() {
    makeAutoObservable(this);
  }

  async loadStorages(token) {
    this.loading = true;
    this.error = null;

    try {
      const response = await fetch('https://api.koleso.app/api/getStorages.php', {
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
        this.storages = data.storages.map(storage => ({
          ...storage,
          // Форматируем дату, если нужно
          created_at: this.formatDate(storage.created_at)
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
      const response = await fetch(`https://api.koleso.app/api/getStorages.php`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          storage_id: orderId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Обновляем заказ в локальном хранилище
        runInAction(() => {
          const index = this.storages.findIndex(o => o.id === orderId);
          if (index !== -1) {
            this.storages[index] = {
              ...this.storages[index],
              ...result.storage,
              id_1c: result.storage.external_id,
              status: result.storage.status
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
      const response = await fetch('https://api.koleso.app/api/getStorages.php', {
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
          this.storages = this.storages.map(order => {
            const updatedOrder = result.storages.find(o => o.id === storage.id);
            return updatedOrder ? {
              ...storage,
              ...updatedOrder,
              id_1c: updatedOrder.external_id,
              status: updatedOrder.status
            } : storage;
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
    return this.storages.find(storage => storage.id === id);
  }

  get activeOrders() {
    return this.storages.filter(storage => 
      !['delivered', 'cancelled'].includes(storage.status)
    );
  }

  get completedOrders() {
    return this.storages.filter(storage => 
      ['delivered'].includes(storage.status)
    );
  }

  get cancelledOrders() {
    return this.storages.filter(storage => 
      ['cancelled'].includes(storage.status)
    );
  }
}

export const storagesStore = new StoragesStore();