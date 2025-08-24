'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header/Header';
import './Charities.css';
import { CharityForm } from '../components/CharityForm/CharityForm';
import StravaConnectButton from '../components/StravaConnectButton/StravaConnectButton';


function useStravaConnected() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        // Check localStorage for Strava user
        const localData = localStorage.getItem('strava_user');
        if (localData) {
          const userData = JSON.parse(localData);
          if (userData.connected && userData.athlete) {
            setConnected(true);
            setLoading(false);
            return;
          }
        }
        
        // No authentication found
        setConnected(false);
      } catch (err) {
        console.error('Auth check failed:', err);
        setConnected(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    
    // Listen for storage changes (in case user connects/disconnects in another tab)
    const handleStorageChange = () => {
      checkAuth();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  return [connected, setConnected, loading];
}

export default function Charities() {
  const [stravaConnected, setStravaConnected, loadingConnection] = useStravaConnected();
  const [selectedCharities, setSelectedCharities] = useState([]);
  const [charities, setCharities] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasLoadedInitialSelections, setHasLoadedInitialSelections] = useState(false);
  const [userChangedSelections, setUserChangedSelections] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Load user data if authenticated
    const loadUserData = async () => {
      try {
        // Check localStorage for Strava user
        const localData = localStorage.getItem('strava_user');
        if (localData) {
          const userData = JSON.parse(localData);
          if (userData.connected && userData.athlete) {
            setUser(userData);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to load user data:', err);
      }
    };

    loadUserData();
    loadCharitiesAndSelections();
  }, []);

  const loadCharitiesAndSelections = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all charities from database
      const charitiesResponse = await fetch('/api/charities');
      const charitiesData = await charitiesResponse.json();
      
      if (charitiesResponse.ok) {
        setCharities(charitiesData.data || []);
      } else {
        throw new Error(charitiesData.error || 'Failed to load charities');
      }

      // Load user's charity selections if user is connected
      try {
        // Check Supabase auth first
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        
        if (authUser && !error) {
          const selectionsResponse = await fetch('/api/user-charities');
          const selectionsData = await selectionsResponse.json();
          
          if (selectionsResponse.ok) {
            const selectedNames = selectionsData.data.map(item => item.charity_name);
            setSelectedCharities(selectedNames);
            setHasLoadedInitialSelections(true);
            return;
          } else if (selectionsResponse.status !== 404) {
            console.warn('Failed to load user selections:', selectionsData.error);
          }
        }
        
        // Fallback check for localStorage user (they can still see charities but selections might not load from API)
        const localData = localStorage.getItem('strava_user');
        if (localData) {
          const userData = JSON.parse(localData);
          if (userData.connected && userData.athlete) {
            // Try to load selections even with localStorage auth
            try {
              const selectionsResponse = await fetch(`/api/user-charities?athlete_id=${userData.athlete.id}`);
              const selectionsData = await selectionsResponse.json();
              
              if (selectionsResponse.ok) {
                const selectedNames = selectionsData.data.map(item => item.charity_name);
                setSelectedCharities(selectedNames);
                setHasLoadedInitialSelections(true);
              }
            } catch (err) {
              console.warn('Could not load selections for localStorage user:', err);
            }
          }
        }
      } catch (authErr) {
        console.warn('User not authenticated, skipping charity selections load');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error loading charities:', err);
    } finally {
      setLoading(false);
      // Always set this flag after loading attempt, even if no selections found
      setHasLoadedInitialSelections(true);
    }
  };

  useEffect(() => {
    // Save charity selections to database when they change
    // Only save after initial selections have been loaded AND user has made explicit changes
    if (user && user.athlete && user.athlete.id && hasLoadedInitialSelections && userChangedSelections) {
      saveCharitySelections();
      setUserChangedSelections(false); // Reset flag after saving
    }
  }, [selectedCharities, user, hasLoadedInitialSelections, userChangedSelections]);

  const saveCharitySelections = async () => {
    if (!user || !user.athlete?.id) return;
    
    // Extra safety: Don't save empty selections unless user explicitly made changes
    if (selectedCharities.length === 0 && !userChangedSelections) {
      console.warn('Preventing save of empty charity selections without explicit user action');
      return;
    }
    
    try {
      const response = await fetch('/api/user-charities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          charityNames: selectedCharities,
          athlete_id: user.athlete.id
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save charity selections');
      }
    } catch (err) {
      console.error('Error saving charity selections:', err);
      setError('Failed to save your charity selections');
    }
  };

  const handleCharityToggle = (charityName) => {
    setSelectedCharities((prev) =>
      prev.includes(charityName)
        ? prev.filter((name) => name !== charityName)
        : [...prev, charityName]
    );
    setUserChangedSelections(true); // Mark that user made a change
  };

  const handleAddCharity = async (charityData) => {
    try {
      const response = await fetch('/api/charities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: charityData.name,
          description: charityData.description,
          donationAddress: charityData.donationAddress
        })
      });

      const data = await response.json();
      if (response.ok) {
        // Reload charities to get the updated list
        await loadCharitiesAndSelections();
        setShowAddForm(false);
      } else {
        throw new Error(data.error || 'Failed to add charity');
      }
    } catch (err) {
      console.error('Error adding charity:', err);
      setError('Failed to add charity');
    }
  };

  if (loadingConnection || loading) {
    return (
      <div className="charities-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="charities-error">
        <div className="container">
          <Header />
          <div className="error-message">
            <h2>Error Loading Charities</h2>
            <p>{error}</p>
            <button onClick={loadCharitiesAndSelections}>Try Again</button>
          </div>
        </div>
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
              <span className="stat-number">{charities.length}</span>
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

        {/* Add Charity Section */}
        <div className="add-charity-section">
          <div className="section-header">
            <h2>Add New Charity</h2>
            {!showAddForm && (
              <button 
                className="add-charity-btn"
                onClick={() => setShowAddForm(true)}
              >
                Add Charity
              </button>
            )}
          </div>
          
          {showAddForm && (
            <div className="charity-form-container">
              <CharityForm 
                onSubmit={handleAddCharity}
                submitLabel="Add Charity"
              />
              <button 
                className="cancel-btn"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Available Charities */}
        <div className="charities-section">
          <h2>Available Charities</h2>
          <div className="charities-list">
            {charities.map((charity) => (
              <div key={charity.name} className="charity-card">
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
                    {charity.donation_address && (
                      <p style={{ 
                        margin: '0.5rem 0 0 0', 
                        color: '#888', 
                        fontSize: '0.85rem',
                        fontStyle: 'italic'
                      }}>
                        Donation Address: {charity.donation_address}
                      </p>
                    )}
                  </div>
                </div>
                <div className="charity-selection">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedCharities.includes(charity.name)}
                      onChange={() => handleCharityToggle(charity.name)}
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
                {selectedCharities.join(', ')}
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
        </div>
      </div>
    </div>
  );
}