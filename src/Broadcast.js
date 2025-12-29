import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css'; 
import { SOCKET_URL } from './config';
import { registerCamera } from './api';
import io from 'socket.io-client';

function Broadcast() {
  const [enteredCode, setEnteredCode] = useState("");
  const [status, setStatus] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [socket, setSocket] = useState(null);
  const [validationError, setValidationError] = useState("");
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const iceBuffer = useRef([]); // 🧊 Candidates store karne ke liye
  
  useEffect(() => {
    const newSocket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    newSocket.on('connect', () => setStatus('Connected to server'));
    
    newSocket.on('join_room_success', () => {
      setStatus(`✅ Ready! Code: ${enteredCode}`);
      setValidationError("");
    });

    newSocket.on('join_room_error', () => {
      setStatus(`❌ Invalid Code`);
      setValidationError("Invalid code! Try again.");
      setIsStreaming(false);
    });

    newSocket.on('room_update', (data) => {
      if (data.total_clients >= 2 && streamRef.current && enteredCode === String(data.room_code)) {
        console.log('Dashboard detected! Starting Call...');
        setStatus('Dashboard Joined! Connecting...');
        startWebRTC(newSocket, data.room_code);
      }
    });

    newSocket.on('answer', async (data) => {
      const pc = window.pc; 
      if (pc) {
        try {
          console.log("✅ Received Answer from Dashboard");
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          
          // 🚀 MAGIC: Answer milne ke baad hi Candidates bhejo!
          console.log(`Flushing ${iceBuffer.current.length} buffered candidates...`);
          iceBuffer.current.forEach(candidate => {
             newSocket.emit('ice_candidate', { 
                candidate: candidate, 
                room_code: enteredCode 
             });
          });
          iceBuffer.current = []; // Buffer clear karo
          
          setStatus('🟢 Live! Streaming...');
        } catch (error) { console.error("Answer Error:", error); }
      }
    });

    // Dashboard se candidates aayein to add karo
    newSocket.on('ice_candidate', async (data) => {
      const pc = window.pc;
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) { console.error("ICE Error:", error); }
      }
    });

    setSocket(newSocket);

    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      if (window.pc) window.pc.close();
      newSocket.close();
    };
  }, [enteredCode]); 

  // Local Video Player
  useEffect(() => {
    if (isStreaming && videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(e => console.error("Local Play Error:", e));
    }
  }, [isStreaming]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
            facingMode: 'environment',
            width: { ideal: 640 }, 
            height: { ideal: 480 }
        }, 
        audio: false 
      });
      streamRef.current = stream;
      setIsStreaming(true);
      setStatus('Camera started');
    } catch (error) {
      console.error('Camera Error:', error);
      setStatus('Error: Camera Permission Denied!');
      setValidationError("Check browser camera permission.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    setIsStreaming(false);
    window.location.reload();
  };

  // --- SMART BUFFERED WEBRTC ---
  const startWebRTC = async (socketInstance, roomCode) => {
    if (window.pc) window.pc.close(); 
    iceBuffer.current = []; // Naya call, naya buffer

    const pc = new RTCPeerConnection({ 
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] 
    });
    window.pc = pc; 

    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => pc.addTrack(track, streamRef.current));
    }

    // 👇 Yahan hai asli JADU: Candidates ko turant mat bhejo, Buffer me daalo
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            // Agar remoteDescription set ho chuki hai (Answer mil gaya hai), to bhejo
            if (pc.remoteDescription) {
                socketInstance.emit('ice_candidate', { 
                    candidate: event.candidate, 
                    room_code: roomCode 
                });
            } else {
                // Agar nahi, to Pocket (Buffer) me rakho
                console.log("Buffering Candidate...");
                iceBuffer.current.push(event.candidate);
            }
        }
    };

    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        if (socketInstance) {
            console.log("Sending Offer...");
            socketInstance.emit('offer', { offer: offer, room_code: roomCode });
            setStatus('📡 Sending Signal... Waiting for Dashboard');
        }
    } catch (e) { console.error("Offer Error:", e); }
  };

  const handleRestart = () => {
      if(socket && enteredCode) {
          setStatus('🔄 Retrying...');
          startWebRTC(socket, enteredCode);
      }
  };

  const handleStartStream = async () => {
    if (enteredCode.length !== 6) return setValidationError("Enter 6-digit code.");
    if (socket) {
      socket.emit('join_room', { code: enteredCode, type: 'camera' });
      await startCamera(); 
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="brand"><span>⭕</span> WebWatch</div>
        <h2>Link This Device</h2>

        <div className="input-group">
          <input 
            type="text" 
            placeholder="Enter 6-Digit Code" 
            value={enteredCode}
            onChange={(e) => {
              setEnteredCode(e.target.value.replace(/\D/g, ''));
              setValidationError("");
            }}
            maxLength="6"
            disabled={isStreaming}
            style={{ textAlign: 'center', letterSpacing: '5px', fontSize: '20px', fontWeight: 'bold', borderColor: validationError ? '#ff4444' : '#333' }}
          />
        </div>

        {validationError && (
            <div style={{color:'red', textAlign:'center', marginBottom:'10px'}}>❌ {validationError}</div>
        )}

        {status && !validationError && (
          <div style={{ color: isStreaming ? '#4caf50' : '#888', fontSize: '14px', marginBottom: '15px', textAlign: 'center'}}>
            {status}
          </div>
        )}

        {isStreaming && (
          <div style={{ marginBottom: '20px', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#000' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', maxHeight: '200px', objectFit: 'contain' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
          {!isStreaming ? (
            <button className="login-btn" onClick={handleStartStream} disabled={enteredCode.length !== 6}>Start Streaming</button>
          ) : (
            <>
                <button className="login-btn" onClick={stopCamera} style={{ backgroundColor: '#ff4444' }}>Stop Streaming</button>
                <button onClick={handleRestart} style={{background:'transparent', border:'1px solid #4caf50', color:'#4caf50', padding:'10px', borderRadius:'5px', cursor:'pointer'}}>
                    🔄 Force Retry (Use if stuck)
                </button>
            </>
          )}
        </div>

        <p className="signup-text">
          <Link to="/" className="signup-link">Cancel & Go Back</Link>
        </p>
      </div>
    </div>
  );
}

export default Broadcast;