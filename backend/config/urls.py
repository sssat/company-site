# 프로젝트 루트 라우터

# Django 기본 관리자 사이트 기능을 사용하기 위해 불러옴
from django.contrib import admin

# path: URL 경로와 연결할 대상을 등록
# include: config/urls.py에서 회원 쪽 요청이 들어오면, 세부 처리는 하위 URL로 넘김
from django.urls import path, include

# accounts/urls.py에 있는 URL 패턴들을 가져옴
from accounts import urls as accounts_urls
# inquiries/urls.py 네임스페이스 포함 연결을 위해 모듈 임포트 (프로젝트 스타일 유지)
from inquiries import urls as inquiries_urls

# Django가 클라이언트 요청을 처음으로 받는 관문
urlpatterns = [

    # 1. 장고 기본 관리자 사이트 API -> /admin/..
    # /admin/ URL로 요청이 오면 Django 기본 관리자 페이지로 연결됨
    # path가 URL 경로("admin/")를 admin.site.urls과 연결해줌
    path("admin/", admin.site.urls),

    # 2. 회원 전용 API -> /api/auth/...
    # path가 "api/auth/"와 accounts_urls.auth_urlpatterns를 연결해줌
    path("api/auth/", include((accounts_urls.auth_urlpatterns, "accounts"), namespace="accounts-auth")),

    # 3. 관리자 전용 API -> /api/admins/...
    path("api/admins/", include((accounts_urls.admin_urlpatterns, "accounts"), namespace="accounts-admin")),

    # 4. 문의(inquiries) API -> /api/inquiries/...
    # inquiries는 하나의 urlpatterns 묶음으로 관리하므로 네임스페이스 포함해 include
    path("api/inquiries/", include((inquiries_urls.urlpatterns, "inquiries"), namespace="inquiries")),
]
