// screens/admin/AppUpdateManagementScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import axios from 'axios';
import { useStores } from '../../stores/RootStore';
import { useTheme } from '../../contexts/ThemeContext';

interface UpdateSettings {
  android: {
    version: string;
    version_code: number;
    update_notifications_enabled: boolean;
    last_updated: string | null;
  };
  ios: {
    version: string;
    version_code: number;
    update_notifications_enabled: boolean;
    last_updated: string | null;
  };
}

interface UpdateStats {
  daily: Array<{
    date: string;
    users_notified: number;
    total_notifications: number;
  }>;
  total: {
    total_users_notified: number;
    total_notifications_sent: number;
    first_notification: string | null;
    last_notification: string | null;
  };
  by_version: Array<{
    app_version: string;
    latest_version: string;
    users_count: number;
    last_sent: string;
  }>;
}

const AppUpdateManagementScreen = observer(() => {
  const navigation = useNavigation();
  const { authStore } = useStores();
  const { colors, theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<UpdateSettings | null>(null);
  const [stats, setStats] = useState<UpdateStats | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'stats'>('settings');

  const fetchData = async () => {
    try {
      const [settingsResponse, statsResponse] = await Promise.all([
        axios.get('https://api.koleso.app/api/check_app_update.php?action=status', {
          headers: { Authorization: `Bearer ${authStore.token}` }
        }),
        axios.get('https://api.koleso.app/api/check_app_update.php?action=stats', {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })
      ]);

      if (settingsResponse.data.success) {
        setSettings({
          android: settingsResponse.data.android,
          ios: settingsResponse.data.ios
        });
      }

      if (statsResponse.data.success) {
        setStats(statsResponse.data.stats);
      }
    } catch (error) {
      console.error('Error fetching update data:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggle = async (platform: 'android' | 'ios', enabled: boolean) => {
    try {
      const response = await axios.get(
        `https://api.koleso.app/api/check_app_update.php?action=toggle&platform=${platform}&enabled=${enabled}`,
        { headers: { Authorization: `Bearer ${authStore.token}` } }
      );

      if (response.data.success) {
        setSettings(prev => prev ? {
          ...prev,
          [platform]: {
            ...prev[platform],
            update_notifications_enabled: enabled
          }
        } : null);
        
        Alert.alert(
          'Успешно',
          `Уведомления об обновлениях для ${platform === 'android' ? 'Android' : 'iOS'} ${enabled ? 'включены' : 'выключены'}`
        );
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert('Ошибка', 'Не удалось изменить настройки');
    }
  };

  const renderSettings = () => (
    <View style={styles.content}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Android</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              Текущая версия: {settings?.android.version || 'Неизвестно'}
            </Text>
            <Text style={[styles.settingSubtext, { color: colors.textSecondary }]}>
              Код версии: {settings?.android.version_code || 0}
            </Text>
          </View>
          <Switch
            value={settings?.android.update_notifications_enabled || false}
            onValueChange={(value) => handleToggle('android', value)}
            trackColor={{ false: '#767577', true: colors.primary }}
            thumbColor={settings?.android.update_notifications_enabled ? colors.primaryDark : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>iOS</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              Текущая версия: {settings?.ios.version || 'Неизвестно'}
            </Text>
            <Text style={[styles.settingSubtext, { color: colors.textSecondary }]}>
              Код версии: {settings?.ios.version_code || 0}
            </Text>
          </View>
          <Switch
            value={settings?.ios.update_notifications_enabled || false}
            onValueChange={(value) => handleToggle('ios', value)}
            trackColor={{ false: '#767577', true: colors.primary }}
            thumbColor={settings?.ios.update_notifications_enabled ? colors.primaryDark : '#f4f3f4'}
            disabled={true} // iOS выключен по умолчанию
          />
        </View>
        <Text style={[styles.warningText, { color: colors.warning }]}>
          * Уведомления для iOS временно отключены
        </Text>
      </View>
    </View>
  );

  const renderStats = () => (
    <ScrollView style={styles.content}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Общая статистика</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {stats?.total.total_users_notified || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Пользователей уведомлено
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {stats?.total.total_notifications_sent || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Всего уведомлений
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>По версиям</Text>
        {stats?.by_version.map((item, index) => (
          <View key={index} style={[styles.versionRow, { borderBottomColor: colors.border }]}>
            <View style={styles.versionInfo}>
              <Text style={[styles.versionText, { color: colors.text }]}>
                {item.app_version} → {item.latest_version}
              </Text>
              <Text style={[styles.versionDate, { color: colors.textSecondary }]}>
                Последняя отправка: {new Date(item.last_sent).toLocaleDateString()}
              </Text>
            </View>
            <Text style={[styles.versionCount, { color: colors.primary }]}>
              {item.users_count} польз.
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Последние 7 дней</Text>
        {stats?.daily.slice(0, 7).map((day, index) => (
          <View key={index} style={[styles.dayRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.dayDate, { color: colors.text }]}>
              {new Date(day.date).toLocaleDateString()}
            </Text>
            <Text style={[styles.dayCount, { color: colors.textSecondary }]}>
              {day.users_notified} польз. / {day.total_notifications} увед.
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Управление обновлениями</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'settings' && { borderBottomColor: colors.primary }
          ]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'settings' ? colors.primary : colors.textSecondary }
          ]}>
            Настройки
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'stats' && { borderBottomColor: colors.primary }
          ]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'stats' ? colors.primary : colors.textSecondary }
          ]}>
            Статистика
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {activeTab === 'settings' ? renderSettings() : renderStats()}
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    marginBottom: 4,
  },
  settingSubtext: {
    fontSize: 14,
  },
  warningText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  versionInfo: {
    flex: 1,
  },
  versionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  versionDate: {
    fontSize: 12,
    marginTop: 2,
  },
  versionCount: {
    fontSize: 16,
    fontWeight: '600',
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  dayDate: {
    fontSize: 14,
  },
  dayCount: {
    fontSize: 14,
  },
});

export default AppUpdateManagementScreen;