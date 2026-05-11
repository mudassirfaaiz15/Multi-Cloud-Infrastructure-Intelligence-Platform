"""
Production-grade Multi-LLM Provider Abstraction
Supports Claude, OpenAI, and extensible for other providers
Implements provider failover, token tracking, and response caching
"""

import os
import logging
import json
from typing import Optional, List, Dict, Any, Tuple
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


# ============================================================================
# ENUMS & DATA CLASSES
# ============================================================================

class LLMProvider(str, Enum):
    """Supported LLM providers"""
    CLAUDE = "claude"
    OPENAI = "openai"
    AZURE_OPENAI = "azure_openai"


class ModelSize(str, Enum):
    """Model size categories"""
    SMALL = "small"      # Fast, cheap (Haiku, GPT-3.5)
    MEDIUM = "medium"    # Balanced (Sonnet, GPT-4)
    LARGE = "large"      # Powerful, expensive (Opus, GPT-4 Turbo)


@dataclass
class LLMResponse:
    """Standardized LLM response"""
    content: str
    provider: str
    model: str
    tokens_used: int
    cost_usd: float
    latency_ms: float
    cached: bool = False


@dataclass
class TokenUsage:
    """Token usage tracking"""
    input_tokens: int
    output_tokens: int
    total_tokens: int
    cost_usd: float


# ============================================================================
# PROVIDER INTERFACE
# ============================================================================

class LLMProviderBase(ABC):
    """Abstract base class for LLM providers"""

    def __init__(self, api_key: str, cache_ttl_seconds: int = 3600):
        """
        Initialize provider

        Args:
            api_key: API key for the provider
            cache_ttl_seconds: Cache TTL for responses
        """
        self.api_key = api_key
        self.cache_ttl = cache_ttl_seconds
        self._cache: Dict[str, Tuple[str, datetime]] = {}

    @abstractmethod
    def get_available_models(self) -> List[Dict[str, Any]]:
        """Get list of available models"""
        pass

    @abstractmethod
    def complete(
        self,
        prompt: str,
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        system_prompt: Optional[str] = None,
    ) -> LLMResponse:
        """
        Generate completion

        Args:
            prompt: User prompt
            model: Model to use
            temperature: Sampling temperature
            max_tokens: Maximum tokens in response
            system_prompt: System prompt for context

        Returns:
            LLMResponse with generated content
        """
        pass

    @abstractmethod
    def stream_complete(
        self,
        prompt: str,
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        system_prompt: Optional[str] = None,
    ):
        """
        Stream completion (generator)

        Args:
            prompt: User prompt
            model: Model to use
            temperature: Sampling temperature
            max_tokens: Maximum tokens in response
            system_prompt: System prompt for context

        Yields:
            Chunks of response text
        """
        pass

    def _get_cached(self, key: str) -> Optional[str]:
        """Get cached response if not expired"""
        if key in self._cache:
            value, timestamp = self._cache[key]
            if datetime.utcnow() - timestamp < timedelta(seconds=self.cache_ttl):
                logger.debug(f"Cache hit for {key}")
                return value
            else:
                del self._cache[key]
        return None

    def _set_cached(self, key: str, value: str) -> None:
        """Cache response"""
        self._cache[key] = (value, datetime.utcnow())

    def _make_cache_key(self, prompt: str, model: str, temperature: float) -> str:
        """Generate cache key"""
        return f"{model}:{temperature}:{hash(prompt)}"


# ============================================================================
# CLAUDE PROVIDER
# ============================================================================

