# <accounts/urls.py란?>
# accounts 앱의 URL(엔드포인트)들을 관리하는 파일
# 회원 관련 API 요청이 어디로 가야 하는지를 정리해둔 지도 역할을 하는 파일

# <Django에서 HTTP 요청이 처리되는 기본 흐름>
# 클라이언트 요청 -> config/urls.py -> accounts/urls.py -> accounts/views.py -> 응답
# config/urls.py: 프로젝트 전체의 관문. 어떤 앱의 urls.py로 연결할지를 결정 -> config/urls.py에서 accounts.urls를 불러와야 최종 완성된다.

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

# 여기서 접두사 api/auth/, api/admins/는 config/urls.py에서 작성함
# 1. 모든 회원 전용 API
auth_urlpatterns = [
    # (1) 아이디/이메일 중복체크
    path("register/precheck/user-id/", IdPrecheckView.as_view(), name="id-precheck"),      # POST
    path("register/precheck/email/", EmailPrecheckView.as_view(), name="email-precheck"),  # POST

    # (2) 회원가입/로그인/엑세스 토큰갱신/로그아웃
    path("register/", RegisterView.as_view(), name="register"),              # POST
    path("login/", LoginView.as_view(), name="login"),                       # POST
    path("refresh/", TokenRefreshView.as_view(), name="token-refresh"),      # POST
    path("logout/", LogoutView.as_view(), name="logout"),                    # POST

    # (3) 아이디 찾기/비밀번호 찾기/비밀번호 변경
    path("find-id/", FindIdView.as_view(), name="find-id"),                          # POST
    path("find-password/", FindPasswordView.as_view(), name="find-password"),        # POST
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),  # POST
]

# 2. 관리자 전용 API
admin_urlpatterns = [
    # (1) 관리자 권한 부여/해제
    path("promote/", AdminPromoteView.as_view(), name="admin-promote"),  # POST
    path("demote/", AdminDemoteView.as_view(), name="admin-demote"),     # POST

    # (2) 회원 목록 조회
    path("users/", UserListView.as_view(), name="user-list"),     # GET
]