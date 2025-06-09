import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const Tooltip = ({ visible, onClose, title, description, position, arrowPosition = 'center' }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [tooltipLayout, setTooltipLayout] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false, // Изменено для Android
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 200,
          friction: 15,
          useNativeDriver: false, // Изменено для Android
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  // Расчет позиции с учетом размеров экрана и tooltip
  const tooltipWidth = Math.min(280, screenWidth - 32); // Увеличена ширина
  const tooltipMaxHeight = screenHeight * 0.4; // Максимальная высота
  
  // Безопасное позиционирование
  let left = Math.max(16, Math.min(screenWidth - tooltipWidth - 16, (position?.x || 0) - tooltipWidth / 2));
  let top = (position?.y || 0) + 12; // Отступ от элемента
  
  // Проверяем, не выходит ли tooltip за нижнюю границу
  if (top + tooltipMaxHeight > screenHeight - 100) {
    top = (position?.y || 0) - tooltipMaxHeight - 20; // Показываем сверху
  }

  // Позиция стрелки относительно tooltip
  const arrowLeft = Math.max(12, Math.min(tooltipWidth - 24, (position?.x || 0) - left - 6));

  const tooltipStyle = {
    position: 'absolute',
    top: top,
    left: left,
    width: tooltipWidth,
    maxHeight: tooltipMaxHeight,
    zIndex: 9999,
  };

  const arrowStyle = {
    left: arrowLeft,
  };

  return (
    <>
      {/* Overlay для затемнения и закрытия */}
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            }),
          },
        ]}
      >
        <TouchableOpacity 
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1} 
          onPress={onClose}
        />
      </Animated.View>

      {/* Tooltip */}
      <Animated.View
        style={[
          styles.tooltipContainer,
          tooltipStyle,
          {
            opacity: fadeAnim,
            transform: [{ 
              scale: scaleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              })
            }],
          },
        ]}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setTooltipLayout({ width, height });
        }}
      >
        {/* Стрелка */}
        <View style={[styles.arrow, arrowStyle]} />
        
        {/* Контент */}
        <View style={styles.tooltipContent}>
          <View style={styles.tooltipHeader}>
            <Text style={styles.tooltipTitle} numberOfLines={2}>
              {title}
            </Text>
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.closeButton}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            >
              <Ionicons name="close" size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>
          <Text style={styles.tooltipDescription}>
            {description}
          </Text>
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 9998,
  },
  tooltipContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  arrow: {
    position: 'absolute',
    top: -8,
    width: 16,
    height: 16,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  tooltipContent: {
    padding: 20,
    paddingTop: 24, // Больше отступ сверху для стрелки
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    marginRight: 12,
    lineHeight: 24,
  },
  closeButton: {
    padding: 4,
    marginTop: -4,
    marginRight: -4,
  },
  tooltipDescription: {
    fontSize: 15,
    color: '#3C3C43',
    lineHeight: 22,
    textAlign: 'left',
  },
});

export default Tooltip;