import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import CustomHeader from "../components/CustomHeader";

const ServiceSelectionScreen = ({ navigation }) => {
  const services = [
    { 
      id: 1, 
      name: "Шиномонтаж",
      icon: <MaterialCommunityIcons name="car-tire-alert" size={32} color="#006363" />,
      description: "Профессиональный монтаж и балансировка колес"
    },
    { 
      id: 2, 
      name: "Заявка на выдачу с хранения",
      icon: <MaterialIcons name="storage" size={32} color="#006363" />,
      description: "Забронируйте время для получения хранения"
    },
    
  ];

  const [selectedService, setSelectedService] = useState(null);

  const handleContinue = () => {
    if (!selectedService) {
      alert("Пожалуйста, выберите услугу");
      return;
    }
    
    navigation.navigate('StoreAndCarSelection', { service: selectedService });
  };

  return (
    <View style={styles.container}>
         <CustomHeader 
        title="Запись на сервис"
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
      />
        
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Выберите услугу</Text>
        <Text style={styles.subtitle}>Выберите нужную услугу из списка ниже</Text>
        
        <View style={styles.servicesContainer}>
          {services.map(service => (
            <TouchableOpacity
              key={service.id}
              style={[
                styles.serviceCard,
                selectedService?.id === service.id && styles.selectedServiceCard
              ]}
              onPress={() => setSelectedService(service)}
            >
              <View style={styles.iconContainer}>
                {React.cloneElement(service.icon, {
                  color: selectedService?.id === service.id ? '#fff' : '#006363'
                })}
              </View>
              <View style={styles.textContainer}>
                <Text style={[
                  styles.serviceName,
                  selectedService?.id === service.id && styles.selectedText
                ]}>
                  {service.name}
                </Text>
                <Text style={[
                  styles.serviceDescription,
                  selectedService?.id === service.id && styles.selectedText
                ]}>
                  {service.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedService && styles.disabledButton
          ]}
          onPress={handleContinue}
          disabled={!selectedService}
        >
          <Text style={styles.continueButtonText}>Продолжить</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 30,
    textAlign: 'center',
  },
  servicesContainer: {
    marginBottom: 20,
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#006363',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedServiceCard: {
    backgroundColor: '#006363',
    borderColor: '#006363',
    shadowColor: '#006363',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  selectedText: {
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
    borderTopColor: '#e9ecef',
  },
  continueButton: {
    backgroundColor: '#006363',
    borderRadius: 10,
    paddingVertical: 16,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#006363',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ServiceSelectionScreen;