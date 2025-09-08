# 시리얼라이저(Serializer)
# <역할>
# (1) JSON <-> 파이썬 객체 변환: 데이터(모델 객체 = 클래스의 인스턴스)를 JSON 형식으로 변환하거나, 반대로 JSON -> 모델 객체로 변환하는 도구 => 쉽게말해, 백엔드와 프론트엔드가 서로 통신할 때 데이터 형식을 맞춰주는 통역사 같은 역할
# 예를들어 <User: id=1, username='testuser', email='test@example.com'> <- 이 모델 객체(클래스 인스턴스)를 
# { "id": 1, "username": "testuser", "email": "test@example.com" } <- 이러한 JSON으로 바꿔준다.
# (2) 데이터 검증 (Validation): 프론트엔드에서 보낸 요청 데이터(JSON)가 유효한 값인지 확인 (예: 이메일 형식 확인, 비밀번호 최소 길이 검사, 중복 아이디 체크 등)
# 이처럼 시리얼라이저에선 입력값 유효성 검증을 수행하고 나머지 비즈니스 로직(토큰 발급, DB 저장, 외부 API 연동, 비즈니스 상태 체크 등)은 뷰에서 보통 수행한다.
# 따라서 어떤 엔드포인트의 기능이 유효성 검증 + 토큰 발급이라면 유효성 검증은 시리얼라이저에서, 토큰 발급은 뷰에서 처리한다.

# 시리얼라이저는 [models.py, api 명세서]를 토대로 작성한다.
# 시리얼라이저는 기능별로 따로 만든다. 예를들어 회원가입 시리얼라이저, 로그인 시리얼라이저, 회원정보 조회 시리얼라이저, .... 등등
# API 엔드포인트(URL)를 하나 만든다면, 그 엔드포인트와 연결된 기능에 대한 시리얼라이저는 거의 항상 필요하다.
# 그리고 시리얼라이저는 요청용(reauest) 시리얼라이저 / 응답용(response) 시리얼라이저로 나눌 수 있는데, 
# 만약 요청 데이터(request header + parameter + body)가 있다면 요청용 시리얼라이저는 거의 항상 필수로 만들어줘야 하고, 응답용 시리얼라이저는 상황에 따라 달라진다.
# 따라서 응답용 시리얼라이저를 serializers.py에서 따로 작성하지 않는다면 응답 데이터(JSON)는 뷰에서 직접 구성해야한다.
# 요청용 시리얼라이저의 역할은 유효성 체크 + 역직렬화이고, 응답용 시리얼라이저의 주요 역할은 직렬화이다.
# 이중에서 request body가 존재할때는 거의 항상 시리얼라이저가 필요하고 나머지 request 파라미터나 헤더만 존재한다면 별도의 시리얼라이저가 거의 필요없다.
# 이 프로젝트에선 요청용 시리얼라이저/일부 응답용 시리얼라이저 둘 다 만들 예정이다.
# 따라서 요청 데이터 중 유효성 검증에 대한것과 일부 응답 데이터는 시리얼라이저를 만들어서 처리하고 그 외 나머지는 뷰에서 처리할 예정이다.

# 시리얼라이저는 두 가지 방향으로 작동한다.
# (1) Serialization(직렬화): Python 객체(모델 객체) → JSON
# (2) Deserialization(역직렬화): JSON → Python 객체(모델 객체)

# <CRUD 에서의 동작 과정>
# 1. GET(조회): DB -> 모델(models.py 안의 클래스) -> JSON -> 프론트엔드
# (1) DB에서 데이터를 가져오면 Django는 모델로 불러온다.
# (2) 이 모델은 데이터를 그대로 쓸 수 없기 때문에 -> 시리얼라이저를 통해 데이터를 JSON으로 변환한다.
# (3) 그리고 JSON을 프론트엔드로 전달한다.

