'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header/Header';
import './Charities.css';
import { CharityFormPage } from '../components/CharityForm/CharityForm';
import StravaConnectButton from '../components/StravaConnectButton/StravaConnectButton';

// Dummy data for charities
const CHARITIES = [
  { 
    id: 1, 
    name: 'Save the Children',
    description: 'Helping children worldwide get the health care, education, and protection they need.'
  },
  { 
    id: 2, 
    name: 'Red Cross',
    description: 'Providing emergency assistance, disaster relief, and disaster preparedness education.'
  },
  { 
    id: 3, 
    name: 'Doctors Without Borders',
    description: 'Delivering medical care where it is needed most, regardless of race, religion, or politics.'
  },
  { 
    id: 4, 
    name: 'World Wildlife Fund',
    description: 'Working to conserve nature and reduce the most pressing threats to biodiversity.'
  },
];

function useStravaConnected() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isConnected = localStorage.getItem('strava_user') !== null;
    setConnected(isConnected);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (window.location.pathname === '/auth/strava/callback') {
      setConnected(true);
    }
  }, []);

  return [connected, setConnected, loading];
}

export default function Charities() {
  const [stravaConnected, setStravaConnected, loadingConnection] = useStravaConnected();
  const [selectedCharities, setSelectedCharities] = useState([]);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Load user data if available
    const userData = localStorage.getItem('strava_user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    }

    // Load saved charity selections
    const savedSelections = localStorage.getItem('selected_charities');
    if (savedSelections) {
      setSelectedCharities(JSON.parse(savedSelections));
    }
  }, []);

  useEffect(() => {
    // Save charity selections to localStorage
    if (selectedCharities.length > 0) {
      localStorage.setItem('selected_charities', JSON.stringify(selectedCharities));
    }
  }, [selectedCharities]);

  const handleCharityToggle = (id) => {
    setSelectedCharities((prev) =>
      prev.includes(id)
        ? prev.filter((cid) => cid !== id)
        : [...prev, id]
    );
  };

  if (loadingConnection) {
    return (
      <div className="charities-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="charities">
      {/* Header */}
      <div>
        <Header />
      </div>
      
      {/* Page Header */}
      <div className="charities-header">
        <div className="container">
          <div className="header-content">
            <div className="charities-title">
              <div>
                <h1>Select Charities to Run For</h1>
                <p>Choose the causes you want to support with your runs.</p>
              </div>
            </div>
            {!stravaConnected && (
              <div>
                <StravaConnectButton />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container">
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">💖</div>
            <div className="stat-info">
              <span className="stat-number">{selectedCharities.length}</span>
              <span className="stat-label">Charities Selected</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏃‍♂️</div>
            <div className="stat-info">
              <span className="stat-number">{CHARITIES.length}</span>
              <span className="stat-label">Available Charities</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🌟</div>
            <div className="stat-info">
              <span className="stat-number">
                {stravaConnected ? 'Connected' : 'Not Connected'}
              </span>
              <span className="stat-label">Strava Status</span>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        {!stravaConnected && (
          <div className="strava-connect-section">
            <h3>Connect Strava to Get Started</h3>
            <p>You need to connect your Strava account to select charities and track your running donations.</p>
            <StravaConnectButton />
          </div>
        )}

        {/* Available Charities */}
        <div className="charities-section">
          <h2>Available Charities</h2>
          <div className="charities-list">
            {CHARITIES.map((charity) => (
              <div key={charity.id} className="charity-card">
                <div className="charity-header">
                  <div>
                    <h3>{charity.name}</h3>
                    {charity.description && (
                      <p style={{ 
                        margin: '0.5rem 0 0 0', 
                        color: '#666', 
                        fontSize: '0.95rem',
                        lineHeight: '1.4'
                      }}>
                        {charity.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="charity-selection">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedCharities.includes(charity.id)}
                      onChange={() => handleCharityToggle(charity.id)}
                      disabled={!stravaConnected}
                    />
                    {stravaConnected ? 'Select this charity' : 'Connect Strava to select'}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Charities Summary */}
        <div className="selected-charities-section">
          <h2>Your Selected Charities</h2>
          {selectedCharities.length > 0 ? (
            <div>
              <p>You're running for these amazing causes:</p>
              <div className="selected-charities-list">
                {CHARITIES
                  .filter(c => selectedCharities.includes(c.id))
                  .map(c => c.name)
                  .join(', ')}
              </div>
              <p style={{ marginTop: '1.5rem', fontSize: '1rem' }}>
                Every kilometer you run will contribute to these charities. Keep up the great work!
              </p>
            </div>
          ) : (
            <div>
              <p className="no-selection">No charities selected yet.</p>
              {stravaConnected ? (
                <p>Select charities above to start making a difference with your runs!</p>
              ) : (
                <p>Connect your Strava account to select charities and start running for a cause.</p>
              )}
            </div>
          )}
          <div style={{ marginTop: '2rem' }}>
            <CharityFormPage />
          </div>
        </div>
      </div>
    </div>
  );
}