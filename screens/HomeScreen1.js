import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar
} from "react-native";

import { useSafeAreaInsets } from 'react-native-safe-area-context';




import { useNavigation } from "@react-navigation/native";


const HomeScreen = () => {
  
  const insets = useSafeAreaInsets();
  const statusBarHeight = insets.top;
  console.log('height of status bar', insets.top);
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigation = useNavigation();
  const scrollX = new Animated.Value(0); // Для анимации
  const flatListRef = useRef(null); // Ссылка на FlatList
    // Получаем высоту статус-бара
   


    // Пример состояния для записи на шиномонтаж
  const [booking, setBooking] = useState(
    //{
 //   date: "2023-10-15",
 //   time: "14:00",
 //   service: "Шиномонтаж",
//  }
);

  const slides = [
    {
      id: 1,
      image: "https://www.koleso-russia.ru/upload/resize_cache/iblock/359/449_476_0/e6p4btxrzy26h2dzjys7f4n6jb7i3ilt.jpg",
      title: "Акция 1",
    },
    {
      id: 2,
      image: "https://www.koleso-russia.ru/upload/resize_cache/iblock/d0b/449_476_0/rx1agxnl1wykahxr8u68v7cxbxpbz38h.jpg",
      title: "Акция 2",
    },
    {
      id: 3,
      image: "https://www.koleso-russia.ru/upload/resize_cache/iblock/359/449_476_0/e6p4btxrzy26h2dzjys7f4n6jb7i3ilt.jpg",
      title: "Акция 3",
    },
  ];



// Автоматическое переключение слайдов
useEffect(() => {
  const interval = setInterval(() => {
    setCurrentSlide((prev) => {
      const nextSlide = (prev + 1) % slides.length;
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({
          offset: nextSlide * Dimensions.get("window").width,
          animated: true,
        });
      }
      return nextSlide;
    });
  }, 3000); // Переключение каждые 3 секунды

  return () => clearInterval(interval);
}, []);

  const handlePromotionPress = (title) => {
    navigation.navigate("PromotionDetails", { title });
  };

  const handleBookingPress = () => {
    if (booking) {
      navigation.navigate("Booking", { booking });
    } else {
      navigation.navigate("Booking");
    }
  };

  return (
   // <SafeAreaView style={styles.safeAreaContainer}> {/* Оборачиваем в SafeAreaView */}
  <ScrollView
  style={[styles.container, { paddingTop: statusBarHeight }]} // Добавляем отступ сверху
>
      
     

      {/* Слайдер изображений */}
      <View style={styles.sliderContainer}>
        <Animated.FlatList
          data={slides}
          ref={flatListRef}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={32}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.slide}
              onPress={() => handlePromotionPress(item.title)}
            >
              <Image source={{ uri: item.image }} style={styles.sliderImage} />
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Раздел подбора товаров */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Подбор товаров</Text>
        <View style={styles.selectionOptions}>
          <TouchableOpacity
            style={styles.selectionOption}
            onPress={() => navigation.navigate("FilterAuto")}
          >
            <Text style={styles.optionText}>По автомобилю</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.selectionOption}
            onPress={() => navigation.navigate("ProductList")}
          >
            <Text style={styles.optionText}>По параметрам</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Популярные товары */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Популярные товары</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {Array.from({ length: 5 }).map((_, index) => (
            <View key={index} style={styles.productCard}>
              <Image
                source={{ uri: slides[index % slides.length].image }}
                style={styles.productImage}
              />
              <Text style={styles.productName}>Товар {index + 1}</Text>
              <Text style={styles.productPrice}>{(index + 1) * 100} ₽</Text>
            </View>
          ))}
        </ScrollView>
      </View>

 {/* Блок с кнопками */}
 <View style={styles.buttonsContainer}>
        {/* Кнопка скидочной карты */}
        <TouchableOpacity
          style={styles.discountCardButton}
          onPress={() => navigation.navigate("DiscountCard")}
        >
          <Text style={styles.discountCardButtonText}>QR-код</Text>
        </TouchableOpacity>

 {/* Кнопка записи на шиномонтаж */}
 <TouchableOpacity
          style={styles.bookingButton}
          onPress={handleBookingPress}
        >
          {booking ? (
            <View>
              <Text style={styles.bookingInfoTitle}>Моя запись</Text>
              <Text style={styles.bookingInfoText}>
                {booking.date} в {booking.time}
              </Text>
            </View>
          ) : (
            <Text style={styles.bookingButtonText}>Записаться</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
    //</SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5", // Фон всей страницы
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  bookingButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: "#007bff",
    borderRadius: 20,
  },
  bookingButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  sliderContainer: {
    height: 200,
    marginBottom: 20,
  },
  slide: {
    width: Dimensions.get("window").width,
    justifyContent: "center",
    alignItems: "center",
  },
  sliderImage: {
    width: "90%",
    height: "90%",
    resizeMode: "cover",
    borderRadius: 15, // Закругленные края
  },
  sectionContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  selectionOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  selectionOption: {
    flex: 1,
    paddingVertical: 15,
    marginHorizontal: 5,
    backgroundColor: "#fff",
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  optionText: {
    fontSize: 16,
    color: "#333",
  },
  productCard: {
    width: 150,
    marginRight: 15,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  productImage: {
    width: "100%",
    height: 100,
    resizeMode: "contain",
    marginBottom: 10,
    borderRadius: 10, // Закругленные края
  },
  productName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
  },
  productPrice: {
    fontSize: 14,
    color: "#007bff",
    textAlign: "center",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: 20,
    marginBottom: 20,
  },
  discountCardButton: {
    flex: 1,
    paddingVertical: 15,
    backgroundColor: "#007bff",
    borderRadius: 10,
    alignItems: "center",
    marginRight: 10,
  },
  discountCardButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  bookingButton: {
    flex: 1,
    paddingVertical: 15,
    backgroundColor: "#28a745",
    borderRadius: 10,
    alignItems: "center",
    marginLeft: 10,
  },
  bookingButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  bookingInfoTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  bookingInfoText: {
    color: "#e9ecef",
    fontSize: 14,
    textAlign: "center",
  },
});