# models.py => 데이터베이스 구조(스키마)를 정의하는 파일
# models.py 안에 클래스를 정의하면 장고가 알아서 DB 테이블로 바꿔준다.

from django.db import models         # 장고에서 DB와 관련된 모든 기능(ORM 필드, 모델 클래스 등)이 들어있는 모듈
from django.utils import timezone    # 장고가 제공하는 시간/날짜 유틸리티 모듈

from django.db import models
from django.utils import timezone

# ─────────────────────────────────────────────────────────
# 회원 User
# ─────────────────────────────────────────────────────────
class User(models.Model):
    """회원 정보"""

    # PK: 회원일련번호
    user_seq = models.AutoField(primary_key=True)

    # 이메일: 중복되면 안됨(unique)
    email = models.EmailField(max_length=150, unique=True)

    # 가입일시
    joined_at = models.DateTimeField(default=timezone.now)

    # 성별: M/F (기본값 강제하지 않음 → 반드시 선택/입력하도록)
    gender = models.CharField(
        max_length=1,
        choices=(
            ("M", "남성"),
            ("F", "여성"),
        ),
    )

    # 비밀번호 해시
    password_hash = models.CharField(max_length=255)

    # 생년월일
    birth_date = models.DateField()

    # 이름
    username = models.CharField(max_length=100)

    # 아이디: 중복되면 안됨(unique)
    user_id = models.CharField(max_length=50, unique=True)

    # 최종 접속 시간
    last_login_at = models.DateTimeField(default=timezone.now)

    # 모델에 대한 메타데이터(부가 설정)를 정의하는 곳
    class Meta:
        db_table = "user"   # 이 모델이 실제 DB에 만들어질 때의 테이블 이름을 user로 설정

    def __str__(self):
        return f"{self.username}({self.user_id})"  # ex) “홍길동(hong123)”

# ─────────────────────────────────────────────────────────
# 관리자 Admin (User 1:1)
# ─────────────────────────────────────────────────────────
class Admin(models.Model):
    """관리자 정보 (회원과 1:1 매핑)"""

    # PK 겸 FK: 회원일련번호
    user = models.OneToOneField(     
        User,                         # OneToOneField(User) → User와 1:1 관계
        on_delete=models.CASCADE,     # on_delete=models.CASCADE → 해당 User가 삭제되면 Admin도 같이 삭제
        primary_key=True,
        db_column="user_seq",         # db_column="user_seq" → DB 테이블에서 실제 컬럼 이름을 user_seq로 사용 (없으면 기본 user_id로 자동 설정)
        help_text="관리자로 승격된 회원의 일련번호"  # help_text="..." → Django Admin에서 필드 설명으로 표시됨(없어도 됨)
    )

    # 관리자 등급(문자) — 단순 문자열
    admin_level = models.CharField(max_length=50, null=True, blank=True) # DB에 비워 넣으려면 → null=True. 폼/API에서 빈값 허용하려면 → blank=True

    # 권한 부여 일시
    granted_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "admin"

    def __str__(self):
        return f"Admin#{self.pk} / level={self.admin_level or '-'}"  # Admin: Admin#1 / level=super


# ─────────────────────────────────────────────────────────
# 로그인 시도 기록 LoginLog
# ─────────────────────────────────────────────────────────
class LoginLog(models.Model):
    """로그인 시도 이력"""

    # PK: 시도일련번호
    login_log_seq = models.AutoField(primary_key=True)

    # on_delete 옵션
    # CASCADE: User 삭제 → 참조하는 LoginLog도 자동 삭제됨
    # PROTECT: User 삭제 시 참조 중인 LoginLog가 있으면 삭제가 안됨 -> 따라서 User를 지우려면 LoginLog 먼저 삭제해야됨   

    # 회원일련번호(FK)
    user = models.ForeignKey(
        User,                       # 자동으로 User의 PK 참조
        on_delete=models.PROTECT,   
        db_column="user_seq"
    )

    # 입력한 아이디(문자 그대로)
    input_id = models.CharField(max_length=50)

    # 시도 시각
    attempted_at = models.DateTimeField(default=timezone.now)

    # 성공 여부
    is_success = models.BooleanField(default=False)

    # IP 주소(IPv4/IPv6 모두 수용)
    ip_address = models.CharField(max_length=45)

    # 실패 사유(성공 시 비워둘 수 있음)
    fail_reason = models.CharField(max_length=255, null=True, blank=True)

    # 유저 에이전트(브라우저/디바이스 정보)
    user_agent = models.TextField(null=True, blank=True)

    # 입력 비밀번호 해시
    input_password_hash = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = "login_log"

    def __str__(self):
        state = "OK" if self.is_success else "FAIL"  # is_success가 True면 "OK", 아니면 "FAIL"
        return f"[{state}] {self.input_id} @ {self.attempted_at:%Y-%m-%d %H:%M:%S}"  # [OK] hong123 @ 2025-08-25 21:14:03

