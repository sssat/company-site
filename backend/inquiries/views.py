# views.py — inquiries (처리 상태 변경만 허용 + 영구삭제 전용)
# 주석은 한국어로 작성

from django.db.models import Q
from django.utils import timezone
from django.db import transaction
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request

from .models import Inquiry
from .serializers import (
    InquiryCreateRequestSerializer,
    InquiryCreateResponseSerializer,
    InquiryListRequestSerializer,
    InquiryListResponseSerializer,
    InquiryDetailResponseSerializer,
    InquiryProcessRequestSerializer,
    InquiryProcessResponseSerializer,
    InquiryDeleteResponseSerializer,  # 응답용만 사용
)

# ─────────────────────────────────────────────────────────────
# 권한: ADMIN(1) 이상만 허용하는 예시 Permission
#   - accounts.User.grade_code.grade_code 값을 0/1/2로 가정
#   - 1=ADMIN, 2=SUPER_ADMIN
# ─────────────────────────────────────────────────────────────
class IsAdminOrSuperAdmin(permissions.BasePermission):
    message = "관리자 권한이 필요합니다."

    def has_permission(self, request: Request, view: APIView) -> bool:
        user = getattr(request, "user", None)
        if not (user and user.is_authenticated):
            return False
        level = getattr(user, "grade_code", None)
        code = getattr(level, "grade_code", 0)
        return code in (1, 2)


# ─────────────────────────────────────────────────────────────
# 1) POST /api/inquiries/   (문의 등록 - 공개)
#    GET  /api/inquiries/   (문의 목록 - 관리자)    
#    ※ 같은 경로에서 HTTP 메서드별 권한/동작 분리
# ─────────────────────────────────────────────────────────────
class InquiryListCreateView(APIView):
    """
    - POST: AllowAny(누구나) / 문의 등록
    - GET : IsAdminOrSuperAdmin / 문의 목록(삭제되지 않은 건만)
    """

    def get_permissions(self):
        if self.request.method == "POST":
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminOrSuperAdmin()]

    # 문의 등록
    def post(self, request: Request, *args, **kwargs):
        req_srz = InquiryCreateRequestSerializer(data=request.data)
        req_srz.is_valid(raise_exception=True)
        inquiry: Inquiry = req_srz.save()  # subject → title 매핑은 시리얼라이저에서 처리

        resp = InquiryCreateResponseSerializer(
            {"inquiry_seq": inquiry.inquiry_seq, "message": "문의가 등록되었습니다."}
        )
        return Response(resp.data, status=status.HTTP_201_CREATED)

    # 문의 목록
    def get(self, request: Request, *args, **kwargs):
        # 1) 쿼리파라미터 검증
        params = InquiryListRequestSerializer(data=request.query_params)
        params.is_valid(raise_exception=True)
        page = params.validated_data["page"]
        size = params.validated_data["size"]
        q = params.validated_data.get("q") or ""
        status_filter = params.validated_data.get("status", "all")
        order = params.validated_data.get("order", "recent")

        # 2) 기본 쿼리셋 (소프트 삭제 컬럼 제거됨)
        qs = Inquiry.objects.all().select_related("processed_by")

        # 3) 검색(이름/이메일/제목/내용)
        if q:
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(email__icontains=q)
                | Q(title__icontains=q)
                | Q(message__icontains=q)
            )

        # 4) 상태 필터: pending|done|all -> is_processed 기반
        if status_filter == "pending":
            qs = qs.filter(is_processed=False)
        elif status_filter == "done":
            qs = qs.filter(is_processed=True)

        # 5) 정렬: recent(내림차순) / oldest(오름차순)
        qs = qs.order_by("submitted_at" if order == "oldest" else "-submitted_at")

        # 6) 페이지네이션
        total = qs.count()
        start = (page - 1) * size
        end = start + size
        items = list(qs[start:end])

        resp = InquiryListResponseSerializer(
            {
                "page": page,
                "size": size,
                "total": total,
                "total_pages": (total + size - 1) // size,
                "items": items,
            }
        )
        return Response(resp.data, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────
# 2) GET /api/inquiries/{inquiry_seq}/        (단건 조회 - 관리자)
# 5) DELETE /api/inquiries/{inquiry_seq}/     (삭제: 항상 영구삭제)
#    ※ 제목/내용 수정용 PUT 은 제공하지 않음 (정책상 미지원)
# ─────────────────────────────────────────────────────────────
class InquiryDetailDeleteView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]

    # 단건 조회 (소프트 삭제 컬럼 제거됨 → 일반 조회)
    def get(self, request: Request, inquiry_seq: int, *args, **kwargs):
        try:
            inquiry = (
                Inquiry.objects
                .select_related("processed_by")  # deleted_by 제거
                .get(inquiry_seq=inquiry_seq)
            )
        except Inquiry.DoesNotExist:
            return Response({"message": "대상을 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

        data = InquiryDetailResponseSerializer(inquiry).data
        return Response(data, status=status.HTTP_200_OK)

    # 삭제 (항상 하드 삭제)
    def delete(self, request: Request, inquiry_seq: int, *args, **kwargs):
        # 존재하면 삭제, 없으면 404
        deleted, _ = Inquiry.objects.filter(inquiry_seq=inquiry_seq).delete()
        if deleted == 0:
            return Response({"message": "대상을 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            InquiryDeleteResponseSerializer(
                {"inquiry_seq": inquiry_seq, "deleted": True, "hard": True, "message": "영구 삭제되었습니다."}
            ).data,
            status=status.HTTP_200_OK,
        )


# ─────────────────────────────────────────────────────────────
# 4) PUT /api/inquiries/{inquiry_seq}/process/   (처리 상태 변경 전용)
#    - 요구사항: 한 번 처리완료(True)로 바꾸면 되돌릴 수 없음
#    - 소프트 삭제 컬럼(deleted_at) 제거에 맞게 쿼리 수정
#    - 멱등/경쟁 상태 대비를 위해 select_for_update 사용(선택)
# ─────────────────────────────────────────────────────────────
class InquiryProcessPutView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]

    @transaction.atomic
    def put(self, request: Request, inquiry_seq: int, *args, **kwargs):
        # deleted_at 컬럼 제거에 따라 일반 조회로 변경
        try:
            inquiry = (
                Inquiry.objects
                .select_for_update()
                .select_related("processed_by")
                .get(inquiry_seq=inquiry_seq)
            )
        except Inquiry.DoesNotExist:
            return Response({"message": "대상을 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

        # { "is_processed": bool } 검증
        req_srz = InquiryProcessRequestSerializer(data=request.data)
        req_srz.is_valid(raise_exception=True)
        flag = req_srz.validated_data["is_processed"]

        # False로 요청: 완료 → 미완료 되돌리기 금지
        if flag is False:
            if inquiry.is_processed:
                return Response(
                    {"message": "이미 처리완료된 문의는 되돌릴 수 없습니다."},
                    status=status.HTTP_409_CONFLICT,
                )
            # 이미 미완료라면 no-op (멱등)
            return Response(InquiryProcessResponseSerializer(inquiry).data, status=status.HTTP_200_OK)

        # True로 요청: 처리완료로 전환 (이미 완료였다면 멱등 응답)
        if inquiry.is_processed:
            return Response(InquiryProcessResponseSerializer(inquiry).data, status=status.HTTP_200_OK)

        inquiry.is_processed = True
        inquiry.processed_at = timezone.now()
        inquiry.processed_by = request.user
        inquiry.save(update_fields=["is_processed", "processed_at", "processed_by"])

        return Response(InquiryProcessResponseSerializer(inquiry).data, status=status.HTTP_200_OK)