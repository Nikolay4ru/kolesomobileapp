import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  SafeAreaView,
  Appearance,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';

const CustomHeader = ({
  title = '',
  leftIcon = 'arrow-back',
  leftAction = null,
  rightIcon = null,
  rightAction = null,
  rightIcon2 = null,
  rightAction2 = null,
  centerLogo = null,
  headerStyle = {},
  titleStyle = {},
  iconColor = null,
  iconColorRight = null,
  iconColorRight2 = null,
  iconSize = 24,
  backgroundColor = null,
  modal = false, // Новый параметр
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  
  // Определяем тему
  const { colors, theme } = useTheme();
  const isDarkTheme = theme === 'dark' || (theme === 'auto' && colorScheme === 'dark');
  
  // Цвета по умолчанию
  const defaultColors = {
    background: isDarkTheme ? '#1a1a1a' : '#ffffff',
    text: isDarkTheme ? '#ffffff' : '#000000',
    border: isDarkTheme ? '#333333' : '#eeeeee',
    icon: isDarkTheme ? '#ffffff' : '#000000',
    statusBar: isDarkTheme ? '#1a1a1a' : '#ffffff',
  };
  
  // Финальные цвета
  const finalBackgroundColor = backgroundColor || defaultColors.background;
  const finalIconColor = iconColor || defaultColors.icon;
  const finalIconColorRight = iconColorRight || finalIconColor;
  const finalIconColorRight2 = iconColorRight2 || finalIconColor;
  const statusBarStyle = isDarkTheme ? 'light-content' : 'dark-content';
  
  const handleLeftAction = () => {
    if (leftAction) {
      leftAction();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  // Высота статус бара
  const statusBarHeight = Platform.OS === 'ios' ? 0 : (insets.top || StatusBar.currentHeight || 0);
  
  const HeaderWrapper = ({ children }) => {
    // Если modal = false и платформа iOS, добавляем SafeAreaView
    if (Platform.OS === 'ios' && !modal) {
      return (
        <SafeAreaView style={{ backgroundColor: finalBackgroundColor, flex: 0 }}>
          {children}
        </SafeAreaView>
      );
    }
    return children;
  };

  return (
    <>
      <StatusBar
        backgroundColor={finalBackgroundColor}
        barStyle={statusBarStyle}
        translucent={false}
      />
      
      <HeaderWrapper>
        <View 
          style={[
            styles.container,
            { backgroundColor: finalBackgroundColor },
            Platform.OS === 'android' && { paddingTop: statusBarHeight },
            // Добавляем отступ для iOS если modal = true
            Platform.OS === 'ios' && !modal && { paddingTop: insets.top }
          ]}
        >
          <View 
            style={[
              styles.header,
              { 
                backgroundColor: finalBackgroundColor,
                borderBottomColor: defaultColors.border,
              },
              headerStyle
            ]}
          >
            {/* Левая иконка */}
            <TouchableOpacity
              onPress={handleLeftAction}
              style={styles.sideContainer}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Ionicons name={leftIcon} size={iconSize} color={finalIconColor} />
            </TouchableOpacity>

            {/* Центральный элемент */}
            <View style={styles.centerContainer}>
              {centerLogo ? (
                <Image source={centerLogo} style={styles.logo} resizeMode="contain" />
              ) : (
                <Text 
                  style={[
                    styles.title, 
                    { color: defaultColors.text },
                    titleStyle
                  ]} 
                  numberOfLines={1}
                >
                  {title}
                </Text>
              )}
            </View>

            {/* Правые иконки */}
            <View style={styles.rightIconsContainer}>
              {rightIcon2 && (
                <TouchableOpacity
                  onPress={rightAction2}
                  style={styles.rightIcon}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <Ionicons name={rightIcon2} size={iconSize} color={finalIconColorRight2} />
                </TouchableOpacity>
              )}
              {rightIcon && (
                <TouchableOpacity
                  onPress={rightAction}
                  style={styles.rightIcon}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <Ionicons name={rightIcon} size={iconSize} color={finalIconColorRight} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </HeaderWrapper>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
  },
  sideContainer: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  rightIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 80,
  },
  rightIcon: {
    marginLeft: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  logo: {
    height: 30,
    width: 120,
  },
});

export default CustomHeader;