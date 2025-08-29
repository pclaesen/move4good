// src/components/Features/Features.js
import './Features.css';

export default function Features() {
  const features = [
    {
      icon: '🏃‍♂️',
      title: 'Connect Your Runs',
      description: 'Automatically sync your running activities from Strava to track your charitable impact.'
    },
    {
      icon: '💰',
      title: 'Receive Donations',
      description: 'Supporters pledge money per mile, kilometer, or per run to your chosen charity causes.'
    },
    {
      icon: '❤️',
      title: 'Support Charities',
      description: 'Choose from hundreds of verified charities and make a real difference with every step.'
    },
    {
      icon: '📊',
      title: 'Track Impact',
      description: 'Monitor your running progress and see exactly how much you\'ve raised for charity.'
    }
  ];

  return (
    <section id="features" className="features">
      <div className="container">
        <div className="features-header">
          <h2>How Move4Good Works</h2>
          <p>Transform your passion for running into meaningful charitable impact</p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}