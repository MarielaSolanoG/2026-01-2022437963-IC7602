use serde::Deserialize;
use std::error::Error;

#[derive(Deserialize, Debug, Clone)]
pub struct DomainConfig {
    pub domain: String,
    pub ttl: u32,
    pub cache_size_mb: u32,
    pub replacement_policy: String,
    pub auth_type: String,
    pub api_key: String,
}

pub async fn load_config(domain: &str) -> Result<DomainConfig, Box<dyn Error>> {
    let base_url = std::env::var("CONFIG_API_URL")
        .unwrap_or_else(|_| "http://localhost:3000".to_string());

    let url = format!("{}/domains/{}/config", base_url, domain);

    let config = reqwest::get(url)
        .await?
        .json::<DomainConfig>()
        .await?;

    Ok(config)
}