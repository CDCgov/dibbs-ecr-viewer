#!/bin/bash

/opt/mssql/bin/sqlservr &

# Wait for SQL Server to start up
until /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $MSSQL_SA_PASSWORD -Q "SELECT 1" -C &>/dev/null; do
    echo "Waiting for SQL Server to start..."
    sleep 1
done
echo "SQL Server ready."

# Run your extended SQL script
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $MSSQL_SA_PASSWORD -d master -i /var/opt/mssql/scripts/extended.sql -C

wait