# 2. POST/PUT (등록/수정): 프론트엔드 → JSON → 모델 → DB
# (1) 프론트엔드가 JSON을 백엔드에 보낸다.
# (2) 시리얼라이저가 JSON을 받아 역직렬화를 통해 모델 객체로 변환
# (3) 그리고 이 모델 객체가 DB에 저장됨
# ─────────────────────────────────────────────────────────────────────────────

import re

# Django에서 날짜와 시간을 다룰 때 사용하는 유틸리티 모듈
from django.utils import timezone

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
# ─────────────────────────────────────────────────────────────────────────────

# ModelSerializer vs Serializer
# 1. ModelSerializer: 모델(models.py)과 연결되어있는 시리얼라이저를 만들 때 사용
# (1) 모델 필드 자동 생성 => fields = [...]에 모델 필드 자동 매핑
# (2) CRUD 기본 동작 자동 구현
# (3) 모델 유효성 검증 (max_length, unique 등) => 자동 반영
# (4) ORM 객체 <-> JSON 자동 변환

# 2. Serializer: 모델(models.py)과 연결되지 않은 시리얼라이저를 만들 때 사용
# (1) 모델 필드 자동 생성 => 직접 선언해야 됨
# (2) CRUD 기본 동작 자동 구현 => 직접 작성해야 됨
# (3) 모델 유효성 검증 (max_length, unique 등) => 직접 코딩해야 함
# (4) ORM 객체 <-> JSON 자동 변환 => 가능하지만 수동 선언 필요
class IdPrecheckRequestSerializer(serializers.Serializer):

    # 시리얼라이저 필드란? 
    # API에서 주고받을 데이터의 “한 조각”을 정의한 것 => JSON request body/response body의 key-value 쌍 하나를 표현하는 데이터 단위
    # 예를들어 request body의 JSON 형식이 {"email": "test@test.com", "user_id": "asdf123"}이고,
    # response body의 JSON 형식이 {"user_seq": 1, "email": "test@test.com", "user_name": "홍길동" } 라면
    # 시리얼라이저 필드는 email, user_id, user_seq, user_name이다.
    # 따라서 시리얼라이저 필드를 정할 때는 api 명세서의 request body, response body의 key값과 models.py의 속성을 참고해서 필드로 집어넣으면된다.
    
    # 1. 아이디 패턴 검사
    # 모델 필드 오버라이드 - 모델(models.py)에도 존재하는 필드지만, 시리얼라이저에서 직접 재정의 (사용자가 직접 정의한 필드)
    # 그런데 user_id는 User 모델에 이미 존재하는 필드인데도 ModelSerializer로 갖다쓰지않고 직접 정의했는데,
    # 아이디 체크/이메일 체크 시리얼라이저에서는 입력 값 검증(형식체크+중복검사)만 수행하고, DB에 저장하는것 같은 행위를 하지 않기때문에 
    # 굳이 무겁고 불필요하게 많은 기능을 가진 ModelSerializer 대신 가벼운 Serializer를 사용했다.
    # RegexField는 정규식을 이용해 입력값의 형식을 자동 검증해주는 시리얼라이저 필드 -> 클라이언트가 보낸 값이 지정된 패턴을 만족하지 않으면 ValidationError를 발생시킴
    user_id = serializers.RegexField(
        regex=r'^[a-z0-9]{5,20}$',   # 형식: 영문 소문자 + 숫자, 5~20자, 특수문자 불가
        trim_whitespace=True,        # 클라이언트가 실수로 " test123 " 처럼 앞뒤 공백을 넣어도 자동으로 제거

        # 기본 에러 메시지 커스터마이징
        # 여기서의 에러 메시지는 사용자에게 보여주기 위한 메시지이다. -> 하지만 사용자에게 보여줄지 말지 여부를 뷰에서 결정할 수 있다.
        # api 명세서의 response body에서 내려주는 message 또한 사용자에게 보여주기 위한 역할이다.
        # 명세서의 message 필드는 프론트에서 직접 관리 할 수도 있고 백엔드에서 메시지를 만들어서 보낸다음 프론트는 받아서 출력하게만 할 수도 있는데 이 프로젝트에선 백엔드에서 처리한 후 보낼 예정이다.
        # 그리고 만약 모든 사용자 메시지를 프론트엔드에서 직접 관리하기로 정했다면 API 명세서 response body에서 message 필드는 제외하는 것이 좋다.
        # 여기서의 에러 메시지는 시리얼라이저 검증 후 serializer.errors라는 딕셔너리 형태로 뷰(View)까지 전달된다.
        # 그리고 api 명세서에서 [(2) 200 OK 형식오류, (3) 200 OK 중복(이미 존재)] 일때의 response body는 이미 여기서 로직구현 후 판단까지 했으므로
        # 뷰에서는 [(2) 200 OK 형식오류, (3) 200 OK 중복(이미 존재)]는 포맷구성만 하면되고
        # [(1) 200 OK 사용가능(중복 X, 형식 오류 X), 2. 400 Bad Request, 3. 429 Too Many Requests]는 로직구현+포맷구성 까지 하면된다.
        error_messages={
            "invalid": "아이디는 영문 소문자와 숫자만 사용 가능하며 5~20자여야 합니다.",  # 정규식에 맞지 않을 때
            "blank": "아이디를 입력해주세요.", # 빈 문자열 입력 시
        }
    )

    # 2. 아이디 중복 검사 + 개발자가 임의로 정한 에러 코드 문자열 (code="duplicate")
    # validate_<필드명> 형식으로 메서드를 작성하면, DRF가 자동으로 그 필드 값이 유효한지 추가 검증을 수행
    def validate_user_id(self, value: str) -> str:

        # DB에서 user_id가 동일한 유저가 이미 존재하는지 확인
        # exists() -> True/False 반환 (데이터가 있는지만 빠르게 체크)
        if User.objects.filter(user_id=value).exists():   

            # 중복된 아이디가 있으면 유효성 검증 실패를 알리는 예외를 발생시킴
            # 첫 번째 인자: "이미 사용 중인 아이디입니다." -> 사용자에게 보여줄 에러 메시지 -> 이 또한 뷰에서 최종적으로 보여줄지말지 결정
            # 두 번째 인자: code="duplicate" -> 에러 코드 문자열을 함께 제공
            # 실패 시 -> raise로 함수가 즉시 중단되고 serializer.errors에 에러 코드 문자열(duplicate)을 담아서 뷰로 전달 
            raise serializers.ValidationError("이미 사용 중인 아이디입니다.", code="duplicate")
        
        # 중복이 없으면 검증을 통과시키고 검증된 값(value = user_id)를 그대로 뷰로 반환
        # 성공 시 -> return으로 반환된 user_id(value)가 serializer.validated_data에 저장되어 뷰로 전달됨
        return value


