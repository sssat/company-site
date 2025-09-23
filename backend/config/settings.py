# config/는 앱이 아니라 프로젝트 전체의 공통 설정을 담당하는 폴더이다.
# 1. settings.py: 프로젝트 전역의 환경을 정의한다.
# 2. urls.py: 프로젝트 전역 URL 라우팅을 관리한다.
# 3. wsgi.py: WSGI(Web Server Gateway Interface) 서버용 진입점 파일
# 4. asgi.py: ASGI(Asynchronous Server Gateway Interface) 서버용 진입점 파일
# 5. wsgi.py vs asgi.py 차이점
# (1) wsgi.py
# => 동기(Synchronous) 전용, 일반 웹 요청(HTTP), 전통적인 방식, 안정적
# (2) asgi.py
# => 비동기(Asynchronous) + 동기 둘 다 지원, 실시간 서비스(WebSocket), 채팅, 스트리밍, 동시성 처리에 강점
# 둘 다 배포할 때 쓰는 파일이고 서비스 성격에 따라 보통은 둘 중 하나만 쓴다. 그래서 회사소개 홈페이지 처럼 단순 HTTP 서비스라면 배포 시 wsgi.py만 사용한다.

import os
from pathlib import Path        
from datetime import timedelta  # JWT 수명 설정에 사용
import environ                  # .env 파일을 읽어 환경 변수로 파싱하는 라이브러리

# ───────────────── 기본 경로 ─────────────────
# backend/ 폴더를 프로젝트의 기준 경로로 설정함
# BASE_DIR = backend/
BASE_DIR = Path(__file__).resolve().parent.parent

# ───────────────── 환경변수(.env) 로드 ─────────────────
# .env 파일은 프로젝트 루트(BASE_DIR)에 둔다.
env = environ.Env(DEBUG=(bool, True))
environ.Env.read_env(BASE_DIR / ".env")

# ───────────────── 보안/디버그/호스트 ─────────────────
SECRET_KEY = env("SECRET_KEY")  # 장고의 암호화·서명에 쓰이는 프로젝트 고유 키
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])  # 장고가 요청 Host 헤더를 검증할 때 허용할 도메인/IP 목록

# ───────── Email (Gmail SMTP) ─────────
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

# TLS 권장 (587)
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_USE_SSL = False

EMAIL_HOST_USER = env("GMAIL_USER")          # ex) yourid@gmail.com
EMAIL_HOST_PASSWORD = env("GMAIL_APP_PASS")  # 구글 '앱 비밀번호' (일반 비번 아님)
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER

EMAIL_TIMEOUT = 15  # (선택) 타임아웃 보강

# ───────── 프론트 URL(메일 링크용) ─────────
FRONTEND_BASE_URL = env("FRONTEND_BASE_URL", default="http://127.0.0.1:5173")
PASSWORD_RESET_PATH = env("PASSWORD_RESET_PATH", default="/reset-password")

