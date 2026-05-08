#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <libpq-fe.h>
#include <curl/curl.h>
#include <string.h>

#include "checkers.h"

PGconn* connect_to_db();

static const char* getenv_or_default(const char* name, const char* default_value) {
    const char* value = getenv(name);
    if (value == NULL || strlen(value) == 0) {
        return default_value;
    }

    return value;
}

void save_health_result(
    PGconn *conn,
    const char* target_id,
    int is_healthy,
    double latency,
    const char* checker_location_id,
    const char* checker_latitude,
    const char* checker_longitude,
    const char* checker_country,
    const char* checker_city
) {
    const char* query =
        "INSERT INTO health_results "
        "(target_id, is_healthy, latency_ms, checker_location_id, "
        "checker_latitude, checker_longitude, checker_country, checker_city) "
        "VALUES ($1, $2, $3, $4, $5, $6, $7, $8)";

    char healthy_value[8];
    char latency_value[64];

    snprintf(healthy_value, sizeof(healthy_value), "%s", is_healthy ? "true" : "false");
    snprintf(latency_value, sizeof(latency_value), "%.4f", latency);

    const char* values[8] = {
        target_id,
        healthy_value,
        latency_value,
        checker_location_id,
        checker_latitude,
        checker_longitude,
        checker_country,
        checker_city
    };

    PGresult *res = PQexecParams(
        conn,
        query,
        8,
        NULL,
        values,
        NULL,
        NULL,
        0
    );

    if (PQresultStatus(res) != PGRES_COMMAND_OK) {
        fprintf(stderr, "Error guardando resultado: %s\n", PQerrorMessage(conn));
    }

    PQclear(res);
}

void update_dns_record_health(PGconn *conn, const char* dns_record_id, int is_healthy) {
    if (dns_record_id == NULL || strlen(dns_record_id) == 0) {
        return;
    }

    const char* query =
        "UPDATE dns_records "
        "SET healthy = $1 "
        "WHERE id = $2";

    char healthy_value[8];
    snprintf(healthy_value, sizeof(healthy_value), "%s", is_healthy ? "true" : "false");

    const char* values[2] = {
        healthy_value,
        dns_record_id
    };

    PGresult *res = PQexecParams(
        conn,
        query,
        2,
        NULL,
        values,
        NULL,
        NULL,
        0
    );

    if (PQresultStatus(res) != PGRES_COMMAND_OK) {
        fprintf(stderr, "Error actualizando dns_records.healthy: %s\n", PQerrorMessage(conn));
    } else {
        printf("[HEALTH_CHECKER] dns_record_id=%s actualizado a healthy=%s\n",
               dns_record_id,
               is_healthy ? "true" : "false");
    }

    PQclear(res);
}

int run_target_check(
    const char* type,
    const char* ip,
    int port,
    int timeout,
    const char* http_path,
    const char* expected_codes,
    const char* basic_auth_user,
    const char* basic_auth_pass,
    double* latency
) {
    if (strcmp(type, "HTTP") == 0) {
        return check_http(
            ip,
            port,
            http_path,
            expected_codes,
            basic_auth_user,
            basic_auth_pass,
            timeout,
            latency
        );
    }

    return check_tcp(ip, port, timeout, latency);
}

int main() {
    curl_global_init(CURL_GLOBAL_ALL);

    PGconn *conn = connect_to_db();
    if (!conn) {
        curl_global_cleanup();
        return 1;
    }

    const char* checker_location_id = getenv_or_default("CHECKER_LOCATION_ID", "CR-01");
    const char* checker_latitude = getenv_or_default("CHECKER_LATITUDE", "9.8644");
    const char* checker_longitude = getenv_or_default("CHECKER_LONGITUDE", "-83.9194");
    const char* checker_country = getenv_or_default("CHECKER_COUNTRY", "CR");
    const char* checker_city = getenv_or_default("CHECKER_CITY", "Cartago");

    int loop_interval = atoi(getenv_or_default("CHECK_INTERVAL_SECONDS", "30"));
    if (loop_interval <= 0) {
        loop_interval = 30;
    }

    printf("Health Checker iniciado (Proyecto1_IC7602)...\n");
    printf("[HEALTH_CHECKER] location=%s country=%s city=%s lat=%s lon=%s\n",
           checker_location_id,
           checker_country,
           checker_city,
           checker_latitude,
           checker_longitude);

    const char* location_id = getenv("CHECKER_LOCATION_ID") ? getenv("CHECKER_LOCATION_ID") : "CR-01";

    while (1) {
        const char* select_query =
            "SELECT "
            "id::text, "
            "COALESCE(dns_record_id::text, ''), "
            "ip_address, "
            "port::text, "
            "check_type, "
            "timeout_ms::text, "
            "COALESCE(retries, 3)::text, "
            "COALESCE(http_path, '/'), "
            "COALESCE(expected_status_codes::text, '{200}'), "
            "COALESCE(basic_auth_user, ''), "
            "COALESCE(basic_auth_pass, '') "
            "FROM targets";

        PGresult *res = PQexec(conn, select_query);

        if (PQresultStatus(res) != PGRES_TUPLES_OK) {
            fprintf(stderr, "Error en SELECT: %s\n", PQerrorMessage(conn));
            PQclear(res);
            sleep(loop_interval);
            continue;
        }

        for (int i = 0; i < PQntuples(res); i++) {
            char *target_id = PQgetvalue(res, i, 0);
            char *dns_record_id = PQgetvalue(res, i, 1);
            char *ip = PQgetvalue(res, i, 2);
            int port = atoi(PQgetvalue(res, i, 3));
            char *type = PQgetvalue(res, i, 4);
            int timeout = atoi(PQgetvalue(res, i, 5));
            int retries = atoi(PQgetvalue(res, i, 6));
            char *http_path = PQgetvalue(res, i, 7);
            char *expected_codes = PQgetvalue(res, i, 8);
            char *basic_auth_user = PQgetvalue(res, i, 9);
            char *basic_auth_pass = PQgetvalue(res, i, 10);

            if (retries <= 0) {
                retries = 1;
            }

            int successes = 0;
            double total_latency = 0.0;

            for (int attempt = 0; attempt < retries; attempt++) {
                double latency = 0.0;

                int alive = run_target_check(
                    type,
                    ip,
                    port,
                    timeout,
                    http_path,
                    expected_codes,
                    basic_auth_user,
                    basic_auth_pass,
                    &latency
                );

                if (alive) {
                    successes++;
                }

                total_latency += latency;

                printf("[HEALTH_CHECKER] [%s] intento %d/%d target=%s:%d -> %s (%.2fms)\n",
                       type,
                       attempt + 1,
                       retries,
                       ip,
                       port,
                       alive ? "UP" : "DOWN",
                       latency);
            }

            double avg_latency = total_latency / retries;

            // Mayoría simple: si la cantidad de éxitos supera la mitad, queda healthy.
            int final_healthy = successes > (retries / 2);

            printf("[HEALTH_CHECKER] Resultado final target=%s:%d successes=%d/%d -> %s (avg %.2fms)\n",
                   ip,
                   port,
                   successes,
                   retries,
                   final_healthy ? "HEALTHY" : "UNHEALTHY",
                   avg_latency);

            save_health_result(
                conn,
                target_id,
                final_healthy,
                avg_latency,
                checker_location_id,
                checker_latitude,
                checker_longitude,
                checker_country,
                checker_city
            );

            update_dns_record_health(conn, dns_record_id, final_healthy);
        }

        PQclear(res);
        sleep(loop_interval);
    }

    PQfinish(conn);
    curl_global_cleanup();

    return 0;
}