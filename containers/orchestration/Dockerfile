ARG INGESTION_URL
ARG MESSAGE-PARSER_URL
ARG TRIGGER_CODE_REFERENCE_URL
ARG SMARTY_AUTH_ID
ARG SMARTY_AUTH_TOKEN

FROM python:3.14.7-alpine

RUN apk update && \
    apk upgrade --no-cache

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt
RUN python -m pip install --upgrade --no-cache-dir pip --break-system-packages && \
    python -m pip install --no-cache-dir --require-hashes --only-binary :all: -r requirements.txt && \
    python -m pip uninstall --yes setuptools wheel && \
    python -m pip check && \
    python -m pip uninstall --yes pip && \
    rm -rf /root/.cache/pip /usr/local/lib/python3.14/ensurepip

COPY ./app /code/app
COPY ./assets /code/assets
COPY ./README.md /code/README.md

ENV INGESTION_URL=$INGESTION_URL
ENV MESSAGE-PARSER_URL=$MESSAGE-PARSER_URL
ENV TRIGGER_CODE_REFERENCE_URL=$TRIGGER_CODE_REFERENCE_URL
ENV SMARTY_AUTH_ID=$SMARTY_AUTH_ID
ENV SMARTY_AUTH_TOKEN=$SMARTY_AUTH_TOKEN

# Install curl for health check
RUN apk update && apk add --no-cache curl

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--log-config", "app/log_config.yaml"]
