import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  TextInput,
  StatusBar,
  Platform
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useStores } from '../useStores';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

const GarageScreen = observer(() => {
  const { authStore, productStore } = useStores();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // State
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [nickname, setNickname] = useState('');
  const [updatingVehicle, setUpdatingVehicle] = useState(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Load vehicles data
  const loadVehicles = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch('https://api.koleso.app/api/garage.php', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setVehicles(data.vehicles || []);
      setError(null);

      // Start entrance animation
      if (!isRefresh) {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          })
        ]).start();
      }

    } catch (err) {
      console.error('Error loading vehicles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authStore.token]);

  // Focus effect to reload data
  useFocusEffect(
    useCallback(() => {
      if (authStore.isLoggedIn) {
        loadVehicles();
      }
    }, [authStore.isLoggedIn, loadVehicles])
  );

  // Delete vehicle
  const deleteVehicle = async (vehicleId) => {
    Alert.alert(
      'Удалить автомобиль',
      'Вы уверены, что хотите удалить этот автомобиль из гаража?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdatingVehicle(vehicleId);

              const response = await fetch('https://api.koleso.app/api/garage.php', {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${authStore.token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ vehicle_id: vehicleId })
              });

              if (!response.ok) {
                throw new Error('Не удалось удалить автомобиль');
              }

              setVehicles(prev => prev.filter(v => v.id !== vehicleId));

            } catch (err) {
              Alert.alert('Ошибка', err.message);
            } finally {
              setUpdatingVehicle(null);
            }
          }
        }
      ]
    );
  };

  // Set primary vehicle
  const setPrimaryVehicle = async (vehicleId) => {
    try {
      setUpdatingVehicle(vehicleId);

      const response = await fetch('https://api.koleso.app/api/garage.php', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          is_primary: true
        })
      });

      if (!response.ok) {
        throw new Error('Не удалось установить основной автомобиль');
      }

      // Update local state
      setVehicles(prev => prev.map(v => ({
        ...v,
        is_primary: v.id === vehicleId ? '1' : '0'
      })));

    } catch (err) {
      Alert.alert('Ошибка', err.message);
    } finally {
      setUpdatingVehicle(null);
    }
  };

  // Update vehicle nickname
  const updateNickname = async () => {
    if (!editingVehicle || !nickname.trim()) return;

    try {
      const response = await fetch('https://api.koleso.app/api/garage.php', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vehicle_id: editingVehicle.id,
          nickname: nickname.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Не удалось обновить название');
      }

      // Update local state
      setVehicles(prev => prev.map(v =>
        v.id === editingVehicle.id
          ? { ...v, nickname: nickname.trim() }
          : v
      ));

      setEditingVehicle(null);
      setNickname('');

    } catch (err) {
      Alert.alert('Ошибка', err.message);
    }
  };

  // Render vehicle card
  const renderVehicleCard = ({ item, index }) => {
    const isPrimary = item.is_primary === '1' || item.is_primary === 1;
    const isUpdating = updatingVehicle === item.id;

    return (
      <Animated.View
        style={[
          styles.vehicleCard,
          isPrimary && styles.primaryVehicleCard,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        {isPrimary && (
          <View style={styles.primaryBadge}>
            <Icon name="star" size={14} color="#1DB584" />
            <Text style={styles.primaryBadgeText}>Основной</Text>
          </View>
        )}

        <View style={styles.vehicleHeader}>
          <View style={[styles.vehicleIcon, isPrimary && styles.primaryVehicleIcon]}>
            <MaterialCommunityIcons 
              name="car-side" 
              size={28} 
              color={isPrimary ? "#1DB584" : "#8B92A0"} 
            />
          </View>
          
          <View style={styles.vehicleActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setEditingVehicle(item);
                setNickname(item.nickname || '');
              }}
              activeOpacity={0.7}
            >
              <Icon name="edit" size={18} color="#8B92A0" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => deleteVehicle(item.id)}
              activeOpacity={0.7}
            >
              <Icon name="delete-outline" size={18} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.vehicleInfo}>
          <Text style={[styles.vehicleName, isPrimary && styles.primaryVehicleName]}>
            {item.nickname || `${item.marka} ${item.model}`}
          </Text>
          
          {item.nickname && (
            <Text style={styles.vehicleSubtitle}>
              {item.marka} {item.model}
            </Text>
          )}
          
          {item.modification && (
            <Text style={styles.vehicleModification} numberOfLines={2}>
              {item.modification}
            </Text>
          )}

          <View style={styles.vehicleSpecs}>
            {item.beginyear && (
              <View style={styles.specChip}>
                <Icon name="calendar-today" size={14} color="#8B92A0" />
                <Text style={styles.specText}>
                  {item.beginyear}{item.endyear ? `-${item.endyear}` : ''}
                </Text>
              </View>
            )}
            
            {item.kuzov && (
              <View style={styles.specChip}>
                <MaterialCommunityIcons name="car-info" size={14} color="#8B92A0" />
                <Text style={styles.specText}>{item.kuzov}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Tire Recommendations */}
        {item.tire_recommendations && item.tire_recommendations.length > 0 && (
          <View style={styles.recommendationsSection}>
            <Text style={styles.recommendationsTitle}>Рекомендуемые шины</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recommendationsList}
            >
              {item.tire_recommendations.map((rec, idx) => (
                <View key={idx} style={styles.recommendationCard}>
                  <View style={[
                    styles.seasonBadge,
                    rec.season === 'summer' && styles.summerBadge,
                    rec.season === 'winter' && styles.winterBadge,
                    rec.season === 'all' && styles.allSeasonBadge
                  ]}>
                    <Icon 
                      name={
                        rec.season === 'summer' ? 'wb-sunny' :
                        rec.season === 'winter' ? 'ac-unit' : 'all-inclusive'
                      } 
                      size={12} 
                      color="#FFFFFF" 
                    />
                  </View>
                  <Text style={styles.recommendationSize}>
                    {rec.recommended_size}
                  </Text>
                  <Text style={styles.seasonText}>
                    {rec.season === 'summer' ? 'Лето' :
                     rec.season === 'winter' ? 'Зима' : 'Всесезон'}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.cardActions}>
          {!isPrimary && (
            <TouchableOpacity
              style={[styles.secondaryActionButton, isUpdating && styles.disabledAction]}
              onPress={() => setPrimaryVehicle(item.id)}
              disabled={isUpdating}
              activeOpacity={0.8}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#1DB584" />
              ) : (
                <>
                  <Icon name="star-outline" size={16} color="#1DB584" />
                  <Text style={styles.secondaryActionText}>Основной</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.primaryActionButton, isPrimary && styles.fullWidthButton]}
            onPress={() => {
              navigation.navigate('AddToGarage', {
                preselected: {
                  marka: item.marka,
                  model: item.model,
                  modification: item.modification
                }
              });
            }}
            activeOpacity={0.8}
          >
            <Icon name="search" size={16} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Подобрать товары</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  // Edit nickname modal
  const renderEditModal = () => (
    <Modal
      visible={!!editingVehicle}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        setEditingVehicle(null);
        setNickname('');
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Название автомобиля</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setEditingVehicle(null);
                setNickname('');
              }}
            >
              <Icon name="close" size={20} color="#8B92A0" />
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={styles.nicknameInput}
            value={nickname}
            onChangeText={setNickname}
            placeholder="Например: Моя ласточка"
            placeholderTextColor="#C5CAD3"
            maxLength={50}
            autoFocus
          />
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setEditingVehicle(null);
                setNickname('');
              }}
            >
              <Text style={styles.modalCancelText}>Отмена</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalSaveButton, !nickname.trim() && styles.disabledButton]}
              onPress={updateNickname}
              disabled={!nickname.trim()}
            >
              <Text style={styles.modalSaveText}>Сохранить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Мой гараж</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1DB584" />
          <Text style={styles.loadingText}>Загружаем ваши автомобили...</Text>
        </View>
      </View>
    );
  }

  // Not authenticated
  if (!authStore.isLoggedIn) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Мой гараж</Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <MaterialCommunityIcons name="garage-variant" size={64} color="#E8EBF0" />
          </View>
          <Text style={styles.emptyTitle}>Войдите в аккаунт</Text>
          <Text style={styles.emptyText}>
            Чтобы добавлять автомобили и получать персональные рекомендации
          </Text>
          <TouchableOpacity
            style={styles.authButton}
            onPress={() => navigation.navigate('Auth')}
          >
            <Text style={styles.authButtonText}>Войти</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
         <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                  >
                    <Icon name="arrow-back-ios" size={24} color="#1DB584" />
                  </TouchableOpacity>
        <Text style={styles.headerTitle}>Мой гараж</Text>
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddToGarage', { addToGarage: true })}
          activeOpacity={0.7}
        ><Icon name="add" size={24} color="#1DB584" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {vehicles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Animated.View 
            style={[
              styles.emptyContent,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            <View style={styles.emptyIconContainer}>
              <MaterialCommunityIcons name="car-plus" size={80} color="#E8EBF0" />
            </View>
            <Text style={styles.emptyTitle}>Добавьте автомобиль</Text>
            <Text style={styles.emptyText}>
              Получайте персональные рекомендации по товарам для ваших автомобилей
            </Text>
            <TouchableOpacity
              style={styles.addFirstVehicleButton}
              onPress={() => navigation.navigate('AddToGarage', { addToGarage: true })}
              activeOpacity={0.8}
            >
              <Icon name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addFirstVehicleText}>Добавить автомобиль</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          renderItem={renderVehicleCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadVehicles(true)}
              colors={['#1DB584']}
              tintColor="#1DB584"
              progressBackgroundColor="#FFFFFF"
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      {/* Edit Modal */}
      {renderEditModal()}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1E25',
    letterSpacing: -0.5,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8FFF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
    backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
   // backgroundColor: '#E8FFF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8B92A0',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F8F9FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#E8EBF0',
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1E25',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8B92A0',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 280,
  },
  authButton: {
    backgroundColor: '#1DB584',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 25,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addFirstVehicleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1DB584',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
  },
  addFirstVehicleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  vehicleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryVehicleCard: {
    borderWidth: 2,
    borderColor: '#1DB584',
  },
  primaryBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8FFF8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  primaryBadgeText: {
    color: '#1DB584',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F8F9FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryVehicleIcon: {
    backgroundColor: '#E8FFF8',
  },
  vehicleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8F9FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleInfo: {
    marginBottom: 16,
  },
  vehicleName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1E25',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  primaryVehicleName: {
    color: '#1DB584',
  },
  vehicleSubtitle: {
    fontSize: 15,
    color: '#8B92A0',
    fontWeight: '500',
    marginBottom: 4,
  },
  vehicleModification: {
    fontSize: 14,
    color: '#C5CAD3',
    marginTop: 4,
    lineHeight: 20,
  },
  vehicleSpecs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  specText: {
    fontSize: 13,
    color: '#8B92A0',
    marginLeft: 6,
    fontWeight: '500',
  },
  recommendationsSection: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
  },
  recommendationsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1E25',
    marginBottom: 12,
  },
  recommendationsList: {
    flexDirection: 'row',
    gap: 8,
  },
  recommendationCard: {
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minWidth: 90,
  },
  seasonBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summerBadge: {
    backgroundColor: '#FFB800',
  },
  winterBadge: {
    backgroundColor: '#4A90E2',
  },
  allSeasonBadge: {
    backgroundColor: '#8B92A0',
  },
  seasonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B92A0',
    marginTop: 4,
  },
  recommendationSize: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1E25',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8FFF8',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  secondaryActionText: {
    color: '#1DB584',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  primaryActionButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1DB584',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  fullWidthButton: {
    flex: 1,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  disabledAction: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1E25',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8F9FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nicknameInput: {
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A1E25',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8F9FB',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B92A0',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1DB584',
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: '#E8EBF0',
    opacity: 0.7,
  },
});

export default GarageScreen;