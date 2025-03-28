use tokio_tungstenite::WebSocketStream;
use futures_util::{SinkExt, StreamExt};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use governor::{
    middleware::StateInformationMiddleware,
    state::{InMemoryState, NotKeyed},
    Quota, Governor,
};
use axum::{
    routing::get,
    Router,
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::IntoResponse,
};
use std::net::SocketAddr;
use crate::common::Message as BotMessage;

pub struct WebSocketServer {
    clients: Arc<RwLock<HashMap<String, WebSocketStream>>>,
}

impl WebSocketServer {
    pub fn new() -> Self {
        Self {
            clients: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn start(&self, addr: SocketAddr) {
        let limiter = Governor::builder()
            .key_extractor(PeerIpKeyExtractor)
            .quota(Quota::per_second(10))
            .build()
            .unwrap();

        let app = Router::new()
            .route("/ws", get(ws_handler))
            .layer(GovernorLayer::new(limiter));

        println!("WebSocket server listening on {}", addr);
        axum::Server::bind(&addr)
            .serve(app.into_make_service())
            .await
            .unwrap();
    }

    pub async fn broadcast_update(&self, update: BotMessage) {
        let clients = self.clients.read().await;
        let message = serde_json::to_string(&update).unwrap();
        
        for client in clients.values() {
            if let Err(e) = client.send(Message::Text(message.clone())).await {
                eprintln!("Error sending message to client: {}", e);
            }
        }
    }

    async fn handle_connection(&self, ws: WebSocket, client_id: String) {
        let (mut sender, mut receiver) = ws.split();
        
        // Add client to active connections
        {
            let mut clients = self.clients.write().await;
            clients.insert(client_id.clone(), sender);
        }

        // Handle incoming messages
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    println!("Received message from {}: {}", client_id, text);
                }
                Message::Close(_) => {
                    break;
                }
                _ => {}
            }
        }

        // Remove client from active connections
        let mut clients = self.clients.write().await;
        clients.remove(&client_id);
    }
}

async fn ws_handler(ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(|socket| async move {
        let client_id = uuid::Uuid::new_v4().to_string();
        let server = WebSocketServer::new();
        server.handle_connection(socket, client_id).await;
    })
}

struct PeerIpKeyExtractor;

impl governor::key_extractor::KeyExtractor<SocketAddr> for PeerIpKeyExtractor {
    type Key = SocketAddr;

    fn extract(&self, addr: &SocketAddr) -> Self::Key {
        *addr
    }
}

pub struct GovernorLayer;

impl GovernorLayer {
    pub fn new(limiter: Governor<NotKeyed, InMemoryState, PeerIpKeyExtractor, StateInformationMiddleware>) -> Self {
        Self
    }
}

impl<S> tower::Layer<S> for GovernorLayer {
    type Service = GovernorMiddleware<S>;

    fn layer(&self, inner: S) -> Self::Service {
        GovernorMiddleware { inner }
    }
}

pub struct GovernorMiddleware<S> {
    inner: S,
}

impl<S, B> tower::Service<axum::http::Request<B>> for GovernorMiddleware<S>
where
    S: tower::Service<axum::http::Request<B>>,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = S::Future;

    fn poll_ready(&mut self, cx: &mut std::task::Context<'_>) -> std::task::Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, req: axum::http::Request<B>) -> Self::Future {
        self.inner.call(req)
    }
} 