// components/YandexMapView.js
import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import WebView from 'react-native-webview';

const YandexMapView = React.forwardRef((props, ref) => {
  const {
    style,
    initialRegion,
    markers = [],
    polylines = [],
    onMapReady,
    onMarkerPress,
    showsUserLocation = false,
    followsUserLocation = false,
    zoomEnabled = true,
    scrollEnabled = true,
  } = props;
  
  const webViewRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // HTML для Яндекс Карт
  const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <script src="https://api-maps.yandex.ru/2.1/?apikey=YOUR_YANDEX_API_KEY&lang=ru_RU" type="text/javascript"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { width: 100%; height: 100vh; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        let myMap;
        let userPlacemark;
        let markers = [];
        let polylines = [];

        ymaps.ready(init);

        function init() {
          myMap = new ymaps.Map("map", {
            center: [${initialRegion?.latitude || 59.4370}, ${initialRegion?.longitude || 24.7536}],
            zoom: ${initialRegion?.zoom || 12},
            controls: ['zoomControl']
          }, {
            suppressMapOpenBlock: true,
            restrictMapArea: false
          });

          // Настройка поведения карты
          if (!${scrollEnabled}) {
            myMap.behaviors.disable('drag');
          }
          if (!${zoomEnabled}) {
            myMap.behaviors.disable('scrollZoom');
            myMap.behaviors.disable('dblClickZoom');
            myMap.behaviors.disable('multiTouch');
          }

          // Отслеживание местоположения пользователя
          if (${showsUserLocation}) {
            initUserLocation();
          }

          // Уведомляем React Native что карта готова
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapReady'
          }));
        }

        function initUserLocation() {
          if (navigator.geolocation) {
            navigator.geolocation.watchPosition(
              (position) => {
                const coords = [position.coords.latitude, position.coords.longitude];
                
                if (!userPlacemark) {
                  userPlacemark = new ymaps.Placemark(coords, {}, {
                    preset: 'islands#blueCircleDotIcon',
                    iconColor: '#006363'
                  });
                  myMap.geoObjects.add(userPlacemark);
                } else {
                  userPlacemark.geometry.setCoordinates(coords);
                }

                if (${followsUserLocation}) {
                  myMap.setCenter(coords, myMap.getZoom(), {
                    duration: 300
                  });
                }
              },
              (error) => {
                console.error('Geolocation error:', error);
              },
              { enableHighAccuracy: true }
            );
          }
        }

        // Функция добавления маркеров
        function addMarkers(markersData) {
          // Удаляем старые маркеры
          markers.forEach(marker => myMap.geoObjects.remove(marker));
          markers = [];

          // Добавляем новые
          markersData.forEach((markerData, index) => {
            const marker = new ymaps.Placemark(
              [markerData.coordinate.latitude, markerData.coordinate.longitude],
              {
                hintContent: markerData.title || '',
                balloonContent: markerData.description || ''
              },
              {
                preset: markerData.pinColor === 'red' ? 'islands#redIcon' : 'islands#blueIcon',
                iconColor: markerData.pinColor || '#006363'
              }
            );

            marker.events.add('click', () => {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'markerPress',
                markerId: markerData.id || index
              }));
            });

            markers.push(marker);
            myMap.geoObjects.add(marker);
          });
        }

        // Функция добавления линий
        function addPolylines(polylinesData) {
          // Удаляем старые линии
          polylines.forEach(polyline => myMap.geoObjects.remove(polyline));
          polylines = [];

          // Добавляем новые
          polylinesData.forEach(polylineData => {
            const coordinates = polylineData.coordinates.map(coord => [coord.latitude, coord.longitude]);
            
            const polyline = new ymaps.Polyline(coordinates, {}, {
              strokeColor: polylineData.strokeColor || '#006363',
              strokeWidth: polylineData.strokeWidth || 3,
              strokeOpacity: 0.8
            });

            polylines.push(polyline);
            myMap.geoObjects.add(polyline);
          });
        }

        // Функция анимации к региону
        function animateToRegion(region, duration = 500) {
          myMap.setCenter(
            [region.latitude, region.longitude],
            region.zoom || myMap.getZoom(),
            {
              duration: duration,
              checkZoomRange: true
            }
          );
        }

        // Функция подгонки карты под все объекты
        function fitToCoordinates(coordinates, edgePadding = {}) {
          if (coordinates.length === 0) return;

          const bounds = coordinates.map(coord => [coord.latitude, coord.longitude]);
          
          myMap.setBounds(bounds, {
            checkZoomRange: true,
            duration: 500,
            callback: () => {
              // Применяем отступы если нужно
              if (edgePadding.top || edgePadding.bottom || edgePadding.left || edgePadding.right) {
                const zoom = myMap.getZoom();
                myMap.setZoom(zoom - 0.5);
              }
            }
          });
        }

        // Обработка сообщений от React Native
        window.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
              case 'addMarkers':
                addMarkers(data.markers);
                break;
              case 'addPolylines':
                addPolylines(data.polylines);
                break;
              case 'animateToRegion':
                animateToRegion(data.region, data.duration);
                break;
              case 'fitToCoordinates':
                fitToCoordinates(data.coordinates, data.edgePadding);
                break;
            }
          } catch (error) {
            console.error('Message parsing error:', error);
          }
        });
      </script>
    </body>
    </html>
  `;

  // Отправка команд в WebView
  const sendCommand = (command) => {
    if (webViewRef.current && isMapReady) {
      webViewRef.current.postMessage(JSON.stringify(command));
    }
  };

  // Обновление маркеров
  useEffect(() => {
    if (isMapReady && markers.length > 0) {
      sendCommand({ type: 'addMarkers', markers });
    }
  }, [markers, isMapReady]);

  // Обновление линий
  useEffect(() => {
    if (isMapReady && polylines.length > 0) {
      sendCommand({ type: 'addPolylines', polylines });
    }
  }, [polylines, isMapReady]);

  // Обработка сообщений от WebView
  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'mapReady':
          setIsMapReady(true);
          onMapReady?.();
          break;
        case 'markerPress':
          onMarkerPress?.(data.markerId);
          break;
      }
    } catch (error) {
      console.error('WebView message error:', error);
    }
  };

  // Публичные методы через ref
  React.useImperativeHandle(ref, () => ({
    animateToRegion: (region, duration) => {
      sendCommand({ type: 'animateToRegion', region, duration });
    },
    fitToCoordinates: (coordinates, edgePadding) => {
      sendCommand({ type: 'fitToCoordinates', coordinates, edgePadding });
    }
  }));

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: mapHTML }}
        style={styles.webView}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#006363" />
          </View>
        )}
        mixedContentMode="compatibility"
        originWhitelist={['*']}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default YandexMapView;