import os
import json
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import openai
from dataclasses import dataclass
import numpy as np
from concurrent.futures import ThreadPoolExecutor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('ai_oracle')

@dataclass
class TokenMetrics:
    price: float
    volume_24h: float
    liquidity: float
    holders: int
    market_cap: float
    price_change_24h: float
    volume_change_24h: float
    liquidity_change_24h: float
    holder_change_24h: int
    created_at: datetime
    last_updated: datetime

@dataclass
class TokenAnalysis:
    token_address: str
    recommendation: str  # "Buy", "Hold", or "Avoid"
    confidence: float
    reasoning: str
    risk_score: float
    metrics: TokenMetrics
    timestamp: datetime

class AIOracle:
    def __init__(self, config_path: str = "config/settings.toml"):
        """Initialize the AI Oracle with configuration."""
        self.config = self._load_config(config_path)
        self.openai_client = openai.OpenAI(api_key=self.config["api_keys"]["openai"])
        self.executor = ThreadPoolExecutor(max_workers=4)
        self.analysis_cache: Dict[str, TokenAnalysis] = {}
        self.cache_ttl = timedelta(minutes=5)
        
        logger.info("AI Oracle initialized successfully")

    def _load_config(self, config_path: str) -> Dict:
        """Load configuration from TOML file."""
        try:
            import tomli
            with open(config_path, "rb") as f:
                return tomli.load(f)
        except Exception as e:
            logger.error(f"Error loading config: {e}")
            raise

    async def analyze_token(self, token_address: str, metrics: TokenMetrics) -> TokenAnalysis:
        """Perform deep analysis on a token using GPT-4."""
        # Check cache first
        if token_address in self.analysis_cache:
            cached_analysis = self.analysis_cache[token_address]
            if datetime.now() - cached_analysis.timestamp < self.cache_ttl:
                return cached_analysis

        # Prepare analysis prompt
        prompt = self._create_analysis_prompt(metrics)
        
        try:
            # Get GPT-4 analysis
            response = await self._get_gpt_analysis(prompt)
            
            # Parse and validate response
            analysis = self._parse_gpt_response(response, token_address, metrics)
            
            # Cache the analysis
            self.analysis_cache[token_address] = analysis
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing token {token_address}: {e}")
            raise

    def _create_analysis_prompt(self, metrics: TokenMetrics) -> str:
        """Create a detailed prompt for GPT-4 analysis."""
        return f"""Analyze the following token metrics and provide a detailed analysis:

Price: ${metrics.price:.8f}
24h Volume: ${metrics.volume_24h:,.2f}
Liquidity: ${metrics.liquidity:,.2f}
Holders: {metrics.holders:,}
Market Cap: ${metrics.market_cap:,.2f}
24h Price Change: {metrics.price_change_24h:.2f}%
24h Volume Change: {metrics.volume_change_24h:.2f}%
24h Liquidity Change: {metrics.liquidity_change_24h:.2f}%
24h Holder Change: {metrics.holder_change_24h:,}
Created: {metrics.created_at}
Last Updated: {metrics.last_updated}

Please provide:
1. A clear recommendation (Buy/Hold/Avoid)
2. Confidence level (0-1)
3. Detailed reasoning
4. Risk score (0-1)
5. Key factors influencing the decision
6. Potential risks and opportunities

Format the response as JSON with these fields:
{{
    "recommendation": "string",
    "confidence": float,
    "reasoning": "string",
    "risk_score": float,
    "key_factors": ["string"],
    "risks": ["string"],
    "opportunities": ["string"]
}}"""

    async def _get_gpt_analysis(self, prompt: str) -> str:
        """Get analysis from GPT-4."""
        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert cryptocurrency analyst specializing in token analysis."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error getting GPT-4 analysis: {e}")
            raise

    def _parse_gpt_response(self, response: str, token_address: str, metrics: TokenMetrics) -> TokenAnalysis:
        """Parse and validate GPT-4 response."""
        try:
            analysis_data = json.loads(response)
            
            # Validate required fields
            required_fields = ["recommendation", "confidence", "reasoning", "risk_score"]
            for field in required_fields:
                if field not in analysis_data:
                    raise ValueError(f"Missing required field: {field}")

            # Validate recommendation
            if analysis_data["recommendation"] not in ["Buy", "Hold", "Avoid"]:
                raise ValueError("Invalid recommendation")

            # Validate confidence and risk score
            if not 0 <= analysis_data["confidence"] <= 1:
                raise ValueError("Confidence must be between 0 and 1")
            if not 0 <= analysis_data["risk_score"] <= 1:
                raise ValueError("Risk score must be between 0 and 1")

            return TokenAnalysis(
                token_address=token_address,
                recommendation=analysis_data["recommendation"],
                confidence=analysis_data["confidence"],
                reasoning=analysis_data["reasoning"],
                risk_score=analysis_data["risk_score"],
                metrics=metrics,
                timestamp=datetime.now()
            )

        except Exception as e:
            logger.error(f"Error parsing GPT response: {e}")
            raise

    async def batch_analyze_tokens(self, tokens: List[Tuple[str, TokenMetrics]]) -> List[TokenAnalysis]:
        """Analyze multiple tokens concurrently."""
        tasks = [self.analyze_token(token_address, metrics) 
                for token_address, metrics in tokens]
        return await asyncio.gather(*tasks)

    def clear_cache(self):
        """Clear the analysis cache."""
        self.analysis_cache.clear()
        logger.info("Analysis cache cleared")

    def get_cached_analysis(self, token_address: str) -> Optional[TokenAnalysis]:
        """Get cached analysis for a token if available and not expired."""
        if token_address in self.analysis_cache:
            analysis = self.analysis_cache[token_address]
            if datetime.now() - analysis.timestamp < self.cache_ttl:
                return analysis
        return None 