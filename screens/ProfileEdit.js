import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Button, TextInput, HelperText, RadioButton, Text, useTheme } from 'react-native-paper';
import { observer } from 'mobx-react-lite';
import { useStores } from '../useStores';
import DatePicker from 'react-native-date-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationSettings from '../components/NotificationSettings';

const ProfileScreen = observer(() => {
  const { authStore } = useStores();
  const { colors } = useTheme();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    birthDate: new Date(),
    gender: undefined,
  });
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (authStore.isLoggedIn && !authStore.user?.firstName) {
      authStore.fetchProfile();
    }
    if (authStore.user) {
      setFormData({
        firstName: authStore.user.firstName || '',
        lastName: authStore.user.lastName || '',
        middleName: authStore.user.middleName || '',
        email: authStore.user.email || '',
        birthDate: authStore.user.birthDate ? new Date(authStore.user.birthDate) : new Date(),
        gender: authStore.user.gender,
      });
    }
  }, [authStore.user]);

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      await authStore.updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName,
        email: formData.email,
        birthDate: formData.birthDate.toISOString().split('T')[0],
        gender: formData.gender,
      });
    } catch (error) {
      // Ошибка уже обработана в authStore
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName) newErrors.firstName = 'Обязательное поле';
    if (!formData.lastName) newErrors.lastName = 'Обязательное поле';
    
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Некорректный email';
    }
    
    return newErrors;
  };

  return (
    <ScrollView 
      contentContainerStyle={[styles.container, {backgroundColor: colors.background}]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.header, {color: colors.primary}]}>Личные данные</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          label="Имя"
          value={formData.firstName}
          onChangeText={(text) => setFormData({...formData, firstName: text})}
          error={!!errors.firstName}
          style={[styles.input, {backgroundColor: colors.surface}]}
          mode="outlined"
          left={<TextInput.Icon name="account" />}
          theme={{ roundness: 12 }}
        />
        {errors.firstName && <HelperText type="error" style={styles.errorText}>{errors.firstName}</HelperText>}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          label="Фамилия"
          value={formData.lastName}
          onChangeText={(text) => setFormData({...formData, lastName: text})}
          error={!!errors.lastName}
          style={[styles.input, {backgroundColor: colors.surface}]}
          mode="outlined"
          left={<TextInput.Icon name="account" />}
          theme={{ roundness: 12 }}
        />
        {errors.lastName && <HelperText type="error" style={styles.errorText}>{errors.lastName}</HelperText>}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          label="Отчество"
          value={formData.middleName}
          onChangeText={(text) => setFormData({...formData, middleName: text})}
          style={[styles.input, {backgroundColor: colors.surface}]}
          mode="outlined"
          left={<TextInput.Icon name="account" />}
          theme={{ roundness: 12 }}
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          label="Email"
          value={formData.email}
          onChangeText={(text) => setFormData({...formData, email: text})}
          keyboardType="email-address"
          autoCapitalize="none"
          error={!!errors.email}
          style={[styles.input, {backgroundColor: colors.surface}]}
          mode="outlined"
          left={<TextInput.Icon name="email" />}
          theme={{ roundness: 12 }}
        />
        {errors.email && <HelperText type="error" style={styles.errorText}>{errors.email}</HelperText>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, {color: colors.text}]}>Дата рождения</Text>
        <TouchableOpacity 
          onPress={() => setDatePickerOpen(true)}
          style={[styles.dateButton, {borderColor: colors.primary}]}
        >
          <Icon name="calendar" size={20} color={colors.primary} style={styles.dateIcon} />
          <Text style={[styles.dateText, {color: colors.text}]}>
            {formData.birthDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
        <DatePicker
          modal
          open={datePickerOpen}
          date={formData.birthDate}
          mode="date"
          onConfirm={(date) => {
            setDatePickerOpen(false);
            setFormData({...formData, birthDate: date});
          }}
          onCancel={() => setDatePickerOpen(false)}
          theme={colors.mode === 'dark' ? 'dark' : 'light'}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, {color: colors.text}]}>Пол</Text>
        <View style={styles.radioGroup}>
          <RadioButton.Group
            onValueChange={(value) => setFormData({...formData, gender: value})}
            value={formData.gender}
          >
            <TouchableOpacity 
              style={styles.radioOption} 
              onPress={() => setFormData({...formData, gender: 'male'})}
            >
              <RadioButton value="male" color={colors.primary} />
              <Text style={[styles.radioText, {color: colors.text}]}>Мужской</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.radioOption} 
              onPress={() => setFormData({...formData, gender: 'female'})}
            >
              <RadioButton value="female" color={colors.primary} />
              <Text style={[styles.radioText, {color: colors.text}]}>Женский</Text>
            </TouchableOpacity>
            
          </RadioButton.Group>
        </View>
      </View>
      <NotificationSettings/>
      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={authStore.isLoading}
        disabled={authStore.isLoading}
        style={[styles.button, {backgroundColor: colors.primary}]}
        labelStyle={styles.buttonLabel}
        contentStyle={styles.buttonContent}
      >
        Сохранить изменения
      </Button>

      {authStore.error && (
        <HelperText type="error" style={[styles.error, {color: colors.error}]}>
          {authStore.error}
        </HelperText>
      )}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    marginBottom: 5,
  },
  label: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  dateIcon: {
    marginRight: 10,
  },
  dateText: {
    fontSize: 16,
  },
  radioGroup: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  radioText: {
    fontSize: 16,
    marginLeft: 8,
  },
  button: {
    marginTop: 25,
    borderRadius: 12,
    elevation: 0,
    shadowColor: 'transparent',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingVertical: 2,
  },
  buttonContent: {
    height: 48,
  },
  errorText: {
    fontSize: 14,
    marginTop: -10,
    marginBottom: 5,
  },
  error: {
    marginTop: 15,
    textAlign: 'center',
    fontSize: 15,
  },
});

export default ProfileScreen;