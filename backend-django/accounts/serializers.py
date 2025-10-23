# <DRF에서 시리얼라이저(Serializer)의 역할>
# (1) JSON <-> 파이썬 객체 변환: 데이터(모델 객체 = 클래스의 인스턴스 =  DB 테이블의 한 행)를 JSON 형식으로 변환하거나, 반대로 JSON -> 모델 객체로 변환하는 도구 => 쉽게말해, 백엔드와 프론트엔드가 서로 통신할 때 데이터 형식을 맞춰주는 통역사 같은 역할
# 예를들어 <User: id=1, username='testuser', email='test@example.com'> <- 이 모델 객체(클래스 인스턴스)를 
# { "id": 1, "username": "testuser", "email": "test@example.com" } <- 이러한 JSON으로 바꿔준다.
# (2) 데이터 검증 (Validation): 프론트엔드에서 보낸 요청 데이터(JSON)가 유효한 값인지 확인 (예: 이메일 형식 확인, 비밀번호 최소 길이 검사, 중복 아이디 체크 등)
# 이처럼 시리얼라이저에선 입력값 유효성 검증을 수행하고 나머지 비즈니스 로직(토큰 발급, DB 저장, 외부 API 연동, 비즈니스 상태 체크 등)은 뷰에서 보통 수행한다.
# 따라서 어떤 엔드포인트의 기능이 유효성 검증 + 토큰 발급이라면 유효성 검증은 시리얼라이저에서, 토큰 발급은 뷰에서 처리한다.
# (3) DB 저장 및 업데이트: 뷰에서 serializer.save()를 호출하면 -> 내부적으로 상황에 맞게 시리얼라이저에서 create() 또는 update() 호출하여 DB에 저장
# 보통은 직렬화/역직렬화, 유효성 검증까지가 일반적인 시리얼라이저의 역할이고 DRF에선 추가적으로 DB 저장까지 시리얼라이저가 수행한다.

# <DRF에서 시리얼라이저 작성법>
# 시리얼라이저는 [models.py, api 명세서]를 토대로 작성한다.
# 시리얼라이저는 기능별로 따로 만든다. 예를들어 회원가입 시리얼라이저, 로그인 시리얼라이저, 회원정보 조회 시리얼라이저, .... 등등
# API 엔드포인트(URL)를 하나 만든다면, 그 엔드포인트와 연결된 기능에 대한 시리얼라이저는 거의 항상 필요하다.
# 그리고 시리얼라이저는 요청용(reauest) 시리얼라이저 / 응답용(response) 시리얼라이저로 나눌 수 있는데, 
# 만약 요청 데이터(request header + parameter + body)가 있다면 요청용 시리얼라이저는 거의 항상 필수로 만들어줘야 하고, 응답용 시리얼라이저는 상황에 따라 달라진다.
# 따라서 응답용 시리얼라이저를 serializers.py에서 따로 작성하지 않는다면 응답 데이터(JSON)는 뷰에서 직접 구성해야한다.
# 이중에서 request body가 존재할때는 거의 항상 시리얼라이저가 필요하고 나머지 request 파라미터나 헤더만 존재한다면 별도의 요청용 시리얼라이저가 거의 필요없다.
# 이 프로젝트에선 모든 엔드포인트에 대한 요청용 시리얼라이저/응답용 시리얼라이저 둘 다 만들 예정이다.

# <시리얼라이저 vs 뷰(view)>
# 백엔드 API를 만들 때 이 둘은 함께 동작하지만, "관심사의 분리" 원칙에 따라 책임이 명확하게 나눠진다.
# 1. 시리얼라이저
# (1) 직렬화/역직렬화
# (2) 데이터 유효성 검증
# (3) 데이터 저장(CRUD 중 CU) -> DRF 한정

# 2. 뷰: 요청(Request) -> 처리 -> 응답(Response) 전체 흐름을 제어하는 컨트롤러
# (1) 클라이언트에서 들어온 HTTP 요청(GET, POST, PUT, DELETE 등)을 수신
# (2) 시리얼라이저 호출
# (3) 복잡한 비즈니스 로직 수행(목적없는 단순 기계적 CRUD가 아닌 서비스 정책, 특정 조건 등이 반영된 CRUD, 외부 API 호출 등)
# 만약 프로젝트 규모가 커지거나 비즈니스 로직이 매우 복잡해질 경우, 서비스 계층(Service Layer)을 새로 만들어서 비즈니스 로직을 여기서 전부 처리하기도 한다. 
# 그렇게 되면 뷰(views.py)는 HTTP 통신에 집중할 수 있고, 서비스(services.py)는 복잡한 로직에만 집중할 수 있게된다.

# <요청 시리얼라이저 vs 응답 시리얼라이저>
# 1. reqeust 시리얼라이저
# (1) 역직렬화
# (2) 데이터 유효성 검사
# (3) 데이터 저장 (create() / update()) -> DRF 한정

# 2. response 시리얼라이저
# (1) 직렬화
# (2) 출력 데이터 제어 및 가공
# (예외적) 유효성 검사: 백엔드가 실수해서 잘못된 데이터를 프론트로 보내는 걸 막기 위해 마지막에 한 번 더 점검 -> DRF 한정

# <시리얼라이저 작동 방향>
# 시리얼라이저는 두 가지 방향으로 작동한다.
# (1) Serialization(직렬화): Python 객체(모델 객체) -> JSON
# (2) Deserialization(역직렬화): JSON -> Python 객체(모델 객체)

# <CRUD 에서의 동작 과정>
# 1. GET(조회): DB -> 모델(models.py 안의 클래스) -> JSON -> 프론트엔드
# (1) DB에서 데이터를 가져오면 Django는 모델로 불러온다.
# (2) 이 모델은 데이터를 그대로 쓸 수 없기 때문에 -> 시리얼라이저를 통해 데이터를 JSON으로 변환한다.
# (3) 그리고 JSON을 프론트엔드로 전달한다.

# 2. POST/PUT (등록/수정): 프론트엔드 -> JSON -> 모델 -> DB
# (1) 프론트엔드가 JSON을 백엔드에 보낸다.
# (2) 시리얼라이저가 JSON을 받아 역직렬화를 통해 DB가 이해할 수 있는 데이터 형태인 모델 객체로 변환
# (3) 그리고 이 모델 객체가 DB에 저장됨

# DELETE는 삭제만하기 때문에 직렬화/역직렬화 과정을 거치지 않는다.
# ─────────────────────────────────────────────────────────────────────────────

from django.core.validators import RegexValidator
from datetime import date
from django.utils import timezone
from .validators.password_policy import validate_password_policy

# 파이썬에서 타입 힌트(Type Hint)를 제공하기 위한 모듈. typing에서 Dict와 Any를 가져옴
from typing import Dict, Any

