FROM python:3.12-slim

RUN apt-get update && \
    apt-get upgrade -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip --break-system-packages

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt
RUN pip install -r requirements.txt

COPY ./app /code/app
COPY ./README.md /code/README.md
COPY ./migrations /code/migrations
COPY ./assets /code/assets

EXPOSE 8080
CMD uvicorn app.main:app --host 0.0.0.0 --port 8080 --log-config app/log_config.yaml