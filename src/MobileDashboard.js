import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateCode } from './api';
import { SOCKET_URL } from './config';
import io from 'socket.io-client';
import VideoFallback from './VideoFallback';
import RealRecordingsPage from './RealRecordingsPage';
import SettingsPage from './SettingsPage';

// Mobile-specific styles with GUARANTEED logout visibility
const mobileStyles = {
  container: {
    display: 'flex',
    height: '100vh',
    height: '100dvh',
    width: '100vw',
    position: 'fixed',
    top: 0,
    left: 0,
    backgroundColor: '#0f1014',
    color: 'white',
    fontFamily: 'sans-serif',
    overflow: 'hidden'
  },

  sidebar: {
    width: '180px',
    backgroundColor: '#1a1d26',
    display: 'grid',
    gridTemplateRows: 'auto 1fr auto', // Header, Menu, Footer
    padding: '10px',
    borderRight: '1px solid #2a2d36',
    height: '100vh',
    height: '100dvh',
    position: 'fixed',
    left: 0,
    top: 0,
    zIndex: 100
  },

  brand: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#3b82f6',
    textAlign: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #2a2d36',
    marginBottom: '10px'
  },

  menuContainer: {
    overflowY: 'auto',
    overflowX: 'hidden'
  },

  menuList: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  },

  menuItem: {
    padding: '10px 8px',
    cursor: 'pointer',
    borderRadius: '6px',
    marginBottom: '5px',
    color: '#aaa',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    minHeight: '36px'
  },

  menuItemActive: {
    backgroundColor: '#3b82f6',
    color: 'white',
    fontWeight: 'bold'
  },

  logoutContainer: {
    padding: '10px 0',
    borderTop: '1px solid #2a2d36'
  },

  logoutBtn: {
    width: '100%',
    background: 'transparent',
    border: '1px solid #ff4d4d',
    color: '#ff4d4d',
    padding: '10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
    minHeight: '36px'
  },

  mainContent: {
    marginLeft: '180px',
    padding: '15px',
    height: '100vh',
    height: '100dvh',
    overflowY: 'auto',
    flex: 1
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px'
  },

  headerTitle: {
    fontSize: '20px',
    margin: 0
  },

  addBtn: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },

  cameraGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '15px'
  },

  noCamera: {
    textAlign: 'center',
    color: '#888',
    padding: '40px 20px',
    backgroundColor: '#1a1d26',
    borderRadius: '8px',
    fontSize: '14px'
  },

  cameraCard: {
    backgroundColor: '#1a1d26',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #2a2d36'
  },

  videoPlaceholder: {
    height: '150px',
    backgroundColor: '#000',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  videoElement: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },

  cardInfo: {
    padding: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  cardTitle: {
    margin: 0,
    fontSize: '14px'
  },

  statusLive: { color: '#00ff00', fontSize: '12px' },
  statusWaiting: { color: '#ffaa00', fontSize: '12px' },
  statusOffline: { color: '#ff4d4d', fontSize: '12px' }
};

