import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions
} from "react-native";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import CustomHeader from "../components/CustomHeader";

const { width } = Dimensions.get('window');

const StoreAndCarSelectionScreen = ({ route, navigation }) => {
  const { service } = route.params;
  const [stores, setStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedCarType, setSelectedCarType] = useState(null);
  
  const carTypes = [
    { 
      id: 1, 
      name: "Легковой",
      icon: <FontAwesome5 name="car" size={24} color="#4E60FF" />
    },
    { 
      id: 2, 
      name: "Кроссовер",
      icon: <FontAwesome5 name="car-side" size={24} color="#4E60FF" />
    },
    { 
      id: 3, 
      name: "Внедорожник",
      icon: <FontAwesome5 name="truck-monster" size={24} color="#4E60FF" />
    },
    { 
      id: 4, 
      name: "Легкогрузовой",
      icon: <MaterialIcons name="local-shipping" size={24} color="#4E60FF" />
    }
  ];

  useEffect(() => {
    const fetchStores = async () => {
      try {
        // Замените URL на ваш реальный API endpoint
        const response = await fetch('https://api.koleso.app/api/stores_service.php');
        const data = await response.json();

        console.log(data);
        // Фильтруем магазины, исключая id=8 и оставляя только активные
        const filteredStores = data.filter(store => 
          store.id !== 8 && store.is_active === "1"
        ).map(store => ({
          id: store.id,
          name: store.name,
          address: `${store.city}, ${store.address}`,
          phone: store.phone,
          workingHours: store.working_hours
        }));


        console.log(filteredStores);
        setStores(filteredStores);
        setLoadingStores(false);
      } catch (error) {
        console.error("Error fetching stores:", error);
        setLoadingStores(false);
      }
    };

    fetchStores();
  }, []);

  const handleContinue = () => {
    if (!selectedStore || !selectedCarType) {
      alert("Пожалуйста, выберите магазин и тип автомобиля");
      return;
    }
    
    navigation.navigate('CarSelection', {
      service,
      store: selectedStore,
      carType: selectedCarType
    });
  };

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Выбор магазина"
        navigation={navigation}
        statusBarProps={{
          barStyle: 'light-content',
          backgroundColor: '#f8f9fa'
        }}
        safeAreaStyle={{
          backgroundColor: '#f8f9fa'
        }}
        headerStyle={{
          backgroundColor: '#f8f9fa',
          borderBottomWidth: 0
        }}
        iconColor="#000"
        titleStyle={{ color: '#000' }}
        withBackButton
      />

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.serviceCard}>
          <Text style={styles.serviceTitle}>Выбранная услуга:</Text>
          <Text style={styles.serviceName}>{service.name}</Text>
        </View>

        <Text style={styles.sectionTitle}>Ближайшие магазины</Text>
        
        {loadingStores ? (
          <ActivityIndicator size="large" color="#006363" style={styles.loader} />
        ) : stores.length === 0 ? (
          <Text style={styles.noStoresText}>Нет доступных магазинов</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storesScroll}
          >
            {stores.map((store) => (
              <TouchableOpacity
                key={store.id}
                style={[
                  styles.storeCard,
                  selectedStore?.id === store.id && styles.selectedStoreCard
                ]}
                onPress={() => setSelectedStore(store)}
              >
                <View style={styles.storeIcon}>
                  <MaterialIcons 
                    name="store" 
                    size={24} 
                    color={selectedStore?.id === store.id ? "#fff" : "#fff"} 
                  />
                
                </View>
                <Text style={[
                  styles.storeName,
                  selectedStore?.id === store.id && styles.selectedStoreText
                ]}>
                  {store.name}
                </Text>
                <Text style={[
                  styles.storeAddress,
                  selectedStore?.id === store.id && styles.selectedStoreText
                ]}>
                  {store.address}
                </Text>
                {store.workingHours && (
                  <Text style={[
                    styles.storeHours,
                    selectedStore?.id === store.id && styles.selectedStoreText
                  ]}>
                    {store.workingHours}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Text style={styles.sectionTitle}>Тип вашего автомобиля</Text>
        
        <View style={styles.carTypesGrid}>
          {carTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.carTypeCard,
                selectedCarType?.id === type.id && styles.selectedCarTypeCard
              ]}
              onPress={() => setSelectedCarType(type)}
            >
              <View style={styles.carIcon}>
                {React.cloneElement(type.icon, {
                  color: selectedCarType?.id === type.id ? "#006363" : "#006363"
                })}
              </View>
              <Text style={[
                styles.carTypeName,
                selectedCarType?.id === type.id && styles.selectedCarText
              ]}>
                {type.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!selectedStore || !selectedCarType) && styles.disabledButton
          ]}
          onPress={handleContinue}
          disabled={!selectedStore || !selectedCarType}
        >
          <Text style={styles.continueButtonText}>Продолжить</Text>
          <MaterialIcons name="arrow-forward" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 10,
    marginBottom: 24,
    shadowColor: '#4E60FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  serviceTitle: {
    fontSize: 14,
    color: '#8A94A6',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2B2F3A',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#006363',
    marginBottom: 16,
  },
  loader: {
    marginVertical: 40,
  },
  noStoresText: {
    textAlign: 'center',
    color: '#006363',
    fontSize: 16,
    marginVertical: 20,
  },
  storesScroll: {
    paddingBottom: 10,
  },
  storeCard: {
    width: width * 0.60,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EDEEF2',
  },
  selectedStoreCard: {
    backgroundColor: '#006363',
    borderColor: '#006363',
    shadowColor: '#006363',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  storeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#006363',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#006363',
    marginBottom: 4,
  },
  storeAddress: {
    fontSize: 14,
    color: '#006363',
    marginBottom: 4,
  },
  storeHours: {
    fontSize: 12,
    color: '#006363',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  storePhone: {
    fontSize: 14,
    color: '#8A94A6',
    marginTop: 8,
  },
  selectedStoreText: {
    color: '#fff',
  },
  carTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  carTypeCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDEEF2',
  },
  selectedCarTypeCard: {
    backgroundColor: '#006363',
    borderColor: '#006363',
    shadowColor: '#006363',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  carIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#EDF0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  carTypeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2B2F3A',
    textAlign: 'center',
  },
  selectedCarText: {
    color: '#fff',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#EDEEF2',
  },
  continueButton: {
    backgroundColor: '#006363',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4E60FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default StoreAndCarSelectionScreen;