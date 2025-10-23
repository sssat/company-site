# models.py => 데이터베이스 구조(스키마)를 정의하는 파일 (ERD 설계도를 토대로 작성). 그리고 이게 Entity(DB 테이블 구조)이다.
# models.py 안에 클래스를 정의하면 장고가 알아서 DB 테이블로 바꿔준다.
# 만약 models.py를 바꾸면 새로운 마이그레이션을 만들고 다시 migrate 해야한다.

from django.db import models         # 장고에서 DB와 관련된 모든 기능(ORM 필드, 모델 클래스 등)이 들어있는 모듈
from django.utils import timezone    # 장고가 제공하는 시간/날짜 유틸리티 모듈

# ─────────────────────────────────────────────────────────────
# 1. 회원 등급 (T_USER_LEVEL)
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

    # 이곳에서의 출력 값이 장고 어드민 페이지에 출력된다.
    def __str__(self): 
        return f"[등급 {self.grade_code}] {self.grade_name}"   # 예: "[등급 0] 일반", "[등급 1] 관리자", "[등급 2] 슈퍼관리자"


# ─────────────────────────────────────────────────────────────
# 2. 회원 (T_USER)
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

    # 회원등급번호 FK (tinyint) => 장고에서 ForeignKey로 선언된 필드는 부모 클래스(모델)의 객체이고, 
    # 그 외 나머지 애들(AutoField, CharField, ...)등은 단순 값이다.
    # 즉, 여기서 grade_code 필드는 UserLevel 모델의 객체이다. 
    # 따라서 만약 User 모델의 __str__메서드에서 self.grade_code를 출력하면 UserLevel의 __str__ 메서드가 호출된다.
    grade_code = models.ForeignKey( 
        "accounts.UserLevel",        # 자동으로 UserLevel 테이블의 PK 참조
        on_delete=models.PROTECT,    # 등급 삭제로 회원이 깨지지 않도록 보호
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

    # 비밀번호 변경 일시
    password_changed_at = models.DateTimeField(null=True, blank=True, default=None, db_column="PASSWORD_CHANGED_AT")

    # 성별: M/F (기본값 강제하지 않음 -> 반드시 선택/입력하도록)
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

    # 관리자(admin) 등급 부여 일시
    # 관리자에서 일반 유저로 강등되면 null 값으로 대체됨
    granted_at = models.DateTimeField(null=True, blank=True, db_column="GRANTED_AT")   # DB에 비워 넣으려면 -> null=True. 폼/API에서 빈값 허용하려면 -> blank=True


    # <함수 vs 프로퍼티>
    # 함수: obj.func() 처럼 괄호로 호출해야 함
    # 프로퍼티: obj.prop 처럼 괄호 없이 접근 가능

    # <아래 프로퍼티 직접 구현한 이유>
    # 원래 이처럼 AbstractBaseUser 클래스 안에 정의되어 있는데 User 모델이 AbstractBaseUser를 상속받지 않고 models.Model만 단독으로 상속받고 있기때문
    # class AbstractBaseUser:
    #     @property
    #     def is_authenticated(self):
    #         return True  
    # 
    #     @property
    #     def is_anonymous(self):
    #         return False
    # 로그인 성공 시: request.user = User -> is_authenticated=True, is_anonymous=False

    # 이 객체(User)가 로그인된 사용자다 라는 표시 -> 항상 True를 반환하므로, 이 모델 객체는 "인증된 사용자"로 간주됨
    @property
    def is_authenticated(self) -> bool:
        return True
    
    # 이 객체가 익명 사용자(로그인 안 된 상태) 인지 확인 -> 항상 False를 반환하므로, 이 모델 객체는 "익명 사용자가 아니다"로 간주됨 
    @property
    def is_anonymous(self) -> bool:
        return False

    class Meta:
        db_table = "T_USER"

    def __str__(self):
        return f"[{self.user_seq}] {self.user_id} ({self.user_name})"  # 예: asdf123 (홍길동)


# ─────────────────────────────────────────────────────────────
# 3. 로그인 시도기록 (T_LOGIN_LOG)
# ─────────────────────────────────────────────────────────────
class LoginLog(models.Model):
    # 시도 일련번호: PK
    login_log_seq = models.AutoField(primary_key=True, db_column="LOGIN_LOG_SEQ")

    # 회원 일련번호: FK => 객체
    # 실패 시도(미존재 아이디)도 남기려면 null/blank 허용
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,   # PROTECT: User 삭제 시 참조 중인 LoginLog가 있으면 삭제가 안됨 -> 따라서 User를 지우려면 LoginLog 먼저 삭제해야됨  
        db_column="USER_SEQ",
        related_name="login_logs",
        null=True,
        blank=True,
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
        # DB(UTC) -> 현재 타임존(Asia/Seoul)으로 변환
        dt = timezone.localtime(self.attempted_at)

        # 보기 좋은 포맷(초까지, +09:00 포함)
        when = dt.isoformat(sep=" ", timespec="seconds")  # 예: 2025-09-28 15:38:37+09:00

        return f"[{self.login_log_seq}] {self.input_id} @ {when} ({'SUCCESS' if self.is_success else 'FAIL'})"  # 예: [25] asdf123 @ 2025-09-03 14:05:12+09:00 (SUCCESS)


