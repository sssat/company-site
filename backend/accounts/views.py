# <뷰(View) 란?>
# HTTP 요청을 받아서 HTTP 응답을 반환하는 역할을 수행
# 즉, 클라이언트가 GET, POST, PUT, DELETE 등 HTTP 요청을 보내면, 뷰가 그 요청을 해석하고 필요한 비즈니스 로직을 수행한 뒤, 결과를 JSON 등의 응답으로 반환
# 뷰는 작성할 때 [api 명세서, serializers.py]를 토대로 작성한다.

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

from typing import Any, Dict, Optional, List
from django.contrib.auth.hashers import make_password
from django.core import signing
from .models import User, UserLevel

# Django 프로젝트의 설정값을 코드에서 사용하기 위해 가져옴
from django.conf import settings

# JSON을 파싱(의미 있는 구조화된 데이터로 해석하는 과정)하다가 실패했을 때 발생하는 표준 예외 클래스
from rest_framework.exceptions import ParseError

from django.db import transaction, IntegrityError
from rest_framework_simplejwt.exceptions import TokenError
import math
from rest_framework.exceptions import ParseError, UnsupportedMediaType, ValidationError, NotFound, PermissionDenied

# 비밀번호 변경 시각, 관리자 권한 부여 시각 등을 기록할 때 timezone.now() 사용
from django.utils import timezone

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

# (1) status: HTTP 상태 코드 상수 모음 -> 200, 400, 404 등 숫자 코드를 직접 쓰지 않고 읽기 쉬운 상수 이름으로 사용 가능
# 예를들어 200 -> status.HTTP_200_OK으로 쓸 수 있다.

# (2) permissions: 권한 제어 로직을 담당하는 여러 권한 클래스(permission class)를 제공한다.
# APIView와 permissions의 관계 => APIView가 권한 체크 기능을 제공하는 틀이고, permissions 모듈은 실제로 어떤 권한을 어떻게 체크할지에 대한 구체적인 도구를 제공한다.
from rest_framework import status, permissions

# Refresh Token 객체를 생성하거나 조작할 때 사용
from rest_framework_simplejwt.tokens import RefreshToken

# <JWT 토큰의 기본구조>
# JWT는 Header.Payload.Signature 이처럼 3부분으로 이루어져있다.
# 1. Header: 토큰의 타입(JWT)과 해싱 알고리즘 정보 => 토큰의 종류가 무엇인지(여기선 JWT), 서명(Signature)을 어떤 해시 알고리즘을 사용해 만들었는지 (예: HS256 인지 아니면 RS256 인지, ...)
# 2. Payload: 사용자 정보, 토큰 만료 시간 등의 정보를 담아놓은 데이터 묶음
# 3. Signature: Header + Payload를 비밀 키(Secret Key)를 사용해 해싱한 값 => 즉, Signature(서명)은 Secret Key를 통해 만들어진다.
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
# 게다가 요즘은 보안 강화를 위해 단순히 해싱만 하지 않고, "솔트(Salt)"라는 임의의 문자열을 비밀번호에 추가한 뒤 해싱하는 "솔팅(Salting)"" 방식을 사용한다.
# 이렇게하면 여러명의 사용자가 같은 비밀번호를 사용해도 DB에 동일한 해시 값이 저장되지 않기때문에 해커 입장에서 이 유저들이 같은 비밀번호를 사용했다는 사실을 알 수 없다. Django에선 내부적으로 자동으로 솔트 방식으로 처리한다.
# (3) JWT 서명: 비밀키를 사용해 Header + Payload를 해싱하여 Signature를 생성 => 누군가 Payload를 바꾸면 해시 결과가 달라져 서버가 바로 위변조를 감지할 수 있다.

# <JWT 토큰 검증 및 인증 과정>
# 1. 사용자가 로그인 시 서버에서 Header + Payload + Secret Key를 이용해 Signature를 생성
# 2. 클라이언트는 서버로부터 이 완성된 JWT(Header.Payload.Signature)를 받은 후 가지고있다가 서버에 무언가를 요청할 때마다 request에 포함해 다시 서버로 보냄
# 3. 서버는 DB 조회 없이 가지고있는 Secret Key로 Signature를 다시 만들어서 두개의 Signature가 일치하는지만 확인 
# 4. 일치하면 -> 토큰이 서버에서 발급된 것임을 확인 -> 요청 허용
#    일치하지 않으면 -> 위조된 토큰 -> 요청 거부
# => 이게 JWT의 Stateless(무상태) 인증 방식이다.

# <JWT 토큰 블랙리스트(blacklist) 기능>
# JWT 기반 인증 시스템에서 토큰을 강제로 무효화하기 위해 사용하는 기능
# 기본 JWT 구조에서는 한 번 발급된 토큰은 유효기간이 끝날 때까지 항상 유효하기 때문에,
# 사용자가 로그아웃하거나 관리자가 계정을 정지시켜도 이미 발급된 토큰으로 계속 요청이 가능하다는 문제가 있다.
# 이 보안 문제를 해결하기 위해 블랙리스트를 사용하여 사용자가 로그아웃/계정 탈퇴/관리자에 의한 계정 정지 시 특정 토큰을 "강제 만료" 시킨다.

