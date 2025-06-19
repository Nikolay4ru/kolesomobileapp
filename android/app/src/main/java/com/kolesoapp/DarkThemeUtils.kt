// android/app/src/main/java/com/kolesoapp/DarkThemeUtils.kt
package com.kolesoapp

import android.os.Build
import android.view.Window
import java.lang.reflect.Method

/**
 * Утилиты для безопасной работы с темной темой на разных версиях Android
 */
object DarkThemeUtils {
    
    private var setForceDarkAllowedMethod: Method? = null
    private var methodChecked = false
    
    /**
     * Безопасно отключает принудительную темную тему
     * Использует reflection для избежания ошибок компиляции
     */
    fun disableForceDark(window: Window) {
        if (Build.VERSION.SDK_INT < 29) return
        
        try {
            if (!methodChecked) {
                methodChecked = true
                setForceDarkAllowedMethod = window.javaClass.getDeclaredMethod(
                    "setForceDarkAllowed", 
                    Boolean::class.javaPrimitiveType
                )
            }
            
            setForceDarkAllowedMethod?.invoke(window, false)
        } catch (e: Exception) {
            // Метод недоступен на этом устройстве
            // Это нормально, просто игнорируем
        }
    }
    
    /**
     * Проверяет, поддерживается ли forceDarkAllowed на устройстве
     */
    fun isForceDarkSupported(window: Window): Boolean {
        if (Build.VERSION.SDK_INT < 29) return false
        
        return try {
            window.javaClass.getDeclaredMethod(
                "setForceDarkAllowed", 
                Boolean::class.javaPrimitiveType
            )
            true
        } catch (e: Exception) {
            false
        }
    }
}