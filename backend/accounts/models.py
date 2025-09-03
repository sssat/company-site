from django.db import models

# Create your models here.
# models.py => 데이터베이스 구조(스키마)를 정의하는 파일 (ERD 설계도를 토대로 작성)
# models.py 안에 클래스를 정의하면 장고가 알아서 DB 테이블로 바꿔준다.
# 만약 models.py를 바꾸면 새로운 마이그레이션을 만들고 다시 migrate 해야한다.

from django.db import models         # 장고에서 DB와 관련된 모든 기능(ORM 필드, 모델 클래스 등)이 들어있는 모듈
from django.utils import timezone    # 장고가 제공하는 시간/날짜 유틸리티 모듈

# ─────────────────────────────────────────────────────────────
# 회원 등급 (T_USER_LEVEL)
# 현재로썬 등급이 "[등급 0] 일반", "[등급 1] 관리자", "[등급 2] 슈퍼관리자"의 3개 등급만 있으므로 회원 등급 테이블에는 3개의 데이터만 존재할 예정이다.
# 그리고 이 테이블은 python manage.py migrate 하기 전에 미리 3건(0/1/2) 시드 데이터를 python manage.py makemigrations 해놔야한다.
# ─────────────────────────────────────────────────────────────
class UserLevel(models.Model):
    # 회원등급코드 (PK, tinyint)
    grade_code = models.PositiveSmallIntegerField(
        primary_key=True,
        db_column="GRADE_CODE", # DB 테이블에서 실제 컬럼 이름을 GRADE_CODE로 지정 (만약 따로 지정하지 않는다면 필드(grade_code = models.PositiveSmallIntegerField) 이름인 grade_code가 DB 칼럼명이 된다.)
    )
    # 회원 등급명
    grade_name = models.CharField(
        max_length=20,
        db_column="GRADE_NAME",
    )

    class Meta:
        db_table = "T_USER_LEVEL"  # 이 모델이 실제 DB에 만들어질 때의 테이블 이름을 T_USER_LEVEL로 설정

    def __str__(self): 
        return f"[등급 {self.grade_code}] {self.grade_name}"   # 예: "[등급 0] 일반", "[등급 1] 관리자", "[등급 2] 슈퍼관리자"


# ─────────────────────────────────────────────────────────────
# 회원 (T_USER)
# ─────────────────────────────────────────────────────────────
class User(models.Model):
    # 회원일련번호 (PK)
    user_seq = models.AutoField(primary_key=True, db_column="USER_SEQ")

    # on_delete 옵션
    # CASCADE: UserLevel 삭제 시 -> 참조하는 User도 자동 삭제됨
    # PROTECT: UserLevel 삭제 시 참조 중인 User가 있으면 삭제가 안됨 -> 따라서 UserLevel를 지우려면 User 먼저 삭제해야됨 

    # related_name: 역참조 이름 => 부모 모델(테이블)에서 자식 모델(테이블)의 ForeignKey, OneToOneField, ManyToManyField에 접근할때 자동으로 정하는 이름
    # related_name을 지정하지 않으면 장고가 기본 이름을 만드는데, 모델명소문자_set과 같이 만든다.
    # related_name을 user라고 지정하면 회원등급 테이블에서 회원 테이블에 접근할 때 UserLevel 인스턴스(예: level).user로 접근하고, 지정하지 않으면 UserLevel 인스턴스(예: level).user_set으로 접근한다.

    # 회원등급번호 FK (tinyint) => 장고에서 ForeignKey로 선언된 필드는 객체이고, 그 외 나머지 애들(AutoField, CharField, ...)등은 단순 값이다.
    # ForeignKey만 객체인 이유 => ForeignKey는 다른 테이블(모델)과 관계를 맺는 필드이기 때문에 Django ORM은 DB에 저장된 정수형 PK 를 가져오면서,
    # 자동으로 연결된 다른 모델의 인스턴스(객체) 로 변환해준다.
    grade_code = models.ForeignKey( 
        UserLevel,                 # 자동으로 UserLevel 테이블의 PK 참조
        on_delete=models.PROTECT,  # 등급 삭제로 회원이 깨지지 않도록 보호
        db_column="GRADE_CODE",
        related_name="users",
    )

    # 이메일: 중복되면 안됨(unique)
    email = models.EmailField(max_length=150, db_column="EMAIL", unique=True)

    # 아이디: 중복되면 안됨(unique)
    user_id = models.CharField(max_length=50, db_column="USER_ID", unique=True)

    # 사용자 이름
    user_name = models.CharField(max_length=100, db_column="USER_NAME")

    # 비밀번호 해시
    password_hash = models.CharField(max_length=255, db_column="PASSWORD_HASH")

    # 성별: M/F (기본값 강제하지 않음 → 반드시 선택/입력하도록)
    gender = models.CharField(
        max_length=1, 
        choices=(
            ("M", "남성"),
            ("F", "여성"),
        ),
        db_column="GENDER") 
    
    # 생년월일
    birth_date = models.DateField(db_column="BIRTH_DATE")

    # 가입일
    joined_at = models.DateTimeField(db_column="JOINED_AT", default=timezone.now)

    # 최종 접속 시간
    last_login_at = models.DateTimeField(null=True, blank=True, db_column="LAST_LOGIN_AT")

    # 관리자 등급 부여 일시
    granted_at = models.DateTimeField(null=True, blank=True, db_column="GRANTED_AT")   # DB에 비워 넣으려면 → null=True. 폼/API에서 빈값 허용하려면 → blank=True

    # 계정 생성 일시
    created_at = models.DateTimeField(db_column="CREATED_AT", default=timezone.now)

    # 회원 정보 수정 일시
    updated_at = models.DateTimeField(null=True, blank=True, db_column="UPDATED_AT")

    class Meta:
        db_table = "T_USER"

    def __str__(self):
        return f"{self.user_id} ({self.user_name})"  # 예: asdf123 (홍길동)


