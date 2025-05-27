const generateId = () => Math.random().toString(36).substr(2, 9);import React, { useState, useEffect, useRef } from 'react';
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
        case 'uploading': return '#007AFF';
        case 'completed': return '#34C759';
        case 'error': return '#FF3B30';
        default: return '#8E8E93';
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
            backgroundColor: item.status === 'completed' ? '#F0FFF4' : '#FFFFFF'
          }
        ]}
      >
        {/* Заголовок файла */}
        <View style={styles.uploadItemHeader}>
          <View style={[styles.statusIcon, { backgroundColor: getStatusColor() }]}>
            <Icon name={getStatusIcon()} size={20} color="#FFFFFF" />
          </View>
          <View style={styles.fileBasicInfo}>
            <Text style={styles.videoFileName}>
              {item.video.fileName || item.video.uri.split('/').pop()}
            </Text>
            <Text style={styles.videoFileSize}>
              {item.video.fileSize ? `${Math.round(item.video.fileSize / 1024 / 1024)} МБ` : 'Видеофайл'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={() => {
              animateItemPress(item.id);
              removeFromQueue(item.id);
            }}
          >
            <Icon name="close" size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        {/* Прогресс загрузки */}
        {item.status === 'uploading' && (
          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressText}>Загружается...</Text>
              <Text style={styles.progressPercent}>{item.progress}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <Animated.View 
                style={[
                  styles.progressBarFill, 
                  { width: `${item.progress}%` }
                ]} 
              />
            </View>
          </View>
        )}

        {/* Поле ввода названия */}
        {item.status !== 'completed' && (
          <View style={styles.fileNameSection}>
            <Text style={styles.fieldLabel}>Название файла</Text>
            <View style={styles.fileNameInputContainer}>
              <TextInput
                ref={(ref) => {
                  if (ref) {
                    fileNameRefs.current[item.id] = ref;
                  }
                }}
                key={`input-${item.id}`}
                style={styles.fileNameInput}
                defaultValue={fileName}
                onChangeText={(text) => {
                  fileNameValues.current[item.id] = text;
                }}
                placeholder="Введите название"
                placeholderTextColor="#C7C7CC"
                editable={item.status !== 'uploading'}
                selectTextOnFocus={true}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="done"
                blurOnSubmit={true}
              />
            </View>
            <Text style={styles.fileExtension}>
              Расширение: .{item.video.type?.split('/')[1] || 'mp4'}
            </Text>
          </View>
        )}

        {/* Кнопка загрузки */}
        {item.status === 'pending' && (
          <TouchableOpacity 
            style={[
              styles.uploadButton,
              (!fileNameValues.current[item.id] || !fileNameValues.current[item.id].trim()) && styles.uploadButtonDisabled
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
          <View style={styles.completedStatus}>
            <Icon name="check-circle" size={16} color="#34C759" />
            <Text style={styles.completedText}>Успешно загружено</Text>
          </View>
        )}
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: statusBarHeight }]}>
      {/* Gradient Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Загрузка видео</Text>
        <View style={{ width: 40 }} />
      </View>

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
            <Text style={styles.sectionTitle}>Выберите заказ</Text>
            <TouchableOpacity 
              style={[
                styles.orderSelectCard,
                selectedOrder && styles.orderSelectCardSelected
              ]}
              onPress={() => setShowOrdersModal(true)}
            >
              <View style={styles.orderSelectContent}>
                <View style={[
                  styles.orderSelectIcon,
                  { backgroundColor: selectedOrder ? '#007AFF' : '#F0F0F0' }
                ]}>
                  <Icon 
                    name={selectedOrder ? "check-circle" : "receipt"} 
                    size={24} 
                    color={selectedOrder ? "#FFFFFF" : "#8E8E93"} 
                  />
                </View>
                <View style={styles.orderSelectText}>
                  <Text style={[
                    styles.orderSelectTitle,
                    selectedOrder && styles.orderSelectedTitle
                  ]}>
                    {selectedOrder ? `Заказ #${selectedOrder.number_ozon}` : 'Выберите заказ'}
                  </Text>
                  {!selectedOrder && (
                    <Text style={styles.orderSelectSubtitle}>
                      Нажмите для выбора заказа
                    </Text>
                  )}
                </View>
                <Icon name="chevron-right" size={24} color="#C7C7CC" />
              </View>
            </TouchableOpacity>
          </View>

          {selectedOrder && (
            <>
              {/* Область добавления файлов */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Добавить видео</Text>
                <TouchableOpacity 
                  style={styles.addFilesCard}
                  onPress={selectVideos}
                >
                  <View style={styles.addFilesIconContainer}>
                    <Icon name="add-circle" size={32} color="#007AFF" />
                  </View>
                  <Text style={styles.addFilesTitle}>Выберите видеофайлы</Text>
                  <Text style={styles.addFilesSubtitle}>
                    Поддерживается множественный выбор
                  </Text>
                  <Text style={styles.addFilesFormats}>
                    MP4, MOV, AVI до 500 МБ
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Очередь загрузок */}
              {uploadQueue.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.queueHeader}>
                    <Text style={styles.sectionTitle}>
                      Очередь загрузок ({uploadQueue.length})
                    </Text>
                    {uploadQueue.some(item => item.status === 'pending') && (
                      <TouchableOpacity 
                        style={styles.uploadAllButton}
                        onPress={uploadAll}
                      >
                        <Icon name="cloud-upload" size={16} color="#007AFF" />
                        <Text style={styles.uploadAllText}>Загрузить все</Text>
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
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowOrdersModal(false)}
            >
              <Icon name="close" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Выберите заказ</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <FlatList
            data={orders}
            keyExtractor={(item) => item.number_ozon.toString()}
            style={styles.ordersList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.orderCard}
                onPress={() => selectOrder(item)}
              >
                <View style={styles.orderCardIcon}>
                  <Icon name="receipt" size={20} color="#007AFF" />
                </View>
                <View style={styles.orderCardInfo}>
                  <Text style={styles.orderCardNumber}>
                    Отправление #{item.number_ozon}
                  </Text>
                </View>
                <Icon name="chevron-right" size={20} color="#C7C7CC" />
              </TouchableOpacity>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Icon name="inbox" size={64} color="#C7C7CC" />
                <Text style={styles.emptyStateTitle}>Нет заказов</Text>
                <Text style={styles.emptyStateSubtitle}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
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
    color: '#1A1A1A',
    marginBottom: 16,
  },
  
  // Карточка выбора заказа
  orderSelectCard: {
    backgroundColor: '#FFFFFF',
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
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
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
    color: '#8E8E93',
  },
  orderSelectedTitle: {
    color: '#007AFF',
  },
  orderSelectSubtitle: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 2,
  },

  // Карточка добавления файлов
  addFilesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  addFilesIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  addFilesTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  addFilesSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 8,
  },
  addFilesFormats: {
    fontSize: 14,
    color: '#C7C7CC',
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
    backgroundColor: '#F0F8FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  uploadAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 6,
  },

  // Элемент очереди загрузки
  uploadItem: {
    backgroundColor: '#FFFFFF',
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
    color: '#1A1A1A',
  },
  videoFileSize: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF5F5',
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
    color: '#8E8E93',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },

  // Секция названия файла
  fileNameSection: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  fileNameInputContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 8,
  },
  fileNameInput: {
    fontSize: 16,
    color: '#1A1A1A',
    paddingVertical: 12,
    minHeight: 44,
  },
  fileExtension: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },

  // Кнопки
  uploadButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButtonDisabled: {
    backgroundColor: '#C7C7CC',
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
    backgroundColor: '#F0FFF4',
    borderRadius: 8,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#34C759',
    marginLeft: 6,
  },

  // Модальное окно
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  ordersList: {
    flex: 1,
    paddingTop: 20,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#F0F8FF',
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
    color: '#1A1A1A',
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
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#C7C7CC',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default VideoUploadScreen;