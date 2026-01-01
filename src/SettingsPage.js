import React, { useState, useEffect } from 'react';

// Dark theme styles matching dashboard design
const settingsStyles = {
  container: {
    padding: '20px',
    backgroundColor: '#0f1014',
    minHeight: '100vh',
    color: 'white',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },

  header: {
    marginBottom: '30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  title: {
    fontSize: '28px',
    fontWeight: '600',
    color: 'white',
    margin: 0
  },

  settingsGrid: {
    display: 'grid',
    gap: '20px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    maxWidth: '1200px'
  },

  settingsCard: {
    backgroundColor: '#1a1d26',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #2a2d36',
    transition: 'all 0.3s ease'
  },

  settingsCardHover: {
    transform: 'translateY(-2px)',
    borderColor: '#3b82f6',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
  },

  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'white',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  cardDescription: {
    fontSize: '14px',
    color: '#aaa',
    marginBottom: '20px',
    lineHeight: '1.5'
  },

  settingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #2a2d36'
  },

  settingItemLast: {
    borderBottom: 'none'
  },

  settingLabel: {
    fontSize: '14px',
    color: '#bbb',
    fontWeight: '500'
  },

  settingValue: {
    fontSize: '14px',
    color: 'white',
    fontFamily: 'monospace'
  },

  toggle: {
    position: 'relative',
    width: '50px',
    height: '24px',
    backgroundColor: '#2a2d36',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },

  toggleHover: {
    backgroundColor: '#3a3d46'
  },

  toggleActive: {
    backgroundColor: '#3b82f6'
  },

  toggleSlider: {
    position: 'absolute',
    top: '2px',
    left: '2px',
    width: '20px',
    height: '20px',
    backgroundColor: 'white',
    borderRadius: '50%',
    transition: 'all 0.3s ease'
  },

  toggleSliderActive: {
    transform: 'translateX(26px)'
  },

  input: {
    backgroundColor: '#2a2d36',
    border: '1px solid #2a2d36',
    borderRadius: '6px',
    padding: '8px 12px',
    color: 'white',
    fontSize: '14px',
    width: '120px',
    transition: 'all 0.3s ease'
  },

  inputFocus: {
    borderColor: '#3b82f6',
    boxShadow: '0 0 5px rgba(59, 130, 246, 0.3)'
  },

  button: {
    background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },

  buttonSecondary: {
    background: 'transparent',
    border: '1px solid #2a2d36',
    color: '#bbb'
  },

  buttonDanger: {
    background: 'linear-gradient(90deg, #ff4d4d 0%, #cc3333 100%)'
  },

  infoBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '8px',
    padding: '15px',
    marginTop: '20px'
  },

  infoTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: '8px'
  },

  infoText: {
    fontSize: '13px',
    color: '#aaa',
    lineHeight: '1.4'
  },

  // Mobile responsive
  mobileContainer: {
    padding: '15px'
  },

  mobileGrid: {
    gridTemplateColumns: '1fr',
    gap: '15px'
  }
};

