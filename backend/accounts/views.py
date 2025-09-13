# <뷰(View) 란?>
# HTTP 요청을 받아서 HTTP 응답을 반환하는 역할을 수행
# 즉, 클라이언트가 GET, POST, PUT, DELETE 등 HTTP 요청을 보내면, 뷰가 그 요청을 해석하고 필요한 비즈니스 로직을 수행한 뒤, 결과를 JSON 등의 응답으로 반환

# <MVC 패턴과 Django의 MTV>
# Django는 일반적인 MVC 패턴을 약간 변형하여 MTV 패턴을 사용한다.
# (1) Model <=> Model : DB와 직접 연결되어 데이터 CRUD 담당
# (2) View <=> Template : 화면(UI)을 표현하는 HTML
# (3) Controller <=> View : 요청을 받아 처리하고 응답을 반환
# => 장고에서는 View가 사실상 Controller 역할을 한다.

# <뷰의 핵심 역할>
# 1. 요청(Request) 수신
# 클라이언트에서 서버로 요청이 들어옴 -> urls.py에서 요청 URL을 보고 어떤 뷰 함수/뷰 클래스가 처리할지 결정

# 2. 데이터 검증 (Serializer 사용)
# 요청 데이터를 시리얼라이저를 사용하여 유효성 검사를 수행

# 3. 비즈니스 로직 처리
# 모델을 이용해 DB CRUD 수행. 필요한 경우 외부 API 호출, 인증·권한 검사, 토큰 발급 등도 처리

# 4. 응답(Response) 반환
# 처리 결과를 Response 객체로 만들어 반환 -> DRF에서는 보통 JSON 형식으로 반환

# <뷰의 종류>
# DRF에서 뷰는 크게 두 가지 방식으로 작성된다.

# 1. 함수형 뷰 (FBV, Function-Based View)
# 엔드 포인트 하나 = 함수 하나
# 하나의 URL 요청을 하나의 함수로 처리
# 간단하고 직관적이지만 코드가 길어지면 유지보수가 어려움

# 2. 클래스형 뷰 (CBV, Class-Based View)
# 엔드 포인트 하나 = 클래스 하나
# APIView를 상속받아 get, post 같은 메서드를 정의
# 확장성과 재사용성이 높아 대규모 프로젝트에서 권장됨

# 여기선 전부 클래스형 뷰로 구현함
# 보통 엔드포인트 하나 당 독립된 뷰를 하나씩 구현하는 것이 일반적이다.
# 즉, views.py 전체 파일을 통째로 뷰라고 부르는 것이 아니라, 각 엔드포인트를 처리하는 개별 클래스나 함수를 뷰라고 부른다.
# ─────────────────────────────────────────────────────────────────────────────


# Django 프로젝트의 설정값을 코드에서 사용하기 위해 가져옴
from django.conf import settings

# Django에서 이메일을 발송하기 위한 함수
# SMTP 설정을 기반으로 이메일을 보낼 수 있다.
from django.core.mail import send_mail

# 클래스형 뷰(CBV)를 만들기 위한 DRF의 기본 클래스
# APIView를 상속받아 get(), post(), put(), delete() 등 HTTP 메서드별 함수를 정의할 수 있다.
# APIView 안에는 요청 처리, 인증(authentication), 권한(permission) 체크 등의 로직이 포함되어있다.
from rest_framework.views import APIView

# <시리얼라이저와 Response 클래스의 차이>
# 시리얼라이저는 파이썬 객체 <-> dict/list 등으로 변환(JSON 데이터 스키마 기반 변환)하는 것이고, 
# Response 객체는 Python의 dict/list <-> JSON 으로 변환하는 것이다.
# 즉, 시리얼라이저는 진짜 직렬화/역직렬화를 수행하고 Response는 "단순 포맷 변환"을 하는 간접적인 직렬화/역직렬화 기능을 수행한다.
from rest_framework.response import Response

# Refresh Token 객체를 생성하거나 조작할 때 사용
from rest_framework_simplejwt.tokens import RefreshToken

# <JWT 토큰 블랙리스트(blacklist) 기능>
# JWT 기반 인증 시스템에서 토큰을 강제로 무효화하기 위해 사용하는 기능
# 기본 JWT 구조에서는 한 번 발급된 토큰은 유효기간이 끝날 때까지 항상 유효하기 때문에,
# 사용자가 로그아웃하거나 관리자가 계정을 정지시켜도 이미 발급된 토큰으로 계속 요청이 가능하다는 문제가 있다.
# 이 보안 문제를 해결하기 위해 블랙리스트를 사용하여 사용자가 로그아웃/계정 탈퇴/관리자에 의한 계정 정지 시 특정 토큰을 "강제 만료" 시킨다.

