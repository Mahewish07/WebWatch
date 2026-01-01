import React, { useState, useEffect } from 'react';

// Demo data for testing - shows Live, Waiting, and Completed cameras
const generateDemoData = () => {
  const now = new Date();
  
  return {
    // Current cameras (Live and Waiting)
    currentCameras: [
      {
        id: 'live_1',
        camera: 'Living Room Camera',
        status: 'Live',
        statusDetails: 'Currently Streaming',
        duration: '15:23', // Will be updated in real-time
        cameraCode: 'ABC123',
        isCurrentCamera: true,
        isLive: true,
        isWaiting: false,
        sessionStartTime: new Date(now.getTime() - 15 * 60 * 1000).toISOString() // Started 15 min ago
      },
      {
        id: 'waiting_1',
        camera: 'Front Door Camera',
        status: 'Waiting',
        statusDetails: 'Waiting for Connection',
        duration: '5:45', // Will be updated in real-time
        cameraCode: 'XYZ789',
        isCurrentCamera: true,
        isLive: false,
        isWaiting: true,
        createdAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString() // Created 5 min ago
      }
    ],
    
    // Completed sessions
    completedSessions: [
      {
        id: 'completed_1',
        camera: 'Kitchen Camera',
        dateTime: new Date(now.getTime() - 2 * 60 * 60 * 1000).toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        duration: '30:15',
        status: 'Completed',
        statusDetails: 'Session Completed',
        cameraCode: 'KIT456',
        isCompletedSession: true
      },
      {
        id: 'completed_2',
        camera: 'Living Room Camera',
        dateTime: new Date(now.getTime() - 4 * 60 * 60 * 1000).toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        duration: '45:30',
        status: 'Completed',
        statusDetails: 'Session Completed',
        cameraCode: 'ABC123',
        isCompletedSession: true
      }
    ]
  };
};

// Styles for recordings page
const recordingsStyles = {
  container: {
    padding: '20px',
    backgroundColor: '#0f1014',
    minHeight: '100vh',
    color: 'white',
    fontFamily: 'sans-serif'
  },

  header: {
    marginBottom: '30px'
  },

  title: {
    fontSize: '28px',
    fontWeight: '300',
    color: 'white',
    margin: 0
  },

  tableContainer: {
    backgroundColor: '#1a1d26',
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
    backgroundColor: '#2a2d36',
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
    transition: 'background-color 0.2s ease'
  },

  trHover: {
    backgroundColor: '#2a2d36'
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
    backgroundColor: '#007bff',
    color: 'white'
  },

  downloadButton: {
    backgroundColor: '#28a745',
    color: 'white'
  },

  deleteButton: {
    backgroundColor: '#dc3545',
    color: 'white'
  },

  // Mobile styles
  mobileContainer: {
    padding: '15px',
    backgroundColor: '#0f1014',
    minHeight: '100vh',
    color: 'white'
  },

  mobileCard: {
    backgroundColor: '#1a1d26',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '15px',
    border: '1px solid #2a2d36'
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

  noRecordings: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6c757d',
    fontSize: '16px',
    backgroundColor: '#1a1d26',
    borderRadius: '12px',
    border: '1px solid #2a2d36'
  }
};

