FROM python:3.13.6-alpine

RUN apk update && \
    apk upgrade --no-cache

RUN pip install --upgrade pip --break-system-packages

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt
RUN pip install -r requirements.txt

COPY ./app /code/app
COPY ./assets /code/assets
COPY ./description.md /code/description.md

EXPOSE 8080
CMD uvicorn app.main:app --host 0.0.0.0 --port 8080