# ───────────────── 앱 등록 ─────────────────
# Django에 “이 프로젝트에서 사용할 앱 목록”을 등록
# Django에서 앱(App) 은 프로젝트 안의 기능 단위 모듈(패키지)이다. -> 프로젝트는 여러 앱으로 쪼개진다.
# 앱은 폴더 하나이며, 그 안에 models.py, views.py, urls.py, admin.py, migrations/ 등이 들어있다.
# 앱을 쓰려면 settings.py의 INSTALLED_APPS에 등록해야 한다.
# 앱은 보통 도메인 별로 나눈다. accounts(회원/권한), news(뉴스/콘텐츠), inquiries(문의), ...
# INSTALLED_APPS에 새로운 앱을 추가하거나 models.py를 수정했을 시엔 다시 마이그레이션을 해야한다. -> 이땐 python manage.py migrate만 해주면된다.
INSTALLED_APPS = [
    "django.contrib.admin",           # 관리자 사이트(/admin) 기능. 관리자 화면 쓰려면 필수
    "django.contrib.auth",            # 사용자/권한/인증 시스템. 로그인/로그아웃 등
    "django.contrib.contenttypes",    # Generic relations 지원(다형성 관계의 기반). 내부적으로 많이 쓰여 사실상 필수
    "django.contrib.sessions",        # 세션(서버 측 로그인 상태 저장) 기능
    "django.contrib.messages",        # 1회성 메시지(플래시 메시지) 프레임워크
    "django.contrib.staticfiles",     # 정적 파일(CSS/JS/이미지같은 코드가 아닌 리소스) 관리 -> 여기저기 흩어진 CSS/JS/이미지들을, 배포할 때 한 폴더에 깔끔하게 모아주는 역할
    
    # 서드파티(3rd-party) => 서드파티는 Django가 만든 게 아니라 외부 커뮤니티/회사에서 만든 패키지
    "rest_framework",   # API 서버 만들 때 쓰는 도구
    "corsheaders",      # CORS(다른 출처(origin)에서 오는 요청을 허용할지/막을지 정하는 웹브라우저의 보안 규칙) 헤더를 추가/관리하는 미들웨어를 제공 -> 프론트(React, http://localhost:5173)랑 백엔드(Django, http://localhost:8000)가 포트가 달라서 서로 통신을 못하는데 corsheaders 얘를 쓰면 허용해줌.
    "rest_framework_simplejwt.token_blacklist",  # 블랙리스트(JWT) 앱 추가

    # 로컬 앱 (내가 만든 앱)
    "accounts",   # 기본 모델(django.contrib.auth)만으로도 로그인/회원가입/비번변경 같은 건 구현할 수 있지만 커스터마이징 하기 위해 사용
    "news",
    "inquiries"
]

# ───────────────── 미들웨어 ─────────────────
# 미들웨어 => 모든 요청이 뷰(특정 URL로 들어온 요청을 처리해서 응답을 만드는 함수/클래스)에 도착하기 전, 자동으로 거쳐가는 보안검색대/필터들

# 전체 흐름
# 1. 브라우저 요청(Request) 이 서버(Django)에 도착
# 2. MIDDLEWARE 리스트에 나열된 “필터”들을 위에서 아래로 통과
# 3. 요청이 urls.py → views.py 로 넘어가서 실제 로직 실행
# 4. views.py가 반환한 응답(Response)이 다시 미들웨어를 아래에서 위로 거쳐 나감
# 5. 최종적으로 브라우저에 응답이 도착

# 배열 순서 중요
# 브라우저 요청(request)이 들어오면 위에서 아래로 미들웨어를 통과해 뷰까지 가고, 뷰가 만든 응답(response)은 아래에서 위로 다시 같은 미들웨어를 거쳐 나간다.
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",                    # CORS 헤더 추가/관리, 반드시 CommonMiddleware보다 위여야 한다.
    "django.middleware.security.SecurityMiddleware",            # 보안 관련 헤더(HSTS, SSL redirect 등) 지원. -> HSTS(브라우저에게 “이 도메인은 반드시 HTTPS로만 접속해라”라고 강제하는 보안 규칙. 사용자가 http:// 로 접속해도 브라우저가 자동으로 https:// 로 바꿔줌), SSL redirect(서버 차원에서 http:// 요청이 오면 https:// 로 강제 리다이렉트 시킴)
    "django.contrib.sessions.middleware.SessionMiddleware",     # 사용자별 데이터를 서버 메모리에 저장해두고, 쿠키(브라우저(클라이언트)에 저장되는 작은 텍스트 데이터)로 연결해주는 기능
    "django.middleware.common.CommonMiddleware",                # 주소 오타 자동 보정 + 응답 캐싱(응답 내용을 브라우저/프록시에 저장해두고, 안 바뀌면 다시 안 보내주는 효율화) 지원
    "django.middleware.csrf.CsrfViewMiddleware",                # CSRF 공격 방지. 폼 POST나 세션 기반 인증에 중요 -> 폼 요청이 진짜 내 사이트에서 발생한 건지 확인하는 안전장치
    "django.contrib.auth.middleware.AuthenticationMiddleware",  # 세션(서버가 사용자별로 상태를 저장하는 서버측 저장소)/토큰(인증용 열쇠)을 바탕으로 이 요청을 보낸 사람이 누구인지 자동으로 찾아내고 -> request.user속성에 사용자 정보를 넣어주는 역할
    "django.contrib.messages.middleware.MessageMiddleware",     # 1회성 플래시 메시지(성공/오류 알림)를 템플릿에서 사용 가능하게함
    "django.middleware.clickjacking.XFrameOptionsMiddleware"    # X-Frame-Options 헤더로 클릭재킹(악성 사이트가 내 사이트를 iframe 안에 몰래 띄워놓고, 사용자 클릭을 가로채는 공격) 방지 -> 다른 사이트가 내 화면을 몰래 iframe에 심어 쓰는 걸 막는 장치
]
# ───────────────────────────────────────────────────

