#ifndef CHECKERS_H
#define CHECKERS_H

#include <libpq-fe.h>

int check_http(const char* url, int timeout_ms, const char* user, const char* pass, double* latency);
int check_tcp(const char* ip, int port, int timeout_ms, double* latency);

PGconn* connect_to_db();
void save_health_result(PGconn *conn, const char* target_id, int is_healthy, double latency, const char* location_id);

#endif