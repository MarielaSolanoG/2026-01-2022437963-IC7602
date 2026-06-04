use serde::Deserialize;
use std::fs;

#[derive(Deserialize)]
pub struct DomainConfig {
    pub domain: String,
    pub ttl: u32,
    pub cache_size_mb: u32,
    pub replacement_policy: String,
    pub auth_type: String,
    pub api_key: String,
}

pub fn load_config() -> DomainConfig {

    let json =
        fs::read_to_string(
            "config.json"
        )
        .expect("No se encontró config.json");

    serde_json::from_str(
        &json
    )
    .expect("JSON inválido")
}