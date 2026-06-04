use std::net::UdpSocket;
use std::thread;

mod dns_parser;
mod geo_locator;
mod query_handler;
mod dns_response;

fn main() -> std::io::Result<()> {
    let port = std::env::var("DNS_PORT").unwrap_or_else(|_| "53".to_string());
    let address = format!("0.0.0.0:{}", port);

    let socket = UdpSocket::bind(&address)?;
    println!("[DNS Interceptor] Escuchando en UDP/{}", address);

    loop {
        let mut buffer = [0u8; 512];

        match socket.recv_from(&mut buffer) {
            Ok((amt, src)) => {
                let socket_clone = socket.try_clone()?;
                let packet = buffer[..amt].to_vec();

                thread::spawn(move || {
                    if let Err(e) = query_handler::handle_packet(&packet, src, &socket_clone) {
                        eprintln!("[Error] Error procesando paquete de {}: {}", src, e);
                    }
                });
            }

            Err(e) => {
                eprintln!("[Error] Falló recv_from: {}", e);
            }
        }
    }
}