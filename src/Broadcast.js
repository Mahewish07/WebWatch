import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SOCKET_URL } from './config';
import io from 'socket.io-client';
import './Login.css'; 

function Broadcast() {
  const { id } = useParams();
  const [enteredCode, setEnteredCode] = useState(id || "");
  const [status, setStatus] = useState(""); 
  const [isStreaming, setIsStreaming] = useState(false);
  const [socket, setSocket] = useState(null);
  const streamRef = useRef(null);
  
  useEffect(() => {
    const newSocket = io(SOCKET_URL, { transports: ['polling'], secure: true, rejectUnauthorized: false });
    newSocket.on('connect', () => console.log("✅ Connected"));
    newSocket.on('answer', async (data) => {
        if(window.pc) {
            await window.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            setStatus("🟢 LIVE");
        }
    });
    newSocket.on('ice-candidate', async (data) => {
        if(window.pc) await window.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    });
    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  const handleStartStream = async () => {
    const room = String(enteredCode); 
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 640 } }, audio: false });
        streamRef.current = stream;
        setIsStreaming(true);

        socket.emit('join_room', { code: room });
        setStatus("Connecting...");

        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        window.pc = pc;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.onicecandidate = (e) => {
            if(e.candidate) socket.emit('ice-candidate', { candidate: e.candidate, room_code: room });
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { offer, room_code: room });

    } catch (err) {
        console.error(err);
        setStatus("❌ Camera Error");
    }
  };

  const stopCamera = () => {
      if(streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      window.location.reload();
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="brand"><span>⭕</span> WebWatch</div>
        <h2>Link This Device</h2>
        {isStreaming && (
             <div style={{marginBottom: '20px', borderRadius: '10px', overflow: 'hidden', background: '#000', border: '1px solid #333'}}>
                <video ref={el => {if(el) el.srcObject = streamRef.current}} autoPlay playsInline muted style={{width: '100%'}} />
             </div>
        )}
        {status && <div style={{color: status.includes('🟢') ? '#4caf50' : '#ff4444', marginBottom: '15px'}}>{status}</div>}
        <div className="input-group">
          <input type="text" placeholder="Enter 6-Digit Code" value={enteredCode} onChange={(e) => setEnteredCode(e.target.value)} disabled={isStreaming} style={{ textAlign: 'center', letterSpacing: '5px', fontWeight: 'bold' }} />
        </div>
        {!isStreaming ? (
            <button className="login-btn" onClick={handleStartStream}>Start Streaming</button>
        ) : (
            <button className="login-btn" onClick={stopCamera} style={{backgroundColor: '#ff4444'}}>Stop Streaming</button>
        )}
        <p className="signup-text"><Link to="/" className="signup-link">Cancel & Go Back</Link></p>
      </div>
    </div>
  );
}
export default Broadcast;