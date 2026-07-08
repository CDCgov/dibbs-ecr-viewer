FROM python:3.14.2-alpine

RUN apk update && \
    apk upgrade --no-cache

RUN pip install --upgrade pip --break-system-packages

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt
RUN pip install --require-hashes --only-binary :all: -r requirements.txt

COPY ./data /code/data
COPY ./app /code/app
COPY ./assets /code/assets
COPY ./README.md /code/README.md

# Install curl for health check
RUN apk update && apk add --no-cache curl

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
