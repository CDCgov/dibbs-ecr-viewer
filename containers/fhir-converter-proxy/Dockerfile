FROM haproxy:3.4.6-alpine
COPY haproxy.cfg /usr/local/etc/haproxy/haproxy.cfg

USER root

# Pick up Alpine fixes the base image may lag on, including ca-certificates
# 20261020-r0, which drops the distrusted emSign ECC Root CA - G3.
RUN apk upgrade --no-cache

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

USER haproxy

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD nc -z 127.0.0.1 ${FHIR_CONVERTER_PROXY_PORT:-8000} || exit 1