FROM mcr.microsoft.com/mssql/server:2022-latest

USER root
COPY init.sql /init.sql
RUN chmod +x /init.sql

USER mssql
CMD ["/bin/bash", "-c", "\
    /opt/mssql/bin/sqlservr & \
    until /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -U sa -P \"${SQL_SERVER_PASSWORD:-Password1!}\" -C -Q 'SELECT 1' > /dev/null 2>&1; do \
    sleep 2; \
    done; \
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P \"${SQL_SERVER_PASSWORD:-Password1!}\" -C -d master -i /init.sql; \
    wait \
"]