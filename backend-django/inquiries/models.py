# inquiries/models.py

from django.db import models         
from django.utils import timezone    

# ─────────────────────────────────────────────────────────────
# 1. 문의하기 (T_INQUIRY)
# ─────────────────────────────────────────────────────────────
class Inquiry(models.Model):
    # 문의글 일련번호
    inquiry_seq = models.AutoField(primary_key=True, db_column="INQUIRY_SEQ")

    # related_name: 역참조 이름 => 부모 모델(테이블)에서 자식 모델(테이블)의 ForeignKey, OneToOneField, ManyToManyField에 접근할때 자동으로 정하는 이름
    # related_name을 지정하지 않으면 장고가 기본 이름을 만드는데, 모델명소문자_set과 같이 만든다.
    # 따라서 User에서 접근할 때 이름은 <User 인스턴스>.inquiry_set이 되는데 여기선 외래키가 여러개 이므로 related_name으로 이름을 따로 지정해주지 않으면 똑같은 이름으로 생성되어 오류가 발생한다.

    # 처리자 일련번호: FK => 객체
    processed_by = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        db_column="PROCESSED_SEQ",
        related_name="processed_inquiries",
    )

    # 문의자 이름
    name = models.CharField(max_length=100, db_column="NAME")

    # 문의자 이메일
    email = models.EmailField(max_length=150, db_column="EMAIL")

    # 문의글 제목
    title = models.CharField(max_length=200, db_column="TITLE")

    # 문의글 내용
    message = models.TextField(db_column="MESSAGE")

    # 문의글 제출 일시
    submitted_at = models.DateTimeField(db_column="SUBMITTED_AT", default=timezone.now)

    # 문의글 처리 일시
    processed_at = models.DateTimeField(null=True, blank=True, db_column="PROCESSED_AT")

    # 처리상태
    is_processed = models.BooleanField(default=False, db_column="IS_PROCESSED")

    class Meta:
        db_table = "T_INQUIRY"

    def __str__(self):
        return f"[{self.inquiry_seq}] {self.title}"  # 예: [123] 로그인이 안됩니다.


