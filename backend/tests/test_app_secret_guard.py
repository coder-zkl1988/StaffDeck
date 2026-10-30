import logging

import pytest

from app.config import DEFAULT_APP_SECRET, Settings
from app.main import _guard_default_app_secret


def test_default_app_secret_refuses_production() -> None:
    with pytest.raises(RuntimeError, match="APP_SECRET"):
        _guard_default_app_secret(
            Settings(app_env="production", app_secret=DEFAULT_APP_SECRET)
        )


def test_strong_app_secret_passes_production() -> None:
    _guard_default_app_secret(Settings(app_env="production", app_secret="a" * 48))


def test_default_app_secret_warns_in_development(
    caplog: pytest.LogCaptureFixture,
) -> None:
    with caplog.at_level(logging.WARNING, logger="staffdeck.startup"):
        _guard_default_app_secret(
            Settings(app_env="development", app_secret=DEFAULT_APP_SECRET)
        )
    assert any("APP_SECRET" in record.message for record in caplog.records)


def test_mock_router_mounting_follows_setting() -> None:
    """mock 演示 API 默认挂载(路由可达而非 404;鉴权由内部服务令牌负责)。"""
    from fastapi.testclient import TestClient

    from app import main as app_main

    client = TestClient(app_main.app)
    response = client.post("/api/mock/order/query", json={"order_id": "ORDER-1001"})
    assert response.status_code != 404