# ─────────────────────────────────────────────────────────────
# 로그인 시도기록 (T_LOGIN_LOG)
# ─────────────────────────────────────────────────────────────
class LoginLog(models.Model):
    # 시도 일련번호: PK
    login_log_seq = models.AutoField(primary_key=True, db_column="LOGIN_LOG_SEQ")

    # 회원 일련번호: FK => 객체
    user = models.ForeignKey(
        User,
        on_delete=models.PROTECT,    # PROTECT: User 삭제 시 참조 중인 LoginLog가 있으면 삭제가 안됨 -> 따라서 User를 지우려면 LoginLog 먼저 삭제해야됨  
        db_column="USER_SEQ",
        related_name="login_logs",
    )

    # 사용자가 입력한 아이디(성공/실패 공통)
    input_id = models.CharField(max_length=50, db_column="INPUT_ID")

    # 로그인 시도 시각
    attempted_at = models.DateTimeField(db_column="ATTEMPTED_AT", default=timezone.now)

    # 성공 여부
    is_success = models.BooleanField(db_column="IS_SUCCESS")

    # IP 주소
    ip_address = models.CharField(max_length=45, db_column="IP_ADDRESS")

    # 유저 에이전트
    user_agent = models.TextField(null=True, blank=True, db_column="USER_AGENT")

    # 입력 비밀번호 해시값
    input_password_hash = models.CharField(max_length=255, null=True, blank=True, db_column="INPUT_PASSWORD_HASH")

    class Meta:
        db_table = "T_LOGIN_LOG"

    def __str__(self):
        return f"{self.input_id} @ {self.attempted_at} ({'SUCCESS' if self.is_success else 'FAIL'})"  # 예: asdf123 @ 2025-09-03 14:05:12+09:00 (SUCCESS)


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
        User,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        db_column="PROCESSED_SEQ",
        related_name="processed_inquiries",
    )

    # 삭제자 일련번호: FK => 객체
    deleted_by = models.ForeignKey(
        User,
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


# ─────────────────────────────────────────────────────────────
# 뉴스글 (T_NEWS_POST)
# ─────────────────────────────────────────────────────────────
class NewsPost(models.Model):
    # 뉴스글 일련번호
    news_seq = models.AutoField(primary_key=True, db_column="NEWS_SEQ")

    # 작성자 일련번호: FK => 객체
    published_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        db_column="PUBLISHED_SEQ",
        related_name="published_news_posts",
    )

    # 수정자 일련번호: FK => 객체
    updated_by = models.ForeignKey(
        User,
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
        NewsPost,
        on_delete=models.SET_NULL,   # SET_NULL: 부모가 삭제되면(FK가 가리키던 레코드가 없어지면) 자식의 외래키 값을 NULL로 바꿈
        null=True, blank=True,       # SET_NULL로 설정하면 해당 FK 필드는 null = true여야 한다.
        db_column="NEWS_SEQ",
        related_name="histories",
    )

    # 삭제자 일련번호: FK => 객체
    deleted_by = models.ForeignKey(
        User,
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

    # self.news는 위에서 정의한 news(뉴스글 일련번호: FK)
    # 장고가 자동으로 생성하는 보조 속성 <필드명>_id를 사용하면 
    def __str__(self):
        return f"news={self.news} deleted_at={self.deleted_at}" # 예: news=45 deleted_at=2025-09-03 14:05:12+09:00

