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
      // Update camera status when someone joins the room
      if (data.room_code) {
        setCameras(prevCameras => 
          prevCameras.map(camera => {
            if (camera.code === data.room_code) {
              const updatedCamera = { ...camera, status: data.total_clients >= 2 ? "Live" : "Waiting" };
              
              // If camera just went live, prepare for WebRTC
              if (updatedCamera.status === "Live" && camera.status === "Waiting") {
                console.log('🎥 Camera went live, ready for WebRTC offers from room:', data.room_code);
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

    newSocket.on('ice-candidate', async (data) => {
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
  // Jab button dabega, backend se code generate karega
  const handleAddCamera = async () => {
    setLoading(true);
    
    // Backend se 6-digit code generate karo
    const result = await generateCode();
    
    if (result.success) {
      const code = result.code;
      
      // Naya camera object banayo with code
      const newCamera = {
        id: Date.now(),
        name: `Camera ${cameras.length + 1}`,
        status: "Waiting", // Waiting for camera to connect
        code: code, // Store the pairing code
      };

      // Purani list mein naya camera jod do
      setCameras([...cameras, newCamera]);

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
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          room_code: roomCode
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('🎥 Received remote stream from camera!');
      console.log('Stream details:', event.streams[0]);
      
      // Try multiple ways to find the video element
      const videoElement = document.getElementById(`video-${roomCode}`);
      const videoByQuery = document.querySelector(`video[id="video-${roomCode}"]`);
      const allVideos = document.querySelectorAll('video');
      
      console.log('Looking for video element:', `video-${roomCode}`);
      console.log('Found by ID:', videoElement);
      console.log('Found by query:', videoByQuery);
      console.log('All video elements:', allVideos);
      
      const targetVideo = videoElement || videoByQuery || allVideos[allVideos.length - 1];
      
      if (targetVideo) {
        targetVideo.srcObject = event.streams[0];
        targetVideo.play().catch(e => console.log('Play error:', e));
        console.log('✅ Video stream attached to element:', targetVideo.id);
        
        // Force update camera status to show video is playing
        setCameras(prevCameras => 
          prevCameras.map(camera => 
            camera.code === roomCode 
              ? { ...camera, status: "Live", streaming: true }
              : camera
          )
        );
      } else {
        console.error('❌ No video element found for room:', roomCode);
        console.error('Available elements:', document.querySelectorAll('[id*="video"]'));
      }
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
    console.log('Video Elements:', document.querySelectorAll('video'));
    console.log('Socket Connected:', socket?.connected);
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
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      backgroundColor: '#000',
                      display: cam.status === "Live" ? 'block' : 'none'
                    }}
                  />
                  {cam.status !== "Live" && (
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
                  )}
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
    </div>
  );
}

export default Dashboard;