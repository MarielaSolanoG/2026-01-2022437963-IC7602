use axum::http::HeaderMap;

pub fn get_session_cookie(headers: &HeaderMap) -> Option<String> {
    let cookie_header = headers
        .get("cookie")
        .or_else(|| headers.get("Cookie"))?
        .to_str()
        .ok()?;

    for cookie in cookie_header.split(';') {
        let cookie = cookie.trim();

        if let Some(value) = cookie.strip_prefix("session=") {
            return Some(value.to_string());
        }
    }

    None
}

pub fn validate_session_mock(session: &str) -> bool {
    session == "valid-session-123"
}