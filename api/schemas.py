"""
Archer — Pydantic Response Schemas
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class TickerAggregateSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ticker: str
    avg_sentiment: Optional[float] = None
    bullish_count: Optional[int] = None
    bearish_count: Optional[int] = None
    neutral_count: Optional[int] = None
    total_articles: Optional[int] = None
    last_score: Optional[float] = None
    last_label: Optional[str] = None
    last_updated: Optional[datetime] = None


class SentimentScoreSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    ticker: Optional[str] = None
    headline: Optional[str] = None
    source: Optional[str] = None
    sentiment_score: Optional[float] = None
    sentiment_label: Optional[str] = None
    positive: Optional[float] = None
    negative: Optional[float] = None
    neutral: Optional[float] = None
    processed_at: Optional[datetime] = None


class TransactionSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    ticker: Optional[str] = None
    amount: Optional[float] = None
    direction: Optional[str] = None
    timestamp: Optional[datetime] = None
    flagged: Optional[bool] = None


class FraudRiskSchema(BaseModel):
    ticker: str
    fraud_risk_score: float
    bearish_ratio: float
    total_articles: int
    bearish_count: int
    risk_level: str


class HealthSchema(BaseModel):
    status: str
    timestamp: datetime
