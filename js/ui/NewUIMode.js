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

            <!-- Top Right: Time & Controls Menu -->
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
                    margin-bottom: 16px;
                ">
                    <span id="new-ui-time">12:00</span>
                </div>
                
                <!-- Control Menu -->
                <div id="new-ui-control-menu" style="
                    background: rgba(20, 20, 20, 0.85);
                    backdrop-filter: blur(20px);
                    border-radius: 16px;
                    padding: 16px;
                    min-width: 200px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                ">
                    <!-- Autopilot Toggle -->
                    <div id="new-ui-autopilot-btn" style="
                        padding: 12px 16px;
                        background: rgba(59, 130, 246, 0.2);
                        border: 2px solid rgba(59, 130, 246, 0.5);
                        border-radius: 12px;
                        cursor: pointer;
                        margin-bottom: 12px;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    ">
                        <i class="fas fa-car" style="color: #3b82f6; font-size: 16px;"></i>
                        <span style="color: white; font-weight: 500; font-size: 14px;">Autopilot</span>
                        <div id="new-ui-autopilot-indicator" style="
                            margin-left: auto;
                            width: 8px;
                            height: 8px;
                            border-radius: 50%;
                            background: rgba(255, 255, 255, 0.3);
                            transition: all 0.3s ease;
                        "></div>
                    </div>

                    <!-- Scenario Button -->
                    <div id="new-ui-scenario-btn" style="
                        padding: 12px 16px;
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 10px;
                        cursor: pointer;
                        margin-bottom: 8px;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    ">
                        <i class="fas fa-folder-open" style="color: rgba(255, 255, 255, 0.7); font-size: 14px;"></i>
                        <span style="color: rgba(255, 255, 255, 0.9); font-size: 13px;">Load Scenario</span>
                    </div>

                    <!-- Edit Button -->
                    <div id="new-ui-edit-btn" style="
                        padding: 12px 16px;
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 10px;
                        cursor: pointer;
                        margin-bottom: 8px;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    ">
                        <i class="fas fa-edit" style="color: rgba(255, 255, 255, 0.7); font-size: 14px;"></i>
                        <span style="color: rgba(255, 255, 255, 0.9); font-size: 13px;">Edit Map</span>
                    </div>

                    <!-- Playback Controls -->
                    <div style="
                        display: flex;
                        gap: 8px;
                        margin-top: 12px;
                        padding-top: 12px;
                        border-top: 1px solid rgba(255, 255, 255, 0.1);
                    ">
                        <div id="new-ui-play-btn" style="
                            flex: 1;
                            padding: 10px;
                            background: rgba(16, 185, 129, 0.2);
                            border: 1px solid rgba(16, 185, 129, 0.3);
                            border-radius: 8px;
                            cursor: pointer;
                            text-align: center;
                            transition: all 0.2s ease;
                        ">
                            <i class="fas fa-play" style="color: #10b981; font-size: 12px;"></i>
                        </div>
                        <div id="new-ui-pause-btn" style="
                            flex: 1;
                            padding: 10px;
                            background: rgba(251, 191, 36, 0.2);
                            border: 1px solid rgba(251, 191, 36, 0.3);
                            border-radius: 8px;
                            cursor: pointer;
                            text-align: center;
                            transition: all 0.2s ease;
                            display: none;
                        ">
                            <i class="fas fa-pause" style="color: #fbbf24; font-size: 12px;"></i>
                        </div>
                        <div id="new-ui-restart-btn" style="
                            flex: 1;
                            padding: 10px;
                            background: rgba(239, 68, 68, 0.2);
                            border: 1px solid rgba(239, 68, 68, 0.3);
                            border-radius: 8px;
                            cursor: pointer;
                            text-align: center;
                            transition: all 0.2s ease;
                        ">
                            <i class="fas fa-redo" style="color: #ef4444; font-size: 12px;"></i>
                        </div>
                    </div>
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

        // Add event listeners
        this.setupEventListeners();
        this.setupHoverEffects();
    }

    setupEventListeners() {
        // Autopilot toggle
        const autopilotBtn = document.getElementById('new-ui-autopilot-btn');
        if (autopilotBtn) {
            autopilotBtn.addEventListener('click', () => {
                if (this.simulator.carControllerMode === 'autonomous') {
                    this.simulator.enableManualMode();
                } else {
                    this.simulator.enableAutonomousMode();
                }
                this.updateAutopilotState();
            });
        }

        // Scenario button
        const scenarioBtn = document.getElementById('new-ui-scenario-btn');
        if (scenarioBtn) {
            scenarioBtn.addEventListener('click', () => {
                this.simulator.loadScenario();
            });
        }

        // Edit button
        const editBtn = document.getElementById('new-ui-edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.simulator.enableEditor();
            });
        }

        // Play button
        const playBtn = document.getElementById('new-ui-play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.simulator.playScenario();
                playBtn.style.display = 'none';
                document.getElementById('new-ui-pause-btn').style.display = 'block';
            });
        }

        // Pause button
        const pauseBtn = document.getElementById('new-ui-pause-btn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                this.simulator.pauseScenario();
                pauseBtn.style.display = 'none';
                document.getElementById('new-ui-play-btn').style.display = 'block';
            });
        }

        // Restart button
        const restartBtn = document.getElementById('new-ui-restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.simulator.restartScenario();
            });
        }
    }

    setupHoverEffects() {
        // Autopilot button hover
        const autopilotBtn = document.getElementById('new-ui-autopilot-btn');
        if (autopilotBtn) {
            autopilotBtn.addEventListener('mouseenter', () => {
                autopilotBtn.style.background = 'rgba(59, 130, 246, 0.3)';
                autopilotBtn.style.transform = 'scale(1.02)';
            });
            autopilotBtn.addEventListener('mouseleave', () => {
                autopilotBtn.style.background = 'rgba(59, 130, 246, 0.2)';
                autopilotBtn.style.transform = 'scale(1)';
            });
        }

        // Generic hover for other buttons
        const buttons = ['scenario-btn', 'edit-btn', 'play-btn', 'pause-btn', 'restart-btn'];
        buttons.forEach(btnId => {
            const btn = document.getElementById(`new-ui-${btnId}`);
            if (btn) {
                btn.addEventListener('mouseenter', () => {
                    btn.style.background = 'rgba(255, 255, 255, 0.15)';
                    btn.style.transform = 'translateY(-2px)';
                });
                btn.addEventListener('mouseleave', () => {
                    const isPlayback = btnId.includes('play') || btnId.includes('pause') || btnId.includes('restart');
                    if (isPlayback) {
                        btn.style.background = btn.style.background; // Keep original
                    } else {
                        btn.style.background = 'rgba(255, 255, 255, 0.05)';
                    }
                    btn.style.transform = 'translateY(0)';
                });
            }
        });
    }

    updateAutopilotState() {
        const indicator = document.getElementById('new-ui-autopilot-indicator');
        const autopilotBtn = document.getElementById('new-ui-autopilot-btn');

        if (this.simulator.carControllerMode === 'autonomous' || this.simulator.carControllerMode === 'autopark') {
            if (indicator) {
                indicator.style.background = '#10b981';
                indicator.style.boxShadow = '0 0 8px #10b981';
            }
            if (autopilotBtn) {
                autopilotBtn.style.background = 'rgba(16, 185, 129, 0.25)';
                autopilotBtn.style.borderColor = 'rgba(16, 185, 129, 0.6)';
            }
        } else {
            if (indicator) {
                indicator.style.background = 'rgba(255, 255, 255, 0.3)';
                indicator.style.boxShadow = 'none';
            }
            if (autopilotBtn) {
                autopilotBtn.style.background = 'rgba(59, 130, 246, 0.2)';
                autopilotBtn.style.borderColor = 'rgba(59, 130, 246, 0.5)';
            }
        }
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

        // Update autopilot indicator
        this.updateAutopilotState();
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
