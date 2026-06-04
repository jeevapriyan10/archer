import React, { useState, useEffect, useCallback } from 'react';
import { fetchTickers } from './api';
import useWebSocket from './hooks/useWebSocket';
import LiveFeed from './components/LiveFeed';
import FraudPanel from './components/FraudPanel';
import SentimentChart from './components/SentimentChart';
import FlaggedTransactions from './components/FlaggedTransactions';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws/sentiment';

// Helper component for the top bar mini tickers
const MiniTicker = ({ ticker }) => {
  const score = ticker.last_score || 0;
  const isUp = score >= 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '0 20px', borderRight: '1px solid #e0e3eb' }}>
      <div style={{ fontSize: 12, color: '#787b86', fontWeight: 600 }}>{ticker.ticker}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#131722', display: 'flex', alignItems: 'center', gap: 6 }}>
        {score.toFixed(4)}
        <span style={{ fontSize: 11, color: isUp ? '#089981' : '#f23645' }}>
          {isUp ? '▲' : '▼'}
        </span>
      </div>
    </div>
  );
};

// Helper component for the right sidebar positions
const PositionCard = ({ ticker }) => {
  const score = ticker.last_score || 0;
  const isUp = score >= 0;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f3f6' }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: '#131722' }}>{ticker.ticker}</div>
      <div style={{ display: 'flex', gap: 16, fontSize: 13, fontWeight: 500 }}>
        <div style={{ color: '#131722' }}>{ticker.total_articles}</div>
        <div style={{ color: isUp ? '#089981' : '#f23645', width: 60, textAlign: 'right' }}>
          {score > 0 ? '+' : ''}{score.toFixed(2)}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [tickers, setTickers] = useState([]);
  const { messages, connected } = useWebSocket(WS_URL);

  const loadTickers = useCallback(async () => {
    const data = await fetchTickers();
    setTickers(data);
  }, []);

  useEffect(() => {
    loadTickers();
    const interval = setInterval(loadTickers, 10000);
    return () => clearInterval(interval);
  }, [loadTickers]);

  const styles = {
    app: {
      height: '100vh',
      background: '#f4f7fe',
      color: '#131722',
      display: 'flex',
      fontFamily: "'Inter', sans-serif",
      overflow: 'hidden',
    },
    leftSidebar: {
      width: 280,
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '4px 0 24px rgba(0,0,0,0.02)',
      zIndex: 10,
    },
    logoArea: {
      padding: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    },
    logoText: {
      fontSize: 22,
      fontWeight: 800,
      color: '#131722',
      letterSpacing: -0.5,
    },
    mainContent: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    header: {
      height: 72,
      background: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.02)',
      zIndex: 5,
    },
    topTickers: {
      display: 'flex',
      alignItems: 'center',
      height: '100%',
    },
    statusBadge: {
      padding: '6px 12px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      background: connected ? '#e6f5ef' : '#fdedef',
      color: connected ? '#089981' : '#f23645',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    },
    gridArea: {
      flex: 1,
      padding: 24,
      display: 'grid',
      gridTemplateColumns: '280px 1fr 320px',
      gap: 24,
      overflow: 'hidden',
    },
    column: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      overflow: 'hidden',
    },
    card: {
      background: '#ffffff',
      borderRadius: 16,
      boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    cardTitle: {
      padding: '20px 20px 12px 20px',
      fontSize: 15,
      fontWeight: 700,
      color: '#131722',
    }
  };

  return (
    <div style={styles.app}>
      
      {/* --- LEFT SIDEBAR --- */}
      <div style={styles.leftSidebar}>
        <div style={styles.logoArea}>
          <div style={{ width: 32, height: 32, background: '#131722', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>A</span>
          </div>
          <div style={styles.logoText}>Archer</div>
        </div>
        
        {/* We reuse LiveFeed as our sidebar activity log, fitting perfectly without dummy buttons */}
        <div style={{ padding: '0 24px 12px 24px', fontSize: 13, fontWeight: 700, color: '#787b86', marginTop: 12 }}>
          LIVE FEED
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
           <LiveFeed messages={messages} connected={connected} />
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div style={styles.mainContent}>
        
        {/* HEADER */}
        <header style={styles.header}>
          <div style={styles.topTickers}>
            {tickers.slice(0, 5).map(t => <MiniTicker key={t.ticker} ticker={t} />)}
          </div>
          <div style={styles.statusBadge}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#089981' : '#f23645' }} />
            {connected ? 'System Online' : 'Connecting...'}
          </div>
        </header>

        {/* 3-COLUMN GRID */}
        <div style={styles.gridArea}>
          
          {/* COLUMN 1: System Overview & Fraud Risk */}
          <div style={styles.column}>
            {/* System Overview Card */}
            <div style={{ ...styles.card, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#131722', marginBottom: 16 }}>System Overview</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#089981', marginBottom: 4 }}>
                {tickers.length > 0 ? (tickers.reduce((sum, t) => sum + (t.last_score || 0), 0) / tickers.length).toFixed(4) : '0.0000'}
              </div>
              <div style={{ fontSize: 12, color: '#787b86' }}>Average Market Sentiment</div>
              
              <div style={{ height: 1, background: '#f0f3f6', margin: '16px 0' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#787b86' }}>Tickers Monitored</span>
                <span style={{ fontWeight: 600, color: '#131722' }}>{tickers.length}</span>
              </div>
            </div>

            {/* Fraud Panel */}
            <div style={{ ...styles.card, flex: 1 }}>
              <div style={styles.cardTitle}>Risk Index</div>
              <FraudPanel />
            </div>
          </div>

          {/* COLUMN 2: Main Chart & Flagged Transactions */}
          <div style={styles.column}>
            <div style={{ ...styles.card, flex: 3 }}>
              <SentimentChart />
            </div>
            
            <div style={{ ...styles.card, flex: 2 }}>
              <FlaggedTransactions />
            </div>
          </div>

          {/* COLUMN 3: Ticker Positions */}
          <div style={styles.column}>
            <div style={{ ...styles.card, flex: 1 }}>
              <div style={{ ...styles.cardTitle, display: 'flex', justifyContent: 'space-between' }}>
                <span>Positions</span>
                <span style={{ fontSize: 12, color: '#787b86', fontWeight: 500 }}>Articles | Score</span>
              </div>
              <div style={{ padding: '0 20px', overflowY: 'auto' }}>
                {tickers.map(t => <PositionCard key={t.ticker} ticker={t} />)}
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
