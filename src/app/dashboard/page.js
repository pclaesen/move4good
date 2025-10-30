// src/app/dashboard/page.js
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import Header from '../components/Header/Header';
import QRCodePopup from '../components/QRCodePopup/QRCodePopup';
import { RUN_DISTANCE_OPTIONS, DEFAULT_RUN_OPTION } from '../../lib/run-options';
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
  const [qrPopup, setQrPopup] = useState({ isOpen: false, charity: null, runDistance: null });
  const [userWalletAddress, setUserWalletAddress] = useState(null);
  const [runDistanceSelections, setRunDistanceSelections] = useState({});
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated using Supabase session
    const checkAuth = async () => {
      try {
        const supabase = createClient();

        // Check for active Supabase session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.log('No active session, redirecting to home');
          router.push('/');
          return;
        }

        // Fetch user data from API using session
        const response = await fetch('/api/user');

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setUserWalletAddress(userData.wallet_address);
          fetchActivities();
          loadSelectedCharities();
        } else if (response.status === 401) {
          console.log('Unauthorized, redirecting to home');
          router.push('/');
        } else {
          console.error('Failed to fetch user data');
          router.push('/');
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        router.push('/');
      }
    };

    checkAuth();
  }, [router]);

  const loadSelectedCharities = async () => {
    try {
      // Fetch charities using session authentication only
      const response = await fetch('/api/user-charities');
      if (response.ok) {
        const data = await response.json();
        setSelectedCharities(data.data || []);
      } else {
        console.error('Failed to load charities:', response.status);
      }
    } catch (error) {
      console.error('Failed to load selected charities:', error);
    }
  };

  const fetchActivities = async () => {
    try {
      // Fetch activities using session authentication only
      const response = await fetch('/api/strava/activities');

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
      const supabase = createClient();

      // Sign out from Supabase
      await supabase.auth.signOut();

      // Redirect to home
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

  const handleShowQR = (charity, runDistance) => {
    setQrPopup({ isOpen: true, charity, runDistance });
  };

  const handleRunDistanceChange = (charityName, selectedValue) => {
    setRunDistanceSelections(prev => ({
      ...prev,
      [charityName]: selectedValue
    }));
  };

  const handleCloseQR = () => {
    setQrPopup({ isOpen: false, charity: null, runDistance: null });
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
              {selectedCharities.map((charitySelection) => {
                const selectedRunDistance = runDistanceSelections[charitySelection.charity_name] || '';
                const runOption = RUN_DISTANCE_OPTIONS.find(option => option.value === selectedRunDistance);
                const isQREnabled = userWalletAddress && selectedRunDistance;
                
                return (
                  <div key={charitySelection.charity_name} className="charity-sponsor-card">
                    <div className="charity-info">
                      <h3>{charitySelection.charity_name}</h3>
                      {charitySelection.charities?.description && (
                        <p className="charity-description">{charitySelection.charities.description}</p>
                      )}
                    </div>
                    <div className="charity-actions">
                      <select 
                        className="run-distance-select"
                        value={selectedRunDistance}
                        onChange={(e) => handleRunDistanceChange(charitySelection.charity_name, e.target.value)}
                      >
                        <option value="">{DEFAULT_RUN_OPTION.label}</option>
                        {RUN_DISTANCE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button 
                        className={`qr-btn ${!isQREnabled ? 'disabled' : ''}`}
                        onClick={() => handleShowQR({
                          name: charitySelection.charity_name,
                          address: userWalletAddress
                        }, runOption)}
                        disabled={!isQREnabled}
                      >
                        Show QR Code
                      </button>
                    </div>
                  </div>
                );
              })}
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
          <p>Share your Move4Good profile with friends and family to get more supporters!</p>
          <button className="cta-btn">Share Your Profile</button>
        </div>
      </div>
      
      {/* QR Code Popup */}
      <QRCodePopup
        isOpen={qrPopup.isOpen}
        onClose={handleCloseQR}
        walletAddress={qrPopup.charity?.address}
        charityName={qrPopup.charity?.name}
        runDistance={qrPopup.runDistance}
      />
    </div>
  );
}