class ClaudeProvider(LLMProviderBase):
    """Anthropic Claude provider implementation"""

    MODELS = {
        "claude-3-5-sonnet-20241022": {
            "name": "Claude 3.5 Sonnet",
            "size": ModelSize.MEDIUM,
            "input_cost_per_1k": 0.003,
            "output_cost_per_1k": 0.015,
            "max_tokens": 200000,
        },
        "claude-3-5-haiku-20241022": {
            "name": "Claude 3.5 Haiku",
            "size": ModelSize.SMALL,
            "input_cost_per_1k": 0.00080,
            "output_cost_per_1k": 0.0024,
            "max_tokens": 200000,
        },
        "claude-3-opus-20250219": {
            "name": "Claude 3 Opus",
            "size": ModelSize.LARGE,
            "input_cost_per_1k": 0.015,
            "output_cost_per_1k": 0.075,
            "max_tokens": 200000,
        },
    }

    def __init__(self, api_key: Optional[str] = None, cache_ttl_seconds: int = 3600):
        """Initialize Claude provider"""
        api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not provided")
        super().__init__(api_key, cache_ttl_seconds)
        self.provider_name = LLMProvider.CLAUDE

    def get_available_models(self) -> List[Dict[str, Any]]:
        """Get available Claude models"""
        return [
            {
                "id": model_id,
                "name": config["name"],
                "size": config["size"].value,
                "max_tokens": config["max_tokens"],
            }
            for model_id, config in self.MODELS.items()
        ]

    def complete(
        self,
        prompt: str,
        model: str = "claude-3-5-sonnet-20241022",
        temperature: float = 0.7,
        max_tokens: int = 2000,
        system_prompt: Optional[str] = None,
    ) -> LLMResponse:
        """Generate completion using Claude"""
        try:
            import anthropic
        except ImportError:
            raise ImportError("anthropic package not installed. Install with: pip install anthropic")

        # Check cache
        cache_key = self._make_cache_key(prompt, model, temperature)
        cached = self._get_cached(cache_key)
        if cached:
            return LLMResponse(
                content=cached,
                provider=self.provider_name.value,
                model=model,
                tokens_used=0,
                cost_usd=0.0,
                latency_ms=0,
                cached=True,
            )

        try:
            client = anthropic.Anthropic(api_key=self.api_key)
            start_time = datetime.utcnow()

            messages = [{"role": "user", "content": prompt}]
            kwargs = {
                "model": model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": messages,
            }

            if system_prompt:
                kwargs["system"] = system_prompt

            response = client.messages.create(**kwargs)

            latency_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
            content = response.content[0].text

            # Calculate cost
            model_config = self.MODELS.get(model, {})
            input_cost = (response.usage.input_tokens / 1000) * model_config.get("input_cost_per_1k", 0)
            output_cost = (response.usage.output_tokens / 1000) * model_config.get("output_cost_per_1k", 0)
            total_cost = input_cost + output_cost

            # Cache response
            self._set_cached(cache_key, content)

            logger.info(
                f"Claude completion: model={model}, tokens={response.usage.total_tokens}, "
                f"cost=${total_cost:.4f}, latency={latency_ms:.0f}ms"
            )

            return LLMResponse(
                content=content,
                provider=self.provider_name.value,
                model=model,
                tokens_used=response.usage.total_tokens,
                cost_usd=total_cost,
                latency_ms=latency_ms,
            )

        except Exception as e:
            logger.error(f"Claude API error: {str(e)}")
            raise

    def stream_complete(
        self,
        prompt: str,
        model: str = "claude-3-5-sonnet-20241022",
        temperature: float = 0.7,
        max_tokens: int = 2000,
        system_prompt: Optional[str] = None,
    ):
        """Stream completion using Claude"""
        try:
            import anthropic
        except ImportError:
            raise ImportError("anthropic package not installed")

        try:
            client = anthropic.Anthropic(api_key=self.api_key)

            messages = [{"role": "user", "content": prompt}]
            kwargs = {
                "model": model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": messages,
            }

            if system_prompt:
                kwargs["system"] = system_prompt

            with client.messages.stream(**kwargs) as stream:
                for text in stream.text_stream:
                    yield text

        except Exception as e:
            logger.error(f"Claude streaming error: {str(e)}")
            raise


# ============================================================================
# OPENAI PROVIDER
# ============================================================================

