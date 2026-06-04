"""
Archer -- Fraud Correlation Engine

Computes a multi-signal fraud risk score for each ticker by correlating:
  1. Sentiment velocity  (how fast sentiment is deteriorating)
  2. Bearish concentration (what fraction of articles are bearish)
  3. Transaction anomaly  (unusual volume, direction skew, or trade size)
  4. Timing correlation   (trades placed before negative news drops)

The weighted combination produces a single 0-1 score.  Trades associated
with HIGH/CRITICAL risk tickers are automatically flagged for review.
"""

import sys
import os
from datetime import datetime, timezone, timedelta

import requests
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session

# Allow imports from project root so db.models resolves correctly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from db.models import SentimentScore, Transaction, FraudAssessment

# All 8 monitored tickers
TICKERS = ["AAPL", "TSLA", "GOOGL", "MSFT", "AMZN", "META", "NVDA", "JPM"]


class FraudEngine:
    """Stateless-per-tick engine: each assessment reads a fresh DB window."""

    def __init__(self):
        # --- signal weights (must sum to 1.0) ---
        # Timing gets the highest weight because pre-news trading is the
        # strongest single indicator of insider-driven manipulation.
        self.W_VELOCITY = 0.20
        self.W_CONCENTRATION = 0.20
        self.W_TRANSACTION = 0.25
        self.W_TIMING = 0.35

        # --- baseline thresholds ---
        # Rolling window size for all signal queries
        self.WINDOW_MINUTES = 60
        # "Normal" transaction count within the window; above this amplifies risk
        self.BASELINE_TRANSACTIONS = 25
        # Even split between buy/sell is the neutral baseline
        self.BASELINE_SELL_RATIO = 0.50
        # Average trade size considered normal (USD)
        self.BASELINE_AVG_SIZE = 45000.0

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def assess_ticker(self, ticker: str, db: Session) -> dict:
        """Run all 4 fraud signals for *ticker* and return assessment dict."""

        cutoff = datetime.now(timezone.utc) - timedelta(minutes=self.WINDOW_MINUTES)

        # -- Shared data pulls (one query each, reused across signals) --
        sentiments = (
            db.query(SentimentScore)
            .filter(
                SentimentScore.ticker == ticker,
                SentimentScore.processed_at >= cutoff,
            )
            .order_by(asc(SentimentScore.processed_at))
            .all()
        )

        transactions = (
            db.query(Transaction)
            .filter(
                Transaction.ticker == ticker,
                Transaction.timestamp >= cutoff,
            )
            .all()
        )

        # -- Signal 1: Sentiment Velocity --
        # Measures how rapidly sentiment is worsening within the window.
        # A large negative swing (early positive -> recent negative) hints
        # at a coordinated narrative shift often seen before pump-and-dump exits.
        velocity_score = 0.0
        if len(sentiments) >= 2:
            mid = len(sentiments) // 2
            early_scores = [s.sentiment_score for s in sentiments[:mid]]
            recent_scores = [s.sentiment_score for s in sentiments[mid:]]
            early_avg = sum(early_scores) / len(early_scores)
            recent_avg = sum(recent_scores) / len(recent_scores)
            # Negative velocity = sentiment getting worse
            velocity = recent_avg - early_avg
            velocity_score = min(abs(velocity) / 2.0, 1.0)

        # -- Signal 2: Bearish Concentration --
        # High proportion of bearish articles is suspicious because normal
        # market coverage is mixed; a sudden bearish flood may be manufactured.
        bearish_count = sum(
            1 for s in sentiments if (s.sentiment_label or "").upper() == "BEARISH"
        )
        total_sentiments = len(sentiments)
        bearish_concentration = (
            bearish_count / total_sentiments if total_sentiments > 0 else 0.0
        )

        # -- Signal 3: Transaction Anomaly --
        # Combines three sub-signals: unusual volume, directional skew away
        # from the 50/50 baseline, and abnormally large average trade size.
        total_tx = len(transactions)
        if total_tx > 0:
            sell_count = sum(
                1 for t in transactions if (t.direction or "").upper() == "SELL"
            )
            sell_ratio = sell_count / total_tx
            avg_size = sum(t.amount for t in transactions) / total_tx

            # Volume: how many multiples of "normal" trading we see
            volume_anomaly = min(total_tx / self.BASELINE_TRANSACTIONS, 2.0) / 2.0
            # Direction: deviation from balanced buy/sell
            direction_skew = abs(sell_ratio - self.BASELINE_SELL_RATIO) / 0.5
            # Size: unusually large trades may indicate institutional actors
            size_anomaly = min(avg_size / self.BASELINE_AVG_SIZE, 3.0) / 3.0

            anomaly_score = round(
                (volume_anomaly + direction_skew + size_anomaly) / 3.0, 4
            )
        else:
            sell_ratio = 0.0
            avg_size = 0.0
            anomaly_score = 0.0

        # -- Signal 4: Timing Correlation --
        # The most damning signal: did trades happen *before* the worst news?
        # If a large fraction of trades precede the most negative sentiment
        # timestamp, it suggests foreknowledge (insider trading pattern).
        timing_score = 0.0
        if sentiments and total_tx > 0:
            # Find the timestamp when the most negative sentiment was published
            worst_sentiment = min(sentiments, key=lambda s: s.sentiment_score)
            worst_ts = worst_sentiment.processed_at
            # Count transactions that were executed before the bad news hit
            pre_news_trades = sum(
                1 for t in transactions if t.timestamp < worst_ts
            )
            timing_score = pre_news_trades / total_tx

        # -- Final Composite Score --
        fraud_risk_score = round(
            min(
                (self.W_VELOCITY * velocity_score)
                + (self.W_CONCENTRATION * bearish_concentration)
                + (self.W_TRANSACTION * anomaly_score)
                + (self.W_TIMING * timing_score),
                1.0,
            ),
            4,
        )

        # Risk classification thresholds
        if fraud_risk_score > 0.85:
            risk_level = "CRITICAL"
        elif fraud_risk_score > 0.60:
            risk_level = "HIGH"
        elif fraud_risk_score > 0.30:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        return {
            "ticker": ticker,
            "fraud_risk_score": fraud_risk_score,
            "risk_level": risk_level,
            "sentiment_velocity": velocity_score,
            "bearish_concentration": bearish_concentration,
            "transaction_anomaly": anomaly_score,
            "timing_correlation": timing_score,
            "total_transactions": total_tx,
            "sell_ratio": sell_ratio,
            "avg_transaction_size": avg_size,
            "recent_bearish_count": bearish_count,
            "assessment_window_minutes": self.WINDOW_MINUTES,
            "assessed_at": datetime.now(timezone.utc),
        }

    def save_assessment(self, assessment: dict, db: Session):
        """Persist assessment to DB and flag transactions if risk is elevated."""
        try:
            record = FraudAssessment(
                ticker=assessment["ticker"],
                fraud_risk_score=assessment["fraud_risk_score"],
                risk_level=assessment["risk_level"],
                sentiment_velocity=assessment["sentiment_velocity"],
                bearish_concentration=assessment["bearish_concentration"],
                transaction_anomaly=assessment["transaction_anomaly"],
                timing_correlation=assessment["timing_correlation"],
                total_transactions=assessment["total_transactions"],
                sell_ratio=assessment["sell_ratio"],
                avg_transaction_size=assessment["avg_transaction_size"],
                recent_bearish_count=assessment["recent_bearish_count"],
                assessment_window_minutes=assessment["assessment_window_minutes"],
                assessed_at=assessment["assessed_at"],
            )
            db.add(record)
            db.commit()

            # Flag individual transactions for manual review when risk is HIGH+
            if assessment["fraud_risk_score"] > 0.60:
                cutoff = datetime.now(timezone.utc) - timedelta(
                    minutes=self.WINDOW_MINUTES
                )
                db.query(Transaction).filter(
                    Transaction.ticker == assessment["ticker"],
                    Transaction.timestamp >= cutoff,
                ).update({"flagged": True})
                db.commit()

            # Formatted console output for operator dashboards
            print(
                "[FRAUD] %s | %s | score: %.2f"
                % (
                    assessment["ticker"],
                    assessment["risk_level"],
                    assessment["fraud_risk_score"],
                )
            )
            print("  velocity    : %.2f" % assessment["sentiment_velocity"])
            print("  concentration: %.2f" % assessment["bearish_concentration"])
            print("  tx anomaly  : %.2f" % assessment["transaction_anomaly"])
            print("  timing      : %.2f" % assessment["timing_correlation"])

        except Exception as exc:
            db.rollback()
            print("[FRAUD] DB error saving assessment for %s: %s" % (assessment["ticker"], exc))

    def run_full_assessment(self, db: Session):
        """Assess every monitored ticker, persist results, and push alerts."""
        for ticker in TICKERS:
            assessment = self.assess_ticker(ticker, db)
            self.save_assessment(assessment, db)

            # Push alert to FastAPI so connected WebSocket clients see it
            # immediately without waiting for a poll cycle
            try:
                payload = dict(assessment)
                # datetime is not JSON-serialisable; convert to ISO string
                payload["assessed_at"] = payload["assessed_at"].isoformat()
                requests.post(
                    "http://localhost:8000/internal/push-fraud",
                    json=payload,
                    timeout=5,
                )
            except Exception:
                print("[WS] API not available")

        print("[FRAUD] Assessment complete for all tickers")
