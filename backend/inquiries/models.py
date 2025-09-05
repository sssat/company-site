# models.py => 데이터베이스 구조(스키마)를 정의하는 파일 (ERD 설계도를 토대로 작성). 그리고 이게 Entity(DB 테이블 구조)이다.
# models.py 안에 클래스를 정의하면 장고가 알아서 DB 테이블로 바꿔준다.
# 만약 models.py를 바꾸면 새로운 마이그레이션을 만들고 다시 migrate 해야한다.

from django.db import models         # 장고에서 DB와 관련된 모든 기능(ORM 필드, 모델 클래스 등)이 들어있는 모듈
from django.utils import timezone    # 장고가 제공하는 시간/날짜 유틸리티 모듈

# ─────────────────────────────────────────────────────────────
# 문의하기 (T_INQUIRY)
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

    # 삭제자 일련번호: FK => 객체
    deleted_by = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        db_column="DELETED_SEQ",
        related_name="deleted_inquiries",
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

    # 문의글 삭제일시
    deleted_at = models.DateTimeField(null=True, blank=True, db_column="DELETED_AT")

    class Meta:
        db_table = "T_INQUIRY"

    def __str__(self):
        return f"[{self.inquiry_seq}] {self.title}"  # 예: [123] 로그인이 안됩니다.


