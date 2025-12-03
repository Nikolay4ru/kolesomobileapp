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
  StatusBar,
  InteractionManager,
  SafeAreaView
} from "react-native";
import { Button, Text } from "react-native-paper";
import { observer } from "mobx-react-lite";
import { useStores } from "../useStores";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import CustomHeader from "../components/CustomHeader";

const RESEND_TIMEOUT = 60;

// Отдельный компонент для таймера, чтобы его ре-рендер не влиял на остальное
const TimerButton = observer(({ onResend, isResending, colors }) => {
  const [timeLeft, setTimeLeft] = useState(RESEND_TIMEOUT);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeLeft <= 0]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleResend = async () => {
    if (timeLeft > 0 || isResending) return;
    await onResend();
    setTimeLeft(RESEND_TIMEOUT);
  };

  return (
    <Button
      mode="text"
      onPress={handleResend}
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
  );
});

const styles = StyleSheet.create({
  resendButton: {
    marginBottom: 16,
    paddingVertical: 4,
  },
  resendButtonText: {
    fontSize: 16,
  },
});

const CodeVerificationScreen = observer(() => {
  const [code, setCode] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const { authStore } = useStores();
  const navigation = useNavigation();
  const { colors, theme } = useTheme();
  const themedStyles = useThemedStyles(createThemedStyles);
  
  const textInputRef = useRef(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Автофокус при входе на экран с задержкой для Android
  useFocusEffect(
    React.useCallback(() => {
      const focusTimeout = setTimeout(() => {
        InteractionManager.runAfterInteractions(() => {
          if (textInputRef.current && Platform.OS === 'android') {
            textInputRef.current.focus();
            setIsFocused(true);
          }
        });
      }, Platform.OS === 'android' ? 300 : 100);

      return () => {
        clearTimeout(focusTimeout);
        setIsFocused(false);
      };
    }, [])
  );

  const shakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handleVerify = async (verificationCode) => {
    Keyboard.dismiss();
    try {
      await authStore.verifyCode(verificationCode);
      navigation.navigate("MainTabs");
    } catch (error) {
      setCode("");
      shakeAnimation();
      setTimeout(() => {
        if (textInputRef.current) {
          textInputRef.current.focus();
        }
      }, 300);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    try {
      await authStore.resendCode?.();
      setCode("");
      setTimeout(() => {
        if (textInputRef.current) {
          textInputRef.current.focus();
        }
      }, 100);
    } catch (error) {
      console.error('Error resending code:', error);
    } finally {
      setIsResending(false);
    }
  };

  const handleCodeChange = (text) => {
    const formattedText = text.replace(/[^0-9]/g, '');
    if (formattedText.length > 4) return;
    
    setCode(formattedText);
    
    if (formattedText.length === 4) {
      setTimeout(() => handleVerify(formattedText), 100);
    }
  };

  const focusTextInput = () => {
    if (textInputRef.current && !isFocused) {
      textInputRef.current.focus();
      setIsFocused(true);
    }
  };

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  const formattedPhone = authStore.phoneNumber?.replace(
    /(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})/,
    '+7 $2 $3-$4-$5'
  ) || '';

  // Мемоизируем стили ячеек кода
  const getCodeInputStyle = React.useCallback((index) => {
    const isActive = isFocused && code.length === index;
    const hasFilled = !!code[index];
    
    return [
      themedStyles.codeInput,
      { 
        borderColor: isActive ? colors.primary : 
                     hasFilled ? colors.success : colors.border,
        backgroundColor: hasFilled ? 
          (theme === 'dark' ? colors.surface : '#F0F9FF') : 
          colors.card,
        borderWidth: isActive ? 2 : 1,
      }
    ];
  }, [isFocused, code, colors, theme, themedStyles.codeInput]);

  return (
    
    <View style={themedStyles.container}>  
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
        modal={false}
        iconColor={colors.text}
      />
      
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={themedStyles.keyboardContainer}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <View style={themedStyles.content}>
            <View style={themedStyles.header}>
              <View style={themedStyles.iconContainer}>
                <View style={themedStyles.iconCircle}>
                  <Text style={themedStyles.iconText}>📱</Text>
                </View>
              </View>
              
              <Text style={themedStyles.title}>
                Подтвердите номер
              </Text>
              
              <Text style={themedStyles.subtitle}>
                Введите 4-значный код, отправленный на
              </Text>
              
              <Text style={themedStyles.phoneNumber}>
                {formattedPhone}
              </Text>
            </View>

            <Animated.View 
              style={[
                themedStyles.inputContainer,
                { transform: [{ translateX: shakeAnim }] }
              ]}
            >
              <TextInput
                ref={textInputRef}
                style={themedStyles.hiddenInput}
                value={code}
                onChangeText={handleCodeChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                keyboardType="number-pad"
                maxLength={4}
                autoFocus={Platform.OS === 'ios'}
                returnKeyType="done"
                caretHidden={Platform.OS === 'android'}
                selection={Platform.OS === 'android' ? { start: code.length, end: code.length } : undefined}
                importantForAutofill="no"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
              />
              
              <TouchableWithoutFeedback onPress={focusTextInput}>
                <View style={themedStyles.codeContainer}>
                  {[0, 1, 2, 3].map((index) => (
                    <View 
                      key={index}
                      style={getCodeInputStyle(index)}
                    >
                      <Text style={[
                        themedStyles.codeText, 
                        { 
                          color: code[index] ? colors.text : colors.placeholder,
                        }
                      ]}>
                        {code[index] || '•'}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableWithoutFeedback>
            </Animated.View>
            
            <View style={themedStyles.footer}>
              <TimerButton 
                onResend={handleResendCode}
                isResending={isResending}
                colors={colors}
              />
              
              <Text style={themedStyles.helpText}>
                Не получили код? Проверьте спам или попробуйте снова
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
});

const createThemedStyles = (colors, theme) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
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
    left: -1000,
    top: -1000,
    height: 1,
    width: 1,
    opacity: 0,
    fontSize: 16,
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
  helpText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});

export default CodeVerificationScreen;