# Django가 URL 매핑(라우팅)을 어디서부터 시작할지 지정하는 설정값
# 장고에 요청이 들어오면 미들웨어를 거친 후 이 URL이 어떤 뷰(View)랑 연결되어야 할지 찾는데, 이때 장고가 가장 먼저 참고하는 시작점이 ROOT_URLCONF
# 지금은 "config.urls"로 되어 있으니까 -> backend/config/urls.py 파일을 맨 처음으로 열고 그 안의 urlpatterns 리스트를 위에서부터 차례대로 검사한다.
# 여기서는 config/urls.py가 엔트리포인트
# 엔트리포인트 (Entry Point): 실행이나 처리가 시작되는 진입점, 엔드포인트 (Endpoint): 외부에서 접근할 수 있는 최종 주소(도착 지점)
ROOT_URLCONF = "config.urls"  # config/urls.py

# ───────────────── 템플릿 ─────────────────
# 템플릿 => Django에서 HTML 화면을 만드는 틀(양식)
# 다만, React를 사용하면 React가 대신 화면을 그려주기 때문에 템플릿 부분은 없어도 된다. 따라서 여기선 최소 구성만 적음
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],  # 필요 시 템플릿 폴더 경로 추가
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]
# ───────────────────────────────────────────────────

# WSGI (Web Server Gateway Interface) => 파이썬 웹 서버와 웹 프레임워크(Django, Flask 등)를 연결해주는 표준 인터페이스

# 전체 과정
# 1. 웹 서버가 클라이언트의 요청을 받음
# 2. 웹 서버가 WSGI를 통해 Django로 요청을 전달
# 3. Django가 요청을 처리한 후 응답을 생성
# 4. WSGI가 그 응답을 다시 웹 서버에 전달 → 최종적으로 클라이언트에게 응답

# WSGI_APPLICATION은 Django에게 "외부에서 요청이 들어오면 내 프로젝트를 실행할 출발점(입구) 은 여기" 라고 알려주는 설정
WSGI_APPLICATION = "config.wsgi.application"  # WSGI 진입점(입구): config/wsgi.py 파일 안의 application 객체

# ───────────────── 데이터베이스 ─────────────────
DATABASES = {
    "default": {
        "ENGINE": env("DB_ENGINE", default="django.db.backends.sqlite3"),
        "NAME": env("DB_NAME", default=BASE_DIR / "db.sqlite3"),
    }
}

# ───────────────── 비밀번호 정책 ─────────────────
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},  # 사용자 정보(아이디, 이메일, 이름 등)와 비슷한 비밀번호를 막음 (예: 아이디가 hong123인데 비번을 hong123! → 거부)
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},            # 비밀번호가 너무 짧으면 거부 (기본값: 최소 8자)
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},           # 전 세계적으로 흔한 비밀번호(123456, password, qwerty 등)를 거부
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"}           # 비밀번호가 숫자만 있으면 거부
]

# ───────────────── 로케일/타임존 ─────────────────
LANGUAGE_CODE = "ko-kr"   # Django가 기본으로 사용할 언어 코드 
TIME_ZONE = "Asia/Seoul"  # Django의 기본 시간대(Time Zone) 설정
USE_I18N = True           # Internationalization(국제화) 기능 활성화 여부 -> 여러 언어로 번역된 문자열을 지원할 수 있게 함
USE_TZ = True             # Django가 시간을 내부적으로 UTC로 저장할지 여부 -> 내부 시계(USE_TZ)는 세계 표준시(UTC)로 맞추고, 보여줄 때(TIME_ZONE)만 현지 시계로 바꾸자

