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
# news/urls.py 공개/관리자 패턴 분리 임포트
from news import urls as news_urls

# Django가 클라이언트 요청을 처음으로 받는 관문
urlpatterns = [
    # 1) Django 기본 관리자 사이트
    path("admin/", admin.site.urls),

    # 2) 회원 인증/계정 관련
    #    예) /api/auth/login/, /api/auth/register/ ...
    path(
        "api/auth/",
        include((accounts_urls.auth_urlpatterns, "accounts"), namespace="accounts-auth"),
    ),

    # 3) 관리자 전용(계정/권한 등)
    #    예) /api/admins/users/...
    path(
        "api/admins/",
        include((accounts_urls.admin_urlpatterns, "accounts"), namespace="accounts-admin"),
    ),

    # 4) 문의(inquiries)
    #    예) /api/inquiries/...
    path(
        "api/inquiries/",
        include((inquiries_urls.urlpatterns, "inquiries"), namespace="inquiries"),
    ),

    # 5) 뉴스(공개)
    #    예) /api/news/, /api/news/{news_seq}/
    path(
        "api/news/",
        include((news_urls.public_urlpatterns, "news"), namespace="news-public"),
    ),

    # 6) 뉴스(관리자)
    #    예) /api/admins/news/, /api/admins/news/{news_seq}/, /api/admins/news/uploads/urls/
    path(
        "api/admins/news/",
        include((news_urls.admin_urlpatterns, "news"), namespace="news-admin"),
    ),
]