# DRF에서 제공하는 HTTP 403 Forbidden 예외 클래스. 권한 부족(Authorization 실패) 상황에서 사용
from rest_framework.exceptions import PermissionDenied

# DRF에서 제공하는 HTTP 404 Not Found 예외 클래스. 요청한 리소스(데이터)가 존재하지 않을 때 사용
from rest_framework.exceptions import NotFound

# 데이터를 안전하게 서명(Signing)하고 검증(Verification)하기 위한 유틸리티를 제공
# 서버에서 문자열을 암호화 + 서명하여 안전하게 전달할 수 있도록 도와줌
from django.core import signing

# BadSignature: signing.loads()가 실행될 때, 토큰이 위변조되었거나 잘못된 값일 경우 발생하는 예외를 처리하기 위해 사용
# SignatureExpired: signing.loads() 호출 시, max_age로 설정한 만료시간이 지나면 발생하는 예외를 처리를 하기위해 사용
from django.core.signing import BadSignature, SignatureExpired

# Django가 제공하는 비밀번호 해싱 유틸리티 함수 -> 비밀번호를 DB에 평문으로 저장하면 보안 취약점이 생기므로 반드시 해싱(단방향 암호화)해야한다.
# make_password: 사용자가 입력한 평문 비밀번호를 안전하게 해시(hash)로 변환
# check_password: 사용자가 로그인할 때 입력한 평문 비밀번호가, DB에 저장된 해시 비밀번호와 일치하는지 확인
from django.contrib.auth.hashers import make_password, check_password

# # Django REST Framework(DRF)에서 제공하는 serializers 모듈을 불러옴
from rest_framework import serializers

# 특정 필드 값이 데이터베이스에서 유일해야 함을 자동 검증 (예: 회원가입 시 이메일/아이디 중복 여부 검사)
from rest_framework.validators import UniqueValidator

# models.py 파일에서 UserLevel, User 두 개의 모델 클래스를 불러옴
from .models import UserLevel, User


# ─────────────────────────────────────────────────────────────────────────────
# 1. 아이디 체크 - request 전용 시리얼라이저
# 수행 기능: 역직렬화 + 유효성 체크
# 역직렬화: request body에 들어온 JSON을 파이썬 객체로 변환
# ─────────────────────────────────────────────────────────────────────────────

# <ModelSerializer vs Serializer>
# 1. ModelSerializer: 모델(models.py)과 연결되어있는 시리얼라이저를 만들 때 사용
# (1) 모델 필드 자동 생성 => fields = [...]에 사용할 필드 집어넣기만 하면 끝
# (2) CRUD 기본 동작 자동 구현 => create(), update() 등의 함수 기본 제공
# (3) 모델 유효성 검증 => models.py에 정의된 필드 옵션 max_length, unique 등 자동 반영
# (4) ORM 객체(모델 객체 <=> DB 테이블의 한 행(row)을 파이썬 객체로 표현한 것) <-> JSON 자동 변환
# => ORM(Object Relational Mapping): 파이썬 클래스와 데이터베이스 테이블을 1:1로 연결해주는 기술
# => ORM을 사용하면 SQL문을 직접 작성하지 않고 파이썬 객체를 이용해 DB를 제어할 수 있다.
# => 장고에서는 models.py의 클래스가 ORM 모델이다.

# 2. Serializer: 모델(models.py)과 연결되지 않은 시리얼라이저를 만들 때 사용
# (1) 모델 필드 자동 생성 불가능 => 직접 선언해야 됨
# (2) CRUD 기본 동작 자동 구현 불가능 => create(), update() 등의 함수를 직접 만들어야됨
# (3) 모델 유효성 검증 => 각각의 필드에 max_length, unique 등을 직접 코딩해야 함
# (4) ORM 객체 <-> JSON 자동 변환 => 가능하지만 수동 선언 필요 