# ───────────────── 정적 파일 ─────────────────
STATIC_URL = "static/"   # 브라우저가 정적 파일에 접근할 때 사용할 URL 경로 (예: logo 사진에 접근할 때 브라우저에서 /static/logo.png 로 접근)

# 개발 모드 vs 배포 모드
# (1) 개발 모드
# DEBUG=True이면 Django가 자동으로 각 앱의 static/ 폴더에서 파일을 찾아줌
# STATIC_ROOT 없어도 크게 문제 없음
# 
# (2) 배포 모드
# 성능 때문에 Django가 직접 static 파일을 서빙하지 않음
# 대신 collectstatic으로 STATIC_ROOT에 파일을 모아두고, 웹 서버가 /static/ URL 요청을 STATIC_ROOT 폴더에서 직접 서빙

# 배포용 폴더 경로 -> 따라서 배포 하지 않을거라면 이 코드는 필요없다.
# python manage.py collectstatic 명령어를 실행하면, 각 앱(app_name/static/…)에 흩어져 있는 모든 정적 파일을 하나로 모아서(collect) → BASE_DIR/staticfiles/ 안에 저장
STATIC_ROOT = BASE_DIR / "staticfiles"      

# ───────────────── DRF / JWT ─────────────────
# REST_FRAMEWORK => Django REST Framework(DRF)의 전역 기본 설정을 정의

# 1. DEFAULT_AUTHENTICATION_CLASSES: 인증 클래스 전역 설정 => 요청이 들어왔을 때, 어떤 방식으로 인증할지를 정의
# AccountsJWTAuthentication: 기본 JWTAuthentication 대신 직접 만든 인증 클래스(AccountsJWTAuthentication)를 사용. auth.py에 존재

# 2. DEFAULT_PERMISSION_CLASSES: 권한 클래스 전역 설정 => 인증이 완료된 사용자에게 어떤 권한을 줄지를 정의
# AllowAny: 아무 권한 검사 안 하고 모든 요청 허용. (개발 초기 편의용) 
# 따라서 실제 서비스 단계에선 바꿔줘야함 (IsAuthenticated: 로그인 사용자만 접근 가능 / IsAdminUser: 관리자만 접근 가능)
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        'accounts.auth.AccountsJWTAuthentication',       
    ),

    # 개발 초기엔 열어두고, 뷰 단위로 잠그는 방식 권장
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.AllowAny",
    ),
}

# <(선택) JWT 토큰 수명 커스터마이즈>
# SIMPLE_JWT => djangorestframework-simplejwt 패키지에서 JWT 토큰 관련 옵션을 지정
# "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60) => 액세스 토큰(로그인 후 API 호출용)의 유효기간 = 60분 -> 짧아야 보안에 유리
# "REFRESH_TOKEN_LIFETIME": timedelta(days=7) => 리프레시 토큰(엑세스 토큰 만료 시 새로 갱신받는 용도)의 유효기간 = 7일

# <로그인을 하면 엑세스 토큰/리프레시 토큰 두 개가 같이 발급됨>
# 1. 60분이 지나서 엑세스 토큰이 만료되면 리프레시 토큰을 통해 엑세스 토큰을 또 발급받을 수 있다.
# 2. 그리고 이 상태에서 60분이 지나서 엑세스 토큰이 한번 더 만료되더라도, 리프레시 토큰이 살아있는 7일 동안은 무한히 엑세스 토큰을 발급받을 수 있다.
# 3. 그러다가 7일이 지나서 리프레시 토큰이 만료되면, 이땐 더 이상 엑세스 토큰을 발급받지 못한다.
# 4. 따라서 이땐 로그인을 해서 엑세스 토큰과 리프레시 토큰을 두 개를 다시 발급 받아야 한다.

# 예를들어 엑세스 토큰이 살아있는 60분 동안은 로그인된 사용자로서 API를 호출 할 수 있다.
# 그러다가 60분이 지나서 엑세스 토큰이 만료되면 401 Unauthorized (권한 없음) 에러 발생 -> 토큰을 더 이상 쓸 수 없다.
# 그리고 이때 프론트엔드(React)쪽에서 자동으로 갱신되게 구현해놨다면, 프론트가 알아서 리프레시 토큰을 사용해서 새로운 엑세스 토큰을 발급받는다.
# 그럼 사용자는 60분이 지나도 계속해서 로그인 상태에 있을 수 있게된다.
# 그러다 7일이 지나서 리프레시 토큰이 만료되면, 이때는 정말로 로그아웃 되고 다시 로그인 해야한다.

