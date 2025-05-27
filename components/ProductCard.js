import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { observer } from 'mobx-react-lite';
import FastImage from '@d11/react-native-fast-image';
import Ionicons from 'react-native-vector-icons/Ionicons';
const { width } = Dimensions.get('window');
const CARD_MARGIN = 8;
//const CARD_WIDTH = (width - CARD_MARGIN * 3) / 2;



export const ProductCard = observer(({
  product,
  isFavorite,
  onToggleFavorite,
  cardWidth,
}) => {
  return (
    <TouchableOpacity 
      style={[styles.container, { width: cardWidth }]}
      onPress={() => {} /* navigation будет в другом месте */}
    >
      <View style={styles.imageContainer}>
        <FastImage
          source={{ 
            uri: product.image_url || 'https://via.placeholder.com/150',
            priority: FastImage.priority.normal,
          }}
          style={styles.image}
          resizeMode={FastImage.resizeMode.contain}
        />
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation();
            onToggleFavorite(product);
          }}
        >
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={24}
            color={isFavorite ? "#FF3B30" : "rgba(0,0,0,0.5)"}
           // style={styles.favoriteIcon}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.brand} numberOfLines={1}>
          {product.brand} {product.model}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.price}>
          {product.price.toLocaleString()} ₽
        </Text>
        {product.out_of_stock ? (
          <Text style={styles.outOfStock}>Нет в наличии</Text>
        ) : (
          <Text style={styles.inStock}>В наличии</Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: CARD_MARGIN,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
    aspectRatio: 1,
    marginBottom: 8,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteIcon: {
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  infoContainer: {
    paddingHorizontal: 4,
  },
  brand: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    minHeight: 36,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  inStock: {
    color: '#4CAF50',
    fontSize: 12,
  },
  outOfStock: {
    color: '#F44336',
    fontSize: 12,
  },
});