# 자바로 치면 => public class IdPrecheckRequestSerializer extends Serializer
class IdPrecheckRequestSerializer(serializers.Serializer):   # IdPrecheckRequestSerializer의 부모 클래스 Serializer 상속받음

    # <시리얼라이저 필드란?>
    # API에서 주고받을 데이터의 “한 조각”을 정의한 것 => JSON request body/response body의 key-value 쌍 하나를 표현하는 데이터 단위
    # 예를들어 request body의 JSON 형식이 {"email": "test@test.com", "user_id": "asdf123"}이고,
    # response body의 JSON 형식이 {"user_seq": 1, "email": "test@test.com", "user_name": "홍길동" } 라면
    # 시리얼라이저 필드는 email, user_id, user_seq, user_name이다.
    # 따라서 시리얼라이저 필드를 정할 때는 api 명세서의 request body, response body의 key값과 models.py의 속성들을 참고해서 필드로 집어넣으면된다.
    
    # 1. 아이디 패턴 검사
    # 모델 필드 오버라이드 - 모델(models.py)에도 존재하는 필드지만, 시리얼라이저에서 직접 재정의 (사용자가 직접 정의한 필드)
    # 그런데 user_id는 User 모델에 이미 존재하는 필드인데도 ModelSerializer로 갖다쓰지않고 직접 정의했는데,
    # 아이디 체크/이메일 체크 시리얼라이저에서는 유효성 체크(형식체크+중복검사)만 수행하고, DB에 저장(create(), update())하는것 같은 행위를 하지 않기때문에 
    # 굳이 무겁고 불필요하게 많은 기능을 가진 ModelSerializer 대신 가벼운 Serializer를 사용했다.
    # RegexField: 정규식을 이용해 입력값의 형식을 자동 검증해주는 시리얼라이저 필드 -> 클라이언트가 보낸 값이 지정된 패턴을 만족하지 않으면 ValidationError를 발생시킴
    # 따라서 DRF에서 Field() 클래스는 직렬화/역직렬화 + 간단한 유효성 체크 기능을 가지고있다.
    # 또한 Field 클래스 내부에는 to_representation(), to_internal_value() 메소드가 존재해서 얘네들이 각각 직렬화/역직렬화를 수행해준다.
    # 그리고 더 세밀하게 가공하고 싶다면 각각의 메소드를 오버라이드 해서 커스터마이징 하면 된다.
    user_id = serializers.RegexField(
        regex=r'^[a-z0-9]{5,20}$',   # 형식: 영문 소문자 + 숫자, 5~20자, 특수문자 불가
        trim_whitespace=True,        # 클라이언트가 실수로 " test123 " 처럼 앞뒤 공백을 넣어도 자동으로 제거
        write_only=True,             # 요청 전용 필드 -> 응답에서 제외
        allow_blank=False,           # 빈 문자열 입력 금지

        # <메시지 커스터마이징>
        # 시리얼라이저에서 처리하는 메시지 -> 에러 메시지 중심 (ValidationError)
        # 뷰에서 처리하는 메시지 -> 성공 메시지/안내 메시지 중심
        # 일반적으로 RequestSerializer에서의 메시지는 최종사용자(유저)를 위한거고 ResponseSerializer에서의 메시지는 유저 + 개발자를 위한것이다.
        # 여기서의 에러 메시지는 사용자에게 보여주기 위한 메시지이다. -> 하지만 사용자에게 보여줄지 말지 여부를 뷰에서 결정할 수 있다.
        # 명세서의 message 필드는 프론트에서 직접 관리 할 수도 있고 백엔드에서 메시지를 만들어서 보낸다음 프론트는 받아서 출력하게만 할 수도 있는데 이 프로젝트에선 모든 메시지를 백엔드에서 처리한 후 보낼 예정이다.
        # 메시지가 개발용도가 아니라 사용자에게 보여주기 위한 목적이라면 명세서의 response body의 message 필드에 추가해야한다.
        # 그리고 만약 모든 메시지를 프론트엔드에서 직접 관리하기로 정했다면 API 명세서 response body에서 message 필드는 제외해야한다.
        # 여기서의 에러 메시지는 시리얼라이저 검증 후 serializer.errors라는 딕셔너리 형태로 뷰(View)까지 전달된다. -> 여기서의 메시지도 뷰의 _first_error_message 함수를 통해 추출된다.
        # 그리고 [(2) 200 OK 형식오류, (3) 200 OK 중복(이미 존재)] 일때의 response body는 이미 여기서 로직구현(RegexField로 형식 체크, validate_user_id()로 중복 체크) 후 판단까지 했으므로
        # 뷰에서는 [(2) 200 OK 형식오류, (3) 200 OK 중복(이미 존재)]는 포맷구성만 하면되고  
        # 나머지 [(1) 200 OK 사용가능(중복 X, 형식 오류 X), 2. 400 Bad Request, 3. 429 Too Many Requests]는 뷰에서 로직구현+포맷구성 까지 하면된다.
        # 시리얼라이저의 모든 에러 메시지(error_message, message, default_error_message, ... 등)는 모두 serializer.errors에 저장된다.
        error_messages={
            "invalid": "아이디는 영문 소문자와 숫자만 사용 가능하며 5~20자여야 합니다.",  # 정규식에 맞지 않을 때
            "blank": "아이디를 입력해주세요.",                                          # 빈 문자열 입력 시
        }
    )

    # <validate_<필드명>() vs validate() 함수 차이>
    # 1. validate_<필드명>() => 이 한개의 필드만 개별적으로 검사 수행
    # 2. validate() => 모든 필드의 관계를 함께 검증
    # 둘 다 명시적으로 호출하지 않아도 뷰에서 is_valid() 함수 호출 시 자동으로 실행되는 메서드지만, 아래처럼 오버라이드해서 커스터마이징 할 수 있다.
    # 하지만 시리얼라이저 클래스에 validate_<필드명>, validate() 함수를 정의해놓지 않으면 뷰에서 is_valid()를 호출해도 실행되지 않는다.
    # 물론 Serializer 클래스에는 validate() 메서드가 정의되어 있어서 오버라이드를 하지 않아도 실행되긴 하지만 validate 안에 내부 로직이 없는 빈 메서드라서 실질적으로 실행이 안되는것과 마찬가지이다.
    # 즉, 얘네들은 개발자가 직접 클래스 안에 오버라이드 했을때만 실행된다.

    # <is_valid()가 호출될 때 실행순서>
    # (1) 각 필드에 정의된 기본 유효성 검사 -> 이건 validate_<필드명>(), validate() 오버라이드에 관계없이 항상 실행됨
    # (2) validate_<필드명>() 메서드들
    # (3) validate() 메서드

    # 2. 아이디 중복 검사 + 개발자가 임의로 정한 에러 코드 문자열 (code="duplicate")
    # validate_<필드명> 형식으로 메서드를 작성하면, DRF가 자동으로 그 필드 값이 유효한지 추가 검증을 수행
    # 호출 과정: 뷰(View) 실행 -> serializer = IdPrecheckRequestSerializer(data=request.data) 시리얼라이저 인스턴스 생성 -> serializer.is_valid() 여기서 각 필드 기본 검증(RegexField 등) 수행하고, validate_user_id 함수도 자동 호출
    def validate_user_id(self, value: str) -> str:

        # 장고 ORM을 사용해 데이터베이스에서 특정 조건을 만족하는 레코드가 존재하는지 빠르게 확인
        # User 모델에서 user_id 값이 value와 일치하는 행(Row) 들을 조회
        # exists() -> True/False 반환 -> 동일한 user_id가 존재하면 True 반환 후 에러 코드 실행. 동일한 user_id가 없다면 False 반환 후 바로 return value
        if User.objects.filter(user_id=value).exists():   # SELECT * FROM USER WHERE user_id = '입력값';
            
            # <실패 시>
            # 중복된 아이디가 있으면 유효성 검증 실패를 알리는 예외를 발생시킴
            # 첫 번째 인자: "이미 사용 중인 아이디입니다." -> 사용자에게 보여줄 에러 메시지 -> 이 또한 뷰에서 최종적으로 보여줄지말지 결정
            # 두 번째 인자: code="duplicate" -> 에러 코드 문자열을 함께 제공
            # raise로 함수가 즉시 중단되고 serializer.errors에 에러 코드 문자열(duplicate)을 담아서 뷰로 전달 
            # 뷰가 받게 되는 것 => serializer.errors = { "user_id":[ { "message": "이미 사용 중인 아이디입니다.","code": "duplicate" }] }
            raise serializers.ValidationError("이미 사용 중인 아이디입니다.", code="duplicate")
        
        # <성공 시>
        # 중복이 없으면 -> return으로 반환된 value(user_id)가 serializer.validated_data에 저장되어 뷰로 전달됨
        return value


# ─────────────────────────────────────────────────────────────────────────────
# 2. 아이디 체크 - response 전용 시리얼라이저
# 수행 기능: 직렬화
# 직렬화: response body에 들어갈 데이터를 JSON으로 변환
# ─────────────────────────────────────────────────────────────────────────────

class UserIdInfoSerializer(serializers.Serializer):
    valid = serializers.BooleanField(read_only=True)
    status = serializers.ChoiceField(
        choices=["available", "invalid", "taken"], # ChoiceField 클래스의 choices 옵션: "available", "invalid", "taken" 셋 중 하나여야만 유효성을 통과 -> 다른 문자열이 들어오면 ValidationError 발생
        read_only=True,
    )

class IdPrecheckResponseSerializer(serializers.Serializer):
    user_id = UserIdInfoSerializer(read_only=True)   
    id_check_token = serializers.CharField(read_only=True)
    expires_in = serializers.IntegerField(read_only=True, min_value=1)
    message = serializers.CharField(read_only=True)


