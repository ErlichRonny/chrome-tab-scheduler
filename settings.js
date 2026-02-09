// Tab Scheduler - Settings Page Script

// Default settings
const DEFAULT_SETTINGS = {
  defaultPreset: 'tomorrow9am',
  theme: 'auto',
  notificationsEnabled: true,
  badgeEnabled: true,
  groupName: 'Snoozed',
  groupColor: 'blue'
};

// Initialize settings page
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupEventListeners();
  displayVersion();
});

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get('settings');
    const settings = result.settings || DEFAULT_SETTINGS;

    // Apply settings to form
    document.getElementById('defaultPreset').value = settings.defaultPreset;
    document.getElementById('themeSelect').value = settings.theme;
    document.getElementById('notificationsEnabled').checked = settings.notificationsEnabled;
    document.getElementById('badgeEnabled').checked = settings.badgeEnabled;
    document.getElementById('groupName').value = settings.groupName;
    document.getElementById('groupColor').value = settings.groupColor;

    // Apply theme
    applyTheme(settings.theme);

  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Back button
  document.getElementById('backBtn').addEventListener('click', () => {
    window.close();
  });

  // Settings changes
  document.getElementById('defaultPreset').addEventListener('change', saveSettings);
  document.getElementById('themeSelect').addEventListener('change', (e) => {
    saveSettings();
    applyTheme(e.target.value);
  });
  document.getElementById('notificationsEnabled').addEventListener('change', saveSettings);
  document.getElementById('badgeEnabled').addEventListener('change', async (e) => {
    await saveSettings();
    // Update badge immediately
    if (!e.target.checked) {
      await chrome.action.setBadgeText({ text: '' });
    } else {
      // Send message to background to update badge
      chrome.runtime.sendMessage({ action: 'updateBadge' });
    }
  });
  document.getElementById('groupName').addEventListener('input', saveSettings);
  document.getElementById('groupColor').addEventListener('change', saveSettings);

  // Danger zone
  document.getElementById('clearAllBtn').addEventListener('click', clearAllScheduledTabs);
  document.getElementById('resetSettingsBtn').addEventListener('click', resetSettings);

  // Import/Export
  document.getElementById('exportBtn').addEventListener('click', exportScheduledTabs);
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', importScheduledTabs);
}

// Save settings
async function saveSettings() {
  try {
    const settings = {
      defaultPreset: document.getElementById('defaultPreset').value,
      theme: document.getElementById('themeSelect').value,
      notificationsEnabled: document.getElementById('notificationsEnabled').checked,
      badgeEnabled: document.getElementById('badgeEnabled').checked,
      groupName: document.getElementById('groupName').value.trim() || 'Snoozed',
      groupColor: document.getElementById('groupColor').value
    };

    await chrome.storage.local.set({ settings });
    showSaveStatus('Settings saved!');
  } catch (error) {
    console.error('Error saving settings:', error);
    showSaveStatus('Error saving settings', true);
  }
}

// Apply theme
function applyTheme(theme) {
  const html = document.documentElement;

  if (theme === 'light') {
    html.setAttribute('data-theme', 'light');
  } else if (theme === 'dark') {
    html.setAttribute('data-theme', 'dark');
  } else {
    html.removeAttribute('data-theme');
  }
}

// Clear all scheduled tabs
async function clearAllScheduledTabs() {
  const confirmed = confirm(
    'Are you sure you want to clear ALL scheduled tabs? This action cannot be undone.'
  );

  if (!confirmed) return;

  try {
    // Get all scheduled tabs
    const result = await chrome.storage.local.get('scheduledTabs');
    const scheduledTabs = result.scheduledTabs || {};
    const count = Object.keys(scheduledTabs).length;

    if (count === 0) {
      showSaveStatus('No scheduled tabs to clear');
      return;
    }

    // Clear all alarms
    for (const alarmId of Object.keys(scheduledTabs)) {
      await chrome.alarms.clear(alarmId);
    }

    // Clear storage
    await chrome.storage.local.set({ scheduledTabs: {} });

    // Update badge
    await chrome.action.setBadgeText({ text: '' });

    showSaveStatus(`Cleared ${count} scheduled tab${count !== 1 ? 's' : ''}`);

  } catch (error) {
    console.error('Error clearing scheduled tabs:', error);
    showSaveStatus('Error clearing tabs', true);
  }
}

// Reset settings to defaults
async function resetSettings() {
  const confirmed = confirm(
    'Are you sure you want to reset all settings to default values?'
  );

  if (!confirmed) return;

  try {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    await loadSettings();
    showSaveStatus('Settings reset to defaults');
  } catch (error) {
    console.error('Error resetting settings:', error);
    showSaveStatus('Error resetting settings', true);
  }
}

