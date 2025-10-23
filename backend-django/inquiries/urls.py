from django.urls import path
from .views import (
    InquiryListCreateView,
    InquiryDetailDeleteView,   # GET/DELETE만
    InquiryProcessPutView,     # 처리 상태 변경 전용
)

app_name = "inquiries"

urlpatterns = [
    path("", InquiryListCreateView.as_view(), name="list-create"),               # GET 목록 / POST 생성
    path("<int:inquiry_seq>/", InquiryDetailDeleteView.as_view(), name="detail-delete"),  # GET / DELETE
    path("<int:inquiry_seq>/process/", InquiryProcessPutView.as_view(), name="process-put"),  # PUT
]
