FROM python:3.12-slim

# Set sane Python behavior
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Avoid prompts during package installs
ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install minimal system deps required by Pillow, Image libs and common packages
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential \
       libmagic1 \
       libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first for better Docker layer caching
COPY requirements.txt /app/requirements.txt

# Upgrade pip then install Python deps
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r /app/requirements.txt

# Copy application code
COPY . /app

# Expose the common HF Spaces port (7860). Use $PORT if provided.
EXPOSE 7860
ENV PORT=7860

# Use a shell form so we can respect the optional $PORT env var on HF
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}" ]