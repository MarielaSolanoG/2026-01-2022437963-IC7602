#ifndef CHECKERS_H
#define CHECKERS_H

#include <libpq-fe.h>

int check_http(const char* url, int timeout_ms, double* latency);
int check_tcp(const char* ip, int port, int timeout_ms);

PGconn* connect_to_db();
void update_db_status(PGconn *conn, int record_id, int is_healthy);

#endif