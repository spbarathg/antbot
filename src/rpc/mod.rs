use deadpool::managed::Manager;
use anyhow::Result;
use solana_client::rpc_client::RpcClient;
use std::time::Duration;
use crate::config::RpcConfig;

pub enum RpcProvider {
    Helius,
    Triton,
    Jito,
}

pub struct RpcClientManager {
    helius: deadpool::managed::Pool<HeliusManager>,
    triton: deadpool::managed::Pool<TritonManager>,
    jito: deadpool::managed::Pool<JitoManager>,
}

struct HeliusManager {
    endpoint: String,
}

struct TritonManager {
    endpoint: String,
}

struct JitoManager {
    endpoint: String,
    auth_token: String,
}

impl Manager for HeliusManager {
    type Type = RpcClient;
    type Error = anyhow::Error;

    async fn create(&self) -> Result<RpcClient, Self::Error> {
        Ok(RpcClient::new(&self.endpoint))
    }
}

impl Manager for TritonManager {
    type Type = RpcClient;
    type Error = anyhow::Error;

    async fn create(&self) -> Result<RpcClient, Self::Error> {
        Ok(RpcClient::new(&self.endpoint))
    }
}

impl Manager for JitoManager {
    type Type = RpcClient;
    type Error = anyhow::Error;

    async fn create(&self) -> Result<RpcClient, Self::Error> {
        let mut client = RpcClient::new(&self.endpoint);
        client.set_auth_token(&self.auth_token);
        Ok(client)
    }
}

impl RpcClientManager {
    pub async fn new(config: &RpcConfig) -> Result<Self> {
        let helius = deadpool::managed::Pool::builder(HeliusManager {
            endpoint: config.helius.mainnet.clone(),
        })
        .max_size(10)
        .build()?;

        let triton = deadpool::managed::Pool::builder(TritonManager {
            endpoint: config.triton.mainnet.clone(),
        })
        .max_size(10)
        .build()?;

        let jito = deadpool::managed::Pool::builder(JitoManager {
            endpoint: config.jito.mainnet.clone(),
            auth_token: "YOUR_JITO_AUTH_TOKEN".to_string(), // TODO: Load from config
        })
        .max_size(10)
        .build()?;

        Ok(Self {
            helius,
            triton,
            jito,
        })
    }

    pub async fn get_client(&self, provider: RpcProvider) -> Result<RpcClient> {
        match provider {
            RpcProvider::Helius => self.helius.get().await.map_err(|e| e.into()),
            RpcProvider::Triton => self.triton.get().await.map_err(|e| e.into()),
            RpcProvider::Jito => self.jito.get().await.map_err(|e| e.into()),
        }
    }

    pub async fn with_client<T, F>(&self, provider: RpcProvider, f: F) -> Result<T>
    where
        F: FnOnce(&RpcClient) -> Result<T>,
    {
        let client = self.get_client(provider).await?;
        let result = f(&client)?;
        Ok(result)
    }
}

pub struct RpcClientWrapper {
    client: RpcClient,
    provider: RpcProvider,
}

impl RpcClientWrapper {
    pub fn new(client: RpcClient, provider: RpcProvider) -> Self {
        Self {
            client,
            provider,
        }
    }

    pub async fn execute_with_retry<T, F>(&self, f: F, max_retries: u32) -> Result<T>
    where
        F: Fn(&RpcClient) -> Result<T>,
    {
        let mut retries = 0;
        let mut last_error = None;

        while retries < max_retries {
            match f(&self.client) {
                Ok(result) => return Ok(result),
                Err(e) => {
                    last_error = Some(e);
                    retries += 1;
                    tokio::time::sleep(Duration::from_millis(1000 * retries as u64)).await;
                }
            }
        }

        Err(last_error.unwrap_or_else(|| anyhow::anyhow!("Max retries exceeded")))
    }
} 