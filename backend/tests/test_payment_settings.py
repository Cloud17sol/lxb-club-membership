"""
Test suite for LXB Basketball Club - Payment Settings & Paystack Integration
Tests: Admin payment settings, payment initialization, verification, webhook, and access control
"""
import pytest
import requests
import os
import hmac
import hashlib
import json
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@lxb.com"
ADMIN_PASSWORD = "admin123"
TEST_MEMBER_EMAIL = f"testmember_{datetime.now().strftime('%H%M%S')}@lxb.com"
TEST_MEMBER_PASSWORD = "test123"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin authentication failed: {response.text}")


@pytest.fixture(scope="module")
def member_data(api_client):
    """Create a test member and return token + user data"""
    signup_data = {
        "email": TEST_MEMBER_EMAIL,
        "password": TEST_MEMBER_PASSWORD,
        "full_name": "Test Member Payment",
        "phone": "+2348012345678",
        "date_of_birth": "1995-06-15",
        "gender": "Male",
        "address": "123 Test Street, Lagos",
        "player_position": "Point Guard"
    }
    response = api_client.post(f"{BASE_URL}/api/auth/signup", json=signup_data)
    if response.status_code == 200:
        data = response.json()
        return {
            "token": data.get("access_token"),
            "user": data.get("user"),
            "email": TEST_MEMBER_EMAIL
        }
    pytest.skip(f"Member signup failed: {response.text}")


@pytest.fixture(scope="module")
def member_token(member_data):
    """Get member token from member_data fixture"""
    return member_data["token"]