# ─────────────────────────────────────────────────────────────────────────────
# 2. 이메일 체크 - request 전용 시리얼라이저
# ─────────────────────────────────────────────────────────────────────────────

# EmailField: 이메일 주소 형식 검증을 자동으로 수행하는 DRF 기본 필드
# 이메일 형식은 EmailField가 이미 자동 검증 수행 (예: example@domain.com) -> 여기서는 추가로 허용 도메인 체크만 하면 됨.
class EmailPrecheckRequestSerializer(serializers.Serializer):

    # 모델 필드 오버라이드
    email = serializers.EmailField(
        max_length=150, 
        trim_whitespace=True,
        error_messages={
            "invalid": "이메일 형식이 올바르지 않습니다."
        }
    )

    def validate_email(self, value: str) -> str:

        # 1. 허용 도메인 목록 정의
        allowed_domains = {"gmail.com", "naver.com", "kakao.com"}

        # EmailField가 이미 형식 검증을 끝냈으므로 여기서는 안전하게 split 가능
        # domain = ["example", "gmail.com"]
        domain = value.split("@")[1].lower()

        # 2. 도메인이 허용 목록에 있는지 확인
        if domain not in allowed_domains:
            raise serializers.ValidationError(
                f"허용되지 않은 도메인입니다. ({', '.join(allowed_domains)} 만 사용가능합니다.)",
                code="invalid_domain"
            )

        # 3. 중복 여부 확인
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("이미 사용 중인 이메일입니다.", code="duplicate")

        # 모든 검증 통과 시 원래 값(email) 반환
        return value


