#pragma once
#include <string>
#include <cstdint>

struct DNSHeader {
    uint16_t id;
    uint16_t flags;
    uint16_t qdcount;
    uint16_t ancount;
    uint16_t nscount;
    uint16_t arcount;
};

uint8_t getQR(uint16_t flags);
uint8_t getOpcode(uint16_t flags);
DNSHeader parseHeader(const uint8_t* buffer, int len);
std::string extractDomain(const uint8_t* buffer, int len);