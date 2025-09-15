# 특정 앱(accounts) 안에서 사용할 엔드포인트를 정의
# 프론트엔드와의 약속된 URL 주소(API 명세서)를 실제 Django 코드로 연결하는 다리 역할
# config/urls.py에서 include('accounts.urls')로 이 파일을 불러옴

# accounts/urls.py
from django.urls import path
from .views import (
    IdPrecheckView,
    EmailPrecheckView,
    RegisterView,
    LoginView,
    TokenRefreshView,
    LogoutView,
    FindIdView,
    FindPasswordView,
    ChangePasswordView,
    AdminPromoteView,
    AdminDemoteView,
    UserListView,
)

app_name = "accounts"

urlpatterns = [
    # 회원가입 사전검증
    path("register/precheck/user-id/", IdPrecheckView.as_view(), name="id-precheck"),
    path("register/precheck/email/", EmailPrecheckView.as_view(), name="email-precheck"),

    # 회원가입/로그인/토큰/로그아웃
    path("register/", RegisterView.as_view(), name="register"),              # POST
    path("login/", LoginView.as_view(), name="login"),                       # POST
    path("refresh/", TokenRefreshView.as_view(), name="token-refresh"),      # POST
    path("logout/", LogoutView.as_view(), name="logout"),                    # POST

    # 아이디/비밀번호 찾기 & 변경
    path("find-id/", FindIdView.as_view(), name="find-id"),                  # POST
    path("find-password/", FindPasswordView.as_view(), name="find-password"),# POST
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),  # POST

    # 관리자 권한 승격/강등
    path("admin/promote/", AdminPromoteView.as_view(), name="admin-promote"),  # POST
    path("admin/demote/", AdminDemoteView.as_view(), name="admin-demote"),     # POST

    # 회원 목록 (관리자 전용)
    path("users/", UserListView.as_view(), name="user-list"),               # GET
]

