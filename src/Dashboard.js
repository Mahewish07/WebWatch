import React, { useState, useEffect, useRef } from 'react';
import { generateCode } from './api';
import { SOCKET_URL, API_ENDPOINTS } from './config';
import io from 'socket.io-client';
import './Dashboard.css';

function Dashboard() {
  // --- UI State ---
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Start collapsed on mobile devices
    return window.innerWidth <= 768;
  });
  const [fullscreenCamera, setFullscreenCamera] = useState(null);
  const [activeTab, setActiveTab] = useState('cameras'); // 'cameras', 'recordings', or 'profile'
  const [openSettingsMenu, setOpenSettingsMenu] = useState(null); // Track which camera's settings are open
  const [editingCameraName, setEditingCameraName] = useState(null); // Track which camera name is being edited
  const [tempCameraName, setTempCameraName] = useState(''); // Temporary name during editing
  const [cameraSettings, setCameraSettings] = useState(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('webwatch_camera_settings');
    return saved ? JSON.parse(saved) : {};
  });

  // Profile State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({
    username: localStorage.getItem('username') || 'User',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileInfo, setProfileInfo] = useState('');

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
  const [isLoadingRecordings, setIsLoadingRecordings] = useState(false);

  // --- Refs ---
  const streamsRef = useRef({});
  const pcRef = useRef({});
  const recordersRef = useRef({});
  const chunksRef = useRef({});
  const reconnectionTimersRef = useRef({});
  const isTogglingRef = useRef(false);

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
              c.code === cam.code ? { ...c, status: 'Reconnecting...' } : c
            ));

            // Set 10-second timeout to change status to "Waiting" if no connection
            if (reconnectionTimersRef.current[cam.code]) {
              clearTimeout(reconnectionTimersRef.current[cam.code]);
            }

            reconnectionTimersRef.current[cam.code] = setTimeout(() => {
              console.log(`⏱️ Reconnection timeout for camera: ${cam.code}`);
              setCameras(prev => prev.map(c =>
                c.code === cam.code && c.status === 'Reconnecting...'
                  ? { ...c, status: 'Waiting' }
                  : c
              ));
            }, 10000); // 10 seconds
          }
        });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');

      // Stop all active recorders so they save automatically
      Object.keys(recordersRef.current).forEach(code => {
        const recorder = recordersRef.current[code];
        if (recorder && recorder.state === 'recording') {
          console.log(`🔌 Auto-stopping recording for ${code} due to socket disconnect`);
          recorder.stop();
        }
      });

      // Update all cameras to waiting status
      setCameras(prev => prev.map(c => ({ ...c, status: 'Waiting' })));
    });

    newSocket.on('offer', async (data) => {
      const room = String(data.room_code);
      console.log(`📹 Received offer from room: ${room}`);

      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pcRef.current[room] = pc;

      pc.onicecandidate = (e) => {
        if (e.candidate) newSocket.emit('ice-candidate', { candidate: e.candidate, room_code: room });
      };

      pc.ontrack = (e) => {
        console.log(`✅ Stream received for room: ${room}`);
        streamsRef.current[room] = e.streams[0];

        // Clear reconnection timer when stream is received
        if (reconnectionTimersRef.current[room]) {
          clearTimeout(reconnectionTimersRef.current[room]);
          delete reconnectionTimersRef.current[room];
        }

        // Handle stream ending (auto-save recording)
        streamsRef.current[room].oninactive = () => {
          console.log(`⚠️ Stream inactive for room: ${room}`);
          if (recordersRef.current[room] && recordersRef.current[room].state === 'recording') {
            console.log(`🛑 Auto-stopping recording for ${room} - stream ended`);
            recordersRef.current[room].stop();
          }
        };

        setCameras(prev => prev.map(c => c.code === room ? { ...c, status: 'Live', isRecording: false } : c));
      };

      pc.onconnectionstatechange = () => {
        console.log(`🔌 Connection state for ${room}: ${pc.connectionState}`);
        if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {

          // Auto-save recording if connection is lost
          if (recordersRef.current[room] && recordersRef.current[room].state === 'recording') {
            console.log(`🛑 Auto-stopping recording for ${room} - connection lost`);
            recordersRef.current[room].stop();
          }

          setCameras(prev => prev.map(c => c.code === room ? { ...c, status: 'Waiting' } : c));
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      newSocket.emit('answer', { answer, room_code: room });
    });

    newSocket.on('ice-candidate', async (data) => {
      const room = String(data.room_code);
      if (pcRef.current[room]) await pcRef.current[room].addIceCandidate(new RTCIceCandidate(data.candidate));
    });

    setSocket(newSocket);
    return () => {
      // Clear all reconnection timers
      Object.values(reconnectionTimersRef.current).forEach(timer => clearTimeout(timer));
      reconnectionTimersRef.current = {};
      newSocket.close();
    };
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
          setCameras(prev => prev.map(c => c.code === code ? { ...c, isRecording: false } : c));
          return;
        }

        const blob = new Blob(chunksRef.current[code], { type: selectedType });
        console.log(`📦 Created blob: ${blob.size} bytes`);

        if (blob.size < 1000) { // Less than 1KB indicates failure
          alert("❌ Recording too short or corrupted. Try again.");
          setCameras(prev => prev.map(c => c.code === code ? { ...c, isRecording: false } : c));
          return;
        }

        // Show upload progress
        setCameras(prev => prev.map(c => c.code === code ? { ...c, isRecording: false, uploading: true } : c));

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
          const token = localStorage.getItem('token');
          console.log(`📤 Uploading to: ${API_BASE}/api/upload`);

          const res = await fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData,
            // Add timeout for mobile networks
            signal: AbortSignal.timeout(30000) // 30 second timeout
          });

          if (res.ok) {
            const result = await res.json();
            alert(`✅ Recording saved successfully! (${(blob.size / 1024 / 1024).toFixed(2)}MB)`);
            console.log("✅ Upload successful:", result);
          } else {
            const errorText = await res.text();
            console.error("❌ Upload failed:", res.status, errorText);
            alert(`❌ Upload failed: ${res.status} ${res.statusText}`);
          }
        } catch (err) {
          console.error("❌ Upload error:", err);
          if (err.name === 'TimeoutError') {
            alert("❌ Upload timeout. Check your internet connection.");
          } else {
            alert(`❌ Upload error: ${err.message}`);
          }
        } finally {
          setCameras(prev => prev.map(c => c.code === code ? { ...c, uploading: false } : c));
        }
      };

      recorder.onerror = (e) => {
        console.error("❌ Recording error:", e);
        alert("❌ Recording failed. Your browser may not support this feature.");
        setCameras(prev => prev.map(c => c.code === code ? { ...c, isRecording: false } : c));
      };

      // Start recording with time slicing for better mobile performance
      recorder.start(1000); // Capture data every 1 second
      recordersRef.current[code] = recorder;
      setCameras(prev => prev.map(c => c.code === code ? { ...c, isRecording: true } : c));

      console.log("🎬 Recording started successfully");

    } catch (error) {
      console.error("❌ Failed to start recording:", error);
      alert(`❌ Cannot start recording: ${error.message}`);
    }
  };

  const stopRecording = (code) => {
    console.log(`🛑 Stopping recording for camera: ${code}`);
    if (recordersRef.current[code]) {
      const recorder = recordersRef.current[code];
      if (recorder.state === 'recording') {
        recorder.stop();
        console.log("📹 Recording stop signal sent");
      } else {
        console.log(`⚠️ Recorder state: ${recorder.state}`);
        setCameras(prev => prev.map(c => c.code === code ? { ...c, isRecording: false } : c));
      }
    } else {
      console.log("❌ No active recorder found");
      setCameras(prev => prev.map(c => c.code === code ? { ...c, isRecording: false } : c));
    }
  };

  // 3. DATABASE LOGIC
  const loadRecordings = async () => {
    if (isLoadingRecordings) return;
    setIsLoadingRecordings(true);
    setActiveTab('recordings');
    try {
      const API_BASE = SOCKET_URL.replace('socket.io', '');
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_BASE}/api/recordings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setRecordings(data);
      } else {
        console.error("Failed to load recordings:", res.status);
        alert("Failed to load recordings. Please try logging in again.");
      }
    } catch (err) {
      console.error("Error loading recordings:", err);
      alert("Error loading recordings. Check your connection.");
    } finally {
      setIsLoadingRecordings(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this video permanently?")) return;
    try {
      const API_BASE = SOCKET_URL.replace('socket.io', '');
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_BASE}/api/recordings/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setRecordings(prev => prev.filter(rec => rec.id !== id));
        alert("✅ Recording deleted successfully!");
      } else {
        console.error("Failed to delete recording:", res.status);
        alert("Failed to delete recording. Please try again.");
      }
    } catch (err) {
      console.error("Error deleting recording:", err);
      alert("Error deleting recording. Check your connection.");
    }
  };

  // 4. UI HANDLERS
  const handleAdd = async () => {
    const res = await generateCode();
    if (res.success) {
      setCurCode(String(res.code));
      setShowModal(true);
      if (socket) socket.emit('join_room', { code: String(res.code) });
    }
  };

  const finishPairing = () => {
    setCameras([...cameras, { id: Date.now(), name: `Camera ${cameras.length + 1}`, code: curCode, status: 'Waiting' }]);
    setShowModal(false);
  };

  const removeCamera = (id) => {
    const cam = cameras.find(c => c.id === id);
    const updatedCameras = cameras.filter(cam => cam.id !== id);
    setCameras(updatedCameras);

    // Remove settings for this camera
    if (cam && cam.code) {
      const updatedSettings = { ...cameraSettings };
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

  const toggleSidebar = () => {
    if (isTogglingRef.current) return;
    isTogglingRef.current = true;
    setSidebarCollapsed(prev => !prev);
    setTimeout(() => { isTogglingRef.current = false; }, 400);
  };

  // Proper logout function - saves ongoing recordings before logout
  const handleLogout = async () => {
    // Check if any camera is currently recording
    const recordingCameras = cameras.filter(cam => cam.isRecording);

    if (recordingCameras.length > 0) {
      // Confirm with user
      const confirmLogout = window.confirm(
        `⚠️ ${recordingCameras.length} recording(s) in progress!\n\n` +
        `Recordings will be automatically stopped and saved before logout.\n\n` +
        `Do you want to continue?`
      );

      if (!confirmLogout) {
        return; // User cancelled logout
      }

      console.log(`📹 Stopping ${recordingCameras.length} active recording(s)...`);

      // Stop and upload all active recordings
      for (const cam of recordingCameras) {
        if (recordersRef.current[cam.code]) {
          console.log(`🛑 Auto-stopping recording for camera: ${cam.code}`);

          // Stop the recorder - this will trigger the onstop event which uploads
          const recorder = recordersRef.current[cam.code];
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }
      }

      // Wait for uploads to complete (give it 2 seconds)
      console.log('⏳ Waiting for uploads to complete...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Only clear login status, keep all other data
    localStorage.removeItem('isLoggedIn');

    // Keep these saved for when user logs back in:
    // - token (for future authentication)
    // - user data
    // - username
    // - webwatch_cameras (saved cameras)
    // - webwatch_camera_settings (camera settings)

    // Don't close socket - let it stay connected for streaming
    // When user logs back in, they can see active streams immediately

    // Redirect to login page
    window.location.href = '/login';
  };

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
        c.id === cameraId ? { ...c, name: tempCameraName.trim() } : c
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

  // Profile handlers
  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
    setProfileError('');
    setProfileSuccess('');
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    setProfileInfo('');

    // Check if username is different
    if (profileData.username === localStorage.getItem('username')) {
      setProfileInfo('No changes detected.');
      setTimeout(() => setProfileInfo(''), 3000);
      return;
    }

    try {
      const API_BASE = SOCKET_URL.replace('socket.io', '');
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE}/api/profile/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: profileData.username
        })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('username', profileData.username);
        setProfileSuccess('Profile updated successfully!');
        setTimeout(() => setProfileSuccess(''), 3000);
      } else {
        setProfileError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      setProfileError('Connection error. Please try again.');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileInfo('');

    // Validate password fields
    if (!profileData.currentPassword || !profileData.newPassword || !profileData.confirmPassword) {
      setProfileError('All password fields are required');
      return;
    }

    if (profileData.newPassword.length < 6) {
      setProfileError('New password must be at least 6 characters');
      return;
    }

    if (profileData.newPassword !== profileData.confirmPassword) {
      setProfileError('New passwords do not match');
      return;
    }

    try {
      const API_BASE = SOCKET_URL.replace('socket.io', '');
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE}/api/profile/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: profileData.currentPassword,
          new_password: profileData.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setProfileSuccess('Password changed successfully!');
        setTimeout(() => setProfileSuccess(''), 3000);
        setProfileData({
          ...profileData,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setProfileError(data.error || 'Failed to change password');
      }
    } catch (err) {
      console.error('Password change error:', err);
      setProfileError('Connection error. Please try again.');
    }
  };

  return (
    <div className="dashboard-container">
      {/* Mobile Overlay - closes sidebar when clicked */}
      {!sidebarCollapsed && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}

      {/* Sidebar */}
      <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <button className={`toggle-btn ${sidebarCollapsed ? 'collapsed' : ''}`} onClick={toggleSidebar}>
            {sidebarCollapsed ? '☰' : <div className="hamburger"><span className="line"></span><span className="line"></span><span className="line"></span></div>}
          </button>
          <div className="sidebar-brand">
            <span className="brand-icon">⭕</span>
            <span className="brand-text">WebWatch</span>
          </div>
        </div>

        {!sidebarCollapsed ? (
          <>
            <div className="menu">
              <div className={`menu-item ${activeTab === 'cameras' ? 'active' : ''}`} onClick={() => setActiveTab('cameras')}>
                <span className="menu-icon">📷</span><span className="menu-text">My Cameras</span>
              </div>
              <div className={`menu-item ${activeTab === 'recordings' ? 'active' : ''}`} onClick={loadRecordings}>
                <span className="menu-icon">📼</span><span className="menu-text">Recordings</span>
              </div>
            </div>
            <div className="profile-logout-section">
              <div className="profile-section">
                <div className="profile-card" onClick={() => setShowProfileModal(true)}>
                  <div className="profile-avatar">
                    {(localStorage.getItem('username') || 'U')[0].toUpperCase()}
                  </div>
                  <div className="profile-info">
                    <div className="profile-name">{localStorage.getItem('username') || 'User'}</div>
                    <div className="profile-email">Settings</div>
                  </div>
                  <div className="profile-arrow">›</div>
                </div>
              </div>
              <div className="logout-section">
                <div className="menu-item logout" onClick={handleLogout}>
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
            </div>
          </>
        ) : (
          <>
            <div className="collapsed-menu">
              <div className={`menu-item collapsed ${activeTab === 'cameras' ? 'active' : ''}`} onClick={() => setActiveTab('cameras')}>📷</div>
              <div className={`menu-item collapsed ${activeTab === 'recordings' ? 'active' : ''}`} onClick={loadRecordings}>📼</div>
            </div>
            <div className="profile-logout-section">
              <div className="profile-section collapsed">
                <div className="profile-avatar-collapsed" onClick={() => setShowProfileModal(true)}>
                  {(localStorage.getItem('username') || 'U')[0].toUpperCase()}
                </div>
              </div>
              <div className="logout-section">
                <div className="menu-item logout collapsed" onClick={handleLogout}>
                  <span className="menu-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="main-content">
        {/* Mobile Menu Toggle Button - Always visible */}
        <button className={`mobile-menu-toggle ${!sidebarCollapsed ? 'sidebar-open' : ''}`} onClick={toggleSidebar}>
          ☰
        </button>

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
                      ref={el => { if (el && streamsRef.current[cam.code]) el.srcObject = streamsRef.current[cam.code]; }}
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
              <button
                className="add-camera-btn"
                onClick={loadRecordings}
                disabled={isLoadingRecordings}
                style={{ opacity: isLoadingRecordings ? 0.7 : 1, cursor: isLoadingRecordings ? 'not-allowed' : 'pointer' }}
              >
                {isLoadingRecordings ? '🔄 Refreshing...' : '🔄 Refresh'}
              </button>
            </div>
            <div className="camera-grid">
              {recordings.length === 0 && <p style={{ color: '#888', padding: '20px' }}>No recordings found.</p>}
              {recordings.map((rec, index) => (
                <div key={rec.id} className="camera-card">
                  <div className="camera-header">
                    <span className="camera-code">Recording #{index + 1}</span>
                  </div>
                  <div className="video-container" style={{ background: '#000', position: 'relative' }}>
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
                  <div className="camera-footer" style={{ justifyContent: 'space-between' }}>
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
                  <span style={{ color: '#00f2ff' }}>{curCode}</span>
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
            ref={el => { if (el && streamsRef.current[fullscreenCamera.code]) el.srcObject = streamsRef.current[fullscreenCamera.code]; }}
          />
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => { setShowProfileModal(false); setProfileSuccess(''); setProfileError(''); setProfileInfo(''); }}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h2>Profile Settings</h2>
              <button className="modal-close-icon" onClick={() => { setShowProfileModal(false); setProfileSuccess(''); setProfileError(''); setProfileInfo(''); }}>×</button>
            </div>

            <div className="profile-modal-content">
              {/* Error/Success Messages - Moved to Top */}
              {profileError && (
                <div className="profile-message error" style={{ marginTop: 0, marginBottom: '20px' }}>
                  ⚠️ {profileError}
                </div>
              )}
              {profileSuccess && (
                <div className="profile-message success" style={{ marginTop: 0, marginBottom: '20px' }}>
                  ✅ {profileSuccess}
                </div>
              )}
              {profileInfo && (
                <div className="profile-message" style={{
                  marginTop: 0,
                  marginBottom: '20px',
                  background: 'rgba(62, 142, 255, 0.1)',
                  border: '1px solid rgba(62, 142, 255, 0.3)',
                  color: '#3e8eff'
                }}>
                  ℹ️ {profileInfo}
                </div>
              )}
              {/* Profile Avatar Section */}
              <div className="profile-avatar-section">
                <div className="profile-avatar-large">
                  {(profileData.username || 'U')[0].toUpperCase()}
                </div>
                <div className="profile-username-display">{profileData.username}</div>
              </div>

              {/* Account Information */}
              <div className="profile-section-divider">
                <h3>Account Information</h3>
              </div>

              <form onSubmit={handleUpdateProfile}>
                <div className="profile-input-group">
                  <label>Username</label>
                  <input
                    type="text"
                    name="username"
                    value={profileData.username}
                    onChange={handleProfileChange}
                    placeholder="Enter username"
                    required
                  />
                </div>



                <button type="submit" className="profile-save-btn">
                  Save Changes
                </button>
              </form>

              {/* Change Password Section */}
              <div className="profile-section-divider">
                <h3>Change Password</h3>
              </div>

              <form onSubmit={handleChangePassword}>
                <div className="profile-input-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={profileData.currentPassword}
                    onChange={handleProfileChange}
                    placeholder="Enter current password"
                  />
                </div>

                <div className="profile-input-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={profileData.newPassword}
                    onChange={handleProfileChange}
                    placeholder="Enter new password (min 8 characters)"
                  />
                </div>

                <div className="profile-input-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={profileData.confirmPassword}
                    onChange={handleProfileChange}
                    placeholder="Confirm new password"
                  />
                </div>

                <button type="submit" className="profile-save-btn password-btn">
                  Update Password
                </button>
              </form>



              {/* Account Stats */}
              <div className="profile-section-divider">
                <h3>Account Statistics</h3>
              </div>
              <div className="profile-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Cameras</span>
                  <span className="stat-value">{cameras.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Recordings</span>
                  <span className="stat-value">{recordings.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Account Created</span>
                  <span className="stat-value">Recently</span>
                </div>
              </div>

              {/* Delete Account Section */}
              <div className="profile-section-divider">
                <h3 style={{ color: '#ff4757' }}>Danger Zone</h3>
              </div>
              <div style={{ padding: '10px 0' }}>
                <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: '15px' }}>
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <button
                  className="profile-save-btn"
                  style={{
                    background: 'rgba(255, 71, 87, 0.1)',
                    border: '1px solid #ff4757',
                    color: '#ff4757',
                    marginBottom: '10px'
                  }}
                  onClick={async () => {
                    if (window.confirm("ARE YOU SURE?\n\nThis will permanently delete your account, all your cameras, and all your recordings.\n\nThis action cannot be undone.")) {
                      try {

                        const token = localStorage.getItem('token');

                        // Use Configured URL
                        const res = await fetch(API_ENDPOINTS.DELETE_ACCOUNT, {
                          method: 'DELETE',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                          }
                        });

                        if (res.ok) {
                          alert("Account deleted. Goodbye!");
                          localStorage.clear();
                          window.location.href = '/login';
                        } else {
                          const err = await res.json();
                          alert("Failed to delete account: " + (err.error || "Unknown error"));
                        }
                      } catch (e) {
                        alert("Connection error: " + e.message);
                      }
                    }
                  }
                  }
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;