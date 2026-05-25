use std::net::{UdpSocket, SocketAddr};
use crate::dns_parser::{parse_header, extract_domain}

pub fn handle_packet(packet: &[u8], src: SocketAddr, socket: &UdpSocket) -> Result<(), Box<dyn std::error::Error>> {
    let header = parse_header(packet)?;
    
    if header.qr == 0 && header.opcode == 0 {
        let domain == extract_domain(packet)?;
        println!("[STANDARD] ID={:#x} dominio={}", header.id, domain);
    } else {
        println!("[NON-STANDARD] ID={:#x} opcode={}", header.id, header.opcode);
    }

    Ok(())
}