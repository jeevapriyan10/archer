"""
Archer — Transaction Seeder
Seeds 200 random transactions into the transactions table for testing.
"""

import sys
import os
import random
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from db.database import init_db, get_db
from db.models import Transaction

TICKERS = ["AAPL", "TSLA", "GOOGL", "MSFT", "AMZN", "META", "NVDA", "JPM"]
DIRECTIONS = ["BUY", "SELL"]
SEED_COUNT = 200


def seed():
    init_db()
    now = datetime.now(timezone.utc)

    with get_db() as session:
        for _ in range(SEED_COUNT):
            random_offset = random.uniform(0, 7 * 24 * 3600)
            txn = Transaction(
                ticker=random.choice(TICKERS),
                amount=round(random.uniform(1000.0, 500000.0), 2),
                direction=random.choice(DIRECTIONS),
                timestamp=now - timedelta(seconds=random_offset),
                flagged=False,
            )
            session.add(txn)
        session.commit()

    print(f"[ARCHER] Seeded {SEED_COUNT} transactions successfully")


if __name__ == "__main__":
    seed()
