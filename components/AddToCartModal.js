import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

const AddToCartModal = ({ 
  visible, 
  onClose, 
  onGoToCart, 
  product, 
  quantity,
  onAddRelatedProducts,
  authStore,
  cartStore
}) => {
  const { colors, theme } = useTheme();
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedRelated, setSelectedRelated] = useState({});
  const [loading, setLoading] = useState(false);
  const [addingRelated, setAddingRelated] = useState(false);

  useEffect(() => {
    if (visible && product) {
      fetchRelatedProducts();
    } else {
      // Сбрасываем выбранные товары при закрытии
      setSelectedRelated({});
      setRelatedProducts([]);
    }
  }, [visible, product]);

  const fetchRelatedProducts = async () => {
    if (!product?.id) return;
    
    setLoading(true);
    try {
      // Используем реальный API endpoint
      const response = await fetch(
        `https://api.koleso.app/api/related_products.php?product_id=${product.id}&limit=4`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      const data = await response.json();
      
      if (data.success && data.products) {
        setRelatedProducts(data.products);
      } else {
        setRelatedProducts([]);
      }
    } catch (error) {
      console.error('Error fetching related products:', error);
      setRelatedProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleRelatedProduct = (product) => {
    setSelectedRelated(prev => {
      const newSelected = { ...prev };
      if (newSelected[product.id]) {
        delete newSelected[product.id];
      } else {
        newSelected[product.id] = {
          ...product,
          quantity: 1
        };
      }
      return newSelected;
    });
  };

  const handleContinue = () => {
    if (Object.keys(selectedRelated).length > 0) {
      handleAddRelatedToCart();
    } else {
      onClose();
    }
  };

  const handleGoToCart = () => {
    if (Object.keys(selectedRelated).length > 0) {
      handleAddRelatedToCart();
    } else {
      onGoToCart();
    }
  };

  const handleAddRelatedToCart = async () => {
    setAddingRelated(true);
    try {
      for (const [productId, relatedProduct] of Object.entries(selectedRelated)) {
        await cartStore.addToCart({
          product_id: relatedProduct.id,
          quantity: relatedProduct.quantity,
          price: relatedProduct.price,
          name: relatedProduct.name,
          brand: relatedProduct.brand,
          image_url: relatedProduct.image_url,
          // Добавляем дополнительные поля если они есть
          category: relatedProduct.category,
          in_stock: relatedProduct.in_stock
        }, authStore.token);
      }
      
      if (onAddRelatedProducts) {
        onAddRelatedProducts(Object.values(selectedRelated));
      }
      
      // После добавления переходим в корзину
      onGoToCart();
    } catch (error) {
      console.error('Error adding related products:', error);
      // Можно добавить показ ошибки пользователю
    } finally {
      setAddingRelated(false);
    }
  };

  const getRelatedTitle = () => {
    if (!product) return 'Рекомендуемые товары';
    
    switch (product.category) {
      case 'Автошины':
        return 'Рекомендуем пакеты для хранения';
      case 'Диски':
        if (product.rim_type === 'Штампованный') {
          return 'Подберите колпаки к дискам';
        }
        return 'Аксессуары для дисков';
      case 'Аккумуляторы':
        return 'Дополнительные аксессуары';
      case 'Моторные масла':
        return 'Не забудьте фильтры';
      default:
        return 'Рекомендуемые товары';
    }
  };

  const getRelatedSubtitle = () => {
    if (!product) return 'Все необходимое в одном заказе';
    
    switch (product.category) {
      case 'Автошины':
        return 'Защитите шины от пыли и грязи во время хранения';
      case 'Диски':
        return 'Улучшите внешний вид и защитите диски';
      case 'Аккумуляторы':
        return 'Клеммы, зарядные устройства и провода';
      case 'Моторные масла':
        return 'Масляные, воздушные и салонные фильтры';
      default:
        return 'Все необходимое в одном заказе';
    }
  };

  const formatPrice = (price) => {
    return parseFloat(price).toFixed(0);
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      backgroundColor: colors.card,
      borderRadius: 24,
      width: screenWidth - 40,
      maxHeight: '85%',
      overflow: 'hidden',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    header: {
      alignItems: 'center',
      paddingTop: 24,
      paddingHorizontal: 20,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    successIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme === 'dark' ? colors.successDark : '#D1FAE5',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
      fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    },
    productInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      marginTop: 16,
      borderRadius: 12,
    },
    productImage: {
      width: 60,
      height: 60,
      borderRadius: 8,
      marginRight: 12,
      backgroundColor: colors.card,
    },
    productDetails: {
      flex: 1,
    },
    productName: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 4,
      fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    },
    productQuantity: {
      fontSize: 13,
      color: colors.textSecondary,
      fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    },
    productPrice: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    },
    relatedSection: {
      marginTop: 20,
      paddingHorizontal: 20,
    },
    relatedHeader: {
      marginBottom: 8,
    },
    relatedTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    relatedIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    relatedTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
      fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    },
    relatedSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 12,
      marginLeft: 42,
      fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    },
    relatedList: {
      paddingBottom: 8,
    },
    relatedCard: {
      width: (screenWidth - 60) / 2,
      marginRight: 12,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    relatedCardSelected: {
      borderColor: colors.primary,
      backgroundColor: theme === 'dark' ? colors.primaryDark : '#F0FFFE',
    },
    relatedImageContainer: {
      width: '100%',
      height: 100,
      backgroundColor: colors.surface,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
      overflow: 'hidden',
    },
    relatedImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'contain',
    },
    relatedName: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 4,
      minHeight: 32,
      fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    },
    relatedBrand: {
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: 2,
      fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    },
    relatedPrice: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
      fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    },
    oldPrice: {
      fontSize: 12,
      color: colors.textSecondary,
      textDecorationLine: 'line-through',
      marginLeft: 6,
    },
    inStock: {
      fontSize: 11,
      color: colors.success,
      marginBottom: 4,
      fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    },
    selectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: colors.primaryLight,
    },
    selectButtonSelected: {
      backgroundColor: colors.primary,
    },
    selectButtonText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.primary,
      marginLeft: 4,
      fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    },
    selectButtonTextSelected: {
      color: '#FFF',
    },
    loadingContainer: {
      height: 150,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      height: 100,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    },
    actions: {
      padding: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    primaryButton: {
      height: 52,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 12,
    },
    primaryButtonGradient: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFF',
      marginLeft: 8,
      fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    },
    secondaryButton: {
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    },
    closeButton: {
      position: 'absolute',
      top: 16,
      right: 16,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    selectedCount: {
      position: 'absolute',
      top: -8,
      right: -8,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 2,
      minWidth: 24,
      alignItems: 'center',
    },
    selectedCountText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '600',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => {}}
          style={styles.container}
        >
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={32} color={colors.success} />
              </View>
              <Text style={styles.title}>Товар добавлен в корзину</Text>
              <Text style={styles.subtitle}>
                {quantity} {quantity === 1 ? 'товар' : quantity < 5 ? 'товара' : 'товаров'} успешно добавлено
              </Text>
            </View>

            {product && (
              <View style={styles.productInfo}>
                <Image 
                  source={{ uri: product.images?.[0] || product.image_url || 'https://api.koleso.app/public/img/no-image.jpg' }}
                  style={styles.productImage}
                />
                <View style={styles.productDetails}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {product.brand} {product.name}
                  </Text>
                  <Text style={styles.productQuantity}>
                    {quantity} шт.
                  </Text>
                </View>
                <Text style={styles.productPrice}>
                  {formatPrice(product.price * quantity)} ₽
                </Text>
              </View>
            )}

            {/* Показываем секцию только если есть товары или идет загрузка */}
            {(loading || relatedProducts.length > 0) && (
              <View style={styles.relatedSection}>
                <View style={styles.relatedHeader}>
                  <View style={styles.relatedTitleRow}>
                    <View style={styles.relatedIcon}>
                      <Ionicons name="gift-outline" size={18} color={colors.primary} />
                    </View>
                    <Text style={styles.relatedTitle}>{getRelatedTitle()}</Text>
                    {Object.keys(selectedRelated).length > 0 && (
                      <View style={styles.selectedCount}>
                        <Text style={styles.selectedCountText}>
                          {Object.keys(selectedRelated).length}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.relatedSubtitle}>{getRelatedSubtitle()}</Text>
                </View>
                
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : relatedProducts.length > 0 ? (
                  <ScrollView 
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.relatedList}
                  >
                    {relatedProducts.map(item => (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.relatedCard,
                          selectedRelated[item.id] && styles.relatedCardSelected
                        ]}
                        onPress={() => toggleRelatedProduct(item)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.relatedImageContainer}>
                          <Image 
                            source={{ uri: item.image_url || 'https://api.koleso.app/public/img/no-image.jpg' }}
                            style={styles.relatedImage}
                          />
                        </View>
                        {item.brand && (
                          <Text style={styles.relatedBrand} numberOfLines={1}>
                            {item.brand}
                          </Text>
                        )}
                        <Text style={styles.relatedName} numberOfLines={2}>
                          {item.name}
                        </Text>
                        {item.in_stock > 0 && (
                          <Text style={styles.inStock}>
                            В наличии: {item.in_stock} шт.
                          </Text>
                        )}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          <Text style={styles.relatedPrice}>
                            {formatPrice(item.price)} ₽
                          </Text>
                          {item.old_price && item.old_price > item.price && (
                            <Text style={styles.oldPrice}>
                              {formatPrice(item.old_price)} ₽
                            </Text>
                          )}
                        </View>
                        <View style={[
                          styles.selectButton,
                          selectedRelated[item.id] && styles.selectButtonSelected
                        ]}>
                          <Ionicons 
                            name={selectedRelated[item.id] ? "checkmark" : "add"} 
                            size={16} 
                            color={selectedRelated[item.id] ? '#FFF' : colors.primary} 
                          />
                          <Text style={[
                            styles.selectButtonText,
                            selectedRelated[item.id] && styles.selectButtonTextSelected
                          ]}>
                            {selectedRelated[item.id] ? 'Выбрано' : 'Добавить'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      Сопутствующие товары не найдены
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleGoToCart}
              disabled={addingRelated}
            >
              <LinearGradient
                colors={['#006363', '#004545']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.primaryButtonGradient}
              >
                {addingRelated ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="cart" size={20} color="#FFF" />
                    <Text style={styles.primaryButtonText}>
                      Перейти в корзину
                      {Object.keys(selectedRelated).length > 0 && 
                        ` (+${Object.keys(selectedRelated).length})`
                      }
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={handleContinue}
              disabled={addingRelated}
            >
              <Text style={styles.secondaryButtonText}>
                {Object.keys(selectedRelated).length > 0 
                  ? `Добавить выбранное и продолжить`
                  : 'Продолжить покупки'
                }
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default AddToCartModal;