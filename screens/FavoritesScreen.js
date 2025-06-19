import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  StatusBar
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useStores } from '../useStores';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FastImage from "@d11/react-native-fast-image";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const FavoritesScreen = observer(({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { authStore, favoritesStore } = useStores();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const [loading, setLoading] = useState(true);
  const [localRemovals, setLocalRemovals] = useState([]);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        if (authStore.isLoggedIn) {
          await favoritesStore._loadFromServer(authStore.token);
        } else {
          favoritesStore._loadFromLocalStorage();
        }
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, [authStore.isLoggedIn, authStore.token]);

  const toggleFavorite = async (product) => {
    setLocalRemovals(prev => [...prev, product.id]);
    
    try {
      await favoritesStore.removeFromFavorites(product.product_id, authStore.token);
    } catch (error) {
      setLocalRemovals(prev => prev.filter(id => id !== product.id));
      console.error('Error removing favorite:', error);
    }
  };

  const visibleItems = favoritesStore.items.filter(
    item => !localRemovals.includes(item.id)
  );

  const renderItem = ({ item, index }) => {
    const isLastOdd = visibleItems.length % 2 === 1 && index === visibleItems.length - 1;
    
    return (
      <TouchableOpacity 
        style={[
          styles.card,
          isLastOdd && styles.lastOddCard
        ]}
        onPress={() => navigation.navigate('Product', { productId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.imageContainer}>
          <FastImage
            style={styles.image}
            source={{ uri: item.image_url }}
            resizeMode={FastImage.resizeMode.cover}
          />
          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={(e) => {
              e.stopPropagation();
              toggleFavorite(item);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.favoriteButtonInner}>
              <Ionicons name="heart" size={20} color={colors.error} />
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.price}>{item.price.toLocaleString('ru-RU')} ₽</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar 
          barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Избранное</Text>
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.error} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar 
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Избранное</Text>
        {visibleItems.length > 0 && (
          <Text style={styles.headerCount}>{visibleItems.length} товаров</Text>
        )}
      </View>

      {visibleItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="heart-outline" size={64} color={colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>Здесь пока пусто</Text>
          <Text style={styles.emptySubtitle}>
            Добавляйте товары в избранное,{'\n'}чтобы вернуться к ним позже
          </Text>
          <TouchableOpacity 
            style={styles.exploreButton}
            onPress={() => navigation.navigate('Catalog')}
            activeOpacity={0.8}
          >
            <Text style={styles.exploreButtonText}>Перейти к покупкам</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={visibleItems}
          renderItem={renderItem}
          keyExtractor={item => `fav-${item.id}`}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
});

const themedStyles = (colors, theme) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerCount: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 30,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  lastOddCard: {
    marginRight: CARD_WIDTH + 16,
  },
  imageContainer: {
    width: '100%',
    height: CARD_WIDTH,
    backgroundColor: colors.surface,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  favoriteButtonInner: {
    width: 36,
    height: 36,
    backgroundColor: colors.card,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  info: {
    padding: 16,
  },
  name: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    marginBottom: 8,
    lineHeight: 18,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: -60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    backgroundColor: colors.surface,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  exploreButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});

export default FavoritesScreen;