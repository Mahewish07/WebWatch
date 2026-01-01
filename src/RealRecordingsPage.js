import React, { useState, useEffect } from 'react';

// Styles for recordings page - Dark theme matching dashboard
const recordingsStyles = {
  container: {
    padding: '20px',
    backgroundColor: '#0f1014', // Same as dashboard
    minHeight: '100vh',
    color: 'white',
    fontFamily: 'sans-serif'
  },

  header: {
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '1px solid #2a2d36'
  },

  title: {
    fontSize: '28px',
    fontWeight: '300',
    color: 'white',
    margin: 0
  },

  tableContainer: {
    backgroundColor: '#1a1d26', // Same as camera cards
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
    color: '#aaa', // Same as dashboard text
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  tbody: {
    backgroundColor: '#1a1d26'
  },

  tr: {
    borderBottom: '1px solid #2a2d36',
    transition: 'background-color 0.2s ease'
  },

  trHover: {
    backgroundColor: '#2a2d36' // Same hover as dashboard
  },

  td: {
    padding: '15px 20px',
    color: '#ddd',
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
    color: '#ddd'
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
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '32px',
    height: '32px'
  },

  playButton: {
    backgroundColor: '#3b82f6', // Same blue as dashboard buttons
    color: 'white'
  },

  playButtonHover: {
    backgroundColor: '#2563eb'
  },

  downloadButton: {
    backgroundColor: '#28a745',
    color: 'white'
  },

  downloadButtonHover: {
    backgroundColor: '#1e7e34'
  },

  deleteButton: {
    backgroundColor: '#dc3545',
    color: 'white'
  },

  deleteButtonHover: {
    backgroundColor: '#c82333'
  },

  // Mobile styles - matching dashboard mobile theme
  mobileContainer: {
    padding: '15px',
    backgroundColor: '#0f1014', // Same as dashboard
    minHeight: '100vh',
    color: 'white'
  },

  mobileCard: {
    backgroundColor: '#1a1d26', // Same as camera cards
    borderRadius: '12px', // Same radius as camera cards
    padding: '15px',
    marginBottom: '15px',
    border: '1px solid #2a2d36',
    transition: 'transform 0.2s ease' // Same transition as camera cards
  },

  mobileCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },

  mobileCardBody: {
    fontSize: '13px',
    color: '#aaa', // Same as dashboard
    marginBottom: '10px'
  },

  mobileActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end'
  },

  noRecordings: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#888', // Same as dashboard no-camera message
    fontSize: '16px',
    backgroundColor: '#1a1d26',
    borderRadius: '12px',
    border: '2px dashed #2a2d36' // Same dashed border as no-camera
  }
};

