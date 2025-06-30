import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Button, TextInput, HelperText, RadioButton, Text, useTheme } from 'react-native-paper';
import DatePicker from 'react-native-date-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function ProfileForm({ user, isLoading, error, onUpdateProfile }) {
  const { colors } = useTheme();

  // Проверяем, была ли установлена дата рождения ранее
  const isBirthDateSet =
    !!user?.birthDate &&
    user.birthDate !== '0000-00-00' &&
    user.birthDate !== null;

  // Инициализация формы только при смене пользователя
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [middleName, setMiddleName] = useState(user?.middleName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [birthDate, setBirthDate] = useState(
    user?.birthDate && user.birthDate !== '0000-00-00'
      ? new Date(user.birthDate)
      : new Date()
  );
  const [gender, setGender] = useState(user?.gender || undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setMiddleName(user?.middleName || '');
    setEmail(user?.email || '');
    setBirthDate(
      user?.birthDate && user.birthDate !== '0000-00-00'
        ? new Date(user.birthDate)
        : new Date()
    );
    setGender(user?.gender || undefined);
    setErrors({});
  }, [user?.id]);

  const handleSubmit = async () => {
    const newErrors = {};
    if (!firstName.trim()) newErrors.firstName = 'Обязательное поле';
    if (!lastName.trim()) newErrors.lastName = 'Обязательное поле';
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = 'Некорректный email';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    try {
      const updateData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        middleName: middleName.trim(),
        email: email.trim(),
        gender,
      };
      if (!isBirthDateSet) {
        updateData.birthDate = birthDate.toISOString().split('T')[0];
      }
      await onUpdateProfile(updateData);
      Alert.alert('Успешно', 'Профиль обновлен');
    } catch (error) {
      Alert.alert('Ошибка', error.message || 'Не удалось обновить профиль');
    }
  };

  const handleDatePress = () => {
    if (isBirthDateSet) {
      Alert.alert(
        'Внимание',
        'Дата рождения уже установлена и не может быть изменена. Если вам необходимо изменить дату рождения, обратитесь в службу поддержки.',
        [{ text: 'Понятно', style: 'default' }]
      );
    } else {
      Alert.alert(
        'Установка даты рождения',
        'Внимание! Дата рождения устанавливается только один раз и не может быть изменена в дальнейшем.',
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Продолжить', onPress: () => setDatePickerOpen(true) }
        ]
      );
    }
  };

  const clearError = useCallback(
    (field) => {
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors]
  );

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.header, { color: colors.primary }]}>Личные данные</Text>
      <View style={styles.inputContainer}>
        <TextInput
          label="Имя"
          value={firstName}
          onChangeText={(text) => {
            setFirstName(text);
            clearError('firstName');
          }}
          error={!!errors.firstName}
          style={[styles.input, { backgroundColor: colors.surface }]}
          mode="outlined"
          left={<TextInput.Icon icon="account" />}
          theme={{ roundness: 12 }}
        />
        {errors.firstName && <HelperText type="error" style={styles.errorText}>{errors.firstName}</HelperText>}
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          label="Фамилия"
          value={lastName}
          onChangeText={(text) => {
            setLastName(text);
            clearError('lastName');
          }}
          error={!!errors.lastName}
          style={[styles.input, { backgroundColor: colors.surface }]}
          mode="outlined"
          left={<TextInput.Icon icon="account" />}
          theme={{ roundness: 12 }}
        />
        {errors.lastName && <HelperText type="error" style={styles.errorText}>{errors.lastName}</HelperText>}
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          label="Отчество"
          value={middleName}
          onChangeText={setMiddleName}
          style={[styles.input, { backgroundColor: colors.surface }]}
          mode="outlined"
          left={<TextInput.Icon icon="account" />}
          theme={{ roundness: 12 }}
        />
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          label="Email"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            clearError('email');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          error={!!errors.email}
          style={[styles.input, { backgroundColor: colors.surface }]}
          mode="outlined"
          left={<TextInput.Icon icon="email" />}
          theme={{ roundness: 12 }}
        />
        {errors.email && <HelperText type="error" style={styles.errorText}>{errors.email}</HelperText>}
      </View>
      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Дата рождения</Text>
        {isBirthDateSet ? (
          <View style={[styles.dateButton, styles.dateButtonDisabled, { borderColor: colors.disabled }]}>
            <Icon name="calendar" size={20} color={colors.disabled} style={styles.dateIcon} />
            <Text style={[styles.dateText, { color: colors.disabled }]}>
              {new Date(user.birthDate).toLocaleDateString()}
            </Text>
            <Icon name="lock" size={16} color={colors.disabled} style={styles.lockIcon} />
          </View>
        ) : (
          <>
            <TouchableOpacity
              onPress={handleDatePress}
              style={[styles.dateButton, { borderColor: colors.primary }]}
            >
              <Icon name="calendar" size={20} color={colors.primary} style={styles.dateIcon} />
              <Text style={[styles.dateText, { color: colors.text }]}>
                {birthDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            <HelperText type="info" style={styles.helperText}>
              Дата рождения устанавливается только один раз
            </HelperText>
            <DatePicker
              modal
              open={datePickerOpen}
              date={birthDate}
              mode="date"
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
              onConfirm={(date) => {
                setDatePickerOpen(false);
                setBirthDate(date);
              }}
              onCancel={() => setDatePickerOpen(false)}
              theme={colors.mode === 'dark' ? 'dark' : 'light'}
            />
          </>
        )}
      </View>
      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Пол</Text>
        <View style={styles.radioGroup}>
          <RadioButton.Group onValueChange={setGender} value={gender}>
            <TouchableOpacity style={styles.radioOption} onPress={() => setGender('male')} activeOpacity={0.7}>
              <RadioButton value="male" color={colors.primary} />
              <Text style={[styles.radioText, { color: colors.text }]}>Мужской</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.radioOption} onPress={() => setGender('female')} activeOpacity={0.7}>
              <RadioButton value="female" color={colors.primary} />
              <Text style={[styles.radioText, { color: colors.text }]}>Женский</Text>
            </TouchableOpacity>
          </RadioButton.Group>
        </View>
      </View>
      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={isLoading}
        disabled={isLoading}
        style={[styles.button, { backgroundColor: colors.primary }]}
        labelStyle={styles.buttonLabel}
        contentStyle={styles.buttonContent}
      >
        Сохранить изменения
      </Button>
      {error && <HelperText type="error" style={[styles.error, { color: colors.error }]}>{error}</HelperText>}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
  inputContainer: { marginBottom: 15 },
  input: { marginBottom: 5 },
  label: { marginBottom: 8, fontSize: 16, fontWeight: '500' },
  dateButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 15 },
  dateButtonDisabled: { backgroundColor: '#f5f5f5' },
  dateIcon: { marginRight: 10 },
  dateText: { fontSize: 16, flex: 1, textAlign: 'left' },
  lockIcon: { marginLeft: 8 },
  helperText: { fontSize: 12, marginTop: 4 },
  radioGroup: { borderRadius: 12, overflow: 'hidden' },
  radioOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10 },
  radioText: { fontSize: 16, marginLeft: 8 },
  button: { marginTop: 25, borderRadius: 12, elevation: 0, shadowColor: 'transparent' },
  buttonLabel: { fontSize: 16, fontWeight: 'bold', paddingVertical: 2 },
  buttonContent: { height: 48 },
  errorText: { fontSize: 14, marginTop: -10, marginBottom: 5 },
  error: { marginTop: 15, textAlign: 'center', fontSize: 15 },
  bottomPadding: { height: 80 }
});