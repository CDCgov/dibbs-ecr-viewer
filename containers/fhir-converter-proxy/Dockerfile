FROM haproxy:3.3-alpine
COPY haproxy.cfg /usr/local/etc/haproxy/haproxy.cfg

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD nc -z 127.0.0.1 ${FHIR_CONVERTER_PROXY_PORT:-8000} || exit 1