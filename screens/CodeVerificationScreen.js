import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  StyleSheet, 
  KeyboardAvoidingView, 
  TextInput, 
  Platform, 
  TouchableWithoutFeedback, 
  Keyboard, 
  Animated,
  StatusBar 
} from "react-native";
import { Button, Text } from "react-native-paper";
import { observer } from "mobx-react-lite";
import { useStores } from "../useStores";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import CustomHeader from "../components/CustomHeader";

const RESEND_TIMEOUT = 60;

const CodeVerificationScreen = observer(() => {
  const [code, setCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(RESEND_TIMEOUT);
  const [isResending, setIsResending] = useState(false);
  const [shakeAnim] = useState(new Animated.Value(0));
  const { authStore } = useStores();
  const navigation = useNavigation();
  const { colors, theme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const textInputRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const shakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handleVerify = async (code) => {
    Keyboard.dismiss();
    try {
      console.log(code);
      await authStore.verifyCode(code);
      navigation.navigate("MainTabs");
    } catch (error) {
      setCode("");
      shakeAnimation();
    }
  };

  const handleResendCode = async () => {
    if (timeLeft > 0 || isResending) return;

    setIsResending(true);
    try {
      // Здесь код для повторной отправки SMS
      setTimeLeft(RESEND_TIMEOUT);
      setCode("");
    } catch (error) {
      // Обработка ошибки
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleCodeChange = (text) => {
    const formattedText = text.replace(/[^0-9]/g, '');
    setCode(formattedText);
    console.log(formattedText);
    
    if (formattedText.length === 4) {
      setTimeout(() => handleVerify(formattedText), 100);
    }
  };

  const focusTextInput = () => {
    textInputRef.current?.focus();
  };

  const formattedPhone = authStore.phoneNumber.replace(
    /(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})/,
    '+7 $2 $3-$4-$5'
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <StatusBar 
          barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        
        <CustomHeader 
          title=""
          statusBarProps={{
            barStyle: theme === 'dark' ? 'light-content' : 'dark-content',
            backgroundColor: colors.background
          }}
          safeAreaStyle={{
            backgroundColor: colors.background
          }}
          headerStyle={{
            backgroundColor: colors.background,
            borderBottomWidth: 0,
            elevation: 0,
            shadowOpacity: 0
          }}
          iconColor={colors.text}
        />
        
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>📱</Text>
              </View>
            </View>
            
            <Text style={styles.title}>
              Подтвердите номер
            </Text>
            
            <Text style={styles.subtitle}>
              Введите 4-значный код, отправленный на
            </Text>
            
            <Text style={styles.phoneNumber}>
              {formattedPhone}
            </Text>
          </View>

          <Animated.View 
            style={[
              styles.inputContainer,
              { transform: [{ translateX: shakeAnim }] }
            ]}
          >
            <TextInput
              ref={textInputRef}
              style={styles.hiddenInput}
              value={code}
              onChangeText={handleCodeChange}
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
              returnKeyType="done"
            />
            
            <TouchableWithoutFeedback onPress={focusTextInput}>
              <View style={styles.codeContainer}>
                {[0, 1, 2, 3].map((index) => (
                  <View 
                    key={index}
                    style={[
                      styles.codeInput,
                      { 
                        borderColor: code.length === index ? colors.primary : 
                                   code[index] ? colors.success : colors.border,
                        backgroundColor: code[index] ? 
                          (theme === 'dark' ? colors.surface : '#F0F9FF') : 
                          colors.card,
                        borderWidth: code.length === index ? 2 : 1,
                        transform: [{ scale: code.length === index ? 1.05 : 1 }]
                      }
                    ]}
                  >
                    <Text style={[
                      styles.codeText, 
                      { 
                        color: code[index] ? colors.text : colors.placeholder,
                      }
                    ]}>
                      {code[index] || ''}
                    </Text>
                  </View>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </Animated.View>
          
          <View style={styles.footer}>
            <Button
              mode="text"
              onPress={handleResendCode}
              disabled={timeLeft > 0 || isResending}
              style={styles.resendButton}
              loading={isResending}
              labelStyle={[
                styles.resendButtonText,
                { 
                  color: timeLeft > 0 ? colors.textTertiary : colors.primary,
                  fontWeight: '500'
                }
              ]}
            >
              {timeLeft > 0 ? 
                `Повторить через ${formatTime(timeLeft)}` : 
                "Отправить код повторно"
              }
            </Button>
            
            <Text style={styles.helpText}>
              Не получили код? Проверьте спам или попробуйте снова
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
});

const themedStyles = (colors, theme) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 16,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme === 'dark' ? colors.surface : '#EBF8FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme === 'dark' ? colors.border : '#BFDBFE',
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  inputContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  hiddenInput: {
    position: 'absolute',
    height: 0,
    width: 0,
    opacity: 0,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
  },
  codeInput: {
    width: 56,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  codeText: {
    fontSize: 24,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  resendButton: {
    marginBottom: 16,
    paddingVertical: 4,
  },
  resendButtonText: {
    fontSize: 16,
  },
  helpText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});

export default CodeVerificationScreen;