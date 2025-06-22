import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
// --- Добавляем контекст темы --- //
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

const StorageDetailScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { storage } = route.params;

  // --- Тема --- //
  const { colors, theme } = useTheme();

  const formatDate = (dateString) => {
    if (!dateString) return 'не указана';
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('ru-RU', options);
  };

  const calculateDaysLeft = (endDate) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Цвета и иконки статуса с учетом темы
  const getStatusConfig = (status) => {
    if (status === 'Хранение на складе') {
      return {
        label: 'Активное хранение',
        icon: 'inventory',
        color: colors.success,
        bgColor: theme === 'dark' ? colors.surface : '#E8F5E9',
        description: 'Товар находится на складе'
      };
    }
    if (status === 'completed') {
      return {
        label: 'Завершен',
        icon: 'check-circle',
        color: colors.info || '#2196F3',
        bgColor: theme === 'dark' ? colors.surface : '#E3F2FD',
        description: 'Договор успешно завершен'
      };
    }
    if (status === 'cancelled') {
      return {
        label: 'Отменен',
        icon: 'cancel',
        color: colors.error,
        bgColor: theme === 'dark' ? colors.surface : '#FFEBEE',
        description: 'Договор был отменен'
      };
    }
    return {
      label: status,
      icon: 'info',
      color: colors.textSecondary,
      bgColor: theme === 'dark' ? colors.surface : '#F5F5F5',
      description: ''
    };
  };

  const handleCreateIssueRequest = () => {
    navigation.navigate('CreateIssueRequest', { storageId: storage.id });
  };

  const statusConfig = getStatusConfig(storage.status);
  const daysLeft = calculateDaysLeft(storage.end_date);

  return (
    <View style={[styles.container, { backgroundColor: theme === 'dark' ? colors.background : '#FFFFFF' }]}>
      <View style={[
        styles.header, 
        { 
          paddingTop: insets.top + 16,
          backgroundColor: theme === 'dark' ? colors.card : '#FFFFFF',
          borderBottomColor: theme === 'dark' ? colors.surface : '#F0F0F0'
        }
      ]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={[
            styles.backButton,
            { backgroundColor: theme === 'dark' ? colors.surface : '#F5F5F5' }
          ]}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={22} color={theme === 'dark' ? colors.text : "#1A1A1A"} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Договор хранения</Text>
          <Text style={[styles.contractNumber, { color: colors.textSecondary }]}>№ {storage.contract_number}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={[
          styles.scrollView, 
          { backgroundColor: theme === 'dark' ? colors.background : '#FAFAFA' }
        ]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Section */}
        <View style={[
          styles.statusSection, 
          { backgroundColor: statusConfig.bgColor, shadowColor: theme === 'dark' ? '#00000000' : '#000' }
        ]}>
          <View style={styles.statusHeader}>
            <View style={[
              styles.statusIconContainer, 
              { backgroundColor: statusConfig.color }
            ]}>
              <Icon name={statusConfig.icon} size={24} color="#fff" />
            </View>
            <View style={styles.statusContent}>
              <Text style={[styles.statusTitle, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
              <Text style={[styles.statusDescription, { color: theme === 'dark' ? colors.textSecondary : '#666' }]}>
                {statusConfig.description}
              </Text>
            </View>
          </View>
          
          {daysLeft !== null && storage.status === 'Хранение на складе' && (
            <View style={[
              styles.daysLeftContainer, 
              { borderTopColor: theme === 'dark' ? colors.surface : 'rgba(0, 0, 0, 0.05)' }
            ]}>
              <Icon name="access-time" size={18} color={daysLeft > 7 ? colors.success : colors.warning} />
              <Text style={[
                styles.daysLeftText, 
                { color: daysLeft > 7 ? colors.success : colors.warning }
              ]}>
                Осталось {daysLeft} {daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}
              </Text>
            </View>
          )}
        </View>

        {/* Period Card */}
        <View style={[
          styles.periodCard,
          { backgroundColor: theme === 'dark' ? colors.card : '#fff', shadowColor: theme === 'dark' ? '#00000000' : '#000' }
        ]}>
          <View style={styles.periodHeader}>
            <Icon name="date-range" size={20} color={colors.primary} />
            <Text style={[styles.periodTitle, { color: colors.text }]}>Период хранения</Text>
          </View>
          
          <View style={styles.periodContent}>
            <View style={styles.periodItem}>
              <View style={[styles.periodDot, { backgroundColor: colors.success }]} />
              <View style={styles.periodInfo}>
                <Text style={[styles.periodLabel, { color: colors.textSecondary }]}>Начало</Text>
                <Text style={[styles.periodDate, { color: colors.text }]}>{formatDate(storage.start_date)}</Text>
              </View>
            </View>
            
            <View style={[
              styles.periodConnector, 
              { backgroundColor: theme === 'dark' ? colors.surface : '#E0E0E0' }
            ]} />
            
            <View style={styles.periodItem}>
              <View style={[styles.periodDot, { backgroundColor: colors.error }]} />
              <View style={styles.periodInfo}>
                <Text style={[styles.periodLabel, { color: colors.textSecondary }]}>Окончание</Text>
                <Text style={[styles.periodDate, { color: colors.text }]}>{formatDate(storage.end_date)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Products Section */}
        <View style={[
          styles.productsCard,
          { backgroundColor: theme === 'dark' ? colors.card : '#fff', shadowColor: theme === 'dark' ? '#00000000' : '#000' }
        ]}>
          <View style={styles.productsHeader}>
            <LinearGradient
              colors={[colors.success, colors.success + "cc"]}
              style={styles.productsIconGradient}
            >
              <Icon name="inventory-2" size={20} color="#fff" />
            </LinearGradient>
            <Text style={[styles.productsTitle, { color: colors.text }]}>Товары на хранении</Text>
          </View>
          
          <View style={[
            styles.productsContent,
            { backgroundColor: theme === 'dark' ? colors.surface : '#F8FAF9' }
          ]}>
            <Text style={[styles.productsText, { color: colors.text }]}>{storage.nomenclature}</Text>
          </View>
        </View>

        {/* Description */}
        {storage.description && (
          <View style={[
            styles.descriptionCard,
            { backgroundColor: theme === 'dark' ? colors.card : '#fff', shadowColor: theme === 'dark' ? '#00000000' : '#000' }
          ]}>
            <View style={styles.descriptionHeader}>
              <Icon name="description" size={20} color={theme === 'dark' ? colors.textSecondary : '#757575'} />
              <Text style={[styles.descriptionTitle, { color: colors.text }]}>Примечания</Text>
            </View>
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>{storage.description}</Text>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionCard} 
            activeOpacity={0.7}
            onPress={handleCreateIssueRequest}
          >
            <LinearGradient
              colors={[
                theme === 'dark' ? colors.surface : '#E8F5E9', 
                theme === 'dark' ? colors.success + '30' : '#C8E6C9'
              ]}
              style={styles.actionGradient}
            >
              <Icon name="local-shipping" size={24} color={colors.success} />
            </LinearGradient>
            <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Заявка на выдачу</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard} activeOpacity={0.7}>
            <LinearGradient
              colors={[
                theme === 'dark' ? colors.surface : '#F3E5F5', 
                theme === 'dark' ? colors.info + '30' : '#E1BEE7'
              ]}
              style={styles.actionGradient}
            >
              <Icon name="qr-code-scanner" size={24} color={colors.info || "#7B1FA2"} />
            </LinearGradient>
            <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>QR код</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={handleCreateIssueRequest}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[colors.success, colors.success + 'CC']}
          style={styles.fabGradient}
        >
          <Icon name="add-shopping-cart" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  contractNumber: {
    fontSize: 13,
    fontWeight: '400',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 100,
  },
  statusSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContent: {
    flex: 1,
    marginLeft: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
  },
  daysLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  daysLeftText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  periodCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  periodTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  periodContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  periodInfo: {
    flex: 1,
  },
  periodLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  periodDate: {
    fontSize: 15,
    fontWeight: '600',
  },
  periodConnector: {
    width: 30,
    height: 2,
    marginHorizontal: 8,
  },
  productsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  productsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  productsIconGradient: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
  productsContent: {
    borderRadius: 12,
    padding: 16,
  },
  productsText: {
    fontSize: 15,
    lineHeight: 22,
  },
  descriptionCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  actionCard: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  actionGradient: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default StorageDetailScreen;