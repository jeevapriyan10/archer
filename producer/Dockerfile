# =============================================================================
# Archer Producer -- Dockerfile
# =============================================================================
# Lightweight Python image that runs the Kafka news producer.
# Dependencies are installed first (separate layer) so rebuilds are faster
# when only producer.py changes.
# =============================================================================

FROM python:3.10-slim

WORKDIR /app

# Install dependencies in a separate layer for Docker cache efficiency
COPY producer/requirements.txt ./producer/requirements.txt
RUN pip install --upgrade pip \
    && pip install --no-cache-dir --default-timeout=300 -r producer/requirements.txt

# Copy application code
COPY producer/ ./producer/

# Run the producer script
CMD ["python", "producer/producer.py"]
