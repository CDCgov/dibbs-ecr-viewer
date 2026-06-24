FROM haproxy:3.3-alpine
COPY haproxy.cfg /usr/local/etc/haproxy/haproxy.cfg

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD haproxy -c -f /usr/local/etc/haproxy/haproxy.cfg || exit 1