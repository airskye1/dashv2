/**
 * Modern Settings Panel
 * Redesigned with premium aesthetics, animations, and improved UX.
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
        modal.className = 'custom-modal'; // Removed 'modal' to avoid Bulma conflicts if desired, but keeping simpler structure
        modal.style.display = 'none';
        modal.innerHTML = this.getModalHTML();
        document.body.appendChild(modal);
        this.attachEventListeners();
        return modal;
    }

    getModalHTML() {
        return `
            <style>
                #settings-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.3s ease;
                }
                
                #settings-modal.is-active {
                    opacity: 1;
                    pointer-events: auto;
                }

                .settings-backdrop {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(8px);
                }

                .settings-panel {
                    position: relative;
                    width: 90%;
                    max-width: 800px;
                    max-height: 85vh;
                    background: rgba(24, 24, 27, 0.95);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 24px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    transform: scale(0.95) translateY(20px);
                    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }

                #settings-modal.is-active .settings-panel {
                    transform: scale(1) translateY(0);
                }

                .settings-header {
                    padding: 24px 32px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(255, 255, 255, 0.02);
                }

                .settings-title {
                    font-size: 24px;
                    font-weight: 600;
                    color: white;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .settings-close {
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    color: rgba(255, 255, 255, 0.7);
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }

                .settings-close:hover {
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    transform: rotate(90deg);
                }

                .settings-content {
                    padding: 32px;
                    overflow-y: auto;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 40px;
                }
                
                @media (max-width: 768px) {
                    .settings-content {
                        grid-template-columns: 1fr;
                    }
                }

                .settings-section-title {
                    font-size: 13px;
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    font-weight: 600;
                    color: #3b82f6;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .settings-section-title::after {
                    content: '';
                    flex: 1;
                    height: 1px;
                    background: rgba(59, 130, 246, 0.2);
                }

                .setting-item {
                    margin-bottom: 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .setting-info {
                    flex: 1;
                    padding-right: 20px;
                }

                .setting-name {
                    color: #e5e7eb;
                    font-weight: 500;
                    font-size: 15px;
                    margin-bottom: 4px;
                }

                .setting-desc {
                    color: #9ca3af;
                    font-size: 13px;
                    line-height: 1.4;
                }

                /* Modern Toggle Switch */
                .ui-toggle {
                    appearance: none;
                    width: 48px;
                    height: 28px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 99px;
                    position: relative;
                    cursor: pointer;
                    transition: background 0.3s ease;
                    outline: none;
                }

                .ui-toggle::after {
                    content: '';
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    width: 24px;
                    height: 24px;
                    background: white;
                    border-radius: 50%;
                    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }

                .ui-toggle:checked {
                    background: #3b82f6;
                }

                .ui-toggle:checked::after {
                    transform: translateX(20px);
                }
                
                /* Custom Select */
                .ui-select {
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: white;
                    padding: 8px 32px 8px 16px;
                    border-radius: 8px;
                    appearance: none;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 14px;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 8px center;
                    background-size: 16px;
                    min-width: 120px;
                }
                
                .ui-select:focus {
                    border-color: #3b82f6;
                    outline: none;
                }
                
                .ui-input {
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 8px;
                    width: 80px;
                    text-align: center;
                    font-family: inherit;
                    font-size: 14px;
                }
                
                .ui-input:focus {
                    border-color: #3b82f6;
                    outline: none;
                }

                .settings-footer {
                    padding: 24px 32px;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                    display: flex;
                    justify-content: flex-end;
                    background: rgba(255, 255, 255, 0.02);
                }

                .save-btn {
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 10px 24px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .save-btn:hover {
                    background: #2563eb;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
                }
                
                /* Scrollbar */
                .settings-content::-webkit-scrollbar {
                    width: 8px;
                }
                .settings-content::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.02);
                }
                .settings-content::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                }
                .settings-content::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            </style>

            <div class="settings-backdrop"></div>
            <div class="settings-panel">
                <div class="settings-header">
                    <div class="settings-title">
                        <i class="fas fa-sliders-h"></i> Settings
                    </div>
                    <button class="settings-close" id="close-settings">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="settings-content">
                    <!-- Column 1 -->
                    <div>
                        <div class="settings-section">
                            <div class="settings-section-title">Display & Interface</div>
                            
                            <div class="setting-item">
                                <div class="setting-info">
                                    <div class="setting-name">New UI Mode</div>
                                    <div class="setting-desc">Minimalist, Tesla-style interface</div>
                                </div>
                                <input type="checkbox" id="setting-new-ui" class="ui-toggle" ${this.settings.newUIMode ? 'checked' : ''}>
                            </div>

                            <div class="setting-item">
                                <div class="setting-info">
                                    <div class="setting-name">Speed Units</div>
                                </div>
                                <select id="setting-speed-unit" class="ui-select">
                                    <option value="mph" ${this.settings.speedUnit === 'mph' ? 'selected' : ''}>MPH</option>
                                    <option value="kmh" ${this.settings.speedUnit === 'kmh' ? 'selected' : ''}>KM/H</option>
                                </select>
                            </div>

                            <div class="setting-item">
                                <div class="setting-info">
                                    <div class="setting-name">Visualization</div>
                                </div>
                                <select id="setting-visualization" class="ui-select">
                                    <option value="2d" ${this.settings.visualization === '2d' ? 'selected' : ''}>2D Top-Down</option>
                                    <option value="3d" ${this.settings.visualization === '3d' ? 'selected' : ''}>3D Perspective</option>
                                </select>
                            </div>

                            <div class="setting-item">
                                <div class="setting-info">
                                    <div class="setting-name">Path Preview</div>
                                    <div class="setting-desc">Visualize planned trajectory</div>
                                </div>
                                <input type="checkbox" id="setting-path-preview" class="ui-toggle" ${this.settings.pathPreview ? 'checked' : ''}>
                            </div>
                        </div>

                        <div class="settings-section">
                            <div class="settings-section-title">Driving Behavior</div>

                            <div class="setting-item">
                                <div class="setting-info">
                                    <div class="setting-name">Speed Profile</div>
                                </div>
                                <select id="setting-speed-profile" class="ui-select">
                                    <option value="chill" ${this.settings.speedProfile === 'chill' ? 'selected' : ''}>Chill</option>
                                    <option value="standard" ${this.settings.speedProfile === 'standard' ? 'selected' : ''}>Standard</option>
                                    <option value="sport" ${this.settings.speedProfile === 'sport' ? 'selected' : ''}>Sport</option>
                                </select>
                            </div>

                            <div class="setting-item">
                                <div class="setting-info">
                                    <div class="setting-name">Autopilot Aggression</div>
                                </div>
                                <select id="setting-autopilot-aggression" class="ui-select">
                                    <option value="conservative" ${this.settings.autopilotAggression === 'conservative' ? 'selected' : ''}>Conservative</option>
                                    <option value="standard" ${this.settings.autopilotAggression === 'standard' ? 'selected' : ''}>Standard</option>
                                    <option value="aggressive" ${this.settings.autopilotAggression === 'aggressive' ? 'selected' : ''}>Aggressive</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Column 2 -->
                    <div>
                        <div class="settings-section">
                            <div class="settings-section-title">System & Camera</div>

                            <div class="setting-item">
                                <div class="setting-info">
                                    <div class="setting-name">Camera Mode</div>
                                </div>
                                <select id="setting-camera-mode" class="ui-select">
                                    <option value="follow" ${this.settings.cameraMode === 'follow' ? 'selected' : ''}>Follow Car</option>
                                    <option value="fixed" ${this.settings.cameraMode === 'fixed' ? 'selected' : ''}>Fixed</option>
                                    <option value="orbit" ${this.settings.cameraMode === 'orbit' ? 'selected' : ''}>Orbit</option>
                                </select>
                            </div>

                            <div class="setting-item">
                                <div class="setting-info">
                                    <div class="setting-name">Audio Alerts</div>
                                </div>
                                <input type="checkbox" id="setting-audio-alerts" class="ui-toggle" ${this.settings.audioAlerts ? 'checked' : ''}>
                            </div>
                        </div>

                        <div class="settings-section">
                            <div class="settings-section-title">Path Planner (Advanced)</div>
                            
                            <div class="setting-item">
                                <div class="setting-info">
                                    <div class="setting-name">Spatial Horizon</div>
                                    <div class="setting-desc">Meters</div>
                                </div>
                                <input type="number" id="setting-spatial-horizon" class="ui-input" value="${this.settings.spatialHorizon}" min="60" max="200" step="10">
                            </div>

                            <div class="setting-item">
                                <div class="setting-info">
                                    <div class="setting-name">Collision Safety</div>
                                    <div class="setting-desc">Meters</div>
                                </div>
                                <input type="number" id="setting-collision-dilation" class="ui-input" value="${this.settings.collisionDilationS}" min="2" max="10" step="0.25">
                            </div>

                            <div class="setting-item">
                                <div class="setting-info">
                                    <div class="setting-name">Hazard Distance</div>
                                    <div class="setting-desc">Meters</div>
                                </div>
                                <input type="number" id="setting-hazard-dilation" class="ui-input" value="${this.settings.hazardDilationS}" min="4" max="16" step="1">
                            </div>

                            <div class="setting-item">
                                <div class="setting-info">
                                    <div class="setting-name">Lane Preference</div>
                                    <div class="setting-desc">Meters (Lateral)</div>
                                </div>
                                <input type="number" id="setting-lane-center" class="ui-input" value="${this.settings.laneCenterLatitude}" min="0" max="3.7" step="0.1">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="settings-footer">
                    <button class="save-btn" id="save-settings">
                        <i class="fas fa-check"></i> Apply Changes
                    </button>
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
            const bg = modal.querySelector('.settings-backdrop');
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
        if (window.simulator && typeof window.simulator.applySettings === 'function') {
            window.simulator.applySettings(this.settings);
        }

        // Dispatch event
        window.dispatchEvent(new CustomEvent('settingsChanged', { detail: this.settings }));
    }

    open() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.style.display = 'flex'; // Ensure flex display
            // Force reflow
            void modal.offsetWidth;
            modal.classList.add('is-active');
        }
    }

    close() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.remove('is-active');
            setTimeout(() => {
                if (!modal.classList.contains('is-active')) {
                    modal.style.display = 'none';
                }
            }, 300); // Wait for transition
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
