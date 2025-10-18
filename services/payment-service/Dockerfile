# --- STAGE 1: The "Builder" Stage ---
FROM python:3.11-slim as builder

WORKDIR /app

RUN apt-get update && apt-get install -y build-essential

# Copy the dependency list
COPY services/payment-service/requirements.txt .

# --- THIS IS THE TEST ---
# Before we try to install, let's print the contents of the file
# to the screen to prove which version Docker is using.
RUN cat requirements.txt

# Now, try to install the packages
RUN pip install --no-cache-dir -r requirements.txt


# --- STAGE 2: The Final, "Runner" Stage ---
FROM python:3.11-slim

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

COPY services/payment-service/src/. .
COPY proto ./proto

CMD ["python", "consumer.py"]