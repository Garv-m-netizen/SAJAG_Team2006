import logging
import re
from typing import Any, Dict, Optional

import httpx

from app.config import settings

logger = logging.getLogger("civicpulse.taskvox")


class TaskVoxCaller:
    """Places an outbound AI voice call to a field worker through a TaskVox campaign."""

    def is_configured(self) -> bool:
        return bool(settings.TASKVOX_API_KEY and settings.TASKVOX_AGENT_ID)

    def should_call(self, worker_name: str) -> bool:
        """Calls only workers listed in TASKVOX_CALL_WORKERS ('*' means every worker)."""
        allowed = [n.strip().lower() for n in settings.TASKVOX_CALL_WORKERS.split(",") if n.strip()]
        return "*" in allowed or worker_name.strip().lower() in allowed

    @staticmethod
    def normalize_phone(phone: Optional[str]) -> Optional[str]:
        """TaskVox takes a 10-digit Indian number; strips +91 / 0 prefixes and separators."""
        digits = re.sub(r"\D", "", phone or "")
        if len(digits) > 10 and digits.startswith("91"):
            digits = digits[2:]
        digits = digits.lstrip("0") if len(digits) == 11 else digits
        return digits if len(digits) == 10 else None

    def call_worker(self, phone: Optional[str], variables: Dict[str, Any], incident_number: str) -> bool:
        """Best-effort: returns True if TaskVox accepted and started the call. Never raises."""
        if not self.is_configured():
            logger.info("TaskVox not configured; skipping call for #%s", incident_number)
            return False
        number = self.normalize_phone(phone)
        if not number:
            logger.warning("TaskVox call skipped for #%s: worker phone %r is not a valid 10-digit number", incident_number, phone)
            return False
        try:
            resp = httpx.post(
                f"{settings.TASKVOX_BASE_URL.rstrip('/')}/api/campaigns",
                headers={
                    "X-API-Key": settings.TASKVOX_API_KEY,
                    # A retry of the same assignment must not ring the worker twice.
                    "Idempotency-Key": f"civicpulse-assign-{incident_number}-{number}",
                },
                json={
                    "name": f"Assignment #{incident_number}",
                    "agentId": settings.TASKVOX_AGENT_ID,
                    "numbers": [{"number": number, "variables": {k: str(v) for k, v in variables.items()}}],
                    "autoStart": True,
                },
                timeout=settings.TASKVOX_TIMEOUT_SECONDS,
            )
            resp.raise_for_status()
            body = resp.json()
            if body.get("started") is False:
                logger.error("TaskVox campaign created but not started for #%s: %s", incident_number, body.get("startError"))
                return False
            logger.info("TaskVox call placed for #%s (campaign %s)", incident_number, body.get("id"))
            return True
        except Exception as exc:
            logger.error("TaskVox call failed for #%s: %s", incident_number, exc)
            return False


taskvox_caller = TaskVoxCaller()
