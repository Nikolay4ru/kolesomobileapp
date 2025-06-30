import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from "@react-navigation/native";
import { observer } from "mobx-react-lite";
import { useStores } from "../useStores";
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import DatePicker from 'react-native-date-picker';

const EditProfileScreen = observer(() => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { authStore } = useStores();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);

  // Инициализация только один раз на основе authStore.user
  const [formData, setFormData] = useState(() => ({
    firstName: authStore.user?.firstName || '',
    lastName: authStore.user?.lastName || '',
    middleName: authStore.user?.middleName || '',
    email: authStore.user?.email || '',
    birthDate: authStore.user?.birthDate ? new Date(authStore.user.birthDate) : new Date(),
    gender: authStore.user?.gender || 'male',
  }));

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Проверяем, была ли уже установлена дата рождения
  const isBirthDateSet = authStore.user?.birthDate ? true : false;

  // Используем useCallback для предотвращения пересоздания функций
  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleSave = async () => {
    // Валидация
    if (!formData.firstName.trim()) {
      Alert.alert('Ошибка', 'Введите имя');
      return;
    }
    
    if (!formData.lastName.trim()) {
      Alert.alert('Ошибка', 'Введите фамилию');
      return;
    }
    
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      Alert.alert('Ошибка', 'Введите корректный email');
      return;
    }

    setIsLoading(true);

    try {
      const updateData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        middleName: formData.middleName.trim(),
        email: formData.email.trim(),
        gender: formData.gender,
      };
      
      // Добавляем дату рождения только если она была установлена ранее
      if (isBirthDateSet) {
        updateData.birthDate = formData.birthDate.toISOString().split('T')[0];
      }

      await authStore.updateProfile(updateData);

      Alert.alert('Успешно', 'Профиль обновлен', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Ошибка', error.message || 'Не удалось обновить профиль');
    } finally {
      setIsLoading(false);
    }
  };

  // Мемоизируем компонент InputField
  const InputField = useCallback(({ label, value, field, placeholder, keyboardType = 'default', autoCapitalize = 'words' }) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={(text) => handleFieldChange(field, text)}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        // Добавляем blurOnSubmit для предотвращения проблем с фокусом
        blurOnSubmit={false}
      />
    </View>
  ), [styles, colors, handleFieldChange]);

  const handleDateConfirm = useCallback((date) => {
    setDatePickerOpen(false);
    handleFieldChange('birthDate', date);
  }, [handleFieldChange]);

  const handleDateCancel = useCallback(() => {
    setDatePickerOpen(false);
  }, []);

  const openDatePicker = useCallback(() => {
    if (!isBirthDateSet) {
      setDatePickerOpen(true);
    } else {
      Alert.alert(
        'Дата рождения установлена', 
        'Дата рождения не может быть изменена после установки. Если требуется изменение, обратитесь в службу поддержки.',
        [{ text: 'Понятно' }]
      );
    }
  }, [isBirthDateSet]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Редактировать профиль</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
        
          contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: insets.bottom + 100 }
      ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Personal Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Личные данные</Text>
            
            <InputField
              label="Имя"
              value={formData.firstName}
              field="firstName"
              placeholder="Введите имя"
            />
            
            <InputField
              label="Фамилия"
              value={formData.lastName}
              field="lastName"
              placeholder="Введите фамилию"
            />
            
            <InputField
              label="Отчество"
              value={formData.middleName}
              field="middleName"
              placeholder="Введите отчество (необязательно)"
            />
          </View>

          {/* Contact Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Контактная информация</Text>
            
            <InputField
              label="Email"
              value={formData.email}
              field="email"
              placeholder="example@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <View style={styles.phoneContainer}>
              <Text style={styles.inputLabel}>Телефон</Text>
              <View style={styles.phoneField}>
                <Icon name="phone" size={20} color={colors.textSecondary} style={styles.phoneIcon} />
                <Text style={styles.phoneNumber}>{authStore.user?.phone || '+7 XXX XXX XX XX'}</Text>
              </View>
            </View>
          </View>

          {/* Additional Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Дополнительная информация</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Дата рождения</Text>
              <TouchableOpacity 
                style={[
                  styles.dateButton,
                  isBirthDateSet && styles.dateButtonDisabled
                ]}
                onPress={openDatePicker}
                activeOpacity={isBirthDateSet ? 1 : 0.7}
              >
                <Icon name="event" size={20} color={colors.textSecondary} />
                <Text style={[
                  styles.dateText,
                  isBirthDateSet && styles.dateTextDisabled
                ]}>
                  {formData.birthDate.toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </Text>
                {!isBirthDateSet && <Icon name="chevron-right" size={20} color={colors.textSecondary} />}
                {isBirthDateSet && <Icon name="lock" size={16} color={colors.textSecondary} />}
              </TouchableOpacity>
              <Text style={[styles.dateHint, isBirthDateSet && styles.dateHintWarning]}>
                {isBirthDateSet 
                  ? 'Дата рождения не может быть изменена после установки'
                  : 'Нажмите, чтобы установить дату рождения, можно установить только один раз'
                }
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Пол</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    formData.gender === 'male' && styles.genderOptionActive
                  ]}
                  onPress={() => handleFieldChange('gender', 'male')}
                >
                  <Icon 
                    name="male" 
                    size={20} 
                    color={formData.gender === 'male' ? colors.primary : colors.textSecondary} 
                  />
                  <Text style={[
                    styles.genderText,
                    formData.gender === 'male' && styles.genderTextActive
                  ]}>
                    Мужской
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    formData.gender === 'female' && styles.genderOptionActive
                  ]}
                  onPress={() => handleFieldChange('gender', 'female')}
                >
                  <Icon 
                    name="female" 
                    size={20} 
                    color={formData.gender === 'female' ? colors.primary : colors.textSecondary} 
                  />
                  <Text style={[
                    styles.genderText,
                    formData.gender === 'female' && styles.genderTextActive
                  ]}>
                    Женский
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isLoading}
          >
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
            </Text>
          </TouchableOpacity>

          {/* Date Picker Modal */}
          <DatePicker
            modal
            open={datePickerOpen}
            date={formData.birthDate}
            mode="date"
            maximumDate={new Date()}
            minimumDate={new Date(1900, 0, 1)}
            onConfirm={handleDateConfirm}
            onCancel={handleDateCancel}
            theme={theme === 'dark' ? 'dark' : 'light'}
            locale="ru"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
});

const themedStyles = (colors, theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.headerBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 24
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  inputContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  phoneContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  phoneField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  phoneIcon: {
    marginRight: 12,
  },
  phoneNumber: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateButtonDisabled: {
    backgroundColor: colors.surface,
    opacity: 0.8,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
  dateTextDisabled: {
    color: colors.textSecondary,
  },
  dateHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  dateHintWarning: {
    color: colors.warning || colors.textSecondary,
    fontWeight: '500',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  genderOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  genderText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  genderTextActive: {
    color: colors.primary,
  },
  saveButton: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default EditProfileScreen;