class OpenAIProvider(LLMProviderBase):
    """OpenAI provider implementation"""

    MODELS = {
        "gpt-4-turbo": {
            "name": "GPT-4 Turbo",
            "size": ModelSize.LARGE,
            "input_cost_per_1k": 0.01,
            "output_cost_per_1k": 0.03,
            "max_tokens": 128000,
        },
        "gpt-4": {
            "name": "GPT-4",
            "size": ModelSize.LARGE,
            "input_cost_per_1k": 0.03,
            "output_cost_per_1k": 0.06,
            "max_tokens": 8192,
        },
        "gpt-3.5-turbo": {
            "name": "GPT-3.5 Turbo",
            "size": ModelSize.SMALL,
            "input_cost_per_1k": 0.0005,
            "output_cost_per_1k": 0.0015,
            "max_tokens": 4096,
        },
    }

    def __init__(self, api_key: Optional[str] = None, cache_ttl_seconds: int = 3600):
        """Initialize OpenAI provider"""
        api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not provided")
        super().__init__(api_key, cache_ttl_seconds)
        self.provider_name = LLMProvider.OPENAI

    def get_available_models(self) -> List[Dict[str, Any]]:
        """Get available OpenAI models"""
        return [
            {
                "id": model_id,
                "name": config["name"],
                "size": config["size"].value,
                "max_tokens": config["max_tokens"],
            }
            for model_id, config in self.MODELS.items()
        ]

    def complete(
        self,
        prompt: str,
        model: str = "gpt-4-turbo",
        temperature: float = 0.7,
        max_tokens: int = 2000,
        system_prompt: Optional[str] = None,
    ) -> LLMResponse:
        """Generate completion using OpenAI"""
        try:
            from openai import OpenAI
        except ImportError:
            raise ImportError("openai package not installed. Install with: pip install openai")

        # Check cache
        cache_key = self._make_cache_key(prompt, model, temperature)
        cached = self._get_cached(cache_key)
        if cached:
            return LLMResponse(
                content=cached,
                provider=self.provider_name.value,
                model=model,
                tokens_used=0,
                cost_usd=0.0,
                latency_ms=0,
                cached=True,
            )

        try:
            client = OpenAI(api_key=self.api_key)
            start_time = datetime.utcnow()

            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )

            latency_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
            content = response.choices[0].message.content

            # Calculate cost
            model_config = self.MODELS.get(model, {})
            input_cost = (response.usage.prompt_tokens / 1000) * model_config.get("input_cost_per_1k", 0)
            output_cost = (response.usage.completion_tokens / 1000) * model_config.get("output_cost_per_1k", 0)
            total_cost = input_cost + output_cost

            # Cache response
            self._set_cached(cache_key, content)

            logger.info(
                f"OpenAI completion: model={model}, tokens={response.usage.total_tokens}, "
                f"cost=${total_cost:.4f}, latency={latency_ms:.0f}ms"
            )

            return LLMResponse(
                content=content,
                provider=self.provider_name.value,
                model=model,
                tokens_used=response.usage.total_tokens,
                cost_usd=total_cost,
                latency_ms=latency_ms,
            )

        except Exception as e:
            logger.error(f"OpenAI API error: {str(e)}")
            raise

    def stream_complete(
        self,
        prompt: str,
        model: str = "gpt-4-turbo",
        temperature: float = 0.7,
        max_tokens: int = 2000,
        system_prompt: Optional[str] = None,
    ):
        """Stream completion using OpenAI"""
        try:
            from openai import OpenAI
        except ImportError:
            raise ImportError("openai package not installed")

        try:
            client = OpenAI(api_key=self.api_key)

            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            stream = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )

            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error(f"OpenAI streaming error: {str(e)}")
            raise


# ============================================================================
# LLM ROUTER (PROVIDER MANAGER)
# ============================================================================