function DemoRecordingsPage({ isMobile = false }) {
  const [demoData, setDemoData] = useState(generateDemoData());
  const [hoveredRow, setHoveredRow] = useState(null);

  // Update durations every 30 seconds for live/waiting cameras
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      
      setDemoData(prevData => ({
        ...prevData,
        currentCameras: prevData.currentCameras.map(camera => {
          if (camera.isLive && camera.sessionStartTime) {
            const sessionStart = new Date(camera.sessionStartTime);
            const durationMs = now - sessionStart;
            const durationMinutes = Math.floor(durationMs / (1000 * 60));
            const durationSeconds = Math.floor((durationMs % (1000 * 60)) / 1000);
            const duration = `${durationMinutes}:${String(durationSeconds).padStart(2, '0')}`;
            return { ...camera, duration };
          } else if (camera.isWaiting && camera.createdAt) {
            const createdTime = new Date(camera.createdAt);
            const waitingMs = now - createdTime;
            const waitingMinutes = Math.floor(waitingMs / (1000 * 60));
            const waitingSeconds = Math.floor((waitingMs % (1000 * 60)) / 1000);
            const duration = `${waitingMinutes}:${String(waitingSeconds).padStart(2, '0')}`;
            return { ...camera, duration };
          }
          return camera;
        })
      }));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Combine all entries for display
  const allEntries = [...demoData.currentCameras, ...demoData.completedSessions];

  // Action handlers
  const handlePlay = (entry) => {
    alert(`Playing: ${entry.camera} - ${entry.dateTime || 'Live Stream'}`);
  };

  const handleDownload = (entry) => {
    alert(`Downloading: ${entry.camera} - ${entry.dateTime}`);
  };

  const handleDelete = (entryId) => {
    if (window.confirm('Are you sure you want to delete this recording?')) {
      alert(`Deleted recording: ${entryId}`);
    }
  };

  // Mobile view
  if (isMobile) {
    return (
      <div style={recordingsStyles.mobileContainer}>
        <div style={recordingsStyles.header}>
          <h1 style={{ ...recordingsStyles.title, fontSize: '24px' }}>My Recordings</h1>
        </div>

        {allEntries.length === 0 ? (
          <div style={recordingsStyles.noRecordings}>
            <p>📼 No recordings found.</p>
          </div>
        ) : (
          allEntries.map((entry) => (
            <div key={entry.id} style={{
              ...recordingsStyles.mobileCard,
              ...(entry.isLive ? { 
                border: '2px solid #28a745',
                backgroundColor: '#0d2818'
              } : entry.isWaiting ? {
                border: '2px solid #ffc107',
                backgroundColor: '#2d2a0d'
              } : {})
            }}>
              <div style={recordingsStyles.mobileCardHeader}>
                <h3 style={{ margin: 0, fontSize: '16px', color: 'white' }}>
                  {entry.camera}
                  {entry.isLive ? (
                    <span style={{
                      marginLeft: '8px',
                      fontSize: '12px',
                      color: '#28a745',
                      fontWeight: 'bold'
                    }}>
                      🔴 LIVE
                    </span>
                  ) : entry.isWaiting ? (
                    <span style={{
                      marginLeft: '8px',
                      fontSize: '12px',
                      color: '#ffc107',
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
                  </>
                ) : (
                  <>
                    <div>📅 {entry.dateTime}</div>
                    <div>⏱️ Duration: {entry.duration}</div>
                  </>
                )}
                <div style={{ fontSize: '11px', color: '#666', fontFamily: 'monospace' }}>
                  Code: {entry.cameraCode}
                </div>
              </div>

              <div style={recordingsStyles.mobileActions}>
                {entry.isLive ? (
                  <button
                    style={{ 
                      ...recordingsStyles.actionButton, 
                      backgroundColor: '#28a745',
                      color: 'white'
                    }}
                    onClick={() => alert(`Viewing live stream: ${entry.camera}`)}
                    title="View Live Stream"
                  >
                    👁️
                  </button>
                ) : entry.isWaiting ? (
                  <button
                    style={{ 
                      ...recordingsStyles.actionButton, 
                      backgroundColor: '#ffc107',
                      color: 'white'
                    }}
                    onClick={() => alert(`Camera waiting: ${entry.camera}`)}
                    title="Waiting for Connection"
                  >
                    ⏳
                  </button>
                ) : (
                  <>
                    <button
                      style={{ ...recordingsStyles.actionButton, ...recordingsStyles.playButton }}
                      onClick={() => handlePlay(entry)}
                      title="Play"
                    >
                      ▶️
                    </button>
                    <button
                      style={{ ...recordingsStyles.actionButton, ...recordingsStyles.downloadButton }}
                      onClick={() => handleDownload(entry)}
                      title="Download"
                    >
                      ⬇️
                    </button>
                    <button
                      style={{ ...recordingsStyles.actionButton, ...recordingsStyles.deleteButton }}
                      onClick={() => handleDelete(entry.id)}
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
        {allEntries.length === 0 ? (
          <div style={recordingsStyles.noRecordings}>
            <p>📼 No recordings found.</p>
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
                      backgroundColor: '#0d2818',
                      border: '1px solid #28a745'
                    } : entry.isWaiting ? {
                      backgroundColor: '#2d2a0d',
                      border: '1px solid #ffc107'
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
                        color: '#28a745',
                        fontWeight: 'bold'
                      }}>
                        🔴 LIVE STREAMING
                      </div>
                    ) : entry.isWaiting ? (
                      <div style={{
                        fontSize: '11px',
                        color: '#ffc107',
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
                        <div style={{ fontSize: '10px', color: entry.isLive ? '#28a745' : '#ffc107' }}>
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
                      <div style={{ fontSize: '10px', color: entry.isLive ? '#28a745' : '#ffc107' }}>
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
                            backgroundColor: '#28a745',
                            color: 'white'
                          }}
                          onClick={() => alert(`Viewing live stream: ${entry.camera}`)}
                          title="View Live Stream"
                        >
                          👁️
                        </button>
                      ) : entry.isWaiting ? (
                        <button
                          style={{ 
                            ...recordingsStyles.actionButton, 
                            backgroundColor: '#ffc107',
                            color: 'white'
                          }}
                          onClick={() => alert(`Camera waiting: ${entry.camera}`)}
                          title="Waiting for Connection"
                        >
                          ⏳
                        </button>
                      ) : (
                        <>
                          <button
                            style={{ ...recordingsStyles.actionButton, ...recordingsStyles.playButton }}
                            onClick={() => handlePlay(entry)}
                            title="Play Recording"
                          >
                            ▶️
                          </button>
                          <button
                            style={{ ...recordingsStyles.actionButton, ...recordingsStyles.downloadButton }}
                            onClick={() => handleDownload(entry)}
                            title="Download Recording"
                          >
                            ⬇️
                          </button>
                          <button
                            style={{ ...recordingsStyles.actionButton, ...recordingsStyles.deleteButton }}
                            onClick={() => handleDelete(entry.id)}
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
    </div>
  );
}

export default DemoRecordingsPage;