/**
 * New Tesla-Style UI Mode
 * Modern minimalist interface matching Tesla FSD UI
 */

export default class NewUIMode {
    constructor(simulator) {
        this.simulator = simulator;
        this.enabled = false;
        this.container = null;
        this.speedUnit = 'mph'; // or 'kmh'
        this.currentTime = new Date();
        this.fsdActive = false;

        this.init();
        this.startClock();
    }

    init() {
        // Create main container
        this.container = document.createElement('div');
        this.container.id = 'new-ui-mode';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 5000;
            pointer-events: none;
            display: none;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        `;

        this.container.innerHTML = `
            <!-- Top Left: Speed Display -->
            <div id="new-ui-speed" style="
                position: absolute;
                top: 40px;
                left: 40px;
                pointer-events: auto;
            ">
                <div style="
                    font-size: 72px;
                    font-weight: 300;
                    color: white;
                    line-height: 1;
                    letter-spacing: -2px;
                ">
                    <span id="new-ui-speed-value">0</span>
                </div>
                <div style="
                    font-size: 18px;
                    font-weight: 500;
                    color: rgba(255, 255, 255, 0.6);
                    margin-top: 4px;
                    letter-spacing: 1px;
                ">
                    <span id="new-ui-speed-unit">mph</span>
                </div>
            </div>

            <!-- Top Right: Time & Status -->
            <div id="new-ui-top-right" style="
                position: absolute;
                top: 40px;
                right: 40px;
                text-align: right;
                pointer-events: auto;
            ">
                <div style="
                    font-size: 24px;
                    font-weight: 500;
                    color: white;
                    margin-bottom: 8px;
                ">
                    <span id="new-ui-time">12:00</span>
                </div>
                <div id="new-ui-fsd-status" style="
                    font-size: 14px;
                    color: rgba(255, 255, 255, 0.7);
                    display: none;
                ">
                    <i class="fas fa-car"></i> Autopilot Park
                </div>
            </div>

            <!-- Center: FSD Message -->
            <div id="new-ui-center-message" style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                pointer-events: none;
                display: none;
            ">
                <div style="
                    font-size: 18px;
                    color: rgba(255, 255, 255, 0.8);
                    font-weight: 500;
                ">
                    Hold for driving
                </div>
            </div>

            <!-- Bottom: Info Bar -->
            <div id="new-ui-bottom-bar" style="
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 80px;
                background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 40px;
                pointer-events: auto;
            ">
                <!-- Left: Speed Limit -->
                <div id="new-ui-speed-limit" style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                ">
                    <div style="
                        width: 48px;
                        height: 48px;
                        border-radius: 50%;
                        background: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border: 3px solid #ef4444;
                    ">
                        <div style="
                            font-size: 20px;
                            font-weight: 700;
                            color: #1f2937;
                        ">
                            <span id="new-ui-limit-value">25</span>
                        </div>
                    </div>
                    <div style="
                        font-size: 14px;
                        color: rgba(255, 255, 255, 0.7);
                    ">
                        Speed Limit
                    </div>
                </div>

                <!-- Center: Stats -->
                <div style="
                    display: flex;
                    gap: 32px;
                    font-size: 13px;
                    color: rgba(255, 255, 255, 0.6);
                ">
                    <div>
                        <div style="color: rgba(255, 255, 255, 0.4); margin-bottom: 4px;">Distance</div>
                        <div style="color: white; font-weight: 500;"><span id="new-ui-distance">0.0</span> mi</div>
                    </div>
                    <div>
                        <div style="color: rgba(255, 255, 255, 0.4); margin-bottom: 4px;">Avg Speed</div>
                        <div style="color: white; font-weight: 500;"><span id="new-ui-avg-speed">0</span> mph</div>
                    </div>
                    <div>
                        <div style="color: rgba(255, 255, 255, 0.4); margin-bottom: 4px;">Plan Time</div>
                        <div style="color: white; font-weight: 500;"><span id="new-ui-plan-time">0</span> ms</div>
                    </div>
                </div>

                <!-- Right: Gear -->
                <div id="new-ui-gear" style="
                    font-size: 32px;
                    font-weight: 700;
                    color: white;
                    letter-spacing: 2px;
                ">
                    <span id="new-ui-gear-value">P</span>
                </div>
            </div>
        `;

        document.body.appendChild(this.container);
    }

    startClock() {
        setInterval(() => {
            this.currentTime = new Date();
            this.updateTime();
        }, 1000);
    }

    enable() {
        this.enabled = true;
        this.container.style.display = 'block';

        // Hide old UI elements
        const oldElements = [
            '#stats',
            '#controls',
            '#config-box',
            '#editor-enabler',
            '#camera-controls'
        ];

        oldElements.forEach(selector => {
            const el = document.querySelector(selector);
            if (el) el.style.display = 'none';
        });
    }

    disable() {
        this.enabled = false;
        this.container.style.display = 'none';

        // Show old UI elements
        const oldElements = [
            '#stats',
            '#controls',
            '#config-box',
            '#editor-enabler',
            '#camera-controls'
        ];

        oldElements.forEach(selector => {
            const el = document.querySelector(selector);
            if (el) el.style.display = '';
        });
    }

    toggle() {
        if (this.enabled) {
            this.disable();
        } else {
            this.enable();
        }
    }

    update(data) {
        if (!this.enabled) return;

        // Update speed
        const speed = data.speed || 0;
        const speedValue = this.speedUnit === 'mph' ? speed * 2.237 : speed * 3.6;
        document.getElementById('new-ui-speed-value').textContent = Math.round(speedValue);
        document.getElementById('new-ui-speed-unit').textContent = this.speedUnit;

        // Update speed limit
        const speedLimit = data.speedLimit || 25;
        const limitValue = this.speedUnit === 'mph' ? speedLimit * 2.237 : speedLimit * 3.6;
        document.getElementById('new-ui-limit-value').textContent = Math.round(limitValue);

        // Update FSD status
        this.fsdActive = data.fsdActive || false;
        const fsdStatus = document.getElementById('new-ui-fsd-status');
        if (this.fsdActive) {
            fsdStatus.style.display = 'block';
        } else {
            fsdStatus.style.display = 'none';
        }

        // Update center message
        const centerMessage = document.getElementById('new-ui-center-message');
        if (!this.fsdActive && speed < 0.1) {
            centerMessage.style.display = 'block';
        } else {
            centerMessage.style.display = 'none';
        }

        // Update stats
        document.getElementById('new-ui-distance').textContent = (data.distance || 0).toFixed(1);
        document.getElementById('new-ui-avg-speed').textContent = Math.round(data.avgSpeed || 0);
        document.getElementById('new-ui-plan-time').textContent = Math.round(data.planTime || 0);

        // Update gear
        const gear = data.gear || 'P';
        document.getElementById('new-ui-gear-value').textContent = gear;
    }

    updateTime() {
        const hours = this.currentTime.getHours();
        const minutes = this.currentTime.getMinutes();
        const timeString = `${hours}:${minutes.toString().padStart(2, '0')}`;

        const timeEl = document.getElementById('new-ui-time');
        if (timeEl) {
            timeEl.textContent = timeString;
        }
    }

    setSpeedUnit(unit) {
        this.speedUnit = unit;
        document.getElementById('new-ui-speed-unit').textContent = unit;
    }
}
