import logging
import base64
import hmac
import hashlib
from typing import Dict, Any, Optional
from datetime import datetime
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from .config_manager import ConfigManager
from .error_handling import ConfigurationError

logger = logging.getLogger('security')

class KeyManager:
    """Manages encryption and decryption of sensitive data."""
    
    def __init__(self):
        self.config = ConfigManager()
        self.fernet: Optional[Fernet] = None
        self._initialized = False

    def initialize(self):
        """Initialize the key manager with encryption key."""
        if self._initialized:
            return

        try:
            # Generate a key from the master secret
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b"antbot_salt",
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(self.config.security.master_secret.encode()))
            self.fernet = Fernet(key)
            self._initialized = True
            logger.info("Key manager initialized")
        except Exception as e:
            raise ConfigurationError(
                message="Failed to initialize key manager",
                operation="initialize",
                details={'error': str(e)}
            )

    def encrypt(self, data: str) -> str:
        """
        Encrypt sensitive data.
        
        Args:
            data: Data to encrypt
            
        Returns:
            str: Encrypted data
        """
        if not self._initialized:
            self.initialize()
        
        if not self.fernet:
            raise ConfigurationError(
                message="Key manager not initialized",
                operation="encrypt"
            )

        try:
            return self.fernet.encrypt(data.encode()).decode()
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise

    def decrypt(self, encrypted_data: str) -> str:
        """
        Decrypt sensitive data.
        
        Args:
            encrypted_data: Encrypted data to decrypt
            
        Returns:
            str: Decrypted data
        """
        if not self._initialized:
            self.initialize()
        
        if not self.fernet:
            raise ConfigurationError(
                message="Key manager not initialized",
                operation="decrypt"
            )

        try:
            return self.fernet.decrypt(encrypted_data.encode()).decode()
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise

class SecurityManager:
    """Manages API request signing and verification."""
    
    def __init__(self):
        self.config = ConfigManager()
        self.key_manager = KeyManager()

    def sign_request(self, request: Dict[str, Any]) -> str:
        """
        Sign an API request.
        
        Args:
            request: Request data to sign
            
        Returns:
            str: Request signature
        """
        try:
            # Sort request parameters
            sorted_params = dict(sorted(request.items()))
            
            # Create signature string
            signature_string = "&".join(
                f"{k}={v}" for k, v in sorted_params.items()
            )
            
            # Generate HMAC signature
            signature = hmac.new(
                self.config.security.api_secret.encode(),
                signature_string.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return signature
        except Exception as e:
            logger.error(f"Request signing failed: {e}")
            raise

    def verify_signature(self, request: Dict[str, Any], signature: str) -> bool:
        """
        Verify an API request signature.
        
        Args:
            request: Request data
            signature: Signature to verify
            
        Returns:
            bool: True if signature is valid, False otherwise
        """
        try:
            expected_signature = self.sign_request(request)
            return hmac.compare_digest(signature, expected_signature)
        except Exception as e:
            logger.error(f"Signature verification failed: {e}")
            return False

    def generate_nonce(self) -> str:
        """
        Generate a unique nonce for request signing.
        
        Returns:
            str: Generated nonce
        """
        return str(int(datetime.now().timestamp() * 1000))

    def validate_request_timestamp(self, timestamp: int, max_age: int = 300) -> bool:
        """
        Validate a request timestamp.
        
        Args:
            timestamp: Request timestamp
            max_age: Maximum age in seconds
            
        Returns:
            bool: True if timestamp is valid, False otherwise
        """
        try:
            request_time = datetime.fromtimestamp(timestamp / 1000)
            age = (datetime.now() - request_time).total_seconds()
            return age <= max_age
        except Exception as e:
            logger.error(f"Timestamp validation failed: {e}")
            return False

    def secure_hash(self, data: str) -> str:
        """
        Generate a secure hash of data.
        
        Args:
            data: Data to hash
            
        Returns:
            str: Generated hash
        """
        try:
            return hashlib.sha256(data.encode()).hexdigest()
        except Exception as e:
            logger.error(f"Secure hashing failed: {e}")
            raise

# Global security instances
key_manager = KeyManager()
security_manager = SecurityManager() 