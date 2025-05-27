import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

const CARD_WIDTH = (window.innerWidth - 24) / 2 - 8; // как в ProductListScreen

const SkeletonCard = () => {
  return (
    <SkeletonPlaceholder>
      <View style={{ width: CARD_WIDTH, marginBottom: 8 }}>
        {/* Изображение */}
        <View
          style={{
            width: '100%',
            height: CARD_WIDTH,
            borderRadius: 8,
            marginBottom: 10,
          }}
        />
        {/* Название */}
        <View
          style={{
            width: '90%',
            height: 16,
            borderRadius: 4,
            marginBottom: 6,
          }}
        />
        {/* Бренд */}
        <View
          style={{
            width: '70%',
            height: 14,
            borderRadius: 4,
            marginBottom: 6,
          }}
        />
        {/* Цена */}
        <View
          style={{
            width: '50%',
            height: 16,
            borderRadius: 4,
            marginBottom: 4,
          }}
        />
        {/* Статус и теги */}
        <View
          style={{
            width: '40%',
            height: 12,
            borderRadius: 4,
            marginBottom: 8,
          }}
        />
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 4,
          }}
        >
          {[1, 2].map((i) => (
            <View
              key={i}
              style={{
                width: i === 1 ? '45%' : '35%',
                height: 12,
                borderRadius: 6,
              }}
            />
          ))}
        </View>
      </View>
    </SkeletonPlaceholder>
  );
};

export default SkeletonCard;