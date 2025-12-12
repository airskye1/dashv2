/**
 * FSD Scenarios Panel Controller
 * Handles UI interactions for FSD failure test scenarios
 */

(function () {
    'use strict';

    let selectedScenario = null;

    // Wait for DOM to load
    document.addEventListener('DOMContentLoaded', function () {
        initFSDPanel();
    });

    function initFSDPanel() {
        const toggleBtn = document.getElementById('toggle-fsd-panel');
        const panel = document.getElementById('fsd-scenarios-panel');
        const closeBtn = document.getElementById('close-fsd-panel');
        const loadBtn = document.getElementById('load-fsd-scenario');
        const scenarioCards = document.querySelectorAll('.fsd-scenario-card');

        if (!toggleBtn || !panel) {
            console.warn('[FSD Panel] Elements not found, skipping initialization');
            return;
        }

        // Toggle panel visibility
        toggleBtn.addEventListener('click', function () {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'block';

            if (!isVisible) {
                // Trigger animation
                panel.classList.remove('scale-in');
                void panel.offsetWidth; // Force reflow
                panel.classList.add('scale-in');
            }
        });

        // Close panel
        if (closeBtn) {
            closeBtn.addEventListener('click', function () {
                panel.style.display = 'none';
            });
        }

        // Scenario card selection
        scenarioCards.forEach(card => {
            card.addEventListener('click', function () {
                // Remove previous selection
                scenarioCards.forEach(c => c.classList.remove('selected'));

                // Select this card
                card.classList.add('selected');
                selectedScenario = card.dataset.scenario;

                // Enable load button
                if (loadBtn) {
                    loadBtn.disabled = false;
                    loadBtn.classList.add('pulse');
                }

                console.log(`[FSD Panel] Selected scenario: ${selectedScenario}`);
            });

            // Add hover sound effect (optional)
            card.addEventListener('mouseenter', function () {
                card.style.transform = 'translateX(-8px) scale(1.02)';
            });

            card.addEventListener('mouseleave', function () {
                if (!card.classList.contains('selected')) {
                    card.style.transform = '';
                }
            });
        });

        // Load scenario button
        if (loadBtn) {
            loadBtn.addEventListener('click', function () {
                if (selectedScenario) {
                    loadFSDScenario(selectedScenario);
                }
            });
        }

        console.log('[FSD Panel] Initialized with', scenarioCards.length, 'scenarios');
    }

    /**
     * Load FSD scenario into simulator
     */
    function loadFSDScenario(scenarioName) {
        console.log(`[FSD Panel] Loading scenario: ${scenarioName}`);

        // Show loading state
        const loadBtn = document.getElementById('load-fsd-scenario');
        if (loadBtn) {
            const originalText = loadBtn.querySelector('span:last-child').textContent;
            loadBtn.querySelector('span:last-child').textContent = 'Loading...';
            loadBtn.disabled = true;

            // Simulate loading (replace with actual scenario loading)
            setTimeout(() => {
                loadBtn.querySelector('span:last-child').textContent = 'Loaded!';
                loadBtn.classList.remove('is-primary');
                loadBtn.classList.add('is-success');

                // Show notification
                showNotification(`FSD Scenario Loaded: ${scenarioName}`, 'success');

                // Reset after delay
                setTimeout(() => {
                    loadBtn.querySelector('span:last-child').textContent = originalText;
                    loadBtn.classList.remove('is-success');
                    loadBtn.classList.add('is-primary');
                    loadBtn.disabled = false;

                    // Close panel
                    document.getElementById('fsd-scenarios-panel').style.display = 'none';
                }, 2000);
            }, 1000);
        }

        // TODO: Integrate with actual scenario loading system
        // This would call into the main simulator to load the scenario
        // Example: window.simulator.loadScenario(scenarioName);
    }

    /**
     * Show notification toast
     */
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification is-${type} glass-panel fade-in`;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 9999;
            max-width: 400px;
            animation: slideInRight 0.3s ease-out forwards;
        `;

        notification.innerHTML = `
            <button class="delete"></button>
            <div style="display: flex; align-items: center; gap: 12px;">
                <span class="icon is-large">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'} fa-2x"></i>
                </span>
                <div>
                    <strong>FSD Test Scenario</strong>
                    <p>${message}</p>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => notification.remove(), 300);
        }, 5000);

        // Manual close
        notification.querySelector('.delete').addEventListener('click', () => {
            notification.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => notification.remove(), 300);
        });
    }

    // Expose to global scope for debugging
    window.FSDPanel = {
        loadScenario: loadFSDScenario,
        getSelectedScenario: () => selectedScenario
    };

})();

// Add fadeOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(20px);
        }
    }
`;
document.head.appendChild(style);
