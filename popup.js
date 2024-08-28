document.addEventListener('DOMContentLoaded', () => {
    // Charger les valeurs existantes
    chrome.storage.sync.get(['haUrl', 'apiKey', 'interval', 'autoSend', 'logs', 'logCleanInterval', 'lastCleanDate'], (config) => {
        if (config.haUrl) {
            document.getElementById('ha-url').value = config.haUrl;
        }
        if (config.apiKey) {
            document.getElementById('ha-api-key').value = config.apiKey;
        }
        if (config.interval) {
            document.getElementById('interval').value = config.interval;
        }
        if (config.logCleanInterval) {
            document.getElementById('log-clean-interval').value = config.logCleanInterval;
        }
        document.getElementById('auto-send').checked = config.autoSend || false;

        // Charger les logs existants et afficher les plus récents en premier
        if (config.logs) {
            const statusElement = document.getElementById('status');
            statusElement.innerHTML = `<p>Status: <span style="color: red;">Not connected</span></p><p>Logs:</p><ul id="logs">${config.logs.reverse().map(log => `<li>${log}</li>`).join('')}</ul>`;
        }

        // Vérifier s'il est temps de nettoyer les logs
        if (config.lastCleanDate && config.logCleanInterval) {
            const lastCleanDate = new Date(config.lastCleanDate);
            const now = new Date();
            const diffDays = Math.floor((now - lastCleanDate) / (1000 * 60 * 60 * 24));
            if (diffDays >= config.logCleanInterval) {
                chrome.storage.sync.set({ logs: [], lastCleanDate: now.toISOString() }, () => {
                    const statusElement = document.getElementById('status');
                    statusElement.innerHTML = `<p>Status: <span style="color: red;">Not connected</span></p><p>Logs:</p><ul id="logs"></ul>`;
                    alert('Logs automatically cleaned!');
                });
            }
        }
    });

    // Enregistrer les paramètres
    document.getElementById('save-settings').addEventListener('click', () => {
        const haUrl = document.getElementById('ha-url').value;
        const apiKey = document.getElementById('ha-api-key').value;
        const interval = parseInt(document.getElementById('interval').value, 10);
        const logCleanInterval = parseInt(document.getElementById('log-clean-interval').value, 10);
        const autoSend = document.getElementById('auto-send').checked;

        if (haUrl && apiKey) {
            chrome.storage.sync.set({ haUrl, apiKey, interval, logCleanInterval, autoSend }, () => {
                alert('Settings saved successfully!');

                // Log message indicating settings were saved
                const logMessage = `${new Date().toLocaleString()}: Settings saved. Interval: ${interval} minutes, Auto-Send: ${autoSend ? 'Enabled' : 'Disabled'}.`;
                chrome.runtime.sendMessage({ action: 'log', status: 'Settings Saved', logs: [logMessage] });

                // Log message specifically for auto-clean logs interval change
                const logCleanMessage = `${new Date().toLocaleString()}: Auto-Clean Logs interval set to ${logCleanInterval} days.`;
                chrome.runtime.sendMessage({ action: 'log', status: 'Settings Saved', logs: [logCleanMessage] });

                // Further actions based on autoSend
                if (autoSend) {
                    chrome.runtime.sendMessage({ action: 'updateInterval', interval: interval });
                } else {
                    chrome.runtime.sendMessage({ action: 'disableAutomaticSending' });
                }
            });
        } else {
            alert('Please provide both the URL and API key.');
        }
    });

    // Tester la connexion
    document.getElementById('test-connection').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'testConnection' });
    });

    // Purger les logs maintenant
    document.getElementById('clear-logs').addEventListener('click', () => {
        chrome.storage.sync.set({ logs: [], lastCleanDate: new Date().toISOString() }, () => {
            const statusElement = document.getElementById('status');
            statusElement.innerHTML = `<p>Status: <span style="color: red;">Not connected</span></p><p>Logs:</p><ul id="logs"></ul>`;
            alert('Logs cleared successfully!');
        });
    });

    // Écouter les messages de mise à jour du statut et des logs
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'log') {
            const statusElement = document.getElementById('status');
            const statusColor = message.color || 'red';  // Par défaut, le rouge est utilisé si aucune couleur n'est spécifiée

            // Récupérer les logs existants
            chrome.storage.sync.get(['logs'], (result) => {
                let logs = result.logs || [];

                // Vérifier et ajouter les nouveaux logs sans duplication
                message.logs.forEach(newLog => {
                    if (!logs.includes(newLog)) {
                        logs.push(newLog);
                    }
                });

                // Mettre à jour l'interface immédiatement
                statusElement.innerHTML = `<p>Status: <span style="color: ${statusColor};">${message.status}</span></p><p>Logs:</p><ul id="logs">${logs.reverse().map(log => `<li>${log}</li>`).join('')}</ul>`;

                // Sauvegarder les logs mis à jour dans le stockage
                chrome.storage.sync.set({ logs });
            });
        }
    });
});
