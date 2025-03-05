FROM mcr.microsoft.com/azure-storage/azurite:latest

RUN apk add py3-pip
RUN apk add gcc musl-dev python3-dev libffi-dev openssl-dev cargo make
RUN pip install --upgrade pip --break-system-packages
RUN pip install azure-cli --break-system-packages

WORKDIR /data
CMD ["/bin/sh"]
