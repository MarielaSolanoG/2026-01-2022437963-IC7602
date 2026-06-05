use std::net::Ipv4Addr;

fn find_question_end(query: &[u8]) -> Result<usize, &'static str> {
    if query.len() < 12 {
        return Err("Consulta DNS demasiado corta");
    }

    let mut pos = 12;
    while pos < query.len() {
        let label_len = query[pos];

        if label_len == 0 {
            pos += 1;
            break;
        }

        if (label_len & 0xC0) == 0xC0 {
            return Err("QNAME comprimido no soportado en la consulta");
        }

        pos += 1 + (label_len as usize);
    }

    if pos + 4 > query.len() {
        return Err("Consulta DNS sin QTYPE/QCLASS completo");
    }

    Ok(pos + 4)
}

pub fn build_a_record_response(
    query: &[u8],
    ip: &str,
    ttl: u32,
) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let question_end = find_question_end(query)?;
    
    let parsed_ip: Ipv4Addr = ip.parse()?;
    let ip_bytes = parsed_ip.octets();

    let mut response = Vec::with_capacity(question_end + 16);

    response.push(query[0]);
    response.push(query[1]);

    response.extend_from_slice(&0x8180u16.to_be_bytes());

    response.extend_from_slice(&1u16.to_be_bytes());
    response.extend_from_slice(&1u16.to_be_bytes());
    response.extend_from_slice(&0u16.to_be_bytes());
    response.extend_from_slice(&0u16.to_be_bytes());

    response.extend_from_slice(&query[12..question_end]);

    response.push(0xC0);
    response.push(0x0C);

    response.extend_from_slice(&1u16.to_be_bytes());
    response.extend_from_slice(&1u16.to_be_bytes());

    response.extend_from_slice(&ttl.to_be_bytes());

    response.extend_from_slice(&4u16.to_be_bytes());

    response.extend_from_slice(&ip_bytes);

    Ok(response)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_a_record_response() {
        // Consulta simulada para "itcr.ac.cr" (Cabecera de 12 bytes + QNAME + QTYPE/QCLASS de 4 bytes)
        let mut query = vec![0xAB, 0xCD]; // ID = 0xABCD
        query.extend_from_slice(&[0x00, 0x00]); // Flags consulta estándar
        query.extend_from_slice(&[0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]); // QDCOUNT=1
        // QNAME: "itcr.ac.cr" (4 itcr 2 ac 2 cr 0)
        query.extend_from_slice(&[4, b'i', b't', b'c', b'r', 2, b'a', b'c', 2, b'c', b'r', 0]);
        query.extend_from_slice(&[0x00, 0x01, 0x00, 0x01]); // QTYPE=A (1), QCLASS=IN (1)

        let ip_target = "192.168.1.50";
        let ttl = 60; // 60 segundos

        let response = build_a_record_response(&query, ip_target, ttl).unwrap();

        // Verificaciones del encabezado de respuesta
        assert_eq!(response[0], 0xAB); // Mismo ID
        assert_eq!(response[1], 0xCD);
        assert_eq!(response[2], 0x81); // Flags: Respuesta estándar (0x8180)
        assert_eq!(response[3], 0x80);
        assert_eq!(response[7], 1);    // ANCOUNT = 1 (Una respuesta incluida)

        // Verificación de los últimos 4 bytes (deben ser la IP mapeada)
        let len = response.len();
        assert_eq!(response[len - 4], 192);
        assert_eq!(response[len - 3], 168);
        assert_eq!(response[len - 2], 1);
        assert_eq!(response[len - 1], 50);
    }

    #[test]
    fn test_invalid_ip_format() {
        let query = vec![0u8; 30]; // Buffer genérico lo suficientemente largo
        let result = build_a_record_response(&query, "IP_INVALIDA_999.999", 300);
        assert!(result.is_err());
    }
}