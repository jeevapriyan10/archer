# =============================================================================
# Archer Consumer -- Dockerfile
# =============================================================================
# Runs the FinBERT sentiment consumer. The model directory is volume-mounted
# from the host so we don't bake the large model weights into the image.
#
# PyTorch CPU-only wheels are used to keep the image under 1GB instead of 3GB+.
# FinBERT inference runs fine on CPU for the throughput we need.
# =============================================================================

FROM python:3.10-slim

WORKDIR /app

# Upgrade pip first so we get modern resolver and timeout handling
RUN pip install --upgrade pip

COPY consumer/requirements.txt ./consumer/requirements.txt

# Install torch CPU-only first from PyTorch's dedicated index (much smaller ~200MB vs ~2GB).
# Then install remaining deps from PyPI.
RUN pip install --no-cache-dir --default-timeout=300 \
    torch==2.6.0+cpu \
    --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir --default-timeout=300 \
    -r consumer/requirements.txt

# Copy the db module (models + database) and the consumer module
COPY db/ ./db/
COPY consumer/ ./consumer/

CMD ["python", "consumer/consumer.py"]
