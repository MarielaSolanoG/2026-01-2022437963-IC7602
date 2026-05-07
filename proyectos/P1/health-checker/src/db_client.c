#include <stdio.h>
#include <stdlib.h>
#include <libpq-fe.h>

PGconn* connect_to_db() {
    const char *conninfo = getenv("DATABASE_URL");

    if (conninfo == NULL) {
        fprintf(stderr, "La variable de entorno DATABASE_URL no está establecida\n");
        return NULL;
    }

    PGconn *conn = PQconnectdb(conninfo);

    if (PQstatus(conn) != CONNECTION_OK) {
        fprintf(stderr, "Error de conexión %s\n", PQerrorMessage(conn));
        PQfinish(conn);
        return NULL;
    }

    return conn;
}