# ─────────────────────────────────────────────────────────────────────────────
# 3. 이메일 체크 - request 전용 시리얼라이저
# 수행 기능: 역직렬화 + 유효성 체크
# ─────────────────────────────────────────────────────────────────────────────

class EmailPrecheckRequestSerializer(serializers.Serializer):

    # 1. 이메일 형식 검사
    # 모델 필드 오버라이드
    # EmailField: 이메일 주소 형식 검증을 자동으로 수행하는 DRF 기본 필드 -> 클라이언트가 보낸 값이 이메일 형식 패턴을 만족하지 않으면 ValidationError를 발생시킴
    # 이메일 형식은 EmailField가 이미 자동 검증 수행 (예: example@domain.com) -> 따라서 여기서는 추가로 허용 도메인 체크만 하면 됨.
    email = serializers.EmailField(
        max_length=150,             
        trim_whitespace=True,        
        write_only=True,             
        allow_blank=False,           
        error_messages={
            "invalid": "이메일 형식이 올바르지 않습니다.",  # 이메일 형식이 잘못되었을 때
            "blank": "이메일을 입력해주세요."               # 값이 비었을 때
        }
    )

    # 2. 이메일 중복 + 도메인 검사
    def validate_email(self, value: str) -> str:

        # (1) 허용 도메인 목록 정의
        allowed_domains = {"gmail.com", "naver.com", "kakao.com"}

        # EmailField가 이미 형식 검증을 끝냈으므로 여기서는 안전하게 split 가능
        # domain = ["example", "gmail.com"]
        domain = value.split("@")[1].lower()

        # (2) 도메인이 허용 목록에 있는지 확인
        if domain not in allowed_domains:
            raise serializers.ValidationError(
                f"허용되지 않은 도메인입니다. ({', '.join(allowed_domains)} 만 사용가능합니다.)",
                code="invalid_domain"
            )

        # (3) 중복 여부 확인
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("이미 사용 중인 이메일입니다.", code="duplicate")

        # 모든 검증 통과 시 원래 값(email) 반환
        return value


# ─────────────────────────────────────────────────────────────────────────────
# 4. 이메일 체크 - response 전용 시리얼라이저
# 수행 기능: 직렬화
# ─────────────────────────────────────────────────────────────────────────────

class EmailInfoSerializer(serializers.Serializer):
    valid = serializers.BooleanField(read_only=True)  
    status = serializers.ChoiceField(
        choices=["available", "invalid", "taken"],
        read_only=True
    )

class EmailPrecheckResponseSerializer(serializers.Serializer):
    email = EmailInfoSerializer(read_only=True) 
    email_check_token = serializers.CharField(read_only=True)  
    expires_in = serializers.IntegerField(read_only=True, min_value=1)  
    message = serializers.CharField(read_only=True)                  


# ─────────────────────────────────────────────────────────────────────────────
# 5. 회원가입 - request 전용 시리얼라이저
# 수행 기능: 역직렬화 + 유효성 체크 + DB에 저장
# ─────────────────────────────────────────────────────────────────────────────

