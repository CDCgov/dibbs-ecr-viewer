FROM python:3.13-slim

RUN apt-get update && \
    apt-get upgrade -y

RUN pip install --upgrade pip --break-system-packages

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt
RUN pip install -r requirements.txt

COPY ./data /code/data
COPY ./app /code/app
COPY ./assets /code/assets
COPY ./README.md /code/README.md

EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
