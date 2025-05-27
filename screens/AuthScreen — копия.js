import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { TextInput, Button, HelperText } from "react-native-paper";
import { observer } from "mobx-react-lite";
import Animated, { useSharedValue, withTiming } from "react-native-reanimated";
import { MaskedTextInput } from "react-native-advanced-input-mask";
//import { authStore } from "../stores/AuthStore";
import { useStores } from "../useStores";
import { useNavigation } from "@react-navigation/native";

const AuthScreen = observer(() => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const { authStore } = useStores(); // Получаем authStore из контекста

  const navigation = useNavigation();

  // Обработка ввода номера телефона
  const handlePhoneChange = (formatted, extracted) => {
    let cleaned = extracted.replace(/\D/g, ""); // Убираем все символы кроме цифр
    
    // Если первый символ 8 или 7, заменяем его на +7
    if(!phoneNumber) {

    
    if (cleaned.startsWith("8") || cleaned.startsWith("7")) {
      cleaned = "+7" + cleaned.slice(1);
    }
}
    console.log(cleaned);
    // Обновляем состояние
    setPhoneNumber(cleaned);
  };

  const handleLogin = () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError("Введите корректный номер телефона");
      return;
    }
     // Убираем все символы кроме цифр из номера перед отправкой
    const cleanedPhoneNumber = phoneNumber.replace(/\D/g, "");
    // Отправка кода подтверждения
    authStore.sendVerificationCode(cleanedPhoneNumber);
    navigation.navigate("CodeVerification");

    // Убираем все символы кроме цифр из номера перед отправкой
   // const cleanedPhoneNumber = phoneNumber.replace(/\D/g, "");
   // authStore.login(cleanedPhoneNumber);
    setError("");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Вход</Text>
        <MaskedTextInput
          mask={"+7 ([000]) [000]-[00]-[00]"}
          value={phoneNumber}
          autocomplete={false}
          onChangeText={(formatted, extracted) => handlePhoneChange(formatted, extracted)}
          
          keyboardType="phone-pad"
          placeholder="+7 (123) 456-78-90"
          style={styles.input}
        />
        {error ? <HelperText type="error">{error}</HelperText> : null}

        <Button
          mode="contained"
          onPress={handleLogin}
          style={styles.button}
          labelStyle={styles.buttonLabel}
        >
          Войти
        </Button>

        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Забыли пароль?</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
});


export default AuthScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  content: {
    marginHorizontal: 20,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  input: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  button: {
    marginTop: 20,
    borderRadius: 8,
    height: 50,
    justifyContent: "center",
    backgroundColor: "#79ebdc"
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  forgotPassword: {
    marginTop: 15,
    alignSelf: "center",
  },
  forgotPasswordText: {
    color: "#007bff",
    fontSize: 14,
  },
});