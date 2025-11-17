# inquiries/serializers.py  (inquiries 전용)
# DRF 요청/응답 시리얼라이저 모음
# 엔드포인트 가정(최신 정책 반영):
# - POST   /api/inquiries/                         -> 문의 등록
# - GET    /api/inquiries/                         -> 문의 목록(관리자)
# - GET    /api/inquiries/{inquiry_seq}/           -> 문의 단건 조회(관리자)
# - PUT    /api/inquiries/{inquiry_seq}/process/   -> 처리완료 전환(되돌리기 불가, 관리자)
# - DELETE /api/inquiries/{inquiry_seq}/           -> 영구 삭제(관리자)

from rest_framework import serializers
from .models import Inquiry

# ─────────────────────────────────────────────────────────────
# 공통 유틸/검증
# ─────────────────────────────────────────────────────────────

def _validate_message_len(value: str) -> str:
    # ContactForm 요구사항에 맞춰 최소 50자
    if len(value.strip()) < 50:
        raise serializers.ValidationError("문의 내용은 50자 이상 입력해주세요.")
    return value

NAME_REGEX = r"^(?=.{2,100}$)[가-힣a-zA-Z]+(?: [가-힣a-zA-Z]+)*$"

# ─────────────────────────────────────────────────────────────
# 1) 문의 등록 (POST /api/inquiries/)
# ─────────────────────────────────────────────────────────────

class InquiryCreateRequestSerializer(serializers.ModelSerializer):
    # 프론트가 subject를 보낸다면 title로 매핑
    subject = serializers.CharField(
        source="title",
        max_length=200,
        write_only=True,
        allow_blank=False,
        trim_whitespace=True,
    )

    class Meta:
        model = Inquiry
        # name/email/title/message 는 모델 필드. title은 subject alias로 입력받음
        fields = ("name", "email", "subject", "message")

    name = serializers.RegexField(
        regex=NAME_REGEX,
        max_length=100,
        error_messages={
            "invalid": "이름은 2~100자 한글/영문과 공백만 사용할 수 있습니다.",
            "blank": "이름을 입력해주세요.",
        },
    )

    email = serializers.EmailField(
        max_length=150,
        error_messages={
            "invalid": "올바른 이메일 형식이 아닙니다.",
            "blank": "이메일을 입력해주세요.",
        },
    )

    def validate_message(self, value: str) -> str:
        return _validate_message_len(value)


class InquiryMiniSerializer(serializers.ModelSerializer):
    """공통 단건 응답에서 재사용: 관리자 화면 등에서 필요한 기본 필드"""
    subject = serializers.CharField(source="title", read_only=True)
    status_label = serializers.SerializerMethodField()

    class Meta:
        model = Inquiry
        read_only_fields = (
            "inquiry_seq",
            "name",
            "email",
            "title",
            "message",
            "submitted_at",
            "is_processed",
            "processed_at",
            "processed_by",
            # 정책 변경: 소프트 삭제 미사용 → deleted_* 출력 제외
        )
        fields = (
            "inquiry_seq",
            "name",
            "email",
            "subject",
            "message",
            "submitted_at",
            "is_processed",
            "processed_at",
            "processed_by",  # 기본 출력: FK의 PK
            "status_label",
        )

    def get_status_label(self, obj: Inquiry) -> str:
        return "처리완료" if obj.is_processed else "처리중"


class InquiryCreateResponseSerializer(serializers.Serializer):
    # 등록 성공 후 클라이언트가 바로 식별 가능하도록 키 몇 개만 반환
    inquiry_seq = serializers.IntegerField()
    message = serializers.CharField(default="문의가 등록되었습니다.")


# ─────────────────────────────────────────────────────────────
# 2) 문의 목록 (GET /api/inquiries/)
# ─────────────────────────────────────────────────────────────

class InquiryListRequestSerializer(serializers.Serializer):
    page = serializers.IntegerField(required=False, min_value=1, default=1)
    size = serializers.IntegerField(required=False, min_value=1, max_value=100, default=10)
    q = serializers.CharField(required=False, allow_blank=True)  # 제목/내용/이름 검색어
    status = serializers.ChoiceField(
        choices=("all", "pending", "done"),
        required=False,
        default="all",
        help_text="all|pending|done (is_processed 필터)",
    )
    order = serializers.ChoiceField(
        choices=("recent", "oldest"),
        required=False,
        default="recent",
        help_text="recent=submitted_at desc, oldest=asc",
    )


class InquiryListItemSerializer(InquiryMiniSerializer):
    """목록 아이템: message가 길 수 있으므로 excerpt(선택) 제공"""
    excerpt = serializers.SerializerMethodField()

    class Meta(InquiryMiniSerializer.Meta):
        fields = (
            "inquiry_seq",
            "name",
            "email",
            "subject",
            "excerpt",
            "submitted_at",
            "is_processed",
            "processed_at",
            "processed_by",
            "status_label",
        )

    def get_excerpt(self, obj: Inquiry) -> str:
        text = (obj.message or "").strip()
        return text if len(text) <= 120 else text[:120] + "…"


class InquiryListResponseSerializer(serializers.Serializer):
    page = serializers.IntegerField()
    size = serializers.IntegerField()
    total = serializers.IntegerField()
    total_pages = serializers.IntegerField()
    items = InquiryListItemSerializer(many=True)


# ─────────────────────────────────────────────────────────────
# 3) 문의 단건 조회 (GET /api/inquiries/{seq}/)
# ─────────────────────────────────────────────────────────────

class InquiryDetailResponseSerializer(InquiryMiniSerializer):
    """단건 상세: 메시지 전문 포함"""
    pass


# ─────────────────────────────────────────────────────────────
# 4) 처리완료 전환 (PUT /api/inquiries/{seq}/process/)
#    - 정책: 완료로 전환만 허용(되돌리기 불가)
#    - 엄격 모드: 요청값은 True만 허용
# ─────────────────────────────────────────────────────────────

class InquiryProcessRequestSerializer(serializers.Serializer):
    is_processed = serializers.BooleanField()

    def validate_is_processed(self, value: bool) -> bool:
        if value is not True:
            raise serializers.ValidationError("처리완료 전환만 허용됩니다.")
        return value


class InquiryProcessResponseSerializer(serializers.ModelSerializer):
    subject = serializers.CharField(source="title", read_only=True)
    status_label = serializers.SerializerMethodField()

    class Meta:
        model = Inquiry
        fields = (
            "inquiry_seq",
            "subject",
            "is_processed",
            "processed_at",
            "processed_by",
            "status_label",
        )
    def get_status_label(self, obj: Inquiry) -> str:
        return "처리완료" if obj.is_processed else "처리중"


# ─────────────────────────────────────────────────────────────
# 5) 삭제 (DELETE /api/inquiries/{seq}/)
#    - 정책: 항상 영구 삭제
# ─────────────────────────────────────────────────────────────

class InquiryDeleteResponseSerializer(serializers.Serializer):
    inquiry_seq = serializers.IntegerField()
    deleted = serializers.BooleanField()
    message = serializers.CharField(default="영구 삭제되었습니다.")
