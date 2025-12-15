/**
 * Modern Settings Panel
 * Redesigned with better organization and toggle switches
 */

export default class SettingsPanel {
    constructor() {
        this.settings = this.loadSettings();
        this.init();
    }

    loadSettings() {
        const defaults = {
            newUIMode: false,
            speedUnit: 'mph',
            speedProfile: 'standard',
            audioAlerts: true,
            pathPreview: true,
            visualization: '3d',
            cameraMode: 'follow',
            autopilotAggression: 'standard',
            // Path Planner settings
            spatialHorizon: 120,
            collisionDilationS: 4.25,
            hazardDilationS: 8,
            laneCenterLatitude: 1.85,
            hardAccelerationPenalty: 70,
            hardDecelerationPenalty: 50
        };

        const saved = localStorage.getItem('dashSettings');
        return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    }

    saveSettings() {
        localStorage.setItem('dashSettings', JSON.stringify(this.settings));
        this.applySettings();
    }

    init() {
        // Find or create settings modal
        let modal = document.getElementById('settings-modal');
        if (!modal) {
            modal = this.createModal();
        } else {
            this.updateModalContent(modal);
        }
    }

    createModal() {
        const modal = document.createElement('div');
        modal.id = 'settings-modal';
        modal.className = 'modal';
        modal.innerHTML = this.getModalHTML();
        document.body.appendChild(modal);
        this.attachEventListeners();



        return modal;
    }

