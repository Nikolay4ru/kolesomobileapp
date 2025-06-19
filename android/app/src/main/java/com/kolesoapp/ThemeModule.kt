// android/app/src/main/java/com/kolesoapp/ThemeModule.kt
package com.kolesoapp

import android.app.UiModeManager
import android.content.Context
import android.content.res.Configuration
import android.os.Build
import android.view.View
import androidx.appcompat.app.AppCompatDelegate
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class ThemeModule(private val reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val MODULE_NAME = "ThemeModule"
        const val EVENT_THEME_CHANGED = "onThemeChanged"
    }

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun setNightMode(mode: String) {
        val nightMode = when (mode) {
            "MODE_NIGHT_YES" -> AppCompatDelegate.MODE_NIGHT_YES
            "MODE_NIGHT_NO" -> AppCompatDelegate.MODE_NIGHT_NO
            "MODE_NIGHT_FOLLOW_SYSTEM" -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
            else -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
        }

        // Устанавливаем режим на главном потоке
        reactContext.runOnUiQueueThread {
            try {
                AppCompatDelegate.setDefaultNightMode(nightMode)
                
                // Для Android 12+ также используем UiModeManager
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val uiModeManager = reactContext.getSystemService(Context.UI_MODE_SERVICE) as? UiModeManager
                    uiModeManager?.let {
                        when (nightMode) {
                            AppCompatDelegate.MODE_NIGHT_YES -> it.setNightMode(UiModeManager.MODE_NIGHT_YES)
                            AppCompatDelegate.MODE_NIGHT_NO -> it.setNightMode(UiModeManager.MODE_NIGHT_NO)
                        }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    @ReactMethod
    fun forceTheme(theme: String?) {
        currentActivity?.runOnUiThread {
            try {
                // Специальная логика для MIUI
                if (isMIUISystem()) {
                    when (theme) {
                        "light" -> {
                            // Принудительно светлая тема
                            AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO)
                            // Дополнительно устанавливаем флаги для MIUI
                            setMIUIThemeFlags(false)
                        }
                        "dark" -> {
                            // Принудительно темная тема
                            AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES)
                            setMIUIThemeFlags(true)
                        }
                        else -> {
                            // Системная тема
                            AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM)
                        }
                    }
                    
                    // Пересоздаем активность для применения изменений
                    currentActivity?.recreate()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    @ReactMethod
    fun isMIUIDevice(promise: Promise) {
        try {
            val isMIUI = isMIUISystem()
            promise.resolve(isMIUI)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun getCurrentTheme(promise: Promise) {
        try {
            val configuration = reactContext.resources.configuration
            val currentNightMode = configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
            
            val theme = when (currentNightMode) {
                Configuration.UI_MODE_NIGHT_YES -> "dark"
                Configuration.UI_MODE_NIGHT_NO -> "light"
                else -> "light"
            }
            
            promise.resolve(theme)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun getMIUIVersion(promise: Promise) {
        try {
            if (!isMIUISystem()) {
                promise.resolve(null)
                return
            }

            val systemProperties = Class.forName("android.os.SystemProperties")
            val get = systemProperties.getMethod("get", String::class.java)
            
            val versionCode = get.invoke(systemProperties, "ro.miui.ui.version.code") as? String
            val versionName = get.invoke(systemProperties, "ro.miui.ui.version.name") as? String
            
            val result = Arguments.createMap().apply {
                putString("versionCode", versionCode)
                putString("versionName", versionName)
            }
            
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    // Проверка, является ли система MIUI
    private fun isMIUISystem(): Boolean {
        return try {
            // Проверяем различные способы определения MIUI
            val manufacturer = Build.MANUFACTURER.lowercase()
            val brand = Build.BRAND.lowercase()
            
            // Проверяем производителя
            if (manufacturer.contains("xiaomi") || 
                brand.contains("xiaomi") || 
                brand.contains("redmi") || 
                brand.contains("poco")) {
                return true
            }
            
            // Проверяем наличие специфичных для MIUI свойств
            val systemProperties = Class.forName("android.os.SystemProperties")
            val get = systemProperties.getMethod("get", String::class.java)
            
            // Проверяем ro.miui.ui.version.code
            val miuiVersionCode = get.invoke(systemProperties, "ro.miui.ui.version.code") as? String
            if (!miuiVersionCode.isNullOrEmpty()) {
                return true
            }
            
            // Проверяем ro.miui.ui.version.name
            val miuiVersionName = get.invoke(systemProperties, "ro.miui.ui.version.name") as? String
            if (!miuiVersionName.isNullOrEmpty()) {
                return true
            }
            
            false
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    // Установка специальных флагов для MIUI
    private fun setMIUIThemeFlags(isDark: Boolean) {
        try {
            val activity = currentActivity ?: return
            val window = activity.window
            val decorView = window.decorView
            
            // Устанавливаем флаги окна для MIUI
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                var flags = decorView.systemUiVisibility
                flags = if (isDark) {
                    // Для темной темы убираем флаг светлой строки состояния
                    flags and View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR.inv()
                } else {
                    // Для светлой темы добавляем флаг светлой строки состояния
                    flags or View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                }
                decorView.systemUiVisibility = flags
            }
            
            // Дополнительная настройка для MIUI 12+ (Android 8+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                var flags = decorView.systemUiVisibility
                flags = if (isDark) {
                    flags and View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR.inv()
                } else {
                    flags or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
                }
                decorView.systemUiVisibility = flags
            }

            // Для Android 10+ используем новый API
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                window.isNavigationBarContrastEnforced = false
                window.isStatusBarContrastEnforced = false
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    // Отправка события об изменении темы
    private fun sendThemeChangeEvent(theme: String) {
        try {
            val params = Arguments.createMap().apply {
                putString("theme", theme)
            }
            
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(EVENT_THEME_CHANGED, params)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    // Дополнительные методы для работы с MIUI

    @ReactMethod
    fun disableMIUIOptimization(promise: Promise) {
        try {
            if (!isMIUISystem()) {
                promise.resolve(false)
                return
            }

            currentActivity?.runOnUiThread {
                try {
                    // Пытаемся отключить оптимизации MIUI для темной темы
                    val window = currentActivity?.window
                    window?.let {
                        // Отключаем автоматическое затемнение
                        if (Build.VERSION.SDK_INT >= 29) { // Android 10 (Q)
                            try {
                                // Используем reflection для безопасности
                                val method = it.javaClass.getMethod("setForceDarkAllowed", Boolean::class.java)
                                method.invoke(it, false)
                            } catch (e: Exception) {
                                // Игнорируем если метод недоступен
                            }
                        }
                    }
                    promise.resolve(true)
                } catch (e: Exception) {
                    promise.resolve(false)
                }
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun isSystemDarkModeEnabled(promise: Promise) {
        try {
            val configuration = reactContext.resources.configuration
            val currentNightMode = configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
            val isDarkMode = currentNightMode == Configuration.UI_MODE_NIGHT_YES
            promise.resolve(isDarkMode)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }
}