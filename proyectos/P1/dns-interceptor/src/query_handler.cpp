#include "query_handler.h"

#include "api_client.h"
#include "dns_response.h"

#include <arpa/inet.h>
#include <iostream>
#include <sys/socket.h>
#include <vector>

static void sendResponseToClient(const ClientRequest& req, const std::vector<uint8_t>& response) {
    sendto(
        req.server_socket,
        response.data(),
        response.size(),
        0,
        reinterpret_cast<const sockaddr*>(&req.client),
        sizeof(req.client)
    );
}

static std::string getClientIp(const ClientRequest& req) {
    char ip[INET_ADDRSTRLEN];

    inet_ntop(AF_INET, &(req.client.sin_addr), ip, INET_ADDRSTRLEN);

    return std::string(ip);
}

static void proxyWithDnsApi(const ClientRequest& req, ApiClient& api) {
    std::vector<uint8_t> response = api.dnsResolver(req.buffer, req.len);
    sendResponseToClient(req, response);
}

void handleNonStandardQuery(const ClientRequest& req) {
    try {
        ApiClient api;

        std::cout << "[DNS_HANDLER] Paquete no estándar: reenviando a /api/dns_resolver" << std::endl;

        proxyWithDnsApi(req, api);
    } catch (const std::exception& e) {
        std::cerr << "[DNS_HANDLER ERROR] No se pudo manejar paquete no estándar: "
                  << e.what() << std::endl;
    }
}

void handleStandardQuery(const ClientRequest& req, const std::string& domain) {
    try {
        ApiClient api;
        std::string clientIp = getClientIp(req);

        std::cout << "[DNS_HANDLER] Consultando DNS API por dominio=" << domain
                  << " client_ip=" << clientIp << std::endl;

        ResolveResult result = api.exists(domain, clientIp);

        if (result.exists && result.healthy && !result.ip.empty()) {
            std::cout << "[DNS_HANDLER] Registro local encontrado. type=" << result.type
                      << " ip=" << result.ip
                      << " ttl=" << result.ttl << std::endl;

            try {
                std::vector<uint8_t> response = buildARecordResponse(
                    req.buffer,
                    req.len,
                    result.ip,
                    result.ttl
                );

                sendResponseToClient(req, response);
                return;
            } catch (const std::exception& e) {
                std::cerr << "[DNS_HANDLER_WARNING] No se pudo construir respuesta local: "
                          << e.what()
                          << ". Se hará fallback a /api/dns_resolver."
                          << std::endl;
            }
        }

        std::cout << "[DNS_HANDLER_WARNING] No existe, está unhealthy o no hay IP. "
                  << "Fallback a /api/dns_resolver" << std::endl;

        proxyWithDnsApi(req, api);
    } catch (const std::exception& e) {
        std::cerr << "[DNS_HANDLER_ERROR] No se pudo manejar query estándar: "
                  << e.what() << std::endl;
    }
}