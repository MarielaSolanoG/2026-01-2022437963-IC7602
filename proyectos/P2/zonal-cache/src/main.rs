mod firebase;
mod auth;

use firebase::config::load_config;
use auth::api_key::validate_api_key;
use auth::session::{get_session_cookie, validate_session_token};

use axum::{
    extract::Request,
    http::StatusCode,
    middleware::{self, Next},
    response::{IntoResponse, Redirect, Response},
    routing::get,
    Router,
};

use std::env;

async fn auth_middleware(request: Request, next: Next) -> Result<Response, StatusCode> {
    let config = load_config();

    if config.auth_type == "none" {
        return Ok(next.run(request).await);
    }

    if config.auth_type == "api_key" {
        if validate_api_key(request.headers(), &config.api_key) {
            return Ok(next.run(request).await);
        }

        return Err(StatusCode::UNAUTHORIZED);
    }

    if config.auth_type == "session" {
        if let Some(value) = get_session_cookie(request.headers()) {
            if validate_session_token(&value) {
                return Ok(next.run(request).await);
            }

            return Err(StatusCode::UNAUTHORIZED);
        }

        if let Some(query) = request.uri().query() {
            for param in query.split('&') {
                if let Some(token) = param.strip_prefix("token=") {
                    if validate_session_token(token) {
                        return Ok(next.run(request).await);
                    }

                    return Err(StatusCode::UNAUTHORIZED);
                }
            }
        }

        let redirect = Redirect::temporary(
            "http://localhost:5173/auth?domain=example.com&redirect=http://localhost:8080",
        );

        return Ok(redirect.into_response());
    }
    Err(StatusCode::UNAUTHORIZED)
}

async fn protected_resource() -> &'static str {
    "Acceso permitido según config.json"
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let port = env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let address = format!("0.0.0.0:{}", port);

    let app = Router::new()
        .route("/", get(protected_resource))
        .layer(middleware::from_fn(auth_middleware));

    let listener = tokio::net::TcpListener::bind(&address).await.unwrap();

    println!("Servidor iniciado en http://localhost:{}", port);

    axum::serve(listener, app).await.unwrap();
}