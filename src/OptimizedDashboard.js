import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateCode } from './api';
import { SOCKET_URL } from './config';
import io from 'socket.io-client';
import VideoFallback from './VideoFallback';
import MobileDashboard from './MobileDashboard';
import RealRecordingsPage from './RealRecordingsPage';
import SettingsPage from './SettingsPage';

// Check if device is mobile
const isMobileDevice = () => {
  return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Inline styles for full height sidebar and clean layout
const styles = {
  // Main container - full viewport height with mobile fix
  dashboardContainer: {
    display: 'flex',
    height: '100vh',
    height: '100dvh', // Dynamic viewport height for mobile
    width: '100vw',
    margin: 0,
    padding: 0,
    backgroundColor: '#0f1014',
    color: 'white',
    fontFamily: 'sans-serif',
    overflow: 'hidden',
    position: 'fixed',
    top: 0,
    left: 0
  },

  // Sidebar - GUARANTEED full height with forced positioning
  sidebar: {
    width: '250px',
    minWidth: '250px',
    height: '100vh',
    height: '100dvh', // Dynamic viewport height
    maxHeight: '100vh',
    maxHeight: '100dvh',
    backgroundColor: '#1a1d26',
    display: 'flex',
    flexDirection: 'column',
    padding: '15px',
    boxSizing: 'border-box',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0, // Force bottom positioning
    zIndex: 100,
    borderRight: '1px solid #2a2d36',
    overflowY: 'auto',
    overflowX: 'hidden'
  },

  // Brand logo - compact for mobile
  brand: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#3b82f6',
    textAlign: 'center',
    paddingBottom: '15px',
    borderBottom: '1px solid #2a2d36',
    flexShrink: 0
  },

  // Menu container - CRITICAL: proper flex setup for mobile
  menu: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    flex: '1 1 auto', // Allow grow and shrink
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },

  // Menu items - compact for mobile
  menuItem: {
    padding: '12px 15px',
    cursor: 'pointer',
    borderRadius: '8px',
    marginBottom: '8px',
    color: '#aaa',
    transition: 'all 0.3s ease',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
    minHeight: '44px' // Touch-friendly minimum
  },

  menuItemActive: {
    backgroundColor: '#3b82f6',
    color: 'white',
    fontWeight: 'bold'
  },

  menuItemHover: {
    backgroundColor: '#2a2d36',
    color: '#fff'
  },

  // Logout button - GUARANTEED at bottom with mobile optimization
  logoutBtn: {
    marginTop: 'auto',
    background: 'transparent',
    border: '1px solid #ff4d4d',
    color: '#ff4d4d',
    padding: '12px 15px',
    cursor: 'pointer',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    flexShrink: 0,
    minHeight: '44px', // Touch-friendly
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'sticky', // Stick to bottom
    bottom: 0,
    backgroundColor: '#1a1d26', // Background to prevent overlap
    zIndex: 10
  },

  // Main content area - adjusted for fixed sidebar with mobile support
  mainContent: {
    flex: 1,
    marginLeft: '250px',
    padding: '20px',
    height: '100vh',
    overflowY: 'auto',
    boxSizing: 'border-box',
    '@media (max-width: 768px)': {
      marginLeft: '200px',
      padding: '15px'
    }
  },

  // Header section
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '1px solid #2a2d36'
  },

  headerTitle: {
    fontSize: '28px',
    fontWeight: '300',
    margin: 0
  },

  // Add camera button
  addBtn: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'all 0.3s ease'
  },

  // Camera grid
  cameraGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
    padding: '20px 0'
  },

  // No cameras message
  noCamera: {
    textAlign: 'center',
    color: '#888',
    fontSize: '18px',
    padding: '60px 20px',
    backgroundColor: '#1a1d26',
    borderRadius: '12px',
    border: '2px dashed #2a2d36'
  },

  // Camera card
  cameraCard: {
    backgroundColor: '#1a1d26',
    borderRadius: '12px',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    border: '1px solid #2a2d36'
  },

  cameraCardHover: {
    transform: 'translateY(-5px)',
    border: '1px solid #3b82f6',
    boxShadow: '0 10px 25px rgba(59, 130, 246, 0.2)'
  },

  // Video container
  videoPlaceholder: {
    height: '200px',
    backgroundColor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#555',
    position: 'relative',
    overflow: 'hidden'
  },

  // Video element
  videoElement: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    backgroundColor: '#000'
  },

  // Card info section
  cardInfo: {
    padding: '15px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1d26'
  },

  cardTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 'bold'
  },

  // Status indicators
  statusLive: { 
    color: '#00ff00', 
    fontWeight: 'bold',
    fontSize: '14px'
  },
  statusWaiting: { 
    color: '#ffaa00', 
    fontWeight: 'bold',
    fontSize: '14px'
  },
  statusOffline: { 
    color: '#ff4d4d', 
    fontWeight: 'bold',
    fontSize: '14px'
  },

  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },

  modalContent: {
    background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
    borderRadius: '20px',
    padding: '40px',
    maxWidth: '500px',
    width: '90%',
    textAlign: 'center',
    position: 'relative',
    border: '2px solid #00bcd4',
    boxShadow: '0 20px 40px rgba(0, 188, 212, 0.3)'
  }
};

