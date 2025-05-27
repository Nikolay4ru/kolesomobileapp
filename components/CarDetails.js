import React from 'react';
import { View, StyleSheet, Image, ScrollView, Dimensions } from 'react-native';
import { Card, Title, Paragraph, Text, Divider } from 'react-native-paper';

const CarDetails = ({ details }) => {
  const { car, wheels, batteries, images } = details;
  const screenWidth = Dimensions.get('window').width;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>
            {car.marka} {car.model} {car.modification}
          </Title>
          <Paragraph style={styles.years}>
            {car.beginyear}-{car.endyear} года
          </Paragraph>

          {/* Галерея изображений */}
          {images.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Изображения:</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.imagesContainer}
              >
                {images.map((img, index) => (
                  <Image
                    key={index}
                    source={{ uri: img.url }}
                    style={[styles.image, { width: screenWidth * 0.6 }]}
                    resizeMode="contain"
                  />
                ))}
              </ScrollView>
              <Divider style={styles.divider} />
            </>
          )}

          {/* Характеристики колес */}
          <Text style={styles.sectionTitle}>Параметры колес:</Text>
          <View style={styles.specsContainer}>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Крепление:</Text>
              <Text style={styles.specValue}>
                {car.krepezh} {car.krepezhraz}x{car.krepezhraz2}
              </Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Количество отверстий:</Text>
              <Text style={styles.specValue}>{car.hole}</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>PCD:</Text>
              <Text style={styles.specValue}>{car.pcd}</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Диаметр ступицы (DIA):</Text>
              <Text style={styles.specValue}>{car.dia} мм</Text>
            </View>
          </View>
          <Divider style={styles.divider} />

          {/* Рекомендуемые диски и шины */}
          <Text style={styles.sectionTitle}>Рекомендуемые диски и шины:</Text>
          {wheels.map((wheel, index) => (
            <View key={index} style={styles.wheelSpecs}>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Диск:</Text>
                <Text style={styles.specValue}>
                  {wheel.diameter}" x {wheel.width}J ET{wheel.et}
                </Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Шина:</Text>
                <Text style={styles.specValue}>
                  {wheel.tyre_width}/{wheel.tyre_height} R{wheel.tyre_diameter}
                </Text>
              </View>
              {index < wheels.length - 1 && <Divider style={styles.innerDivider} />}
            </View>
          ))}
          <Divider style={styles.divider} />

          {/* Рекомендуемые аккумуляторы */}
          <Text style={styles.sectionTitle}>Рекомендуемые аккумуляторы:</Text>
          {batteries.map((battery, index) => (
            <View key={index} style={styles.batterySpecs}>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Емкость:</Text>
                <Text style={styles.specValue}>
                  {battery.volume_min}-{battery.volume_max} Ач
                </Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Пусковой ток:</Text>
                <Text style={styles.specValue}>{battery.min_current} А</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Полярность:</Text>
                <Text style={styles.specValue}>{battery.polarity}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Размеры (ДxШxВ):</Text>
                <Text style={styles.specValue}>
                  {battery.length}x{battery.width}x{battery.height} мм
                </Text>
              </View>
              {index < batteries.length - 1 && <Divider style={styles.innerDivider} />}
            </View>
          ))}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 8,
  },
  card: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  years: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    color: 'rgba(0, 0, 0, 0.6)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  specsContainer: {
    marginBottom: 8,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  specLabel: {
    fontSize: 16,
    color: 'rgba(0, 0, 0, 0.6)',
  },
  specValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  wheelSpecs: {
    marginVertical: 8,
  },
  batterySpecs: {
    marginVertical: 8,
  },
  divider: {
    marginVertical: 12,
  },
  innerDivider: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  imagesContainer: {
    marginVertical: 8,
  },
  image: {
    height: 150,
    marginRight: 8,
    borderRadius: 4,
  },
});

export default CarDetails;