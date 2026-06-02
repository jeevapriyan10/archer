# =============================================================================
# Archer Producer — Dockerfile
# =============================================================================
# Lightweight Python image that runs the Kafka news producer.
# Dependencies are installed first (separate layer) so rebuilds are faster
# when only producer.py changes.
# =============================================================================

FROM python:3.10-slim

WORKDIR /app

# Install dependencies in a separate layer for Docker cache efficiency
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY producer.py .

# Run the producer script
CMD ["python", "producer.py"]
