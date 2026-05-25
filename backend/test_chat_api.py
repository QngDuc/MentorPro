#!/usr/bin/env python3
"""
Test script to verify the /chat endpoint is working correctly
Run this to debug chat API issues before deploying to Vercel/HF
"""

import requests
import json
import sys

# Configuration
LOCAL_API_URL = "http://localhost:8000"
HF_API_URL = "https://qngduc-mentorpro.hf.space"
TEST_MESSAGE = "Xin chào! Bạn tên gì?"

def test_health(api_url):
    """Test health check endpoint"""
    print(f"\n🔍 Testing health check: {api_url}/")
    try:
        response = requests.get(f"{api_url}/", timeout=10)
        print(f"✅ Status: {response.status_code}")
        print(f"✅ Response: {response.json()}")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_detailed_health(api_url):
    """Test detailed health check"""
    print(f"\n🔍 Testing detailed health: {api_url}/health/detailed")
    try:
        response = requests.get(f"{api_url}/health/detailed", timeout=10)
        print(f"✅ Status: {response.status_code}")
        print(f"✅ Response: {json.dumps(response.json(), indent=2)}")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_chat_anonymous(api_url):
    """Test chat endpoint without authentication (anonymous user)"""
    print(f"\n🔍 Testing chat API (anonymous): {api_url}/chat")
    try:
        data = {"message": TEST_MESSAGE}
        response = requests.post(
            f"{api_url}/chat",
            data=data,
            timeout=30
        )
        print(f"✅ Status: {response.status_code}")
        
        if response.ok:
            result = response.json()
            print(f"✅ AI Response: {result.get('ai_response', 'No response')[:200]}...")
            print(f"✅ Message ID: {result.get('message_id')}")
            print(f"✅ Sentiment: {result.get('sentiment')}")
            return True
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"❌ Response: {response.text[:500]}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("="*60)
    print("MentorPro Backend API Test")
    print("="*60)
    
    # Test local first
    print("\n🌐 Testing LOCAL backend...")
    local_ok = test_health(LOCAL_API_URL)
    if local_ok:
        test_detailed_health(LOCAL_API_URL)
        test_chat_anonymous(LOCAL_API_URL)
    
    # Test HF Space
    print("\n\n🌐 Testing HUGGING FACE SPACE backend...")
    hf_ok = test_health(HF_API_URL)
    if hf_ok:
        test_detailed_health(HF_API_URL)
        test_chat_anonymous(HF_API_URL)
    
    print("\n" + "="*60)
    print("Test Summary:")
    print(f"  Local: {'✅ OK' if local_ok else '❌ FAILED'}")
    print(f"  HF Space: {'✅ OK' if hf_ok else '❌ FAILED'}")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