class LLMRouter:
    """
    Intelligent LLM provider router with:
    - Provider failover
    - Cost optimization
    - Model selection
    - Token tracking
    """

    def __init__(self):
        """Initialize router with available providers"""
        self.providers: Dict[LLMProvider, LLMProviderBase] = {}
        self._initialize_providers()

    def _initialize_providers(self) -> None:
        """Initialize available providers from environment"""
        # Initialize Claude
        claude_key = os.getenv("ANTHROPIC_API_KEY")
        if claude_key:
            try:
                self.providers[LLMProvider.CLAUDE] = ClaudeProvider(claude_key)
                logger.info("Claude provider initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize Claude provider: {str(e)}")

        # Initialize OpenAI
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            try:
                self.providers[LLMProvider.OPENAI] = OpenAIProvider(openai_key)
                logger.info("OpenAI provider initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize OpenAI provider: {str(e)}")

        if not self.providers:
            logger.warning("No LLM providers configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY")

    def get_available_providers(self) -> List[str]:
        """Get list of available providers"""
        return [p.value for p in self.providers.keys()]

    def get_available_models(self, provider: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get available models for provider(s)"""
        if provider:
            try:
                prov = LLMProvider(provider)
                if prov in self.providers:
                    return self.providers[prov].get_available_models()
            except ValueError:
                logger.warning(f"Unknown provider: {provider}")
            return []

        # Return all models from all providers
        all_models = []
        for prov in self.providers.values():
            all_models.extend(prov.get_available_models())
        return all_models

    def complete(
        self,
        prompt: str,
        provider: str = "claude",
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        system_prompt: Optional[str] = None,
        fallback_providers: Optional[List[str]] = None,
    ) -> LLMResponse:
        """
        Generate completion with provider failover

        Args:
            prompt: User prompt
            provider: Preferred provider
            model: Model to use (uses default if not specified)
            temperature: Sampling temperature
            max_tokens: Maximum tokens
            system_prompt: System prompt
            fallback_providers: List of fallback providers

        Returns:
            LLMResponse
        """
        providers_to_try = [provider]
        if fallback_providers:
            providers_to_try.extend(fallback_providers)

        last_error = None
        for prov_name in providers_to_try:
            try:
                prov = LLMProvider(prov_name)
                if prov not in self.providers:
                    logger.warning(f"Provider {prov_name} not available")
                    continue

                provider_instance = self.providers[prov]

                # Use default model if not specified
                if not model:
                    models = provider_instance.get_available_models()
                    if models:
                        model = models[0]["id"]

                logger.info(f"Using {prov_name} with model {model}")
                return provider_instance.complete(
                    prompt=prompt,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    system_prompt=system_prompt,
                )

            except Exception as e:
                logger.warning(f"Provider {prov_name} failed: {str(e)}")
                last_error = e
                continue

        # All providers failed
        error_msg = f"All LLM providers failed. Last error: {str(last_error)}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)

    def stream_complete(
        self,
        prompt: str,
        provider: str = "claude",
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        system_prompt: Optional[str] = None,
        fallback_providers: Optional[List[str]] = None,
    ):
        """Stream completion with provider failover"""
        providers_to_try = [provider]
        if fallback_providers:
            providers_to_try.extend(fallback_providers)

        last_error = None
        for prov_name in providers_to_try:
            try:
                prov = LLMProvider(prov_name)
                if prov not in self.providers:
                    logger.warning(f"Provider {prov_name} not available")
                    continue

                provider_instance = self.providers[prov]

                # Use default model if not specified
                if not model:
                    models = provider_instance.get_available_models()
                    if models:
                        model = models[0]["id"]

                logger.info(f"Streaming with {prov_name} using model {model}")
                yield from provider_instance.stream_complete(
                    prompt=prompt,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    system_prompt=system_prompt,
                )
                return

            except Exception as e:
                logger.warning(f"Provider {prov_name} failed: {str(e)}")
                last_error = e
                continue

        # All providers failed
        error_msg = f"All LLM providers failed. Last error: {str(last_error)}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)


# ============================================================================
# SINGLETON INSTANCE
# ============================================================================

_router_instance: Optional[LLMRouter] = None


def get_llm_router() -> LLMRouter:
    """Get or create LLM router singleton"""
    global _router_instance
    if _router_instance is None:
        _router_instance = LLMRouter()
    return _router_instance
