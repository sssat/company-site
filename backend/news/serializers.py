# news/serializers.py
from __future__ import annotations

from typing import List, Optional

from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import serializers

from .models import NewsPost

# ─────────────────────────────────────────────────────────────
# 카테고리 매핑 유틸
#   - 모델: 0(전체), 1(내부발표), 2(외부발표)
#   - API:  "ALL" | "INTERNAL" | "EXTERNAL"
# ─────────────────────────────────────────────────────────────
CATEGORY_INT_TO_STR = {0: "ALL", 1: "INTERNAL", 2: "EXTERNAL"}
CATEGORY_STR_TO_INT = {"ALL": 0, "INTERNAL": 1, "EXTERNAL": 2}


def category_int_to_str(v: Optional[int]) -> Optional[str]:
    if v is None:
        return None
    return CATEGORY_INT_TO_STR.get(v, str(v))


def category_str_to_int(v: Optional[str]) -> Optional[int]:
    if v is None:
        return None
    upper = str(v).strip().upper()
    if upper not in CATEGORY_STR_TO_INT:
        raise serializers.ValidationError("유효하지 않은 카테고리입니다. (ALL|INTERNAL|EXTERNAL)")
    return CATEGORY_STR_TO_INT[upper]


def public_url_from_key(key: str) -> str:
    """
    CLOUDFRONT_DOMAIN 이 설정되어 있으면 CloudFront URL,
    아니면 S3 정식 URL을 생성한다.
    """
    cdn = (settings.CLOUDFRONT_DOMAIN or "").strip()
    if cdn:
        scheme = "" if cdn.startswith("http") else "https://"
        return f"{scheme}{cdn}/{key}"
    return f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"


# ─────────────────────────────────────────────────────────────
# 키 프리픽스 판별
# ─────────────────────────────────────────────────────────────
def _is_thumb_key(key: str) -> bool:
    """news-thumbnail/ 로 시작하는지 체크"""
    k = str(key).lstrip("/")
    return k.startswith("news-thumbnail/")

# (참고) 콘텐츠 이미지는 news-content-img/ 를 사용하지만
# 서버에서는 content 키로 대표/썸네일을 건드리지 않기 때문에 별도 처리 없음.


# ─────────────────────────────────────────────────────────────
# 공통: 뉴스 요약 아이템(목록의 items[] 한 줄)
# 목록 화면에 보여줄 뉴스 한 건을 깔끔한 응답 형태로 만들어주는 시리얼라이저
# ─────────────────────────────────────────────────────────────
class NewsSummaryResponseSerializer(serializers.ModelSerializer):
    # 카테고리는 API 표기 문자열로 변환
    category = serializers.SerializerMethodField()

    class Meta:
        model = NewsPost
        fields = (
            "news_seq",
            "title",
            "excerpt",
            "badge",
            "thumbnail_url",
            "category",
            "published_at",
        )
        read_only_fields = fields

    def get_category(self, obj):
        # obj가 모델이면 속성, dict면 키로 접근
        val = getattr(obj, "category", None)
        if val is None and isinstance(obj, dict):
            val = obj.get("category")
        # 이미 문자열(예: 'INTERNAL')이면 그대로 반환
        if isinstance(val, str):
            return val
        # 정수라면 라벨로 변환
        return category_int_to_str(val) if val is not None else None


# ─────────────────────────────────────────────────────────────
# [GET] /api/news/  뉴스 목록 조회
# ─────────────────────────────────────────────────────────────
class NewsListRequestSerializer(serializers.Serializer):
    """뉴스 목록 조회 쿼리 파라미터 검증"""

    q = serializers.CharField(required=False, allow_blank=True, help_text="제목/요약 검색어")
    category = serializers.ChoiceField(
        required=False,
        choices=["INTERNAL", "EXTERNAL", "ALL"],
        help_text="카테고리 필터",
    )
    page = serializers.IntegerField(required=False, min_value=1, default=1)
    size = serializers.IntegerField(required=False, min_value=1, max_value=24, default=6)
    sort = serializers.CharField(required=False, allow_blank=True, help_text="정렬 (예: published_at(desc))")

    def validate_sort(self, v: str) -> str:
        s = (v or "").strip().lower()
        if not s:
            return "-published_at"
        if s in ("-published_at", "published_at", "published_at(desc)", "published_at(asc)"):
            return "-published_at" if s in ("-published_at", "published_at(desc)") else "published_at"
        raise serializers.ValidationError("지원하지 않는 정렬 형식입니다.")

    def to_internal_value(self, data):
        iv = super().to_internal_value(data)
        cat_str = iv.get("category")
        iv["category_int"] = category_str_to_int(cat_str) if cat_str else None
        return iv


