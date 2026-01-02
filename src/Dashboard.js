import React, { useState, useEffect, useRef } from 'react';
import { generateCode } from './api';
import { SOCKET_URL } from './config';
import io from 'socket.io-client';
import './Dashboard.css';

function Dashboard() {
  const [cameras, setCameras] = useState([]);
  const [socket, setSocket] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [curCode, setCurCode] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [fullscreenCamera, setFullscreenCamera] = useState(null);
  
  // These hold the live video connections
  const streamsRef = useRef({});
  const pcRef = useRef({});

  useEffect(() => {
    // ⚡ V3 LOGIC: Working Connection
    const newSocket = io(SOCKET_URL, { secure: false, rejectUnauthorized: false });

    // Handle incoming video offer
    newSocket.on('offer', async (data) => {
        const room = String(data.room_code);
        
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        pcRef.current[room] = pc;

        pc.onicecandidate = (e) => {
            if(e.candidate) newSocket.emit('ice-candidate', { candidate: e.candidate, room_code: room });
        };

        pc.ontrack = (e) => {
            // Save the stream
            streamsRef.current[room] = e.streams[0];
            // Update UI to show "Live"
            setCameras(prev => prev.map(c => c.code === room ? {...c, status: 'Live'} : c));
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                // Stream ended, update status to Waiting
                setCameras(prev => prev.map(c => c.code === room ? {...c, status: 'Waiting'} : c));
                // Clean up stream reference
                if (streamsRef.current[room]) {
                    delete streamsRef.current[room];
                }
            }
        };
        
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        newSocket.emit('answer', { answer, room_code: room });
    });

    newSocket.on('ice-candidate', async (data) => {
        const room = String(data.room_code);
        if(pcRef.current[room]) await pcRef.current[room].addIceCandidate(new RTCIceCandidate(data.candidate));
    });

    // Handle stream end event
    newSocket.on('stream_ended', (data) => {
        const room = String(data.room_code);
        setCameras(prev => prev.map(c => c.code === room ? {...c, status: 'Waiting'} : c));
        // Clean up stream and connection
        if (streamsRef.current[room]) {
            delete streamsRef.current[room];
        }
        if (pcRef.current[room]) {
            pcRef.current[room].close();
            delete pcRef.current[room];
        }
    });

    // Handle disconnect event
    newSocket.on('disconnect', () => {
        // Update all cameras to waiting status when socket disconnects
        setCameras(prev => prev.map(c => ({...c, status: 'Waiting'})));
        // Clean up all streams
        Object.keys(streamsRef.current).forEach(room => {
            delete streamsRef.current[room];
        });
        Object.keys(pcRef.current).forEach(room => {
            if (pcRef.current[room]) {
                pcRef.current[room].close();
                delete pcRef.current[room];
            }
        });
    });

    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  const handleAdd = async () => {
    const res = await generateCode();
    if(res.success) {
        setCurCode(String(res.code));
        setShowModal(true);
        if(socket) socket.emit('join_room', { code: String(res.code) });
    }
  };

  const finishPairing = () => {
    setCameras([...cameras, { id: Date.now(), name: `Camera ${cameras.length+1}`, code: curCode, status: 'Waiting' }]);
    setShowModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const removeCamera = (cameraId) => {
    setCameras(cameras.filter(cam => cam.id !== cameraId));
    // Clean up any associated streams
    const cameraToRemove = cameras.find(cam => cam.id === cameraId);
    if (cameraToRemove && streamsRef.current[cameraToRemove.code]) {
      delete streamsRef.current[cameraToRemove.code];
    }
    if (cameraToRemove && pcRef.current[cameraToRemove.code]) {
      pcRef.current[cameraToRemove.code].close();
      delete pcRef.current[cameraToRemove.code];
    }
  };

  const toggleFullscreen = (camera) => {
    if (fullscreenCamera && fullscreenCamera.id === camera.id) {
      setFullscreenCamera(null);
    } else {
      setFullscreenCamera(camera);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {!sidebarCollapsed ? (
          // Expanded Layout
          <>
            <div className="sidebar-header">
              <div className="brand">
                <span className="brand-icon">⭕</span>
                <span className="brand-text">WebWatch</span>
              </div>
              <button className="toggle-btn" onClick={toggleSidebar} title="Collapse sidebar">
                <div className="hamburger">
                  <span className="line"></span>
                  <span className="line"></span>
                  <span className="line"></span>
                </div>
              </button>
            </div>
            
            <div className="menu">
              <div className="menu-item active">
                <span className="menu-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z"/>
                  </svg>
                </span>
                <span className="menu-text">My Cameras</span>
              </div>
              <div className="menu-item">
                <span className="menu-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4zM7 15l4.5-6 3.5 4.51 2.5-3.01L21 15H7z"/>
                  </svg>
                </span>
                <span className="menu-text">Recordings</span>
              </div>
              <div className="menu-item">
                <span className="menu-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
                  </svg>
                </span>
                <span className="menu-text">Settings</span>
              </div>
            </div>

            <div className="logout-section">
              <div className="menu-item logout" onClick={handleLogout}>
                <span className="menu-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                  </svg>
                </span>
                <span className="menu-text">Log Out</span>
              </div>
            </div>
          </>
        ) : (
          // Collapsed Layout
          <>
            {/* Toggle Button at Top */}
            <div className="collapsed-toggle-top">
              <button className="toggle-btn collapsed" onClick={toggleSidebar} title="Expand sidebar">
                <div className="hamburger">
                  <span className="line collapsed"></span>
                  <span className="line collapsed"></span>
                  <span className="line collapsed"></span>
                </div>
              </button>
            </div>

            {/* Menu Items */}
            <div className="collapsed-menu">
              <div className="menu-item active collapsed">
                <span className="menu-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z"/>
                  </svg>
                </span>
              </div>
              <div className="menu-item collapsed">
                <span className="menu-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4zM7 15l4.5-6 3.5 4.51 2.5-3.01L21 15H7z"/>
                  </svg>
                </span>
              </div>
              <div className="menu-item collapsed">
                <span className="menu-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
                  </svg>
                </span>
              </div>
            </div>

            {/* Brand at Bottom */}
            <div className="collapsed-brand">
              <div className="brand collapsed">
                <span className="brand-icon">⭕</span>
                <span className="brand-text-small">W</span>
              </div>
            </div>

            {/* Logout at Bottom */}
            <div className="collapsed-logout">
              <div className="menu-item logout collapsed" onClick={handleLogout}>
                <span className="menu-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                  </svg>
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="header">
          <h1 className="page-title">My Cameras</h1>
          <button className="add-camera-btn" onClick={handleAdd}>
            + Add New Camera
          </button>
        </div>
        
        {/* Camera Grid */}
        <div className="camera-grid">
          {cameras.map(cam => (
            <div key={cam.id} className="camera-card">
              <div className="camera-header">
                <span className="camera-code">{cam.code}</span>
                <div className="camera-controls">
                  <button 
                    className="control-btn maximize-btn" 
                    onClick={() => toggleFullscreen(cam)}
                    title="Toggle Fullscreen"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                    </svg>
                  </button>
                  <button 
                    className="control-btn close-btn" 
                    onClick={() => removeCamera(cam.id)}
                    title="Remove Camera"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="video-container">
                <video 
                  autoPlay 
                  playsInline 
                  muted 
                  className="video-feed"
                  ref={el => { 
                    if(el && streamsRef.current[cam.code]) {
                      el.srcObject = streamsRef.current[cam.code]; 
                    }
                  }}
                />
              </div>
              
              <div className="camera-footer">
                <div className="camera-info">
                  <div className="video-feed-info">
                    <span className="video-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                      </svg>
                    </span>
                    <span className="video-text">Video Feed: {cam.name}</span>
                  </div>
                  <div className="status-info">
                    <span className="status-label">Status:</span>
                    <span className={`status-value ${cam.status.toLowerCase()}`}>{cam.status}</span>
                  </div>
                </div>
                <div className="camera-name-section">
                  <div className="camera-name">{cam.name}</div>
                  <div className={`status-indicator ${cam.status.toLowerCase()}`}>
                    <span className="status-dot">●</span>
                    <span className="status-text">{cam.status}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Link New Device</h3>
            <div className="code-display">{curCode}</div>
            <p>Enter this code on your mobile phone to connect the camera.</p>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="modal-btn confirm" onClick={finishPairing}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Camera Modal */}
      {fullscreenCamera && (
        <div className="fullscreen-overlay">
          <div className="fullscreen-header">
            <div className="fullscreen-info">
              <span className="fullscreen-title">{fullscreenCamera.name}</span>
              <span className="fullscreen-code">Code: {fullscreenCamera.code}</span>
              <div className="fullscreen-video-info">
                <span className="video-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                  </svg>
                </span>
                <span className="video-text">Video Feed: {fullscreenCamera.name}</span>
              </div>
              <div className={`status-indicator ${fullscreenCamera.status.toLowerCase()}`}>
                <span className="status-dot">●</span>
                <span className="status-text">Status: {fullscreenCamera.status}</span>
              </div>
            </div>
            <div className="fullscreen-controls">
              <button 
                className="fullscreen-btn minimize-btn" 
                onClick={() => setFullscreenCamera(null)}
                title="Exit Fullscreen"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                </svg>
              </button>
              <button 
                className="fullscreen-btn close-btn" 
                onClick={() => {
                  removeCamera(fullscreenCamera.id);
                  setFullscreenCamera(null);
                }}
                title="Remove Camera"
              >
                ×
              </button>
            </div>
          </div>
          <div className="fullscreen-video-container">
            <video 
              autoPlay 
              playsInline 
              muted 
              className="fullscreen-video"
              ref={el => { 
                if(el && streamsRef.current[fullscreenCamera.code]) {
                  el.srcObject = streamsRef.current[fullscreenCamera.code]; 
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;