function SettingsPage({ isMobile = false }) {
  const [settings, setSettings] = useState({
    notifications: true,
    autoRecord: false,
    videoQuality: 'HD',
    streamDelay: '1',
    darkMode: true,
    autoConnect: true,
    soundAlerts: false,
    recordingDuration: '30'
  });

  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredToggle, setHoveredToggle] = useState(null);

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('webwatch_settings');
    if (savedSettings) {
      setSettings({ ...settings, ...JSON.parse(savedSettings) });
    }
  }, []);

  // Save settings to localStorage whenever settings change
  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('webwatch_settings', JSON.stringify(newSettings));
  };

  const handleToggle = (key) => {
    updateSetting(key, !settings[key]);
  };

  const handleInputChange = (key, value) => {
    updateSetting(key, value);
  };

  const resetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      const defaultSettings = {
        notifications: true,
        autoRecord: false,
        videoQuality: 'HD',
        streamDelay: '1',
        darkMode: true,
        autoConnect: true,
        soundAlerts: false,
        recordingDuration: '30'
      };
      setSettings(defaultSettings);
      localStorage.setItem('webwatch_settings', JSON.stringify(defaultSettings));
    }
  };

  const clearData = () => {
    if (window.confirm('This will clear all app data including camera connections. Continue?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const containerStyle = isMobile ? 
    { ...settingsStyles.container, ...settingsStyles.mobileContainer } : 
    settingsStyles.container;

  const gridStyle = isMobile ? 
    { ...settingsStyles.settingsGrid, ...settingsStyles.mobileGrid } : 
    settingsStyles.settingsGrid;

  return (
    <div style={containerStyle}>
      <div style={settingsStyles.header}>
        <h1 style={settingsStyles.title}>⚙️ Settings</h1>
      </div>

      <div style={gridStyle}>
        {/* Camera Settings */}
        <div 
          style={{
            ...settingsStyles.settingsCard,
            ...(hoveredCard === 'camera' ? settingsStyles.settingsCardHover : {})
          }}
          onMouseEnter={() => setHoveredCard('camera')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <h3 style={settingsStyles.cardTitle}>📷 Camera Settings</h3>
          <p style={settingsStyles.cardDescription}>
            Configure camera streaming and recording preferences
          </p>

          <div style={settingsStyles.settingItem}>
            <span style={settingsStyles.settingLabel}>Auto-connect cameras</span>
            <div 
              style={{
                ...settingsStyles.toggle,
                ...(settings.autoConnect ? settingsStyles.toggleActive : {}),
                ...(hoveredToggle === 'autoConnect' ? settingsStyles.toggleHover : {})
              }}
              onClick={() => handleToggle('autoConnect')}
              onMouseEnter={() => setHoveredToggle('autoConnect')}
              onMouseLeave={() => setHoveredToggle(null)}
            >
              <div style={{
                ...settingsStyles.toggleSlider,
                ...(settings.autoConnect ? settingsStyles.toggleSliderActive : {})
              }}></div>
            </div>
          </div>

          <div style={settingsStyles.settingItem}>
            <span style={settingsStyles.settingLabel}>Video Quality</span>
            <select 
              value={settings.videoQuality}
              onChange={(e) => handleInputChange('videoQuality', e.target.value)}
              style={settingsStyles.input}
            >
              <option value="SD">SD (480p)</option>
              <option value="HD">HD (720p)</option>
              <option value="FHD">FHD (1080p)</option>
            </select>
          </div>

          <div style={{...settingsStyles.settingItem, ...settingsStyles.settingItemLast}}>
            <span style={settingsStyles.settingLabel}>Stream Delay (seconds)</span>
            <input 
              type="number"
              min="0"
              max="10"
              value={settings.streamDelay}
              onChange={(e) => handleInputChange('streamDelay', e.target.value)}
              style={settingsStyles.input}
            />
          </div>
        </div>

        {/* Recording Settings */}
        <div 
          style={{
            ...settingsStyles.settingsCard,
            ...(hoveredCard === 'recording' ? settingsStyles.settingsCardHover : {})
          }}
          onMouseEnter={() => setHoveredCard('recording')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <h3 style={settingsStyles.cardTitle}>📼 Recording Settings</h3>
          <p style={settingsStyles.cardDescription}>
            Manage automatic recording and storage options
          </p>

          <div style={settingsStyles.settingItem}>
            <span style={settingsStyles.settingLabel}>Auto-record sessions</span>
            <div 
              style={{
                ...settingsStyles.toggle,
                ...(settings.autoRecord ? settingsStyles.toggleActive : {}),
                ...(hoveredToggle === 'autoRecord' ? settingsStyles.toggleHover : {})
              }}
              onClick={() => handleToggle('autoRecord')}
              onMouseEnter={() => setHoveredToggle('autoRecord')}
              onMouseLeave={() => setHoveredToggle(null)}
            >
              <div style={{
                ...settingsStyles.toggleSlider,
                ...(settings.autoRecord ? settingsStyles.toggleSliderActive : {})
              }}></div>
            </div>
          </div>

          <div style={{...settingsStyles.settingItem, ...settingsStyles.settingItemLast}}>
            <span style={settingsStyles.settingLabel}>Max recording (minutes)</span>
            <input 
              type="number"
              min="5"
              max="120"
              value={settings.recordingDuration}
              onChange={(e) => handleInputChange('recordingDuration', e.target.value)}
              style={settingsStyles.input}
            />
          </div>
        </div>

        {/* Notification Settings */}
        <div 
          style={{
            ...settingsStyles.settingsCard,
            ...(hoveredCard === 'notifications' ? settingsStyles.settingsCardHover : {})
          }}
          onMouseEnter={() => setHoveredCard('notifications')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <h3 style={settingsStyles.cardTitle}>🔔 Notifications</h3>
          <p style={settingsStyles.cardDescription}>
            Control alerts and notification preferences
          </p>

          <div style={settingsStyles.settingItem}>
            <span style={settingsStyles.settingLabel}>Push notifications</span>
            <div 
              style={{
                ...settingsStyles.toggle,
                ...(settings.notifications ? settingsStyles.toggleActive : {}),
                ...(hoveredToggle === 'notifications' ? settingsStyles.toggleHover : {})
              }}
              onClick={() => handleToggle('notifications')}
              onMouseEnter={() => setHoveredToggle('notifications')}
              onMouseLeave={() => setHoveredToggle(null)}
            >
              <div style={{
                ...settingsStyles.toggleSlider,
                ...(settings.notifications ? settingsStyles.toggleSliderActive : {})
              }}></div>
            </div>
          </div>

          <div style={{...settingsStyles.settingItem, ...settingsStyles.settingItemLast}}>
            <span style={settingsStyles.settingLabel}>Sound alerts</span>
            <div 
              style={{
                ...settingsStyles.toggle,
                ...(settings.soundAlerts ? settingsStyles.toggleActive : {}),
                ...(hoveredToggle === 'soundAlerts' ? settingsStyles.toggleHover : {})
              }}
              onClick={() => handleToggle('soundAlerts')}
              onMouseEnter={() => setHoveredToggle('soundAlerts')}
              onMouseLeave={() => setHoveredToggle(null)}
            >
              <div style={{
                ...settingsStyles.toggleSlider,
                ...(settings.soundAlerts ? settingsStyles.toggleSliderActive : {})
              }}></div>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div 
          style={{
            ...settingsStyles.settingsCard,
            ...(hoveredCard === 'system' ? settingsStyles.settingsCardHover : {})
          }}
          onMouseEnter={() => setHoveredCard('system')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <h3 style={settingsStyles.cardTitle}>🖥️ System</h3>
          <p style={settingsStyles.cardDescription}>
            Application and data management options
          </p>

          <div style={settingsStyles.settingItem}>
            <span style={settingsStyles.settingLabel}>Theme</span>
            <span style={settingsStyles.settingValue}>Dark Mode</span>
          </div>

          <div style={settingsStyles.settingItem}>
            <span style={settingsStyles.settingLabel}>Reset Settings</span>
            <button 
              style={{...settingsStyles.button, ...settingsStyles.buttonSecondary}}
              onClick={resetSettings}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#3b82f6';
                e.target.style.color = 'white';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#bbb';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Reset
            </button>
          </div>

          <div style={{...settingsStyles.settingItem, ...settingsStyles.settingItemLast}}>
            <span style={settingsStyles.settingLabel}>Clear All Data</span>
            <button 
              style={{...settingsStyles.button, ...settingsStyles.buttonDanger}}
              onClick={clearData}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#c82333';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#ff4d4d';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div style={settingsStyles.infoBox}>
        <div style={settingsStyles.infoTitle}>💡 Settings Information</div>
        <div style={settingsStyles.infoText}>
          Settings are automatically saved to your browser's local storage. 
          Changes take effect immediately and persist across sessions.
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;