// Show save status message
function showSaveStatus(message, isError = false) {
  const statusEl = document.getElementById('saveStatus');
  const textEl = document.getElementById('saveStatusText');

  textEl.textContent = message;
  statusEl.style.display = 'block';

  if (isError) {
    statusEl.style.backgroundColor = 'var(--danger-light)';
    statusEl.style.color = 'var(--danger-color)';
  } else {
    statusEl.style.backgroundColor = 'var(--success-bg)';
    statusEl.style.color = 'var(--success-color)';
  }

  // Hide after 3 seconds
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 3000);
}

// Display version info
function displayVersion() {
  const manifest = chrome.runtime.getManifest();
  document.getElementById('versionInfo').textContent = manifest.version;
}

// ============================================================================
// Import/Export Functions
// ============================================================================

// Export scheduled tabs to JSON file
async function exportScheduledTabs() {
  try {
    const result = await chrome.storage.local.get(['scheduledTabs', 'settings', 'customPresets']);
    
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      scheduledTabs: result.scheduledTabs || {},
      settings: result.settings || {},
      customPresets: result.customPresets || []
    };

    const count = Object.keys(exportData.scheduledTabs).length;

    if (count === 0) {
      showSaveStatus('No scheduled tabs to export');
      return;
    }

    // Create JSON blob
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `tab-scheduler-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showSaveStatus(`Exported ${count} scheduled tab${count !== 1 ? 's' : ''}`);

  } catch (error) {
    console.error('Error exporting:', error);
    showSaveStatus('Error exporting tabs', true);
  }
}

// Import scheduled tabs from JSON file
async function importScheduledTabs(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const importData = JSON.parse(text);

    // Validate structure
    if (!importData.scheduledTabs) {
      throw new Error('Invalid backup file format');
    }

    // Show confirmation
    const count = Object.keys(importData.scheduledTabs).length;
    const confirmed = confirm(
      `Import ${count} scheduled tab${count !== 1 ? 's' : ''}?\n\n` +
      `This will ADD to your existing scheduled tabs (not replace them).`
    );

    if (!confirmed) {
      event.target.value = ''; // Clear file input
      return;
    }

    // Get existing data
    const result = await chrome.storage.local.get('scheduledTabs');
    const existingTabs = result.scheduledTabs || {};

    // Merge imported tabs with existing tabs
    const mergedTabs = { ...existingTabs };
    let imported = 0;
    let skipped = 0;

    for (const [alarmId, tabData] of Object.entries(importData.scheduledTabs)) {
      // Check if alarm already exists
      if (existingTabs[alarmId]) {
        skipped++;
        continue;
      }

      // Only import future scheduled tabs
      if (tabData.scheduledTime > Date.now()) {
        mergedTabs[alarmId] = tabData;
        
        // Create alarm
        await chrome.alarms.create(alarmId, { when: tabData.scheduledTime });
        imported++;
      } else {
        skipped++;
      }
    }

    // Save merged tabs
    await chrome.storage.local.set({ scheduledTabs: mergedTabs });

    // Import settings and presets if they exist
    if (importData.settings) {
      const settingsResult = await chrome.storage.local.get('settings');
      const hasExistingSettings = settingsResult.settings && Object.keys(settingsResult.settings).length > 0;
      
      if (!hasExistingSettings) {
        await chrome.storage.local.set({ settings: importData.settings });
      }
    }

    if (importData.customPresets && importData.customPresets.length > 0) {
      const presetsResult = await chrome.storage.local.get('customPresets');
      const existingPresets = presetsResult.customPresets || [];
      
      // Merge presets, avoiding duplicates by ID
      const existingIds = new Set(existingPresets.map(p => p.id));
      const newPresets = importData.customPresets.filter(p => !existingIds.has(p.id));
      
      if (newPresets.length > 0) {
        await chrome.storage.local.set({ 
          customPresets: [...existingPresets, ...newPresets] 
        });
      }
    }

    // Update badge
    chrome.runtime.sendMessage({ action: 'updateBadge' });

    let message = `Imported ${imported} tab${imported !== 1 ? 's' : ''}`;
    if (skipped > 0) {
      message += ` (${skipped} skipped: past due or duplicate)`;
    }
    showSaveStatus(message);

    // Clear file input
    event.target.value = '';

  } catch (error) {
    console.error('Error importing:', error);
    showSaveStatus('Error importing: ' + error.message, true);
    event.target.value = '';
  }
}