    getModalHTML() {
        return `
            <div class="modal-background"></div>
            <div class="modal-content" style="max-width: 700px;">
                <div class="box glass-panel" style="padding: 32px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
                        <h2 class="title is-4 has-text-white" style="margin: 0;">
                            <i class="fas fa-cog"></i> Settings
                        </h2>
                        <button class="delete is-large" id="close-settings"></button>
                    </div>

                    <!-- Display Settings -->
                    <div class="settings-section">
                        <h3 class="subtitle is-6 has-text-white-ter" style="margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px; font-size: 12px; opacity: 0.7;">
                            Display
                        </h3>
                        
                        <div class="setting-item">
                            <div class="setting-label">
                                <div class="has-text-white" style="font-weight: 600;">New UI Mode</div>
                                <div class="has-text-grey-light" style="font-size: 13px;">Tesla-style minimalist interface</div>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="setting-new-ui" ${this.settings.newUIMode ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        <div class="setting-item">
                            <div class="setting-label">
                                <div class="has-text-white" style="font-weight: 600;">Speed Units</div>
                                <div class="has-text-grey-light" style="font-size: 13px;">Display speed in MPH or KM/H</div>
                            </div>
                            <div class="select is-dark">
                                <select id="setting-speed-unit">
                                    <option value="mph" ${this.settings.speedUnit === 'mph' ? 'selected' : ''}>MPH</option>
                                    <option value="kmh" ${this.settings.speedUnit === 'kmh' ? 'selected' : ''}>KM/H</option>
                                </select>
                            </div>
                        </div>

                        <div class="setting-item">
                            <div class="setting-label">
                                <div class="has-text-white" style="font-weight: 600;">Visualization</div>
                                <div class="has-text-grey-light" style="font-size: 13px;">2D top-down or 3D perspective</div>
                            </div>
                            <div class="select is-dark">
                                <select id="setting-visualization">
                                    <option value="2d" ${this.settings.visualization === '2d' ? 'selected' : ''}>2D Top-Down</option>
                                    <option value="3d" ${this.settings.visualization === '3d' ? 'selected' : ''}>3D Perspective</option>
                                </select>
                            </div>
                        </div>

                        <div class="setting-item">
                            <div class="setting-label">
                                <div class="has-text-white" style="font-weight: 600;">Path Preview</div>
                                <div class="has-text-grey-light" style="font-size: 13px;">Show planned path visualization</div>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="setting-path-preview" ${this.settings.pathPreview ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <!-- Driving Settings -->
                    <div class="settings-section">
                        <h3 class="subtitle is-6 has-text-white-ter" style="margin-bottom: 16px; margin-top: 32px; text-transform: uppercase; letter-spacing: 1px; font-size: 12px; opacity: 0.7;">
                            Driving
                        </h3>

                        <div class="setting-item">
                            <div class="setting-label">
                                <div class="has-text-white" style="font-weight: 600;">Speed Profile</div>
                                <div class="has-text-grey-light" style="font-size: 13px;">Driving style and speed preference</div>
                            </div>
                            <div class="select is-dark">
                                <select id="setting-speed-profile">
                                    <option value="chill" ${this.settings.speedProfile === 'chill' ? 'selected' : ''}>Chill</option>
                                    <option value="standard" ${this.settings.speedProfile === 'standard' ? 'selected' : ''}>Standard</option>
                                    <option value="sport" ${this.settings.speedProfile === 'sport' ? 'selected' : ''}>Sport</option>
                                </select>
                            </div>
                        </div>

                        <div class="setting-item">
                            <div class="setting-label">
                                <div class="has-text-white" style="font-weight: 600;">Camera Mode</div>
                                <div class="has-text-grey-light" style="font-size: 13px;">Camera follow behavior</div>
                            </div>
                            <div class="select is-dark">
                                <select id="setting-camera-mode">
                                    <option value="follow" ${this.settings.cameraMode === 'follow' ? 'selected' : ''}>Follow Car</option>
                                    <option value="fixed" ${this.settings.cameraMode === 'fixed' ? 'selected' : ''}>Fixed Position</option>
                                    <option value="orbit" ${this.settings.cameraMode === 'orbit' ? 'selected' : ''}>Orbit</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Autopilot Settings -->
                    <div class="settings-section">
                        <h3 class="subtitle is-6 has-text-white-ter" style="margin-bottom: 16px; margin-top: 32px; text-transform: uppercase; letter-spacing: 1px; font-size: 12px; opacity: 0.7;">
                            Autopilot
                        </h3>

                        <div class="setting-item">
                            <div class="setting-label">
                                <div class="has-text-white" style="font-weight: 600;">Autopilot Aggression</div>
                                <div class="has-text-grey-light" style="font-size: 13px;">How assertive the autopilot drives</div>
                            </div>
                            <div class="select is-dark">
                                <select id="setting-autopilot-aggression">
                                    <option value="conservative" ${this.settings.autopilotAggression === 'conservative' ? 'selected' : ''}>Conservative</option>
                                    <option value="standard" ${this.settings.autopilotAggression === 'standard' ? 'selected' : ''}>Standard</option>
                                    <option value="aggressive" ${this.settings.autopilotAggression === 'aggressive' ? 'selected' : ''}>Aggressive</option>
                                </select>
                            </div>
                        </div>

                        <div class="setting-item">
                            <div class="setting-label">
                                <div class="has-text-white" style="font-weight: 600;">Audio Alerts</div>
                                <div class="has-text-grey-light" style="font-size: 13px;">Sound notifications for events</div>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="setting-audio-alerts" ${this.settings.audioAlerts ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <!-- Path Planner Settings -->
                    <div class="settings-section">
                        <h3 class="subtitle is-6 has-text-white-ter" style="margin-bottom: 16px; margin-top: 32px; text-transform: uppercase; letter-spacing: 1px; font-size: 12px; opacity: 0.7;">
                            Path Planner (Advanced)
                        </h3>

                        <div class="setting-item">
                            <div class="setting-label">
                                <div class="has-text-white" style="font-weight: 600;">Spatial Horizon</div>
                                <div class="has-text-grey-light" style="font-size: 13px;">Planning distance ahead (meters)</div>
                            </div>
                            <div class="control">
                                <input type="number" id="setting-spatial-horizon" class="input is-dark is-small" style="width: 80px;" value="${this.settings.spatialHorizon}" min="60" max="200" step="10">
                            </div>
                        </div>

                        <div class="setting-item">
                            <div class="setting-label">
                                <div class="has-text-white" style="font-weight: 600;">Collision Safety</div>
                                <div class="has-text-grey-light" style="font-size: 13px;">Forward safety margin (meters)</div>
                            </div>
                            <div class="control">
                                <input type="number" id="setting-collision-dilation" class="input is-dark is-small" style="width: 80px;" value="${this.settings.collisionDilationS}" min="2" max="10" step="0.25">
                            </div>
                        </div>

                        <div class="setting-item">
                            <div class="setting-label">
                                <div class="has-text-white" style="font-weight: 600;">Hazard Distance</div>
                                <div class="has-text-grey-light" style="font-size: 13px;">Hazard detection range (meters)</div>
                            </div>
                            <div class="control">
                                <input type="number" id="setting-hazard-dilation" class="input is-dark is-small" style="width: 80px;" value="${this.settings.hazardDilationS}" min="4" max="16" step="1">
                            </div>
                        </div>

                        <div class="setting-item">
                            <div class="setting-label">
                                <div class="has-text-white" style="font-weight: 600;">Lane Center Preference</div>
                                <div class="has-text-grey-light" style="font-size: 13px;">Preferred lateral position (meters)</div>
                            </div>
                            <div class="control">
                                <input type="number" id="setting-lane-center" class="input is-dark is-small" style="width: 80px;" value="${this.settings.laneCenterLatitude}" min="0" max="3.7" step="0.1">
                            </div>
                        </div>

                        <div class="setting-item">
                            <div class="setting-label">
                                <div class="has-text-white" style="font-weight: 600;">Acceleration Penalty</div>
                                <div class="has-text-grey-light" style="font-size: 13px;">Hard acceleration cost</div>
                            </div>
                            <div class="control">
                                <input type="number" id="setting-accel-penalty" class="input is-dark is-small" style="width: 80px;" value="${this.settings.hardAccelerationPenalty}" min="0" max="200" step="10">
                            </div>
                        </div>

                        <div class="setting-item">
                            <div class="setting-label">
                                <div class="has-text-white" style="font-weight: 600;">Deceleration Penalty</div>
                                <div class="has-text-grey-light" style="font-size: 13px;">Hard braking cost</div>
                            </div>
                            <div class="control">
                                <input type="number" id="setting-decel-penalty" class="input is-dark is-small" style="width: 80px;" value="${this.settings.hardDecelerationPenalty}" min="0" max="200" step="10">
                            </div>
                        </div>
                    </div>

                    <!-- Save Button -->
                    <div style="margin-top: 32px; text-align: right;">
                        <button class="button is-primary is-medium btn-modern" id="save-settings">
                            <span class="icon"><i class="fas fa-check"></i></span>
                            <span>Save Settings</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Close button
        const closeBtn = document.getElementById('close-settings');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Save button
        const saveBtn = document.getElementById('save-settings');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.collectSettings();
                this.saveSettings();
                if (window.Toast && window.Toast.success) window.Toast.success('Settings saved successfully!');
                this.close();
            });
        }

        // Background click to close
        const modal = document.getElementById('settings-modal');
        if (modal) {
            const bg = modal.querySelector('.modal-background');
            if (bg) {
                bg.addEventListener('click', () => this.close());
            }
        }
    }

    collectSettings() {
        var el;
        el = document.getElementById('setting-new-ui');
        this.settings.newUIMode = el ? el.checked : false;

        el = document.getElementById('setting-speed-unit');
        this.settings.speedUnit = el ? el.value : 'mph';

        el = document.getElementById('setting-visualization');
        this.settings.visualization = el ? el.value : '3d';

        el = document.getElementById('setting-path-preview');
        this.settings.pathPreview = el ? el.checked : false;

        el = document.getElementById('setting-speed-profile');
        this.settings.speedProfile = el ? el.value : 'standard';

        el = document.getElementById('setting-camera-mode');
        this.settings.cameraMode = el ? el.value : 'follow';

        el = document.getElementById('setting-autopilot-aggression');
        this.settings.autopilotAggression = el ? el.value : 'standard';

        el = document.getElementById('setting-audio-alerts');
        this.settings.audioAlerts = el ? el.checked : false;

        // Path Planner settings
        el = document.getElementById('setting-spatial-horizon');
        this.settings.spatialHorizon = el ? parseFloat(el.value) : 120;

        el = document.getElementById('setting-collision-dilation');
        this.settings.collisionDilationS = el ? parseFloat(el.value) : 4.25;

        el = document.getElementById('setting-hazard-dilation');
        this.settings.hazardDilationS = el ? parseFloat(el.value) : 8;

        el = document.getElementById('setting-lane-center');
        this.settings.laneCenterLatitude = el ? parseFloat(el.value) : 1.85;

        el = document.getElementById('setting-accel-penalty');
        this.settings.hardAccelerationPenalty = el ? parseFloat(el.value) : 70;

        el = document.getElementById('setting-decel-penalty');
        this.settings.hardDecelerationPenalty = el ? parseFloat(el.value) : 50;
    }

    applySettings() {
        // Apply new UI mode
        if (window.newUIMode) {
            if (this.settings.newUIMode) {
                window.newUIMode.enable();
            } else {
                window.newUIMode.disable();
            }
        }

        // Apply speed unit
        if (window.SpeedConverter) {
            window.SpeedConverter.setUnit(this.settings.speedUnit);
        }

        // Apply other settings
        if (window.simulator) {
            window.simulator.applySettings(this.settings);
        }

        // Dispatch event
        window.dispatchEvent(new CustomEvent('settingsChanged', { detail: this.settings }));
    }

    open() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.add('is-active');
        }
    }

    close() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.remove('is-active');
        }
    }

    getSetting(key) {
        return this.settings[key];
    }

    setSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
    }
}

// Global instance
window.SettingsPanel = new SettingsPanel();
