use std::net::{UdpSocket, SocketAddr};
use crate::dns_parser::{parse_header, extract_domain};
use crate::geo_locator::ApiClient;
use crate::dns_response::build_a_record_response;

fn send_response_to_client(socket: &UdpSocket, dest: SocketAddr, response: &[u8]) {
    if let Err(e) = socket.send_to(response, dest) {
        eprintln!("[DNS_HANDLER ERROR] No se pudo enviar respuesta UDP a {}: {}", dest, e);
    }
}

fn proxy_with_dns_api(packet: &[u8], src: SocketAddr, socket: &UdpSocket, api: &ApiClient) -> Result<(), Box<dyn std::error::Error>> {
    let response = api.dns_resolver(packet)?;
    send_response_to_client(socket, src, &response);
    Ok(())
}

pub fn handle_packet(packet: &[u8], src: SocketAddr, socket: &UdpSocket) -> Result<(), Box<dyn std::error::Error>> {
    let header = parse_header(packet)?;
    let api = ApiClient::new();
    
    if header.qr == 0 && header.opcode == 0 {
        let domain = extract_domain(packet)?;
        let client_ip = src.ip().to_string();
        
        println!("[DNS_HANDLER] Consultando DNS API por dominio={} client_ip={}", domain, client_ip);
        
        match api.exists(&domain, &client_ip) {
            Ok(result) => {
                if result.exists && result.healthy && !result.ip.is_empty() {
                    println!(
                        "[DNS_HANDLER] Registro local encontrado. type={} ip={} ttl={}",
                        result.r#type, result.ip, result.ttl
                    );
                    
                    match build_a_record_response(packet, &result.ip, result.ttl) {
                        Ok(dns_response) => {
                            send_response_to_client(socket, src, &dns_response);
                            return Ok(());
                        }
                        Err(e) => {
                            eprintln!(
                                "[DNS_HANDLER_WARNING] No se pudo construir respuesta local: {}. Fallback a dns_resolver.",
                                e
                            );
                        }
                    }
                } else {
                    println!("[DNS_HANDLER_WARNING] No existe, está unhealthy o no hay IP. Fallback a /api/dns_resolver");
                }
            }
            Err(e) => {
                eprintln!("[DNS_HANDLER_ERROR] Error llamando a /api/exists: {}. Intentando resolver vía proxy...", e);
            }
        }
        
        proxy_with_dns_api(packet, src, socket, &api)?;
        
    } else {
        println!("[DNS_HANDLER] Paquete no estándar (ID={:#x}, opcode={}): reenviando a /api/dns_resolver", header.id, header.opcode);
        proxy_with_dns_api(packet, src, socket, &api)?;
    }

    Ok(())
}