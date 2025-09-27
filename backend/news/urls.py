# news/urls.py
# - 공개(퍼블릭) 엔드포인트: /api/news/...
# - 관리자(ADMIN/SUPER_ADMIN) 엔드포인트: /api/admins/news/...

from django.urls import path
from .views import (
    NewsListView,
    NewsDetailView,
    AdminNewsCreateView,
    AdminNewsDetailView,        # PUT/PATCH/DELETE
    CreatePresignedUploadURLView,  # 프리사인드 업로드 URL 발급
)

app_name = "news"

# 공개용 URL 패턴 (리스트/상세)
public_urlpatterns = [
    path("", NewsListView.as_view(), name="list"),                      # GET /api/news/
    path("<int:news_seq>/", NewsDetailView.as_view(), name="detail"),   # GET /api/news/{news_seq}/
]

# 관리자용 URL 패턴 (생성/수정/삭제/업로드URL발급)
admin_urlpatterns = [
    path("uploads/urls/", CreatePresignedUploadURLView.as_view(), name="upload_url"),  # POST /api/admins/news/uploads/urls/
    path("", AdminNewsCreateView.as_view(), name="create"),                             # POST /api/admins/news/
    path("<int:news_seq>/", AdminNewsDetailView.as_view(), name="detail"),             # PUT/PATCH/DELETE /api/admins/news/{news_seq}/
]
