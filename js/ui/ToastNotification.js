/**
 * Modern Toast Notification System
 * Tesla-style alert notifications
 */

class ToastNotificationSystem {
    constructor() {
        this.container = null;
        this.toasts = [];
        this.maxToasts = 3;
        this.init();
    }

    init() {
        // Create toast container
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 12px;
            pointer-events: none;
        `;
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = 4000) {
        const toast = this.createToast(message, type);
        this.container.appendChild(toast);
        this.toasts.push(toast);

        // Limit number of toasts
        if (this.toasts.length > this.maxToasts) {
            const oldToast = this.toasts.shift();
            this.removeToast(oldToast);
        }

        // Animate in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        // Auto remove
        if (duration > 0) {
            setTimeout(() => this.removeToast(toast), duration);
        }

        return toast;
    }

    createToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle',
            fsd: 'fa-car'
        };

        const colors = {
            info: '#3b82f6',
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444',
            fsd: '#8b5cf6'
        };

        toast.style.cssText = `
            background: rgba(17, 25, 40, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-left: 4px solid ${colors[type]};
            border-radius: 12px;
            padding: 16px 20px;
            min-width: 320px;
            max-width: 480px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            pointer-events: auto;
            cursor: pointer;
        `;

        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fas ${icons[type]}" style="color: ${colors[type]}; font-size: 20px;"></i>
                <div style="flex: 1; color: white; font-size: 14px; font-weight: 500; line-height: 1.4;">
                    ${message}
                </div>
                <i class="fas fa-times" style="color: rgba(255, 255, 255, 0.5); font-size: 14px; cursor: pointer;"></i>
            </div>
        `;

        // Click to dismiss
        toast.addEventListener('click', () => this.removeToast(toast));

        return toast;
    }

    removeToast(toast) {
        if (!toast || !toast.parentElement) return;

        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';

        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
            const index = this.toasts.indexOf(toast);
            if (index > -1) {
                this.toasts.splice(index, 1);
            }
        }, 300);
    }

    // Convenience methods
    info(message, duration) {
        return this.show(message, 'info', duration);
    }

    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    fsd(message, duration) {
        return this.show(message, 'fsd', duration);
    }

    clear() {
        this.toasts.forEach(toast => this.removeToast(toast));
        this.toasts = [];
    }
}

// Global instance
window.Toast = new ToastNotificationSystem();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ToastNotificationSystem;
}