# ─────────────────────────────────────────────────────────────────────────────
# 3. 회원가입 - request 전용 시리얼라이저
# ─────────────────────────────────────────────────────────────────────────────

class RegisterRequestSerializer(serializers.ModelSerializer):

    # 모델 필드 오버라이드
    # source="user_name" -> 내부적으로 모델의 user_name 필드와 연결
    username = serializers.CharField(source="user_name", max_length=100)

    # 커스텀 필드 - 모델(models.py)에 없고 사용자가 새롭게 만들어낸 필드 (사용자가 직접 정의한 필드)
    # 비밀번호 생성규칙 중 8~16자 규칙처럼 단순하고 기본적인 검증은 필드에서 처리하고 나머지는 validate()에서 처리함
    # write_only=True => 요청에서만 사용가능. 응답에는 포함되지 않음.
    # 요청(Request): 클라이언트 -> 서버로 데이터를 보낼 때 사용 가능 (request body로는 이 데이터를 보낼 수 있음)
    # 응답(Response): 서버 -> 클라이언트로 데이터를 보낼 때는 자동으로 제외됨 (response body로는 이 데이터가 오지 않음)
    # 즉, 해시 변환 안 된 비밀번호(평문 비밀번호)는 서버로 보낼 수만 있고 서버가 클라이언트에게 다시 돌려주는 일은 없다.
    password = serializers.CharField(
        write_only=True, min_length=8, max_length=16, trim_whitespace=True,
        error_messages={
            "min_length": "비밀번호는 최소 8자 이상이어야 합니다.",
            "max_length": "비밀번호는 최대 16자 이하이어야 합니다.",
            "blank": "비밀번호를 입력해주세요.",
        },
    )
    password2 = serializers.CharField(
        write_only=True, min_length=8, max_length=16, trim_whitespace=True,
        error_messages={
            "min_length": "비밀번호 확인은 최소 8자 이상이어야 합니다.",
            "max_length": "비밀번호 확인은 최대 16자 이하이어야 합니다.",
            "blank": "비밀번호 확인을 입력해주세요.",
        },
    )

    # 커스텀 필드
    agree_whether = serializers.BooleanField(write_only=True)
    id_check_token = serializers.CharField(write_only=True, required=False, allow_blank=True)
    email_check_token = serializers.CharField(write_only=True, required=False, allow_blank=True)

    # 모델 필드 오버라이드
    user_id = serializers.CharField(
        max_length=50,
        validators=[UniqueValidator(queryset=User.objects.all(), message="이미 사용 중인 아이디입니다.")],
    )
    email = serializers.EmailField(
        max_length=150,
        validators=[UniqueValidator(queryset=User.objects.all(), message="이미 사용 중인 이메일입니다.")],
    )

    class Meta:
        model = User  # models.py의 User 모델 지정

        # 모델 필드는 Meta에서 fields =[...]로 가져오는건 맞지만, 사용자가 직접 정의한 필드(오버라이드, 커스텀)도 집어넣을 수 있기 때문에 fields에 들어있다고 해서 전부 모델 필드인것은 아니다.
        fields = [
            "user_id", "password", "password2", "username",
            "birth_date", "gender", "email",
            "agree_whether", "id_check_token", "email_check_token",
        ]