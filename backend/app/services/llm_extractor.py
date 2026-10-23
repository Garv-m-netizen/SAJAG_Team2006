import json
import re
from typing import Any, Dict, Optional

import httpx

from app.config import settings
from app.models import IncidentCategory
from app.services.nlp_extractor import nlp_extractor

CATEGORIES = [c.value for c in IncidentCategory]

SYSTEM_PROMPT = (
    "You extract structured data from a civic complaint made by a citizen of Chandigarh, India. "
    "The text may be English, Hindi, Punjabi or a mix, and may be a rough speech transcript. "
    "Reply with ONLY a JSON object with these keys: "
    f'"category" (one of {CATEGORIES}), '
    '"sector" (e.g. "Sector 12", "Manimajra", "Industrial Area Phase 1", or null if not stated), '
    '"landmark" (short nearby landmark or street clue in English, or null), '
    '"urgency" (one of low, medium, high, critical), '
    '"language" (one of en, hi, pa). '
    "Never invent a sector or landmark that the text does not mention."
)


class LLMExtractor:
    """Tries Gemini, then Groq, then OpenRouter; falls back to the local keyword extractor."""

    def extract(self, text: str) -> Dict[str, Any]:
        providers = [
            ("gemini", settings.GEMINI_API_KEY, self._gemini),
            ("groq", settings.GROQ_API_KEY, self._groq),
            ("openrouter", settings.OPENROUTER_API_KEY, self._openrouter),
        ]
        for name, key, call in providers:
            if not key:
                continue
            try:
                raw = call(text, key)
                result = self._normalize(raw, text)
                result["provider"] = name
                return result
            except Exception:
                # Rate limit, quota, timeout or malformed output: move on to the next provider.
                continue
        return self._local(text)

    def _gemini(self, text: str, key: str) -> Dict[str, Any]:
        resp = httpx.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent",
            headers={"x-goog-api-key": key},
            json={
                "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                "contents": [{"role": "user", "parts": [{"text": text}]}],
                "generationConfig": {"temperature": 0, "responseMimeType": "application/json"},
            },
            timeout=settings.LLM_TIMEOUT_SECONDS,
        )
        resp.raise_for_status()
        return self._parse_json(resp.json()["candidates"][0]["content"]["parts"][0]["text"])

    def _chat_completion(self, url: str, key: str, model: str, text: str) -> Dict[str, Any]:
        resp = httpx.post(
            url,
            headers={"Authorization": f"Bearer {key}"},
            json={
                "model": model,
                "temperature": 0,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": text},
                ],
            },
            timeout=settings.LLM_TIMEOUT_SECONDS,
        )
        resp.raise_for_status()
        return self._parse_json(resp.json()["choices"][0]["message"]["content"])

    def _groq(self, text: str, key: str) -> Dict[str, Any]:
        return self._chat_completion(
            "https://api.groq.com/openai/v1/chat/completions", key, settings.GROQ_MODEL, text
        )

    def _openrouter(self, text: str, key: str) -> Dict[str, Any]:
        return self._chat_completion(
            "https://openrouter.ai/api/v1/chat/completions", key, settings.OPENROUTER_MODEL, text
        )

    @staticmethod
    def _parse_json(content: str) -> Dict[str, Any]:
        content = content.strip()
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?|```$", "", content, flags=re.MULTILINE).strip()
        data = json.loads(content)
        if not isinstance(data, dict):
            raise ValueError("LLM did not return a JSON object")
        return data

    @staticmethod
    def _clean_sector(value: Optional[str]) -> Optional[str]:
        if not value or not isinstance(value, str):
            return None
        value = value.strip()
        m = re.search(r"(?:sector|सेक्टर|ਸੈਕਟਰ)\s*-?\s*([0-9]{1,2})\s*([a-dA-D]?)", value, re.IGNORECASE)
        if m:
            return f"Sector {m.group(1)}{m.group(2).upper()}"
        return value or None

    def _normalize(self, raw: Dict[str, Any], text: str) -> Dict[str, Any]:
        category = raw.get("category")
        if category not in CATEGORIES:
            category = nlp_extractor.extract(text)["inferred_category"]
        urgency = raw.get("urgency") if raw.get("urgency") in ("low", "medium", "high", "critical") else "medium"
        language = raw.get("language") if raw.get("language") in ("en", "hi", "pa") else nlp_extractor.detect_language(text)
        landmark = raw.get("landmark")
        return {
            "category": category,
            "sector": self._clean_sector(raw.get("sector")),
            "landmark": landmark.strip() if isinstance(landmark, str) and landmark.strip() else None,
            "urgency": urgency,
            "language": language,
        }

    def _local(self, text: str) -> Dict[str, Any]:
        res = nlp_extractor.extract(text)
        sector = next((c for c in res["location_clues"] if c.lower().startswith("sector")), None)
        landmark = next((c for c in res["location_clues"] if c.startswith("Near ")), None)
        return {
            "category": res["inferred_category"],
            "sector": self._clean_sector(sector),
            "landmark": landmark,
            "urgency": res["urgency"],
            "language": res["detected_language"],
            "provider": "local",
        }


llm_extractor = LLMExtractor()
