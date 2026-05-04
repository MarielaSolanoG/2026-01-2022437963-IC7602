#include "dns_response.h"
#include <arpa/inet.h>
#include <stdexcept>

static int findQuestionEnd(const uint8_t* query, int queryLen) {
    if (queryLen < 12) {
        throw std::runtime_error("Consulta DNS demasiado corta");
    }

    int pos = 12;

    while (pos < queryLen) {
        uint8_t labelLen = query[pos];

        if (labelLen == 0) {
            pos++;
            break;
        }

        if ((labelLen & 0xC0) == 0xC0) {
            throw std::runtime_error("QNAME comprimido no soportado en la consulta");
        }

        pos += 1 + labelLen;
    }

    // QTYPE + QCLASS ocupan 4 bytes.
    if (pos + 4 > queryLen) {
        throw std::runtime_error("Consulta DNS sin QTYPE/QCLASS completo");
    }

    return pos + 4;
}

static void push16(std::vector<uint8_t>& out, uint16_t value) {
    out.push_back(static_cast<uint8_t>((value >> 8) & 0xFF));
    out.push_back(static_cast<uint8_t>(value & 0xFF));
}

static void push32(std::vector<uint8_t>& out, uint32_t value) {
    out.push_back(static_cast<uint8_t>((value >> 24) & 0xFF));
    out.push_back(static_cast<uint8_t>((value >> 16) & 0xFF));
    out.push_back(static_cast<uint8_t>((value >> 8) & 0xFF));
    out.push_back(static_cast<uint8_t>(value & 0xFF));
}

std::vector<uint8_t> buildARecordResponse(
    const uint8_t* query,
    int queryLen,
    const std::string& ip,
    int ttl
) {
    int questionEnd = findQuestionEnd(query, queryLen);

    uint8_t ipBytes[4];

    if (inet_pton(AF_INET, ip.c_str(), ipBytes) != 1) {
        throw std::runtime_error("IP inválida para respuesta A: " + ip);
    }

    std::vector<uint8_t> response;
    response.reserve(questionEnd + 16);

    // Header DNS de respuesta.
    // ID: mismo ID de la consulta original.
    response.push_back(query[0]);
    response.push_back(query[1]);

    // Flags 0x8180: respuesta estándar, recursion available, sin error.
    push16(response, 0x8180);

    // QDCOUNT = 1, ANCOUNT = 1, NSCOUNT = 0, ARCOUNT = 0.
    push16(response, 1);
    push16(response, 1);
    push16(response, 0);
    push16(response, 0);

    // Copiar la sección Question original.
    response.insert(response.end(), query + 12, query + questionEnd);

    // Answer.
    // NAME = C0 0C, puntero al dominio original dentro del paquete.
    response.push_back(0xC0);
    response.push_back(0x0C);

    push16(response, 1);                         // TYPE A
    push16(response, 1);                         // CLASS IN
    push32(response, static_cast<uint32_t>(ttl)); // TTL
    push16(response, 4);                         // RDLENGTH = 4 bytes para IPv4

    response.push_back(ipBytes[0]);
    response.push_back(ipBytes[1]);
    response.push_back(ipBytes[2]);
    response.push_back(ipBytes[3]);

    return response;
}