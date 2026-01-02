import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SOCKET_URL } from './config';
import io from 'socket.io-client';
import './Login.css'; // Uses your original CSS

function Broadcast() {
  const { id } = useParams();
  const [enteredCode, setEnteredCode] = useState(id || "");
  const [status, setStatus] = useState(""); // Blank initially to look clean
  const [isStreaming, setIsStreaming] = useState(false);
  const [socket, setSocket] = useState(null);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  
  useEffect(() => {
    // ⚡ V3 LOGIC (The Brain): Polling + HTTPS + 100MB Buffer
    const newSocket = io(SOCKET_URL, { 
        secure: false, 
        rejectUnauthorized: false 
    });

    newSocket.on('connect', () => {
        console.log("✅ Connected to Server");
        setStatus("Connected to server");
    });
    
    // Status Updates
    newSocket.on('join_room_success', (data) => {
        console.log("🚪 Room joined successfully:", data);
        setStatus("Waiting for Dashboard...");
    });
    
    newSocket.on('join_room_error', (data) => {
        console.log("❌ Room join error:", data);
        setStatus("❌ Invalid Code");
    });
    
    // WebRTC Logic
    newSocket.on('answer', async (data) => {
        console.log("📥 Received answer:", data);
        if(window.pc) {
            await window.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            setStatus("🟢 LIVE");
        }
    });
    
    newSocket.on('ice-candidate', async (data) => {
        console.log("🧊 Received ICE candidate:", data);
        if(window.pc) await window.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    });

    setSocket(newSocket);

    // Handle page unload/refresh
    const handleBeforeUnload = () => {
      if (newSocket && enteredCode && isStreaming) {
        newSocket.emit('stream_ended', { room_code: String(enteredCode) });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      handleBeforeUnload();
      newSocket.close();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handleStartStream = async () => {
    if(!enteredCode || enteredCode.length < 6) return alert("Please enter the 6-digit code");
    
    const room = String(enteredCode); // ⚡ FIX: Force String
    console.log("🔄 Starting stream for room:", room);

    try {
        // 1. Get Camera
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment', width: { ideal: 640 } }, 
            audio: false 
        });
        streamRef.current = stream;
        setIsStreaming(true);
        console.log("📹 Camera stream obtained");

        // 2. Join Room
        console.log("🚪 Joining room:", room);
        socket.emit('join_room', { code: room });
        setStatus("Connecting...");

        // 3. Setup Connection
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        window.pc = pc;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        console.log("🔗 WebRTC connection setup");

        pc.onicecandidate = (e) => {
            if(e.candidate) {
                console.log("🧊 Sending ICE candidate");
                socket.emit('ice-candidate', { candidate: e.candidate, room_code: room });
            }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log("📤 Sending offer");
        socket.emit('offer', { offer, room_code: room });

    } catch (err) {
        console.error("❌ Stream error:", err);
        setStatus("❌ Camera Permission Denied");
    }
  };

  const stopCamera = () => {
      // Emit stream ended event before stopping
      if (socket && enteredCode) {
        socket.emit('stream_ended', { room_code: String(enteredCode) });
      }
      
      // Stop all tracks
      if(streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      
      // Close WebRTC connection
      if(window.pc) {
        window.pc.close();
        window.pc = null;
      }
      
      // Reset state
      setIsStreaming(false);
      setStatus("");
      streamRef.current = null;
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="brand"><span>⭕</span> WebWatch</div>
        <h2>Link This Device</h2>

        {/* Video Player */}
        {isStreaming && (
             <div style={{marginBottom: '20px', borderRadius: '10px', overflow: 'hidden', background: '#000', border: '1px solid #333'}}>
                <video ref={el => {if(el) el.srcObject = streamRef.current}} autoPlay playsInline muted style={{width: '100%'}} />
             </div>
        )}

        {/* Status Text */}
        {status && <div style={{color: status.includes('🟢') ? '#4caf50' : '#ff4444', marginBottom: '15px'}}>{status}</div>}

        {/* Input Field */}
        <div className="input-group">
          <input 
            type="text" 
            placeholder="Enter 6-Digit Code" 
            value={enteredCode}
            onChange={(e) => setEnteredCode(e.target.value)}
            disabled={isStreaming}
            style={{ textAlign: 'center', letterSpacing: '5px', fontWeight: 'bold' }}
          />
        </div>

        {/* Buttons */}
        {!isStreaming ? (
            <button className="login-btn" onClick={handleStartStream}>Start Streaming</button>
        ) : (
            <button className="login-btn" onClick={stopCamera} style={{backgroundColor: '#ff4444'}}>Stop Streaming</button>
        )}

        <p className="signup-text">
          <Link to="/" className="signup-link">Cancel & Go Back</Link>
        </p>
      </div>
    </div>
  );
}

export default Broadcast;