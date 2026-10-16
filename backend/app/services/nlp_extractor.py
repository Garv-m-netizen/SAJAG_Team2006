import re
from typing import Dict, Any, List, Tuple
from app.models import IncidentCategory

class DeterministicCivicNLPExtractor:
    """
    Deterministic multilingual civic text extractor for Hindi, Punjabi, and English.
    Extracts category, urgency, safety concerns, location clues, and missing information.
    Designed with a clean interface for swapping with a real multimodal/LLM model in future.
    """

    KEYWORD_MAPPINGS: Dict[IncidentCategory, List[str]] = {
        IncidentCategory.GARBAGE: [
            # English
            "garbage", "trash", "waste", "dump", "filth", "rubbish", "litter", "dustbin", "overflowing", "debris",
            # Hindi
            "कचरा", "कूड़ा", "गंदगी", "कचरे", "सफाई", "डस्टबिन", "कूड़ेदान", "बदबू", "मलबा",
            # Punjabi
            "ਕੂੜਾ", "ਗੰਦਗੀ", "ਕਚਰਾ", "ਸਫ਼ਾਈ", "ਡਸਟਬਿਨ", "ਬਦਬੂ", "ਢੇਰ"
        ],
        IncidentCategory.DRAINAGE: [
            # English
            "drain", "drainage", "waterlogging", "sewage", "gutter", "clogged", "overflow", "flooding", "manhole", "water standing",
            # Hindi
            "नाली", "नाला", "सीवर", "जलभराव", "गंदा पानी", "जाम", "गटर", "बाढ़", "पानी भरा", "मैनहोल",
            # Punjabi
            "ਨਾਲੀ", "ਨਾਲਾ", "ਸੀਵਰੇਜ", "ਜਲ ਭਰਾਓ", "ਗਟਰ", "ਪਾਣੀ ਖੜ੍ਹਾ", "ਬੰਦ"
        ],
        IncidentCategory.POTHOLES: [
            # English
            "pothole", "potholes", "crater", "damaged road", "road crack", "broken road", "asphalt", "bump", "cave in",
            # Hindi
            "गड्ढा", "गड्ढे", "सड़क टूटी", "खराब सड़क", "टूट", "तारकोल", "सड़क",
            # Punjabi
            "ਟੋਆ", "ਟੋਏ", "ਖਰਾਬ ਸੜਕ", "ਟੁੱਟੀ ਸੜਕ", "ਸੜਕ"
        ],
        IncidentCategory.STREETLIGHTS: [
            # English
            "streetlight", "street light", "darkness", "pole", "lamp", "light broken", "not working", "blackout", "blinking light",
            # Hindi
            "स्ट्रीट लाइट", "बत्ती", "अंधेरा", "खंभा", "लाइट खराब", "रोशनी नहीं", "पोल",
            # Punjabi
            "ਸਟਰੀਟ ਲਾਈਟ", "ਬੱਤੀ", "ਹਨੇਰਾ", "ਖੰਭਾ", "ਲਾਈਟ ਖਰਾਬ", "ਲਾਈਟਾਂ"
        ],
        IncidentCategory.WATER_SUPPLY: [
            # English
            "water supply", "pipe burst", "drinking water", "no water", "contaminated water", "dirty water", "low pressure", "leakage",
            # Hindi
            "पानी की सप्लाई", "पाइप फटा", "पीने का पानी", "पानी नहीं आ रहा", "गंदा पानी", "कम दबाव", "लीकेज",
            # Punjabi
            "ਪਾਣੀ ਦੀ ਸਪਲਾਈ", "ਪਾਈਪ ਲੀਕ", "ਪੀਣ ਵਾਲਾ ਪਾਣੀ", "ਪਾਣੀ ਨਹੀਂ ਆ ਰਿਹਾ", "ਗੰਦਾ ਪਾਣੀ", "ਲੀਕੇਜ"
        ],
        IncidentCategory.INFRASTRUCTURE: [
            # English
            "footpath", "sidewalk", "divider", "railing", "bus stop", "bench", "wall collapsed", "bridge", "underpass",
            # Hindi
            "फुटपाथ", "रेलिंग", "डिवाइडर", "बस स्टॉप", "दीवार गिरी", "पुल", "अंडरपास",
            # Punjabi
            "ਫੁੱਟਪਾਥ", "ਰੇਲਿੰਗ", "ਡਿਵਾਈਡਰ", "ਬੱਸ ਸਟਾਪ", "ਪੁਲ", "ਅੰਡਰਪਾਸ"
        ],
        IncidentCategory.TRAFFIC_SAFETY: [
            # English
            "traffic signal", "blind spot", "zebra crossing", "accident prone", "speed breaker", "sign board missing", "open wire",
            # Hindi
            "ट्रैफिक सिग्नल", "रेड लाइट", "दुर्घटना", "स्पीड ब्रेकर", "जेब्रा क्रॉसिंग", "खुला तार",
            # Punjabi
            "ਟਰੈਫਿਕ ਲਾਈਟ", "ਹਾਦਸਾ", "ਸਪੀਡ ਬ੍ਰੇਕਰ", "ਖੁੱਲ੍ਹੀ ਤਾਰ"
        ]
    }

    URGENCY_KEYWORDS = {
        "critical": [
            "danger", "emergency", "fatal", "accident", "electrocution", "sparking", "sinkhole", "deep ditch", "collapsed", "fire",
            "खतरा", "आपातकालीन", "दुर्घटना", "करंट", "बिजली का तार", "गंभीर",
            "ਖ਼ਤਰਾ", "ਐਮਰਜੈਂਸੀ", "ਹਾਦਸਾ", "ਕਰੰਟ", "ਬਿਜਲੀ ਦੀ ਤਾਰ"
        ],
        "high": [
            "overflowing", "blocked", "completely", "school", "hospital", "heavy water", "stagnant", "children", "elderly",
            "जाम", "अस्पताल", "स्कूल", "गंभीर", "मच्छर", "बीमारी",
            "ਬੰਦ", "ਹਸਪਤਾਲ", "ਸਕੂਲ", "ਬਿਮਾਰੀ"
        ],
        "medium": [
            "foul smell", "inconvenience", "delay", "several days",
            "बदबू", "परेशानी", "कई दिनों से",
            "ਬਦਬੂ", "ਕਈ ਦਿਨਾਂ ਤੋਂ"
        ]
    }

    SECTOR_PATTERNS = [
        r"sector\s*([0-9]{1,2}[a-d]?)",
        r"सेक्टर\s*([0-9]{1,2}[a-d]?)",
        r"ਸੈਕਟਰ\s*([0-9]{1,2}[a-d]?)"
    ]

    def detect_language(self, text: str) -> str:
        # Gurmukhi Unicode Range: \u0A00-\u0A7F
        if re.search(r"[\u0A00-\u0A7F]", text):
            return "pa"
        # Devanagari Unicode Range: \u0900-\u097F
        if re.search(r"[\u0900-\u097F]", text):
            return "hi"
        return "en"

    def extract(self, text: str, user_category: IncidentCategory = None) -> Dict[str, Any]:
        cleaned = text.lower()
        detected_lang = self.detect_language(text)

        # 1. Infer category if not supplied or refine it
        category_scores: Dict[IncidentCategory, int] = {cat: 0 for cat in IncidentCategory}
        matched_keywords = []

        for cat, keywords in self.KEYWORD_MAPPINGS.items():
            for kw in keywords:
                if kw in cleaned:
                    category_scores[cat] += 1
                    matched_keywords.append(kw)

        best_category = user_category or IncidentCategory.OTHER
        max_score = 0
        for cat, score in category_scores.items():
            if score > max_score:
                max_score = score
                best_category = cat

        # 2. Extract Urgency & Safety Concerns
        urgency = "low"
        safety_concerns = []
        for level in ["critical", "high", "medium"]:
            for kw in self.URGENCY_KEYWORDS[level]:
                if kw in cleaned:
                    urgency = level
                    safety_concerns.append(f"Identified safety term: '{kw}' ({level})")
                    break
            if urgency != "low":
                break

        # 3. Location clues (Sector / Landmark)
        location_clues = []
        for pat in self.SECTOR_PATTERNS:
            matches = re.findall(pat, cleaned)
            for m in matches:
                location_clues.append(f"Sector {m.upper()}")

        landmark_hints = ["market", "school", "hospital", "dispensary", "park", "roundabout", "chowk", "gurdwara", "temple", "bus stop"]
        for lm in landmark_hints:
            if lm in cleaned:
                location_clues.append(f"Near {lm.title()}")

        # 4. Missing information analysis
        missing_info = []
        if not location_clues:
            missing_info.append("Precise landmark or sector reference could be enhanced")
        if len(cleaned.split()) < 5:
            missing_info.append("Short description; additional contextual details recommended")

        # 5. Confidence score calculation
        confidence = 0.50
        if max_score > 0:
            confidence += min(0.35, max_score * 0.12)
        if location_clues:
            confidence += 0.10
        if len(cleaned) > 20:
            confidence += 0.05
        confidence = min(0.98, round(confidence, 2))

        return {
            "inferred_category": best_category.value if best_category else "other",
            "detected_language": detected_lang,
            "urgency": urgency,
            "safety_concerns": safety_concerns,
            "location_clues": location_clues,
            "missing_info": missing_info,
            "confidence_score": confidence,
            "matched_keywords": list(set(matched_keywords))[:10],
            "model_engine": "CivicPulse Deterministic Rule-Engine v1.0 (Integration ready for LLM/Whisper)",
            "is_simulated_ai": False
        }

nlp_extractor = DeterministicCivicNLPExtractor()
