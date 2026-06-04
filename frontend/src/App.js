/**
 * App.js -- Archer Dashboard Root Component
 *
 * Assembles all panels into a 3-row grid layout:
 *   Row 1: Horizontal scroll of 8 TickerCards
 *   Row 2: LiveFeed (40%) + FraudPanel (60%)
 *   Row 3: SentimentChart (55%) + FlaggedTransactions (45%)
 *
 * Dark theme throughout. WebSocket connection drives the LiveFeed.
 * Ticker data refreshes every 10 seconds via polling.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { fetchTickers } from './api';
import useWebSocket from './hooks/useWebSocket';
import TickerCard from './components/TickerCard';
import LiveFeed from './components/LiveFeed';
import FraudPanel from './components/FraudPanel';
import SentimentChart from './components/SentimentChart';
import FlaggedTransactions from './components/FlaggedTransactions';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws/sentiment';

// Pulsing animation for the LIVE indicator dot
const PULSE_CSS = `
@keyframes archerPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.5; transform: scale(1.3); }
}
`;

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
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#e0e0e8',
      padding: '0 24px 40px 24px',
    },
    // ---- Header ----
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '24px 0 20px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      marginBottom: 24,
    },
    logoArea: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    },
    logo: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 32,
      fontWeight: 700,
      color: '#fff',
      letterSpacing: 4,
    },
    subtitle: {
      fontSize: 13,
      color: '#666',
      maxWidth: 340,
    },
    liveIndicator: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    liveDot: {
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: '#00e676',
      boxShadow: '0 0 12px rgba(0,230,118,0.6)',
      animation: 'archerPulse 2s ease-in-out infinite',
    },
    liveText: {
      fontSize: 13,
      fontWeight: 700,
      color: '#00e676',
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: 2,
    },
    // ---- Row 1: Ticker Cards ----
    tickerRow: {
      display: 'flex',
      gap: 14,
      overflowX: 'auto',
      paddingBottom: 8,
      marginBottom: 24,
      scrollbarWidth: 'thin',
      scrollbarColor: '#333 transparent',
    },
    // ---- Row 2: Live Feed + Fraud Panel ----
    row2: {
      display: 'grid',
      gridTemplateColumns: '40% 60%',
      gap: 16,
      marginBottom: 24,
      minHeight: 420,
    },
    // ---- Row 3: Chart + Flagged ----
    row3: {
      display: 'grid',
      gridTemplateColumns: '55% 45%',
      gap: 16,
      marginBottom: 24,
      minHeight: 380,
    },
    // ---- Footer ----
    footer: {
      textAlign: 'center',
      padding: '20px 0',
      borderTop: '1px solid rgba(255,255,255,0.04)',
      fontSize: 12,
      color: '#444',
      fontFamily: "'JetBrains Mono', monospace",
    },
  };

  return (
    <div style={styles.app}>
      <style>{PULSE_CSS}</style>

      {/* ---- Header ---- */}
      <header style={styles.header}>
        <div style={styles.logoArea}>
          <div>
            <div style={styles.logo}>ARCHER</div>
            <div style={styles.subtitle}>
              Real-Time Financial Sentiment &amp; Fraud Risk Engine
            </div>
          </div>
        </div>
        <div style={styles.liveIndicator}>
          <div style={styles.liveDot} />
          <span style={styles.liveText}>LIVE</span>
        </div>
      </header>

      {/* ---- Row 1: Ticker Cards ---- */}
      <div style={styles.tickerRow}>
        {tickers.length > 0
          ? tickers.map((t) => <TickerCard key={t.ticker} ticker={t} />)
          : Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: '#12121a',
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.04)',
                  minWidth: 180,
                  height: 120,
                  flexShrink: 0,
                }}
              />
            ))}
      </div>

      {/* ---- Row 2: Live Feed + Fraud Panel ---- */}
      <div style={styles.row2}>
        <LiveFeed messages={messages} connected={connected} />
        <FraudPanel />
      </div>

      {/* ---- Row 3: Sentiment Chart + Flagged Transactions ---- */}
      <div style={styles.row3}>
        <SentimentChart />
        <FlaggedTransactions />
      </div>

      {/* ---- Footer ---- */}
      <footer style={styles.footer}>
        Powered by FinBERT + Kafka + FastAPI
      </footer>
    </div>
  );
}
