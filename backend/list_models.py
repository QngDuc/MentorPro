#!/usr/bin/env python3
"""
List available Gemini models and their supported generation methods.
Run:
  .\.venv\Scripts\Activate.ps1
  python backend/list_models.py
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("GEMINI_API_KEY not set in environment (.env or env vars). Exiting.")
    sys.exit(1)

try:
    import google.generativeai as genai
except Exception as e:
    print("google.generativeai package not installed:", e)
    sys.exit(1)

print("Configuring genai...")
genai.configure(api_key=GEMINI_API_KEY)

print("Listing models...")
try:
    models = list(genai.list_models())
    if not models:
        print("No models returned by the API.")
        sys.exit(0)

    for m in models:
        name = getattr(m, "name", str(m))
        methods = getattr(m, "supported_generation_methods", None)
        print("\nModel:", name)
        print("  Supported methods:", methods)
        # Print any extra useful metadata
        if hasattr(m, "description"):
            print("  Description:", getattr(m, "description"))
except Exception as e:
    print("Error while listing models:", e)
    import traceback
    traceback.print_exc()
    sys.exit(2)
