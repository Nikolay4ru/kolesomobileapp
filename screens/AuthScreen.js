import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  Platform, 
  TouchableWithoutFeedback, 
  Keyboard, 
  TouchableOpacity,
  Animated,
  StatusBar,
} from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { observer } from "mobx-react-lite";
import { MaskedTextInput } from "react-native-advanced-input-mask";
import { useStores } from "../useStores";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';

const AuthScreen = observer(() => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [localError, setLocalError] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const { authStore } = useStores();
  const navigation = useNavigation();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  
  // Анимации - инициализируем только один раз
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const errorShakeAnim = useRef(new Animated.Value(0)).current;
  const containerTranslateY = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);

  // Начальная анимация появления
  useEffect(() => {
    if (!hasAnimated.current) {
      hasAnimated.current = true;
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, []);

  // Обработка клавиатуры с плавной анимацией
  useEffect(() => {
    let keyboardWillShowSub;
    let keyboardWillHideSub;
    let keyboardDidShowSub;
    let keyboardDidHideSub;

    if (Platform.OS === 'ios') {
      keyboardWillShowSub = Keyboard.addListener('keyboardWillShow', (e) => {
        Animated.timing(containerTranslateY, {
          toValue: -e.endCoordinates.height / 3,
          duration: e.duration || 250,
          useNativeDriver: true,
        }).start();
      });

      keyboardWillHideSub = Keyboard.addListener('keyboardWillHide', (e) => {
        Animated.timing(containerTranslateY, {
          toValue: 0,
          duration: e.duration || 250,
          useNativeDriver: true,
        }).start();
      });
    } else {
      keyboardDidShowSub = Keyboard.addListener('keyboardDidShow', (e) => {
        Animated.timing(containerTranslateY, {
          toValue: -100,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });

      keyboardDidHideSub = Keyboard.addListener('keyboardDidHide', () => {
        Animated.timing(containerTranslateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
    }

    return () => {
      keyboardWillShowSub?.remove();
      keyboardWillHideSub?.remove();
      keyboardDidShowSub?.remove();
      keyboardDidHideSub?.remove();
    };
  }, []);

  // Анимация ошибки
  useEffect(() => {
    if (authStore.error) {
      setLocalError(authStore.error);
      Animated.sequence([
        Animated.timing(errorShakeAnim, { toValue: 8, duration: 100, useNativeDriver: true }),
        Animated.timing(errorShakeAnim, { toValue: -8, duration: 100, useNativeDriver: true }),
        Animated.timing(errorShakeAnim, { toValue: 4, duration: 100, useNativeDriver: true }),
        Animated.timing(errorShakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  }, [authStore.error]);

  const handlePhoneChange = (formatted, extracted) => {
    let cleaned = extracted.replace(/\D/g, "");
    if (!phoneNumber && (cleaned.startsWith("8") || cleaned.startsWith("7"))) {
      cleaned = "+7" + cleaned.slice(1);
    }
    setPhoneNumber(cleaned);
    
    if (localError) {
      setLocalError("");
    }
  };

  const handleLogin = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      setLocalError("Введите корректный номер телефона");
      return;
    }

    setLocalError("");
    const cleanedPhoneNumber = '7' + phoneNumber.replace(/\D/g, "");

    try {
      await authStore.sendVerificationCode(cleanedPhoneNumber);
      navigation.navigate("CodeVerification");
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: Animated.add(slideAnim, containerTranslateY) }
              ]
            }
          ]}
        >
          {/* Заголовок */}
          <View style={styles.header}>
            <Text style={styles.title}>Вход в систему</Text>
            <Text style={styles.subtitle}>
              Введите номер телефона для получения кода
            </Text>
          </View>

          {/* Поле ввода */}
          <Animated.View 
            style={[
              styles.inputSection,
              { 
                transform: [{ translateX: errorShakeAnim }] 
              }
            ]}
          >
            <Text style={styles.inputLabel}>Номер телефона</Text>
            <View style={[
              styles.inputWrapper,
              isInputFocused && styles.inputWrapperFocused,
              localError && styles.inputWrapperError
            ]}>
              <MaskedTextInput
                mask="+7 ([000]) [000]-[00]-[00]"
                value={phoneNumber}
                autocomplete={false}
                onChangeText={handlePhoneChange}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                keyboardType="phone-pad"
                placeholder="+7 (___) ___-__-__"
                style={styles.input}
                editable={!authStore.isLoading}
                placeholderTextColor={colors.placeholder}
                autoFocus={false}
                blurOnSubmit={false}
                returnKeyType="done"
              />
            </View>

            {localError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{localError}</Text>
              </View>
            ) : null}
          </Animated.View>

          {/* Кнопка */}
          <View style={styles.buttonContainer}>
            {authStore.isLoading ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size={20} color={colors.primary} />
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleLogin}
                disabled={authStore.isLoading || phoneNumber.length < 10}
                activeOpacity={0.8}
                style={[
                  styles.button,
                  phoneNumber.length >= 10 ? styles.buttonActive : styles.buttonDisabled
                ]}
              >
                <Text style={[
                  styles.buttonText,
                  phoneNumber.length >= 10 ? styles.buttonTextActive : styles.buttonTextDisabled
                ]}>
                  Получить код
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Информация */}
          <View style={styles.infoText}>
            <Text style={styles.infoDescription}>
              Мы отправим SMS с кодом подтверждения
            </Text>
          </View>

          {/* Футер */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Продолжая, вы соглашаетесь с{'\n'}
              <Text style={styles.footerLink}>Условиями использования</Text>
              {' и '}
              <Text style={styles.footerLink}>Политикой конфиденциальности</Text>
            </Text>
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    </View>
  );
});

const themedStyles = (colors, theme) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 60,
    gap: 32,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputSection: {
    paddingHorizontal: 4,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    minHeight: 56,
    justifyContent: 'center',
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    backgroundColor: theme === 'dark' ? colors.surface : '#F8FAFF',
  },
  inputWrapperError: {
    borderColor: colors.error,
    backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
  },
  input: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    backgroundColor: 'transparent',
    paddingVertical: 16,
  },
  errorContainer: {
    marginTop: 8,
    marginLeft: 4,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    paddingHorizontal: 4,
  },
  button: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: colors.primary,
  },
  buttonDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  buttonTextActive: {
    color: '#FFFFFF',
  },
  buttonTextDisabled: {
    color: colors.textTertiary,
  },
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  infoText: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  infoDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  footerLink: {
    color: colors.primary,
    fontWeight: '600',
  },
});

export default AuthScreen;