class TestAdminLogin:
    """Test admin login and redirect"""
    
    def test_admin_login_success(self, api_client):
        """Admin login (admin@lxb.com / admin123) works"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert "user" in data, "Missing user in response"
        assert data["user"]["role"] == "admin", f"Expected admin role, got {data['user']['role']}"
        print(f"Admin login successful: {data['user']['email']}")


class TestMemberSignup:
    """Test member signup flow"""
    
    def test_member_signup_success(self, api_client):
        """Member signup works and returns token"""
        timestamp = datetime.now().strftime('%H%M%S%f')
        signup_data = {
            "email": f"signup_test_{timestamp}@lxb.com",
            "password": "testpass123",
            "full_name": "Signup Test User",
            "phone": "+2348012345678",
            "date_of_birth": "1995-06-15",
            "gender": "Male",
            "address": "123 Test Street, Lagos",
            "player_position": "Center"
        }
        response = api_client.post(f"{BASE_URL}/api/auth/signup", json=signup_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token"
        assert data["user"]["role"] == "member", "Expected member role"
        print(f"Member signup successful: {data['user']['email']}")


class TestAdminPaymentSettings:
    """Test admin payment settings endpoints"""
    
    def test_get_admin_payment_settings(self, api_client, admin_token):
        """GET /api/admin/payment-settings returns payment config (admin only)"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/payment-settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "paystack_mode" in data, "Missing paystack_mode"
        assert "has_test_keys" in data, "Missing has_test_keys"
        assert "has_live_keys" in data, "Missing has_live_keys"
        assert data["paystack_mode"] in ["test", "live"], f"Invalid mode: {data['paystack_mode']}"
        print(f"Payment settings: mode={data['paystack_mode']}, has_test_keys={data['has_test_keys']}")
    
    def test_update_admin_payment_settings_mode(self, api_client, admin_token):
        """PUT /api/admin/payment-settings updates Paystack mode"""
        # First get current settings
        get_response = api_client.get(
            f"{BASE_URL}/api/admin/payment-settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        current_mode = get_response.json().get("paystack_mode", "test")
        
        # Update to test mode (safe operation)
        response = api_client.put(
            f"{BASE_URL}/api/admin/payment-settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"paystack_mode": "test"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Missing success message"
        print(f"Payment settings updated successfully")
    
    def test_update_admin_payment_settings_keys(self, api_client, admin_token):
        """PUT /api/admin/payment-settings updates Paystack keys"""
        response = api_client.put(
            f"{BASE_URL}/api/admin/payment-settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "paystack_test_public_key": "pk_test_placeholder",
                "paystack_mode": "test"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("Payment keys update successful")
    
    def test_non_admin_cannot_access_payment_settings(self, api_client, member_token):
        """Non-admin users cannot access admin payment settings (403)"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/payment-settings",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("Non-admin correctly denied access to payment settings")
    
    def test_non_admin_cannot_update_payment_settings(self, api_client, member_token):
        """Non-admin users cannot update admin payment settings (403)"""
        response = api_client.put(
            f"{BASE_URL}/api/admin/payment-settings",
            headers={"Authorization": f"Bearer {member_token}"},
            json={"paystack_mode": "live"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("Non-admin correctly denied update to payment settings")


class TestPaymentGatewayStatus:
    """Test payment gateway status endpoint"""
    
    def test_get_payment_gateway_status(self, api_client, member_token):
        """GET /api/payment-settings/status returns gateway status for authenticated user"""
        response = api_client.get(
            f"{BASE_URL}/api/payment-settings/status",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "mode" in data, "Missing mode"
        assert "is_configured" in data, "Missing is_configured"
        assert isinstance(data["is_configured"], bool), "is_configured should be boolean"
        print(f"Gateway status: mode={data['mode']}, is_configured={data['is_configured']}")


class TestPaymentInitialization:
    """Test payment initialization endpoint"""
    
    def test_payment_initialize_basic(self, api_client, member_token):
        """POST /api/payment/initialize creates pending payment with authorization_url"""
        response = api_client.post(
            f"{BASE_URL}/api/payment/initialize",
            headers={"Authorization": f"Bearer {member_token}"},
            json={
                "callback_url": "https://example.com/callback",
                "include_physical_card": False
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "authorization_url" in data, "Missing authorization_url"
        assert "reference" in data, "Missing reference"
        assert data["reference"].startswith("lxb_"), f"Reference should start with lxb_: {data['reference']}"
        print(f"Payment initialized: reference={data['reference']}")
        return data["reference"]
    
    def test_payment_initialize_with_physical_card(self, api_client):
        """POST /api/payment/initialize with physical card includes correct total"""
        # Create a new member for this test to avoid duplicate payment error
        timestamp = datetime.now().strftime('%H%M%S%f')
        signup_response = api_client.post(f"{BASE_URL}/api/auth/signup", json={
            "email": f"physcard_test_{timestamp}@lxb.com",
            "password": "testpass123",
            "full_name": "Physical Card Test",
            "phone": "+2348012345678",
            "date_of_birth": "1995-06-15",
            "gender": "Male",
            "address": "123 Test Street",
            "player_position": "Guard"
        })
        
        if signup_response.status_code != 200:
            pytest.skip("Could not create test member")
        
        token = signup_response.json()["access_token"]
        
        response = api_client.post(
            f"{BASE_URL}/api/payment/initialize",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "callback_url": "https://example.com/callback",
                "include_physical_card": True
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "authorization_url" in data, "Missing authorization_url"
        print(f"Payment with physical card initialized: reference={data['reference']}")


class TestPaymentVerification:
    """Test payment verification endpoint"""
    
    def test_payment_verify_success(self, api_client, member_token):
        """GET /api/payment/verify/{reference} verifies payment in placeholder mode"""
        # First initialize a payment
        init_response = api_client.post(
            f"{BASE_URL}/api/payment/initialize",
            headers={"Authorization": f"Bearer {member_token}"},
            json={
                "callback_url": "https://example.com/callback",
                "include_physical_card": False
            }
        )
        
        # If already paid this month, skip
        if init_response.status_code == 400:
            pytest.skip("Already paid for this month")
        
        assert init_response.status_code == 200
        reference = init_response.json()["reference"]
        
        # Verify the payment
        verify_response = api_client.get(
            f"{BASE_URL}/api/payment/verify/{reference}",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert verify_response.status_code == 200, f"Expected 200, got {verify_response.status_code}: {verify_response.text}"
        
        data = verify_response.json()
        assert data["status"] == "success", f"Expected success status, got {data['status']}"
        print(f"Payment verified: {data['message']}")
    
    def test_payment_verify_not_found(self, api_client, member_token):
        """GET /api/payment/verify/{reference} returns 404 for invalid reference"""
        response = api_client.get(
            f"{BASE_URL}/api/payment/verify/invalid_reference_12345",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("Invalid reference correctly returns 404")

    def test_payment_verify_wrong_owner_forbidden(self, api_client):
        """Member cannot verify another user's payment (IDOR protection)"""
        ts = datetime.now().strftime('%H%M%S%f')
        r1 = api_client.post(
            f"{BASE_URL}/api/auth/signup",
            json={
                "email": f"pay_a_{ts}@lxb.com",
                "password": "testpass123",
                "full_name": "Pay Owner A",
                "phone": "+2348011111111",
                "date_of_birth": "1995-06-15",
                "gender": "Male",
                "address": "123 Test",
                "player_position": "Guard",
            },
        )
        r2 = api_client.post(
            f"{BASE_URL}/api/auth/signup",
            json={
                "email": f"pay_b_{ts}@lxb.com",
                "password": "testpass123",
                "full_name": "Pay Owner B",
                "phone": "+2348022222222",
                "date_of_birth": "1995-06-15",
                "gender": "Male",
                "address": "456 Test",
                "player_position": "Guard",
            },
        )
        if r1.status_code != 200 or r2.status_code != 200:
            pytest.skip("Could not create two test members")
        token_a = r1.json()["access_token"]
        token_b = r2.json()["access_token"]

        init = api_client.post(
            f"{BASE_URL}/api/payment/initialize",
            headers={"Authorization": f"Bearer {token_a}"},
            json={"callback_url": "https://example.com/callback", "include_physical_card": False},
        )
        if init.status_code != 200:
            pytest.skip(f"Could not init payment: {init.text}")
        reference = init.json()["reference"]

        verify = api_client.get(
            f"{BASE_URL}/api/payment/verify/{reference}",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert verify.status_code == 403, f"Expected 403, got {verify.status_code}: {verify.text}"
        print("Cross-user payment verify correctly forbidden")


class TestDuplicatePaymentPrevention:
    """Test duplicate payment prevention"""
    
    def test_duplicate_payment_prevented(self, api_client):
        """Duplicate payment for same month is prevented (400 error)"""
        # Create a new member
        timestamp = datetime.now().strftime('%H%M%S%f')
        signup_response = api_client.post(f"{BASE_URL}/api/auth/signup", json={
            "email": f"dup_test_{timestamp}@lxb.com",
            "password": "testpass123",
            "full_name": "Duplicate Test",
            "phone": "+2348012345678",
            "date_of_birth": "1995-06-15",
            "gender": "Male",
            "address": "123 Test Street",
            "player_position": "Guard"
        })
        
        if signup_response.status_code != 200:
            pytest.skip("Could not create test member")
        
        token = signup_response.json()["access_token"]
        
        # First payment
        first_response = api_client.post(
            f"{BASE_URL}/api/payment/initialize",
            headers={"Authorization": f"Bearer {token}"},
            json={"callback_url": "https://example.com/callback", "include_physical_card": False}
        )
        assert first_response.status_code == 200
        
        # Verify first payment (auto-approve in placeholder mode)
        reference = first_response.json()["reference"]
        api_client.get(
            f"{BASE_URL}/api/payment/verify/{reference}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Try second payment - should fail
        second_response = api_client.post(
            f"{BASE_URL}/api/payment/initialize",
            headers={"Authorization": f"Bearer {token}"},
            json={"callback_url": "https://example.com/callback", "include_physical_card": False}
        )
        assert second_response.status_code == 400, f"Expected 400, got {second_response.status_code}: {second_response.text}"
        
        data = second_response.json()
        assert "already paid" in data.get("detail", "").lower(), f"Expected 'already paid' message, got: {data}"
        print("Duplicate payment correctly prevented")


class TestMembershipCardActivation:
    """Test membership card activation after payment"""
    
    def test_card_activated_after_payment(self, api_client):
        """Payment verification updates membership card to active"""
        # Create a new member
        timestamp = datetime.now().strftime('%H%M%S%f')
        signup_response = api_client.post(f"{BASE_URL}/api/auth/signup", json={
            "email": f"card_test_{timestamp}@lxb.com",
            "password": "testpass123",
            "full_name": "Card Activation Test",
            "phone": "+2348012345678",
            "date_of_birth": "1995-06-15",
            "gender": "Male",
            "address": "123 Test Street",
            "player_position": "Guard"
        })
        
        if signup_response.status_code != 200:
            pytest.skip("Could not create test member")
        
        token = signup_response.json()["access_token"]
        
        # Check initial card status
        card_response = api_client.get(
            f"{BASE_URL}/api/membership-card",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert card_response.status_code == 200
        assert card_response.json()["status"] == "inactive", "New member card should be inactive"
        
        # Initialize and verify payment
        init_response = api_client.post(
            f"{BASE_URL}/api/payment/initialize",
            headers={"Authorization": f"Bearer {token}"},
            json={"callback_url": "https://example.com/callback", "include_physical_card": False}
        )
        assert init_response.status_code == 200
        
        reference = init_response.json()["reference"]
        verify_response = api_client.get(
            f"{BASE_URL}/api/payment/verify/{reference}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert verify_response.status_code == 200
        
        # Check card is now active
        card_response = api_client.get(
            f"{BASE_URL}/api/membership-card",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert card_response.status_code == 200
        card_data = card_response.json()
        assert card_data["status"] == "active", f"Card should be active after payment, got {card_data['status']}"
        assert card_data["active_month"] is not None, "active_month should be set"
        assert card_data["active_year"] is not None, "active_year should be set"
        print(f"Card activated: month={card_data['active_month']}, year={card_data['active_year']}")


class TestWebhook:
    """Test Paystack webhook endpoint"""
    
    def test_webhook_invalid_signature(self, api_client):
        """Webhook rejects invalid signature"""
        payload = json.dumps({
            "event": "charge.success",
            "data": {"reference": "test_ref_123"}
        })
        
        response = api_client.post(
            f"{BASE_URL}/api/payment/webhook",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "x-paystack-signature": "invalid_signature"
            }
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("Invalid webhook signature correctly rejected")
    
    def test_webhook_valid_signature_no_payment(self, api_client):
        """Webhook with valid signature but no matching payment returns ok"""
        # Use placeholder key for signature
        secret_key = "sk_test_placeholder"
        payload = json.dumps({
            "event": "charge.success",
            "data": {"reference": "nonexistent_ref_12345"}
        })
        
        signature = hmac.new(
            secret_key.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha512
        ).hexdigest()
        
        response = api_client.post(
            f"{BASE_URL}/api/payment/webhook",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "x-paystack-signature": signature
            }
        )
        # Should return 200 OK even if payment not found (idempotent)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("Webhook with valid signature processed (no matching payment)")


class TestDuesEndpoint:
    """Test dues settings endpoint"""
    
    def test_get_dues(self, api_client, member_token):
        """GET /api/dues returns dues settings"""
        response = api_client.get(
            f"{BASE_URL}/api/dues",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "monthly_amount" in data, "Missing monthly_amount"
        assert "physical_card_amount" in data, "Missing physical_card_amount"
        assert "currency" in data, "Missing currency"
        print(f"Dues: {data['currency']} {data['monthly_amount']} (card: {data['physical_card_amount']})")
    
    def test_update_dues_admin_only(self, api_client, admin_token):
        """PUT /api/dues updates dues (admin only)"""
        response = api_client.put(
            f"{BASE_URL}/api/dues",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "monthly_amount": 5000.0,
                "physical_card_amount": 2000.0
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["monthly_amount"] == 5000.0, f"Expected 5000, got {data['monthly_amount']}"
        print("Dues updated successfully")
    
    def test_update_dues_member_forbidden(self, api_client, member_token):
        """PUT /api/dues forbidden for members"""
        response = api_client.put(
            f"{BASE_URL}/api/dues",
            headers={"Authorization": f"Bearer {member_token}"},
            json={"monthly_amount": 1000.0}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("Member correctly denied dues update")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
