import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const BannerNotificationPermission = ({ onPressSettings }) => (
  <View style={styles.banner}>
    <Ionicons name="notifications-off-outline" size={24} color="#FF6B6B" style={{marginRight: 10}} />
    <View style={{flex: 1}}>
      <Text style={styles.bannerText}>
        Уведомления отключены. Включите их в настройках, чтобы получать важные сообщения.
      </Text>
    </View>
    <TouchableOpacity style={styles.button} onPress={onPressSettings}>
      <Text style={styles.buttonText}>Настроить</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3F0',
    borderRadius: 12,
    padding: 14,
    margin: 16,
    borderWidth: 1,
    borderColor: '#FFDFD5'
  },
  bannerText: {
    flex: 1,
    color: '#C23C1A',
    fontSize: 15,
    fontWeight: '500'
  },
  button: {
    marginLeft: 10,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '600'
  }
});

export default BannerNotificationPermission;