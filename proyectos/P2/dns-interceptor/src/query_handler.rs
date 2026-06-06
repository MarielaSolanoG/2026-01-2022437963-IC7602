use std::net::{UdpSocket, SocketAddr};
use crate::dns_parser::{parse_header, extract_domain};
use crate::geo_locator::GeoLocator;
use crate::dns_response::build_a_record_response;

pub fn handle_packet(packet: &[u8], src: SocketAddr, socket: &UdpSocket) -> Result<(), Box<dyn std::error::Error>> {
    let header = parse_header(packet)?;
    let geo = GeoLocator::new();
    
    if header.qr == 0 && header.opcode == 0 {
        let domain = extract_domain(packet)?;
        
        let real_client_ip = src.ip().to_string(); 
        
        println!("[DNS_HANDLER] Interceptada consulta para: {} desde IP real: {}", domain, real_client_ip);
        
        let client_ip_mock = "200.200.10.25";
        
        let pais = geo.obtener_pais_por_ip(client_ip_mock);
        
        let zonal_cache_target = geo.obtener_ip_zonal_cache(&pais);
        
        println!(
            "[DNS_HANDLER] Geolocalización: País=[{}]. Redireccionando dominio [{}] hacia la Caché Zonal en: {}", 
            pais, domain, zonal_cache_target
        );
        
        let ttl = 300; 
        let dns_response = build_a_record_response(packet, &zonal_cache_target, ttl)?;
        
        socket.send_to(&dns_response, src)?;
        println!("[DNS_HANDLER] Respuesta DNS enviada con éxito a {}.", src);
        
    } else {
        println!(
            "[DNS_HANDLER_WARNING] Ignorando paquete no estándar o respuesta (ID={:#x}, QR={}, Opcode={})", 
            header.id, header.qr, header.opcode
        );
    }

    Ok(())
}