from deep_translator import GoogleTranslator

def detect_language(text: str) -> str:
    devanagari_count = sum(1 for c in text if '\u0900' <= c <= '\u097F')
    return "hi" if devanagari_count > len(text) * 0.3 else "en"

def translate_to_english(text: str, source_lang: str = "hi") -> str:
    if source_lang == "en":
        return text
    try:
        translator = GoogleTranslator(source='hi', target='en')
        result = translator.translate(text)
        return result if result else text
    except Exception:
        return text
