package com.kolesoapp

import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {
  
  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "kolesoapp"
  
  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    // ВАЖНО: Для MIUI нужно установить тему ДО super.onCreate()
    if (isMIUISystem()) {
      // Устанавливаем базовую тему для избежания конфликтов
      setTheme(R.style.AppTheme)
    }
    
    super.onCreate(savedInstanceState)
    
    // Настройка edge-to-edge дизайна
    setupEdgeToEdge()
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    
    // НЕ вызываем delegate.applyDayNight() на MIUI - это вызывает мигание
    if (!isMIUISystem()) {
      delegate.applyDayNight()
    }
    
    // Обновляем только флаги UI
    updateSystemBarsForConfiguration(newConfig)
  }

  /**
   * Настройка edge-to-edge дизайна
   */
  private fun setupEdgeToEdge() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      window.apply {
        // Убираем флаг полупрозрачного статус бара
        clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS)
        // Добавляем флаг для отрисовки под системными барами
        addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
        // Делаем статус бар прозрачным
        statusBarColor = android.graphics.Color.TRANSPARENT
        
        // Для навигационного бара
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
          navigationBarColor = android.graphics.Color.TRANSPARENT
        }
      }
    }

    // Настраиваем системные бары
    updateSystemBarsForCurrentTheme()
  }

  /**
   * Проверка, является ли устройство Xiaomi/MIUI
   */
  private fun isMIUISystem(): Boolean {
    return try {
      val manufacturer = Build.MANUFACTURER.lowercase()
      val brand = Build.BRAND.lowercase()
      
      manufacturer.contains("xiaomi") || 
      brand.contains("xiaomi") || 
      brand.contains("redmi") || 
      brand.contains("poco")
    } catch (e: Exception) {
      false
    }
  }

  /**
   * Обновление системных баров для текущей темы
   */
  private fun updateSystemBarsForCurrentTheme() {
    val isNightMode = isNightModeActive()
    updateSystemBarsAppearance(!isNightMode)
  }

  /**
   * Обновление системных баров при изменении конфигурации
   */
  private fun updateSystemBarsForConfiguration(config: Configuration) {
    val isNightMode = (config.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
    updateSystemBarsAppearance(!isNightMode)
  }

  /**
   * Проверка активности темной темы
   */
  private fun isNightModeActive(): Boolean {
    val currentNightMode = resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
    return currentNightMode == Configuration.UI_MODE_NIGHT_YES
  }

  /**
   * Обновление внешнего вида системных баров
   */
  private fun updateSystemBarsAppearance(isLight: Boolean) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      // Используем post для избежания проблем с таймингом на MIUI
      window.decorView.post {
        try {
          var flags = window.decorView.systemUiVisibility
          
          // Статус бар
          flags = if (isLight) {
            flags or View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
          } else {
            flags and View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR.inv()
          }
          
          // Навигационный бар (Android 8+)
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            flags = if (isLight) {
              flags or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
            } else {
              flags and View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR.inv()
            }
          }
          
          window.decorView.systemUiVisibility = flags
        } catch (e: Exception) {
          // Игнорируем ошибки на MIUI
        }
      }
    }
  }
}