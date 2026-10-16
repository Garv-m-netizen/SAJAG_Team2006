from app.services.nlp_extractor import nlp_extractor
from app.services.priority_calculator import priority_calculator
from app.models import IncidentCategory

def test_nlp_extraction_hindi():
    text = "सेक्टर 22 में नाला पूरी तरह से जाम है और गंदा पानी सड़क पर बह रहा है।"
    res = nlp_extractor.extract(text)
    assert res["detected_language"] == "hi"
    assert res["inferred_category"] == IncidentCategory.DRAINAGE.value
    assert "Sector 22" in res["location_clues"]
    assert res["confidence_score"] >= 0.70

def test_nlp_extraction_punjabi():
    text = "ਸੈਕਟਰ 35 ਵਿੱਚ ਵੱਡਾ ਟੋਆ ਪੈ ਗਿਆ ਹੈ, ਐਕਸੀਡੈਂਟ ਦਾ ਖ਼ਤਰਾ ਹੈ।"
    res = nlp_extractor.extract(text)
    assert res["detected_language"] == "pa"
    assert res["inferred_category"] == IncidentCategory.POTHOLES.value
    assert res["urgency"] in ["critical", "high"]
    assert "Sector 35" in res["location_clues"]

def test_nlp_extraction_english():
    text = "Garbage dump near Sector 17 fountain is overflowing and smelling terrible."
    res = nlp_extractor.extract(text)
    assert res["detected_language"] == "en"
    assert res["inferred_category"] == IncidentCategory.GARBAGE.value
    assert "Sector 17" in res["location_clues"]

def test_priority_calculator_first_time_emergency():
    # Emergency floor test: First-time (rec=1) critical incident must receive score >= 80
    res = priority_calculator.calculate(
        urgency="critical",
        impact="high",
        recurrence_count=1,
        unresolved_hours=1.0,
        evidence_confidence=0.90
    )
    assert res["score"] >= 80.0
    assert "CRITICAL" in res["explanation"]

def test_priority_calculator_recurrence_boost():
    # Comparing score with 1 recurrence vs 4 recurrences
    res_single = priority_calculator.calculate(urgency="medium", impact="medium", recurrence_count=1)
    res_repeat = priority_calculator.calculate(urgency="medium", impact="medium", recurrence_count=4)
    assert res_repeat["score"] > res_single["score"]
    assert res_repeat["breakdown"]["recurrence_boost"] > 0
