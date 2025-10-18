# --- STAGE 1: The "Builder" Stage ---
# We start with a full Python image that has all the build tools.
FROM python:3.11-slim as builder

WORKDIR /app

# Install system dependencies that might be needed by Python packages
RUN apt-get update && apt-get install -y build-essential

# Copy the dependency list first for caching
COPY services/payment-service/requirements.txt .

# Install the Python packages
RUN pip install --no-cache-dir -r requirements.txt


# --- STAGE 2: The Final, "Runner" Stage ---
# We now switch to a tiny, clean Python image for our final product.
FROM python:3.11-slim

WORKDIR /app

# Copy ONLY the installed packages from our 'builder' stage.
# This keeps our final image small and clean.
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# Copy our application source code
COPY services/payment-service/src/. .
COPY proto ./proto

# The command to run when the container starts.
# We will start with the consumer script.
CMD ["python", "consumer.py"]