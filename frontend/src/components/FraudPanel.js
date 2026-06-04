/**
 * FraudPanel -- Risk index table with expandable signal breakdown.
 *
 * Fetches fraud risk data every 30 seconds. Clicking a row reveals
 * mini progress bars for each of the 4 fraud signals (velocity,
 * concentration, transaction anomaly, timing correlation).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { fetchFraudRisk } from '../api';

const LEVEL_COLORS = {
  CRITICAL: '#aa00ff',
  HIGH: '#ff1744',
  MEDIUM: '#ff9100',
  LOW: '#00e676',
};

export default function FraudPanel() {
  const [risks, setRisks] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [expandedTicker, setExpandedTicker] = useState(null);

  const loadData = useCallback(async () => {
    const data = await fetchFraudRisk();
    setRisks(data);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
    },
    th: {
      fontSize: 11,
      fontWeight: 600,
      color: '#787b86',
      textAlign: 'right',
      padding: '8px 20px',
      borderBottom: '1px solid #f0f3f6',
      letterSpacing: 0.5,
    },
    thLeft: {
      textAlign: 'left',
    },
    td: {
      fontSize: 13,
      padding: '10px 20px',
      borderBottom: '1px solid #f0f3f6',
      color: '#131722',
      textAlign: 'right',
    },
    tdLeft: {
      textAlign: 'left',
      fontWeight: 600,
    },
    row: {
      cursor: 'pointer',
      transition: 'background 0.2s ease',
    },
    badge: (level) => ({
      fontSize: 11,
      fontWeight: 600,
      color: LEVEL_COLORS[level] || '#787b86',
    }),
    expandRow: {
      background: '#f8f9fb',
    },
    signalContainer: {
      padding: '12px 20px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '8px 24px',
    },
    signalLabel: {
      fontSize: 11,
      color: '#787b86',
      marginBottom: 3,
    },
    progressTrack: {
      height: 4,
      borderRadius: 2,
      background: '#e0e3eb',
      overflow: 'hidden',
    },
    progressBar: (value, color) => ({
      height: '100%',
      borderRadius: 2,
      width: `${Math.min(value * 100, 100)}%`,
      background: color,
      transition: 'width 0.5s ease',
    }),
    empty: {
      color: '#787b86',
      fontSize: 13,
      textAlign: 'center',
      padding: 40,
    },
  };

  // Build expandable signal bars using placeholder values from the basic risk endpoint
  // Full signal breakdown requires the /fraud/assessments endpoint
  const renderSignalBreakdown = (risk) => {
    const signals = [
      { label: 'Bearish Ratio', value: risk.bearish_ratio || 0, color: '#ff1744' },
      { label: 'Risk Score', value: risk.fraud_risk_score || 0, color: '#ff9100' },
      { label: 'Total Articles', value: Math.min((risk.total_articles || 0) / 100, 1), color: '#448aff' },
      { label: 'Bearish Count', value: Math.min((risk.bearish_count || 0) / 50, 1), color: '#aa00ff' },
    ];

    return (
      <div style={styles.signalContainer}>
        {signals.map((s) => (
          <div key={s.label}>
            <div style={styles.signalLabel}>
              {s.label}: {(s.value * 100).toFixed(1)}%
            </div>
            <div style={styles.progressTrack}>
              <div style={styles.progressBar(s.value, s.color)} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header removed as it is now provided by App.js Watchlist title */}

      {risks.length === 0 ? (
        <div style={styles.empty}>No fraud risk data available</div>
      ) : (
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, ...styles.thLeft }}>Symbol</th>
                <th style={styles.th}>Score</th>
                <th style={styles.th}>Level</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((r) => (
                <React.Fragment key={r.ticker}>
                  <tr
                    style={{
                      ...styles.row,
                      background: expandedTicker === r.ticker
                        ? '#f8f9fb'
                        : 'transparent',
                    }}
                    onClick={() =>
                      setExpandedTicker(
                        expandedTicker === r.ticker ? null : r.ticker
                      )
                    }
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = '#f8f9fb')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        expandedTicker === r.ticker
                          ? '#f8f9fb'
                          : 'transparent')
                    }
                  >
                    <td style={{ ...styles.td, ...styles.tdLeft }}>
                      {r.ticker}
                    </td>
                    <td style={{ ...styles.td, color: LEVEL_COLORS[r.risk_level] || '#787b86' }}>
                      {r.fraud_risk_score.toFixed(4)}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.badge(r.risk_level)}>{r.risk_level}</span>
                    </td>
                  </tr>
                  {expandedTicker === r.ticker && (
                    <tr>
                      <td colSpan={5} style={styles.expandRow}>
                        {renderSignalBreakdown(r)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
