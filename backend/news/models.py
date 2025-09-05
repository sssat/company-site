# models.py => 데이터베이스 구조(스키마)를 정의하는 파일 (ERD 설계도를 토대로 작성). 그리고 이게 Entity(DB 테이블 구조)이다.
# models.py 안에 클래스를 정의하면 장고가 알아서 DB 테이블로 바꿔준다.
# 만약 models.py를 바꾸면 새로운 마이그레이션을 만들고 다시 migrate 해야한다.

from django.db import models         # 장고에서 DB와 관련된 모든 기능(ORM 필드, 모델 클래스 등)이 들어있는 모듈
from django.utils import timezone    # 장고가 제공하는 시간/날짜 유틸리티 모듈

# ─────────────────────────────────────────────────────────────
# 뉴스글 (T_NEWS_POST)
# ─────────────────────────────────────────────────────────────
class NewsPost(models.Model):
    # 뉴스글 일련번호
    news_seq = models.AutoField(primary_key=True, db_column="NEWS_SEQ")

    # 작성자 일련번호: FK => 객체
    published_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        db_column="PUBLISHED_SEQ",
        related_name="published_news_posts",
    )

    # 수정자 일련번호: FK => 객체
    updated_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,    # SET_NULL: 부모가 삭제되면(FK가 가리키던 레코드가 없어지면) 자식의 외래키 값을 NULL로 바꿈
        null=True, blank=True,
        db_column="UPDATED_SEQ",
        related_name="updated_news_posts",
    )

    # 뉴스 제목
    title = models.CharField(max_length=200, db_column="TITLE")

    # 뉴스 내용
    content = models.TextField(db_column="CONTENT")

    # 썸네일 이미지 경로
    thumbnail_url = models.CharField(max_length=255, db_column="THUMBNAIL_URL", null=True, blank=True)

    # 등록 일시
    published_at = models.DateTimeField(db_column="PUBLISHED_AT", default=timezone.now)

    # 카테고리
    category = models.PositiveSmallIntegerField(
        choices=(
            (0, "전체"),
            (1, "내부발표"),
            (2, "외부발표")
        ),
        default=0,
    )

    # 기사 내부 이미지 경로
    image_url = models.CharField(max_length=255, null=True, blank=True, db_column="IMAGE_URL")

    # 수정 일시
    updated_at = models.DateTimeField(null=True, blank=True, db_column="UPDATED_AT")

    # 기사 요약
    excerpt = models.CharField(max_length=500, db_column="EXCERPT")

    # 기사 배지(PRESS RELEASE)
    badge = models.CharField(max_length=50, db_column="BADGE")

    class Meta:
        db_table = "T_NEWS_POST"
        ordering = ["-published_at"]   # 기사 등록 일시 최신순으로 정렬

    def __str__(self):
        return f"[{self.news_seq}] {self.title}"  # 예: [123] 뉴스 제목


# ─────────────────────────────────────────────────────────────
# 뉴스글 이력 (삭제 기록) (T_NEWS_POST_HISTORY)
# ─────────────────────────────────────────────────────────────
class NewsPostHistory(models.Model):
    # 이력 일련번호
    history_seq = models.AutoField(primary_key=True, db_column="HISTORY_SEQ")

    # 뉴스글 일련번호: FK => 객체
    news = models.ForeignKey(
        "news.NewsPost",
        on_delete=models.SET_NULL,   # SET_NULL: 부모가 삭제되면(FK가 가리키던 레코드가 없어지면) 자식의 외래키 값을 NULL로 바꿈
        null=True, blank=True,       # SET_NULL로 설정하면 해당 FK 필드는 null = true여야 한다.
        db_column="NEWS_SEQ",
        related_name="histories",
    )

    # 삭제자 일련번호: FK => 객체
    deleted_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,    # PROTECT: User 삭제 시 참조 중인 NewsPostHistory가 있으면 삭제가 안됨 -> 따라서 User를 지우려면 NewsPostHistory 먼저 삭제해야됨
        db_column="DELETED_SEQ",
        related_name="news_deletions",
    )

    # 삭제 시각
    deleted_at = models.DateTimeField(db_column="DELETED_AT")

    # 삭제 이유
    deleted_reason = models.CharField(max_length=255, null=True, blank=True, db_column="DELETED_REASON")

    class Meta:
        db_table = "T_NEWS_POST_HISTORY"

    # 1. self란? => 클래스 안에서 자기 자신(instance)을 가리키는 변수. 클래스 안에서 객체 자신의 변수나 함수에 접근할 때 사용
    # 2. __str__ 함수란? => 객체를 출력할 때 어떻게 보여줄지를 결정하는 메서드

    # Django에서 ForeignKey로 선언된 필드(여기선 news)는 부모 모델의 객체를 가리킨다.
    # 즉, self.news는 NewsPost 모델의 객체이다.
    # 그리고 이 객체가 어떤 문자열로 출력될지는, 그 모델(부모 클래스) 내부의 __str__ 메서드에 의해 결정된다.
    # NewsPost의 __str__ 메서드는 f"[{self.news_seq}] {self.title}" 이렇게 돼있으므로, 출력 시 "[45] 뉴스 제목" 처럼 출력된다.
    def __str__(self):
        return f"news={self.news} deleted_at={self.deleted_at}" # 예: news=[45] 뉴스 제목 deleted_at=2025-09-03 14:05:12+09:00