# <왜 블랙리스트 기능이 필요한가?>
# JWT의 가장 큰 특징은 Stateless(무상태) 방식이라 서버에 세션 정보를 저장하지 않는다. 
# 로그인 시 발급된 Access Token과 Refresh Token(이 프로젝트에선 둘 다 JWT 방식)은 서명(Signature)으로만 검증한다.
# 따라서 한 번 발급된 토큰은 클라이언트가 만료 시간이 끝날 때까지 마음대로 사용할 수 있다.
# 이로인해 예를들어 관리자가 사용자를 DB에서 삭제해도, 서버는 DB를 조회하지 않고 서명만 확인하므로, 토큰 자체는 여전히 유효하다.
# 즉, 계정 탈퇴 이후에도 토큰 만료 전까지는 API 요청이 가능하다는 문제점이 존재한다.
# 따라서 로그아웃/계정 탈퇴 시 해당 토큰을 DB에 등록하고, 이 후 모든 요청에서 "이 토큰이 블랙리스트에 있는지" 확인한다.
# 등록되어 있다면 -> 403 Forbidden 응답
# 하지만 블랙리스트 기능을 도입하면 JWT의 가장 큰 장점인 "완전한 무상태(Stateless)"구조가 일부 희생되는 단점이 있다.

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

# ─────────────────────────────────────────────────────────
# 공통 헬퍼 -> 공통적으로 반복되는 로직을 재사용하기 위해 만든 헬퍼 함수
# ─────────────────────────────────────────────────────────

# 1. 아이디/이메일 중복검사 토큰 발급
# 역할: signing.dumps()로 payload 암호화 + 서명 후 토큰 발급 -> JWT아님 
def _sign_precheck(kind: str, subject: str) -> str:
    payload = {"kind": kind, "sub": subject}
    return signing.dumps(
        payload, 
        salt=f"precheck:{kind}"
    )


# 2. 아이디/이메일 중복검사 성공 응답의 공통 포맷 생성
# 역할: JSON으로 변환하기 직전 단계의 데이터 구조인 딕셔너리 구조를 생성해 반환

# 결과 예시(아이디 검사 성공)
# {
#   "user_id": { "valid": true, "status": "available" },
#   "id_check_token": "암호화된 문자열 토큰",
#   "expires_in": 600,
#   "message": "사용 가능한 아이디입니다."
# }
def _precheck_ok_response(kind: str, subject: str) -> Dict[str, Any]:
    token = _sign_precheck(kind, subject)
    return {
        kind: {"valid": True, "status": "available"},
        f"{'id' if kind=='user_id' else 'email'}_check_token": token,
        "expires_in": 600,
        "message": "사용 가능한 {}입니다.".format("아이디" if kind == "user_id" else "이메일"),
    }


# 3. serializer.errors에서 사람이 볼 수 있는 첫 번째 메시지만 깔끔히 추출하는 함수
# API 응답에서 {"message": "에러메시지"} 형태로 사용하기 위함
# ex) serializer.errors = { "user_id":[ { "message": "이미 사용 중인 아이디입니다.","code": "duplicate" }] }
# => 여기서 return으로 "이미 사용 중인 아이디입니다." 만 추출
def _first_error_message(errs: Dict[str, List[Dict[str, str]]]) -> str:
    if not errs:
        return "잘못된 요청입니다."
    first_key = next(iter(errs))
    val = errs[first_key]
    if isinstance(val, (list, tuple)) and val:
        first = val[0]
        if isinstance(first, dict) and "message" in first:
            return str(first.get("message")) or "잘못된 요청입니다."
        return str(first)
    if isinstance(val, dict) and "message" in val:
        return str(val.get("message")) or "잘못된 요청입니다."
    return "잘못된 요청입니다."



# 1. 사용자 등급코드를 문자열 역할명으로 변환
# 0 -> 일반 유저(USER)  
# 1 -> 관리자(ADMIN)
# 2 -> 슈퍼 관리자(SUPER_ADMIN)
def _role_name_from_user(user: User) -> str:
    level_obj = getattr(user, "grade_code", None)
    code = getattr(level_obj, "grade_code", 0)
    if code == 2:
        return "SUPER_ADMIN"
    if code == 1:
        return "ADMIN"
    return "USER"


