import asyncio
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from .config_manager import ConfigManager
from .logger import get_logger, LogContext, log_execution_time
from .error_handling import BotError, APIError, ValidationError
from .cache import cache
from .api_client import APIClient
from .database import db

logger = get_logger('coin_analyzer')

@dataclass
class CoinAnalysis:
    """Structured analysis results for a coin."""
    address: str
    confidence: float
    risk_score: float
    market_cap: float
    liquidity: float
    holders: int
    price: float
    volume_24h: float
    timestamp: datetime
    analysis_data: Dict[str, Any]

class CoinAnalyzer:
    """Analyzes coins using AI and market data."""
    
    def __init__(self):
        self.config = ConfigManager()
        self.api_client = APIClient()
        self._initialized = False

    async def initialize(self):
        """Initialize the analyzer."""
        if self._initialized:
            return

        try:
            await self.api_client.initialize()
            self._initialized = True
            logger.info("Coin analyzer initialized")
        except Exception as e:
            raise BotError(
                message="Failed to initialize coin analyzer",
                component="coin_analyzer",
                operation="initialize",
                details={'error': str(e)}
            )

    async def close(self):
        """Close the analyzer."""
        if self._initialized:
            await self.api_client.close()
            self._initialized = False
            logger.info("Coin analyzer closed")

    @log_execution_time(logger, "analyze_coin")
    async def analyze_coin(self, address: str) -> CoinAnalysis:
        """
        Analyze a coin using AI and market data.
        
        Args:
            address: Coin contract address
            
        Returns:
            CoinAnalysis: Analysis results
        """
        if not self._initialized:
            await self.initialize()

        try:
            # Check cache first
            cache_key = f"coin_analysis:{address}"
            cached_result = await cache.get_json(cache_key)
            if cached_result:
                logger.info(f"Using cached analysis for {address}")
                return CoinAnalysis(**cached_result)

            # Fetch market data
            market_data = await self._fetch_market_data(address)
            
            # Get AI analysis
            ai_analysis = await self._get_ai_analysis(address, market_data)
            
            # Calculate risk score
            risk_score = self._calculate_risk_score(market_data, ai_analysis)
            
            # Calculate confidence
            confidence = self._calculate_confidence(market_data, ai_analysis)
            
            # Create analysis result
            analysis = CoinAnalysis(
                address=address,
                confidence=confidence,
                risk_score=risk_score,
                market_cap=market_data['market_cap'],
                liquidity=market_data['liquidity'],
                holders=market_data['holders'],
                price=market_data['price'],
                volume_24h=market_data['volume_24h'],
                timestamp=datetime.now(),
                analysis_data={
                    'market_data': market_data,
                    'ai_analysis': ai_analysis
                }
            )
            
            # Cache the result
            await cache.set_json(
                cache_key,
                analysis.__dict__,
                ttl=int(self.config.bot.cache_ttl_minutes * 60)
            )
            
            return analysis
            
        except Exception as e:
            raise BotError(
                message=f"Failed to analyze coin {address}",
                component="coin_analyzer",
                operation="analyze_coin",
                details={'error': str(e), 'address': address}
            )

    async def _fetch_market_data(self, address: str) -> Dict[str, Any]:
        """Fetch market data for a coin."""
        try:
            # Fetch data from Birdeye API
            response = await self.api_client.get(
                f"https://public-api.birdeye.so/public/price?address={address}"
            )
            
            if response.status != 200:
                raise APIError(
                    message="Failed to fetch market data",
                    operation="fetch_market_data",
                    status_code=response.status,
                    response=response.data
                )
            
            return response.data
            
        except Exception as e:
            raise APIError(
                message=f"Error fetching market data for {address}",
                operation="fetch_market_data",
                details={'error': str(e), 'address': address}
            )

    async def _get_ai_analysis(self, address: str, market_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get AI analysis for a coin."""
        try:
            # Prepare analysis prompt
            prompt = self._create_analysis_prompt(address, market_data)
            
            # Get AI response
            response = await self.api_client.post(
                "https://api.openai.com/v1/chat/completions",
                {
                    "model": self.config.ai.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": self.config.ai.temperature,
                    "max_tokens": self.config.ai.max_tokens
                }
            )
            
            if response.status != 200:
                raise APIError(
                    message="Failed to get AI analysis",
                    operation="get_ai_analysis",
                    status_code=response.status,
                    response=response.data
                )
            
            return self._parse_ai_response(response.data)
            
        except Exception as e:
            raise APIError(
                message=f"Error getting AI analysis for {address}",
                operation="get_ai_analysis",
                details={'error': str(e), 'address': address}
            )

    def _calculate_risk_score(self, market_data: Dict[str, Any], ai_analysis: Dict[str, Any]) -> float:
        """Calculate risk score based on market data and AI analysis."""
        try:
            # Market-based risk factors
            market_risk = self._calculate_market_risk(market_data)
            
            # AI-based risk factors
            ai_risk = self._calculate_ai_risk(ai_analysis)
            
            # Combine risk factors
            risk_score = (market_risk * 0.6) + (ai_risk * 0.4)
            
            return min(max(risk_score, 0.0), 1.0)
            
        except Exception as e:
            logger.error(f"Error calculating risk score: {e}")
            return 1.0  # Return maximum risk on error

    def _calculate_confidence(self, market_data: Dict[str, Any], ai_analysis: Dict[str, Any]) -> float:
        """Calculate confidence score based on market data and AI analysis."""
        try:
            # Market-based confidence factors
            market_confidence = self._calculate_market_confidence(market_data)
            
            # AI-based confidence factors
            ai_confidence = self._calculate_ai_confidence(ai_analysis)
            
            # Combine confidence factors
            confidence = (market_confidence * 0.4) + (ai_confidence * 0.6)
            
            return min(max(confidence, 0.0), 1.0)
            
        except Exception as e:
            logger.error(f"Error calculating confidence: {e}")
            return 0.0  # Return minimum confidence on error

    def _create_analysis_prompt(self, address: str, market_data: Dict[str, Any]) -> str:
        """Create prompt for AI analysis."""
        return f"""
        Analyze the following coin:
        Address: {address}
        Market Cap: ${market_data['market_cap']:,.2f}
        Liquidity: ${market_data['liquidity']:,.2f}
        Holders: {market_data['holders']:,}
        Price: ${market_data['price']:,.8f}
        24h Volume: ${market_data['volume_24h']:,.2f}
        
        Please provide a detailed analysis including:
        1. Market sentiment
        2. Technical indicators
        3. Risk factors
        4. Growth potential
        5. Overall assessment
        """

    def _parse_ai_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Parse AI response into structured analysis."""
        try:
            content = response['choices'][0]['message']['content']
            # Implement parsing logic here
            return {
                'sentiment': 0.0,
                'technical_score': 0.0,
                'risk_factors': [],
                'growth_potential': 0.0,
                'overall_assessment': content
            }
        except Exception as e:
            logger.error(f"Error parsing AI response: {e}")
            return {}

    def _calculate_market_risk(self, market_data: Dict[str, Any]) -> float:
        """Calculate market-based risk score."""
        try:
            risk_factors = []
            
            # Liquidity risk
            if market_data['liquidity'] < self.config.bot.min_liquidity:
                risk_factors.append(1.0)
            else:
                risk_factors.append(0.5)
            
            # Holder concentration risk
            if market_data['holders'] < self.config.sniping.min_holders:
                risk_factors.append(1.0)
            else:
                risk_factors.append(0.3)
            
            # Market cap risk
            if market_data['market_cap'] < self.config.sniping.min_market_cap:
                risk_factors.append(1.0)
            else:
                risk_factors.append(0.4)
            
            return sum(risk_factors) / len(risk_factors)
            
        except Exception as e:
            logger.error(f"Error calculating market risk: {e}")
            return 1.0

    def _calculate_ai_risk(self, ai_analysis: Dict[str, Any]) -> float:
        """Calculate AI-based risk score."""
        try:
            risk_factors = []
            
            # Sentiment risk
            sentiment_risk = 1.0 - ai_analysis.get('sentiment', 0.5)
            risk_factors.append(sentiment_risk)
            
            # Technical risk
            technical_risk = 1.0 - ai_analysis.get('technical_score', 0.5)
            risk_factors.append(technical_risk)
            
            # Risk factors count
            risk_factors_count = len(ai_analysis.get('risk_factors', []))
            risk_factors.append(min(risk_factors_count / 5, 1.0))
            
            return sum(risk_factors) / len(risk_factors)
            
        except Exception as e:
            logger.error(f"Error calculating AI risk: {e}")
            return 1.0

    def _calculate_market_confidence(self, market_data: Dict[str, Any]) -> float:
        """Calculate market-based confidence score with focus on quick profit opportunities."""
        try:
            confidence_factors = []
            
            # Liquidity confidence - prioritize higher liquidity for faster execution
            if market_data['liquidity'] >= self.config.bot.min_liquidity * 3:
                confidence_factors.append(1.0)
            elif market_data['liquidity'] >= self.config.bot.min_liquidity * 2:
                confidence_factors.append(0.8)
            elif market_data['liquidity'] >= self.config.bot.min_liquidity:
                confidence_factors.append(0.6)
            else:
                confidence_factors.append(0.3)
            
            # Volume confidence - prioritize high volume for quick profits
            volume_ratio = market_data['volume_24h'] / market_data['market_cap']
            if volume_ratio > 0.2:  # High volume relative to market cap
                confidence_factors.append(1.0)
            elif volume_ratio > 0.1:
                confidence_factors.append(0.8)
            elif volume_ratio > 0.05:
                confidence_factors.append(0.6)
            else:
                confidence_factors.append(0.3)
            
            # Price momentum - prioritize upward momentum
            if 'price_change_1h' in market_data:
                price_change = market_data['price_change_1h']
                if price_change > 5.0:  # Strong upward momentum
                    confidence_factors.append(1.0)
                elif price_change > 2.0:
                    confidence_factors.append(0.8)
                elif price_change > 0.0:
                    confidence_factors.append(0.6)
                else:
                    confidence_factors.append(0.3)
            
            # Holder distribution - prioritize concentrated holdings for faster price movement
            if market_data['holders'] >= self.config.sniping.min_holders * 2:
                holder_score = 0.7  # Good holder base
            elif market_data['holders'] >= self.config.sniping.min_holders:
                holder_score = 0.5
            else:
                holder_score = 0.3
            
            # Adjust holder score based on concentration
            if 'top_holders_percentage' in market_data:
                concentration = market_data['top_holders_percentage']
                if concentration > 80:  # Highly concentrated
                    holder_score *= 1.2  # Boost score for potential quick moves
                elif concentration > 60:
                    holder_score *= 1.1
                elif concentration < 20:  # Very distributed
                    holder_score *= 0.8  # Reduce score for slower price movement
            
            confidence_factors.append(holder_score)
            
            # Calculate weighted average with emphasis on volume and momentum
            weights = [0.2, 0.3, 0.3, 0.2]  # Volume and momentum have higher weights
            weighted_sum = sum(score * weight for score, weight in zip(confidence_factors, weights))
            return min(weighted_sum, 1.0)  # Cap at 1.0
            
        except Exception as e:
            logger.error(f"Error calculating market confidence: {e}")
            return 0.0

    def _calculate_ai_confidence(self, ai_analysis: Dict[str, Any]) -> float:
        """Calculate AI-based confidence score."""
        try:
            confidence_factors = []
            
            # Sentiment confidence
            sentiment_confidence = ai_analysis.get('sentiment', 0.5)
            confidence_factors.append(sentiment_confidence)
            
            # Technical confidence
            technical_confidence = ai_analysis.get('technical_score', 0.5)
            confidence_factors.append(technical_confidence)
            
            # Growth potential confidence
            growth_confidence = ai_analysis.get('growth_potential', 0.5)
            confidence_factors.append(growth_confidence)
            
            return sum(confidence_factors) / len(confidence_factors)
            
        except Exception as e:
            logger.error(f"Error calculating AI confidence: {e}")
            return 0.0

# Global coin analyzer instance
coin_analyzer = CoinAnalyzer() 