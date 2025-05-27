import { makeAutoObservable } from 'mobx';


class CartStore {
  items = [];
  loading = false;

  constructor() {
    makeAutoObservable(this);
  }

  async loadCart(token) {
    this.loading = true;
    try {
      const response = await fetch(`https://api.koleso.app/api/cart.php`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      this.items = data.items || [];
    } finally {
      this.loading = false;
    }
  }

  async addToCart(product, token) {
    try {
      this.loading = true;
      
      const response = await fetch(`https://api.koleso.app/api/cart.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          product_id: product.product_id,
          quantity: product.quantity
        })
      });

      const result = await response.json();

      if (result.success) {
        // Оптимистичное обновление
        const existingItem = this.items.find(item => item.product_id === product.product_id);
        
        if (existingItem) {
          existingItem.quantity += product.quantity;
        } else {
          this.items.push({
            id: Date.now(), // временный ID
            product_id: product.product_id,
            quantity: product.quantity,
            price: product.price,
            name: product.name,
            brand: product.brand,
            image_url: product.image_url
          });
        }
      } else {
        throw new Error(result.message || 'Failed to add to cart');
      }
    } finally {
      this.loading = false;
    }
  }


  get totalItems() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  async updateItemQuantity(itemId, quantity, token) {
    try {
      const response = await fetch(`https://api.koleso.app/api/cart.php`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: itemId, quantity })
      });
      
      const result = await response.json();
      
      if (result.success) {
        const item = this.items.find(i => i.id === itemId);
        if (item) {
          item.quantity = quantity;
        }
      }
    } catch (error) {
      throw error;
    }
  }

  async removeItems(itemIds, token) {
    try {
      const response = await fetch(`https://api.koleso.app/api/cart.php`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ids: itemIds })
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.items = this.items.filter(item => !itemIds.includes(item.id));
      }
    } catch (error) {
      throw error;
    }
  }
}

export const cartStore = new CartStore();