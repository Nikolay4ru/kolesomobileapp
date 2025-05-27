import { makeAutoObservable, runInAction } from 'mobx';
import { MMKV } from 'react-native-mmkv';

const mmkv = new MMKV();

class FavoritesStore {
  items = [];
  isSyncing = false;

  constructor() {
    makeAutoObservable(this);
    this.loadFromMMKV();
  }

  // Загрузка из MMKV
  loadFromMMKV() {
    const json = mmkv.getString('favorites');
    runInAction(() => {
      this.items = json ? JSON.parse(json) : [];
    });
  }


  // В ваш FavoritesStore добавьте:

  toggleFavoriteOptimistic(productId, isFavorite) {
    runInAction(() => {
      if (isFavorite) {
        this.items.push({ product_id: productId });
      } else {
        this.items = this.items.filter(item => item.product_id !== productId);
      }
    });
  }


  async refreshFavorites(token) {
   
    if (token) {
      await this._loadFromServer(token);
    }
};


  t1oggleFavoriteOptimistic(productId) {
    const index = this.items.findIndex(item => item.product_id === productId);
    
    if (index === -1) {
      this.items.push({ product_id: productId });
    } else {
      this.items.splice(index, 1);
    }
  }



  // В классе FavoritesStore
async updateFavoritesPrices(products) {
    // Создаем карту новых данных о товарах для быстрого поиска
    const productsMap = new Map();
    products.forEach(product => {
      productsMap.set(product.id, product);
    });
  
    // Обновляем информацию о товарах в избранном
    this.items = this.items.map(item => {
      const updatedProduct = productsMap.get(item.id);
      if (updatedProduct) {
        return {
          ...item,
          price: updatedProduct.price,
          out_of_stock: updatedProduct.out_of_stock,
          // другие поля, которые нужно обновлять
        };
      }
      return item;
    });
  
    // Сохраняем изменения в локальное хранилище
    if (!authStore.isLoggedIn) {
      this.saveToMMKV();
    }
  }

// Сохранение в MMKV
saveToMMKV() {
    mmkv.set('favorites', JSON.stringify(this.items));
  }


// Добавление в избранное
async addToFavorites(product, authToken) {
  console.log('Adding to favorites:', product.id);
  if (authToken) {
    await this._syncWithServer('add', product.id, authToken);
  } else {
    runInAction(() => {
      // Проверяем, нет ли уже такого продукта в избранном
      if (!this.items.some(item => item.id === product.id)) {
        this.items = [...this.items, product]; // Сохраняем весь объект продукта
        console.log('Local favorites after add:', this.items);
        this.saveToMMKV();
      }
    });
  }
}


_loadFromLocalStorage() {
  runInAction(() => {
    const saved = MMKV.getString('favorites');
    this.items = saved ? JSON.parse(saved) : [];
  });
}

// Удаление из избранного
async removeFromFavorites(productId, authToken) {
    console.log('Removing from favorites:', productId);
    if (authToken) {
      await this._syncWithServer('remove', productId, authToken);
    } else {
      runInAction(() => {
        this.items = this.items.filter(item => {
          const shouldKeep = item.id != productId;
          if (!shouldKeep) console.log('Removing item:', item.id);
          return shouldKeep;
        });
        console.log('Local favorites after remove:', this.items);
        this.saveToMMKV();
      });
    }
  }

  // Синхронизация с сервером при авторизации
  async syncWithServer(authToken) {
    if (this.isSyncing || this.items.length === 0) return;
    
    this.isSyncing = true;
    try {
      for (const item of this.items) {
        await this._syncWithServer('add', item.id, authToken);
      }
      // Очищаем локальное хранилище после успешной синхронизации
      this.items = [];
      this.saveToMMKV();
    } finally {
      this.isSyncing = false;
    }
  }

  // Внутренний метод для работы с сервером
  async _syncWithServer(action, productId, authToken) {
    try {
      const response = await fetch('https://api.koleso.app/api/favorites.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          action,
          product_id: productId
        })
      });

      if (!response.ok) throw new Error('Sync failed');
      
      // Обновляем список после изменения на сервере
      if (action === 'add' || action === 'remove') {
        await this._loadFromServer(authToken);
      }
    } catch (error) {
      console.error('Sync error:', error);
      throw error;
    }
  }


  get favoritesSet() {
    return new Set(this.items.map(item => item.id));
  }

  // Загрузка избранного с сервера
  async _loadFromServer(authToken) {
    try {
      const response = await fetch('https://api.koleso.app/api/favorites.php', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.items = data.favorites;
        
      }
    } catch (error) {
      console.error('Load favorites error:', error);
    }
  }
}

export const favoritesStore = new FavoritesStore();