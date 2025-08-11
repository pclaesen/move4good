// src/app/page.js
import Header from '../app/components/Header/Header';
import Hero from '../app/components/Hero/Hero';
import Features from '../app/components/Features/Features';
import Footer from '../app/components/Footer/Footer';
import Connection from '../app/components/Connection/Connection';

export default function Home() {
  return (
    <div className="app">
      <Header />
      <Hero />
      <Features />
      {/* <Connection /> */}
      <Footer />
    </div>
  );
}