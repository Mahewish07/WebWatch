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
  const [peerConnection, setPeerConnection] = useState(null);
  const [codeValidated, setCodeValidated] = useState(false);
  const [validationError, setValidationError] = useState("");
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
      setStatus(`✅ Code validated! Room: ${data.room_code}`);
      setCodeValidated(true);
      setValidationError("");
    });

    newSocket.on('join_room_error', (data) => {
      console.error('Room join error:', data);
      setStatus(`❌ Invalid Code: ${data.message}`);
      setValidationError("Invalid code! Please check and try again.");
      setCodeValidated(false);
      
      // Reset form to allow retry
      setIsStreaming(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    });

    newSocket.on('room_update', (data) => {
      console.log('📡 Room update:', data);
      setStatus(`📡 Room ${data.room_code}: ${data.total_clients} connected`);
      
      // If viewer joined and we have stream, start WebRTC immediately
      if (data.total_clients >= 2 && streamRef.current && enteredCode === data.room_code) {
        console.log('🎯 Viewer joined! Starting WebRTC offer for room:', data.room_code);
        setTimeout(() => createWebRTCOffer(data.room_code), 1500); // Increased delay
      }
    });

    // WebRTC Signaling Events
    newSocket.on('answer', async (data) => {
      console.log('📨 Received answer from viewer:', data);
      if (peerConnection) {
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
          console.log('✅ Answer processed successfully');
          setStatus('🎥 Live streaming active!');
        } catch (error) {
          console.error('❌ Error processing answer:', error);
          setStatus('❌ Connection failed');
        }
      }
    });

    newSocket.on('ice_candidate', async (data) => {
      console.log('📨 Received ICE candidate from viewer:', data);
      if (peerConnection) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
          console.log('✅ ICE candidate added');
        } catch (error) {
          console.error('❌ Error adding ICE candidate:', error);
        }
      }
    });

    newSocket.on('signaling_error', (data) => {
      console.error('❌ Signaling error:', data);
      setStatus('❌ Signaling error: ' + data.message);
    });

    // Listen for WebRTC offer (when viewer wants to connect)
    newSocket.on('offer', (data) => {
      console.log('Received offer from viewer:', data);
      // TODO: Handle WebRTC offer and create answer
    });

    setSocket(newSocket);

    // Cleanup on component unmount
    return () => {
      // Stop camera if streaming
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Close peer connection
      if (peerConnection) {
        peerConnection.close();
      }
      
      // Leave room if connected
      if (enteredCode) {
        newSocket.emit('leave_room', {
          code: enteredCode,
          type: 'camera'
        });
      }
      
      newSocket.close();
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
    
    // Close peer connection
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    
    // Leave the room to notify dashboard
    if (socket && enteredCode) {
      socket.emit('leave_room', {
        code: enteredCode,
        type: 'camera'
      });
    }
    
    setIsStreaming(false);
    setStatus('Camera stopped');
  };

  // WebRTC Functions
  const createWebRTCOffer = async (roomCode) => {
    try {
      console.log('Creating WebRTC offer for room:', roomCode);
      setStatus('🔄 Creating WebRTC connection...');
      
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      setPeerConnection(pc);

      // Add local stream to peer connection
      if (streamRef.current) {
        console.log('Adding tracks to peer connection');
        streamRef.current.getTracks().forEach(track => {
          console.log('Adding track:', track.kind);
          pc.addTrack(track, streamRef.current);
        });
      } else {
        console.error('No stream available for WebRTC');
        setStatus('❌ No camera stream available');
        return;
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          console.log('📤 Sending ICE candidate to viewer');
          socket.emit('ice_candidate', {
            candidate: event.candidate,
            room_code: roomCode
          });
        }
      };

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', pc.connectionState);
        switch (pc.connectionState) {
          case 'connected':
            setStatus('🎥 Live streaming connected!');
            break;
          case 'disconnected':
            setStatus('⚠️ Connection lost');
            break;
          case 'failed':
            setStatus('❌ Connection failed');
            break;
          case 'connecting':
            setStatus('🔄 Connecting to viewer...');
            break;
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', pc.iceConnectionState);
      };

      // Create and send offer
      console.log('Creating offer...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socket) {
        console.log('Sending offer to room:', roomCode);
        socket.emit('offer', {
          offer: offer,
          room_code: roomCode
        });
        setStatus('📡 WebRTC offer sent! Waiting for viewer...');
      } else {
        console.error('Socket not available');
        setStatus('❌ Connection error');
      }

    } catch (error) {
      console.error('WebRTC offer error:', error);
      setStatus('❌ WebRTC connection failed: ' + error.message);
    }
  };

  // Validate code before starting camera
  const validateCode = async () => {
    // Validation
    if (enteredCode.length !== 6 || !/^\d+$/.test(enteredCode)) {
      setValidationError("Please enter a valid 6-digit code.");
      setStatus("Please enter a valid 6-digit code.");
      return false;
    }

    setStatus('🔄 Validating code...');
    setValidationError("");

    // Try to join room to validate code
    if (socket) {
      socket.emit('join_room', {
        code: enteredCode,
        type: 'camera'
      });
      
      // Wait for validation response
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          setValidationError("Code validation timeout. Please try again.");
          setStatus("❌ Code validation failed");
          resolve(false);
        }, 5000);

        const successHandler = () => {
          clearTimeout(timeout);
          socket.off('join_room_success', successHandler);
          socket.off('join_room_error', errorHandler);
          resolve(true);
        };

        const errorHandler = () => {
          clearTimeout(timeout);
          socket.off('join_room_success', successHandler);
          socket.off('join_room_error', errorHandler);
          resolve(false);
        };

        socket.on('join_room_success', successHandler);
        socket.on('join_room_error', errorHandler);
      });
    }
    
    return false;
  };

  const handleStartStream = async () => {
    // First validate the code
    const isValid = await validateCode();
    
    if (!isValid) {
      return; // Don't start camera if code is invalid
    }

    setStatus('🔄 Starting camera...');

    try {
      // Start camera
      await startCamera();
      
      // Register camera with backend
      const result = await registerCamera(`Camera-${enteredCode}`);
      if (result.success) {
        setStatus(`✅ Camera registered! Code: ${enteredCode}`);
        
        // Wait a bit then create WebRTC offer
        setTimeout(() => {
          if (streamRef.current) {
            console.log('🚀 Auto-creating WebRTC offer...');
            createWebRTCOffer(enteredCode);
          }
        }, 2000);
        
      } else {
        setStatus('⚠️ Camera registered but streaming may be limited');
      }
    } catch (error) {
      setStatus('❌ Failed to start camera');
      setValidationError("Camera access denied. Please allow camera permissions.");
    }
  };

  // Reset form for retry
  const resetForm = () => {
    setEnteredCode("");
    setStatus("");
    setValidationError("");
    setCodeValidated(false);
    setIsStreaming(false);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
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
              // Clear validation error when user types
              if (validationError) {
                setValidationError("");
                setStatus("");
              }
            }}
            maxLength="6"
            disabled={isStreaming}
            // Thoda sa custom style taaki code bada aur center mein dikhe
            style={{ 
              textAlign: 'center', 
              letterSpacing: '5px', 
              fontSize: '20px', 
              fontWeight: 'bold',
              borderColor: validationError ? '#ff4444' : '#333'
            }}
          />
        </div>

        {/* Validation Error */}
        {validationError && (
          <div style={{ 
            color: '#ff4444', 
            fontSize: '14px', 
            marginBottom: '15px',
            textAlign: 'center',
            backgroundColor: 'rgba(255, 68, 68, 0.1)',
            padding: '10px',
            borderRadius: '5px',
            border: '1px solid #ff4444'
          }}>
            ❌ {validationError}
          </div>
        )}

        {/* Status message */}
        {status && !validationError && (
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
            <>
              <button 
                className="login-btn" 
                onClick={handleStartStream}
                disabled={enteredCode.length !== 6}
              >
                Start Streaming
              </button>
              
              {/* Retry button for invalid codes */}
              {validationError && (
                <button 
                  className="login-btn" 
                  onClick={resetForm}
                  style={{ backgroundColor: '#ffc107', color: '#000' }}
                >
                  Try Again
                </button>
              )}
            </>
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