class RegisterRequestSerializer(serializers.ModelSerializer):

    # 모델 필드 오버라이드
    # 이름 규칙: 한글/영문, 공백 허용, 2~20자
    # source="user_name" -> 내부적으로 모델의 user_name 필드와 연결
    username = serializers.CharField(
        source="user_name",
        max_length=20,
        trim_whitespace=True,
        write_only=True,
        allow_blank=False,

        # 여기서 message, error_messages는 모두 serializer.errors에 저장됨
        validators=[
            RegexValidator(
                regex=r"^(?=.{2,20}$)[가-힣a-zA-Z]+(?: [가-힣a-zA-Z]+)*$",
                message="이름은 2~20자 한글/영문과 공백만 사용할 수 있습니다."
            )
        ],
        error_messages={"blank": "이름을 입력해주세요."},
    )

    # 생년월일: 프론트가 'YYYY-MM-DD'로 전송 -> 서버에서 최종 검증
    birth_date = serializers.DateField(
        write_only=True,
        input_formats=["%Y-%m-%d"],
        error_messages={
            "invalid": "생년월일 형식이 올바르지 않습니다. 예: 2001-09-15",
            "required": "생년월일을 입력해주세요.",
        },
    )

    # 커스텀 필드 - 모델(models.py)에 없고 사용자가 새롭게 만들어낸 필드 (사용자가 직접 정의한 필드)
    # 비밀번호 생성규칙 중 8~16자 규칙처럼 단순하고 기본적인 검증은 필드에서 처리하고 나머지 복잡한 규칙은 validate()에서 처리함
    # CharField: 문자열을 입력받아 유효성을 검증하고, 직렬화/역직렬화 과정을 담당 -> 클라이언트가 보낸 비밀번호가 기본 검증 규칙을 만족하지 않으면 ValidationError를 발생시킴
    # write_only=True => 요청에서만 사용가능. 응답에는 포함되지 않음.
    # write_only=True일때의 요청(Request): 클라이언트 -> 서버로 데이터를 보낼 때 사용 가능 (request body로는 이 데이터를 보낼 수 있음)
    # write_only=True일때의 응답(Response): 서버 -> 클라이언트로 데이터를 보낼 때 이 데이터는 자동으로 제외됨 (response body로는 이 데이터가 오지 않음)
    # 만약 write_only=True를 명시적으로 써주지 않으면 자동으로 response로도 이 데이터가 전송된다. 
    # 즉, 해시 변환 안 된 비밀번호(평문 비밀번호)는 서버로 보낼 수만 있고 서버가 클라이언트에게 다시 돌려주는 일은 없다.
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        max_length=16,
        trim_whitespace=True,
        style={"input_type": "password"},  # style={"input_type": "password"} => 브라우저에서 입력한 값이 ****** 으로 가려짐

        # 여기 에러메시지 부터는 api 명세서의 response body에 반영 안함
        error_messages={
            "min_length": "비밀번호는 최소 8자 이상이어야 합니다.",
            "max_length": "비밀번호는 최대 16자 이하이어야 합니다.",
            "blank": "비밀번호를 입력해주세요.",
        },
    )
    
    password2 = serializers.CharField(
        write_only=True,
        min_length=8,
        max_length=16,
        trim_whitespace=True,
        style={"input_type": "password"},
        error_messages={
            "min_length": "비밀번호 확인은 최소 8자 이상이어야 합니다.",
            "max_length": "비밀번호 확인은 최대 16자 이하이어야 합니다.",
            "blank": "비밀번호 확인을 입력해주세요.",
        },
    )

    # 커스텀 필드
    agree_whether = serializers.BooleanField(write_only=True)  # 이건 보안 문제 때문이 아니라 굳이 response로 받을 필요가 없기 때문에 write_only
    
    # 커스텀 필드
    # 얘네들도 굳이 response로 받을 필요가 없기 때문에 write_only
    # required=False: request body에 토큰 관련 필드가 없어도 오류가 발생하지 않음 -> 명시적으로 적지 않으면 기본값은 required=True이다.
    # allow_blank=True: 빈 문자열 허용 -> 명시적으로 적지 않으면 기본값은 allow_blank=False이다.
    # => 필드가 없어도 되고 있어도 빈 문자열 허용 (예: {"id_check_token": ""} -> 통과)
    # => 여기서는 일단 통과시켰다가 밑에 validate()에서 헬퍼함수를 만들어 제대로 검사한다.
    id_check_token = serializers.CharField(write_only=True, required=False, allow_blank=True)
    email_check_token = serializers.CharField(write_only=True, required=False, allow_blank=True)

    # 모델 필드 오버라이드
    # 여기서의 검증은 중복검사 + 필드 자체검증만 수행
    # 아이디/이메일은 위에서 별도의 시리얼라이저를 만들었기 때문에 총 2번의 검증을 거치게된다.
    # error_messages -> 필드 자체 에러 메시지 -> CharField, EmailField, RegexField 등에서 사용
    # message -> UniqueValidator 클래스의 중복 검사 에러 메시지 -> error_message라고 작성하면 동작하지 않음
    # 여기서의 메시지도 사용자에게 보여주기 위한 메시지이고, 사용자에게 보여줄지 말지 여부를 뷰에서 결정할 수 있다.
    # 따라서 명세서 response body의 응답 예시에 반영해야하지만 안할 예정이다.
    user_id = serializers.CharField(
        max_length=50,
        trim_whitespace=True,
        write_only=True,
        allow_blank=False,
        validators=[UniqueValidator(queryset=User.objects.all(), message="이미 사용 중인 아이디입니다.")],
        error_messages={"blank": "아이디를 입력해주세요."},
    )
    email = serializers.EmailField(
        max_length=150,
        trim_whitespace=True,
        write_only=True,
        allow_blank=False,
        validators=[UniqueValidator(queryset=User.objects.all(), message="이미 사용 중인 이메일입니다.")],
        error_messages={
            "invalid": "이메일 형식이 올바르지 않습니다.",
            "blank": "이메일을 입력해주세요.",
        },
    )

    class Meta:
        model = User  # models.py의 User 모델 지정

        # 모델 필드는 Meta에서 fields =[...]로 가져오는건 맞지만, 사용자가 직접 정의한 필드(오버라이드, 커스텀)도 집어넣을 수 있기 때문에 fields에 들어있다고 해서 전부 모델 필드인것은 아니다.
        # 또한 ModelSerializer에선 Serializer와 달리 필드를 사용하려면 위에서 정의한 필드라고 할지라도 반드시 fields에 전부 넣어놔야 한다.
        fields = [
            "user_id", "password", "password2", "username",
            "birth_date", "gender", "email",
            "agree_whether", "id_check_token", "email_check_token",
        ]

    # <여기서부턴 복잡한 검증 수행하는 함수 정의>
    # ── 1. 약관 정책 동의 검증 - 단일 필드 검증 ─────────────────────────────────────────────────────────
    # 통과 시 값(True)을 그대로 리턴 -> validated_data['agree_whether'] = True로 저장된다.
    def validate_agree_whether(self, v: bool) -> bool:
        if v is not True:
            raise serializers.ValidationError("약관/정책 동의가 필요합니다.")
        return v
    
    # ── 2. 생년월일 정책 검증 - 단일 필드 검증 ──────────────────────────────
    def validate_birth_date(self, v: date) -> date:
        today = timezone.localdate()  # TZ 고려
        if v > today:
            raise serializers.ValidationError("생년월일은 오늘 이후일 수 없습니다.")

        # 만 나이 계산
        age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
        if age < 14 and age >= 0:
            raise serializers.ValidationError("만 14세 이상만 가입할 수 있습니다.")
        elif age < 0 or age >= 120:
            raise serializers.ValidationError("생년월일이 올바르지 않습니다.")
        return v

    # ── 3. 비밀번호 정책 헬퍼함수 ────────────────────────────────────────────────────
    # 헬퍼 함수 => 어떤 기능을 수행하는 주요 함수 안에서 반복되거나 복잡한 작업을 분리해 놓은 작은 보조 함수
    # 가독성과 유지보수를 위해 코드 일부를 분리해 독립적으로 만든다.
    # validate()가 회원가입 시 모든 검증을 담당하는 본 함수이고, 얘네들은 validate() 안에서만 쓰이는 보조 함수

    # (1) 아이디 중복확인/이메일 중복확인 토큰이 유효한지 확인하기 위한 함수
    # 필드에서 대충 통과시킨 체크 토큰에 대한 유효성 검사를 여기서 제대로 수행
    def _verify_precheck_token(self, token: str, kind: str, subject: str, max_age: int = 600) -> bool:
        # token: 프론트엔드에서 전달된 사전 중복검사 토큰 문자열
        # kind: 'user_id' 또는 'email' -> 토큰이 어떤 검증용인지 구분
        # subject: 현재 사용자가 입력한 실제 값 (예: 아이디 문자열, 이메일 문자열)
        # max_age: 토큰의 최대 유효 시간 600초

        # 토큰이 없다면 검증할 필요없이 바로 실패 처리
        if not token:
            return False
        
        # <전체 흐름>
        # 1. 프론트엔드가 아이디 "hong123" 입력 후 중복검사 API 호출
        # 2. 서버가 DB에서 찾아보고 사용가능 시 토큰을 signing.dumps()로 암호화하여 발급 -> signing.dumps()는 뷰에서 개발자가 직접 호출해야 됨
        # 3. 서버가 응답으로 프론트에게 { id_check_token: "암호화된문자열" } 반환
        # 4. 프론트는 최종 회원가입 시 서버에게 [아이디, 이메일, 암호화된 토큰, ...] 함께 전송
        # 5. 서버는 암호화된 토큰을 signing.loads()로 복호화하여 진짜인지 확인
        # 6. 검증 통과 시 회원가입 진행, 실패 시 에러 반환

        # <서버가 토큰을 암호화 하는 이유>
        # 만약 암호화를 하지 않고 프론트로 토큰을 보내주면 해커가 토큰을 받아서 직접 토큰을 위조하거나/만든 후 서버로 보낼 수 있기 때문에
        # 서버 입장에선 이 토큰이 진짜 자기가 발급한 토큰인지 만들어진 토큰인지 알 길이 없다. 

        # <토큰 복호화(암호문 -> 평문) 시도>
        # Payload (페이로드): 전송되는 전체 데이터 중 핵심 실질 정보 부분
        # 여기서의 payload: signing.loads()를 사용하여 복호화된 평문 데이터
        # signing.loads(): 서버가 signing.dumps()로 암호화한 토큰을 다시 원래 데이터로 되돌리는 복호화 함수
        # 복호화 후 나온 payload 값 => 예: payload = {"kind": "user_id","sub": "test123"}
        try:
            payload = signing.loads(
                token,                  # token은 암호화된 데이터, payload는 평문 데이터
                salt=f"precheck:{kind}",
                max_age=max_age,        # 만료 시 SignatureExpired
            )

        # 토큰 복호화 실패 시 False 반환
        # BadSignature: 토큰이 위변조되었거나 잘못된 형식
        # SignatureExpired: 유효 시간이 초과되어 만료
        except (BadSignature, SignatureExpired):
            return False

        # 복호화된 토큰(payload)의 내용이 서버에서 기대한 값과 정확히 일치하는지 최종 확인
        # 최종 return이 True 반환 시 통과
        return (
            payload.get("kind") == kind  # user_id == user_id 이면 True. email인데 user_id 토큰이라고 속이면 -> False
            and str(payload.get("sub", "")).lower() == str(subject).lower()  # test123 == test123 이면 True
        )

    # ── 4. 회원가입 시 최종 검증을 수행하는 함수 - 여러 필드 교차 검증 ─────────────────────────────────────────────────────────
    def validate(self, attrs: dict) -> dict:
        # attrs: 프론트엔드에서 보낸 request body 데이터가 들어있는 딕셔너리

        # request body에 들어있는 값들 꺼내기. 없으면 "" 반환
        # or "" -> 값이 None이거나 빈 값일 경우에도 강제로 빈 문자열로 통일
        pw1 = attrs.get("password", "") or ""
        pw2 = attrs.get("password2", "") or ""
        user_id = attrs.get("user_id", "") or ""
        gender = attrs.get("gender")

        # 1) 비밀번호와 비밀번호 확인이 다르면 -> 회원가입 차단
        if pw1 != pw2:
            raise serializers.ValidationError({"password2": "비밀번호가 서로 일치하지 않습니다."})

        # 2) 성별 값 허용 범위
        if gender not in ("M", "F"):
            raise serializers.ValidationError({"gender": "성별은 'M' 또는 'F'만 허용됩니다."})

        # 3) 비밀번호 보안 정책 검증 - 공용 규칙 적용
        violations = validate_password_policy(pw1, user_id=user_id)
        if violations:
            # 여러 개의 위반사항을 모아 한꺼번에 프론트로 전달
            # 예: {"password": ["대문자/소문자/숫자/특수문자 중 3종 이상을 포함해야 합니다.","연속된 숫자 4자를 사용할 수 없습니다(예: 1234, 4321)."]}
            raise serializers.ValidationError({"password": violations})

        # 4) 사전 중복검사 토큰 필수 검증
        # 회원가입 최종 버튼 누르기 전에 반드시 아이디 중복검사와 이메일 중복검사를 먼저 하고 와야 한다.
        id_token = attrs.get("id_check_token", "") or ""
        email_token = attrs.get("email_check_token", "") or ""
        email = attrs.get("email", "") or ""

        # 만약 프론트가 토큰을 보내지 않았다면 바로 에러 발생
        if not id_token:
            raise serializers.ValidationError({"id_check_token": "아이디 중복검사 토큰이 필요합니다."})
        if not email_token:
            raise serializers.ValidationError({"email_check_token": "이메일 중복검사 토큰이 필요합니다."})

        # 토큰의 유효성 검증
        if not self._verify_precheck_token(id_token, kind="user_id", subject=user_id):
            raise serializers.ValidationError({"id_check_token": "유효하지 않거나 만료된 아이디 토큰입니다."})
        if not self._verify_precheck_token(email_token, kind="email", subject=email):
            raise serializers.ValidationError({"email_check_token": "유효하지 않거나 만료된 이메일 토큰입니다."})

        # 검증 통과 -> 최종 반환
        # 모든 검증을 통과하면, attrs 그대로 반환 -> validated_data에 저장
        # validated_data에 attrs가 삽입됨
        # 이후 create() 메서드에서 DB 저장 처리
        return attrs

    # ── 5. 회원 생성 로직 ──────────────────────────────────────────────────────────────
    # create() 메서드는 회원가입 시 최종적으로 DB에 사용자 데이터를 저장하는 역할을 함
    def create(self, validated_data):
        # validated_data: validate() 메서드에서 검증을 통과한 값들이 담긴 딕셔너리

        # DB에 없는 커스텀 필드 제거
        validated_data.pop("password2", None)
        validated_data.pop("agree_whether", None)
        validated_data.pop("id_check_token", None)
        validated_data.pop("email_check_token", None)

        # 비밀번호 해시 처리 후 저장
        # 사용자가 입력한 평문 비밀번호(password)를 꺼냄 -> make_password()로 해시 변환 후 저장
        raw_pw = validated_data.pop("password")
        validated_data["password_hash"] = make_password(raw_pw)

        # UserLevel 테이블에서 PK(primary key) 값이 0인 행을 가져옴 => default_level 변수에는 일반회원 객체가 들어감
        default_level = UserLevel.objects.get(pk=0)

        # 회원가입 시 등급을 자동으로 넣기 위해 사용
        # setdefault("key", value): 해당 키가 없을 때만 기본값을 추가
        # validated_data에는 {'user_id': 'hong123', 'grade_code': 일반회원 객체}이 들어감
        validated_data.setdefault("grade_code", default_level)

        # 언패킹 연산자로 validated_data 딕셔너리의 값들을 하나씩 풀어서 전달
        # validated_data = { "user_id": "hong123", "password": "Test1234!", "username": "홍길동", ... }
        return User.objects.create(**validated_data)
    