class NewsListResponseSerializer(serializers.Serializer):
    """뉴스 목록 응답(페이지네이션 포함)"""

    items = NewsSummaryResponseSerializer(many=True)
    page = serializers.IntegerField()
    size = serializers.IntegerField()
    total_count = serializers.IntegerField()
    total_pages = serializers.IntegerField()
    message = serializers.CharField()


# ─────────────────────────────────────────────────────────────
# [GET] /api/news/{news_seq}/  뉴스 상세
# ─────────────────────────────────────────────────────────────
class NewsDetailRequestSerializer(serializers.Serializer):
    """뉴스 상세 조회 경로 파라미터 검증"""

    news_seq = serializers.IntegerField(min_value=1)


class NewsDetailResponseSerializer(serializers.ModelSerializer):
    """뉴스 상세 응답"""

    category = serializers.SerializerMethodField()
    slug = serializers.SerializerMethodField()
    body = serializers.SerializerMethodField()
    message = serializers.SerializerMethodField()

    class Meta:
        model = NewsPost
        fields = (
            "news_seq",
            "slug",
            "title",
            "badge",
            "category",
            "image_url",
            "thumbnail_url",
            "published_at",
            "updated_at",
            "excerpt",
            "body",
            "message",
        )
        read_only_fields = fields

    def get_category(self, obj: NewsPost) -> Optional[str]:
        return category_int_to_str(obj.category)

    def get_slug(self, obj: NewsPost) -> str:
        return slugify(obj.title or "")

    def get_body(self, obj: NewsPost) -> List[str]:
        raw = (obj.content or "").replace("\r\n", "\n")
        paragraphs: List[str] = [p.strip() for p in raw.split("\n\n") if p.strip()]
        return paragraphs

    def get_message(self, obj: NewsPost) -> str:
        return self.context.get("message", "OK")