# 2. JWT Refresh Token 만료시간을 쿠키 max_age(초 단위)로 환산
# SimpleJWT에서 Refresh Token 만료시간은 datetime.timedelta 객체이다. 
# 그런데 쿠키의 max_age는 초 단위의 정수값이어야 하므로 이를 변환해주기 위한 함수
# None 반환 시 DRF 기본 동작(세션 쿠키)으로 동작
def _get_refresh_cookie_max_age() -> Optional[int]:
    lifetime = getattr(settings, "SIMPLE_JWT", {}).get("REFRESH_TOKEN_LIFETIME") if hasattr(settings, "SIMPLE_JWT") else None
    if lifetime:
        try:
            return int(lifetime.total_seconds())
        except Exception:
            return None
    return None


# 3. Refresh Token을 HttpOnly 쿠키에 안전하게 저장
# Refresh Token은 프론트엔드 JavaScript에서 접근하지 못하도록 반드시 HttpOnly 쿠키에 저장

# 명세서 요구사항에 맞춰 아래 속성을 적용
# httponly=True -> JS 접근 차단 (XSS 방어)
# secure=True -> HTTPS 환경에서만 전송
# samesite='Lax' -> CSRF 위험 완화
# path="/api/auth/" -> 특정 경로에만 쿠키 전송
def _set_refresh_cookie(resp: Response, refresh_token: str) -> None:
    """명세: path=/api/auth/, HttpOnly, Secure, SameSite=Lax"""
    resp.set_cookie(
        key="refresh",
        value=refresh_token,
        path="/api/auth/",
        httponly=True,
        secure=True,
        samesite="Lax",
        max_age=_get_refresh_cookie_max_age(),
    )


# 4. Refresh Token 쿠키를 클라이언트에서 삭제
# 로그아웃 시 브라우저에서 Refresh Token을 제거하기 위해 사용
# path를 설정하지 않으면 동일 키의 다른 경로 쿠키가 남을 수 있어 반드시 명시
def _delete_refresh_cookie(resp: Response) -> None:
    resp.delete_cookie(key="refresh", path="/api/auth/")


# 8. 이메일 발송 시 안전하게 실패 처리
# 비밀번호 찾기(임시 비번 발송) 등에서 사용
# SMTP 서버가 없거나 오류가 발생해도 서버가 죽지 않도록 try/except로 감싸 실패를 무시
def _safe_send_mail(subject: str, message: str, to_email: str) -> None:
    try:
        send_mail(subject, message, getattr(settings, "DEFAULT_FROM_EMAIL", None), [to_email], fail_silently=True)
    except Exception:
        pass


# ─────────────────────────────────────────────────────────
# 1. 아이디 체크 - 클래스형 뷰
# 수행 기능: user_id의 유효성 검사 + 결과를 JSON 형태로 반환
# POST /api/auth/register/precheck/user-id/
# ─────────────────────────────────────────────────────────
class IdPrecheckView(APIView):  # IdPrecheckView의 부모 클래스 APIView 상속받음

    # AllowAny 권한을 부여: 인증되지 않은 사용자도 접근 가능 -> 회원가입은 누구나 접근 가능해야 하므로
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):

        # 1. 400: 파싱/미디어타입 오류
        # Request 클래스에도 .data 프로퍼티가 있고, Serializer 클래스에도 .data 프로퍼티가 정의되어있다.
        # Request.data는 HTTP Body를 파싱해 Python dict로 제공하고, Serializer.data는 Python 객체를 직렬화해 Python dict로 제공한다.
        try:
            # DRF가 request body를 파싱해서 파이썬 dict로 만들어 data에 담음 -> 근데 이 순간 ParseError가 발생할 수 있음
            data = request.data   # request.data = request body
        except ParseError:
            # 명세에 맞게 400과 통일 메시지를 반환
            return Response({"message": "잘못된 요청입니다."}, status=status.HTTP_400_BAD_REQUEST)  

        # 2. 400: request body의 형태/키/타입 검증
        # 정상적인 request body는 dict 형태 여야 함 -> 만약 엉뚱한 타입이면 바로 400 
        if not isinstance(data, dict):  
            return Response({"message": "잘못된 요청입니다."}, status=status.HTTP_400_BAD_REQUEST)
        
        # 필수 key인 "user_id"가 없거나, 타입이 문자열이 아니면 400
        if "user_id" not in data or not isinstance(data.get("user_id"), str):  
            return Response({"message": "잘못된 요청입니다."}, status=status.HTTP_400_BAD_REQUEST)

        # 아이디 체크 request 시리얼라이저 객체 생성
        s = IdPrecheckRequestSerializer(data=data)   # 위에서 data = request.data 이미 정의함

        # <IdPrecheckRequestSerializer를 이용해 request body의 user_id 유효성 검증 수행>
        # is_valid(): Serializer 클래스에 기본적으로 정의되어있는 함수 => 이 함수는 완성형으로 존재하기 때문에 오버라이드 할 필요 없이 바로 쓰면된다.
        # is_valid() 함수 호출 시 시리얼라이저 내부의 [각 필드에 정의된 기본 유효성 검사, validate_필드명(), validate()]를 순서대로 자동호출
        # 3가지의 유효성 검증이 모두 통과되면 True 반환
        if s.is_valid():

            # <유효성 검사 통과 시 <=> 아이디 사용가능 시>
            # validated_data에서 "user_id" 꺼내서 변수에 저장
            user_id = s.validated_data["user_id"]   

            # _precheck_ok_response() 헬퍼 함수를 호출해 성공 응답 JSON을 생성
            # Serializer.data: 객체를 dict으로 변환
            # IdPrecheckResponseSerializer(_precheck_ok_response("user_id", user_id)).data: 아이디체크 response 시리얼라이저의 인스턴스를 변수 없이 즉석에서 만들고 .data를 사용하여 딕셔너리를 얻음
            # 근데 _precheck_ok_response 헬퍼 함수에서 dict 형태로 반환하기 때문에 굳이 .data를 안써도 되지만, 이 dict가 올바른 응답 스키마를 따르고 있는지를 마지막으로 확인하기 위해 .data를 써준다.
            # Response 객체에서 이제 진짜로 JSON으로 변환됨
            return Response(
                IdPrecheckResponseSerializer(_precheck_ok_response("user_id", user_id)).data, 
                status=status.HTTP_200_OK
            )

        # <유효성 검사 실패 시>
        # s.errors에서 검증 실패 원인을 가져옴
        errs = s.errors

        # _first_error_message(errs) 헬퍼함수로 첫 번째 key인 message만 간단히 추출
        msg = _first_error_message(errs)

        # 두 번째 key인 code 확인
        # first_key = "user_id"
        # first_error = {"message": "이미 사용 중인 아이디입니다.", "code": "duplicate"}
        # error_code = "duplicate"
        first_key = next(iter(errs))  
        first_error = errs[first_key][0] if isinstance(errs[first_key], list) else errs[first_key]
        error_code = getattr(first_error, "code", "")

        # "duplicate" 문자열이 error_code에 포함되어 있다면 => "taken" -> 이미 사용 중인 아이디
        # 그렇지 않다면 => "invalid" -> 아이디 형식이 잘못됨
        status_str = "taken" if error_code == "duplicate" else "invalid"

        # 최종 JSON 응답을 payload로 구성
        payload = {
            "user_id": {
                "valid": False, 
                "status": status_str
            }, 
            "message": msg
        }

        # 아이디 체크 response 시리얼라이저로 직렬화 후 Response 객체에 담아 반환
        # 얘도 마찬가지로 여기서 JSON으로 변환됨
        return Response(
            IdPrecheckResponseSerializer(payload).data, 
            status=status.HTTP_200_OK
        )


