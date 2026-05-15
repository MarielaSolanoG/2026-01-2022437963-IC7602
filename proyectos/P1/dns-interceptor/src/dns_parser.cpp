#include "dns_parser.h"
#include <stdexcept>
#include <arpa/inet.h>
using namespace std; 

DNSHeader parseHeader(const uint8_t* buffer, int len) {
    if (len < 12)
        throw runtime_error("Paquete demasiado corto");

    DNSHeader h;
    h.id      = ntohs(*(uint16_t*)(buffer + 0));
    h.flags   = ntohs(*(uint16_t*)(buffer + 2));
    h.qdcount = ntohs(*(uint16_t*)(buffer + 4));
    h.ancount = ntohs(*(uint16_t*)(buffer + 6));
    h.nscount = ntohs(*(uint16_t*)(buffer + 8));
    h.arcount = ntohs(*(uint16_t*)(buffer + 10));
    return h;
}

uint8_t getQR(uint16_t flags) {
    return (flags >> 15) & 0x1;
}

uint8_t getOpcode(uint16_t flags) {
    return (flags >> 11) & 0xF;
}

string extractDomain(const uint8_t* buffer, int len) {
    int pos = 12;
    string domain;

    while (pos < len) {
        uint8_t labelLen = buffer[pos];

        if (labelLen == 0) break;

        if (!domain.empty()) domain += ".";

        pos++;

        for (int i = 0; i < labelLen && pos < len; i++, pos++) {
            domain += (char)buffer[pos];
        }
    }

    return domain;
}