function MobileDashboard() {
  const navigate = useNavigate();
  
  // State management
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [peerConnections, setPeerConnections] = useState({});
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [currentPairingCode, setCurrentPairingCode] = useState('');
  const [pairingStatus, setPairingStatus] = useState('waiting');
  const [isPaired, setIsPaired] = useState(false);
  const [currentView, setCurrentView] = useState('cameras'); // 'cameras' or 'recordings'
  const [streamingSessions, setStreamingSessions] = useState([]); // Track streaming sessions

  // Menu items
  const menuItems = [
    { id: 'cameras', icon: '📷', label: 'Cameras', active: currentView === 'cameras' },
    { id: 'recordings', icon: '📼', label: 'Records', active: currentView === 'recordings' },
    { id: 'settings', icon: '⚙️', label: 'Settings', active: currentView === 'settings' }
  ];

  // Initialize socket and authentication
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => console.log('Connected to server'));
    newSocket.on('room_update', handleRoomUpdate);
    newSocket.on('offer', handleOffer);
    newSocket.on('answer', handleAnswer);
    newSocket.on('ice_candidate', handleIceCandidate);

    setSocket(newSocket);
    return () => newSocket.close();
  }, [navigate]);

  // Event handlers (simplified for mobile)
  const handleRoomUpdate = (data) => {
    if (!data.room_code) return;
    
    setCameras(prevCameras => 
      prevCameras.map(camera => {
        if (camera.code === data.room_code) {
          const newStatus = data.total_clients >= 2 ? "Live" : "Waiting";
          return { ...camera, status: newStatus };
        }
        return camera;
      })
    );
  };

  const handleOffer = async (data) => {
    // WebRTC handling (same as desktop)
    console.log('Mobile: Received offer', data);
  };

  const handleAnswer = async (data) => {
    console.log('Mobile: Received answer', data);
  };

  const handleIceCandidate = async (data) => {
    console.log('Mobile: Received ICE candidate', data);
  };

  const handleAddCamera = async () => {
    setLoading(true);
    const result = await generateCode();
    
    if (result.success) {
      setCurrentPairingCode(result.code);
      setShowPairingModal(true);
      
      if (socket) {
        socket.emit('join_room', {
          code: result.code,
          type: 'viewer'
        });
      }
    }
    
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    if (socket) socket.close();
    navigate('/login');
  };

  const handleMenuClick = (menuId) => {
    setCurrentView(menuId);
    console.log('Mobile menu clicked:', menuId);
  };

  const getStatusStyle = (status) => {
    switch(status.toLowerCase()) {
      case 'live': return mobileStyles.statusLive;
      case 'waiting': return mobileStyles.statusWaiting;
      default: return mobileStyles.statusOffline;
    }
  };

  return (
    <div style={mobileStyles.container}>
      {/* Mobile Sidebar with Grid Layout */}
      <div style={mobileStyles.sidebar}>
        {/* Header */}
        <div style={mobileStyles.brand}>
          ⭕ WebWatch
        </div>
        
        {/* Menu - Scrollable Middle Section */}
        <div style={mobileStyles.menuContainer}>
          <ul style={mobileStyles.menuList}>
            {menuItems.map((item) => (
              <li
                key={item.id}
                style={{
                  ...mobileStyles.menuItem,
                  ...(item.active ? mobileStyles.menuItemActive : {})
                }}
                onClick={() => handleMenuClick(item.id)}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Footer - GUARANTEED Logout Button */}
        <div style={mobileStyles.logoutContainer}>
          <button 
            style={mobileStyles.logoutBtn}
            onClick={handleLogout}
            onTouchStart={(e) => {
              e.target.style.backgroundColor = '#ff4d4d';
              e.target.style.color = 'white';
            }}
            onTouchEnd={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#ff4d4d';
            }}
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={mobileStyles.mainContent}>
        {currentView === 'cameras' && (
          <>
            <div style={mobileStyles.header}>
              <h2 style={mobileStyles.headerTitle}>My Cameras</h2>
              <button 
                style={mobileStyles.addBtn}
                onClick={handleAddCamera}
                disabled={loading}
              >
                {loading ? 'Loading...' : '+ Add'}
              </button>
            </div>

            {/* Camera Grid */}
            <div style={mobileStyles.cameraGrid}>
              {cameras.length === 0 ? (
                <div style={mobileStyles.noCamera}>
                  <p>No cameras found. Click + Add to create one!</p>
                </div>
              ) : (
                cameras.map((cam) => (
                  <div key={cam.id} style={mobileStyles.cameraCard}>
                    <div style={mobileStyles.videoPlaceholder}>
                      <video
                        id={`video-${cam.code}`}
                        autoPlay
                        playsInline
                        muted
                        style={mobileStyles.videoElement}
                      />
                      {cam.status !== "Live" && (
                        <div style={{
                          position: 'absolute',
                          color: '#888',
                          textAlign: 'center',
                          fontSize: '12px'
                        }}>
                          📹 {cam.name}<br />
                          Status: {cam.status}
                        </div>
                      )}
                    </div>
                    
                    <div style={mobileStyles.cardInfo}>
                      <h3 style={mobileStyles.cardTitle}>{cam.name}</h3>
                      <span style={getStatusStyle(cam.status)}>
                        ● {cam.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {currentView === 'recordings' && (
          <RealRecordingsPage isMobile={true} activeCameras={cameras} streamingSessions={streamingSessions} />
        )}

        {currentView === 'settings' && (
          <SettingsPage isMobile={true} />
        )}
      </div>

      {/* Pairing Modal (simplified for mobile) */}
      {showPairingModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#2c3e50',
            borderRadius: '15px',
            padding: '30px',
            width: '100%',
            maxWidth: '350px',
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#fff', marginBottom: '20px', fontSize: '20px' }}>
              Link Device
            </h2>

            <div style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#00bcd4',
              marginBottom: '15px',
              letterSpacing: '4px',
              fontFamily: 'monospace'
            }}>
              {currentPairingCode}
            </div>

            <p style={{ color: '#bbb', marginBottom: '20px', fontSize: '14px' }}>
              Enter this code on your old phone
            </p>

            <button
              onClick={() => {
                navigator.clipboard.writeText(currentPairingCode);
                setShowPairingModal(false);
                alert('Code copied!');
              }}
              style={{
                background: '#00bcd4',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
                marginRight: '10px'
              }}
            >
              Copy Code
            </button>

            <button
              onClick={() => setShowPairingModal(false)}
              style={{
                background: 'transparent',
                color: '#fff',
                border: '1px solid #fff',
                padding: '10px 20px',
                borderRadius: '20px',
                fontSize: '12px'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MobileDashboard;