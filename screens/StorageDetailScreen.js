import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

const StorageDetailScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { storage } = route.params;

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

  const getStatusConfig = (status) => {
    switch (status) {
      case 'Хранение на складе':
        return {
          label: 'Активное хранение',
          icon: 'inventory',
          color: '#4CAF50',
          bgColor: '#E8F5E9',
          description: 'Товар находится на складе'
        };
      case 'completed':
        return {
          label: 'Завершен',
          icon: 'check-circle',
          color: '#2196F3',
          bgColor: '#E3F2FD',
          description: 'Договор успешно завершен'
        };
      case 'cancelled':
        return {
          label: 'Отменен',
          icon: 'cancel',
          color: '#F44336',
          bgColor: '#FFEBEE',
          description: 'Договор был отменен'
        };
      default:
        return {
          label: status,
          icon: 'info',
          color: '#757575',
          bgColor: '#F5F5F5',
          description: ''
        };
    }
  };

  const handleCreateIssueRequest = () => {
    navigation.navigate('CreateIssueRequest', { storageId: storage.id });
  };

  const statusConfig = getStatusConfig(storage.status);
  const daysLeft = calculateDaysLeft(storage.end_date);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Договор хранения</Text>
          <Text style={styles.contractNumber}>№ {storage.contract_number}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Section */}
        <View style={[styles.statusSection, { backgroundColor: statusConfig.bgColor }]}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusIconContainer, { backgroundColor: statusConfig.color }]}>
              <Icon name={statusConfig.icon} size={24} color="#fff" />
            </View>
            <View style={styles.statusContent}>
              <Text style={[styles.statusTitle, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
              <Text style={styles.statusDescription}>{statusConfig.description}</Text>
            </View>
          </View>
          
          {daysLeft !== null && storage.status === 'Хранение на складе' && (
            <View style={styles.daysLeftContainer}>
              <Icon name="access-time" size={18} color={daysLeft > 7 ? '#4CAF50' : '#FF9800'} />
              <Text style={[styles.daysLeftText, { color: daysLeft > 7 ? '#4CAF50' : '#FF9800' }]}>
                Осталось {daysLeft} {daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}
              </Text>
            </View>
          )}
        </View>

        {/* Period Card */}
        <View style={styles.periodCard}>
          <View style={styles.periodHeader}>
            <Icon name="date-range" size={20} color="#1976D2" />
            <Text style={styles.periodTitle}>Период хранения</Text>
          </View>
          
          <View style={styles.periodContent}>
            <View style={styles.periodItem}>
              <View style={styles.periodDot} />
              <View style={styles.periodInfo}>
                <Text style={styles.periodLabel}>Начало</Text>
                <Text style={styles.periodDate}>{formatDate(storage.start_date)}</Text>
              </View>
            </View>
            
            <View style={styles.periodConnector} />
            
            <View style={styles.periodItem}>
              <View style={[styles.periodDot, { backgroundColor: '#F44336' }]} />
              <View style={styles.periodInfo}>
                <Text style={styles.periodLabel}>Окончание</Text>
                <Text style={styles.periodDate}>{formatDate(storage.end_date)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Products Section */}
        <View style={styles.productsCard}>
          <View style={styles.productsHeader}>
            <LinearGradient
              colors={['#4CAF50', '#66BB6A']}
              style={styles.productsIconGradient}
            >
              <Icon name="inventory-2" size={20} color="#fff" />
            </LinearGradient>
            <Text style={styles.productsTitle}>Товары на хранении</Text>
          </View>
          
          <View style={styles.productsContent}>
            <Text style={styles.productsText}>{storage.nomenclature}</Text>
          </View>
        </View>

        {/* Description */}
        {storage.description && (
          <View style={styles.descriptionCard}>
            <View style={styles.descriptionHeader}>
              <Icon name="description" size={20} color="#757575" />
              <Text style={styles.descriptionTitle}>Примечания</Text>
            </View>
            <Text style={styles.descriptionText}>{storage.description}</Text>
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
              colors={['#E8F5E9', '#C8E6C9']}
              style={styles.actionGradient}
            >
              <Icon name="local-shipping" size={24} color="#2E7D32" />
            </LinearGradient>
            <Text style={styles.actionLabel}>Заявка на выдачу</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard} activeOpacity={0.7}>
            <LinearGradient
              colors={['#F3E5F5', '#E1BEE7']}
              style={styles.actionGradient}
            >
              <Icon name="qr-code-scanner" size={24} color="#7B1FA2" />
            </LinearGradient>
            <Text style={styles.actionLabel}>QR код</Text>
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
          colors={['#4CAF50', '#45A049']}
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    color: '#1A1A1A',
    fontWeight: '600',
    marginBottom: 2,
  },
  contractNumber: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FAFAFA',
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
    shadowColor: '#000',
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
    color: '#666',
  },
  daysLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  daysLeftText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  periodCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
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
    color: '#333',
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
    backgroundColor: '#4CAF50',
    marginRight: 12,
  },
  periodInfo: {
    flex: 1,
  },
  periodLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  periodDate: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
  periodConnector: {
    width: 30,
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },
  productsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
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
    color: '#333',
    marginLeft: 12,
  },
  productsContent: {
    backgroundColor: '#F8FAF9',
    borderRadius: 12,
    padding: 16,
  },
  productsText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  descriptionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
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
    color: '#333',
    marginLeft: 10,
  },
  descriptionText: {
    fontSize: 15,
    color: '#666',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    elevation: 6,
    shadowColor: '#4CAF50',
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