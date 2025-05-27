import { makeAutoObservable } from "mobx";
import { MMKV } from "react-native-mmkv";

const storage = new MMKV();

class AuthStore {
  phoneNumber = "";
  isLoggedIn = false;
  verificationCode = ""; // Сгенерированный код
  enteredCode = ""; // Введенный пользователем код

  constructor() {
    makeAutoObservable(this);
    this.loadState();
    console.log("Loaded state:", { phoneNumber: this.phoneNumber, isLoggedIn: this.isLoggedIn });

  }

  loadState() {
    const storedPhoneNumber = storage.getString("phoneNumber");
    if (storedPhoneNumber) {
      this.phoneNumber = storedPhoneNumber;
      this.isLoggedIn = true;
    }
  }

  login(phoneNumber) {
    
    this.phoneNumber = phoneNumber;
    this.isLoggedIn = true;
    this.saveState();
  }

  // Сохраняем состояние в MMKV
  saveState() {
    storage.set("phoneNumber", this.phoneNumber);
    storage.set("isLoggedIn", JSON.stringify(this.isLoggedIn));
  }

  sendVerificationCode(phoneNumber) {

    this.phoneNumber = phoneNumber;
    this.isLoggedIn = false;
    this.saveState();
    // Генерация случайного 4-значного кода
    this.verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    console.log(`SMS code sent: ${this.verificationCode}`);
    // Здесь можно добавить отправку кода через SMS API
  }

  verifyCode(code) {
    return code === this.verificationCode;
  }

  logout() {
    this.phoneNumber = "";
    this.isLoggedIn = false;
    this.saveState();
  }
}

export const authStore = new AuthStore();