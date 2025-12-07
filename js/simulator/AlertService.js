export default class AlertService {
    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'alert-container';
        this.container.style.position = 'absolute';
        this.container.style.top = '100px'; // Below top bar
        this.container.style.left = '50%';
        this.container.style.transform = 'translateX(-50%)';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.alignItems = 'center';
        this.container.style.pointerEvents = 'none'; // Let clicks pass through
        this.container.style.zIndex = '1000';
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = 3000) {
        const alert = document.createElement('div');
        alert.className = 'tesla-alert';
        alert.textContent = message;

        // Tesla-like styling
        alert.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        alert.style.color = 'white';
        alert.style.padding = '10px 20px';
        alert.style.marginBottom = '10px';
        alert.style.borderRadius = '8px';
        alert.style.fontFamily = '"Gotham", sans-serif'; // Or system font
        alert.style.fontSize = '14px';
        alert.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
        alert.style.opacity = '0';
        alert.style.transition = 'opacity 0.3s ease';

        if (type === 'error') {
            alert.style.borderLeft = '4px solid #ff4444';
        } else if (type === 'success') {
            alert.style.borderLeft = '4px solid #00ccff'; // Tesla blue-ish
        }

        this.container.appendChild(alert);

        // Fade in
        requestAnimationFrame(() => {
            alert.style.opacity = '1';
        });

        // Remove after duration
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => {
                if (alert.parentNode) {
                    this.container.removeChild(alert);
                }
            }, 300);
        }, duration);
    }
}
