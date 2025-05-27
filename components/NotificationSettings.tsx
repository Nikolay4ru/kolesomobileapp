// components/NotificationSettings.tsx
import React, { useEffect, useState } from 'react';
import { View, Switch, Text, StyleSheet, Alert } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useStores } from '../useStores';

const NotificationSettings = observer(() => {
  const { authStore } = useStores();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Проверяем статус при загрузке компонента
    authStore.checkNotificationPermission();
  }, []);

  const handleToggleNotifications = async (value: boolean) => {
    setIsLoading(true);
    try {
      if (value) {
        // Запрашиваем разрешение, если включаем
        const granted = await authStore.requestNotificationPermission();
        if (!granted) {
          Alert.alert(
            'Разрешения не предоставлены',
            'Пожалуйста, разрешите уведомления в настройках устройства',
            [{ text: 'OK' }]
          );
          return;
        }
      } else {
        // Просто обновляем статус, если выключаем
        authStore.hasNotificationPermission = false;
        await authStore.syncNotificationStatus();
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Уведомления</Text>
      
      <View style={styles.switchContainer}>
        <Text>Получать push-уведомления</Text>
        <Switch
          value={authStore.hasNotificationPermission}
          onValueChange={handleToggleNotifications}
          disabled={isLoading}
        />
      </View>

      <Text style={styles.info}>
        {authStore.hasNotificationPermission 
          ? 'OneSignal ID: ' + (authStore.oneSignalId || 'Загрузка...')
          : 'Уведомления отключены'}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  info: {
    marginTop: 10,
    color: '#666',
  },
});

export default NotificationSettings;