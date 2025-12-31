import React, { useState, useEffect, useRef } from 'react';
import { generateCode } from './api';
import { SOCKET_URL } from './config';
import io from 'socket.io-client';
import './Dashboard.css'; // Uses your original CSS

function Dashboard() {
  const [cameras, setCameras] = useState([]);
  const [socket, setSocket] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [curCode, setCurCode] = useState('');
  
  // These hold the live video connections
  const streamsRef = useRef({});
  const pcRef = useRef({});

  useEffect(() => {
    // ⚡ V3 LOGIC: Working Connection
    const newSocket = io(SOCKET_URL, { secure: true, rejectUnauthorized: false });

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

  const handleAdd = async () => {
    const res = await generateCode();
    if(res.success) {
        setCurCode(String(res.code));
        setShowModal(true);
        if(socket) socket.emit('join_room', { code: String(res.code) });
    }
  };

  const finishPairing = () => {
    setCameras([...cameras, { id: Date.now(), name: `Camera ${cameras.length+1}`, code: curCode, status: 'Waiting...' }]);
    setShowModal(false);
  };

  return (
    <div className="dashboard-container">
      {/* 1. Sidebar */}
      <div className="sidebar">
        <div className="brand"><span>⭕</span> WebWatch</div>
        <div className="menu-item active">📷 My Cameras</div>
        <div className="menu-item">📼 Recordings</div>
        <div className="menu-item">⚙️ Settings</div>
        <div className="menu-item logout">Log Out</div>
      </div>

      {/* 2. Main Content */}
      <div className="main-content">
        <div className="header">
            <h2>My Cameras</h2>
            <button className="add-btn" onClick={handleAdd}>+ Add New Camera</button>
        </div>
        
        {/* 3. Camera Grid */}
        <div className="camera-grid">
            {cameras.map(cam => (
              <div key={cam.id} className="camera-card">
                <div className="video-wrapper">
                   {/* This Ref trick attaches the live stream to the video tag */}
                   <video 
                     autoPlay playsInline muted 
                     ref={el => { 
                         if(el && streamsRef.current[cam.code]) el.srcObject = streamsRef.current[cam.code]; 
                     }}
                   />
                   <div className="status-badge" style={{background: cam.status === 'Live' ? '#00e676' : '#ff9100'}}>
                       ● {cam.status}
                   </div>
                   <div className="code-overlay">Code: {cam.code}</div>
                </div>
                <div className="card-footer">
                    <h3>{cam.name}</h3>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* 4. Code Popup Modal */}
      {showModal && (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Link New Device</h3>
                <div className="code-box">{curCode}</div>
                <p>Enter this code on your mobile phone.</p>
                <button className="modal-btn" onClick={finishPairing}>Done</button>
            </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;