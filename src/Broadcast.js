import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css'; // Magic Line: Purana design reuse kar rahe hain! 😎
import { SOCKET_URL } from './config';
import { registerCamera } from './api';
import io from 'socket.io-client';

function Broadcast() {
  const [enteredCode, setEnteredCode] = useState("");
  const [status, setStatus] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [socket, setSocket] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const navigate = useNavigate();

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Camera device connected to server');
      setStatus('Connected to server');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setStatus('Disconnected from server');
    });

    newSocket.on('connected', (data) => {
      console.log('Server confirmation:', data);
    });

    newSocket.on('join_room_success', (data) => {
      console.log('Room join success:', data);
      setStatus(`Connected to room: ${data.room_code}`);
    });

    newSocket.on('join_room_error', (data) => {
      console.error('Room join error:', data);
      setStatus(`Error: ${data.message}`);
    });

    // Listen for WebRTC offer (when viewer wants to connect)
    newSocket.on('offer', (data) => {
      console.log('Received offer from viewer:', data);
      // TODO: Handle WebRTC offer and create answer
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      newSocket.close();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Start camera stream
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      setIsStreaming(true);
      setStatus('Camera started');
    } catch (error) {
      console.error('Error accessing camera:', error);
      setStatus('Error: Could not access camera. Please allow camera permissions.');
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setStatus('Camera stopped');
  };

  const handleStartStream = async () => {
    // Validation
    if (enteredCode.length !== 6 || !/^\d+$/.test(enteredCode)) {
      setStatus("Please enter a valid 6-digit code.");
      return;
    }

    setStatus('Connecting...');

    // Start camera first
    await startCamera();

    // Join room with entered code (as camera)
    if (socket) {
      socket.emit('join_room', {
        code: enteredCode,
        type: 'camera'
      });

      // Register camera with backend
      const result = await registerCamera(`Camera-${enteredCode}`);
      if (result.success) {
        setStatus(`Streaming started! Code: ${enteredCode}`);
        setIsStreaming(true);
      } else {
        setStatus('Camera registered but streaming may be limited');
      }
    } else {
      setStatus('Error: Not connected to server');
    }
  };

  return (
    // 'login-container' use kiya taaki background dark blue ho jaye
    <div className="login-container">
      
      {/* 'login-card' use kiya taaki beech wala glowing box aa jaye */}
      <div className="login-card">
        
        {/* Brand Logo */}
        <div className="brand">
          <span>⭕</span> WebWatch
        </div>

        <h2>Link This Device</h2>

        <div className="input-group">
          <input 
            type="text" 
            placeholder="Enter 6-Digit Code" 
            value={enteredCode}
            onChange={(e) => {
              // Only allow numbers
              const value = e.target.value.replace(/\D/g, '');
              setEnteredCode(value);
            }}
            maxLength="6"
            disabled={isStreaming}
            // Thoda sa custom style taaki code bada aur center mein dikhe
            style={{ textAlign: 'center', letterSpacing: '5px', fontSize: '20px', fontWeight: 'bold' }}
          />
        </div>

        {/* Status message */}
        {status && (
          <div style={{ 
            color: isStreaming ? '#4caf50' : '#888', 
            fontSize: '14px', 
            marginBottom: '15px',
            textAlign: 'center',
            minHeight: '20px'
          }}>
            {status}
          </div>
        )}

        {/* Video preview (when streaming) */}
        {isStreaming && (
          <div style={{
            marginBottom: '20px',
            borderRadius: '10px',
            overflow: 'hidden',
            backgroundColor: '#000'
          }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                maxHeight: '200px',
                objectFit: 'contain'
              }}
            />
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
          {!isStreaming ? (
            <button 
              className="login-btn" 
              onClick={handleStartStream}
              disabled={enteredCode.length !== 6}
            >
              Start Streaming
            </button>
          ) : (
            <button 
              className="login-btn" 
              onClick={stopCamera}
              style={{ backgroundColor: '#ff4444' }}
            >
              Stop Streaming
            </button>
          )}
        </div>

        {/* Wapas jaane ka raasta */}
        <p className="signup-text">
          <Link to="/" className="signup-link">Cancel & Go Back</Link>
        </p>

      </div>
    </div>
  );
}

export default Broadcast;