function RealRecordingsPage({ isMobile = false, activeCameras = [], streamingSessions = [] }) {
  // Generate current camera status with durations for REAL cameras only
  const getCurrentCameraStatus = () => {
    if (activeCameras.length === 0) {
      return [];
    }

    return activeCameras.map(camera => {
      const now = new Date();
      let duration = "0:00";
      let status = camera.status;
      let statusDetails = "";

      if (camera.status === 'Live' && camera.sessionStartTime) {
        // Live camera - show streaming duration
        const sessionStart = new Date(camera.sessionStartTime);
        const durationMs = now - sessionStart;
        const durationMinutes = Math.floor(durationMs / (1000 * 60));
        const durationSeconds = Math.floor((durationMs % (1000 * 60)) / 1000);
        duration = `${durationMinutes}:${String(durationSeconds).padStart(2, '0')}`;
        statusDetails = "Currently Streaming";
      } else if (camera.status === 'Waiting' && camera.createdAt) {
        // Waiting camera - show waiting duration
        const createdTime = new Date(camera.createdAt);
        const waitingMs = now - createdTime;
        const waitingMinutes = Math.floor(waitingMs / (1000 * 60));
        const waitingSeconds = Math.floor((waitingMs % (1000 * 60)) / 1000);
        duration = `${waitingMinutes}:${String(waitingSeconds).padStart(2, '0')}`;
        statusDetails = "Waiting for Connection";
      }

      return {
        id: `current_${camera.id}`,
        camera: camera.name,
        status: status,
        statusDetails: statusDetails,
        duration: duration,
        cameraCode: camera.code,
        isCurrentCamera: true,
        isLive: camera.status === 'Live',
        isWaiting: camera.status === 'Waiting',
        sessionStartTime: camera.sessionStartTime,
        createdAt: camera.createdAt
      };
    });
  };

  // Generate completed streaming sessions for REAL cameras only
  const getCompletedSessions = () => {
    if (!streamingSessions || streamingSessions.length === 0) {
      return [];
    }

    return streamingSessions
      .filter(session => session.endTime) // Only completed sessions
      .map(session => {
        const startTime = new Date(session.startTime);
        const endTime = new Date(session.endTime);
        const durationMs = endTime - startTime;
        
        const durationMinutes = Math.floor(durationMs / (1000 * 60));
        const durationSeconds = Math.floor((durationMs % (1000 * 60)) / 1000);
        const formattedDuration = `${durationMinutes}:${String(durationSeconds).padStart(2, '0')}`;

        return {
          id: session.id,
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
          status: 'Completed',
          statusDetails: 'Session Completed',
          videoUrl: `/recordings/${session.cameraName.toLowerCase().replace(' ', '_')}_${session.id}.mp4`,
          cameraCode: session.cameraCode,
          sessionId: session.id,
          startTime: session.startTime,
          endTime: session.endTime,
          isCompletedSession: true
        };
      })
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  };

  const [currentCameras, setCurrentCameras] = useState([]);
  const [completedSessions, setCompletedSessions] = useState([]);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const recordingsPerPage = 10;

  // Update data when cameras or sessions change
  useEffect(() => {
    const currentStatus = getCurrentCameraStatus();
    const completed = getCompletedSessions();
    
    setCurrentCameras(currentStatus);
    setCompletedSessions(completed);
    setCurrentPage(1);
  }, [activeCameras, streamingSessions]);

  // Update current cameras every 30 seconds to show updated durations
  useEffect(() => {
    const interval = setInterval(() => {
      const currentStatus = getCurrentCameraStatus();
      setCurrentCameras(currentStatus);
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [activeCameras]);

  // Calculate pagination for completed sessions only
  const totalPages = Math.ceil(completedSessions.length / recordingsPerPage);
  const startIndex = (currentPage - 1) * recordingsPerPage;
  const endIndex = startIndex + recordingsPerPage;
  const currentCompletedSessions = completedSessions.slice(startIndex, endIndex);

  // Combine current cameras and completed sessions for display
  const allEntries = [...currentCameras, ...currentCompletedSessions];

  // Action handlers
  const handlePlay = (entry) => {
    console.log('Playing recording:', entry);
    alert(`Playing: ${entry.camera} - ${entry.dateTime || 'Live Stream'}`);
  };

  const handleDownload = (entry) => {
    console.log('Downloading recording:', entry);
    alert(`Downloading: ${entry.camera} - ${entry.dateTime}`);
  };

  const handleDelete = (entryId) => {
    if (window.confirm('Are you sure you want to delete this recording?')) {
      setCompletedSessions(completedSessions.filter(s => s.id !== entryId));
      console.log('Deleted recording:', entryId);
    }
  };

  // Mobile view
  if (isMobile) {
    return (
      <div style={recordingsStyles.mobileContainer}>
        <div style={recordingsStyles.header}>
          <h1 style={{ ...recordingsStyles.title, fontSize: '24px' }}>My Recordings</h1>
        </div>

        {activeCameras.length === 0 ? (
          <div style={recordingsStyles.noRecordings}>
            <p>📷 No cameras found.</p>
            <p>Add cameras to your dashboard to see them here.</p>
          </div>
        ) : allEntries.length === 0 ? (
          <div style={recordingsStyles.noRecordings}>
            <p>📼 No camera data found.</p>
            <p>Camera information will appear here.</p>
          </div>
        ) : (
          allEntries.map((entry) => (
            <div key={entry.id} style={{
              ...recordingsStyles.mobileCard,
              ...(entry.isLive ? { 
                backgroundColor: '#1a1d26',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              } : entry.isWaiting ? {
                backgroundColor: '#1a1d26',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
              } : {})
            }}>
              <div style={recordingsStyles.mobileCardHeader}>
                <h3 style={{ margin: 0, fontSize: '16px', color: 'white' }}>
                  {entry.camera}
                  {entry.isLive ? (
                    <span style={{
                      marginLeft: '8px',
                      fontSize: '12px',
                      color: '#3b82f6',
                      fontWeight: 'bold'
                    }}>
                      🔴 LIVE
                    </span>
                  ) : entry.isWaiting ? (
                    <span style={{
                      marginLeft: '8px',
                      fontSize: '12px',
                      color: '#6b7280',
                      fontWeight: 'bold'
                    }}>
                      ⏳ WAITING
                    </span>
                  ) : (
                    <span style={{
                      marginLeft: '8px',
                      fontSize: '12px',
                      color: '#6c757d',
                      fontWeight: 'normal'
                    }}>
                      (Completed)
                    </span>
                  )}
                </h3>
              </div>
              
              <div style={recordingsStyles.mobileCardBody}>
                {entry.isCurrentCamera ? (
                  <>
                    <div>{entry.isLive ? '🔴' : '⏳'} {entry.statusDetails}</div>
                    <div>⏱️ Duration: {entry.duration} {entry.isLive || entry.isWaiting ? '(and counting...)' : ''}</div>
                    {entry.isLive && entry.sessionStartTime && (
                      <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 'bold' }}>
                        Started: {new Date(entry.sessionStartTime).toLocaleString()}
                      </div>
                    )}
                    {entry.isWaiting && entry.createdAt && (
                      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'bold' }}>
                        Created: {new Date(entry.createdAt).toLocaleString()}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>📅 {entry.dateTime}</div>
                    <div>⏱️ Duration: {entry.duration}</div>
                  </>
                )}
                {entry.cameraCode && (
                  <div style={{ fontSize: '11px', color: '#666', fontFamily: 'monospace' }}>
                    Code: {entry.cameraCode}
                  </div>
                )}
              </div>

              <div style={recordingsStyles.mobileActions}>
                {entry.isLive ? (
                  <button
                    style={{ 
                      ...recordingsStyles.actionButton, 
                      backgroundColor: '#3b82f6',
                      color: 'white'
                    }}
                    onClick={() => alert(`Viewing live stream: ${entry.camera}`)}
                    title="View Live Stream"
                    onTouchStart={(e) => {
                      e.target.style.backgroundColor = '#2563eb';
                      e.target.style.transform = 'scale(1.05)';
                    }}
                    onTouchEnd={(e) => {
                      e.target.style.backgroundColor = '#3b82f6';
                      e.target.style.transform = 'scale(1)';
                    }}
                  >
                    👁️
                  </button>
                ) : entry.isWaiting ? (
                  <button
                    style={{ 
                      ...recordingsStyles.actionButton, 
                      backgroundColor: '#6b7280',
                      color: 'white'
                    }}
                    onClick={() => alert(`Camera waiting for connection: ${entry.camera}`)}
                    title="Waiting for Connection"
                    onTouchStart={(e) => {
                      e.target.style.backgroundColor = '#4b5563';
                      e.target.style.transform = 'scale(1.05)';
                    }}
                    onTouchEnd={(e) => {
                      e.target.style.backgroundColor = '#6b7280';
                      e.target.style.transform = 'scale(1)';
                    }}
                  >
                    ⏳
                  </button>
                ) : (
                  <>
                    <button
                      style={{ ...recordingsStyles.actionButton, ...recordingsStyles.playButton }}
                      onClick={() => handlePlay(entry)}
                      title="Play"
                      onTouchStart={(e) => {
                        e.target.style.backgroundColor = '#2563eb';
                        e.target.style.transform = 'scale(1.05)';
                      }}
                      onTouchEnd={(e) => {
                        e.target.style.backgroundColor = '#3b82f6';
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      ▶️
                    </button>
                    <button
                      style={{ ...recordingsStyles.actionButton, ...recordingsStyles.downloadButton }}
                      onClick={() => handleDownload(entry)}
                      title="Download"
                      onTouchStart={(e) => {
                        e.target.style.backgroundColor = '#1e7e34';
                        e.target.style.transform = 'scale(1.05)';
                      }}
                      onTouchEnd={(e) => {
                        e.target.style.backgroundColor = '#28a745';
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      ⬇️
                    </button>
                    <button
                      style={{ ...recordingsStyles.actionButton, ...recordingsStyles.deleteButton }}
                      onClick={() => handleDelete(entry.id)}
                      title="Delete"
                      onTouchStart={(e) => {
                        e.target.style.backgroundColor = '#c82333';
                        e.target.style.transform = 'scale(1.05)';
                      }}
                      onTouchEnd={(e) => {
                        e.target.style.backgroundColor = '#dc3545';
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      🗑️
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  // Desktop view
  return (
    <div style={recordingsStyles.container}>
      <div style={recordingsStyles.header}>
        <h1 style={recordingsStyles.title}>My Recordings</h1>
      </div>

      <div style={recordingsStyles.tableContainer}>
        {activeCameras.length === 0 ? (
          <div style={recordingsStyles.noRecordings}>
            <p>📷 No cameras found.</p>
            <p>Add cameras to your dashboard to see them here.</p>
          </div>
        ) : allEntries.length === 0 ? (
          <div style={recordingsStyles.noRecordings}>
            <p>📼 No camera data found.</p>
            <p>Camera information will appear here.</p>
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
              {allEntries.map((entry) => (
                <tr
                  key={entry.id}
                  style={{
                    ...recordingsStyles.tr,
                    ...(hoveredRow === entry.id ? recordingsStyles.trHover : {}),
                    ...(entry.isLive ? { 
                      backgroundColor: '#1a1d26',
                      boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)'
                    } : entry.isWaiting ? {
                      backgroundColor: '#1a1d26',
                      boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)'
                    } : {})
                  }}
                  onMouseEnter={() => setHoveredRow(entry.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td style={{ ...recordingsStyles.td, ...recordingsStyles.cameraName }}>
                    {entry.camera}
                    {entry.isLive ? (
                      <div style={{
                        fontSize: '11px',
                        color: '#3b82f6',
                        fontWeight: 'bold'
                      }}>
                        🔴 LIVE STREAMING
                      </div>
                    ) : entry.isWaiting ? (
                      <div style={{
                        fontSize: '11px',
                        color: '#6b7280',
                        fontWeight: 'bold'
                      }}>
                        ⏳ WAITING FOR CONNECTION
                      </div>
                    ) : (
                      <div style={{
                        fontSize: '11px',
                        color: '#6c757d',
                        fontWeight: 'normal'
                      }}>
                        Session Completed
                      </div>
                    )}
                  </td>
                  <td style={{ ...recordingsStyles.td, ...recordingsStyles.dateTime }}>
                    {entry.isCurrentCamera ? (
                      <div>
                        <div>{entry.statusDetails}</div>
                        <div style={{ fontSize: '10px', color: entry.isLive ? '#3b82f6' : '#6b7280' }}>
                          {entry.isLive ? 'Streaming Now' : 'Waiting Now'}
                        </div>
                      </div>
                    ) : (
                      entry.dateTime
                    )}
                  </td>
                  <td style={{ ...recordingsStyles.td, ...recordingsStyles.duration }}>
                    {entry.duration}
                    {entry.isCurrentCamera && (
                      <div style={{ fontSize: '10px', color: entry.isLive ? '#3b82f6' : '#6b7280' }}>
                        (and counting...)
                      </div>
                    )}
                  </td>
                  <td style={recordingsStyles.td}>
                    <div style={recordingsStyles.actionsContainer}>
                      {entry.isLive ? (
                        <button
                          style={{ 
                            ...recordingsStyles.actionButton, 
                            backgroundColor: '#3b82f6',
                            color: 'white'
                          }}
                          onClick={() => alert(`Viewing live stream: ${entry.camera}`)}
                          title="View Live Stream"
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#2563eb';
                            e.target.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#3b82f6';
                            e.target.style.transform = 'scale(1)';
                          }}
                        >
                          👁️
                        </button>
                      ) : entry.isWaiting ? (
                        <button
                          style={{ 
                            ...recordingsStyles.actionButton, 
                            backgroundColor: '#6b7280',
                            color: 'white'
                          }}
                          onClick={() => alert(`Camera waiting for connection: ${entry.camera}`)}
                          title="Waiting for Connection"
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#4b5563';
                            e.target.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#6b7280';
                            e.target.style.transform = 'scale(1)';
                          }}
                        >
                          ⏳
                        </button>
                      ) : (
                        <>
                          <button
                            style={{ ...recordingsStyles.actionButton, ...recordingsStyles.playButton }}
                            onClick={() => handlePlay(entry)}
                            title="Play Recording"
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#2563eb';
                              e.target.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = '#3b82f6';
                              e.target.style.transform = 'scale(1)';
                            }}
                          >
                            ▶️
                          </button>
                          <button
                            style={{ ...recordingsStyles.actionButton, ...recordingsStyles.downloadButton }}
                            onClick={() => handleDownload(entry)}
                            title="Download Recording"
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#1e7e34';
                              e.target.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = '#28a745';
                              e.target.style.transform = 'scale(1)';
                            }}
                          >
                            ⬇️
                          </button>
                          <button
                            style={{ ...recordingsStyles.actionButton, ...recordingsStyles.deleteButton }}
                            onClick={() => handleDelete(entry.id)}
                            title="Delete Recording"
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#c82333';
                              e.target.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = '#dc3545';
                              e.target.style.transform = 'scale(1)';
                            }}
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
    </div>
  );
}

export default RealRecordingsPage;