import React, { useState, useEffect, useRef } from 'react';
import { generateCode } from './api';
import { SOCKET_URL } from './config';
import io from 'socket.io-client';
import './Dashboard.css';

function Dashboard() {
  // --- UI State ---
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Start collapsed on mobile devices
    return window.innerWidth <= 768;
  });
  const [fullscreenCamera, setFullscreenCamera] = useState(null);
  const [activeTab, setActiveTab] = useState('cameras'); // 'cameras' or 'recordings'
  const [openSettingsMenu, setOpenSettingsMenu] = useState(null); // Track which camera's settings are open
  const [editingCameraName, setEditingCameraName] = useState(null); // Track which camera name is being edited
  const [tempCameraName, setTempCameraName] = useState(''); // Temporary name during editing
  const [cameraSettings, setCameraSettings] = useState(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('webwatch_camera_settings');
    return saved ? JSON.parse(saved) : {};
  });

  // --- Logic State ---
  const [cameras, setCameras] = useState(() => {
    // Load cameras from localStorage on initial render
    const savedCameras = localStorage.getItem('webwatch_cameras');
    return savedCameras ? JSON.parse(savedCameras) : [];
  });
  const [recordings, setRecordings] = useState([]);
  const [socket, setSocket] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [curCode, setCurCode] = useState('');

  // --- Refs ---
  const streamsRef = useRef({});
  const pcRef = useRef({});
  const recordersRef = useRef({});
  const chunksRef = useRef({});

  // Save cameras to localStorage whenever they change
  useEffect(() => {
    if (cameras.length > 0) {
      localStorage.setItem('webwatch_cameras', JSON.stringify(cameras));
    }
  }, [cameras]);

  // Save camera settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('webwatch_camera_settings', JSON.stringify(cameraSettings));
  }, [cameraSettings]);

  // 1. SETUP SOCKET
  useEffect(() => {
    const newSocket = io(SOCKET_URL, { 
      secure: true, 
      rejectUnauthorized: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    // Rejoin rooms for existing cameras on connect/reconnect
    newSocket.on('connect', () => {
      console.log('✅ Dashboard socket connected');
      
      // Rejoin all existing camera rooms
      if (cameras.length > 0) {
        console.log(`🔄 Rejoining ${cameras.length} camera room(s)`);
        cameras.forEach(cam => {
          if (cam.code) {
            console.log(`📡 Rejoining room: ${cam.code}`);
            newSocket.emit('join_room', { code: String(cam.code), client_type: 'dashboard' });
            // Update status to show reconnecting
            setCameras(prev => prev.map(c => 
              c.code === cam.code ? {...c, status: 'Reconnecting...'} : c
            ));
          }
        });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      // Update all cameras to waiting status
      setCameras(prev => prev.map(c => ({...c, status: 'Waiting'})));
    });

    newSocket.on('offer', async (data) => {
        const room = String(data.room_code);
        console.log(`📹 Received offer from room: ${room}`);
        
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        pcRef.current[room] = pc;

        pc.onicecandidate = (e) => {
            if(e.candidate) newSocket.emit('ice-candidate', { candidate: e.candidate, room_code: room });
        };

        pc.ontrack = (e) => {
            console.log(`✅ Stream received for room: ${room}`);
            streamsRef.current[room] = e.streams[0];
            setCameras(prev => prev.map(c => c.code === room ? {...c, status: 'Live', isRecording: false} : c));
        };

        pc.onconnectionstatechange = () => {
            console.log(`🔌 Connection state for ${room}: ${pc.connectionState}`);
            if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
                setCameras(prev => prev.map(c => c.code === room ? {...c, status: 'Waiting'} : c));
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

    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  // 2. ENHANCED RECORDING LOGIC WITH MOBILE SUPPORT
  const [recordingStartTimes, setRecordingStartTimes] = useState({});

  // Get recording quality settings for a camera
  const getRecordingQuality = (code) => {
    const settings = cameraSettings[code] || {};
    return settings.recordingQuality || 'medium';
  };

  // Get camera name by code
  const getCameraNameByCode = (code) => {
    const camera = cameras.find(cam => cam.code === code);
    return camera ? camera.name : `Camera ${code}`;
  };

  // Get bitrate based on quality setting
  const getBitrate = (quality) => {
    const bitrates = {
      'low': 500000,      // 0.5 Mbps
      'medium': 1000000,  // 1 Mbps
      'high': 2500000,    // 2.5 Mbps
      'ultra': 5000000    // 5 Mbps
    };
    return bitrates[quality] || bitrates['medium'];
  };

  const startRecording = (code) => {
      const stream = streamsRef.current[code];
      if (!stream) return alert("No video stream available!");

      // Check MediaRecorder support
      if (!window.MediaRecorder) {
          return alert("❌ Recording not supported on this device/browser");
      }

      // Check for supported formats
      const supportedTypes = [
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8', 
          'video/webm',
          'video/mp4'
      ];
      
      let selectedType = 'video/webm';
      for (let type of supportedTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
              selectedType = type;
              break;
          }
      }

      // Get quality setting for this camera
      const quality = getRecordingQuality(code);
      const bitrate = getBitrate(quality);

      console.log(`🎥 Starting recording with format: ${selectedType}, quality: ${quality}, bitrate: ${bitrate}`);

      try {
          const recorder = new MediaRecorder(stream, {
              mimeType: selectedType,
              videoBitsPerSecond: bitrate
          });
          
          chunksRef.current[code] = [];
          
          // 🎯 CAPTURE EXACT RECORDING START TIME (when button clicked)
          const actualRecordingStartTime = new Date();
          console.log(`📅 Recording started at: ${actualRecordingStartTime.toISOString()}`);
          
          // Store the start time for this recording
          setRecordingStartTimes(prev => ({
              ...prev,
              [code]: actualRecordingStartTime.toISOString()
          }));

          recorder.ondataavailable = (e) => {
              console.log(`📊 Data chunk received: ${e.data.size} bytes`);
              if (e.data.size > 0) {
                  chunksRef.current[code].push(e.data);
              }
          };

          recorder.onstop = async () => {
              console.log(`🛑 Recording stopped. Total chunks: ${chunksRef.current[code].length}`);
              
              if (chunksRef.current[code].length === 0) {
                  alert("❌ No recording data captured. Try again.");
                  setCameras(prev => prev.map(c => c.code === code ? {...c, isRecording: false} : c));
                  return;
              }

              const blob = new Blob(chunksRef.current[code], { type: selectedType });
              console.log(`📦 Created blob: ${blob.size} bytes`);
              
              if (blob.size < 1000) { // Less than 1KB indicates failure
                  alert("❌ Recording too short or corrupted. Try again.");
                  setCameras(prev => prev.map(c => c.code === code ? {...c, isRecording: false} : c));
                  return;
              }

              // Show upload progress
              setCameras(prev => prev.map(c => c.code === code ? {...c, isRecording: false, uploading: true} : c));

              const formData = new FormData();
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const filename = `recording_${timestamp}.webm`;
              formData.append('video', blob, filename);
              
              // Send actual camera name with code
              const cameraName = getCameraNameByCode(code);
              formData.append('camera_name', `${cameraName} (${code})`);
              
              // 🎯 SEND ACTUAL RECORDING START TIME (not current time)
              const actualStartTime = recordingStartTimes[code] || new Date().toISOString();
              formData.append('recording_start_time', actualStartTime);
              console.log(`📅 Sending actual start time: ${actualStartTime}`);

              try {
                  const API_BASE = SOCKET_URL.replace('socket.io', ''); 
                  console.log(`📤 Uploading to: ${API_BASE}/api/upload`);
                  
                  const res = await fetch(`${API_BASE}/api/upload`, { 
                      method: 'POST', 
                      body: formData,
                      // Add timeout for mobile networks
                      signal: AbortSignal.timeout(30000) // 30 second timeout
                  });
                  
                  if(res.ok) {
                      const result = await res.json();
                      alert(`✅ Recording saved successfully! (${(blob.size/1024/1024).toFixed(2)}MB)`);
                      console.log("✅ Upload successful:", result);
                  } else {
                      const errorText = await res.text();
                      console.error("❌ Upload failed:", res.status, errorText);
                      alert(`❌ Upload failed: ${res.status} ${res.statusText}`);
                  }
              } catch(err) {
                  console.error("❌ Upload error:", err);
                  if (err.name === 'TimeoutError') {
                      alert("❌ Upload timeout. Check your internet connection.");
                  } else {
                      alert(`❌ Upload error: ${err.message}`);
                  }
              } finally {
                  setCameras(prev => prev.map(c => c.code === code ? {...c, uploading: false} : c));
              }
          };

          recorder.onerror = (e) => {
              console.error("❌ Recording error:", e);
              alert("❌ Recording failed. Your browser may not support this feature.");
              setCameras(prev => prev.map(c => c.code === code ? {...c, isRecording: false} : c));
          };

          // Start recording with time slicing for better mobile performance
          recorder.start(1000); // Capture data every 1 second
          recordersRef.current[code] = recorder;
          setCameras(prev => prev.map(c => c.code === code ? {...c, isRecording: true} : c));
          
          console.log("🎬 Recording started successfully");
          
      } catch (error) {
          console.error("❌ Failed to start recording:", error);
          alert(`❌ Cannot start recording: ${error.message}`);
      }
  };

  const stopRecording = (code) => {
      console.log(`🛑 Stopping recording for camera: ${code}`);
      if(recordersRef.current[code]) {
          const recorder = recordersRef.current[code];
          if (recorder.state === 'recording') {
              recorder.stop();
              console.log("📹 Recording stop signal sent");
          } else {
              console.log(`⚠️ Recorder state: ${recorder.state}`);
              setCameras(prev => prev.map(c => c.code === code ? {...c, isRecording: false} : c));
          }
      } else {
          console.log("❌ No active recorder found");
          setCameras(prev => prev.map(c => c.code === code ? {...c, isRecording: false} : c));
      }
  };

  // 3. DATABASE LOGIC
  const loadRecordings = async () => {
      setActiveTab('recordings');
      try {
          const API_BASE = SOCKET_URL.replace('socket.io', '');
          const res = await fetch(`${API_BASE}/api/recordings`);
          const data = await res.json();
          setRecordings(data);
      } catch (err) {
          console.error("Error:", err);
      }
  };

  const handleDelete = async (id) => {
      if(!window.confirm("Delete this video permanently?")) return;
      try {
          const API_BASE = SOCKET_URL.replace('socket.io', '');
          const res = await fetch(`${API_BASE}/api/recordings/${id}`, { method: 'DELETE' });
          if(res.ok) setRecordings(prev => prev.filter(rec => rec.id !== id));
      } catch (err) {
          console.error(err);
      }
  };

  // 4. UI HANDLERS
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

  const removeCamera = (id) => {
    const cam = cameras.find(c => c.id === id);
    const updatedCameras = cameras.filter(cam => cam.id !== id);
    setCameras(updatedCameras);
    
    // Remove settings for this camera
    if (cam && cam.code) {
      const updatedSettings = {...cameraSettings};
      delete updatedSettings[cam.code];
      setCameraSettings(updatedSettings);
    }
    
    // Update localStorage
    if (updatedCameras.length === 0) {
      localStorage.removeItem('webwatch_cameras');
    } else {
      localStorage.setItem('webwatch_cameras', JSON.stringify(updatedCameras));
    }
  };
  
  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  // Settings menu handlers
  const toggleSettingsMenu = (cameraId, event) => {
    event.stopPropagation();
    setOpenSettingsMenu(openSettingsMenu === cameraId ? null : cameraId);
  };

  const updateCameraSetting = (code, setting, value) => {
    setCameraSettings(prev => ({
      ...prev,
      [code]: {
        ...(prev[code] || {}),
        [setting]: value
      }
    }));
  };

  // Camera rename handlers
  const startEditingName = (camera, event) => {
    event.stopPropagation();
    setEditingCameraName(camera.id);
    setTempCameraName(camera.name);
  };

  const saveCameraName = (cameraId) => {
    if (tempCameraName.trim()) {
      setCameras(prev => prev.map(c => 
        c.id === cameraId ? {...c, name: tempCameraName.trim()} : c
      ));
    }
    setEditingCameraName(null);
    setTempCameraName('');
  };

  const cancelEditingName = () => {
    setEditingCameraName(null);
    setTempCameraName('');
  };

  const handleNameKeyPress = (e, cameraId) => {
    if (e.key === 'Enter') {
      saveCameraName(cameraId);
    } else if (e.key === 'Escape') {
      cancelEditingName();
    }
  };

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (openSettingsMenu) setOpenSettingsMenu(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openSettingsMenu]);

  // Handle window resize for responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarCollapsed(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="dashboard-container">
      {/* Mobile Overlay - closes sidebar when clicked */}
      {!sidebarCollapsed && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}
      
      {/* Sidebar */}
      <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {!sidebarCollapsed ? (
          <>
            <div className="sidebar-header">
              <div className="brand"><span className="brand-icon">⭕</span><span className="brand-text">WebWatch</span></div>
              <button className="toggle-btn" onClick={toggleSidebar}><div className="hamburger"><span className="line"></span><span className="line"></span><span className="line"></span></div></button>
            </div>
            <div className="menu">
              <div className={`menu-item ${activeTab==='cameras' ? 'active' : ''}`} onClick={() => setActiveTab('cameras')}>
                <span className="menu-icon">📷</span><span className="menu-text">My Cameras</span>
              </div>
              <div className={`menu-item ${activeTab==='recordings' ? 'active' : ''}`} onClick={loadRecordings}>
                <span className="menu-icon">📼</span><span className="menu-text">Recordings</span>
              </div>
            </div>
            <div className="logout-section">
              <div className="menu-item logout" onClick={() => window.location.reload()}>
                <span className="menu-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                </span>
                <span className="menu-text">Log Out</span>
              </div>
            </div>
          </>
        ) : (
          <>
             <div className="collapsed-toggle-top"><button className="toggle-btn collapsed" onClick={toggleSidebar}>☰</button></div>
             <div className="collapsed-menu">
                <div className={`menu-item collapsed ${activeTab==='cameras' ? 'active' : ''}`} onClick={() => setActiveTab('cameras')}>📷</div>
                <div className={`menu-item collapsed ${activeTab==='recordings' ? 'active' : ''}`} onClick={loadRecordings}>📼</div>
             </div>
             <div className="logout-section">
               <div className="menu-item logout collapsed" onClick={() => window.location.reload()}>
                 <span className="menu-icon">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                     <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                     <polyline points="16 17 21 12 16 7"></polyline>
                     <line x1="21" y1="12" x2="9" y2="12"></line>
                   </svg>
                 </span>
               </div>
             </div>
          </>
        )}
      </div>

      <div className="main-content">
        {/* Mobile Menu Toggle Button */}
        {sidebarCollapsed && (
          <button className="mobile-menu-toggle" onClick={toggleSidebar}>
            ☰
          </button>
        )}
        
        {/* --- VIEW 1: CAMERAS --- */}
        {activeTab === 'cameras' && (
            <>
                <div className="header">
                    <h1 className="page-title">My Cameras</h1>
                    <button className="add-camera-btn" onClick={handleAdd}>+ Add New Camera</button>
                </div>
                
                <div className="camera-grid">
                {cameras.map(cam => (
                    <div key={cam.id} className="camera-card">
                    <div className="camera-header">
                        <span className="camera-code">Code: {cam.code}</span>
                        <div className="camera-controls">
                            <button className="control-btn settings-btn" onClick={(e) => toggleSettingsMenu(cam.id, e)} title="Settings">⚙️</button>
                            <button className="control-btn maximize-btn" onClick={() => setFullscreenCamera(cam)} title="Fullscreen">⤢</button>
                            <button className="control-btn close-btn" onClick={() => removeCamera(cam.id)} title="Remove">×</button>
                        </div>
                        
                        {/* Settings Dropdown Menu */}
                        {openSettingsMenu === cam.id && (
                          <div className="settings-dropdown" onClick={(e) => e.stopPropagation()}>
                            <div className="settings-section">
                              <div className="settings-title">Recording Quality</div>
                              <div className="quality-options">
                                {['low', 'medium', 'high', 'ultra'].map(quality => (
                                  <label key={quality} className="quality-option">
                                    <input 
                                      type="radio" 
                                      name={`quality-${cam.id}`}
                                      value={quality}
                                      checked={getRecordingQuality(cam.code) === quality}
                                      onChange={() => updateCameraSetting(cam.code, 'recordingQuality', quality)}
                                    />
                                    <span className="quality-label">
                                      {quality === 'low' && '📱 Low (0.5 Mbps)'}
                                      {quality === 'medium' && '📹 Medium (1 Mbps)'}
                                      {quality === 'high' && '🎥 High (2.5 Mbps)'}
                                      {quality === 'ultra' && '⭐ Ultra (5 Mbps)'}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
                    
                    <div className="video-container">
                        <video 
                            autoPlay playsInline muted className="video-feed"
                            ref={el => { if(el && streamsRef.current[cam.code]) el.srcObject = streamsRef.current[cam.code]; }}
                        />
                    </div>
                    
                    <div className="camera-footer">
                        <div className="camera-info">
                            <div className="status-info"><span className={`status-value ${cam.status.toLowerCase()}`}>● {cam.status}</span></div>
                            <div className="camera-name-container">
                              {editingCameraName === cam.id ? (
                                <input
                                  type="text"
                                  className="camera-name-input"
                                  value={tempCameraName}
                                  onChange={(e) => setTempCameraName(e.target.value)}
                                  onBlur={() => saveCameraName(cam.id)}
                                  onKeyDown={(e) => handleNameKeyPress(e, cam.id)}
                                  autoFocus
                                  maxLength={30}
                                />
                              ) : (
                                <div className="camera-name" onClick={(e) => startEditingName(cam, e)}>
                                  {cam.name}
                                  <span className="edit-icon">✏️</span>
                                </div>
                              )}
                            </div>
                        </div>

                        {/* ENHANCED RECORD BUTTON WITH STATUS */}
                        {cam.status === 'Live' && (
                            <div className="camera-actions">
                                {cam.uploading ? (
                                    <button className="record-btn uploading" disabled>📤 Uploading...</button>
                                ) : !cam.isRecording ? (
                                    <button className="record-btn start" onClick={() => startRecording(cam.code)}>⚪ Record</button>
                                ) : (
                                    <button className="record-btn stop" onClick={() => stopRecording(cam.code)}>⏹ Stop</button>
                                )}
                            </div>
                        )}
                    </div>
                    </div>
                ))}
                </div>
            </>
        )}

        {/* --- VIEW 2: RECORDINGS --- */}
        {activeTab === 'recordings' && (
            <>
                <div className="header">
                    <h1 className="page-title">Saved Recordings</h1>
                    <button className="add-camera-btn" onClick={loadRecordings}>🔄 Refresh</button>
                </div>
                <div className="camera-grid">
                    {recordings.length === 0 && <p style={{color:'#888', padding:'20px'}}>No recordings found.</p>}
                    {recordings.map(rec => (
                        <div key={rec.id} className="camera-card">
                            <div className="camera-header">
                                <span className="camera-code">Recording #{rec.id}</span>
                            </div>
                            <div className="video-container" style={{background: '#000', position: 'relative'}}>
                                <video 
                                    controls 
                                    className="video-feed" 
                                    src={`${SOCKET_URL.replace('socket.io', '')}/recordings/${rec.filename}`}
                                />
                                {/* Recording Start Time Overlay - Top Right */}
                                <div className="recording-start-time">
                                    {rec.recording_start_time ? 
                                        new Date(rec.recording_start_time).toLocaleString('en-GB', {
                                            day: '2-digit',
                                            month: '2-digit', 
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                            hour12: false
                                        }) :
                                        new Date(rec.timestamp).toLocaleString('en-GB', {
                                            day: '2-digit',
                                            month: '2-digit', 
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                            hour12: false
                                        })
                                    }
                                </div>
                            </div>
                            <div className="camera-footer" style={{justifyContent: 'space-between'}}>
                                <div className="camera-name">{rec.camera_name}</div>
                                <button className="control-btn close-btn" onClick={() => handleDelete(rec.id)} title="Delete">🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        )}

      </div>

      {/* --- NEW MODAL DESIGN (Matches your photo) --- */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content-styled">
            <button className="modal-close-icon" onClick={() => setShowModal(false)}>×</button>
            
            <h3>Link Your Device</h3>
            
            <div className="code-box-styled">
                {curCode}
            </div>
            
            <p className="modal-instruction">Open the WebWatch app on your old phone and enter this code.</p>
            
            <div className="modal-steps">
                <div className="step-item">
                    <div className="step-icon">📱</div>
                    <div className="step-text">
                        <strong>1. Open WebWatch</strong>
                        <span>on old phone</span>
                    </div>
                </div>
                <div className="step-item">
                    <div className="step-icon">💬</div>
                    <div className="step-text">
                        <strong>2. Enter this code</strong>
                        <span style={{color: '#00f2ff'}}>{curCode}</span>
                    </div>
                </div>
                <div className="step-item">
                    <div className="step-icon">📹</div>
                    <div className="step-text">
                        <strong>3. Start Streaming</strong>
                        <span>Allow camera access</span>
                    </div>
                </div>
            </div>

            <button className="modal-copy-btn" onClick={finishPairing}>
                Done / Copy Code
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Overlay */}
      {fullscreenCamera && (
        <div className="fullscreen-overlay">
           <button className="fullscreen-close" onClick={() => setFullscreenCamera(null)}>×</button>
           <video 
             autoPlay playsInline muted className="fullscreen-video"
             ref={el => { if(el && streamsRef.current[fullscreenCamera.code]) el.srcObject = streamsRef.current[fullscreenCamera.code]; }}
           />
        </div>
      )}
    </div>
  );
}

export default Dashboard;