# ─────────────────────────────────────────────────────────
# 2. 이메일 체크 - 클래스형 뷰
# 수행 기능: email의 유효성 검사 + 결과를 JSON 형태로 반환
# POST /api/auth/register/precheck/email/
# ─────────────────────────────────────────────────────────
class EmailPrecheckView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        try:
            data = request.data
        except ParseError:
            return Response({"message": "잘못된 요청입니다."}, status=status.HTTP_400_BAD_REQUEST)

        if not isinstance(data, dict):
            return Response({"message": "잘못된 요청입니다."}, status=status.HTTP_400_BAD_REQUEST)
        if "email" not in data or not isinstance(data.get("email"), str):
            return Response({"message": "잘못된 요청입니다."}, status=status.HTTP_400_BAD_REQUEST)

        s = EmailPrecheckRequestSerializer(data=data)

        if s.is_valid():
            email = s.validated_data["email"]
            return Response(
                EmailPrecheckResponseSerializer(_precheck_ok_response("email", email)).data,
                status=status.HTTP_200_OK
            )

        errs = s.errors
        msg = _first_error_message(errs)

        first_key = next(iter(errs))
        first_error = errs[first_key][0] if isinstance(errs[first_key], list) else errs[first_key]
        error_code = getattr(first_error, "code", "")

        status_str = "taken" if error_code == "duplicate" else "invalid"

        payload = {
            "email": {"valid": False, "status": status_str},
            "message": msg
        }
        return Response(
            EmailPrecheckResponseSerializer(payload).data,
            status=status.HTTP_200_OK
        )