# ─────────────────────────────────────────────────────────────────────────────
# 6. 회원가입 - response 전용 시리얼라이저
# 수행 기능: 직렬화
# ─────────────────────────────────────────────────────────────────────────────

class RegisterResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["user_seq", "joined_at"]   # message 제거

        # read_only_fields: ModelSerializer에서 제공하는 내장 옵션
        # read_only=True를 필드마다 하나씩 붙이는 대신, Meta 내부에서 한 번에 묶어서 읽기 전용으로 설정할 수 있다.
        read_only_fields = fields


# ─────────────────────────────────────────────────────────
# 7. 로그인 - request 시리얼라이저 
# 수행기능: 역직렬화 + 유효성 검증
# ─────────────────────────────────────────────────────────

class LoginRequestSerializer(serializers.Serializer):
    user_id = serializers.CharField(
        max_length=50,          
        trim_whitespace=True,   
        write_only=True,        
        allow_blank=False,      
        error_messages={
            "blank": "아이디를 입력해주세요.",
            "max_length": "아이디는 최대 50자까지 입력 가능합니다."
        }
    )

    password = serializers.CharField(
        write_only=True,        
        trim_whitespace=True,   
        style={"input_type": "password"},  
        allow_blank=False,      
        error_messages={
            "blank": "비밀번호를 입력해주세요."
        }
    )

    default_error_messages = {
        "invalid_credentials": "아이디 또는 비밀번호가 일치하지 않습니다.",
    }

    # Dict[str, Any] => key 타입: str, value 타입: Any
    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        uid = attrs.get("user_id")
        pw = attrs.get("password")

        # 1) 아이디로 사용자 조회
        user = User.objects.filter(user_id=uid).first()
        if not user:
            raise serializers.ValidationError({"message": self.error_messages["invalid_credentials"]})

        # 2) 비밀번호 검증
        if not check_password(pw, user.password_hash):
            raise serializers.ValidationError({"message": self.error_messages["invalid_credentials"]})

        # 3) 성공 시: 뷰에서 쓰도록 user만 남기고 민감 데이터인 password는 제거
        attrs["user"] = user
        attrs.pop("password", None) 
        return attrs


