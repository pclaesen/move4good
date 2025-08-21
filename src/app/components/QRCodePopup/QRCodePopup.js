'use client';
import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { generatePaymentURI, SPONSORSHIP_CONFIG } from '../../../lib/chain-config';
import './QRCodePopup.css';

export default function QRCodePopup({ isOpen, onClose, walletAddress, charityName }) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const popupRef = useRef(null);

  useEffect(() => {
    if (isOpen && walletAddress) {
      const paymentURI = generatePaymentURI(walletAddress);
      
      QRCode.toDataURL(paymentURI, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      .then(url => {
        setQrCodeUrl(url);
      })
      .catch(err => {
        console.error('Error generating QR code:', err);
      });
    }
  }, [isOpen, walletAddress]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    }

    function handleEscapeKey(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="qr-popup-overlay">
      <div className="qr-popup" ref={popupRef}>
        <div className="qr-popup-header">
          <h3>Sponsor {charityName}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="qr-popup-content">
          <div className="qr-code-container">
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="QR Code for payment" className="qr-code" />
            ) : (
              <div className="qr-loading">Generating QR code...</div>
            )}
          </div>
          
          <div className="payment-details">
            <div className="amount">
              <span className="amount-value">{SPONSORSHIP_CONFIG.fixedAmount.USDC} USDC</span>
              <span className="amount-label">Fixed sponsorship amount</span>
            </div>
            
            <div className="network-info">
              <span className="network-name">Base Sepolia</span>
              <span className="network-label">Test Network</span>
            </div>
          </div>
          
          <div className="instructions">
            <h4>How to sponsor:</h4>
            <ol>
              <li>Open your crypto wallet app (MetaMask, Coinbase Wallet, etc.)</li>
              <li>Scan this QR code with your wallet</li>
              <li>Confirm the transaction details</li>
              <li>Complete the payment</li>
            </ol>
            <p className="note">
              Make sure you're connected to Base Sepolia network in your wallet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}