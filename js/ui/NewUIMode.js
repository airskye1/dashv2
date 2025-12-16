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
                text-shadow: 0 2px 10px rgba(0,0,0,0.3);
            ">
                <div style="
                    font-size: 80px;
                    font-weight: 300;
                    color: white;
                    line-height: 1;
                    letter-spacing: -3px;
                ">
                    <span id="new-ui-speed-value">0</span>
                </div>
                <div style="
                    font-size: 16px;
                    font-weight: 500;
                    color: rgba(255, 255, 255, 0.8);
                    margin-top: 4px;
                    letter-spacing: 1px;
                ">
                    <span id="new-ui-speed-unit">mph</span>
                </div>
            </div>

            <!-- Top Right: Minimal Controls -->
            <div id="new-ui-top-right" style="
                position: absolute;
                top: 30px;
                right: 30px;
                display: flex;
                gap: 16px;
                align-items: center;
                pointer-events: auto;
            ">
                <!-- Status Group -->
                <div style="
                    display: flex; 
                    gap: 8px; 
                    background: rgba(0,0,0,0.5); 
                    padding: 8px; 
                    border-radius: 99px;
                    backdrop-filter: blur(10px);
                ">
                    <div id="new-ui-autopilot-btn" class="ui-btn" title="Toggle Autopilot" style="
                        width: 40px; height: 40px;
                        border-radius: 50%;
                        background: rgba(255,255,255,0.1);
                        display: flex; align-items: center; justify-content: center;
                        cursor: pointer;
                        color: white;
                        transition: all 0.2s;
                    ">
                        <i class="fas fa-magic"></i>
                    </div>
                </div>

                <!-- Tools Group -->
                <div style="
                    display: flex; 
                    gap: 8px; 
                    background: rgba(0,0,0,0.5); 
                    padding: 8px; 
                    border-radius: 99px;
                    backdrop-filter: blur(10px);
                ">
                    <div id="new-ui-scenario-btn" class="ui-btn" title="Load Scenario" style="
                        width: 40px; height: 40px;
                        border-radius: 50%;
                        background: rgba(255,255,255,0.1);
                        display: flex; align-items: center; justify-content: center;
                        cursor: pointer;
                        color: white;
                        transition: all 0.2s;
                    ">
                        <i class="fas fa-folder-open"></i>
                    </div>
                    <div id="new-ui-edit-btn" class="ui-btn" title="Edit Map" style="
                        width: 40px; height: 40px;
                        border-radius: 50%;
                        background: rgba(255,255,255,0.1);
                        display: flex; align-items: center; justify-content: center;
                        cursor: pointer;
                        color: white;
                        transition: all 0.2s;
                    ">
                        <i class="fas fa-pen"></i>
                    </div>
                    <div id="new-ui-settings-btn" class="ui-btn" title="Settings" style="
                        width: 40px; height: 40px;
                        border-radius: 50%;
                        background: rgba(255,255,255,0.1);
                        display: flex; align-items: center; justify-content: center;
                        cursor: pointer;
                        color: white;
                        transition: all 0.2s;
                    ">
                        <i class="fas fa-cog"></i>
                    </div>
                </div>

                <!-- Playback Group -->
                <div style="
                    display: flex; 
                    gap: 8px; 
                    background: rgba(0,0,0,0.5); 
                    padding: 8px; 
                    border-radius: 99px;
                    backdrop-filter: blur(10px);
                ">
                    <div id="new-ui-play-btn" class="ui-btn" title="Play" style="
                        width: 40px; height: 40px;
                        border-radius: 50%;
                        background: rgba(255,255,255,0.1);
                        display: flex; align-items: center; justify-content: center;
                        cursor: pointer;
                        color: #10b981;
                        transition: all 0.2s;
                    ">
                        <i class="fas fa-play"></i>
                    </div>
                    <div id="new-ui-pause-btn" class="ui-btn" title="Pause" style="
                        width: 40px; height: 40px;
                        border-radius: 50%;
                        background: rgba(255,255,255,0.1);
                        display: flex; align-items: center; justify-content: center;
                        cursor: pointer;
                        color: #fbbf24;
                        transition: all 0.2s;
                        display: none;
                    ">
                        <i class="fas fa-pause"></i>
                    </div>
                    <div id="new-ui-restart-btn" class="ui-btn" title="Restart" style="
                        width: 40px; height: 40px;
                        border-radius: 50%;
                        background: rgba(255,255,255,0.1);
                        display: flex; align-items: center; justify-content: center;
                        cursor: pointer;
                        color: #ef4444;
                        transition: all 0.2s;
                    ">
                        <i class="fas fa-redo"></i>
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

            <!-- Bottom: Simple Stats -->
            <div id="new-ui-bottom-bar" style="
                position: absolute;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                align-items: center;
                gap: 24px;
                pointer-events: none;
                text-shadow: 0 1px 4px rgba(0,0,0,0.5);
            ">
                <div style="color: rgba(255,255,255,0.6); font-size: 14px; font-weight: 500;">
                    <i class="fas fa-ruler-horizontal" style="margin-right: 6px;"></i>
                    <span id="new-ui-distance" style="color: white;">0.0</span> mi
                </div>
                <div style="color: rgba(255,255,255,0.6); font-size: 14px; font-weight: 500;">
                    <i class="fas fa-tachometer-alt" style="margin-right: 6px;"></i>
                    <span id="new-ui-limit-value" style="color: white;">25</span> limit
                </div>
                <div style="
                    font-size: 24px; 
                    font-weight: 700; 
                    color: white; 
                    background: rgba(255,255,255,0.15); 
                    padding: 2px 12px; 
                    border-radius: 6px;
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

        // Settings button
        const settingsBtn = document.getElementById('new-ui-settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                if (window.SettingsPanel) {
                    window.SettingsPanel.open();
                }
            });
        }

        // Play button
        const playBtn = document.getElementById('new-ui-play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.simulator.playScenario();
                playBtn.style.display = 'none';
                document.getElementById('new-ui-pause-btn').style.display = 'flex'; // Changed to flex to keep centering
            });
        }

        // Pause button
        const pauseBtn = document.getElementById('new-ui-pause-btn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                this.simulator.pauseScenario();
                pauseBtn.style.display = 'none';
                document.getElementById('new-ui-play-btn').style.display = 'flex'; // Changed to flex to keep centering
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
        const buttons = document.querySelectorAll('#new-ui-mode .ui-btn');
        buttons.forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                if (!btn.classList.contains('active')) {
                    btn.style.background = 'rgba(255, 255, 255, 0.2)';
                    btn.style.transform = 'scale(1.1)';
                }
            });

            btn.addEventListener('mouseleave', () => {
                if (!btn.classList.contains('active')) {
                    btn.style.background = 'rgba(255, 255, 255, 0.1)';
                    btn.style.transform = 'scale(1)';
                }
            });

            btn.addEventListener('mousedown', () => {
                btn.style.transform = 'scale(0.95)';
            });

            btn.addEventListener('mouseup', () => {
                btn.style.transform = 'scale(1.1)';
            });
        });
    }

    updateAutopilotState() {
        const autopilotBtn = document.getElementById('new-ui-autopilot-btn');

        if (this.simulator.carControllerMode === 'autonomous' || this.simulator.carControllerMode === 'autopark') {
            if (autopilotBtn) {
                autopilotBtn.style.background = '#3b82f6';
                autopilotBtn.style.color = 'white';
                autopilotBtn.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.6)';
                autopilotBtn.classList.add('active');
            }
        } else {
            if (autopilotBtn) {
                autopilotBtn.style.background = 'rgba(255, 255, 255, 0.1)';
                autopilotBtn.style.color = 'white';
                autopilotBtn.style.boxShadow = 'none';
                autopilotBtn.classList.remove('active');
            }
        }
    }

    startClock() {
        // Clock removed from UI but keeping method to avoid errors
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
            '#camera-controls',
            '#new-controls-box' // Added new controls box to be hidden in new UI mode
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
            '#camera-controls',
            '#new-controls-box'
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

        // Update center message
        const centerMessage = document.getElementById('new-ui-center-message');
        if (!this.fsdActive && speed < 0.1) {
            centerMessage.style.display = 'block';
        } else {
            centerMessage.style.display = 'none';
        }

        // Update stats
        document.getElementById('new-ui-distance').textContent = (data.distance || 0).toFixed(1);

        // Update gear
        const gear = data.gear || 'P';
        document.getElementById('new-ui-gear-value').textContent = gear;

        // Update autopilot indicator
        this.updateAutopilotState();
    }

    setSpeedUnit(unit) {
        this.speedUnit = unit;
        document.getElementById('new-ui-speed-unit').textContent = unit;
    }
}
