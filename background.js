function updateLogs(newLog) {
    chrome.storage.sync.get(['logs'], (result) => {
        let logs = result.logs || [];
        logs.push(newLog);
        chrome.storage.sync.set({ logs });
    });
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get(['interval', 'autoSend'], (config) => {
        if (config.autoSend) {
            chrome.alarms.create('scrapeAndSend', { periodInMinutes: config.interval || 60 });
            const log = `${new Date().toLocaleString()}: Alarm created with interval of ${config.interval || 60} minutes. Automatic sending enabled.`;
            updateLogs(log);
            triggerScraping();  // Déclenchement immédiat après l'installation
        }
    });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'scrapeAndSend') {
        triggerScraping();
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Message received:', message);
    if (message.action === 'log') {
        const log = message.logs[0];
        console.log('Logging:', log);
        updateLogs(log);

        // Si le statut concerne une mise à jour des paramètres, envoyez un statut vert
        const statusColor = (message.status === 'Settings Saved' || message.status === 'Auto-Clean Logs Updated' || message.status === 'Transmission Successful') ? 'green' : 'red';
        chrome.runtime.sendMessage({ action: 'log', status: message.status, logs: [log], color: statusColor });
    }

    if (message.action === 'updateInterval') {
        chrome.alarms.clear('scrapeAndSend', () => {
            chrome.alarms.create('scrapeAndSend', { periodInMinutes: message.interval });
            const log = `${new Date().toLocaleString()}: Interval updated to ${message.interval} minutes. Automatic sending enabled.`;
            updateLogs(log);
            triggerScraping();  // Déclenchement immédiat après mise à jour de l'intervalle
        });
    }

    if (message.action === 'disableAutomaticSending') {
        chrome.alarms.clear('scrapeAndSend', () => {
            const log = `${new Date().toLocaleString()}: Automatic sending disabled.`;
            updateLogs(log);
        });
    }

    if (message.action === 'testConnection') {
        chrome.storage.sync.get(['haUrl', 'apiKey'], (config) => {
            if (config.haUrl && config.apiKey) {
                testConnection(config.haUrl, config.apiKey);
            } else {
                const log = `${new Date().toLocaleString()}: Home Assistant URL or API key is missing.`;
                updateLogs(log);
                chrome.runtime.sendMessage({ action: 'log', status: 'Connection Failed', logs: [log], color: 'red' });
            }
        });
    }
});

function triggerScraping() {
    chrome.tabs.query({ title: "Station Dashboard" }, (tabs) => {
        if (tabs.length > 0) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['content.js']
            });
            const log = `${new Date().toLocaleString()}: Immediate scraping triggered.`;
            updateLogs(log);
        } else {
            console.error('No tabs found with title "Station Dashboard"');
        }
    });
}

function testConnection(haUrl, apiKey) {
    fetch(`${haUrl}/api/config`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        const log = `${new Date().toLocaleString()}: Connection test successful.`;
        updateLogs(log);
        chrome.runtime.sendMessage({ action: 'log', status: 'Connected', logs: [log], color: 'green' });
    })
    .catch(error => {
        const log = `${new Date().toLocaleString()}: Connection test failed - ${error.message}`;
        updateLogs(log);
        chrome.runtime.sendMessage({ action: 'log', status: 'Connection Failed', logs: [log], color: 'red' });
    });
}