# <SimpleJWT에서 사용자 식별자를 id에서 user_seq로 변경>
# SimpleJWT는 기본적으로 User 모델의 PK 필드(id)를 기준으로 인증을 수행하고, JWT 토큰 Payload에 사용자 식별자를 저장할 때는 <"user_id": PK 필드 값> 으로 저장된다.
# 따라서 SimpleJWT의 기본 설정을 따라가려면 User 모델의 PK 칼럼 이름을 "id"라고 지정을 해놔야한다.
# 하지만 이 프로젝트의 User 모델의 PK 필드명은 "id"가 아니라 "user_seq" 이다.
# 만약 기본 SimpleJWT 설정을 그대로 쓰면 DB 조회에는 존재하지도 않는 필드인 "id"가 쓰이게 된다.
# 즉, 이대로라면 "id 필드를 기준으로 조회 시도 -> id는 실제 DB에 없으므로 인증 실패" 하게 된다.
# 따라서 <'USER_ID_FIELD': 'user_seq'>를 통해 SimpleJWT가 DB에서 User 객체를 조회할 때 어떤 필드를 사용할지 직접 지정해줘야한다.
# 그리고 USER_ID_FIELD를 user_seq로 지정했으므로 USER_ID_CLAIM도 user_seq로 지정한다.
# 여기서 "ACCESS_TOKEN_LIFETIME", "REFRESH_TOKEN_LIFETIME", 'USER_ID_FIELD', 'USER_ID_CLAIM' 등은 SimpleJWT 라이브러리 내부에서 미리 정해져 있는 고정된 이름이다.
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),

    "AUTH_HEADER_TYPES": ("Bearer",),
    
    # 이 두개의 키의 값은 반드시 'user_seq'로 동일해야 한다.
    'USER_ID_FIELD': 'user_seq',   # DB 조회에 쓸 필드
    'USER_ID_CLAIM': 'user_seq',   # 토큰의 Payload에 어떤 필드를 사용자 식별자를 저장할지 결정
}

# ───────────────── CORS / CSRF ─────────────────
# 브라우저 보안 정책과 관련된 설정
# 브라우저는 출처(origin) 가 다르면(예: localhost:8000 ↔ localhost:5173) 보안 때문에 요청을 막는다.
# 따라서 프론트엔드(React)와 백엔드(Django)가 포트가 달라서 발생하는 문제(CORS/CSRF)를 해결하기 위해 사용

# CORS_ALLOWED_ORIGINS에 허용할 프론트 주소를 넣어주면, Django가 응답할 때 Access-Control-Allow-Origin 헤더를 붙여줌 -> 브라우저가 “아, 이 출처는 허용된 곳이네” 하고 요청을 허용
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# refresh 쿠키를 쓰므로 cred 허용
CORS_ALLOW_CREDENTIALS = True

# 프리플라이트에서 허용할 헤더(로그인/일반 JSON 요청에 필요)
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

# 세션 기반 로그인(쿠키 사용)에서는, 악성 사이트가 사용자의 브라우저를 속여 Django에 요청을 보내는 공격이 가능 → CSRF 공격
# CSRF_TRUSTED_ORIGINS에 안전하다고 믿을 수 있는 프론트 주소를 등록해 두면, Django가 그 출처에서 오는 요청을 CSRF 검증 대상으로 인정함. -> 즉, “이 출처에서 오는 폼/세션 요청은 믿을 수 있어” 라고 Django에 알려주는 설정
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# ───────────────── 기본 PK 타입 ─────────────────
# Django에서 데이터베이스 모델의 기본 Primary Key(PK) 타입을 뭘로 쓸지 정하는 설정
# BigAutoField => 64bit 정수 (최대 9경 이상)
# 즉, 앞으로 새로 만드는 모든 모델의 PK(id)는 자동 증가하는 64bit 정수로 생성된다.
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
