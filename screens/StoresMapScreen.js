import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
  Linking,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { WebView } from 'react-native-webview';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import CustomHeader from '../components/CustomHeader';

// Подставьте свой ключ Яндекс.Карт JS API
const YANDEX_API_KEY = '96489b89-9428-4359-9957-ed005544f695';

// URL вашей иконки-маркера (можно локальный файл или web-url)
const MARKER_ICON_URL = 'https://cdn-icons-png.flaticon.com/512/684/684908.png';

const stores = [
  {
    id: 1,
    name: 'Koleso на Мичурина',
    address: 'ул. Мичурина, 48',
    coordinates: [30.3141, 59.9386],
    phone: '+7 (800) 555-35-35',
    workingHours: 'Пн-Вс: 9:00-21:00',
    services: ['Шиномонтаж', 'Хранение', 'Продажа шин'],
    isOpen: true,
  },
  {
    id: 2,
    name: 'Koleso на Ленина',
    address: 'пр. Ленина, 120',
    coordinates: [30.3609, 59.9311],
    phone: '+7 (800) 555-35-35',
    workingHours: 'Пн-Вс: 8:00-22:00',
    services: ['Шиномонтаж', 'Правка дисков', 'Диагностика'],
    isOpen: true,
  },
  {
    id: 3,
    name: 'Koleso на Садовой',
    address: 'ул. Садовая, 25',
    coordinates: [30.3358, 59.9270],
    phone: '+7 (800) 555-35-35',
    workingHours: 'Пн-Сб: 9:00-20:00, Вс: 10:00-18:00',
    services: ['Продажа шин', 'Аксессуары'],
    isOpen: false,
  },
];

const StoresMapScreen = () => {
  const navigation = useNavigation();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const webviewRef = useRef(null);
  const bottomSheetRef = useRef(null);

  const [selectedStore, setSelectedStore] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  // Темная тема для Яндекс карт
  const darkMapStyle = [
    {
      "tags": "all",
      "elements": "geometry",
      "stylers": [{"color": "#242f3e"}]
    },
    {
      "tags": "all",
      "elements": "label.text.fill",
      "stylers": [{"color": "#746855"}]
    },
    {
      "tags": "all",
      "elements": "label.text.stroke",
      "stylers": [{"color": "#242f3e"}]
    },
    {
      "tags": "administrative",
      "elements": "geometry",
      "stylers": [{"visibility": "off"}]
    },
    {
      "tags": "administrative.country",
      "elements": "label.text.fill",
      "stylers": [{"color": "#ffffff"}]
    },
    {
      "tags": "road",
      "elements": "geometry.fill",
      "stylers": [{"color": "#38414e"}]
    },
    {
      "tags": "road",
      "elements": "geometry.stroke",
      "stylers": [{"color": "#212a37"}]
    },
    {
      "tags": "road",
      "elements": "label.text.fill",
      "stylers": [{"color": "#9ca5b3"}]
    }
  ];

  // Передаём данные магазинов в WebView через injectedJavaScript
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <style>
        html, body, #map { 
          height: 100%; 
          margin: 0; 
          padding: 0; 
          background-color: ${theme === 'dark' ? '#1a1a1a' : '#ffffff'};
        }
      </style>
      <script src="https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_API_KEY}&amp;lang=ru_RU"></script>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const stores = ${JSON.stringify(stores)};
        const isDarkTheme = ${theme === 'dark' ? 'true' : 'false'};
        
        ymaps.ready(function () {
          const map = new ymaps.Map("map", {
            center: [59.9311, 30.3609],
            zoom: 12,
            controls: ['geolocationControl']
          });
          
          // Настройки для темной темы
          if (isDarkTheme) {
            map.panes.get('ground').getElement().style.filter = 'brightness(0.7) contrast(1.2) hue-rotate(180deg) invert(1)';
            map.container.getElement().style.background = '#1a1a1a';
          }
          
          map.behaviors.disable('scrollZoom');
          map.behaviors.disable('dblClickZoom');
          map.behaviors.disable('multiTouch');
          map.controls.remove('zoomControl');
          
          stores.forEach(store => {
            const placemark = new ymaps.Placemark(
              [store.coordinates[1], store.coordinates[0]],
              {
                balloonContentHeader: store.name,
                balloonContentBody: store.address,
                balloonContentFooter: store.workingHours,
                storeId: store.id
              },
              {
                iconLayout: 'default#image',
                iconImageHref: '${MARKER_ICON_URL}',
                iconImageSize: [40, 40],
                iconImageOffset: [-20, -40],
              }
            );
            placemark.events.add('click', function (e) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'selectStore', id: store.id }));
            });
            map.geoObjects.add(placemark);
          });
        });
      </script>
    </body>
    </html>
  `;

  const onWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'selectStore') {
        const store = stores.find(s => s.id === data.id);
        if (store) {
          setSelectedStore(store);
          bottomSheetRef.current?.expand();
        }
      }
    } catch (e) {}
  };

  const handleCallPress = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleRoutePress = (store) => {
    const [lon, lat] = store.coordinates;
    const url = Platform.select({
      ios: `yandexmaps://maps.yandex.ru/?pt=${lon},${lat}&z=12&l=map`,
      android: `yandexmaps://maps.yandex.ru/?pt=${lon},${lat}&z=12&l=map`
    });

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          // Fallback на веб-версию
          const webUrl = `https://yandex.ru/maps/?pt=${lon},${lat}&z=12&l=map`;
          return Linking.openURL(webUrl);
        }
      })
      .catch((err) => console.error('An error occurred', err));
  };

  const renderStoreDetails = () => {
    if (!selectedStore) return null;

    return (
      <View style={styles.storeDetails}>
        <View style={styles.storeHeader}>
          <View style={styles.storeInfo}>
            <Text style={styles.storeName}>{selectedStore.name}</Text>
            <Text style={styles.storeAddress}>{selectedStore.address}</Text>
            <View style={styles.storeStatus}>
              <View style={[
                styles.statusDot,
                { backgroundColor: selectedStore.isOpen ? colors.success : colors.error }
              ]} />
              <Text style={[
                styles.statusText,
                { color: selectedStore.isOpen ? colors.success : colors.error }
              ]}>
                {selectedStore.isOpen ? 'Открыто' : 'Закрыто'}
              </Text>
              <Text style={styles.workingHours}> • {selectedStore.workingHours}</Text>
            </View>
          </View>
        </View>
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Услуги</Text>
          <View style={styles.servicesList}>
            {selectedStore.services.map((service, index) => (
              <View key={index} style={styles.serviceChip}>
                <Text style={styles.serviceText}>{service}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.callButton]}
            onPress={() => handleCallPress(selectedStore.phone)}
            activeOpacity={0.7}
          >
            <Ionicons name="call" size={20} color="#FFFFFF" />
            <Text style={styles.callButtonText}>Позвонить</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.routeButton]}
            onPress={() => handleRoutePress(selectedStore)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="directions" size={20} color={colors.primary} />
            <Text style={styles.routeButtonText}>Маршрут</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Рассчитываем snap points с учетом tabBar
  const snapPoints = [`${35 + (tabBarHeight / 3)}%`];

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <CustomHeader 
        title="Наши магазины" 
        showBackButton={true}
        statusBarProps={{
          barStyle: theme === 'dark' ? 'light-content' : 'dark-content',
          backgroundColor: colors.background
        }}
        safeAreaStyle={{
          backgroundColor: colors.background
        }}
      />
      <View style={styles.mapContainer}>
        <WebView
          ref={webviewRef}
          source={{ html: mapHtml }}
          style={styles.map}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={onWebViewMessage}
          startInLoadingState={true}
          scrollEnabled={false}
          scalesPageToFit={false}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        />
        <TouchableOpacity
          style={styles.listButton}
          onPress={() => navigation.navigate('StoresList', { stores })}
          activeOpacity={0.8}
        >
          <Ionicons name="list" size={20} color={colors.text} />
          <Text style={styles.listButtonText}>Список</Text>
        </TouchableOpacity>
      </View>
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{ backgroundColor: colors.textTertiary }}
        bottomInset={tabBarHeight}
        detached={false}
        style={{ marginHorizontal: 0 }}
      >
        <BottomSheetView style={[styles.bottomSheetContent, { paddingBottom: tabBarHeight }]}>
          {renderStoreDetails()}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
};

