use axum::http::HeaderMap;

pub fn validate_api_key(headers: &HeaderMap, expected_key: &str) -> bool {
    let api_key = headers
        .get("x-api-key")
        .and_then(|value| value.to_str().ok());

    match api_key {
        Some(key) if key == expected_key => true,
        _ => false,
    }
}