# ─────────────────────────────────────────────────────────────
# [POST] /api/admins/news/  뉴스 작성
#   - image_key(optional): news-thumbnail/ 인 경우에만 thumbnail_url 세팅
#   - image_url 은 클라이언트가 명시적으로 보낸 경우에만 저장
# ─────────────────────────────────────────────────────────────
class NewsCreateRequestSerializer(serializers.ModelSerializer):
    # API에서 문자열로 들어오는 카테고리
    category = serializers.ChoiceField(choices=["ALL", "INTERNAL", "EXTERNAL"])
    # 배지 추가
    badge = serializers.CharField(required=True, allow_blank=False, max_length=50)
    # 업로드 키(프리사인드 업로드 후 프런트가 전달)
    image_key = serializers.CharField(required=False, allow_blank=False, max_length=512)

    class Meta:
        model = NewsPost
        fields = (
            "title",
            "excerpt",
            "content",
            "category",
            "badge",
            "thumbnail_url",
            "image_url",
            "image_key",
        )

    def validate_title(self, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise serializers.ValidationError("제목을 입력해주세요.")
        if len(v) > 200:
            raise serializers.ValidationError("제목은 200자 이내여야 합니다.")
        return v

    def validate_excerpt(self, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise serializers.ValidationError("요약(excerpt)을 입력해주세요.")
        if len(v) > 500:
            raise serializers.ValidationError("요약은 500자 이내여야 합니다.")
        return v

    def validate(self, attrs):
        # 카테고리 문자열 -> 내부 int
        attrs["category_int"] = category_str_to_int(attrs.get("category"))

        # 배지 필수 검증 (공백 제거 후 비어있으면 에러)
        b = (attrs.get("badge") or "").strip()
        if not b:
            raise serializers.ValidationError({"badge": "배지는 필수 입력 항목입니다."})
        attrs["badge"] = b

        # image_key가 news-thumbnail/ 인 경우에만 thumbnail_url을 세팅
        key = attrs.get("image_key")
        if key and _is_thumb_key(key):
            url = public_url_from_key(key)
            attrs["thumbnail_url"] = url
        # content 키는 무시(본문에서만 사용), image_url 은 클라이언트가 보낸 값 사용
        return attrs

    def create(self, validated_data):
        req = self.context.get("request")
        if not req or not getattr(req, "user", None) or not req.user.is_authenticated:
            raise serializers.ValidationError("작성자 정보가 없습니다. (인증 필요)")

        # 내부 변환/임시 필드 제거
        validated_data.pop("category", None)
        validated_data.pop("image_key", None)
        category_int = validated_data.pop("category_int", None)

        obj = NewsPost.objects.create(
            published_by=req.user,
            category=category_int,
            **validated_data,
        )
        return obj


class NewsCreateResponseSerializer(serializers.Serializer):
    news_seq = serializers.IntegerField()
    published_at = serializers.DateTimeField()
    message = serializers.CharField()


# ─────────────────────────────────────────────────────────────
# [PUT/PATCH] /api/admins/news/{news_seq}/  뉴스 수정
#   - 부분 수정 허용
#   - remove_* → image_key(있으면 새로 세팅) → 일반 필드 순으로 적용
#   - image_key(news-thumbnail/*)는 thumbnail_url만 변경
# ─────────────────────────────────────────────────────────────
class NewsUpdateRequestSerializer(serializers.ModelSerializer):
    # 부분 수정 허용
    title = serializers.CharField(required=False, allow_blank=False, max_length=200)
    excerpt = serializers.CharField(required=False, allow_blank=False, max_length=500)
    content = serializers.CharField(required=False, allow_blank=False)
    category = serializers.ChoiceField(required=False, choices=["ALL", "INTERNAL", "EXTERNAL"])
    # 수정에서는 선택이지만 빈 문자열은 금지
    badge = serializers.CharField(required=False, allow_blank=False, max_length=50)

    thumbnail_url = serializers.CharField(required=False, allow_blank=True, max_length=255)
    image_url = serializers.CharField(required=False, allow_blank=True, max_length=255)

    # 파일 제거 플래그
    remove_thumbnail = serializers.BooleanField(required=False, default=False)
    remove_image = serializers.BooleanField(required=False, default=False)

    # 업로드 키(프리사인드 업로드 후 프런트가 전달)
    image_key = serializers.CharField(required=False, allow_blank=False, max_length=512)

    class Meta:
        model = NewsPost
        fields = (
            "title",
            "excerpt",
            "content",
            "category",
            "badge",
            "thumbnail_url",
            "remove_thumbnail",
            "image_url",
            "remove_image",
            "image_key",
        )

    def validate(self, attrs):
        # 카테고리 문자열을 int로 변환(옵션)
        if "category" in attrs and attrs["category"] is not None:
            attrs["category_int"] = category_str_to_int(attrs.get("category"))

        # 배지 전달 시 공백 금지 + 트림
        if "badge" in attrs:
            b = (attrs.get("badge") or "").strip()
            if not b:
                raise serializers.ValidationError({"badge": "배지는 빈 값일 수 없습니다."})
            attrs["badge"] = b
        return attrs

    def update(self, instance: NewsPost, validated_data):
        req = self.context.get("request")
        user = getattr(req, "user", None)

        # 1) 제거 플래그 우선 처리
        if validated_data.pop("remove_thumbnail", False):
            instance.thumbnail_url = None
        if validated_data.pop("remove_image", False):
            instance.image_url = None

        # 2) 카테고리 치환
        category_str = validated_data.pop("category", None)
        if category_str is not None:
            instance.category = validated_data.pop("category_int")

        # 3) image_key가 news-thumbnail/ 이면 썸네일만 교체 (대표 이미지는 건드리지 않음)
        key = validated_data.pop("image_key", None)
        if key and _is_thumb_key(key):
            url = public_url_from_key(key)
            instance.thumbnail_url = url
            # 요청에 thumbnail_url이 같이 들어왔어도 image_key를 우선
            validated_data.pop("thumbnail_url", None)

        # 4) 나머지 일반 필드 적용(+ badge)
        for k in ("title", "excerpt", "content", "thumbnail_url", "image_url", "badge"):
            if k in validated_data:
                setattr(instance, k, validated_data[k])

        # 5) 수정자/수정시각
        if user and getattr(user, "is_authenticated", False):
            instance.updated_by = user
        instance.updated_at = timezone.now()

        instance.save()
        return instance


class NewsUpdateResponseSerializer(serializers.Serializer):
    news_seq = serializers.IntegerField()
    updated_at = serializers.DateTimeField()
    message = serializers.CharField()


# ─────────────────────────────────────────────────────────────
# [DELETE] /api/admins/news/{news_seq}/  뉴스 삭제
# ─────────────────────────────────────────────────────────────
class NewsDeleteRequestSerializer(serializers.Serializer):
    """뉴스 삭제 요청: 바디 필드 없음(경로 파라미터는 URLConf/뷰에서 처리)"""
    pass


class NewsDeleteResponseSerializer(serializers.Serializer):
    message = serializers.CharField()
