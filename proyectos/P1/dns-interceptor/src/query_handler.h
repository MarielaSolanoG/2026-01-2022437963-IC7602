#pragma once
#include "udp_server.h"

#include <string>

void handleStandardQuery(const ClientRequest& req, const std::string& domain);
void handleNonStandardQuery(const ClientRequest& req);