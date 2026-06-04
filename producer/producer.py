"""
=============================================================================
Archer — Kafka News Producer
=============================================================================
Simulates a real-time financial news feed by generating synthetic articles
for major stock tickers and publishing them to the "raw-news" Kafka topic.

Each article contains:
  - ticker    : Stock symbol (e.g. AAPL, TSLA)
  - headline  : Realistic financial news headline
  - source    : Simulated news outlet
  - timestamp : Unix epoch timestamp of generation
  - id        : Unique 8-character alphanumeric identifier

Articles are produced every 0.3 seconds to simulate a moderate-volume feed.
The consumer (Module 2) will read from "raw-news" and run FinBERT sentiment
analysis on each headline.
=============================================================================
"""

from kafka import KafkaProducer
import json
import time
import random
import string
import os

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Kafka broker address — read from env var in Docker, fall back to localhost
KAFKA_BROKER = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")

# Target Kafka topic where all raw news articles are published
KAFKA_TOPIC = "raw-news"

# Major stock tickers representing a diversified portfolio of tech, finance,
# and mega-cap companies
TICKERS = ["AAPL", "TSLA", "GOOGL", "MSFT", "AMZN", "META", "NVDA", "JPM"]

# Mapping of tickers to full company names for natural-sounding headlines
COMPANY_NAMES = {
    "AAPL": "Apple",
    "TSLA": "Tesla",
    "GOOGL": "Google",
    "MSFT": "Microsoft",
    "AMZN": "Amazon",
    "META": "Meta",
    "NVDA": "Nvidia",
    "JPM": "JPMorgan",
}

# Headline templates with {company} placeholder — a mix of positive, negative,
# and neutral sentiments to produce realistic training data for FinBERT
HEADLINE_TEMPLATES = [
    # Positive sentiment
    "{company} Q3 earnings beat expectations by wide margin",
    "{company} stock surges after announcing record revenue growth",
    "{company} receives major analyst upgrade amid strong outlook",
    # Negative sentiment
    "SEC investigation launched into {company} accounting practices",
    "{company} faces massive lawsuit over data privacy violations",
    "{company} shares plummet after profit warning issued",
    "Major insider selling reported at {company} raises concerns",
    # Neutral sentiment
    "{company} announces board meeting scheduled for next week",
    "{company} CEO to speak at annual investor conference",
    "{company} completes planned restructuring of operations division",
]

# Simulated news sources for added realism
NEWS_SOURCES = ["Reuters", "Bloomberg", "CNBC", "WSJ"]

# Delay between each article (seconds) — controls the stream throughput
PUBLISH_INTERVAL = 0.3


# ---------------------------------------------------------------------------
# Utility Functions
# ---------------------------------------------------------------------------

def generate_id(length=8):
    """
    Generate a random alphanumeric ID string.
    Used as a unique identifier for each article to enable deduplication
    and tracking through the pipeline.
    """
    return "".join(random.choices(string.ascii_letters + string.digits, k=length))


def generate_article():
    """
    Create a single synthetic financial news article.

    Returns:
        dict: Article with keys — ticker, headline, source, timestamp, id
    """
    ticker = random.choice(TICKERS)
    company = COMPANY_NAMES[ticker]
    template = random.choice(HEADLINE_TEMPLATES)

    return {
        "ticker": ticker,
        "headline": template.format(company=company),
        "source": random.choice(NEWS_SOURCES),
        "timestamp": time.time(),
        "id": generate_id(),
    }


# ---------------------------------------------------------------------------
# Main Execution
# ---------------------------------------------------------------------------

def main():
    """
    Initialize the Kafka producer and run an infinite publish loop.

    The producer serializes each article dict as UTF-8 JSON bytes before
    sending to Kafka. On KeyboardInterrupt (Ctrl+C), it flushes pending
    messages and shuts down gracefully.
    """
    print("=" * 60)
    print("  ARCHER — Financial News Producer")
    print("=" * 60)
    print(f"  Broker : {KAFKA_BROKER}")
    print(f"  Topic  : {KAFKA_TOPIC}")
    print(f"  Tickers: {', '.join(TICKERS)}")
    print("=" * 60)
    print()

    # Create a Kafka producer instance
    # value_serializer converts Python dicts → JSON-encoded bytes automatically
    producer = KafkaProducer(
        bootstrap_servers=KAFKA_BROKER,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )

    print("[INFO] Connected to Kafka. Starting article stream...\n")

    try:
        count = 0
        while True:
            # Generate a synthetic news article
            article = generate_article()

            # Publish to the "raw-news" topic
            # Kafka will auto-create the topic if it doesn't exist (default config)
            producer.send(KAFKA_TOPIC, value=article)

            count += 1
            print(
                f'[SENT] #{count:>5}  {article["ticker"]} -> '
                f'"{article["headline"]}"'
            )

            # Throttle to simulate realistic news arrival rate
            time.sleep(PUBLISH_INTERVAL)

    except KeyboardInterrupt:
        # Graceful shutdown: flush any buffered messages before exiting
        print(f"\n[INFO] Interrupted. Flushing {count} messages...")
        producer.flush()
        producer.close()
        print("[INFO] Producer shut down cleanly.")


if __name__ == "__main__":
    main()
