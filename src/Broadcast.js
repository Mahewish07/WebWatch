import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SOCKET_URL } from './config';
import io from 'socket.io-client';
import './Login.css'; 

function Broadcast() {
  const { id } = useParams();
  const [enteredCode, setEnteredCode] = useState(() => {
    // Load saved code from localStorage
    return id || localStorage.getItem('webwatch_mobile_code') || "";
  });
  const [status, setStatus] = useState(""); 
  const [isStreaming, setIsStreaming] = useState(() => {
    // Check if was streaming before refresh
    return localStorage.getItem('webwatch_mobile_streaming') === 'true';
  });
  const [connectionLost, setConnectionLost] = useState(false);
  const [socket, setSocket] = useState(null);
  const streamRef = useRef(null);
  
  useEffect(() => {
    const newSocket = io(SOCKET_URL, { 
      transports: ['polling'], 
      secure: true, 
      rejectUnauthorized: false,
      reconnection: true,
      reconnectionDelay: 1000
    });
    
    newSocket.on('connect', () => {
      console.log("✅ Mobile connected to server");
      
      // Auto-reconnect if was streaming before refresh
      const wasStreaming = localStorage.getItem('webwatch_mobile_streaming') === 'true';
      const savedCode = localStorage.getItem('webwatch_mobile_code');
      
      if (wasStreaming && savedCode && !streamRef.current) {
        console.log("🔄 Auto-reconnecting after mobile refresh...");
        setEnteredCode(savedCode);
        // Trigger reconnection after socket is ready
        setTimeout(() => {
          autoReconnect(newSocket, savedCode);
        }, 500);
      }
    });
    
    // Listen for join room success
    newSocket.on('join_room_success', (data) => {
      console.log("✅ Successfully joined room:", data.room_code);
    });
    
    newSocket.on('answer', async (data) => {
        if(window.pc) {
            await window.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            setStatus("🟢 LIVE");
        }
    });
    
    newSocket.on('ice-candidate', async (data) => {
        if(window.pc) await window.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    });
    
    // Handle viewer rejoining (after dashboard refresh)
    newSocket.on('viewer_joined', async (data) => {
      console.log("🔄 Viewer rejoined room:", data.room_code, "Type:", data.client_type);
      
      // Only respond if it's a dashboard joining and we're the mobile streaming
      if (data.client_type === 'dashboard' && streamRef.current && window.currentRoom === data.room_code) {
        try {
          console.log("📤 Dashboard reconnected! Creating new peer connection and sending offer...");
          
          // Close old peer connection if exists
          if (window.pc) {
            console.log("🔌 Closing old peer connection");
            window.pc.close();
          }
          
          // Create new peer connection
          const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
          window.pc = pc;
          
          // Add stream tracks
          streamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, streamRef.current);
            console.log("✅ Track added to new peer connection");
          });
          
          // Handle ICE candidates
          pc.onicecandidate = (e) => {
            if(e.candidate) {
              console.log("📡 Sending ICE candidate to dashboard");
              newSocket.emit('ice-candidate', { candidate: e.candidate, room_code: data.room_code });
            }
          };
          
          // Monitor connection state
          pc.onconnectionstatechange = () => {
            console.log(`📡 Mobile connection state: ${pc.connectionState}`);
            if (pc.connectionState === 'connected') {
              setStatus("🟢 LIVE");
              setConnectionLost(false);
            } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
              setStatus("⚠️ Connection lost");
              setConnectionLost(true);
            }
          };
          
          // Create and send offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          console.log("📤 Sending new offer to dashboard");
          newSocket.emit('offer', { offer, room_code: data.room_code });
          setStatus("🔄 Reconnecting to dashboard...");
          
        } catch (error) {
          console.error("❌ Reconnection error:", error);
          setStatus("❌ Reconnection failed");
          setConnectionLost(true);
        }
      } else {
        console.log("⚠️ Ignoring viewer_joined - not applicable to this mobile device");
      }
    });
    
    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  // Auto-reconnect function after mobile refresh
  const autoReconnect = async (socketInstance, code) => {
    try {
      console.log("🔄 Starting auto-reconnection...");
      setStatus("🔄 Reconnecting...");
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 640 } }, 
        audio: false 
      });
      
      streamRef.current = stream;
      setIsStreaming(true);
      window.currentRoom = code;

      socketInstance.emit('join_room', { code: code, client_type: 'mobile' });

      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      window.pc = pc;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (e) => {
        if(e.candidate) socketInstance.emit('ice-candidate', { candidate: e.candidate, room_code: code });
      };

      pc.onconnectionstatechange = () => {
        console.log(`📡 Mobile connection state: ${pc.connectionState}`);
        if (pc.connectionState === 'connected') {
          setStatus("🟢 LIVE");
          setConnectionLost(false);
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setStatus("⚠️ Connection lost");
          setConnectionLost(true);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketInstance.emit('offer', { offer, room_code: code });
      
      console.log("✅ Auto-reconnection successful");
    } catch (err) {
      console.error("❌ Auto-reconnection failed:", err);
      setStatus("❌ Reconnection failed");
      // Clear localStorage if reconnection fails
      localStorage.removeItem('webwatch_mobile_streaming');
      setIsStreaming(false);
    }
  };

  const handleStartStream = async () => {
    const room = String(enteredCode); 
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 640 } }, audio: false });
        streamRef.current = stream;
        setIsStreaming(true);

        // Store room code and streaming state for reconnection
        window.currentRoom = room;
        localStorage.setItem('webwatch_mobile_code', room);
        localStorage.setItem('webwatch_mobile_streaming', 'true');

        socket.emit('join_room', { code: room, client_type: 'mobile' });
        setStatus("Connecting...");

        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        window.pc = pc;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.onicecandidate = (e) => {
            if(e.candidate) socket.emit('ice-candidate', { candidate: e.candidate, room_code: room });
        };

        pc.onconnectionstatechange = () => {
          console.log(`📡 Mobile connection state: ${pc.connectionState}`);
          if (pc.connectionState === 'connected') {
            setStatus("🟢 LIVE");
            setConnectionLost(false);
          } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            setStatus("⚠️ Connection lost");
            setConnectionLost(true);
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { offer, room_code: room });

    } catch (err) {
        console.error(err);
        setStatus("❌ Camera Error");
    }
  };

  const handleReconnect = async () => {
    const savedCode = localStorage.getItem('webwatch_mobile_code');
    if (!savedCode || !socket) {
      setStatus("❌ No saved connection");
      return;
    }

    try {
      console.log("🔄 Manual reconnection started...");
      setStatus("🔄 Reconnecting...");
      setConnectionLost(false);

      // Close old peer connection if exists
      if (window.pc) {
        window.pc.close();
      }

      // Rejoin room
      socket.emit('join_room', { code: savedCode, client_type: 'mobile' });

      // Create new peer connection
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      window.pc = pc;

      // Add existing stream tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, streamRef.current);
          console.log("✅ Track added to new peer connection");
        });
      }

      pc.onicecandidate = (e) => {
        if(e.candidate) socket.emit('ice-candidate', { candidate: e.candidate, room_code: savedCode });
      };

      pc.onconnectionstatechange = () => {
        console.log(`📡 Mobile connection state: ${pc.connectionState}`);
        if (pc.connectionState === 'connected') {
          setStatus("🟢 LIVE");
          setConnectionLost(false);
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setStatus("⚠️ Connection lost");
          setConnectionLost(true);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { offer, room_code: savedCode });

      console.log("✅ Reconnection offer sent");
    } catch (err) {
      console.error("❌ Reconnection failed:", err);
      setStatus("❌ Reconnection failed");
      setConnectionLost(true);
    }
  };

  const stopCamera = () => {
      if(streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      // Clear localStorage when stopping
      localStorage.removeItem('webwatch_mobile_streaming');
      localStorage.removeItem('webwatch_mobile_code');
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
            <>
              <button className="login-btn" onClick={stopCamera} style={{backgroundColor: '#ff4444'}}>Stop Streaming</button>
              {connectionLost && (
                <button 
                  className="login-btn" 
                  onClick={handleReconnect} 
                  style={{backgroundColor: '#ff9800', marginTop: '10px'}}
                >
                  🔄 Reconnect
                </button>
              )}
            </>
        )}
        <p className="signup-text"><Link to="/" className="signup-link">Cancel & Go Back</Link></p>
      </div>
    </div>
  );
}
export default Broadcast;