import React, { useState, useEffect } from 'react';

// Dark theme styles matching dashboard design
const recordingsStyles = {
  container: {
    padding: '20px',
    backgroundColor: '#0f1014', // Dark background matching dashboard
    minHeight: '100vh',
    color: 'white',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },

  header: {
    marginBottom: '30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  title: {
    fontSize: '28px',
    fontWeight: '600',
    color: 'white',
    margin: 0
  },

  tableContainer: {
    backgroundColor: '#1a1d26', // Dark card background
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
    border: '1px solid #2a2d36'
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },

  tableHeader: {
    backgroundColor: '#2a2d36', // Darker header
    borderBottom: '2px solid #3a3d46'
  },

  th: {
    padding: '15px 20px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#aaa',
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  tbody: {
    backgroundColor: '#1a1d26'
  },

  tr: {
    borderBottom: '1px solid #2a2d36',
    transition: 'all 0.3s ease'
  },

  trHover: {
    backgroundColor: '#2a2d36',
    transform: 'translateY(-1px)'
  },

  td: {
    padding: '15px 20px',
    color: '#bbb',
    fontSize: '14px',
    verticalAlign: 'middle'
  },

  cameraName: {
    fontWeight: '600',
    color: 'white'
  },

  dateTime: {
    color: '#aaa'
  },

  duration: {
    fontFamily: 'monospace',
    fontWeight: '600',
    color: '#bbb'
  },

  actionsContainer: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },

  actionButton: {
    padding: '6px 8px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '32px',
    height: '32px'
  },

  playButton: {
    backgroundColor: '#3b82f6', // Dashboard blue
    color: 'white'
  },

  downloadButton: {
    backgroundColor: '#00ff00', // Live green
    color: 'white'
  },

  deleteButton: {
    backgroundColor: '#ff4d4d', // Error red
    color: 'white'
  },

  viewLiveButton: {
    backgroundColor: '#00bcd4', // Cyan accent
    color: 'white'
  },

  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '30px',
    gap: '15px'
  },

  paginationButton: {
    padding: '8px 16px',
    border: '1px solid #2a2d36',
    backgroundColor: '#1a1d26',
    color: '#bbb',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s ease'
  },

  paginationButtonActive: {
    background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white',
    borderColor: '#3b82f6'
  },

  paginationInfo: {
    color: '#aaa',
    fontSize: '14px'
  },

  noRecordings: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#aaa',
    fontSize: '16px'
  },

  // Mobile responsive styles with dark theme
  mobileContainer: {
    padding: '15px',
    backgroundColor: '#0f1014',
    minHeight: '100vh',
    color: 'white'
  },

  mobileCard: {
    backgroundColor: '#1a1d26',
    borderRadius: '12px',
    padding: '15px',
    marginBottom: '15px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
    border: '1px solid #2a2d36',
    transition: 'all 0.3s ease'
  },

  mobileCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },

  mobileCardBody: {
    fontSize: '13px',
    color: '#aaa',
    marginBottom: '10px'
  },

  mobileActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end'
  },

  // Live session specific styles
  liveSessionCard: {
    border: '2px solid #00ff00',
    backgroundColor: '#0a1a0a',
    boxShadow: '0 0 20px rgba(0, 255, 0, 0.2)'
  },

  liveSessionRow: {
    backgroundColor: '#0a1a0a',
    border: '2px solid #00ff00',
    boxShadow: '0 0 10px rgba(0, 255, 0, 0.1)'
  },

  liveBadge: {
    fontSize: '12px',
    color: '#00ff00',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },

  completedBadge: {
    fontSize: '11px',
    color: '#888',
    fontWeight: 'normal'
  }
};

