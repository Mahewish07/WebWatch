import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css'; // Magic Line: Purana design reuse kar rahe hain! 😎
import { SOCKET_URL } from './config';
import { registerCamera } from './api';
import io from 'socket.io-client';
import VideoFallback from './VideoFallback';

function Broadcast() {
  const [enteredCode, setEnteredCode] = useState("");
  const [status, setStatus] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [socket, setSocket] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [codeValidated, setCodeValidated] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [fallbackSystem, setFallbackSystem] = useState(null);
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
      console.log('📡 Camera room update:', data);
      setStatus(`📡 Room ${data.room_code}: ${data.total_clients} connected`);
      
      // If dashboard joined and we have stream, start WebRTC immediately
      if (data.total_clients >= 2 && streamRef.current && enteredCode === data.room_code) {
        console.log('🎯 Dashboard connected! Starting WebRTC offer for room:', data.room_code);
        // Start WebRTC with shorter delay
        setTimeout(() => {
          createWebRTCOffer(data.room_code);
        }, 1000);
      }
      
      // If we're alone in room, show waiting status
      if (data.total_clients === 1 && enteredCode === data.room_code) {
        setStatus('⏳ Waiting for dashboard to connect...');
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

    newSocket.on('ice-candidate', async (data) => {
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
      console.log('🎥 Requesting camera access...');
      setStatus('🎥 Starting camera...');
      
      // Request camera with optimal settings
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'environment' // Use back camera if available
        },
        audio: false
      });
      
      console.log('✅ Camera access granted');
      console.log('Stream details:', {
        id: stream.id,
        active: stream.active,
        tracks: stream.getTracks().map(t => ({
          kind: t.kind,
          label: t.label,
          enabled: t.enabled,
          readyState: t.readyState
        }))
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to load metadata
        videoRef.current.onloadedmetadata = () => {
          console.log('📹 Video metadata loaded:', {
            videoWidth: videoRef.current.videoWidth,
            videoHeight: videoRef.current.videoHeight,
            duration: videoRef.current.duration
          });
        };
      }
      
      setIsStreaming(true);
      setStatus('✅ Camera started successfully');
      
    } catch (error) {
      console.error('❌ Camera access error:', error);
      let errorMessage = 'Could not access camera. ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera permissions and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Camera is being used by another application.';
      } else {
        errorMessage += error.message;
      }
      
      setStatus('❌ ' + errorMessage);
      setValidationError(errorMessage);
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
    
    // Stop fallback system
    if (fallbackSystem) {
      fallbackSystem.stop();
      setFallbackSystem(null);
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
      console.log('🚀 Creating WebRTC offer for room:', roomCode);
      setStatus('🔄 Creating WebRTC connection...');
      
      // Close existing peer connection if any
      if (peerConnection) {
        peerConnection.close();
      }
      
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      });

      setPeerConnection(pc);

      // Add local stream to peer connection
      if (streamRef.current) {
        console.log('📹 Adding camera tracks to peer connection');
        const tracks = streamRef.current.getTracks();
        tracks.forEach(track => {
          console.log(`Adding ${track.kind} track:`, track.label);
          pc.addTrack(track, streamRef.current);
        });
        console.log(`✅ Added ${tracks.length} tracks to peer connection`);
      } else {
        console.error('❌ No camera stream available for WebRTC');
        setStatus('❌ No camera stream available');
        return;
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          console.log('📤 Sending ICE candidate to dashboard');
          socket.emit('ice-candidate', {  // Changed from ice_candidate to ice-candidate
            candidate: event.candidate,
            room_code: roomCode
          });
        } else if (!event.candidate) {
          console.log('🏁 ICE gathering complete');
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
            setStatus('⚠️ Connection lost - attempting reconnect...');
            break;
          case 'failed':
            setStatus('❌ Connection failed - activating fallback...');
            // Activate fallback system
            activateFallbackSystem();
            break;
          case 'connecting':
            setStatus('🔄 Connecting to dashboard...');
            break;
          case 'new':
            setStatus('🔄 Initializing connection...');
            break;
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed') {
          console.log('🔄 ICE connection failed, restarting...');
          pc.restartIce();
        }
      };

      // Create and send offer
      console.log('📝 Creating WebRTC offer...');
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false
      });
      
      await pc.setLocalDescription(offer);
      console.log('✅ Local description set');

      if (socket) {
        console.log('📡 Sending offer to dashboard for room:', roomCode);
        socket.emit('offer', {
          offer: offer,
          room_code: roomCode
        });
        setStatus('📡 WebRTC offer sent! Waiting for dashboard...');
      } else {
        console.error('❌ Socket not available');
        setStatus('❌ Connection error - socket unavailable');
      }

    } catch (error) {
      console.error('❌ WebRTC offer error:', error);
      setStatus('❌ WebRTC connection failed: ' + error.message);
      
      // Auto-retry after 5 seconds
      setTimeout(() => {
        if (streamRef.current && enteredCode) {
          console.log('🔄 Auto-retrying WebRTC connection...');
          createWebRTCOffer(enteredCode);
        }
      }, 5000);
    }
  };

  // Activate fallback system when WebRTC fails
  const activateFallbackSystem = () => {
    console.log('🔄 Activating fallback streaming system...');
    
    if (!streamRef.current || !videoRef.current || !enteredCode) {
      console.error('❌ Cannot activate fallback: missing requirements');
      return;
    }
    
    // Create and initialize fallback system
    const fallback = new VideoFallback();
    fallback.init(enteredCode);
    
    // Start fallback streaming
    const success = fallback.startCameraStream(videoRef.current, enteredCode);
    
    if (success) {
      setFallbackSystem(fallback);
      setStatus('📡 Fallback streaming active (1s delay)');
      console.log('✅ Fallback system activated successfully');
    } else {
      setStatus('❌ Fallback system failed to start');
      console.error('❌ Failed to activate fallback system');
    }
  };

  // Validate code before starting camera
  const validateCode = async () => {
    console.log('🔍 Validating code:', enteredCode, 'Type:', typeof enteredCode);
    // Validation
    if (enteredCode.length !== 6 || !/^\d+$/.test(enteredCode)) {
      console.error('❌ Invalid code format:', enteredCode);
      setValidationError("Please enter a valid 6-digit code.");
      setStatus("Please enter a valid 6-digit code.");
      return false;
    }

    console.log('✅ Code format valid, attempting to join room...');
    setStatus('🔄 Validating code...');
    setValidationError("");

    // Try to join room to validate code
    if (socket) {
      console.log('📡 Mobile joining room as camera:', enteredCode);
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
        
        // Auto-start WebRTC if dashboard is already connected
        setTimeout(() => {
          if (streamRef.current && socket) {
            console.log('🚀 Auto-creating WebRTC offer...');
            createWebRTCOffer(enteredCode);
          }
        }, 2000);
        
      } else {
        setStatus('⚠️ Camera registered but streaming may be limited');
        
        // Still try WebRTC even if registration failed
        setTimeout(() => {
          if (streamRef.current) {
            createWebRTCOffer(enteredCode);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Failed to start camera:', error);
      setStatus('❌ Failed to start camera');
      setValidationError("Camera access denied. Please allow camera permissions and try again.");
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
    if (fallbackSystem) {
      fallbackSystem.stop();
      setFallbackSystem(null);
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