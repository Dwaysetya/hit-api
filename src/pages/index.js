import React, { useState, useRef } from 'react';
import Head from 'next/head';
import { readExcel } from '../utils/excelReader';
import { writeExcel } from '../utils/excelWriter';
import { login } from '../services/authService';
import { syncODP } from '../services/odpService';

export default function Home() {
  // Auth state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Data & Execution state
  const [file, setFile] = useState(null);
  const [odpList, setOdpList] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0, timeElapsed: '0s' });
  const [singleOdp, setSingleOdp] = useState('');
  
  const fileInputRef = useRef(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) return alert('Please enter username and password.');
    
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const token = await login(username, password);
      setAuthToken(token);
    } catch (error) {
      setLoginError(`Login Failed: ${error.message}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setAuthToken('');
    setPassword('');
    setOdpList([]);
    setSingleOdp('');
    setResults([]);
    setIsFinished(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      try {
        const parsedList = await readExcel(selectedFile);
        setOdpList(parsedList);
        setResults(parsedList.map((odp, index) => ({
          No: index + 1,
          ODP: odp,
          Status: 'Pending',
          Message: '-',
          Timestamp: '-'
        })));
        setStats(prev => ({ ...prev, total: parsedList.length }));
        setIsFinished(false);
      } catch (error) {
        alert(error.message || 'Failed to read file.');
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleExecute = async () => {
    if (odpList.length === 0) return alert('Please upload a valid Excel file first.');
    if (!authToken) return alert('Not authenticated.');

    setIsRunning(true);
    setIsFinished(false);
    
    // Reset results status
    setResults(prev => prev.map(r => ({ ...r, Status: 'Pending', Message: '-', Timestamp: '-' })));
    setStats({ total: odpList.length, success: 0, failed: 0, timeElapsed: '0s' });

    const startTime = Date.now();
    let currentSuccess = 0;
    let currentFailed = 0;

    // We must use a copy of results to mutate state correctly and sequentially
    let updatedResults = odpList.map((odp, index) => ({
      No: index + 1,
      ODP: odp,
      Status: 'Pending',
      Message: '-',
      Timestamp: '-'
    }));

    // Sequential loop as requested
    for (let i = 0; i < odpList.length; i++) {
      const odpName = odpList[i];
      const execTimeStr = new Date().toLocaleTimeString();

      try {
        const response = await syncODP(authToken, odpName);
        
        updatedResults[i] = {
          ...updatedResults[i],
          Status: 'Success',
          Message: response?.message || 'Success',
          Timestamp: execTimeStr
        };
        currentSuccess++;
      } catch (error) {
        const errorMessage = typeof error === 'string' ? error : (error.message || 'Error occurred');
        updatedResults[i] = {
          ...updatedResults[i],
          Status: 'Failed',
          Message: `Error (${errorMessage})`,
          Timestamp: execTimeStr
        };
        currentFailed++;
      }

      // Update state per iteration for real-time UI
      setResults([...updatedResults]);
      setStats(prev => ({
        ...prev,
        success: currentSuccess,
        failed: currentFailed,
        timeElapsed: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
      }));
    }

    const endTime = Date.now();
    setStats(prev => ({
      ...prev,
      timeElapsed: `${((endTime - startTime) / 1000).toFixed(1)}s`
    }));

    setIsRunning(false);
    setIsFinished(true);
  };

  const handleSingleExecute = async () => {
    if (!singleOdp.trim()) return alert('Please enter at least one ODP name.');
    if (!authToken) return alert('Not authenticated.');

    setIsRunning(true);
    setIsFinished(false);
    
    // Split input by newlines, trim whitespace, and filter out empty lines
    const rawList = singleOdp.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    
    if (rawList.length === 0) {
      setIsRunning(false);
      return alert('No valid ODP names found.');
    }

    setStats({ total: rawList.length, success: 0, failed: 0, timeElapsed: '0s' });
    
    const startTime = Date.now();
    let currentSuccess = 0;
    let currentFailed = 0;

    let updatedResults = rawList.map((odp, index) => ({
      No: index + 1,
      ODP: odp,
      Status: 'Pending',
      Message: '-',
      Timestamp: '-'
    }));
    
    setResults([...updatedResults]);

    for (let i = 0; i < rawList.length; i++) {
      const odpName = rawList[i];
      const execTimeStr = new Date().toLocaleTimeString();
      try {
        const response = await syncODP(authToken, odpName);
        updatedResults[i] = {
          ...updatedResults[i],
          Status: 'Success',
          Message: response?.message || 'Success',
          Timestamp: execTimeStr
        };
        currentSuccess++;
      } catch (error) {
        const errorMessage = typeof error === 'string' ? error : (error.message || 'Error occurred');
        updatedResults[i] = {
          ...updatedResults[i],
          Status: 'Failed',
          Message: `Error (${errorMessage})`,
          Timestamp: execTimeStr
        };
        currentFailed++;
      }
      
      setResults([...updatedResults]);
      setStats(prev => ({ 
        ...prev, 
        success: currentSuccess, 
        failed: currentFailed, 
        timeElapsed: `${((Date.now() - startTime) / 1000).toFixed(1)}s` 
      }));
    }
    
    setStats(prev => ({ ...prev, timeElapsed: `${((Date.now() - startTime) / 1000).toFixed(1)}s` }));
    setIsRunning(false);
    setIsFinished(true);
  };

  const handleDownload = () => {
    writeExcel(results);
  };

  return (
    <div className="container">
      <Head>
        <title>Sync ODP Aggregator</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="header">
        <h1>Sync ODP Aggregator</h1>
        <p>Automate your ODP synchronization process efficiently</p>
      </header>

      <div className="grid">
        {!authToken ? (
          <div className="card" style={{ gridColumn: '1 / -1', maxWidth: '500px', margin: '0 auto', width: '100%' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 600 }}>1. Authentication</h2>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  className="form-control"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoggingIn}
                  placeholder="Enter Dimas username"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoggingIn}
                  placeholder="Enter password"
                />
              </div>
              {loginError && (
                <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
                  {loginError}
                </p>
              )}
              <button 
                type="submit" 
                className="btn" 
                disabled={isLoggingIn || !username || !password} 
                style={{ width: '100%' }}
              >
                {isLoggingIn ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        ) : (
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>2. Execution Setup</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className="badge badge-success" style={{ fontSize: '0.875rem' }}>✓ Logged in as {username}</span>
                <button 
                  className="btn btn-danger" 
                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  onClick={handleLogout}
                  disabled={isRunning}
                >
                  Logout
                </button>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              {/* Manual Input */}
              <div style={{ flex: '1 1 300px', padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 600 }}>A. Manual Input ODP</h3>
                <div className="form-group">
                  <label>ODP Name (Pisahkan dengan Enter)</label>
                  <textarea
                    className="form-control"
                    placeholder="Contoh:&#10;ODP-TBI-FA/82&#10;ODP-JBS-FF/012"
                    rows={5}
                    value={singleOdp}
                    onChange={(e) => setSingleOdp(e.target.value)}
                    disabled={isRunning}
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <button 
                  className="btn" 
                  onClick={handleSingleExecute}
                  disabled={!singleOdp.trim() || isRunning}
                  style={{ width: '100%' }}
                >
                  Check ODP
                </button>
              </div>

              {/* Batch Upload */}
              <div style={{ flex: '1 1 300px', padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 600 }}>B. Batch Upload</h3>
                <div className="form-group">
                  <label>File (.xlsx, .csv, .txt)</label>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv, .txt"
                    className="form-control"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    disabled={isRunning}
                  />
                </div>
                {odpList.length > 0 && (
                  <p style={{ color: 'var(--success)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    ✓ Loaded {odpList.length} ODP records successfully.
                  </p>
                )}
                <button
                  className="btn"
                  onClick={handleExecute}
                  disabled={odpList.length === 0 || isRunning}
                  style={{ width: '100%' }}
                >
                  Start Batch Sync
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {authToken && (
        <>
          <div style={{ textAlign: 'center', margin: '2rem 0' }}>
            {isRunning && (
              <button className="btn" disabled style={{ width: '200px' }}>
                <span style={{ marginRight: '0.5rem' }}>⏳</span> Processing...
              </button>
            )}

            {isFinished && !isRunning && (
              <button className="btn btn-success" onClick={handleDownload} style={{ width: '250px' }}>
                ↓ Download Results (.xlsx)
              </button>
            )}
          </div>

          {(results.length > 0) && (
            <>
              <div className="summary">
                <div className="stat-card">
                  <div className="stat-label">Total ODP</div>
                  <div className="stat-value">{stats.total}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Success</div>
                  <div className="stat-value stat-success">{stats.success}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Failed</div>
                  <div className="stat-value stat-danger">{stats.failed}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Execution Time</div>
                  <div className="stat-value stat-primary">{stats.timeElapsed}</div>
                </div>
              </div>

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>ODP Name</th>
                        <th>Status</th>
                        <th>Message</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((row) => (
                        <tr key={row.No}>
                          <td>{row.No}</td>
                          <td style={{ fontWeight: 500 }}>{row.ODP}</td>
                          <td>
                            <span className={`badge badge-${row.Status.toLowerCase()}`}>
                              {row.Status}
                            </span>
                          </td>
                          <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {row.Message}
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{row.Timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