function RecordingsPage({ isMobile = false, activeCameras = [], streamingSessions = [] }) {
  // Generate recordings based on actual streaming sessions
  const generateRecordingsFromStreamingSessions = () => {
    if (!streamingSessions || streamingSessions.length === 0) {
      return [];
    }

    const recordings = [];
    
    streamingSessions.forEach((session, index) => {
      // Only create recordings for completed streaming sessions
      if (session.endTime) {
        const startTime = new Date(session.startTime);
        const endTime = new Date(session.endTime);
        const durationMs = endTime - startTime;
        
        // Calculate duration in minutes and seconds
        const durationMinutes = Math.floor(durationMs / (1000 * 60));
        const durationSeconds = Math.floor((durationMs % (1000 * 60)) / 1000);
        const formattedDuration = `${durationMinutes}:${String(durationSeconds).padStart(2, '0')}`;

        recordings.push({
          id: session.id || index + 1,
          camera: session.cameraName,
          dateTime: startTime.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }),
          duration: formattedDuration,
          videoUrl: `/recordings/${session.cameraName.toLowerCase().replace(' ', '_')}_${session.id}.mp4`,
          cameraStatus: session.status || 'Completed',
          cameraCode: session.cameraCode,
          sessionId: session.id,
          startTime: session.startTime,
          endTime: session.endTime,
          isRealSession: true
        });
      }
    });

    // Sort by start time (newest first)
    return recordings.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  };

  // Generate current live sessions info
  const getCurrentLiveSessions = () => {
    const liveCameras = activeCameras.filter(camera => camera.status === 'Live' && camera.streaming);
    
    return liveCameras.map(camera => {
      // Calculate how long the camera has been live
      const now = new Date();
      const sessionStart = camera.sessionStartTime || now;
      const durationMs = now - new Date(sessionStart);
      const durationMinutes = Math.floor(durationMs / (1000 * 60));
      const durationSeconds = Math.floor((durationMs % (1000 * 60)) / 1000);
      
      return {
        id: `live_${camera.id}`,
        camera: camera.name,
        status: 'Currently Live',
        duration: `${durationMinutes}:${String(durationSeconds).padStart(2, '0')}`,
        startTime: sessionStart,
        cameraCode: camera.code,
        isLive: true
      };
    });
  };

  const [recordings, setRecordings] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const recordingsPerPage = 10;

  // Update recordings when streaming sessions change
  useEffect(() => {
    const generatedRecordings = generateRecordingsFromStreamingSessions();
    const currentLive = getCurrentLiveSessions();
    
    setRecordings(generatedRecordings);
    setLiveSessions(currentLive);
    setCurrentPage(1);
  }, [activeCameras, streamingSessions]);

  // Update live sessions every 30 seconds to show current duration
  useEffect(() => {
    const interval = setInterval(() => {
      const currentLive = getCurrentLiveSessions();
      setLiveSessions(currentLive);
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [activeCameras]);

  // Calculate pagination for completed recordings only
  const totalPages = Math.ceil(recordings.length / recordingsPerPage);
  const startIndex = (currentPage - 1) * recordingsPerPage;
  const endIndex = startIndex + recordingsPerPage;
  const currentRecordings = recordings.slice(startIndex, endIndex);

  // Combine live sessions and completed recordings for display
  const allSessions = [...liveSessions, ...currentRecordings];

  // Action handlers
  const handlePlay = (recording) => {
    console.log('Playing recording:', recording);
    // यहाँ video player modal open करेंगे
    alert(`Playing: ${recording.camera} - ${recording.dateTime}`);
  };

  const handleDownload = (recording) => {
    console.log('Downloading recording:', recording);
    // यहाँ download logic होगी
    alert(`Downloading: ${recording.camera} - ${recording.dateTime}`);
  };

  const handleDelete = (recordingId) => {
    if (window.confirm('Are you sure you want to delete this recording?')) {
      setRecordings(recordings.filter(r => r.id !== recordingId));
      console.log('Deleted recording:', recordingId);
    }
  };

  // Mobile view
  if (isMobile) {
    return (
      <div style={recordingsStyles.mobileContainer}>
        <div style={recordingsStyles.header}>
          <h1 style={{ ...recordingsStyles.title, fontSize: '24px' }}>📼 My Recordings</h1>
        </div>

        {activeCameras.filter(c => c.status === 'Live').length === 0 && recordings.length === 0 ? (
          <div style={recordingsStyles.noRecordings}>
            <p>📷 No live cameras or recordings found.</p>
            <p>Start streaming from your cameras to see sessions here.</p>
          </div>
        ) : allSessions.length === 0 ? (
          <div style={recordingsStyles.noRecordings}>
            <p>📼 No streaming sessions found.</p>
            <p>Sessions will appear here when cameras start/stop streaming.</p>
          </div>
        ) : (
          allSessions.map((session) => (
            <div key={session.id} style={{
              ...recordingsStyles.mobileCard,
              ...(session.isLive ? recordingsStyles.liveSessionCard : {})
            }}>
              <div style={recordingsStyles.mobileCardHeader}>
                <h3 style={{ margin: 0, fontSize: '16px', color: 'white' }}>
                  {session.camera}
                  {session.isLive ? (
                    <div style={recordingsStyles.liveBadge}>
                      🔴 LIVE
                    </div>
                  ) : (
                    <div style={recordingsStyles.completedBadge}>
                      (Completed)
                    </div>
                  )}
                </h3>
              </div>
              
              <div style={recordingsStyles.mobileCardBody}>
                {session.isLive ? (
                  <>
                    <div style={{ color: '#00ff00' }}>🔴 Currently Streaming</div>
                    <div>⏱️ Duration: {session.duration} (and counting...)</div>
                    <div style={{ fontSize: '11px', color: '#00bcd4', fontWeight: 'bold' }}>
                      Started: {new Date(session.startTime).toLocaleString()}
                    </div>
                  </>
                ) : (
                  <>
                    <div>📅 {session.dateTime}</div>
                    <div>⏱️ Duration: {session.duration}</div>
                  </>
                )}
                {session.cameraCode && (
                  <div style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>
                    Code: {session.cameraCode}
                  </div>
                )}
              </div>

              <div style={recordingsStyles.mobileActions}>
                {session.isLive ? (
                  <button
                    style={{ 
                      ...recordingsStyles.actionButton, 
                      ...recordingsStyles.viewLiveButton
                    }}
                    onClick={() => alert(`Viewing live stream: ${session.camera}`)}
                    title="View Live Stream"
                  >
                    👁️
                  </button>
                ) : (
                  <>
                    <button
                      style={{ ...recordingsStyles.actionButton, ...recordingsStyles.playButton }}
                      onClick={() => handlePlay(session)}
                      title="Play"
                    >
                      ▶️
                    </button>
                    <button
                      style={{ ...recordingsStyles.actionButton, ...recordingsStyles.downloadButton }}
                      onClick={() => handleDownload(session)}
                      title="Download"
                    >
                      ⬇️
                    </button>
                    <button
                      style={{ ...recordingsStyles.actionButton, ...recordingsStyles.deleteButton }}
                      onClick={() => handleDelete(session.id)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div style={recordingsStyles.pagination}>
            <button
              style={{
                ...recordingsStyles.paginationButton,
                opacity: currentPage === 1 ? 0.5 : 1
              }}
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              ← Previous
            </button>
            <span style={recordingsStyles.paginationInfo}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              style={{
                ...recordingsStyles.paginationButton,
                opacity: currentPage === totalPages ? 0.5 : 1
              }}
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    );
  }

  // Desktop view
  return (
    <div style={recordingsStyles.container}>
      <div style={recordingsStyles.header}>
        <h1 style={recordingsStyles.title}>📼 My Recordings</h1>
      </div>

      <div style={recordingsStyles.tableContainer}>
        {activeCameras.filter(c => c.status === 'Live').length === 0 && recordings.length === 0 ? (
          <div style={recordingsStyles.noRecordings}>
            <p>📷 No live cameras or recordings found.</p>
            <p>Start streaming from your cameras to see sessions here.</p>
          </div>
        ) : allSessions.length === 0 ? (
          <div style={recordingsStyles.noRecordings}>
            <p>📼 No streaming sessions found.</p>
            <p>Sessions will appear here when cameras start/stop streaming.</p>
          </div>
        ) : (
          <table style={recordingsStyles.table}>
            <thead style={recordingsStyles.tableHeader}>
              <tr>
                <th style={recordingsStyles.th}>Camera</th>
                <th style={recordingsStyles.th}>Date & Time</th>
                <th style={recordingsStyles.th}>Duration</th>
                <th style={recordingsStyles.th}>Actions</th>
              </tr>
            </thead>
            <tbody style={recordingsStyles.tbody}>
              {allSessions.map((session) => (
                <tr
                  key={session.id}
                  style={{
                    ...recordingsStyles.tr,
                    ...(hoveredRow === session.id ? recordingsStyles.trHover : {}),
                    ...(session.isLive ? recordingsStyles.liveSessionRow : {})
                  }}
                  onMouseEnter={() => setHoveredRow(session.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td style={{ ...recordingsStyles.td, ...recordingsStyles.cameraName }}>
                    {session.camera}
                    {session.isLive ? (
                      <div style={recordingsStyles.liveBadge}>
                        🔴 LIVE STREAMING
                      </div>
                    ) : (
                      <div style={recordingsStyles.completedBadge}>
                        Session Completed
                      </div>
                    )}
                  </td>
                  <td style={{ ...recordingsStyles.td, ...recordingsStyles.dateTime }}>
                    {session.isLive ? (
                      <div>
                        <div style={{ color: '#00ff00' }}>Currently Streaming</div>
                        <div style={{ fontSize: '10px', color: '#00bcd4' }}>
                          Started: {new Date(session.startTime).toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      session.dateTime
                    )}
                  </td>
                  <td style={{ ...recordingsStyles.td, ...recordingsStyles.duration }}>
                    {session.duration}
                    {session.isLive && (
                      <div style={{ fontSize: '10px', color: '#00ff00' }}>
                        (and counting...)
                      </div>
                    )}
                  </td>
                  <td style={recordingsStyles.td}>
                    <div style={recordingsStyles.actionsContainer}>
                      {session.isLive ? (
                        <button
                          style={{ 
                            ...recordingsStyles.actionButton, 
                            ...recordingsStyles.viewLiveButton
                          }}
                          onClick={() => alert(`Viewing live stream: ${session.camera}`)}
                          onMouseOver={(e) => e.target.style.backgroundColor = '#008ba3'}
                          onMouseOut={(e) => e.target.style.backgroundColor = '#00bcd4'}
                          title="View Live Stream"
                        >
                          👁️
                        </button>
                      ) : (
                        <>
                          <button
                            style={{ ...recordingsStyles.actionButton, ...recordingsStyles.playButton }}
                            onClick={() => handlePlay(session)}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
                            title="Play Recording"
                          >
                            ▶️
                          </button>
                          <button
                            style={{ ...recordingsStyles.actionButton, ...recordingsStyles.downloadButton }}
                            onClick={() => handleDownload(session)}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#00cc00'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#00ff00'}
                            title="Download Recording"
                          >
                            ⬇️
                          </button>
                          <button
                            style={{ ...recordingsStyles.actionButton, ...recordingsStyles.deleteButton }}
                            onClick={() => handleDelete(session.id)}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#cc3333'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#ff4d4d'}
                            title="Delete Recording"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Desktop Pagination */}
      {totalPages > 1 && (
        <div style={recordingsStyles.pagination}>
          <button
            style={{
              ...recordingsStyles.paginationButton,
              opacity: currentPage === 1 ? 0.5 : 1
            }}
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>
          
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index + 1}
              style={{
                ...recordingsStyles.paginationButton,
                ...(currentPage === index + 1 ? recordingsStyles.paginationButtonActive : {})
              }}
              onClick={() => setCurrentPage(index + 1)}
            >
              {index + 1}
            </button>
          ))}
          
          <button
            style={{
              ...recordingsStyles.paginationButton,
              opacity: currentPage === totalPages ? 0.5 : 1
            }}
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
          
          <span style={recordingsStyles.paginationInfo}>
            Page {currentPage} of {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}

export default RecordingsPage;