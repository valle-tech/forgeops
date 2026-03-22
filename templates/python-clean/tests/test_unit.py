"""Unit: domain list payload shape (no HTTP stack)."""


def test_payments_list_shape():
    from app.modules import payments_router

    result = payments_router.list_payments()
    assert result == {"domain": "payments", "items": []}