function OptimizedDashboard() {
  const navigate = useNavigate();
  
  // State management - MUST be declared before any conditional returns
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [peerConnections, setPeerConnections] = useState({});
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [currentPairingCode, setCurrentPairingCode] = useState('');
  const [pairingStatus, setPairingStatus] = useState('waiting');
  const [isPaired, setIsPaired] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredMenuItem, setHoveredMenuItem] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [currentView, setCurrentView] = useState('cameras'); // 'cameras' or 'recordings'
  const [streamingSessions, setStreamingSessions] = useState([]); // Track streaming sessions

  // Detect mobile screen size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

    // Socket event handlers
    newSocket.on('connect', () => console.log('Connected to server'));
    newSocket.on('disconnect', () => console.log('Disconnected from server'));
    
    // Add missing socket event handlers
    newSocket.on('join_room_success', (data) => {
      console.log('✅ Dashboard joined room successfully:', data);
    });
    
    newSocket.on('join_room_error', (data) => {
      console.error('❌ Dashboard failed to join room:', data);
    });
    
    newSocket.on('room_update', handleRoomUpdate);
    newSocket.on('offer', handleOffer);
    newSocket.on('answer', handleAnswer);
    newSocket.on('ice-candidate', handleIceCandidate);

    setSocket(newSocket);
    return () => newSocket.close();
  }, [navigate]);

  // Mobile detection - AFTER hooks are declared
  if (isMobileDevice()) {
    return <MobileDashboard />;
  }

  // Responsive styles based on screen size
  const getResponsiveStyles = () => {
    if (isMobile) {
      return {
        ...styles,
        dashboardContainer: {
          ...styles.dashboardContainer,
          height: '100dvh',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        },
        sidebar: {
          ...styles.sidebar,
          width: '200px',
          minWidth: '200px',
          padding: '10px',
          height: '100dvh',
          maxHeight: '100dvh',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column'
        },
        mainContent: {
          ...styles.mainContent,
          marginLeft: '200px',
          padding: '15px',
          height: '100dvh'
        },
        brand: {
          ...styles.brand,
          fontSize: '18px',
          marginBottom: '15px',
          paddingBottom: '10px',
          flexShrink: 0
        },
        menu: {
          ...styles.menu,
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          paddingBottom: '10px'
        },
        menuItem: {
          ...styles.menuItem,
          padding: '10px 12px',
          fontSize: '13px',
          marginBottom: '6px',
          minHeight: '40px'
        },
        logoutBtn: {
          ...styles.logoutBtn,
          padding: '10px 12px',
          fontSize: '12px',
          minHeight: '40px',
          marginTop: 'auto',
          flexShrink: 0,
          position: 'sticky',
          bottom: 0,
          backgroundColor: '#1a1d26',
          borderTop: '1px solid #2a2d36',
          marginBottom: 0
        }
      };
    }
    return styles;
  };

  const currentStyles = getResponsiveStyles();

  // Menu items configuration
  const menuItems = [
    { id: 'cameras', icon: '📷', label: 'My Cameras', active: currentView === 'cameras' },
    { id: 'recordings', icon: '📼', label: 'Recordings', active: currentView === 'recordings' },
    { id: 'settings', icon: '⚙️', label: 'Settings', active: currentView === 'settings' }
  ];

  // Handle room updates
  const handleRoomUpdate = (data) => {
    console.log('📡 Room update received:', data);
    if (!data.room_code) return;

    if (showPairingModal && data.room_code === currentPairingCode) {
      console.log('🎯 Room update for current pairing code:', data.room_code, 'Clients:', data.total_clients);
      if (data.total_clients >= 2) {
        console.log('🎉 Mobile device connected! Pairing successful');
        setIsPaired(true);
        setPairingStatus('connected');
        setTimeout(handlePairingComplete, 2000);
      } else {
        console.log('⏳ Still waiting for mobile device...');
        setPairingStatus('waiting');
      }
    }

    setCameras(prevCameras => 
      prevCameras.map(camera => {
        if (camera.code === data.room_code) {
          const newStatus = data.total_clients >= 2 ? "Live" : "Waiting";
          const updatedCamera = { ...camera, status: newStatus };
          
          // Handle streaming session based on status change
          if (newStatus === "Waiting" && camera.status === "Live" && camera.sessionId) {
            // Camera went from Live to Waiting - end streaming session
            endStreamingSession(camera);
          }
          
          return updatedCamera;
        }
        return camera;
      })
    );
  };

  // WebRTC handlers
  const createPeerConnection = (roomCode) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log('📡 Sending ICE candidate:', event.candidate);
        socket.emit('ice-candidate', {  // Changed from ice_candidate to ice-candidate
          candidate: event.candidate,
          room_code: roomCode
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('🎥 Received video track from mobile camera');
      const videoElement = document.getElementById(`video-${roomCode}`);
      if (videoElement) {
        videoElement.srcObject = event.streams[0];
        videoElement.play().catch(console.error);
        console.log('✅ Video element updated with stream');
        
        setCameras(prevCameras => 
          prevCameras.map(camera => {
            if (camera.code === roomCode) {
              const updatedCamera = { ...camera, status: "Live", streaming: true };
              
              // Start streaming session when video starts playing
              if (!camera.sessionId) {
                startStreamingSession(updatedCamera);
              }
              
              return updatedCamera;
            }
            return camera;
          })
        );
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        activateFallbackSystem(roomCode);
      }
    };

    return pc;
  };

  const handleOffer = async (data) => {
    try {
      console.log('📨 Received WebRTC offer:', data);
      const { offer, room_code } = data;
      let pc = peerConnections[room_code];
      
      if (!pc) {
        console.log('🔧 Creating new peer connection for room:', room_code);
        pc = createPeerConnection(room_code);
        setPeerConnections(prev => ({ ...prev, [room_code]: pc }));
      }

      console.log('📝 Setting remote description (offer)');
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      console.log('📝 Creating answer');
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (socket) {
        console.log('📡 Sending answer to mobile camera');
        socket.emit('answer', { answer, room_code });
      }
      
      console.log('✅ WebRTC handshake completed successfully');
    } catch (error) {
      console.error('❌ Error handling offer:', error);
    }
  };

  const handleAnswer = async (data) => {
    const { answer, room_code } = data;
    const pc = peerConnections[room_code];
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    }
  };

  const handleIceCandidate = async (data) => {
    const { candidate, room_code } = data;
    const pc = peerConnections[room_code];
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  };

  const activateFallbackSystem = (roomCode) => {
    const fallback = new VideoFallback();
    fallback.init(roomCode);
    
    const videoElement = document.getElementById(`video-${roomCode}`);
    if (videoElement) {
      fallback.startDashboardDisplay(roomCode, videoElement);
      setCameras(prevCameras => 
        prevCameras.map(camera => 
          camera.code === roomCode 
            ? { ...camera, status: "Live", fallback: true, streaming: true }
            : camera
        )
      );
    }
  };

  // Camera management functions
  const handleAddCamera = async () => {
    setLoading(true);
    console.log('🔧 Generating pairing code...');
    const result = await generateCode();
    
    if (result.success) {
      console.log('✅ Code generated:', result.code, 'Type:', typeof result.code);
      setCurrentPairingCode(result.code);
      setShowPairingModal(true);
      setPairingStatus('waiting');
      setIsPaired(false);
      
      if (socket) {
        console.log('📡 Dashboard joining room as viewer:', result.code);
        socket.emit('join_room', {
          code: result.code,
          type: 'viewer'
        });
      }
    } else {
      console.error('❌ Failed to generate code:', result.error);
      alert('Failed to generate code. Please try again.');
    }
    
    setLoading(false);
  };

  const createCameraRoom = () => {
    const newCamera = {
      id: Date.now(),
      name: `Camera ${cameras.length + 1}`,
      status: isPaired ? "Live" : "Waiting",
      code: currentPairingCode,
    };
    setCameras([...cameras, newCamera]);
  };

  const handlePairingComplete = () => {
    setIsPaired(true);
    setPairingStatus('connected');
    
    setTimeout(() => {
      createCameraRoom();
      setShowPairingModal(false);
      setCurrentPairingCode('');
      setPairingStatus('waiting');
      setIsPaired(false);
    }, 2000);
  };

  const closePairingModal = () => {
    if (isPaired) {
      createCameraRoom();
    }
    setShowPairingModal(false);
    setCurrentPairingCode('');
    setPairingStatus('waiting');
    setIsPaired(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(currentPairingCode).then(() => {
      createCameraRoom();
      setShowPairingModal(false);
      setCurrentPairingCode('');
      setPairingStatus('waiting');
      setIsPaired(false);
      alert('Code copied to clipboard!');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = currentPairingCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      createCameraRoom();
      setShowPairingModal(false);
      setCurrentPairingCode('');
      setPairingStatus('waiting');
      setIsPaired(false);
      alert('Code copied to clipboard!');
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    if (socket) socket.close();
    navigate('/login');
  };

  const handleMenuClick = (menuId) => {
    setCurrentView(menuId);
    console.log('Menu clicked:', menuId);
  };

  // Track streaming sessions
  const startStreamingSession = (camera) => {
    const sessionId = `session_${camera.id}_${Date.now()}`;
    const newSession = {
      id: sessionId,
      cameraName: camera.name,
      cameraCode: camera.code,
      startTime: new Date().toISOString(),
      endTime: null,
      status: 'Live'
    };
    
    setStreamingSessions(prev => [...prev, newSession]);
    
    // Update camera with session info
    setCameras(prevCameras => 
      prevCameras.map(cam => 
        cam.id === camera.id 
          ? { ...cam, sessionId, sessionStartTime: newSession.startTime }
          : cam
      )
    );
    
    console.log('🎥 Started streaming session:', newSession);
  };

  const endStreamingSession = (camera) => {
    const endTime = new Date().toISOString();
    
    setStreamingSessions(prev => 
      prev.map(session => 
        session.id === camera.sessionId 
          ? { ...session, endTime, status: 'Completed' }
          : session
      )
    );
    
    // Update camera to remove session info
    setCameras(prevCameras => 
      prevCameras.map(cam => 
        cam.id === camera.id 
          ? { ...cam, sessionId: null, sessionStartTime: null }
          : cam
      )
    );
    
    console.log('🛑 Ended streaming session for:', camera.name);
  };

  const getStatusStyle = (status) => {
    switch(status.toLowerCase()) {
      case 'live': return styles.statusLive;
      case 'waiting': return styles.statusWaiting;
      default: return styles.statusOffline;
    }
  };

  return (
    <div style={currentStyles.dashboardContainer}>
      {/* Full Height Sidebar */}
      <div style={currentStyles.sidebar}>
        <div style={currentStyles.brand}>⭕ WebWatch</div>
        
        <ul style={currentStyles.menu}>
          {menuItems.map((item) => (
            <li
              key={item.id}
              style={{
                ...currentStyles.menuItem,
                ...(item.active ? currentStyles.menuItemActive : {}),
                ...(hoveredMenuItem === item.id ? currentStyles.menuItemHover : {})
              }}
              onMouseEnter={() => setHoveredMenuItem(item.id)}
              onMouseLeave={() => setHoveredMenuItem(null)}
              onClick={() => handleMenuClick(item.id)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
        
        <button 
          style={currentStyles.logoutBtn} 
          onClick={handleLogout}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#ff4d4d';
            e.target.style.color = 'white';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.color = '#ff4d4d';
          }}
        >
          Log Out
        </button>
      </div>

      {/* Main Content Area */}
      <div style={currentStyles.mainContent}>
        {currentView === 'cameras' && (
          <>
            <div style={currentStyles.header}>
              <h2 style={currentStyles.headerTitle}>My Cameras</h2>
              <button 
                style={currentStyles.addBtn}
                onClick={handleAddCamera}
                disabled={loading}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#2563eb';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#3b82f6';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                {loading ? 'Generating Code...' : '+ Add New Camera'}
              </button>
            </div>

            {/* Camera Grid */}
            <div style={currentStyles.cameraGrid}>
              {cameras.length === 0 ? (
                <div style={currentStyles.noCamera}>
                  <p>No cameras found. Click the button above to add one!</p>
                </div>
              ) : (
                cameras.map((cam) => (
                  <div 
                    key={cam.id} 
                    style={{
                      ...currentStyles.cameraCard,
                      ...(hoveredCard === cam.id ? currentStyles.cameraCardHover : {})
                    }}
                    onMouseEnter={() => setHoveredCard(cam.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <div style={currentStyles.videoPlaceholder}>
                      <video
                        id={`video-${cam.code}`}
                        autoPlay
                        playsInline
                        muted
                        controls={false}
                        style={currentStyles.videoElement}
                      />
                      {cam.status !== "Live" || !cam.streaming ? (
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          color: '#888',
                          textAlign: 'center'
                        }}>
                          <span>📹 Video Feed: {cam.name}</span>
                          <br />
                          <small>Status: {cam.status}</small>
                        </div>
                      ) : null}
                      
                      {cam.code && (
                        <div style={{
                          position: 'absolute',
                          bottom: '10px',
                          left: '10px',
                          fontSize: '12px',
                          color: '#5d5dff',
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          padding: '5px 10px',
                          borderRadius: '5px',
                          fontFamily: 'monospace',
                          fontWeight: 'bold'
                        }}>
                          Code: {cam.code}
                        </div>
                      )}
                    </div>
                    
                    <div style={currentStyles.cardInfo}>
                      <h3 style={currentStyles.cardTitle}>{cam.name}</h3>
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
          <RealRecordingsPage isMobile={false} activeCameras={cameras} streamingSessions={streamingSessions} />
        )}

        {currentView === 'settings' && (
          <SettingsPage isMobile={false} />
        )}
      </div>

      {/* Pairing Modal */}
      {showPairingModal && (
        <div style={currentStyles.modalOverlay}>
          <div style={currentStyles.modalContent}>
            <button
              onClick={closePairingModal}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '24px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>

            <h2 style={{ color: '#fff', marginBottom: '30px', fontSize: '28px' }}>
              Link Your Device
            </h2>

            <div style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#00bcd4',
              marginBottom: '20px',
              letterSpacing: '8px',
              fontFamily: 'monospace'
            }}>
              {currentPairingCode}
            </div>

            <p style={{
              color: pairingStatus === 'connected' ? '#4caf50' : '#bbb',
              marginBottom: '40px',
              fontSize: '16px'
            }}>
              {pairingStatus === 'waiting' 
                ? 'Open the WebWatch app on your old phone and enter this code.'
                : '✅ Mobile device connected! Creating camera...'
              }
            </p>

            <button
              onClick={copyCode}
              style={{
                background: 'transparent',
                border: '2px solid #00bcd4',
                color: '#00bcd4',
                padding: '12px 24px',
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              📋 Copy the Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default OptimizedDashboard;