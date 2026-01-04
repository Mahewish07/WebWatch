import React, { useState, useEffect, useRef } from 'react';
import { generateCode } from './api';
import { SOCKET_URL } from './config';
import io from 'socket.io-client';
import './Dashboard.css';

function Dashboard() {
  // --- UI State ---
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [fullscreenCamera, setFullscreenCamera] = useState(null);
  const [activeTab, setActiveTab] = useState('cameras'); // 'cameras' or 'recordings'

  // --- Logic State ---
  const [cameras, setCameras] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [socket, setSocket] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [curCode, setCurCode] = useState('');

  // --- Refs ---
  const streamsRef = useRef({});
  const pcRef = useRef({});
  const recordersRef = useRef({});
  const chunksRef = useRef({});

  // 1. SETUP SOCKET
  useEffect(() => {
    const newSocket = io(SOCKET_URL, { secure: true, rejectUnauthorized: false });

    newSocket.on('offer', async (data) => {
        const room = String(data.room_code);
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        pcRef.current[room] = pc;

        pc.onicecandidate = (e) => {
            if(e.candidate) newSocket.emit('ice-candidate', { candidate: e.candidate, room_code: room });
        };

        pc.ontrack = (e) => {
            streamsRef.current[room] = e.streams[0];
            setCameras(prev => prev.map(c => c.code === room ? {...c, status: 'Live', isRecording: false} : c));
        };

        pc.onconnectionstatechange = () => {
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

  // 2. RECORDING LOGIC
  const startRecording = (code) => {
      const stream = streamsRef.current[code];
      if (!stream) return alert("No video stream!");

      const recorder = new MediaRecorder(stream);
      chunksRef.current[code] = [];

      recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current[code].push(e.data);
      };

      recorder.onstop = async () => {
          const blob = new Blob(chunksRef.current[code], { type: 'video/webm' });
          const formData = new FormData();
          formData.append('video', blob, 'recording.webm');
          formData.append('camera_name', `Camera ${code}`);

          try {
              const API_BASE = SOCKET_URL.replace('socket.io', ''); 
              const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: formData });
              if(res.ok) alert("✅ Recording Saved to Database!");
              else alert("❌ Upload Failed");
          } catch(err) {
              console.error(err);
              alert("Server Error");
          }
      };

      recorder.start();
      recordersRef.current[code] = recorder;
      setCameras(prev => prev.map(c => c.code === code ? {...c, isRecording: true} : c));
  };

  const stopRecording = (code) => {
      if(recordersRef.current[code]) {
          recordersRef.current[code].stop();
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

  const removeCamera = (id) => setCameras(cameras.filter(cam => cam.id !== id));
  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  return (
    <div className="dashboard-container">
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
                <span className="menu-icon">🚪</span><span className="menu-text">Log Out</span>
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
          </>
        )}
      </div>

      <div className="main-content">
        
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
                            <button className="control-btn maximize-btn" onClick={() => setFullscreenCamera(cam)}>⤢</button>
                            <button className="control-btn close-btn" onClick={() => removeCamera(cam.id)}>×</button>
                        </div>
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
                            <div className="camera-name">{cam.name}</div>
                        </div>

                        {/* RECORD BUTTON */}
                        {cam.status === 'Live' && (
                            <div className="camera-actions">
                                {!cam.isRecording ? (
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
                            <div className="camera-header"><span className="camera-code">{rec.timestamp}</span></div>
                            <div className="video-container" style={{background: '#000'}}>
                                <video controls className="video-feed" src={`${SOCKET_URL.replace('socket.io', '')}/recordings/${rec.filename}`} />
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