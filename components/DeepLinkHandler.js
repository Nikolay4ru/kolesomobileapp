import { Linking, Platform } from 'react-native';

class DeepLinkHandler {
  static navigationRef = null;

  static init() {
    // Обработка URL при открытии приложения
    Linking.getInitialURL().then(url => {
      if (url) this.handleURL(url);
    }).catch(err => console.error('Initial URL error:', err));

    // Обработка URL при работе приложения
    Linking.addEventListener('url', ({ url }) => this.handleURL(url));
  }

  static setNavigationRef(ref) {
    this.navigationRef = ref;
  }

  static handleURL(url) {
    console.log('Received URL:', url); // Для отладки
    
    if (!url || !url.startsWith('koleso.app://')) return;

    // Извлекаем путь после ://
    const path = url.split('://')[1];
    
    // Пример для product/1
    if (path.startsWith('product/')) {
      const productId = path.split('/')[1];
      this.navigateToProduct(productId);
    }
  }

  static navigateToProduct(productId) {
    if (!this.navigationRef) {
      console.warn('Navigation ref not set');
      return;
    }

    this.navigationRef.navigate('Product', { 
      productId: productId 
    });
  }

  static cleanup() {
    Linking.removeAllListeners('url');
  }
}

export default DeepLinkHandler;