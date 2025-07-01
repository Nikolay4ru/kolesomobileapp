import React from 'react';
import { observer } from 'mobx-react-lite';
import { View, Switch, Text, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useStores } from '../useStores';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';

const EmployeeDashboardSwitch = observer(({ styles }) => {
  const { authStore } = useStores();
  const { colors } = useTheme();

  const handleToggle = (value) => {
    authStore.setShowEmployeeDashboard(value);
    if (value) {
      Alert.alert(
        'Панель сотрудника',
        'При следующем запуске приложения будет открыта панель сотрудника',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={[styles.settingItem, styles.settingItemLast]}>
      <View style={styles.settingItemLeft}>
        <View style={styles.iconContainer}>
          <Icon name="dashboard" size={22} color={colors.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.settingTitle}>Панель сотрудника</Text>
          <Text style={styles.settingSubtitle}>Открывать панель при входе в приложение</Text>
        </View>
      </View>
      <Switch
        value={authStore.showEmployeeDashboard}
        onValueChange={handleToggle}
        trackColor={{ false: colors.border, true: colors.primary + '50' }}
        thumbColor={authStore.showEmployeeDashboard ? colors.primary : colors.surface}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
});

export default EmployeeDashboardSwitch;