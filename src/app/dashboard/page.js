// src/app/dashboard/page.js
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header/Header';
import QRCodePopup from '../components/QRCodePopup/QRCodePopup';
import './dashboard.css';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRuns: 0,
    totalDistance: 0,
    totalDonations: 0,
    totalTime: 0
  });
  const [selectedCharities, setSelectedCharities] = useState([]);
  const [qrPopup, setQrPopup] = useState({ isOpen: false, charity: null });
  const [userWalletAddress, setUserWalletAddress] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated and fetch user data
    const checkAuth = async () => {
      try {
        // Primary authentication: Check localStorage for Strava user
        const localData = localStorage.getItem('strava_user');
        if (localData) {
          const userData = JSON.parse(localData);
          if (userData.connected && userData.athlete) {
            // Get enhanced user data from API with athlete_id
            try {
              const response = await fetch(`/api/user?athlete_id=${userData.athlete.id}`);
              if (response.ok) {
                const enhancedUserData = await response.json();
                setUser(enhancedUserData);
                setUserWalletAddress(enhancedUserData.wallet_address);
                fetchActivities(enhancedUserData);
                loadSelectedCharities(enhancedUserData);
                return;
              }
            } catch (err) {
              console.warn('Could not fetch enhanced user data, using localStorage data');
            }
            
            // Fallback to localStorage data
            setUser(userData);
            fetchActivities(userData);
            loadSelectedCharities(userData);
            return;
          }
        }
        
        // No authentication found, redirect to home
        router.push('/');
      } catch (err) {
        console.error('Auth check failed:', err);
        router.push('/');
      }
    };

    checkAuth();
  }, [router]);

  const loadSelectedCharities = async (userData = null) => {
    try {
      const currentUser = userData || user;
      
      // Check if we have user data with athlete info
      if (!currentUser || !currentUser.athlete?.id) return;
      
      const response = await fetch(`/api/user-charities?athlete_id=${currentUser.athlete.id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedCharities(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load selected charities:', error);
    }
  };

  const fetchActivities = async (userData = null) => {
    try {
      // Use provided userData or fallback to state
      const currentUser = userData || user;
      let apiUrl = '/api/strava/activities';
      
      // Add athlete_id for localStorage users or when no Supabase session
      if (currentUser && currentUser.athlete && currentUser.athlete.id) {
        apiUrl += `?athlete_id=${currentUser.athlete.id}`;
      }
      
      const response = await fetch(apiUrl);

      if (response.ok) {
        const activitiesData = await response.json();
        setActivities(activitiesData.slice(0, 5)); // Show last 5 activities
        
        // Calculate stats
        const runActivities = activitiesData.filter(activity => 
          activity.type === 'Run' || activity.type === 'VirtualRun'
        );
        
        const totalDistance = runActivities.reduce((sum, activity) => 
          sum + (activity.distance / 1000), 0 // Convert to kilometers
        );
        
        const totalTime = runActivities.reduce((sum, activity) => 
          sum + activity.moving_time, 0
        );

        setStats({
          totalRuns: runActivities.length,
          totalDistance: Math.round(totalDistance * 10) / 10,
          totalDonations: Math.round(totalDistance * 2.5), // $2.50 per km example
          totalTime: totalTime
        });
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      // Clear localStorage and redirect to home
      localStorage.removeItem('strava_user');
      router.push('/');
    } catch (error) {
      console.error('Error disconnecting:', error);
      router.push('/');
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleShowQR = (charity) => {
    setQrPopup({ isOpen: true, charity });
  };

  const handleCloseQR = () => {
    setQrPopup({ isOpen: false, charity: null });
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div>
        <Header />
      </div>
      <div className="dashboard-header">
        <div className="container">
          <div className="header-content">
            <div className="user-welcome">
              <img 
                src={user?.athlete?.profile} 
                alt="Profile" 
                className="profile-pic"
              />
              <div>
                <h1>Welcome back, {user?.athlete?.firstname}!</h1>
                <p>Keep running and making a difference</p>
              </div>
            </div>
            <button onClick={handleDisconnect} className="disconnect-btn">
              Disconnect Strava
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🏃‍♂️</div>
            <div className="stat-info">
              <span className="stat-number">{stats.totalRuns}</span>
              <span className="stat-label">Total Runs</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📏</div>
            <div className="stat-info">
              <span className="stat-number">{stats.totalDistance} km</span>
              <span className="stat-label">Distance Covered</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <span className="stat-number">${stats.totalDonations}</span>
              <span className="stat-label">Donations Raised</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏱️</div>
            <div className="stat-info">
              <span className="stat-number">{formatTime(stats.totalTime)}</span>
              <span className="stat-label">Time Running</span>
            </div>
          </div>
        </div>

        {/* Selected Charities for Sponsorship */}
        {selectedCharities.length > 0 && (
          <div className="charities-section">
            <h2>Get Sponsored for Your Charities</h2>
            <p>Share these QR codes with sponsors who want to support your running for these causes.</p>
            <div className="charities-grid">
              {selectedCharities.map((charitySelection) => (
                <div key={charitySelection.charity_name} className="charity-sponsor-card">
                  <div className="charity-info">
                    <h3>{charitySelection.charity_name}</h3>
                    {charitySelection.charities?.description && (
                      <p className="charity-description">{charitySelection.charities.description}</p>
                    )}
                  </div>
                  <button 
                    className="qr-btn"
                    onClick={() => handleShowQR({
                      name: charitySelection.charity_name,
                      address: userWalletAddress
                    })}
                    disabled={!userWalletAddress}
                  >
                    Show QR Code
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activities */}
        <div className="activities-section">
          <h2>Recent Activities</h2>
          {activities.length > 0 ? (
            <div className="activities-list">
              {activities.map((activity) => (
                <div key={activity.id} className="activity-card">
                  <div className="activity-header">
                    <h3>{activity.name}</h3>
                    <span className="activity-date">{formatDate(activity.start_date)}</span>
                  </div>
                  <div className="activity-stats">
                    <div className="activity-stat">
                      <span className="stat-value">{(activity.distance / 1000).toFixed(1)}</span>
                      <span className="stat-unit">km</span>
                    </div>
                    <div className="activity-stat">
                      <span className="stat-value">{formatTime(activity.moving_time)}</span>
                      <span className="stat-unit">time</span>
                    </div>
                    <div className="activity-stat">
                      <span className="stat-value">${((activity.distance / 1000) * 2.5).toFixed(0)}</span>
                      <span className="stat-unit">raised</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-activities">
              <p>No recent activities found. Go for a run and sync with Strava!</p>
            </div>
          )}
        </div>

        {/* Call to Action */}
        <div className="cta-section">
          <h2>Ready to raise more funds?</h2>
          <p>Share your Run4Good profile with friends and family to get more supporters!</p>
          <button className="cta-btn">Share Your Profile</button>
        </div>
      </div>
      
      {/* QR Code Popup */}
      <QRCodePopup
        isOpen={qrPopup.isOpen}
        onClose={handleCloseQR}
        walletAddress={qrPopup.charity?.address}
        charityName={qrPopup.charity?.name}
      />
    </div>
  );
}