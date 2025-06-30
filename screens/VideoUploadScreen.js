const generateId = () => Math.random().toString(36).substr(2, 9);
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  TextInput, 
  FlatList, 
  Modal, 
  Animated,
  ScrollView,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from "mobx-react-lite";
import axios from 'axios';
import { useStores } from "../useStores";
import CustomHeader from '../components/CustomHeader';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';

const { width: screenWidth } = Dimensions.get('window');

const VideoUploadScreen = observer(({ navigation }) => {
  const { authStore } = useStores();
  const [orders, setOrders] = useState([]);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [scaleAnim] = useState(new Animated.Value(0.95));
  const insets = useSafeAreaInsets();
  const statusBarHeight = insets.top;
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);

  // Refs для TextInput компонентов и анимации
  const fileNameRefs = useRef({});
  const fileNameValues = useRef({});
  const itemAnimations = useRef({});

  // Анимация появления
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Загрузка заказов
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.post(
          'https://api.koleso.app/api/ozon_orders.php',
          { store_id: authStore.admin?.storeId },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authStore.token}`
            }
          }
        );
        setOrders(response.data.orders || []);
      } catch (error) {
        console.error('Error fetching orders:', error);
        Alert.alert('Ошибка', 'Не удалось загрузить список заказов');
      }
    };
    fetchOrders();
  }, []);

  const getItemAnimation = (itemId) => {
    if (!itemAnimations.current[itemId]) {
      itemAnimations.current[itemId] = new Animated.Value(1);
    }
    return itemAnimations.current[itemId];
  };

  const animateItemPress = (itemId) => {
    const animation = getItemAnimation(itemId);
    Animated.sequence([
      Animated.timing(animation, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  const selectVideos = () => {
    const options = {
      mediaType: 'video',
      videoQuality: 'high',
      selectionLimit: 0,
    };

    ImagePicker.launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled video picker');
        return;
      }
      
      if (response.error) {
        console.log('ImagePicker Error: ', response.error);
        Alert.alert('Ошибка', 'Не удалось выбрать видео');
        return;
      }
      
      if (response.assets && response.assets.length > 0) {
        const newUploads = response.assets.map(asset => {
          const id = generateId();
          // Инициализируем значение названия файла
          fileNameValues.current[id] = selectedOrder?.number_ozon || '';
          return {
            id,
            video: asset,
            status: 'pending',
            progress: 0,
            orderId: selectedOrder?.number_ozon,
          };
        });
        
        setUploadQueue(prev => [...prev, ...newUploads]);
      } else {
        Alert.alert('Ошибка', 'Не удалось получить видеофайлы');
      }
    });
  };

  const removeFromQueue = (id) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id));
    // Очищаем refs
    delete fileNameRefs.current[id];
    delete fileNameValues.current[id];
    delete itemAnimations.current[id];
  };

  const getFileName = (id) => {
    return fileNameValues.current[id] || '';
  };

  const uploadVideo = async (uploadItem) => {
    const fileName = fileNameValues.current[uploadItem.id] || '';
    
    if (!uploadItem.orderId || !fileName || !fileName.trim()) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    // Обновляем статус на загрузку
    setUploadQueue(prev => 
      prev.map(item => 
        item.id === uploadItem.id 
          ? { ...item, status: 'uploading', progress: 0 }
          : item
      )
    );

    const fileExt = uploadItem.video.type?.split('/')[1] || 'mp4';
    const fullFileName = `${fileName.trim()}.${fileExt}`;

    const formData = new FormData();
    formData.append('video', {
      uri: uploadItem.video.uri,
      type: uploadItem.video.type || 'video/mp4',
      name: fullFileName,
    });
    formData.append('fileName', fileName.trim());
    formData.append('orderId', uploadItem.orderId);

    try {
      await axios.post('https://api.koleso.app/upload_video.php', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadQueue(prev => 
            prev.map(item => 
              item.id === uploadItem.id 
                ? { ...item, progress: percentCompleted }
                : item
            )
          );
        },
      });

      setUploadQueue(prev => 
        prev.map(item => 
          item.id === uploadItem.id 
            ? { ...item, status: 'completed', progress: 100 }
            : item
        )
      );

    } catch (error) {
      console.error('Upload error:', error);
      setUploadQueue(prev => 
        prev.map(item => 
          item.id === uploadItem.id 
            ? { ...item, status: 'error', progress: 0 }
            : item
        )
      );
      Alert.alert('Ошибка', 'Не удалось загрузить видео');
    }
  };

  const uploadAll = () => {
    const pendingUploads = uploadQueue.filter(item => item.status === 'pending');
    pendingUploads.forEach(uploadVideo);
  };

  const selectOrder = (order) => {
    setSelectedOrder(order);
    setShowOrdersModal(false);
    
    // Сначала обновляем очередь
    setUploadQueue(prev => 
      prev.map(item => ({
        ...item,
        orderId: order.number_ozon
      }))
    );
    
    // Затем обновляем значения в refs для пустых полей
    setTimeout(() => {
      uploadQueue.forEach(item => {
        if (!fileNameValues.current[item.id] || fileNameValues.current[item.id].trim() === '') {
          fileNameValues.current[item.id] = order.number_ozon;
          // Обновляем TextInput если он существует
          if (fileNameRefs.current[item.id]) {
            fileNameRefs.current[item.id].setNativeProps({ text: order.number_ozon });
          }
        }
      });
    }, 100);
  };

  const renderUploadItem = ({ item, index }) => {
    const itemScaleAnim = getItemAnimation(item.id);
    


    const getStatusColor = () => {
      switch (item.status) {
        case 'uploading': return colors.primary;
        case 'completed': return colors.success;
        case 'error': return colors.danger;
        default: return colors.textSecondary;
      }
    };

    const getStatusIcon = () => {
      switch (item.status) {
        case 'uploading': return 'cloud-upload';
        case 'completed': return 'check-circle';
        case 'error': return 'error';
        default: return 'videocam';
      }
    };

    const fileName = getFileName(item.id);

    return (
      <Animated.View 
        style={[
          styles.uploadItem,
          { 
            transform: [{ scale: itemScaleAnim }],
            backgroundColor: item.status === 'completed' ? colors.completedBackground : colors.card
          }
        ]}
      >
        {/* Заголовок файла */}
        <View style={styles.uploadItemHeader}>
          <View style={[styles.statusIcon, { backgroundColor: getStatusColor() }]}>
            <Icon name={getStatusIcon()} size={20} color="#FFFFFF" />
          </View>
          <View style={styles.fileBasicInfo}>
            <Text style={[styles.videoFileName, { color: colors.text }]}>
              {item.video.fileName || item.video.uri.split('/').pop()}
            </Text>
            <Text style={[styles.videoFileSize, { color: colors.textSecondary }]}>
              {item.video.fileSize ? `${Math.round(item.video.fileSize / 1024 / 1024)} МБ` : 'Видеофайл'}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.removeButton, { backgroundColor: colors.surface }]}
            onPress={() => {
              animateItemPress(item.id);
              removeFromQueue(item.id);
            }}
          >
            <Icon name="close" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Прогресс загрузки */}
        {item.status === 'uploading' && (
          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>Загружается...</Text>
              <Text style={[styles.progressPercent, { color: colors.primary }]}>{item.progress}%</Text>
            </View>
            <View style={[styles.progressBarContainer, { backgroundColor: colors.iconBackground }]}>
              <Animated.View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${item.progress}%`,
                    backgroundColor: colors.primary 
                  }
                ]} 
              />
            </View>
          </View>
        )}

        {/* Поле ввода названия */}
        {item.status !== 'completed' && (
          <View style={styles.fileNameSection}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Название файла</Text>
            <View style={[
              styles.fileNameInputContainer, 
              { 
                backgroundColor: colors.inputBackground,
                borderColor: colors.border 
              }
            ]}>
              <TextInput
                ref={(ref) => {
                  if (ref) {
                    fileNameRefs.current[item.id] = ref;
                  }
                }}
                key={`input-${item.id}`}
                style={[styles.fileNameInput, { color: colors.text }]}
                defaultValue={fileName}
                onChangeText={(text) => {
                  fileNameValues.current[item.id] = text;
                }}
                placeholder="Введите название"
                placeholderTextColor={colors.textTertiary}
                editable={item.status !== 'uploading'}
                selectTextOnFocus={true}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="done"
                blurOnSubmit={true}
                keyboardAppearance={isDark ? 'dark' : 'light'}
              />
            </View>
            <Text style={[styles.fileExtension, { color: colors.textSecondary }]}>
              Расширение: .{item.video.type?.split('/')[1] || 'mp4'}
            </Text>
          </View>
        )}

        {/* Кнопка загрузки */}
        {item.status === 'pending' && (
          <TouchableOpacity 
            style={[
              styles.uploadButton,
              { backgroundColor: colors.primary },
              (!fileNameValues.current[item.id] || !fileNameValues.current[item.id].trim()) && [
                styles.uploadButtonDisabled,
                { backgroundColor: colors.textTertiary }
              ]
            ]}
            onPress={() => {
              animateItemPress(item.id);
              uploadVideo(item);
            }}
            disabled={!fileNameValues.current[item.id] || !fileNameValues.current[item.id].trim()}
          >
            <Icon name="cloud-upload" size={16} color="#FFFFFF" />
            <Text style={styles.uploadButtonText}>Загрузить</Text>
          </TouchableOpacity>
        )}

        {/* Статус завершения */}
        {item.status === 'completed' && (
          <View style={[styles.completedStatus, { backgroundColor: colors.completedBackground }]}>
            <Icon name="check-circle" size={16} color={colors.success} />
            <Text style={[styles.completedText, { color: colors.success }]}>Успешно загружено</Text>
          </View>
        )}
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom Header */}
      <CustomHeader 
        title="Загрузка видео"
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View 
          style={[
            styles.animatedContent,
            { 
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          {/* Выбор заказа */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Выберите заказ</Text>
            <TouchableOpacity 
              style={[
                styles.orderSelectCard,
                { backgroundColor: colors.cardBackground },
                selectedOrder && [
                  styles.orderSelectCardSelected,
                  { 
                    borderColor: colors.primary,
                    backgroundColor: colors.cardBackgroundSelected 
                  }
                ]
              ]}
              onPress={() => setShowOrdersModal(true)}
            >
              <View style={styles.orderSelectContent}>
                <View style={[
                  styles.orderSelectIcon,
                  { backgroundColor: selectedOrder ? colors.primary : colors.iconBackground }
                ]}>
                  <Icon 
                    name={selectedOrder ? "check-circle" : "receipt"} 
                    size={24} 
                    color={selectedOrder ? "#FFFFFF" : colors.textSecondary} 
                  />
                </View>
                <View style={styles.orderSelectText}>
                  <Text style={[
                    styles.orderSelectTitle,
                    { color: selectedOrder ? colors.primary : colors.textSecondary }
                  ]}>
                    {selectedOrder ? `Заказ #${selectedOrder.number_ozon}` : 'Выберите заказ'}
                  </Text>
                  {!selectedOrder && (
                    <Text style={[styles.orderSelectSubtitle, { color: colors.textTertiary }]}>
                      Нажмите для выбора заказа
                    </Text>
                  )}
                </View>
                <Icon name="chevron-right" size={24} color={colors.textTertiary} />
              </View>
            </TouchableOpacity>
          </View>

          {selectedOrder && (
            <>
              {/* Область добавления файлов */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Добавить видео</Text>
                <TouchableOpacity 
                  style={[
                    styles.addFilesCard,
                    { 
                      backgroundColor: colors.card,
                      borderColor: colors.border 
                    }
                  ]}
                  onPress={selectVideos}
                >
                  <View style={[styles.addFilesIconContainer, { backgroundColor: colors.primaryBackground }]}>
                    <Icon name="add-circle" size={32} color={colors.primary} />
                  </View>
                  <Text style={[styles.addFilesTitle, { color: colors.text }]}>Выберите видеофайлы</Text>
                  <Text style={[styles.addFilesSubtitle, { color: colors.textSecondary }]}>
                    Поддерживается множественный выбор
                  </Text>
                  <Text style={[styles.addFilesFormats, { color: colors.textTertiary }]}>
                    MP4, MOV, AVI до 500 МБ
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Очередь загрузок */}
              {uploadQueue.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.queueHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      Очередь загрузок ({uploadQueue.length})
                    </Text>
                    {uploadQueue.some(item => item.status === 'pending') && (
                      <TouchableOpacity 
                        style={[
                          styles.uploadAllButton,
                          { 
                            backgroundColor: colors.primaryBackground,
                            borderColor: colors.primary 
                          }
                        ]}
                        onPress={uploadAll}
                      >
                        <Icon name="cloud-upload" size={16} color={colors.primary} />
                        <Text style={[styles.uploadAllText, { color: colors.primary }]}>Загрузить все</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <FlatList
                    data={uploadQueue}
                    renderItem={renderUploadItem}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    removeClippedSubviews={false}
                  />
                </View>
              )}
            </>
          )}
        </Animated.View>
      </ScrollView>

      {/* Модальное окно выбора заказа */}
      <Modal
        visible={showOrdersModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowOrdersModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[
            styles.modalHeader, 
            { 
              backgroundColor: colors.background,
              borderBottomColor: colors.border 
            }
          ]}>
            <TouchableOpacity 
              style={[styles.modalCloseButton, { backgroundColor: colors.background }]}
              onPress={() => setShowOrdersModal(false)}
            >
              <Icon name="close" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Выберите заказ</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <FlatList
            data={orders}
            keyExtractor={(item) => item.number_ozon.toString()}
            style={styles.ordersList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.orderCard, { backgroundColor: colors.cardBackground }]}
                onPress={() => selectOrder(item)}
              >
                <View style={[styles.orderCardIcon, { backgroundColor: colors.cardBackground }]}>
                  <Icon name="receipt" size={20} color={colors.primary} />
                </View>
                <View style={styles.orderCardInfo}>
                  <Text style={[styles.orderCardNumber, { color: colors.text }]}>
                    Отправление #{item.number_ozon}
                  </Text>
                </View>
                <Icon name="chevron-right" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Icon name="inbox" size={64} color={colors.textTertiary} />
                <Text style={[styles.emptyStateTitle, { color: colors.textSecondary }]}>Нет заказов</Text>
                <Text style={[styles.emptyStateSubtitle, { color: colors.textTertiary }]}>
                  Отправления пока не найдены
                </Text>
              </View>
            )}
          />
        </View>
      </Modal>
    </View>
  );
});

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  animatedContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  
  // Карточка выбора заказа
  orderSelectCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  orderSelectCardSelected: {
    borderWidth: 2,
  },
  orderSelectContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderSelectIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderSelectText: {
    flex: 1,
    marginLeft: 16,
  },
  orderSelectTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  orderSelectSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },

  // Карточка добавления файлов
  addFilesCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  addFilesIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  addFilesTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  addFilesSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  addFilesFormats: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Заголовок очереди
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  uploadAllText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Элемент очереди загрузки
  uploadItem: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  uploadItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileBasicInfo: {
    flex: 1,
    marginLeft: 12,
  },
  videoFileName: {
    fontSize: 16,
    fontWeight: '600',
  },
  videoFileSize: {
    fontSize: 14,
    marginTop: 2,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Секция прогресса
  progressSection: {
    marginBottom: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Секция названия файла
  fileNameSection: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  fileNameInputContainer: {
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  fileNameInput: {
    fontSize: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  fileExtension: {
    fontSize: 12,
    fontStyle: 'italic',
  },

  // Кнопки
  uploadButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Статус завершения
  completedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },

  // Модальное окно
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  ordersList: {
    flex: 1,
    paddingTop: 20,
  },
  orderCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orderCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderCardInfo: {
    flex: 1,
    marginLeft: 16,
  },
  orderCardNumber: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Пустое состояние
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default VideoUploadScreen;