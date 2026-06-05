#[derive(Debug, PartialEq)]
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_header_valid() {
        // Un paquete DNS simulado con ID=0x1234, QR=1 (Respuesta), Opcode=0
        let mut buffer = [0u8; 12];
        buffer[0] = 0x12; buffer[1] = 0x34; // ID
        buffer[2] = 0x80; buffer[3] = 0x00; // QR = 1 (bit más significativo de byte 2), Opcode = 0

        let header = parse_header(&buffer).unwrap();
        assert_eq!(header.id, 0x1234);
        assert_eq!(header.qr, 1);
        assert_eq!(header.opcode, 0);
    }

    #[test]
    fn test_parse_header_too_short() {
        let buffer = [0u8; 10]; // Menor a 12 bytes
        let result = parse_header(&buffer);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Paquete demasiado corto");
    }

    #[test]
    fn test_extract_domain_valid() {
        // Dominio simulado: "google.com" -> largo 6 'g' 'o' 'o' 'g' 'l' 'e' largo 3 'c' 'o' 'm' nulo 0
        let mut buffer = vec![0u8; 12]; // Cabecera vacía
        buffer.extend_from_slice(&[6, b'g', b'o', b'o', b'g', b'l', b'e', 3, b'c', b'o', b'm', 0]);

        let domain = extract_domain(&buffer).unwrap();
        assert_eq!(domain, "google.com");
    }

    #[test]
    fn test_extract_domain_malformed() {
        // Dice que el label mide 10 bytes pero el buffer se corta inmediatamente
        let mut buffer = vec![0u8; 12];
        buffer.extend_from_slice(&[10, b'g', b'o', 0]);

        let result = extract_domain(&buffer);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Malformación en el tamaño del label del dominio");
    }
}