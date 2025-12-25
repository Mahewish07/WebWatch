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
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [socket, setSocket] = useState(null);

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
      console.log('Room update:', data);
      // Update camera status when someone joins the room
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
      setGeneratedCode(code);
      setShowCodeModal(true);
      
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

  // Close code modal
  const closeCodeModal = () => {
    setShowCodeModal(false);
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

        {/* Code Modal - Shows generated pairing code */}
        {showCodeModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: '#1a1a2e',
              padding: '40px',
              borderRadius: '15px',
              textAlign: 'center',
              border: '2px solid #5d5dff',
              maxWidth: '400px',
              width: '90%'
            }}>
              <h2 style={{ color: '#fff', marginBottom: '20px' }}>
                Camera Pairing Code
              </h2>
              <div style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#5d5dff',
                letterSpacing: '10px',
                marginBottom: '20px',
                fontFamily: 'monospace'
              }}>
                {generatedCode}
              </div>
              <p style={{ color: '#ccc', marginBottom: '20px' }}>
                Enter this code on your camera device to connect
              </p>
              <button 
                onClick={closeCodeModal}
                style={{
                  padding: '10px 30px',
                  backgroundColor: '#5d5dff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Got It
              </button>
            </div>
          </div>
        )}

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
                  <span>📹 Video Feed: {cam.name}</span>
                  {cam.code && (
                    <div style={{
                      fontSize: '12px',
                      color: '#888',
                      marginTop: '10px'
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