#pragma once
#include <cstdint>
#include <string>
#include <vector>

std::string base64Encode(const uint8_t* data, int len);
std::vector<uint8_t> base64Decode(const std::string& input);