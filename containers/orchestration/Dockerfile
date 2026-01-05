ARG INGESTION_URL
ARG MESSAGE-PARSER_URL
ARG TRIGGER_CODE_REFERENCE_URL
ARG SMARTY_AUTH_ID
ARG SMARTY_AUTH_TOKEN

FROM python:3.14.2-alpine

RUN apk update && \
    apk upgrade --no-cache

RUN pip install --upgrade pip --break-system-packages

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt
RUN pip install -r requirements.txt

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
CMD uvicorn app.main:app --host 0.0.0.0 --port 8080 --log-config app/log_config.yaml