const themedStyles = (colors, theme) => ({
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: colors.background 
  },
  mapContainer: { 
    flex: 1, 
    position: 'relative',
    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
  },
  map: { 
    flex: 1,
    backgroundColor: 'transparent',
  },
  markerContainer: { 
    width: 40, 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  selectedMarker: { 
    transform: [{ scale: 1.2 }] 
  },
  markerIcon: {
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: colors.card,
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: colors.shadow, 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 4, 
    elevation: 5,
  },
  listButton: {
    position: 'absolute', 
    top: 16, 
    right: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.card,
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 20, 
    shadowColor: colors.shadow, 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.3 : 0.1, 
    shadowRadius: 4, 
    elevation: 3, 
    gap: 6,
  },
  listButtonText: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: colors.text 
  },
  // Bottom Sheet
  bottomSheetContent: { 
    flex: 1, 
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  storeDetails: { 
    flex: 1 
  },
  storeHeader: { 
    marginBottom: 20 
  },
  storeInfo: { 
    flex: 1 
  },
  storeName: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: colors.text, 
    marginBottom: 4 
  },
  storeAddress: { 
    fontSize: 16, 
    color: colors.textSecondary, 
    marginBottom: 8 
  },
  storeStatus: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statusDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    marginRight: 6 
  },
  statusText: { 
    fontSize: 14, 
    fontWeight: '500' 
  },
  workingHours: { 
    fontSize: 14, 
    color: colors.textSecondary 
  },
  servicesSection: { 
    marginBottom: 24 
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: colors.text, 
    marginBottom: 12 
  },
  servicesList: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8 
  },
  serviceChip: { 
    backgroundColor: colors.surface, 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 16 
  },
  serviceText: { 
    fontSize: 14, 
    color: colors.text 
  },
  actionsRow: { 
    flexDirection: 'row', 
    gap: 12,
    marginBottom: 20,
  },
  actionButton: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 14, 
    borderRadius: 12, 
    gap: 8 
  },
  callButton: { 
    backgroundColor: colors.primary 
  },
  callButtonText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#FFFFFF' 
  },
  routeButton: { 
    backgroundColor: colors.primary + '15' 
  },
  routeButtonText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: colors.primary 
  },
});

export default StoresMapScreen;