# ─────────────────────────────────────────────────────────
# 문의하기 Inquiry
# ─────────────────────────────────────────────────────────
class Inquiry(models.Model):
    """문의 접수/처리"""

    # PK: 문의글 일련번호
    inquiry_seq = models.AutoField(primary_key=True)

    # 문의글 처리자(관리자): FK

    # related_name: 역참조 이름 => 부모 모델(테이블)에서 자식 모델(테이블)의 ForeignKey, OneToOneField, ManyToManyField에 접근할때 자동으로 정하는 이름
    # related_name을 지정하지 않으면 장고가 기본 이름을 만드는데, 모델명소문자_set과 같이 만든다.
    # 따라서 Admin에서 접근할 때 이름은 admin.inquiry_set이 되는데 여기선 외래키가 여러개 이므로 related_name으로 이름을 따로 지정해주지 않으면 똑같은 이름으로 생성되어 오류가 발생한다.
    processor = models.ForeignKey(
        Admin,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,   # SET_NULL: 부모가 삭제되면(FK가 가리키던 레코드가 없어지면) 이 외래키 값을 NULL로 바꿈 -> 어떤 문의글이 processor=Admin(3) 를 가리키고 있고, 그 Admin(3) 계정을 삭제하면, 그 문의글의 처리자 일련번호 컬럼이 그냥 NULL로 바뀌고 문의글 자체는 살아있음. 
        db_column="processor_seq",
        related_name="processed_inquiries",  
    )

    # 문의글 삭제자(관리자): FK
    deleted_by = models.ForeignKey(
        Admin,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        db_column="deleted_seq",
        related_name="deleted_inquiries",
    )

    # 문의자 이름
    name = models.CharField(max_length=100)

    # 문의자 이메일
    email = models.EmailField(max_length=150)

    # 문의 제목
    title = models.CharField(max_length=200)

    # 문의 내용
    message = models.TextField()

    # 문의 일시
    submitted_at = models.DateTimeField(default=timezone.now)

    # 처리 일시
    processed_at = models.DateTimeField(null=True, blank=True)

    # 처리 상태
    is_processed = models.BooleanField(default=False)

    # 삭제 일시
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "inquiry"

    def __str__(self):
        return f"#{self.inquiry_seq} {self.title}"  # ex) #5 로그인이 안돼요

# ─────────────────────────────────────────────────────────
# 뉴스글 NewsPost
# ─────────────────────────────────────────────────────────
class NewsPost(models.Model):
    """뉴스/보도 자료"""

    # PK: 뉴스글 일련번호
    news_seq = models.AutoField(primary_key=True)

    # 작성자(관리자): FK
    published_by = models.ForeignKey(
        Admin,
        on_delete=models.PROTECT,   # PROTECT: Admin 삭제 시 참조 중인 NewsPost가 있으면 삭제가 안됨 -> 따라서 Admin를 지우려면 NewsPost 먼저 삭제해야됨  
        db_column="published_seq",
        related_name="published_posts"
    )

    # 수정자(관리자): FK
    updated_by = models.ForeignKey(
        Admin,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        db_column="updated_seq",
        related_name="updated_posts"
    )

    # 삭제자(관리자): FK
    deleted_by = models.ForeignKey(
        Admin,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        db_column="deleted_seq",
        related_name="deleted_posts",  
    )

    # 뉴스 제목
    title = models.CharField(max_length=200)

    # 뉴스 본문 내용
    content = models.TextField()

    # 썸네일 이미지 경로
    thumbnail_url = models.CharField(max_length=255, null=True, blank=True)

    # 기사 내부 이미지 경로
    image_url = models.CharField(max_length=255, null=True, blank=True)

    # 작성 시각
    published_date = models.DateTimeField(default=timezone.now)

    # 수정 시각
    updated_date = models.DateTimeField(null=True, blank=True)

    # 삭제 시각
    deleted_date = models.DateTimeField(null=True, blank=True)

    # 카테고리(TINYINT)
    category = models.PositiveSmallIntegerField(
        choices=(
            (0, "전체"),
            (1, "내부발표"),
            (2, "외부발표")
        ),
        default=0,
    )

    # 기사 요약
    excerpt = models.CharField(max_length=500)

    # 기사 배지(PRESS RELEASE)
    badge = models.CharField(max_length=50)

    class Meta:
        db_table = "news_post"

    def __str__(self):
        return f"#{self.news_seq} {self.title}"   # ex) #5 기사 제목


# ─────────────────────────────────────────────────────────
# 파트너 고객사 PartnerClient
# ─────────────────────────────────────────────────────────
class PartnerClient(models.Model):
    """파트너/고객사 정보"""

    # PK: 고객사 일련번호
    client_seq = models.AutoField(primary_key=True)

    company_name = models.CharField(max_length=150)
    manager_name = models.CharField(max_length=100)
    manager_email = models.EmailField(max_length=150)
    phone = models.CharField(max_length=20)

    contract_start = models.DateField()
    contract_end = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "partner_client"

    def __str__(self):
        return self.company_name
