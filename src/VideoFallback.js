// Video Fallback System - 1 second delay streaming
// This system captures frames from mobile camera and streams them to dashboard
// with 1 second delay as a fallback when WebRTC fails

import { SOCKET_URL } from './config';
import io from 'socket.io-client';

class VideoFallback {
  constructor() {
    this.socket = null;
    this.canvas = null;
    this.context = null;
    this.isStreaming = false;
    this.frameRate = 10; // 10 FPS for fallback
    this.quality = 0.7; // JPEG quality
    this.frameBuffer = []; // Buffer for 1-second delay
    this.bufferSize = 10; // 1 second at 10 FPS
  }

  // Initialize fallback system
  init(roomCode) {
    console.log('🔄 Initializing video fallback system for room:', roomCode);
    
    // Create canvas for frame capture
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    
    // Initialize socket connection
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });
    
    this.socket.on('connect', () => {
      console.log('📡 Fallback system connected to server');
      // Join room for fallback streaming
      this.socket.emit('join_fallback_room', {
        room_code: roomCode,
        type: 'camera'
      });
    });
    
    return this;
  }

  // Start fallback streaming from mobile camera
  startCameraStream(videoElement, roomCode) {
    if (!videoElement || !videoElement.srcObject) {
      console.error('❌ No video source available for fallback');
      return false;
    }

    console.log('🎥 Starting fallback camera stream...');
    this.isStreaming = true;
    
    // Set canvas size to match video
    this.canvas.width = videoElement.videoWidth || 640;
    this.canvas.height = videoElement.videoHeight || 480;
    
    // Start frame capture loop
    this.captureFrames(videoElement, roomCode);
    
    return true;
  }

  // Capture frames from video element
  captureFrames(videoElement, roomCode) {
    if (!this.isStreaming) return;

    try {
      // Draw current video frame to canvas
      this.context.drawImage(videoElement, 0, 0, this.canvas.width, this.canvas.height);
      
      // Convert to JPEG data URL
      const frameData = this.canvas.toDataURL('image/jpeg', this.quality);
      
      // Add to buffer for 1-second delay
      this.frameBuffer.push({
        data: frameData,
        timestamp: Date.now()
      });
      
      // Maintain buffer size (1 second delay)
      if (this.frameBuffer.length > this.bufferSize) {
        const delayedFrame = this.frameBuffer.shift();
        
        // Send delayed frame to dashboard
        if (this.socket) {
          this.socket.emit('fallback_frame', {
            room_code: roomCode,
            frame_data: delayedFrame.data,
            timestamp: delayedFrame.timestamp,
            width: this.canvas.width,
            height: this.canvas.height
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Frame capture error:', error);
    }

    // Schedule next frame
    setTimeout(() => {
      this.captureFrames(videoElement, roomCode);
    }, 1000 / this.frameRate);
  }

  // Stop fallback streaming
  stop() {
    console.log('⏹️ Stopping fallback streaming');
    this.isStreaming = false;
    this.frameBuffer = [];
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Dashboard side: Display fallback frames
  startDashboardDisplay(roomCode, videoElement) {
    console.log('📺 Starting fallback display for room:', roomCode);
    
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });
    
    this.socket.on('connect', () => {
      console.log('📡 Dashboard fallback connected');
      this.socket.emit('join_fallback_room', {
        room_code: roomCode,
        type: 'viewer'
      });
    });
    
    // Listen for fallback frames
    this.socket.on('fallback_frame', (data) => {
      if (data.room_code === roomCode && videoElement) {
        // Create image element and display frame
        const img = new Image();
        img.onload = () => {
          // Create canvas to display the frame
          if (!this.displayCanvas) {
            this.displayCanvas = document.createElement('canvas');
            this.displayCanvas.width = data.width;
            this.displayCanvas.height = data.height;
            this.displayCanvas.style.width = '100%';
            this.displayCanvas.style.height = '100%';
            this.displayCanvas.style.objectFit = 'cover';
            
            // Replace video element with canvas
            videoElement.style.display = 'none';
            videoElement.parentNode.appendChild(this.displayCanvas);
          }
          
          const ctx = this.displayCanvas.getContext('2d');
          ctx.drawImage(img, 0, 0, data.width, data.height);
        };
        img.src = data.frame_data;
      }
    });
  }
}

export default VideoFallback;