# ─────────────────────────────────────────────────────────
# 3. 회원가입 - 클래스형 뷰
# POST /api/auth/register/
# ─────────────────────────────────────────────────────────
class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        # 1. 400: 파싱/미디어타입 오류
        try:
            data = request.data
        except ParseError:
            return Response({"message": "잘못된 요청입니다."},
                            status=status.HTTP_400_BAD_REQUEST)

        # 2. 유효성 검증
        serializer = RegisterRequestSerializer(data=data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST)

        # 3. 저장  
        try:
            with transaction.atomic():
                user = serializer.save()
        except IntegrityError:
            return Response(
                {"errors": {"non_field_errors": ["중복 데이터로 인해 생성에 실패했습니다. 다시 시도해주세요."]}},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 4. 201: 성공
        res = RegisterResponseSerializer(user).data
        return Response(res, status=status.HTTP_201_CREATED)


# ─────────────────────────────────────────────────────────
# 4. 로그인 - 클래스형 뷰
#  POST /api/auth/login/
# ─────────────────────────────────────────────────────────
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def _map_role(self, user) -> str:
        level = getattr(user, "grade_code", None)
        code = getattr(level, "grade_code", None)
        if code == 2:
            return "SUPER_ADMIN"
        if code == 1:
            return "ADMIN"
        return "USER"

    def post(self, request, *args, **kwargs):
        # 1) 400: 파싱/미디어타입 오류
        try:
            data = request.data
        except (ParseError, UnsupportedMediaType):
            return Response({"message": "잘못된 요청입니다."},
                            status=status.HTTP_400_BAD_REQUEST)

        # 2) 유효성 검증
        serializer = LoginRequestSerializer(data=data)
        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as exc:
            detail = exc.detail
            if isinstance(detail, dict) and "message" in detail:
                return Response({"message": detail["message"]},
                                status=status.HTTP_401_UNAUTHORIZED)
            return Response({"errors": detail},
                            status=status.HTTP_400_BAD_REQUEST)

        # 3) 자격증명 성공 -> 토큰 발급
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)

        # 4) 응답 본문 (명세 예시와 동일 키만)
        body = {
            "access": access,
            "user_seq": getattr(user, "user_seq"),
            "user_id": getattr(user, "user_id"),
            "role": self._map_role(user),
        }

        # 5) Refresh 토큰을 HttpOnly 쿠키로 설정
        resp = Response(body, status=status.HTTP_200_OK)
        resp.set_cookie(
            key="refresh",
            value=str(refresh),
            max_age=int(refresh.lifetime.total_seconds()),
            httponly=True,
            secure=True,            # 배포 환경에선 True 유지
            samesite="Strict",
            path="/api/auth/",
        )
        return resp


