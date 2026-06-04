"""
Archer — SQLAlchemy ORM Models
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    String, Text, Float, Integer, BigInteger, Boolean, DateTime
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class SentimentScore(Base):
    __tablename__ = "sentiment_scores"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    ticker: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    headline: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(50))
    sentiment_score: Mapped[float] = mapped_column(Float, nullable=False)
    positive: Mapped[float] = mapped_column(Float)
    negative: Mapped[float] = mapped_column(Float)
    neutral: Mapped[float] = mapped_column(Float)
    sentiment_label: Mapped[str] = mapped_column(String(10))
    article_id: Mapped[str] = mapped_column(String(20))
    article_ts: Mapped[int] = mapped_column(BigInteger)
    processed_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class TickerAggregate(Base):
    __tablename__ = "ticker_aggregates"

    ticker: Mapped[str] = mapped_column(String(10), primary_key=True)
    avg_sentiment: Mapped[float] = mapped_column(Float, default=0.0)
    bullish_count: Mapped[int] = mapped_column(Integer, default=0)
    bearish_count: Mapped[int] = mapped_column(Integer, default=0)
    neutral_count: Mapped[int] = mapped_column(Integer, default=0)
    total_articles: Mapped[int] = mapped_column(Integer, default=0)
    last_score: Mapped[float] = mapped_column(Float)
    last_label: Mapped[str] = mapped_column(String(10))
    last_updated: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    ticker: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    direction: Mapped[str] = mapped_column(String(4))  # "BUY" or "SELL"
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    flagged: Mapped[bool] = mapped_column(Boolean, default=False)


class FraudAssessment(Base):
    """
    Stores multi-signal fraud risk assessments produced by the correlation engine.
    Each row captures a point-in-time snapshot of all 4 fraud signals for a ticker,
    enabling historical trend analysis and audit trails for flagged activity.
    """
    __tablename__ = "fraud_assessments"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    ticker: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    fraud_risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(10), nullable=False)
    # Signal 1: rate of sentiment deterioration within the window
    sentiment_velocity: Mapped[float] = mapped_column(Float, default=0.0)
    # Signal 2: proportion of bearish articles in the window
    bearish_concentration: Mapped[float] = mapped_column(Float, default=0.0)
    # Signal 3: composite anomaly from volume, direction skew, and trade size
    transaction_anomaly: Mapped[float] = mapped_column(Float, default=0.0)
    # Signal 4: ratio of trades that occurred before the most negative news
    timing_correlation: Mapped[float] = mapped_column(Float, default=0.0)
    total_transactions: Mapped[int] = mapped_column(Integer, default=0)
    sell_ratio: Mapped[float] = mapped_column(Float, default=0.0)
    avg_transaction_size: Mapped[float] = mapped_column(Float, default=0.0)
    recent_bearish_count: Mapped[int] = mapped_column(Integer, default=0)
    assessment_window_minutes: Mapped[int] = mapped_column(Integer, default=60)
    assessed_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), index=True
    )