# ─────────────────────────────────────────
# 8. 엑세스 토큰 갱신 - response 시리얼라이저
# 수행 기능: 직렬화
# ─────────────────────────────────────────
class TokenRefreshResponseSerializer(serializers.Serializer):
    # 200 OK일 때만 포함. 포함되면 공백 불가
    access = serializers.CharField(required=False, read_only=True, allow_blank=False)

    # 401 등 에러 케이스에서만 포함 가능
    message = serializers.CharField(required=False, read_only=True, allow_blank=True)


# ─────────────────────────────────────────
# 9. 로그아웃 - response 시리얼라이저
# 수행 기능: 직렬화
# ─────────────────────────────────────────
class LogoutResponseSerializer(serializers.Serializer):
    message = serializers.CharField(read_only=True, allow_blank=True)


# ─────────────────────────────────────────────────────────
# 10. 아이디 찾기 - request 시리얼라이저
# 수행 기능: 역직렬화 + 유효성 체크
# ─────────────────────────────────────────────────────────
class FindIdRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(
        max_length=150,
        trim_whitespace=True, 
        write_only=True,       
        allow_blank=False,     
        error_messages={
            "invalid": "이메일 형식이 올바르지 않습니다.", 
            "blank": "이메일을 입력해주세요."             
        },
    )

    name = serializers.CharField(
        max_length=100,
        trim_whitespace=True,
        write_only=True,       
        allow_blank=False,     
        error_messages={
            "blank": "이름을 입력해주세요." 
        }
    )

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        email = attrs["email"]
        name = attrs["name"]

        # User 테이블에서 email과 user_name이 모두 일치하는 사용자 1명을 찾는다.
        user = User.objects.filter(email=email, user_name=name).only("user_id", "user_seq").first() # 성능 최적화를 위해 user_id, user_seq 두 컬럼만 SELECT
        if not user:
            raise NotFound(detail={"message": "가입되지 않은 사용자입니다."})

        attrs["user"] = user
        return attrs


# ─────────────────────────────────────────────────────────
# 11. 아이디 찾기 - response 시리얼라이저
# 수행 기능: 직렬화
# ─────────────────────────────────────────────────────────
class FindIdResponseSerializer(serializers.Serializer):
    user_id = serializers.CharField(
        max_length=50,
        required=False,      # 성공(200)일 때만 응답에 포함
        read_only=True,   
        allow_blank=False
    )

    message = serializers.CharField(
        required=False,      # 실패 시만 포함
        read_only=True,
        allow_blank=True   
    )


# ─────────────────────────────────────────────────────────
# 12. 비밀번호 찾기 - request 시리얼라이저 (이름+아이디+이메일 모두 일치해야 성공)
# 수행 기능: 역직렬화 + 유효성 체크
# ─────────────────────────────────────────────────────────
class FindPasswordRequestSerializer(serializers.Serializer):
    user_id = serializers.CharField(
        max_length=50,
        trim_whitespace=True,
        write_only=True,
        allow_blank=False,
    )
    name = serializers.CharField(                     # 추가: 이름
        max_length=50,
        trim_whitespace=True,
        write_only=True,
        allow_blank=False,
    )
    email = serializers.EmailField(                   # 추가: 이메일
        max_length=254,
        write_only=True,
        allow_blank=False,
    )

    default_error_messages = {
        "not_found": "이름/아이디/이메일이 일치하는 사용자가 없습니다.",
    }

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        uid = attrs["user_id"].strip()
        name = attrs["name"].strip()
        email = attrs["email"].strip()

        # 이름/아이디/이메일 모두 일치하는 사용자만 통과 (이메일/이름 대소문자 무시)
        user = (
            User.objects.filter(
                user_id=uid,
                email__iexact=email,
                user_name__iexact=name,   # ← 프로젝트에서 이름 컬럼명이 다르면 여기 수정
            )
            .only("user_seq", "user_id", "email", "user_name")
            .first()
        )

        if not user:
            # 404로 통일된 메시지 반환
            raise NotFound(detail={"message": self.error_messages["not_found"]})

        attrs["user"] = user
        return attrs


# ─────────────────────────────────────────────────────────
# 13. 비밀번호 찾기 - response 시리얼라이저
# 수행 기능: 직렬화
# ─────────────────────────────────────────────────────────
class FindPasswordResponseSerializer(serializers.Serializer):
    message = serializers.CharField(allow_blank=True, read_only=True)
    temp_password = serializers.CharField(required=False)   # 서버에서 새로 발급한 임시 비밀번호


# ─────────────────────────────────────────────────────────
# 14. 비밀번호 변경 - request 시리얼라이저
# 수행 기능: 역직렬화 + 유효성 체크
# ─────────────────────────────────────────────────────────
class ChangePasswordRequestSerializer(serializers.Serializer):
    # style={"input_type": "password"} => 브라우저에서 입력한 값이 ****** 으로 가려짐
    current_password = serializers.CharField(write_only=True, style={"input_type": "password"})
    new_password = serializers.CharField(write_only=True, style={"input_type": "password"})
    new_password_confirm = serializers.CharField(write_only=True, style={"input_type": "password"})

    default_error_messages = {
        "auth_required": "로그인이 필요합니다.",
        "mismatch_current": "현재 비밀번호가 일치하지 않습니다.",
        "mismatch_confirm": "새 비밀번호와 새 비밀번호 확인이 일치하지 않습니다.",
        "same_password": "새 비밀번호가 현재 비밀번호와 동일할 수 없습니다.",
    }

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        user: User | None = self.context.get("user")
        if not user:
            raise serializers.ValidationError({"message": self.error_messages["auth_required"]})

        curr = attrs["current_password"]
        new = attrs["new_password"]
        new_cfm = attrs["new_password_confirm"]

        # 1) 현재 비밀번호 확인
        if not check_password(curr, user.password_hash):
            raise serializers.ValidationError({"message": self.error_messages["mismatch_current"]})

        # 2) 새 비밀번호 확인 일치
        if new != new_cfm:
            raise serializers.ValidationError({"message": self.error_messages["mismatch_confirm"]})

        # 3) 새 비밀번호가 현재와 동일 금지
        if curr == new:
            raise serializers.ValidationError({"message": self.error_messages["same_password"]})
        
        # 4) 회원가입과 동일한 보안 규칙 적용
        violations = validate_password_policy(new, user_id=getattr(user, "user_id", None))
        if violations:
            # 회원가입과 동일 포맷으로 리턴 (키명 통일 권장: "new_password")
            raise serializers.ValidationError({"new_password": violations})
        
        attrs["user"] = user  # 뷰에서 저장 시 재조회 없이 사용
        return attrs


