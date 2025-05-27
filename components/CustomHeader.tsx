import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  StatusBar,
  Platform,
  SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

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
  safeAreaStyle = {},
  titleStyle = {},
  iconColor = '#000',
  iconColorRight = '#000',
  iconColorRight2 = '#000',
  iconSize = 24,
  safeArea = false,
  statusBarProps = {},
}) => {
  const navigation = useNavigation();

  const handleLeftAction = () => {
    if (leftAction) {
      leftAction();
    } else if(navigation.canGoBack()) {
     
      navigation.goBack();
    } else {
      navigation.navigate('Home'); // или другой экран по умолчанию
    };
   
  };

  const HeaderContent = () => (
    <View style={[styles.header, headerStyle]}>
      {/* Левая иконка */}
      <TouchableOpacity 
        onPress={handleLeftAction} 
        style={styles.sideContainer}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <Ionicons name={leftIcon} size={iconSize} color={iconColor} />
      </TouchableOpacity>

      {/* Центральный элемент */}
      <View style={styles.centerContainer}>
        {centerLogo ? (
          <Image source={centerLogo} style={styles.logo} resizeMode="contain" />
        ) : (
          <Text style={[styles.title, titleStyle]} numberOfLines={1}>
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
            <Ionicons name={rightIcon2} size={iconSize} color={iconColorRight2} />
          </TouchableOpacity>
        )}
        
        {rightIcon && (
          <TouchableOpacity 
            onPress={rightAction} 
            style={styles.rightIcon}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name={rightIcon} size={iconSize} color={iconColorRight} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <>
      <StatusBar 
        backgroundColor="transparent"
        translucent={true}
        barStyle="dark-content"
        {...statusBarProps}
      />
      
      {safeArea ? (
        <SafeAreaView style={[styles.safeArea, safeAreaStyle]}>
          <HeaderContent />
        </SafeAreaView>
      ) : (
        <HeaderContent />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    //backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    ...Platform.select({
      android: {
        marginTop: StatusBar.currentHeight,
      },
    }),
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
    color: '#000',
  },
  logo: {
    height: 30,
    width: 120,
  },
});

export default CustomHeader;