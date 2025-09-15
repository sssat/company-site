# 프로젝트 루트 라우터

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    # 최종 엔드포인트는 /api/auth/가 접두사로 붙음
    path("api/auth/", include("accounts.urls", namespace="accounts")),
]
