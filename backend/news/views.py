from __future__ import annotations

import re
import uuid
import mimetypes
from math import ceil
from datetime import datetime

import boto3
from botocore.config import Config
from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import NewsPost, NewsPostHistory  # History는 삭제 로깅에만 사용(사유 입력 X)
from .serializers import (
    NewsListRequestSerializer,
    NewsListResponseSerializer,
    NewsDetailRequestSerializer,
    NewsDetailResponseSerializer,
    NewsCreateRequestSerializer,
    NewsCreateResponseSerializer,
    NewsUpdateRequestSerializer,
    NewsUpdateResponseSerializer,
    NewsDeleteRequestSerializer,
    NewsDeleteResponseSerializer,
)

# ─────────────────────────────────────────────────────────────
# 권한: 관리자(ADMIN/SUPER_ADMIN)만 허용
#   - 사용자 객체에 grade_code (UserLevel)가 있고,
#     grade_code.grade_code가 1|2 이면 관리자 권한으로 판단
# ─────────────────────────────────────────────────────────────
class IsAdminOrSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view) -> bool:
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        level = getattr(user, "grade_code", None)
        code = getattr(level, "grade_code", None)
        return code in (1, 2)


# ─────────────────────────────────────────────────────────────
# [GET] /api/news/  뉴스 목록
# ─────────────────────────────────────────────────────────────
class NewsListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        req = NewsListRequestSerializer(data=request.query_params)
        try:
            req.is_valid(raise_exception=True)
        except Exception:
            return Response({"message": "잘못된 요청입니다."}, status=status.HTTP_400_BAD_REQUEST)

        q = req.validated_data.get("q")
        page = req.validated_data.get("page", 1)
        size = req.validated_data.get("size", 6)
        sort = req.validated_data.get("sort", "-published_at")
        cat_str = req.validated_data.get("category")

        qs = NewsPost.objects.all()
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(excerpt__icontains=q))
        # "ALL"이면 필터링 없이 전체, 그 외는 int 코드(0,1,2 중 하나)로 필터
        if cat_str and cat_str != "ALL":
            qs = qs.filter(category=req.validated_data.get("category_int"))

        qs = qs.order_by(sort)

        total_count = qs.count()
        total_pages = ceil(total_count / size) if size else 1
        start = (page - 1) * size
        end = start + size
        page_items = qs[start:end]

        resp = NewsListResponseSerializer(
            {
                "items": page_items,
                "page": page,
                "size": size,
                "total_count": total_count,
                "total_pages": total_pages,
                "message": "OK",
            }
        ).data
        return Response(resp, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────
# [GET] /api/news/{news_seq}/  뉴스 상세
# ─────────────────────────────────────────────────────────────
class NewsDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, news_seq: int):
        req = NewsDetailRequestSerializer(data={"news_seq": news_seq})
        try:
            req.is_valid(raise_exception=True)
        except Exception:
            return Response({"message": "잘못된 요청입니다."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            obj = NewsPost.objects.get(news_seq=req.validated_data["news_seq"])
        except NewsPost.DoesNotExist:
            return Response({"message": "존재하지 않는 뉴스입니다."}, status=status.HTTP_404_NOT_FOUND)

        data = NewsDetailResponseSerializer(obj, context={"message": "OK"}).data
        return Response(data, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────
# [POST] /api/admins/news/  뉴스 생성(관리자)
#   - image_key 가 null/"" 로 오면 제거하여 검증 통과율 개선
#   - DEBUG 모드에서는 ser.errors 반환
# ─────────────────────────────────────────────────────────────
class AdminNewsCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSuperAdmin]

    def post(self, request):
        payload = request.data.copy()
        # image_key 가 null/"" 로 오면 제거 (CharField allow_null=True라도 깔끔하게 처리)
        if payload.get("image_key") in (None, "", "null"):
            payload.pop("image_key", None)

        ser = NewsCreateRequestSerializer(data=payload, context={"request": request})
        try:
            ser.is_valid(raise_exception=True)
        except Exception:
            resp = {"message": "잘못된 요청입니다."}
            if getattr(settings, "DEBUG", False):
                resp["errors"] = ser.errors
                resp["received"] = payload
            return Response(resp, status=status.HTTP_400_BAD_REQUEST)

        obj = ser.save()  # published_by = request.user, category=int 변환 포함
        resp = NewsCreateResponseSerializer(
            {
                "news_seq": obj.news_seq,
                "published_at": obj.published_at,
                "message": "뉴스가 등록되었습니다.",
            }
        ).data
        return Response(resp, status=status.HTTP_201_CREATED)


# ─────────────────────────────────────────────────────────────
# [PUT/PATCH/DELETE] /api/admins/news/{news_seq}/  뉴스 수정/삭제(관리자)
#   - 프런트에서 단건을 선택해 들어와 기존 내용을 수정하는 흐름에 맞춰
#     PUT/PATCH는 partial=True로 처리
#   - DELETE도 같은 경로에서 처리 (405 방지)
# ─────────────────────────────────────────────────────────────
class AdminNewsDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSuperAdmin]

    # PUT 전체, PATCH 부분 — 내부는 partial=True로 통일
    def put(self, request, news_seq: int):
        return self._update(request, news_seq, partial=True)

    def patch(self, request, news_seq: int):
        return self._update(request, news_seq, partial=True)

    def _update(self, request, news_seq: int, partial: bool):
        try:
            obj = NewsPost.objects.get(news_seq=news_seq)
        except NewsPost.DoesNotExist:
            return Response({"message": "존재하지 않는 뉴스입니다."}, status=status.HTTP_404_NOT_FOUND)

        payload = request.data.copy()
        if payload.get("image_key") in (None, "", "null"):
            payload.pop("image_key", None)

        ser = NewsUpdateRequestSerializer(
            instance=obj, data=payload, partial=partial, context={"request": request}
        )
        try:
            ser.is_valid(raise_exception=True)
        except Exception:
            resp = {"message": "잘못된 요청입니다."}
            if getattr(settings, "DEBUG", False):
                resp["errors"] = ser.errors
                resp["received"] = payload
            return Response(resp, status=status.HTTP_400_BAD_REQUEST)

        obj = ser.save()  # updated_by/updated_at 설정 포함
        resp = NewsUpdateResponseSerializer(
            {
                "news_seq": obj.news_seq,
                "updated_at": obj.updated_at,
                "message": "뉴스가 수정되었습니다.",
            }
        ).data
        return Response(resp, status=status.HTTP_200_OK)

    def delete(self, request, news_seq: int):
        # 명세상 바디 없음(검증용 빈 시리얼라이저)
        _ = NewsDeleteRequestSerializer(data={})
        _.is_valid(raise_exception=False)

        try:
            obj = NewsPost.objects.get(news_seq=news_seq)
        except NewsPost.DoesNotExist:
            return Response({"message": "존재하지 않는 뉴스입니다."}, status=status.HTTP_404_NOT_FOUND)

        # (선택) 삭제 이력 기록: 사유 없이 삭제자/시각만 저장
        try:
            NewsPostHistory.objects.create(
                news=obj,
                deleted_by=request.user,   # PROTECT이면 실제 사용자여야 함
                deleted_at=timezone.now(),
                deleted_reason=None,
            )
        except Exception:
            # 이력 기록 실패는 본 삭제에 영향 주지 않음
            pass

        obj.delete()
        resp = NewsDeleteResponseSerializer({"message": "뉴스가 삭제되었습니다."}).data
        return Response(resp, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────
# (관리자) 프리사인드 업로드 URL 발급
#  - POST /api/admins/news/uploads/urls/
#  - body: { "kind": "thumbnail" | "content", "filename": "abc.jpg", "content_type": "image/jpeg" }
#  - return: { "upload_url": "...", "key": "...", "public_url": "...", "content_type": "...", "message": "OK" }
#  - 버킷이 "Bucket owner enforced(ACL 비활성화)"면 ACL 옵션은 넣지 않습니다.
# ─────────────────────────────────────────────────────────────

THUMB_PREFIX = "news-thumbnail"
CONTENT_PREFIX = "news-content-img"


def _sanitize_filename(name: str) -> str:
    name = name.strip().replace("\\", "/").split("/")[-1]
    return re.sub(r"[^A-Za-z0-9._-]+", "_", name) or "upload.bin"


def _make_key_by_kind(kind: str, filename: str) -> str:
    # 날짜 폴더/uuid를 붙여서 충돌 최소화
    now = datetime.utcnow()
    safe = _sanitize_filename(filename)
    date_path = f"{now.year}/{now.month:02d}/{now.day:02d}"
    prefix = THUMB_PREFIX if kind == "thumbnail" else CONTENT_PREFIX
    return f"{prefix}/{date_path}/{uuid.uuid4().hex}-{safe}"


def _public_url_from_key(key: str) -> str:
    # CloudFront가 있으면 그 URL, 없으면 S3 정식 URL
    if getattr(settings, "CLOUDFRONT_DOMAIN", ""):
        dom = settings.CLOUDFRONT_DOMAIN.strip()
        scheme = "" if dom.startswith("http") else "https://"
        return f"{scheme}{dom}/{key}"
    return f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"


def _s3_client():
    # SigV4 강제 + (환경변수/Instance Profile) 자격증명 체인 사용
    return boto3.client(
        "s3",
        region_name=getattr(settings, "AWS_REGION", "ap-northeast-2"),
        config=Config(signature_version="s3v4"),
        aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", None) or None,
        aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", None) or None,
    )


class CreatePresignedUploadURLView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSuperAdmin]

    def post(self, request):
        kind = request.data.get("kind")  # "thumbnail" | "content"
        filename = request.data.get("filename")
        content_type = request.data.get("content_type")

        if kind not in ("thumbnail", "content"):
            return Response({"message": "kind가 잘못되었습니다.(thumbnail|content)"}, status=status.HTTP_400_BAD_REQUEST)
        if not filename:
            return Response({"message": "filename이 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

        # content_type이 비었거나 브라우저가 못 맞추면 합의된 기본값 사용
        if not content_type:
            content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"

        key = _make_key_by_kind(kind, filename)

        try:
            s3 = _s3_client()
            # ContentType을 presign에 넣으면, 프론트 PUT의 Content-Type과 반드시 동일해야 한다.
            upload_url = s3.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": settings.AWS_S3_BUCKET,
                    "Key": key,
                    "ContentType": content_type,
                },
                ExpiresIn=900,  # 15분 (가끔 실패 방지용)
            )
        except Exception as e:
            return Response(
                {"message": "업로드 URL 생성에 실패했습니다.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        public_url = _public_url_from_key(key)

        return Response(
            {
                "upload_url": upload_url,
                "key": key,
                "public_url": public_url,
                "content_type": content_type,
                "message": "OK",
            },
            status=status.HTTP_200_OK,
        )
