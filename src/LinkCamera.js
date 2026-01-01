import React, { useState } from 'react';

// Dark theme styles matching dashboard design
const linkCameraStyles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#0f1014', // Dark background matching dashboard
    color: 'white',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    padding: '20px'
  },

  card: {
    backgroundColor: '#1a1d26', // Dark card background
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    borderRadius: '15px',
    boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)', // Blue glow
    textAlign: 'center',
    border: '1px solid #2a2d36',
    transition: 'all 0.3s ease'
  },

  title: {
    color: 'white',
    fontSize: '28px',
    fontWeight: '600',
    marginBottom: '10px',
    margin: 0
  },

  subtitle: {
    color: '#aaa',
    fontSize: '16px',
    marginBottom: '30px'
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },

  input: {
    width: '100%',
    padding: '15px',
    border: '1px solid #2a2d36',
    borderRadius: '8px',
    backgroundColor: '#2a2d36', // Dark input background
    color: 'white',
    fontSize: '16px',
    textAlign: 'center',
    letterSpacing: '2px',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box'
  },

  inputFocus: {
    outline: 'none',
    borderColor: '#3b82f6',
    boxShadow: '0 0 10px rgba(59, 130, 246, 0.3)',
    backgroundColor: '#1a1d26'
  },

  button: {
    background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },

  buttonHover: {
    background: 'linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)',
    transform: 'translateY(-2px)',
    boxShadow: '0 5px 15px rgba(59, 130, 246, 0.4)'
  },

  buttonDisabled: {
    background: 'linear-gradient(90deg, #6b7280 0%, #4b5563 100%)',
    cursor: 'not-allowed',
    transform: 'none',
    boxShadow: 'none'
  },

  statusMessage: {
    marginTop: '20px',
    fontSize: '14px',
    fontWeight: '600',
    minHeight: '20px',
    padding: '10px',
    borderRadius: '6px',
    transition: 'all 0.3s ease'
  },

  statusSuccess: {
    color: '#00ff00',
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    border: '1px solid rgba(0, 255, 0, 0.3)'
  },

  statusError: {
    color: '#ff4d4d',
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
    border: '1px solid rgba(255, 77, 77, 0.3)'
  },

  statusLoading: {
    color: '#00bcd4',
    backgroundColor: 'rgba(0, 188, 212, 0.1)',
    border: '1px solid rgba(0, 188, 212, 0.3)'
  }
};

const LinkCamera = () => {
  const [cameraCode, setCameraCode] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [buttonHovered, setButtonHovered] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('Linking...');

    try {
      // Backend (Node.js) ko data bhejna
      const response = await fetch('http://localhost:5000/api/add-camera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cameraCode }),
      });

      const data = await response.json();
      if (data.success) {
        setStatus('✅ Camera Linked Successfully!');
        setCameraCode(''); // Clear input on success
      } else {
        setStatus('❌ Error: ' + data.message);
      }
    } catch (error) {
      setStatus('❌ Connection Failed!');
    } finally {
      setIsLoading(false);
    }
  };

  // Determine status message style
  const getStatusStyle = () => {
    if (status.includes('✅')) return { ...linkCameraStyles.statusMessage, ...linkCameraStyles.statusSuccess };
    if (status.includes('❌')) return { ...linkCameraStyles.statusMessage, ...linkCameraStyles.statusError };
    if (status.includes('Linking')) return { ...linkCameraStyles.statusMessage, ...linkCameraStyles.statusLoading };
    return linkCameraStyles.statusMessage;
  };

  return (
    <div style={linkCameraStyles.container}>
      <div style={linkCameraStyles.card}>
        <h2 style={linkCameraStyles.title}>📱 Link New Camera</h2>
        <p style={linkCameraStyles.subtitle}>Enter the code from your old device</p>
        
        <form onSubmit={handleSubmit} style={linkCameraStyles.form}>
          <input 
            type="text" 
            placeholder="XXXX-XXXX" 
            value={cameraCode}
            onChange={(e) => setCameraCode(e.target.value.toUpperCase())}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            style={{
              ...linkCameraStyles.input,
              ...(inputFocused ? linkCameraStyles.inputFocus : {})
            }}
            disabled={isLoading}
            required 
          />
          
          <button 
            type="submit" 
            disabled={isLoading}
            onMouseEnter={() => setButtonHovered(true)}
            onMouseLeave={() => setButtonHovered(false)}
            style={{
              ...linkCameraStyles.button,
              ...(buttonHovered && !isLoading ? linkCameraStyles.buttonHover : {}),
              ...(isLoading ? linkCameraStyles.buttonDisabled : {})
            }}
          >
            {isLoading ? 'Connecting...' : 'Connect Device'}
          </button>
        </form>
        
        {status && (
          <div style={getStatusStyle()}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
};

export default LinkCamera;