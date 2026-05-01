#include "udp_server.h"
#include "dns_parser.h"
#include <iostream>
#include <thread>
#include <stdexcept>
#include <cstring>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>

void handleRequest(ClientRequest req) {
    try {
        // Paso 1: parsear el header para leer QR y OPCODE
        DNSHeader header = parseHeader(req.buffer, req.len);
        uint8_t qr     = getQR(header.flags);
        uint8_t opcode = getOpcode(header.flags);

        // Paso 2: decidir qué flujo seguir
        if (qr == 0 && opcode == 0) {
            // Query estándar — extraer dominio
            std::string domain = extractDomain(req.buffer, req.len);
            std::cout << "[STANDARD] ID=" << std::hex << header.id
                      << " dominio=" << domain << std::endl;
            // TODO: llamar a handleStandardQuery() de 1B
        } else {
            // No estándar — proxy directo al API en BASE64
            std::cout << "[NON-STANDARD] ID=" << std::hex << header.id
                      << " opcode=" << (int)opcode << std::endl;
            // TODO: llamar a handleNonStandardQuery() de 1B
        }
    } catch (const std::exception& e) {
        std::cerr << "[ERROR] " << e.what() << std::endl;
    }
}

void startServer(int port) {
    // Paso 1: crear el socket UDP
    int sock = socket(AF_INET, SOCK_DGRAM, 0);
    if (sock < 0)
        throw std::runtime_error("No se pudo crear el socket");

    // Paso 2: configurar en qué dirección y puerto escuchar
    struct sockaddr_in server_addr;
    memset(&server_addr, 0, sizeof(server_addr));
    server_addr.sin_family      = AF_INET;        // IPv4
    server_addr.sin_addr.s_addr = INADDR_ANY;     // cualquier interfaz de red
    server_addr.sin_port        = htons(port);    // puerto en network byte order

    // Paso 3: bind — asociar el socket al puerto
    if (bind(sock, (struct sockaddr*)&server_addr, sizeof(server_addr)) < 0)
        throw std::runtime_error("bind() falló — puerto ocupado?");

    std::cout << "[SERVER] Escuchando en puerto " << port << std::endl;

    // Paso 4: loop infinito recibiendo paquetes
    while (true) {
        ClientRequest req;
        req.server_socket = sock;
        socklen_t client_len = sizeof(req.client);

        // recvfrom bloquea hasta que llegue un paquete
        req.len = recvfrom(sock, req.buffer, sizeof(req.buffer), 0,
                           (struct sockaddr*)&req.client, &client_len);

        if (req.len < 0) {
            std::cerr << "[ERROR] recvfrom falló" << std::endl;
            continue;  // seguir escuchando aunque falle uno
        }

        // Lanzar un hilo nuevo para este paquete
        // detach() significa que el hilo corre independiente
        std::thread(handleRequest, req).detach();
    }

    close(sock);
}