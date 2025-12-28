import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { generateCode } from './api';
import { SOCKET_URL } from './config';
import io from 'socket.io-client';

function Dashboard() {
  const navigate = useNavigate();

  // --- ACTUAL LOGIC: Shuruaat mein list KHALI hai ---
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [peerConnections, setPeerConnections] = useState({});
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [currentPairingCode, setCurrentPairingCode] = useState('');
  const [pairingStatus, setPairingStatus] = useState('waiting'); // waiting, connected, completed
  const [isPaired, setIsPaired] = useState(false); // Track if mobile connected

  // Check if user is logged in
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      navigate('/login');
    }

    // Initialize Socket.IO connection
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to server via Socket.IO');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    newSocket.on('connected', (data) => {
      console.log('Server confirmation:', data);
    });

    // Listen for room updates (when camera joins)
    newSocket.on('room_update', (data) => {
      console.log('📡 Dashboard room update:', data);
      // Update camera status when someone joins/leaves the room
      if (data.room_code) {
        // If pairing modal is open and this is the pairing code
        if (showPairingModal && data.room_code === currentPairingCode) {
          if (data.total_clients >= 2) {
            console.log('🎉 Mobile device connected!');
            setIsPaired(true);
            setPairingStatus('connected');
            // Auto-close after 2 seconds to show success
            setTimeout(() => {
              handlePairingComplete();
            }, 2000);
          } else {
            setPairingStatus('waiting');
          }
        }
        
        setCameras(prevCameras => 
          prevCameras.map(camera => {
            if (camera.code === data.room_code) {
              // If only 1 client (dashboard only), camera disconnected
              const newStatus = data.total_clients >= 2 ? "Live" : "Waiting";
              const updatedCamera = { ...camera, status: newStatus };
              
              // If camera just went live, prepare for WebRTC
              if (updatedCamera.status === "Live" && camera.status === "Waiting") {
                console.log('🎥 Camera went live, ready for WebRTC offers from room:', data.room_code);
              }
              
              // If camera disconnected, clear video
              if (updatedCamera.status === "Waiting" && camera.status === "Live") {
                console.log('📱 Camera disconnected from room:', data.room_code);
                const videoElement = document.getElementById(`video-${data.room_code}`);
                if (videoElement) {
                  videoElement.srcObject = null;
                  videoElement.style.display = 'none';
                }
              }
              
              return updatedCamera;
            }
            return camera;
          })
        );
      }
    });

    newSocket.on('join_room_success', (data) => {
      console.log('Room join success:', data);
    });

    newSocket.on('join_room_error', (data) => {
      console.error('Room join error:', data);
    });

    // WebRTC Signaling Events
    newSocket.on('offer', async (data) => {
      console.log('📨 Received offer from camera:', data);
      await handleOffer(data);
    });

    newSocket.on('answer', async (data) => {
      console.log('📨 Received answer from camera:', data);
      await handleAnswer(data);
    });

    newSocket.on('ice_candidate', async (data) => {
      console.log('📨 Received ICE candidate:', data);
      await handleIceCandidate(data);
    });

    newSocket.on('signaling_error', (data) => {
      console.error('❌ Signaling error:', data);
    });

    setSocket(newSocket);

    // Cleanup on component unmount
    return () => {
      newSocket.close();
    };
  }, [navigate]);

  // Logout Function
  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    if (socket) {
      socket.close();
    }
    navigate('/login');
  };

  // --- ADD CAMERA FUNCTION (Backend connected) ---
  const handleAddCamera = async () => {
    setLoading(true);
    
    // Backend se 6-digit code generate karo
    const result = await generateCode();
    
    if (result.success) {
      const code = result.code;
      
      // DON'T create camera yet - wait for copy or pairing
      setCurrentPairingCode(code);
      setShowPairingModal(true);
      setPairingStatus('waiting');
      setIsPaired(false);
      
      // Join room with this code (as viewer)
      if (socket) {
        socket.emit('join_room', {
          code: code,
          type: 'viewer'
        });
      }
    } else {
      alert('Failed to generate code. Please try again.');
    }
    
    setLoading(false);
  };

  // Create camera room
  const createCameraRoom = () => {
    const newCamera = {
      id: Date.now(),
      name: `Camera ${cameras.length + 1}`,
      status: isPaired ? "Live" : "Waiting",
      code: currentPairingCode,
    };

    setCameras([...cameras, newCamera]);
  };

  // Handle pairing completion (mobile connected)
  const handlePairingComplete = () => {
    console.log('✅ Mobile device connected!');
    setIsPaired(true);
    setPairingStatus('connected');
    
    // Auto-close after showing success message
    setTimeout(() => {
      createCameraRoom();
      setShowPairingModal(false);
      setCurrentPairingCode('');
      setPairingStatus('waiting');
      setIsPaired(false);
    }, 2000);
  };

  // Manual close pairing modal
  const closePairingModal = () => {
    console.log('❌ Pairing modal closed manually');
    
    // Only create camera if mobile was paired
    if (isPaired) {
      console.log('✅ Mobile was paired, creating camera room...');
      createCameraRoom();
    } else {
      console.log('❌ No pairing detected, not creating camera room');
    }
    
    setShowPairingModal(false);
    setCurrentPairingCode('');
    setPairingStatus('waiting');
    setIsPaired(false);
  };

  // Copy code to clipboard
  const copyCode = () => {
    navigator.clipboard.writeText(currentPairingCode).then(() => {
      console.log('📋 Code copied! Creating camera room...');
      
      // Create camera room when code is copied
      createCameraRoom();
      
      // Close modal and go back to dashboard
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
      
      console.log('📋 Code copied (fallback)! Creating camera room...');
      
      // Create camera room when code is copied
      createCameraRoom();
      
      // Close modal and go back to dashboard
      setShowPairingModal(false);
      setCurrentPairingCode('');
      setPairingStatus('waiting');
      setIsPaired(false);
      
      alert('Code copied to clipboard!');
    });
  };

  // WebRTC Handler Functions
  const createPeerConnection = (roomCode) => {
    console.log('🔄 Creating peer connection for room:', roomCode);
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log('📤 Sending ICE candidate to camera');
        socket.emit('ice_candidate', {
          candidate: event.candidate,
          room_code: roomCode
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('🎥 Received remote stream from camera!');
      console.log('Stream details:', event.streams[0]);
      
      // Wait for video element to be rendered with retry mechanism
      const waitForVideoElement = (attempts = 0) => {
        const videoElement = document.getElementById(`video-${roomCode}`);
        
        if (videoElement && attempts < 15) {
          console.log('✅ Video element found, attaching stream');
          
          // Force show video element first
          videoElement.style.display = 'block';
          videoElement.style.width = '100%';
          videoElement.style.height = '100%';
          videoElement.style.objectFit = 'cover';
          
          // Attach stream
          videoElement.srcObject = event.streams[0];
          
          // Force play
          videoElement.play().then(() => {
            console.log('✅ Video playing successfully');
          }).catch(e => {
            console.log('Play error:', e);
            // Try to play again after a short delay
            setTimeout(() => {
              videoElement.play().catch(err => console.log('Retry play error:', err));
            }, 500);
          });
          
          // Force update camera status
          setCameras(prevCameras => 
            prevCameras.map(camera => 
              camera.code === roomCode 
                ? { ...camera, status: "Live", streaming: true }
                : camera
            )
          );
        } else if (attempts < 15) {
          console.log(`⏳ Waiting for video element... attempt ${attempts + 1}`);
          setTimeout(() => waitForVideoElement(attempts + 1), 300);
        } else {
          console.error('❌ Video element not found after 15 attempts');
        }
      };
      
      waitForVideoElement();
    };

    pc.onconnectionstatechange = () => {
      console.log('🔗 Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        console.log('🎉 WebRTC connection established!');
      }
    };

    return pc;
  };

  // Debug function - call from browser console
  window.debugDashboard = () => {
    console.log('📊 Dashboard Debug Info:');
    console.log('Cameras:', cameras);
    console.log('Peer Connections:', peerConnections);
    console.log('Socket Connected:', socket?.connected);
    console.log('Show Pairing Modal:', showPairingModal);
    console.log('Current Pairing Code:', currentPairingCode);
    console.log('Pairing Status:', pairingStatus);
    
    // Check video elements
    cameras.forEach(camera => {
      const videoElement = document.getElementById(`video-${camera.code}`);
      console.log(`Video ${camera.code}:`, {
        element: videoElement,
        srcObject: videoElement?.srcObject,
        videoWidth: videoElement?.videoWidth,
        videoHeight: videoElement?.videoHeight,
        readyState: videoElement?.readyState,
        paused: videoElement?.paused
      });
    });
  };

  // Auto-debug when video issues occur
  window.debugVideoIssue = (roomCode) => {
    const videoElement = document.getElementById(`video-${roomCode}`);
    console.log('🔍 Video Debug for room:', roomCode);
    console.log('Element:', videoElement);
    console.log('SrcObject:', videoElement?.srcObject);
    console.log('Tracks:', videoElement?.srcObject?.getTracks());
    console.log('Video dimensions:', videoElement?.videoWidth, 'x', videoElement?.videoHeight);
    console.log('Ready state:', videoElement?.readyState);
    console.log('Paused:', videoElement?.paused);
    
    // Try to force play
    if (videoElement && videoElement.srcObject) {
      videoElement.play().then(() => {
        console.log('✅ Manual play successful');
      }).catch(e => {
        console.error('❌ Manual play failed:', e);
      });
    }
  };

  const handleOffer = async (data) => {
    try {
      const { offer, room_code } = data;
      console.log('🎯 Processing offer for room:', room_code);
      
      const pc = createPeerConnection(room_code);
      setPeerConnections(prev => ({ ...prev, [room_code]: pc }));
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('✅ Remote description set');
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('✅ Answer created and local description set');
      
      if (socket) {
        socket.emit('answer', {
          answer: answer,
          room_code: room_code
        });
        console.log('📤 Answer sent to camera');
      }
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
        console.log('✅ Answer processed for room:', room_code);
      } catch (error) {
        console.error('❌ Error handling answer:', error);
      }
    }
  };

  const handleIceCandidate = async (data) => {
    const { candidate, room_code } = data;
    const pc = peerConnections[room_code];
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('✅ ICE candidate added for room:', room_code);
      } catch (error) {
        console.error('❌ Error adding ICE candidate:', error);
      }
    }
  };

  return (
    <div className="dashboard-container">
      
      {/* --- SIDEBAR --- */}
      <div className="sidebar">
        <div className="brand">⭕ WebWatch</div>
        <ul className="menu">
          <li className="active">📷 My Cameras</li>
          <li>📼 Recordings</li>
          <li>⚙️ Settings</li>
        </ul>
        <button className="logout-btn" onClick={handleLogout}>
          Log Out
        </button>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="main-content">
        <div className="header">
          <h2>My Cameras</h2>
          <button 
            className="add-btn" 
            onClick={handleAddCamera}
            disabled={loading}
          >
            {loading ? 'Generating Code...' : '+ Add New Camera'}
          </button>
        </div>

        {/* --- CAMERA GRID --- */}
        <div className="camera-grid">
          
          {/* Agar list khali hai (0 cameras), to ye message dikhao */}
          {cameras.length === 0 ? (
            <div className="no-camera">
              <p>No cameras found. Click the button above to add one!</p>
            </div>
          ) : (
            // Agar cameras hain, to unhe dikhao
            cameras.map((cam) => (
              <div key={cam.id} className="camera-card">
                <div className="video-placeholder">
                  <video
                    id={`video-${cam.code}`}
                    autoPlay
                    playsInline
                    muted
                    controls={false}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      backgroundColor: '#000',
                      display: 'block'  // Always visible
                    }}
                    onLoadedMetadata={(e) => {
                      console.log('Video metadata loaded:', e.target.videoWidth, 'x', e.target.videoHeight);
                    }}
                    onPlay={() => {
                      console.log('Video started playing');
                    }}
                    onError={(e) => {
                      console.error('Video error:', e);
                    }}
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
                      {cam.status === "Live" && !cam.streaming && (
                        <>
                          <br />
                          <small>Connecting...</small>
                        </>
                      )}
                    </div>
                  ) : null}
                  {cam.code && (
                    <div style={{
                      position: 'absolute',
                      bottom: '10px',
                      left: '10px',
                      fontSize: '14px',
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
                
                <div className="card-info">
                  <h3>{cam.name}</h3>
                  
                  {/* Ye line ab fixed hai (Backticks ` ` ke saath) */}
                  <span className={`status ${cam.status.toLowerCase()}`}>
                    ● {cam.status}
                  </span>
                  
                </div>
              </div>
            ))
          )}

        </div>
      </div>

      {/* Pairing Modal */}
      {showPairingModal && (
        <div style={{
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
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
            borderRadius: '20px',
            padding: '40px',
            maxWidth: '500px',
            width: '90%',
            textAlign: 'center',
            position: 'relative',
            border: '2px solid #00bcd4',
            boxShadow: '0 20px 40px rgba(0, 188, 212, 0.3)'
          }}>
            {/* Close Button */}
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
                cursor: 'pointer',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>

            <h2 style={{
              color: '#fff',
              marginBottom: '30px',
              fontSize: '28px',
              fontWeight: '300'
            }}>
              Link Your Device
            </h2>

            {/* Pairing Code */}
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
              fontSize: '16px',
              fontWeight: pairingStatus === 'connected' ? 'bold' : 'normal'
            }}>
              {pairingStatus === 'waiting' 
                ? 'Open the WebWatch app on your old phone and enter this code.'
                : '✅ Mobile device connected! Creating camera...'
              }
            </p>

            {/* Steps */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-around',
              marginBottom: '30px'
            }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: '#00bcd4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                  fontSize: '24px'
                }}>
                  📱
                </div>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>
                  1. Open WebWatch
                </div>
                <div style={{ color: '#bbb', fontSize: '12px' }}>
                  on old phone
                </div>
              </div>

              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: '#00bcd4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                  fontSize: '24px'
                }}>
                  💬
                </div>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>
                  2. Enter this code
                </div>
                <div style={{ color: '#bbb', fontSize: '12px' }}>
                  {currentPairingCode}
                </div>
              </div>

              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: '#00bcd4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                  fontSize: '24px'
                }}>
                  🎥
                </div>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>
                  3. Start Streaming
                </div>
                <div style={{ color: '#bbb', fontSize: '12px' }}>
                  Allow camera access
                </div>
              </div>
            </div>

            {/* Copy Code Button */}
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
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#00bcd4';
                e.target.style.color = '#fff';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#00bcd4';
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

export default Dashboard;