# ─────────────────────────────────────────────────────────
# 5. 엑세스 토큰 갱신 - 클래스형 뷰
# POST /api/auth/refresh/
# ─────────────────────────────────────────────────────────
class TokenRefreshView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        # 1) 400: 파싱/미디어타입 오류
        try:
            _ = request.data  # 바디는 사용하지 않지만, 파서 오류를 유발시켜 통일 처리
        except (ParseError, UnsupportedMediaType):
            return Response({"message": "잘못된 요청입니다."},
                            status=status.HTTP_400_BAD_REQUEST)

        # 2) 쿠키에서 refresh 추출
        raw_refresh = request.COOKIES.get("refresh")
        if not raw_refresh:
            # 401: 리프레시 토큰 누락
            res = TokenRefreshResponseSerializer({"message": "리프레시 토큰을 전달하세요."}).data
            return Response(res, status=status.HTTP_401_UNAUTHORIZED)

        # 3) 리프레시 검증 -> 엑세스 재발급
        try:
            refresh = RefreshToken(raw_refresh)

            # 블랙리스트 사용 시 검증
            # simplejwt의 blacklist 앱이 설치되어 있으면 체크 가능
            try:
                refresh.check_blacklist()
            except AttributeError:
                pass  # 블랙리스트 미사용 환경

            access = str(refresh.access_token)
        except TokenError:
            # 401: 만료/위변조/블랙리스트 등
            res = TokenRefreshResponseSerializer(
                {"message": "리프레시 토큰이 유효하지 않거나 만료되었습니다."}
            ).data
            return Response(res, status=status.HTTP_401_UNAUTHORIZED)

        # 4) 200: 성공(엑세스만 갱신)
        res = TokenRefreshResponseSerializer({"access": access}).data
        return Response(res, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────
# 6. 로그아웃 - 클래스형 뷰
# POST /api/auth/logout/
# ─────────────────────────────────────────────────────────
class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        # 1) 400: 파싱/미디어타입 오류
        try:
            _ = request.data  # 바디는 사용하지 않지만 파서 에러를 유발시켜 통일 처리
        except (ParseError, UnsupportedMediaType):
            return Response({"message": "잘못된 요청입니다."},
                            status=status.HTTP_400_BAD_REQUEST)

        # 2) 리프레시 쿠키 읽기
        raw_refresh = request.COOKIES.get("refresh")

        # 3) 리프레시 블랙리스트 시도(있으면) + 쿠키 제거
        resp = Response(LogoutResponseSerializer({"message": "로그아웃되었습니다."}).data,
                        status=status.HTTP_200_OK)

        # 쿠키 삭제
        resp.delete_cookie("refresh", path="/api/auth/")

        if not raw_refresh:
            # 쿠키가 이미 없으면 그대로 200
            return resp

        # 4) 쿠키가 있으면 토큰 검증 및 블랙리스트
        try:
            refresh = RefreshToken(raw_refresh)
            # blacklist 앱 사용 시 현재 토큰 블랙리스트 처리
            try:
                refresh.blacklist()  # blacklist 앱이 없으면 AttributeError 발생
            except AttributeError:
                pass
        except TokenError:
            # 위변조/만료 등이어도 쿠키만 제거하고 200 반환
            return resp

        return resp


# ─────────────────────────────────────────────────────────
# 7. 아이디 찾기 - 클래스형 뷰
# POST /api/auth/find-id/
# ─────────────────────────────────────────────────────────
class FindIdView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        # 파싱/미디어타입 오류 -> 400
        try:
            data = request.data
        except (ParseError, UnsupportedMediaType):
            return Response({"message": "잘못된 요청입니다."},
                            status=status.HTTP_400_BAD_REQUEST)

        # 유효성 검증
        serializer = FindIdRequestSerializer(data=data)
        try:
            serializer.is_valid(raise_exception=True)
        except NotFound as nf:
            detail = getattr(nf, "detail", {})
            if isinstance(detail, dict) and "message" in detail:
                return Response(detail, status=status.HTTP_404_NOT_FOUND)
            return Response({"message": "가입되지 않은 사용자입니다."},
                            status=status.HTTP_404_NOT_FOUND)
        except ValidationError as exc:
            # 필드 형식/누락 등
            return Response({"errors": exc.detail},
                            status=status.HTTP_400_BAD_REQUEST)

        # 성공 응답 200
        user = serializer.validated_data["user"]
        res = FindIdResponseSerializer({"user_id": getattr(user, "user_id")}).data
        return Response(res, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────
# 8. 비밀번호 찾기 - 클래스형 뷰
# POST /api/auth/find-password/
# ─────────────────────────────────────────────────────────
class FindPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    # 재설정 링크(프론트) 기본값을 settings에서 가져오되 없으면 폴백
    def _reset_base_url(self) -> str:
        # 예: settings.PASSWORD_RESET_URL = "https://your-frontend.com/reset-password"
        return (
            getattr(settings, "PASSWORD_RESET_URL", None)
            or getattr(settings, "FRONTEND_RESET_URL", None)
            or "/reset-password"
        )

    def post(self, request, *args, **kwargs):
        # 파싱/미디어타입 오류 -> 400
        try:
            data = request.data
        except (ParseError, UnsupportedMediaType):
            return Response({"message": "잘못된 요청입니다."},
                            status=status.HTTP_400_BAD_REQUEST)

        # 유효성 검증 (존재하지 않으면 시리얼라이저에서 NotFound)
        serializer = FindPasswordRequestSerializer(data=data)
        try:
            serializer.is_valid(raise_exception=True)
        except NotFound as nf:
            detail = getattr(nf, "detail", {})
            # 시리얼라이저가 {"message": "..."} 형태로 넣어줌
            return Response(detail if isinstance(detail, dict) else {"message": "가입되지 않은 사용자입니다."},
                            status=status.HTTP_404_NOT_FOUND)
        except ValidationError as exc:
            return Response({"errors": exc.detail},
                            status=status.HTTP_400_BAD_REQUEST)

        # 성공 시: 재설정 토큰 발급 + 메일 발송
        user = serializer.validated_data["user"]

        # 1) 재설정 토큰 생성 (서명 토큰)
        #    payload 예시: {"sub": user_seq, "uid": user_id}
        #    검증 시: signing.loads(token, salt="pwreset", max_age=1800)  # 30분 권장
        token = signing.dumps({"sub": user.user_seq, "uid": user.user_id}, salt="pwreset")

        # 2) 재설정 링크 구성
        base = self._reset_base_url().rstrip("/")
        reset_link = f"{base}?token={token}"

        # 3) 메일 발송 (Email backend 설정 필요)
        #    settings.DEFAULT_FROM_EMAIL, EMAIL_BACKEND 등이 설정되어 있어야 실제 발송됨
        subject = "[비밀번호 재설정 안내]"
        msg = (
            "비밀번호 재설정을 요청하셨습니다.\n\n"
            f"아래 링크를 통해 비밀번호를 재설정하세요 (유효기간 30분):\n{reset_link}\n\n"
            "본 요청을 본인이 하지 않았다면 이 메일을 무시하세요."
        )
        try:
            send_mail(
                subject=subject,
                message=msg,
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception:
            # 메일 서버/환경 문제 등 -> 필요 시 500으로 분기
            return Response({"message": "서버 내부 오류가 발생했습니다."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 200: 성공 메시지
        res = FindPasswordResponseSerializer({"message": "비밀번호 재설정 메일을 발송했습니다."}).data
        return Response(res, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────
# 9. 비밀번호 변경 - 클래스형 뷰
# POST /api/auth/change-password/ 
# ─────────────────────────────────────────────────────────
class ChangePasswordView(APIView):
    # 커스텀 메시지를 내려주기 위해 IsAuthenticated 대신 AllowAny + 시리얼라이저 검증으로 처리
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        # (A) 파싱/미디어타입 오류 -> 400
        try:
            data = request.data
        except (ParseError, UnsupportedMediaType):
            return Response({"message": "잘못된 요청입니다."},
                            status=status.HTTP_400_BAD_REQUEST)

        # (B) 유효성 검증 (컨텍스트에 로그인 사용자 전달)
        serializer = ChangePasswordRequestSerializer(
            data=data,
            context={"user": request.user if getattr(request.user, "is_authenticated", False) else None},
        )
        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as exc:
            detail = exc.detail
            # 비인증 -> 401
            if (not getattr(request.user, "is_authenticated", False)) and isinstance(detail, dict) and "message" in detail:
                return Response({"message": detail["message"]}, status=status.HTTP_401_UNAUTHORIZED)
            # 나머지 유효성 오류 -> 400
            if isinstance(detail, dict) and "message" in detail:
                return Response({"message": detail["message"]}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"errors": detail}, status=status.HTTP_400_BAD_REQUEST)

        # (C) 저장: 새 비밀번호 해시 후 저장
        user = serializer.validated_data["user"]
        new_pw = serializer.validated_data["new_password"]
        user.password_hash = make_password(new_pw)
        user.save(update_fields=["password_hash"])

        # (D) 보안: 기존 refresh 토큰 블랙리스트 + 쿠키 삭제(선택적이지만 권장)
        resp = Response(ChangePasswordResponseSerializer({"message": "비밀번호가 변경되었습니다."}).data,
                        status=status.HTTP_200_OK)

        raw_refresh = request.COOKIES.get("refresh")
        if raw_refresh:
            try:
                refresh = RefreshToken(raw_refresh)
                try:
                    refresh.blacklist()  # simplejwt blacklist 앱 사용 시
                except AttributeError:
                    pass  # 블랙리스트 미사용 환경
            except TokenError:
                pass  # 만료/위변조여도 무시
            resp.delete_cookie("refresh", path="/auth")

        return resp


# ─────────────────────────────────────────────────────────
# 10. 관리자 권한 부여(승격) - 클래스형 뷰
# POST /api/auth/admin/promote/
# ─────────────────────────────────────────────────────────
class AdminPromoteView(APIView):
    # 인증 실패/권한 실패 메시지를 명세대로 내려주기 위해 AllowAny + 시리얼라이저 검증 사용
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        # (A) 파싱/미디어타입 오류 -> 400
        try:
            data = request.data
        except (ParseError, UnsupportedMediaType):
            return Response({"message": "잘못된 요청입니다."},
                            status=status.HTTP_400_BAD_REQUEST)

        # (B) 유효성 검증 (요청자 컨텍스트 전달)
        serializer = AdminPromoteRequestSerializer(
            data=data,
            context={"user": request.user if getattr(request.user, "is_authenticated", False) else None},
        )
        try:
            serializer.is_valid(raise_exception=True)
        except PermissionDenied as pd:
            # 슈퍼관리자 아님 -> 403
            detail = getattr(pd, "detail", {})
            return Response(detail if isinstance(detail, dict) else {"message": "슈퍼 관리자가 아닙니다."},
                            status=status.HTTP_403_FORBIDDEN)
        except ValidationError as exc:
            # 잘못된 요청/필드 오류 -> 400
            detail = exc.detail
            if isinstance(detail, dict) and "message" in detail:
                return Response({"message": detail["message"]}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"errors": detail}, status=status.HTTP_400_BAD_REQUEST)

        # (C) 승격 처리
        target = serializer.validated_data["target_user"]
        actor = serializer.validated_data["actor"]
        granted_at = timezone.now()

        # ADMIN 등급 객체 조회 (0: USER, 1: ADMIN, 2: SUPER_ADMIN 가정)
        try:
            admin_level = UserLevel.objects.get(pk=1)
        except UserLevel.DoesNotExist:
            # 등급 테이블 설정 오류 -> 서버 문제로 간주
            return Response({"message": "서버 내부 오류가 발생했습니다."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            with transaction.atomic():
                target.grade_code = admin_level
                # 모델에 granted_at 필드가 있다고 가정(명세/이전 대화 기준)
                target.granted_at = granted_at
                target.save(update_fields=["grade_code", "granted_at"])
        except IntegrityError:
            return Response(
                {"errors": {"non_field_errors": ["승격 처리 중 오류가 발생했습니다. 다시 시도해주세요."]}},
                status=status.HTTP_400_BAD_REQUEST
            )

        # (D) 200: 성공 응답
        res = AdminPromoteResponseSerializer({
            "user_seq": target.user_seq,
            "admin_level": "ADMIN",
            "granted_at": granted_at,
            "acted_seq": actor.user_seq,
            "message": "관리자 권한이 부여되었습니다.",
        }).data
        return Response(res, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────
# 11. 관리자 권한 해제(강등) - 클래스형 뷰
# POST /api/auth/admin/demote/
# ─────────────────────────────────────────────────────────
class AdminDemoteView(APIView):
    # 인증/권한 메시지를 명세대로 내려주기 위해 AllowAny + 시리얼라이저 검증 사용
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        # (A) 파싱/미디어타입 오류 -> 400
        try:
            data = request.data
        except (ParseError, UnsupportedMediaType):
            return Response({"message": "잘못된 요청입니다."},
                            status=status.HTTP_400_BAD_REQUEST)

        # (B) 유효성 검증 (요청자 컨텍스트 전달)
        serializer = AdminDemoteRequestSerializer(
            data=data,
            context={"user": request.user if getattr(request.user, "is_authenticated", False) else None},
        )
        try:
            serializer.is_valid(raise_exception=True)
        except PermissionDenied as pd:
            detail = getattr(pd, "detail", {})
            return Response(detail if isinstance(detail, dict) else {"message": "슈퍼 관리자가 아닙니다."},
                            status=status.HTTP_403_FORBIDDEN)
        except ValidationError as exc:
            detail = exc.detail
            if isinstance(detail, dict) and "message" in detail:
                return Response({"message": detail["message"]}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"errors": detail}, status=status.HTTP_400_BAD_REQUEST)

        # (C) 강등 처리: ADMIN(1) -> USER(0)
        target = serializer.validated_data["target_user"]
        actor = serializer.validated_data["actor"]
        demoted_at = timezone.now()

        # USER 등급 객체 조회 (0: USER, 1: ADMIN, 2: SUPER_ADMIN 가정)
        try:
            user_level = UserLevel.objects.get(pk=0)
        except UserLevel.DoesNotExist:
            return Response({"message": "서버 내부 오류가 발생했습니다."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            with transaction.atomic():
                target.grade_code = user_level
                # 모델에 demoted_at 필드가 있다고 가정(명세 기준)
                target.granted_at = None  # 선택: 관리자 부여시각 초기화 (모델에 따라 생략 가능)
                target.save(update_fields=["grade_code", "granted_at"])
        except IntegrityError:
            return Response(
                {"errors": {"non_field_errors": ["강등 처리 중 오류가 발생했습니다. 다시 시도해주세요."]}},
                status=status.HTTP_400_BAD_REQUEST
            )

        # (D) 200: 성공 응답
        res = AdminDemoteResponseSerializer({
            "user_seq": target.user_seq,
            "demoted_at": demoted_at,
            "acted_seq": actor.user_seq,
            "message": "관리자 권한이 해제되었습니다.",
        }).data
        return Response(res, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────
# 12. 회원 목록 조회 - 클래스형 뷰
# GET /api/auth/users/
# ─────────────────────────────────────────────────────────
class UserListView(APIView):
    # 커스텀 메시지(401/403)를 컨트롤하기 위해 AllowAny 사용 후 직접 체크
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        # (A) 인증/권한 체크
        user = request.user if getattr(request.user, "is_authenticated", False) else None
        if not user:
            return Response({"message": "로그인이 필요합니다."}, status=status.HTTP_401_UNAUTHORIZED)

        level = getattr(getattr(user, "grade_code", None), "grade_code", 0)  # 0: USER, 1: ADMIN, 2: SUPER_ADMIN 가정
        if level < 1:
            return Response({"message": "관리자만 접근할 수 있습니다."}, status=status.HTTP_403_FORBIDDEN)

        # (B) 쿼리 파라미터(page, size) 파싱/검증
        qp = request.query_params
        try:
            page = int(qp.get("page", "1"))
            size = int(qp.get("size", "10"))
        except ValueError:
            return Response({"message": "잘못된 요청입니다."}, status=status.HTTP_400_BAD_REQUEST)

        if page < 1 or size < 1:
            return Response({"message": "잘못된 요청입니다."}, status=status.HTTP_400_BAD_REQUEST)

        # (선택) size 상한
        if size > 100:
            size = 100

        # (C) 조회 + 페이지네이션
        qs = (
            User.objects.select_related("grade_code")
            .order_by("-user_seq")  # 최신 가입 순 (원하면 user_seq 오름차순 등으로 변경)
        )

        total_count = qs.count()
        total_pages = math.ceil(total_count / size) if total_count else 0

        start = (page - 1) * size
        end = start + size
        rows = qs[start:end]

        # (D) items 구성
        items = []
        for u in rows:
            g = getattr(u, "grade_code", None)
            items.append({
                "user_seq": getattr(u, "user_seq"),
                "user_id": getattr(u, "user_id"),
                "user_name": getattr(u, "user_name"),
                "grade_code": getattr(g, "grade_code", 0),
                "grade_name": getattr(g, "grade_name", ""),
            })

        # (E) 응답 직렬화 및 반환
        payload = {
            "items": items,
            "page": page,
            "size": size,
            "total_count": total_count,
            "total_pages": total_pages,
            "message": "",
        }
        res = UserListResponseSerializer(payload).data
        return Response(res, status=status.HTTP_200_OK)