// src/components/Footer/Footer.js
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Run4Good</h3>
            <p>Turning miles into charitable impact, one run at a time.</p>
          </div>
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#features">How it Works</a></li>
              <li><a href="#charities">Charities</a></li>
              <li><a href="#runners">For Runners</a></li>
              <li><a href="#supporters">For Supporters</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Support</h4>
            <ul>
              <li><a href="#help">Help Center</a></li>
              <li><a href="#contact">Contact Us</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#terms">Terms of Service</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Connect</h4>
            <div className="social-links">
              <a href="#" aria-label="Twitter">🐦</a>
              <a href="#" aria-label="Facebook">📘</a>
              <a href="#" aria-label="Instagram">📷</a>
              <a href="#" aria-label="LinkedIn">💼</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 Run4Good. All rights reserved.</p>
          <p>Powered by Strava API</p>
        </div>
      </div>
    </footer>
  );
}