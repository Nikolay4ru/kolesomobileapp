// SBPPaymentService.js - Сервис для работы с СБП платежами

class SBPPaymentService {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.pollingInterval = null;
    }

    /**
     * Создание платежа и получение QR-кода
     */
    async createPayment(params) {
        try {
            const response = await fetch(`${this.apiUrl}/sbp-api.php?action=create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: params.amount,
                    description: params.description,
                    email: params.email,
                    phone: params.phone,
                    clientId: params.clientId,
                    returnUrl: params.returnUrl,
                    failUrl: params.failUrl,
                    qrSize: params.qrSize || 300
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to create payment');
            }

            return data;
        } catch (error) {
            console.error('Error creating payment:', error);
            throw error;
        }
    }

    /**
     * Проверка статуса платежа
     */
    async checkPaymentStatus(orderId) {
        try {
            const response = await fetch(`${this.apiUrl}/sbp-api.php?action=check-status&orderId=${orderId}`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to check status');
            }

            return data;
        } catch (error) {
            console.error('Error checking payment status:', error);
            throw error;
        }
    }

    /**
     * Начать отслеживание статуса платежа
     */
    startPolling(orderId, callback, interval = 3000) {
        this.stopPolling();

        const checkStatus = async () => {
            try {
                const status = await this.checkPaymentStatus(orderId);
                callback(status);

                // Останавливаем polling если платеж завершен
                if (status.paid || status.statusCode >= 3) {
                    this.stopPolling();
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        };

        // Первая проверка сразу
        checkStatus();

        // Последующие проверки с интервалом
        this.pollingInterval = setInterval(checkStatus, interval);
    }

    /**
     * Остановить отслеживание статуса
     */
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    /**
     * Открыть ссылку для оплаты в банковском приложении
     */
    openPaymentLink(payload) {
        if (this.isMobile()) {
            // На мобильном устройстве открываем ссылку в банковском приложении
            window.location.href = payload;
        } else {
            // На десктопе открываем в новом окне
            window.open(payload, '_blank');
        }
    }

    /**
     * Проверка мобильного устройства
     */
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
}