# ─────────────────────────────────────────────────────────
# 15. 관리자 권한 부여(승격) - request 시리얼라이저
# 수행 기능: 역직렬화 + 유효성 체크
# ─────────────────────────────────────────────────────────
class AdminPromoteRequestSerializer(serializers.Serializer):
    user_seq = serializers.IntegerField(min_value=1, write_only=True)

    default_error_messages = {
        "bad_request": "잘못된 요청입니다.",                 # 400
        "forbidden": "슈퍼 관리자가 아닙니다.",               # 403
    }

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:

        # 1. 요청자(actor) 확인
        actor: User | None = self.context.get("user")

        # 요청자 인증 실패 -> 400 반환
        if not actor:
            raise serializers.ValidationError({"message": self.error_messages["bad_request"]})

        # 2. 요청자가 SUPER_ADMIN(2)인지 확인
        actor_level = getattr(getattr(actor, "grade_code", None), "grade_code", 0)
        if actor_level != 2:  
            raise PermissionDenied(detail={"message": self.error_messages["forbidden"]})

        # 3. 승격 대상 사용자(target) 조회
        target = User.objects.select_related("grade_code").filter(user_seq=attrs["user_seq"]).first()
        if not target:
            raise serializers.ValidationError({"message": self.error_messages["bad_request"]})

        # 4. 대상 사용자가 이미 관리자거나 SUPER_ADMIN이면 승격 불가
        target_level = getattr(getattr(target, "grade_code", None), "grade_code", 0)
        if target_level >= 1:
            raise serializers.ValidationError({"message": self.error_messages["bad_request"]})

        # 5. 뷰에서 바로 사용 가능하도록 객체를 attrs에 넣어서 반환
        attrs["actor"] = actor
        attrs["target_user"] = target

        return attrs


# ─────────────────────────────────────────────────────────
# 16. 관리자 권한 부여(승격) - response 시리얼라이저
# 수행 기능: 직렬화
# ─────────────────────────────────────────────────────────
class AdminPromoteResponseSerializer(serializers.Serializer):
    user_seq = serializers.IntegerField(min_value=1, read_only=True)
    admin_level = serializers.ChoiceField(choices=["ADMIN"], read_only=True)
    granted_at = serializers.DateTimeField(
        format="%Y-%m-%dT%H:%M:%S%z",
        read_only=True,
    )
    acted_seq = serializers.IntegerField(min_value=1, read_only=True)
    message = serializers.CharField(allow_blank=True, read_only=True)


# ─────────────────────────────────────────────────────────
# 17. 관리자 권한 해제(강등) - request 시리얼라이저
# 수행 기능: 역직렬화 + 유효성 체크
# ─────────────────────────────────────────────────────────
class AdminDemoteRequestSerializer(serializers.Serializer):
    user_seq = serializers.IntegerField(min_value=1, write_only=True)

    default_error_messages = {
        "bad_request": "잘못된 요청입니다.",          # 400
        "forbidden": "슈퍼 관리자가 아닙니다.",        # 403
    }

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:

        # 1. 요청자(actor) 확인
        actor: User | None = self.context.get("user")
        if not actor:
            raise serializers.ValidationError({"message": self.error_messages["bad_request"]})

        # 2. 요청자가 SUPER_ADMIN인지 확인
        actor_level = getattr(getattr(actor, "grade_code", None), "grade_code", 0)
        if actor_level != 2:  # 2 = SUPER_ADMIN
            raise PermissionDenied(detail={"message": self.error_messages["forbidden"]})

        # 3. 강등 대상 사용자(target) 조회
        target = User.objects.select_related("grade_code").filter(user_seq=attrs["user_seq"]).first()
        if not target:
            raise serializers.ValidationError({"message": self.error_messages["bad_request"]})

        # 4. 강등 대상자의 현재 등급 확인   
        target_level = getattr(getattr(target, "grade_code", None), "grade_code", 0)
        # 강등 당하는 API는 ADMIN(1)만 가능. SUPER_ADMIN(2) 또는 일반 유저(0)는 강등 당할 수 없음
        if target_level != 1:
            raise serializers.ValidationError({"message": self.error_messages["bad_request"]})

        # 5. 뷰에서 바로 사용할 객체를 attrs에 주입
        attrs["actor"] = actor
        attrs["target_user"] = target
        return attrs


# ─────────────────────────────────────────────────────────
# 18. 관리자 권한 해제(강등) - response 시리얼라이저
# 수행 기능: 직렬화
# ─────────────────────────────────────────────────────────
class AdminDemoteResponseSerializer(serializers.Serializer):
    user_seq = serializers.IntegerField(min_value=1, read_only=True)
    demoted_at = serializers.DateTimeField(
        format="%Y-%m-%dT%H:%M:%S%z",
        read_only=True
    )
    acted_seq = serializers.IntegerField(min_value=1, read_only=True)
    message = serializers.CharField(allow_blank=True, read_only=True)


# ─────────────────────────────────────────────────────────
# 19. 회원 목록 조회 - response 전용 시리얼라이저
# 수행 기능: 직렬화
# ─────────────────────────────────────────────────────────

class UserListItemSerializer(serializers.Serializer):
    user_seq = serializers.IntegerField(min_value=1, read_only=True)
    user_id = serializers.CharField(max_length=50, read_only=True)
    user_name = serializers.CharField(max_length=100, read_only=True)
    grade_code = serializers.ChoiceField(choices=[0, 1, 2], read_only=True)
    grade_name = serializers.CharField(max_length=20, read_only=True)

class UserListResponseSerializer(serializers.Serializer):
    items = UserListItemSerializer(many=True, read_only=True)  # many=True: 이 필드는 리스트(여러 객체)를 직렬화해야 한다는 뜻 -> 명시적으로 적지않으면 기본값: many=False
    page = serializers.IntegerField(min_value=1, read_only=True)
    size = serializers.IntegerField(min_value=1, read_only=True)
    total_count = serializers.IntegerField(min_value=0, read_only=True)
    total_pages = serializers.IntegerField(min_value=0, read_only=True)
    message = serializers.CharField(allow_blank=True, read_only=True)
