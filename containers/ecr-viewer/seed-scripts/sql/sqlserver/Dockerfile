FROM mcr.microsoft.com/mssql/server:2022-latest

USER root
COPY init.sql /init.sql
RUN chmod +x /init.sql

USER mssql
CMD /opt/mssql-tools18/bin/sqlcmd -S sqlserver -U sa -P "${SQL_SERVER_PASSWORD:-Password1!}" -C -d master -i init.sql & /opt/mssql/bin/sqlservr;