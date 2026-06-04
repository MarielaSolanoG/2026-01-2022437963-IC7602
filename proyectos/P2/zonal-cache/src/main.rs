mod firebase;
mod auth;

use firebase::config::load_config;
use auth::api_key::validate_api_key;
use auth::session::{get_session_cookie, validate_session_mock};

use axum::{
    extract::Request,
    http::StatusCode,
    middleware::{self, Next},
    response::Response,
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
        let session = get_session_cookie(request.headers());

        return match session {
            Some(value) if validate_session_mock(&value) => Ok(next.run(request).await),
            Some(_) => Err(StatusCode::UNAUTHORIZED),
            None => Err(StatusCode::FOUND),
        };
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

    let listener = tokio::net::TcpListener::bind(&address)
        .await
        .unwrap();

    println!("Servidor iniciado en http://localhost:{}", port);

    axum::serve(listener, app).await.unwrap();
}