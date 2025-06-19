import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}

function reset(routes) {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes,
    });
  }
}

// Специальный метод для навигации к админским экранам
function navigateToAdmin(screenName = 'AdminOrders', params = {}) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('MainTabs', {
      screen: 'ProfileMenu',
      params: {
        screen: 'Admin',
        params: {
          screen: screenName,
          params: params
        }
      }
    });
  }
}

export default {
  navigate,
  goBack,
  reset,
  navigateToAdmin,
};