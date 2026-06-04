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