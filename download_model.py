"""
=============================================================================
Archer — Model Downloader
=============================================================================
Downloads the ProsusAI/finbert model weights and tokenizer configurations
directly from HuggingFace to a local directory.

Usage:
  python download_model.py
=============================================================================
"""

import os
import urllib.request
import sys

# Model source repository details on HuggingFace Hub
BASE_URL = "https://huggingface.co/ProsusAI/finbert/resolve/main/"

# Destination folder structure
DEST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "model", "finbert"))

# Required files to run text-classification pipeline locally
FILES_TO_DOWNLOAD = [
    "config.json",
    "pytorch_model.bin",
    "vocab.txt",
    "tokenizer_config.json",
    "special_tokens_map.json",
]


def progress_hook(count, block_size, total_size):
    """
    Callback function to print a visual download progress bar in the terminal.
    """
    downloaded = count * block_size
    percent = min(100, int(downloaded * 100 / total_size)) if total_size > 0 else 0
    
    # Format size to Megabytes
    downloaded_mb = downloaded / (1024 * 1024)
    total_mb = total_size / (1024 * 1024) if total_size > 0 else 0
    
    # Simple ASCII progress bar
    bar_length = 30
    filled_length = int(bar_length * percent / 100)
    bar = "=" * filled_length + "-" * (bar_length - filled_length)
    
    sys.stdout.write(
        f"\r    [{bar}] {percent}% ({downloaded_mb:.1f}/{total_mb:.1f} MB)"
    )
    sys.stdout.flush()


def main():
    print("=" * 60)
    print("  ARCHER — FinBERT Local Downloader")
    print("=" * 60)
    print(f"Target Directory: {DEST_DIR}")
    print("=" * 60)
    print()

    # Ensure target directory exists
    os.makedirs(DEST_DIR, exist_ok=True)

    for filename in FILES_TO_DOWNLOAD:
        target_path = os.path.join(DEST_DIR, filename)
        url = BASE_URL + filename

        print(f"Downloading {filename}...")
        
        # Add User-Agent header to avoid potential blocks or rate limits
        opener = urllib.request.build_opener()
        opener.addheaders = [("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")]
        urllib.request.install_opener(opener)

        try:
            urllib.request.urlretrieve(url, target_path, reporthook=progress_hook)
            print(f"\n[OK] Saved to {target_path}\n")
        except Exception as e:
            print(f"\n[ERROR] Failed to download {filename}: {e}")
            sys.exit(1)

    print("=" * 60)
    print("  All model files downloaded successfully!")
    print("  You can now start consumer.py locally without internet dependencies.")
    print("=" * 60)


if __name__ == "__main__":
    main()
