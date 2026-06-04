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
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    },
    title: {
      display: 'none',
    },
    allClear: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      gap: 12,
      padding: 20,
    },
    checkmark: {
      width: 48,
      height: 48,
      borderRadius: '50%',
      background: '#e6f5ef',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 24,
      color: '#089981',
    },
    clearText: {
      fontSize: 14,
      color: '#089981',
      fontWeight: 500,
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
    },
    th: {
      fontSize: 11,
      fontWeight: 600,
      color: '#787b86',
      textAlign: 'left',
      padding: '8px 20px',
      borderBottom: '1px solid #f0f3f6',
      letterSpacing: 0.5,
    },
    td: {
      fontSize: 13,
      padding: '10px 20px',
      borderBottom: '1px solid #f0f3f6',
      color: '#131722',
    },
    directionBadge: (dir) => ({
      fontSize: 11,
      fontWeight: 600,
      padding: '2px 6px',
      borderRadius: 4,
      background: dir === 'BUY' ? '#e6f5ef' : '#fdedef',
      color: dir === 'BUY' ? '#089981' : '#f23645',
    }),
    flagged: {
      fontSize: 11,
      fontWeight: 600,
      padding: '2px 6px',
      borderRadius: 4,
      background: '#fdedef',
      color: '#f23645',
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
                  <td style={{ ...styles.td, fontWeight: 600 }}>
                    {tx.ticker}
                  </td>
                  <td style={styles.td}>
                    {formatUSD(tx.amount)}
                  </td>
                  <td style={styles.td}>
                    <span style={styles.directionBadge(tx.direction)}>
                      {tx.direction}
                    </span>
                  </td>
                  <td style={{ ...styles.td, fontSize: 12, color: '#787b86' }}>
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
