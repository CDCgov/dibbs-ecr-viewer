FROM python:3.15.0-alpine

RUN apk update && \
    apk upgrade --no-cache

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt
COPY ./build-constraints.txt /code/build-constraints.txt
RUN python -m pip install --upgrade --no-cache-dir pip --break-system-packages && \
    python -m pip install --no-cache-dir --build-constraint build-constraints.txt --require-hashes --only-binary :all: --no-binary google-crc32c,polling -r requirements.txt && \
    python -m pip uninstall --yes setuptools wheel && \
    python -m pip check && \
    python -m pip uninstall --yes pip && \
    rm -rf /root/.cache/pip /usr/local/lib/python3.14/ensurepip

COPY ./app /code/app
COPY ./assets /code/assets
COPY ./description.md /code/description.md

# Install curl for health check
RUN apk update && apk add --no-cache curl

# Fail the build if either distrusted root is left in any CA bundle, whether from
# the OS or vendored by a Python package. Each pattern is one line of a root's
# base64 body (emSign ECC Root CA - G3, then AAA Certificate Services), so it
# matches however a bundle labels the certificate. grep exits 1 only when
# nothing matched.
RUN grep -rlF \
    -e 'CUfvO6wIBHxcmbHtRwfSAjEAnbpV/KlK6O3t5nYBQnvI+GDZjVGLVTv7jHvrZQnD' \
    -e 'l2D4kF501KKaU73yqWjgom7C12yxow+ev+to51byrvLjKzg6CYG1a4XXvi3tPxq3' \
    /etc /usr /var; \
    test $? -eq 1

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
