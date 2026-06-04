/**
 * FlaggedTransactions -- Shows transactions flagged by the fraud engine.
 *
 * When no transactions are flagged, displays a positive "all clear" indicator.
 * Auto-refreshes every 30 seconds to pick up newly flagged trades.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { fetchFlaggedTransactions } from '../api';

export default function FlaggedTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const data = await fetchFlaggedTransactions();
    setTransactions(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const styles = {
    container: {
      background: '#12121a',
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.06)',
      padding: 20,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    },
    title: {
      fontSize: 16,
      fontWeight: 600,
      color: '#fff',
      marginBottom: 16,
    },
    allClear: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      gap: 12,
      padding: 40,
    },
    checkmark: {
      width: 48,
      height: 48,
      borderRadius: '50%',
      background: 'rgba(0,230,118,0.12)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 24,
      color: '#00e676',
    },
    clearText: {
      fontSize: 14,
      color: '#00e676',
      fontWeight: 500,
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
    },
    th: {
      fontSize: 11,
      fontWeight: 600,
      color: '#666',
      textAlign: 'left',
      padding: '8px 10px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    td: {
      fontSize: 13,
      padding: '10px 10px',
      borderBottom: '1px solid rgba(255,255,255,0.03)',
      color: '#b0b0c0',
    },
    directionBadge: (dir) => ({
      fontSize: 10,
      fontWeight: 700,
      padding: '3px 8px',
      borderRadius: 6,
      background: dir === 'BUY' ? 'rgba(68,138,255,0.15)' : 'rgba(255,23,68,0.15)',
      color: dir === 'BUY' ? '#448aff' : '#ff1744',
    }),
    flagged: {
      fontSize: 10,
      fontWeight: 700,
      padding: '3px 8px',
      borderRadius: 6,
      background: 'rgba(255,23,68,0.15)',
      color: '#ff1744',
    },
  };

  // Format a number as USD with commas (e.g. $12,345.67)
  const formatUSD = (n) =>
    '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.title}>Flagged Transactions</div>
        <div style={{ color: '#555', textAlign: 'center', padding: 40 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>Flagged Transactions</div>

      {transactions.length === 0 ? (
        <div style={styles.allClear}>
          {/* Green checkmark icon rendered with pure CSS */}
          <div style={styles.checkmark}>&#10003;</div>
          <div style={styles.clearText}>No flagged transactions detected</div>
        </div>
      ) : (
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Ticker</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Direction</th>
                <th style={styles.th}>Time</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, i) => (
                <tr key={tx.id || i}>
                  <td style={{ ...styles.td, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#fff' }}>
                    {tx.ticker}
                  </td>
                  <td style={{ ...styles.td, fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatUSD(tx.amount)}
                  </td>
                  <td style={styles.td}>
                    <span style={styles.directionBadge(tx.direction)}>
                      {tx.direction}
                    </span>
                  </td>
                  <td style={{ ...styles.td, fontSize: 12 }}>
                    {tx.timestamp
                      ? new Date(tx.timestamp).toLocaleString()
                      : 'N/A'}
                  </td>
                  <td style={styles.td}>
                    <span style={styles.flagged}>FLAGGED</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