# <JWT 토큰의 기본구조>
# JWT는 Header.Payload.Signature 이처럼 3부분으로 이루어져있다.
# 1. Header: 토큰의 타입(JWT)과 해싱 알고리즘 정보 => 토큰의 종류가 무엇인지(여기선 JWT), 서명(Signature)을 어떤 해시 알고리즘을 사용해 만들었는지 (예: HS256 인지 아니면 RS256 인지, ...)
# 2. Payload: 사용자 정보, 토큰 만료 시간 등의 정보를 담아놓은 데이터 묶음
# 3. Signature: Header + Payload를 비밀 키(Secret Key)를 사용해 해싱한 값 -> 즉, Signature(서명)은 Secret Key를 통해 만들어진다.
# 여기서 Secret Key는 서버에서만 알고 있는 값이며, 절대 외부에 노출되면 안된다.

# <해싱(Hashing) 이란?>
# 어떤 데이터를 고정된 길이의 고유한 값으로 변환하는 과정

# 해싱의 특징
# (1) 일방향성: 해시된 값을 다시 원래 데이터로 복원할 수 없음 (복호화 불가능)
# (2) 고정 길이 출력: 입력 데이터 크기와 상관없이 항상 같은 길이의 값 출력
# (3) 민감한 차이에 민감: 입력 데이터가 한글자만 달라져도 완전히 다른 해시 값 출력
# (4) 비교 용도: 원본과 같은지 확인할 때 유용 (비교는 가능하지만 역추적 불가)

# 해싱의 목적
# (1) 무결성 검증: 데이터가 중간에 변조되지 않았는지 확인하는 데 사용 => 원본 데이터와 현재 데이터의 해시값을 비교 -> 같으면 데이터가 그대로임
# (2) 비밀번호 저장: 비밀번호를 DB에 그대로 저장하면 해킹 위험이 크기 때문에, 비밀번호를 해시해서 저장 => 따라도 관리자도 절대 원본 평문 비밀번호를 알 수 없지만, 입력 비밀번호가 같다면 해시 값도 항상 같기 때문에 검증하는데는 문제없다.
# (3) JWT 서명: JWT에서 Header + Payload를 해싱하여 Signature를 생성 => 누군가 Payload를 바꾸면 해시 결과가 달라져 서버가 바로 위변조를 감지할 수 있다.

# <서명(Signature)의 역할>
# 1. 서버가 로그인 시 Header + Payload + Secret Key를 이용해 Signature를 생성
# 2. 클라이언트는 이 완성된 JWT를 request에 포함해 서버로 보냄
# 3. 서버는 DB 조회 없이 같은 Secret Key로 다시 계산해서 두 Signature가 일치하는지만 확인
# 4. 일치하면 -> 토큰이 서버에서 발급된 것임을 확인 -> 요청 허용
#    일치하지 않으면 -> 위조된 토큰 -> 요청 거부
# => 이게 JWT의 Stateless(무상태) 방식이다.

# <왜 블랙리스트 기능이 필요한가?>
# JWT의 가장 큰 특징은 Stateless(무상태) 방식이라 서버에 세션 정보를 저장하지 않는다. 
# 로그인 시 발급된 Access Token과 Refresh Token은 서명(Signature)으로만 검증한다.
# 따라서 한 번 발급된 토큰은 클라이언트가 만료 시간이 끝날 때까지 마음대로 사용할 수 있다.
# 이로인해 예를들어 관리자가 사용자를 DB에서 삭제해도, JWT는 DB를 조회하지 않고 서명만 확인하므로, 토큰 자체는 여전히 유효하다.
# 즉, 계정 탈퇴 이후에도 토큰 만료 전까지는 API 요청이 가능하다는 문제점이 존재한다.
# 따라서 로그아웃/계정 탈퇴 시 해당 토큰을 DB에 등록하고, 이 후 모든 요청에서 "이 토큰이 블랙리스트에 있는지" 확인한다.
# 등록되어 있다면 -> 403 Forbidden 응답

# BlacklistedToken 모델을 가져오는 시도를 한다.
# 성공적으로 import 되면 -> 프로젝트가 블랙리스트 기능을 지원하고 있다는 뜻(설치/설정된 경우) -> SIMPLEJWT_BLACKLIST = True
try:
    from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken  
    SIMPLEJWT_BLACKLIST = True

# token_blacklist 모듈이 설치되지 않았다면 ImportError가 발생
# 이 경우 SIMPLEJWT_BLACKLIST = False로 설정 -> 블랙리스트 기능을 사용하지 않음
except Exception:  
    SIMPLEJWT_BLACKLIST = False

# serializers.py 파일에서 여러 개의 시리얼라이저 클래스를 가져옴
from .serializers import (
    IdPrecheckRequestSerializer, IdPrecheckResponseSerializer,
    EmailPrecheckRequestSerializer, EmailPrecheckResponseSerializer,
    RegisterRequestSerializer, RegisterResponseSerializer,
    LoginRequestSerializer, LoginResponseSerializer,
    TokenRefreshResponseSerializer,
    LogoutResponseSerializer,
    FindIdRequestSerializer, FindIdResponseSerializer,
    FindPasswordRequestSerializer, FindPasswordResponseSerializer,
    ChangePasswordRequestSerializer, ChangePasswordResponseSerializer,
    AdminPromoteRequestSerializer, AdminPromoteResponseSerializer,
    AdminDemoteRequestSerializer, AdminDemoteResponseSerializer,
    UserListResponseSerializer
)

