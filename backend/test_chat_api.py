#!/usr/bin/env python3
"""Quick smoke test for a running MentorPro backend."""

import json
import os

import requests

API_URL = os.getenv("MENTORPRO_API_URL", "http://localhost:8000").rstrip("/")
REMOTE_API_URL = os.getenv("MENTORPRO_REMOTE_API_URL", "").rstrip("/")
TEST_MESSAGE = "Xin chao! Ban co the giup toi lap ke hoach hoc tap khong?"


def test_health(api_url: str) -> bool:
    print(f"\nTesting health check: {api_url}/")
    try:
        response = requests.get(f"{api_url}/", timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.ok
    except Exception as exc:
        print(f"Error: {exc}")
        return False


def test_detailed_health(api_url: str) -> bool:
    print(f"\nTesting detailed health: {api_url}/health/detailed")
    try:
        response = requests.get(f"{api_url}/health/detailed", timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.ok
    except Exception as exc:
        print(f"Error: {exc}")
        return False


def test_chat_anonymous(api_url: str) -> bool:
    print(f"\nTesting anonymous chat: {api_url}/chat")
    try:
        response = requests.post(
            f"{api_url}/chat",
            json={"message": TEST_MESSAGE},
            timeout=30,
        )
        print(f"Status: {response.status_code}")
        if not response.ok:
            print(f"Response: {response.text[:500]}")
            return False
        result = response.json()
        print(f"AI response: {result.get('ai_response', '')[:200]}...")
        print(f"Message ID: {result.get('message_id')}")
        return True
    except Exception as exc:
        print(f"Error: {exc}")
        return False


def run_suite(api_url: str) -> bool:
    if not test_health(api_url):
        return False
    return test_detailed_health(api_url) and test_chat_anonymous(api_url)


def main() -> None:
    print("=" * 60)
    print("MentorPro Backend API Smoke Test")
    print("=" * 60)
    local_ok = run_suite(API_URL)
    print(f"\nConfigured backend: {'OK' if local_ok else 'FAILED'}")

    if REMOTE_API_URL:
        remote_ok = run_suite(REMOTE_API_URL)
        print(f"Deployed backend: {'OK' if remote_ok else 'FAILED'}")


if __name__ == "__main__":
    main()
