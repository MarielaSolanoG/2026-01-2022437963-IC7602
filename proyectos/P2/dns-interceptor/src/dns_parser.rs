pub struct DNSHeader {
    pub id: u16,
    pub qr: u8,
    pub opcode: u8,
}

pub fn parse_header(buffer: &[u8]) -> Result<DNSHeader, &'static str> {
    if buffer.len() < 12 {
        return Err("Paquete demasiado corto");
    }

    let id = u16::from_be_bytes([buffer[0], buffer[1]]);
    let flags = u16::from_be_bytes([buffer[2], buffer[3]]);
    
    let qr = ((flags >> 15) & 0x1) as u8;
    let opcode = ((flags >> 11) & 0xF) as u8;

    Ok(DNSHeader { id, qr, opcode })
}

pub fn extract_domain(buffer: &[u8]) -> Result<String, &'static str> {
    let mut pos = 12;
    let mut domain = String::new();

    while pos < buffer.len() {
        let label_len = buffer[pos] as usize;

        if label_len == 0 {
            break;
        }

        if !domain.is_empty() {
            domain.push('.');
        }

        pos += 1;

        if pos + label_len > buffer.len() {
            return Err("Malformación en el tamaño del label del dominio");
        }

        let label = std::str::from_utf8(&buffer[pos..pos + label_len])
            .map_err(|_| "Dominio no es UTF-8 válido")?;

        domain.push_str(label);
        pos += label_len;
    }

    Ok(domain)
}