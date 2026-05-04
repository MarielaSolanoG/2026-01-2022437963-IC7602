#pragma once
#include <cstdint>
#include <string>
#include <vector>

std::vector<uint8_t> buildARecordResponse(
    const uint8_t* query,
    int queryLen,
    const std::string& ip,
    int ttl
);