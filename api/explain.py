"""CivicHelper explain endpoint — Vercel Python serverless function.

POST /api/explain with JSON {"text": "...", "sender": "...", "title": "..."}
and get back {"summary": str, "meaning": str,
 "steps": [{"text": str, "deadline": "YYYY-MM-DD"|null}],
 "keyDates": [{"label": str, "date": "YYYY-MM-DD"}]} from Gemini
(gemini-3.5-flash-lite via the OpenAI-compatible endpoint).

The Gemini API key lives server-side only, in the GEMINI_API_KEY
environment variable. When no key is configured the function answers 501
and the app falls back to its on-device demo explainer.
"""

import json
import os
import re
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
MODEL = "gemini-3.5-flash-lite"
MAX_STEPS = 6
MAX_DATES = 4

SYSTEM_PROMPT = (
    "You are CivicHelper, a plain-language explainer for official letters. "
    "A person pasted the text of a confusing official letter (council, "
    "utility, benefits, bank, health). Explain it in simple everyday "
    "English and reply with JSON ONLY — no markdown fences, no commentary. "
    "The JSON object must have: \"summary\": one or two plain sentences "
    "saying what the letter is about; \"meaning\": one or two sentences "
    "saying what it means for the person who received it; \"steps\": an "
    "array of up to 6 concrete actions, each {\"text\": a short plain "
    "instruction, \"deadline\": the date for that action as YYYY-MM-DD or "
    "null}; \"keyDates\": an array of up to 4 {\"label\": short label, "
    "\"date\": YYYY-MM-DD} for the important dates in the letter. Use "
    "only dates and amounts that appear in the letter — never invent a "
    "date, amount or deadline. If a date has no year, use the year the "
    "letter implies. Keep every sentence short and plain."
)


def _read_json(handler):
    try:
        length = int(handler.headers.get("Content-Length") or 0)
    except ValueError:
        length = 0
    raw = handler.rfile.read(length) if length > 0 else b"{}"
    try:
        return json.loads(raw.decode("utf-8") or "{}")
    except (ValueError, UnicodeDecodeError):
        return None


def _send(handler, status, payload):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def _extract_json(text):
    """Pull the first JSON object out of model output, tolerating fences."""
    try:
        return json.loads(text)
    except ValueError:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except ValueError:
            return None
    return None


def _valid_date(value):
    if not isinstance(value, str):
        return None
    value = value.strip()[:10]
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", value):
        return None
    year, month, day = (int(p) for p in value.split("-"))
    if not (2020 <= year <= 2040 and 1 <= month <= 12 and 1 <= day <= 31):
        return None
    return value


def _validate(data):
    if not isinstance(data, dict):
        return None
    summary = str(data.get("summary") or "").strip()
    meaning = str(data.get("meaning") or "").strip()
    if not summary or not meaning:
        return None
    steps = []
    for step in data.get("steps") or []:
        if not isinstance(step, dict):
            continue
        text = str(step.get("text") or "").strip()
        if not text:
            continue
        steps.append({"text": text[:200], "deadline": _valid_date(step.get("deadline"))})
    steps = steps[:MAX_STEPS]
    key_dates = []
    for item in data.get("keyDates") or []:
        if not isinstance(item, dict):
            continue
        date = _valid_date(item.get("date"))
        label = str(item.get("label") or "").strip()
        if not date or not label:
            continue
        key_dates.append({"label": label[:40], "date": date})
    key_dates = key_dates[:MAX_DATES]
    return {
        "summary": summary[:600],
        "meaning": meaning[:600],
        "steps": steps,
        "keyDates": key_dates,
    }


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        body = _read_json(self)
        if body is None:
            _send(self, 400, {"error": {"message": "Invalid JSON body"}})
            return

        text = str(body.get("text") or "").strip()[:6000]
        if len(text) < 20:
            _send(self, 400, {"error": {"message": "Paste more of the letter first"}})
            return
        sender = str(body.get("sender") or "").strip()[:120]
        title = str(body.get("title") or "").strip()[:120]

        api_key = os.environ.get("GEMINI" + "_API_KEY", "")
        if not api_key:
            _send(self, 501, {"error": {"message": "Hosted AI is not configured"}})
            return

        user_text = f"Letter text:\n{text}"
        if sender:
            user_text = f"Sender: {sender}\n{user_text}"
        if title:
            user_text = f"Title: {title}\n{user_text}"
        payload = {
            "model": MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_text},
            ],
            "temperature": 0.2,
        }
        request = urllib.request.Request(
            GEMINI_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
                "x-goog-api-key": api_key,
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                upstream = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            try:
                detail = json.loads(exc.read().decode("utf-8"))
                message = detail.get("error", {}).get("message", "")
            except (ValueError, UnicodeDecodeError):
                message = ""
            _send(
                self,
                exc.code if 400 <= exc.code < 600 else 502,
                {"error": {"message": message or "Upstream request failed"}},
            )
            return
        except (urllib.error.URLError, TimeoutError, OSError):
            _send(self, 502, {"error": {"message": "Upstream request failed"}})
            return

        try:
            content = upstream["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            _send(self, 502, {"error": {"message": "Upstream returned an unexpected response"}})
            return

        data = _extract_json(content)
        explanation = _validate(data) if data is not None else None
        if explanation is None:
            _send(self, 502, {"error": {"message": "Could not explain the letter"}})
            return
        _send(self, 200, explanation)

    def do_GET(self):
        _send(self, 405, {"error": {"message": "Method not allowed"}})

    def log_message(self, *args):  # keep serverless logs clean
        pass
