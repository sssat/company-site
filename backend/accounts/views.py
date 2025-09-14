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
import re
from django.core import signing
from .models import User, UserLevel

# Django 프로젝트의 설정값을 코드에서 사용하기 위해 가져옴
from django.conf import settings

# JSON을 파싱하다가 실패했을 때 발생하는 표준 예외 클래스
from rest_framework.exceptions import ParseError

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



# ─────────────────────────────────────────────────────────
# 1. 아이디 체크 - 클래스형 뷰
# 수행 기능: user_id의 유효성 검사 + 결과를 JSON 형태로 반환
# POST /api/auth/register/precheck/user-id/
# ─────────────────────────────────────────────────────────
class IdPrecheckView(APIView):  # IdPrecheckView의 부모 클래스 APIView 상속받음

    # AllowAny 권한을 부여: 인증되지 않은 사용자도 접근 가능 -> 회원가입은 누구나 접근 가능해야 하므로
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):

        # 400: 파싱/미디어타입 오류 -> 통일 메시지
        try:
            data = request.data  # 여기서 ParseError 가능
        except ParseError:
            return Response({"message": "잘못된 요청입니다."}, status=status.HTTP_400_BAD_REQUEST)

        # 400: 요청 바디 형태/키/타입 검증
        if not isinstance(data, dict):
            return Response({"message": "잘못된 요청입니다."}, status=status.HTTP_400_BAD_REQUEST)
        if "user_id" not in data or not isinstance(data.get("user_id"), str):
            return Response({"message": "잘못된 요청입니다."}, status=status.HTTP_400_BAD_REQUEST)

        # 아이디 체크 request 시리얼라이저 객체 생성
        s = IdPrecheckRequestSerializer(data=request.data)   # request.data = request body

        # <IdPrecheckRequestSerializer를 이용해 request body의 user_id 유효성 검증 수행>
        # is_valid(): Serializer 클래스에 기본적으로 정의되어있는 함수 => 이 함수는 완성형으로 존재하기 때문에 오버라이드 할 필요 없이 바로 쓰면된다.
        # is_valid() 함수 호출 시 시리얼라이저 내부의 [각 필드에 정의된 기본 유효성 검사, validate_필드명(), validate()]를 순서대로 자동호출
        # 3가지의 유효성 검증이 모두 통과되면 True 반환
        if s.is_valid():

            # <유효성 검사 통과 시 <=> 아이디 사용가능 시>
            # validated_data에서 "user_id" 꺼내서 변수에 저장
            user_id = s.validated_data["user_id"]   

            # _precheck_ok_response() 헬퍼 함수를 호출해 성공 응답 JSON을 생성
            # serializer.data: 객체를 dict으로 변환
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

        # _first_error_message(errs) 헬퍼함수로 첫 번째 에러 메시지만 간단히 추출
        msg = _first_error_message(errs)

        # 첫 번째 에러 코드 확인
        first_key = next(iter(errs))
        first_error = errs[first_key][0] if isinstance(errs[first_key], list) else errs[first_key]
        error_code = getattr(first_error, "code", "")

        # "duplicate" 문자열이 s.errors에 포함되어 있다면 => "taken" -> 이미 사용 중인 아이디
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
        # 400: 요청 자체가 잘못된 경우만
        try:
            data = request.data
        except ParseError:
            return Response({"message": "잘못된 요청입니다."}, status=status.HTTP_400_BAD_REQUEST)

        if not isinstance(data, dict):
            return Response({"message": "잘못된 요청입니다."}, status=status.HTTP_400_BAD_REQUEST)
        if "email" not in data or not isinstance(data.get("email"), str):
            return Response({"message": "잘못된 요청입니다."}, status=status.HTTP_400_BAD_REQUEST)

        # (정상 흐름) 시리얼라이저 검증
        s = EmailPrecheckRequestSerializer(data=data)

        # (1) 성공
        if s.is_valid():
            email = s.validated_data["email"]
            return Response(
                EmailPrecheckResponseSerializer(_precheck_ok_response("email", email)).data,
                status=status.HTTP_200_OK
            )

        # (2) 실패(형식오류/허용 도메인 아님/중복)도 200으로
        errs = s.errors
        msg = _first_error_message(errs)

        first_key = next(iter(errs))
        first_error = errs[first_key][0] if isinstance(errs[first_key], list) else errs[first_key]
        error_code = getattr(first_error, "code", "")

        # 중복이면 taken, 그 외(invalid, invalid_domain 등)는 invalid
        status_str = "taken" if error_code == "duplicate" else "invalid"

        payload = {
            "email": {"valid": False, "status": status_str},
            "message": msg
        }
        return Response(
            EmailPrecheckResponseSerializer(payload).data,
            status=status.HTTP_200_OK
        )



