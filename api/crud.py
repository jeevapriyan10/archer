"""
Archer — CRUD Database Queries
"""

from sqlalchemy import func, desc
from sqlalchemy.orm import Session
from db.models import SentimentScore, TickerAggregate, Transaction


def get_all_tickers(db: Session):
    return db.query(TickerAggregate).order_by(desc(TickerAggregate.last_updated)).all()


def get_ticker(db: Session, ticker: str):
    return db.query(TickerAggregate).filter(TickerAggregate.ticker == ticker.upper()).first()


def get_recent_sentiment(db: Session, limit: int = 50):
    return (
        db.query(SentimentScore)
        .order_by(desc(SentimentScore.processed_at))
        .limit(limit)
        .all()
    )


def get_ticker_sentiment(db: Session, ticker: str, limit: int = 20):
    return (
        db.query(SentimentScore)
        .filter(SentimentScore.ticker == ticker.upper())
        .order_by(desc(SentimentScore.processed_at))
        .limit(limit)
        .all()
    )


def get_transactions(db: Session, ticker: str, limit: int = 20):
    return (
        db.query(Transaction)
        .filter(Transaction.ticker == ticker.upper())
        .order_by(desc(Transaction.timestamp))
        .limit(limit)
        .all()
    )


def get_fraud_risk(db: Session):
    """
    Compute fraud risk per ticker by combining bearish sentiment ratio
    with transaction volume as an amplifying factor.
    """
    tickers = db.query(TickerAggregate).all()
    results = []

    for t in tickers:
        total = t.total_articles or 0
        bearish = t.bearish_count or 0
        bearish_ratio = bearish / total if total > 0 else 0.0

        # High transaction volume amplifies fraud risk
        txn_count = (
            db.query(func.count(Transaction.id))
            .filter(Transaction.ticker == t.ticker)
            .scalar()
        )
        transaction_factor = 1.5 if txn_count > 25 else 1.0
        fraud_risk_score = round(min(bearish_ratio * transaction_factor, 1.0), 4)

        if fraud_risk_score > 0.6:
            risk_level = "HIGH"
        elif fraud_risk_score > 0.3:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        results.append({
            "ticker": t.ticker,
            "fraud_risk_score": fraud_risk_score,
            "bearish_ratio": round(bearish_ratio, 4),
            "total_articles": total,
            "bearish_count": bearish,
            "risk_level": risk_level,
        })

    # Most risky tickers first
    results.sort(key=lambda x: x["fraud_risk_score"], reverse=True)
    return results
