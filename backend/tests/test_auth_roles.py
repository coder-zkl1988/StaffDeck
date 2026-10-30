import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.api import auth as auth_api
from app.api.auth import (
    LoginRequest,
    UserCreateRequest,
    UserUpdateRequest,
    create_user,
    login,
    logout,
    update_user,
)
from app.db.models import Tenant, User
from app.security.auth import create_access_token, get_current_user, hash_password


def test_unknown_login_does_not_create_account() -> None:
    with _test_session() as db:
        db.add(Tenant(id="tenant_demo", name="Demo"))
        db.commit()

        try:
            login(LoginRequest(tenant_id="tenant_demo", username="missing", password="secret"), db=db)
        except HTTPException as error:
            assert error.status_code == 401
            assert error.detail == "Invalid username or password"
        else:
            raise AssertionError("unknown account must not be created during login")

        assert db.exec(select(User)).all() == []


def test_database_role_controls_account_management() -> None:
    with _test_session() as db:
        db.add(Tenant(id="tenant_demo", name="Demo"))
        member_named_admin = User(
            id="user_named_admin",
            tenant_id="tenant_demo",
            username="admin",
            role="member",
            password_hash=hash_password("secret"),
        )
        role_admin = User(
            id="user_role_admin",
            tenant_id="tenant_demo",
            username="ops",
            role="admin",
            password_hash=hash_password("secret"),
        )
        db.add(member_named_admin)
        db.add(role_admin)
        db.commit()

        try:
            create_user(
                UserCreateRequest(tenant_id="tenant_demo", username="blocked", password="secret"),
                member_named_admin,
                db,
            )
        except HTTPException as error:
            assert error.status_code == 403
        else:
            raise AssertionError("an admin-looking username must not grant administrator access")

        created = create_user(
            UserCreateRequest(
                tenant_id="tenant_demo",
                username="created_admin",
                password="secret",
                role="admin",
            ),
            role_admin,
            db,
        )
        assert created.role == "admin"

        updated = update_user(
            created.id,
            UserUpdateRequest(tenant_id="tenant_demo", role="member"),
            role_admin,
            db,
        )
        assert updated.role == "member"


def test_admin_password_update_allows_login_with_unique_display_name() -> None:
    with _test_session() as db:
        db.add(Tenant(id="tenant_demo", name="Demo"))
        admin = User(
            id="admin",
            tenant_id="tenant_demo",
            username="admin",
            role="admin",
            password_hash=hash_password("admin"),
        )
        member = User(
            id="user_demo",
            tenant_id="tenant_demo",
            username="user_demo",
            display_name="zongkelong",
            role="member",
            password_hash=hash_password("old-password"),
        )
        db.add(admin)
        db.add(member)
        db.commit()

        update_user(
            member.id,
            UserUpdateRequest(tenant_id="tenant_demo", password="123456"),
            admin,
            db,
        )

        session = login(
            LoginRequest(tenant_id="tenant_demo", username="zongkelong", password="123456"),
            db=db,
        )

        assert session.user.id == member.id
        assert session.user.username == "user_demo"


def test_duplicate_display_name_cannot_be_used_to_login() -> None:
    with _test_session() as db:
        db.add(Tenant(id="tenant_demo", name="Demo"))
        db.add(
            User(
                id="member_one",
                tenant_id="tenant_demo",
                username="member_one",
                display_name="duplicate",
                password_hash=hash_password("123456"),
            )
        )
        db.add(
            User(
                id="member_two",
                tenant_id="tenant_demo",
                username="member_two",
                display_name="duplicate",
                password_hash=hash_password("123456"),
            )
        )
        db.commit()

        try:
            login(
                LoginRequest(tenant_id="tenant_demo", username="duplicate", password="123456"),
                db=db,
            )
        except HTTPException as error:
            assert error.status_code == 401
            assert error.detail == "Invalid username or password"
        else:
            raise AssertionError("an ambiguous display name must not authenticate any account")


def test_login_rate_limit_locks_out_repeated_failures() -> None:
    """窗口内连续失败超限后,即使密码正确也返回 429。"""
    auth_api._login_failures.clear()
    try:
        with _test_session() as db:
            db.add(Tenant(id="tenant_demo", name="Demo"))
            db.add(
                User(
                    id="user_rl",
                    tenant_id="tenant_demo",
                    username="rate_limited",
                    role="member",
                    password_hash=hash_password("correct-horse"),
                )
            )
            db.commit()

            for _ in range(auth_api.LOGIN_MAX_FAILURES):
                with pytest.raises(HTTPException) as wrong_error:
                    login(
                        LoginRequest(
                            tenant_id="tenant_demo", username="rate_limited", password="wrong"
                        ),
                        db,
                    )
                assert wrong_error.value.status_code == 401

            with pytest.raises(HTTPException) as locked_error:
                login(
                    LoginRequest(
                        tenant_id="tenant_demo", username="rate_limited", password="correct-horse"
                    ),
                    db,
                )
            assert locked_error.value.status_code == 429
    finally:
        auth_api._login_failures.clear()


def test_password_change_and_logout_revoke_old_tokens() -> None:
    with _test_session() as db:
        admin = User(
            id="user_admin_rev",
            tenant_id="tenant_demo",
            username="admin_rev",
            role="admin",
            password_hash=hash_password("old-password"),
        )
        member = User(
            id="user_member_rev",
            tenant_id="tenant_demo",
            username="member_rev",
            role="member",
            password_hash=hash_password("old-password"),
        )
        db.add(Tenant(id="tenant_demo", name="Demo"))
        db.add(admin)
        db.add(member)
        db.commit()

        stale_token = create_access_token(member)
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=stale_token)
        assert get_current_user(credentials, db).id == member.id

        # 管理员改密 → 旧 token 立即失效
        update_user(
            member.id,
            UserUpdateRequest(tenant_id="tenant_demo", password="brand-new"),
            admin,
            db,
        )
        with pytest.raises(HTTPException) as revoked_error:
            get_current_user(credentials, db)
        assert revoked_error.value.status_code == 401
        assert revoked_error.value.detail == "Token revoked"

        # 新 token 可用;logout 后再次失效
        fresh_token = create_access_token(member)
        fresh_credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=fresh_token)
        assert get_current_user(fresh_credentials, db).id == member.id
        logout(member, db)
        with pytest.raises(HTTPException) as logout_error:
            get_current_user(fresh_credentials, db)
        assert logout_error.value.status_code == 401


def _test_session() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    return Session(engine)
