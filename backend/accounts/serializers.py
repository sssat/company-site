# 시리얼라이저(Serializer)
# <역할>
# (1) JSON <-> 파이썬 객체 변환: 데이터(모델 객체 = 클래스의 인스턴스)를 JSON 형식으로 변환하거나, 반대로 JSON -> 모델 객체로 변환하는 도구 => 쉽게말해, 백엔드와 프론트엔드가 서로 통신할 때 데이터 형식을 맞춰주는 통역사 같은 역할
# 예를들어 <User: id=1, username='testuser', email='test@example.com'> <- 이 모델 객체(클래스 인스턴스)를 
# { "id": 1, "username": "testuser", "email": "test@example.com" } <- 이러한 JSON으로 바꿔준다.
# (2) 데이터 검증 (Validation): 프론트엔드에서 보낸 요청 데이터(JSON)가 유효한 값인지 확인 (예: 이메일 형식 확인, 비밀번호 최소 길이 검사, 중복 아이디 체크 등)

# 시리얼라이저는 [models.py, api 명세서]를 토대로 작성한다.
# 시리얼라이저는 기능별로 따로 만든다. 예를들어 회원가입 시리얼라이저, 로그인 시리얼라이저, 회원정보 조회 시리얼라이저, .... 등등
# API 엔드포인트(URL)를 하나 만든다면, 그 엔드포인트와 연결된 기능에 대한 시리얼라이저는 거의 항상 필요하다.
# 그리고 시리얼라이저는 요청용(reauest) 시리얼라이저 / 응답용(response) 시리얼라이저로 나눌 수 있는데, 
# 만약 요청 데이터(request header + parameter + body)가 있다면 요청용 시리얼라이저는 거의 항상 필수로 만들어줘야 하고, 응답용 시리얼라이저는 상황에 따라 달라진다.
# 이중에서 request body가 존재할때는 거의 항상 시리얼라이저가 필요하고 나머지 파라미터나 헤더만 존재한다면 별도의 시리얼라이저가 거의 필요없다.
# 이 프로젝트에선 요청용 시리얼라이저만 만들고 응답 데이터는 시리얼라이저에서 처리하는 대신 뷰에서 처리할 예정이다.

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

# Django에서 날짜와 시간을 다룰 때 사용하는 유틸리티 모듈
from django.utils import timezone

# Django가 제공하는 비밀번호 해싱 유틸리티 함수 -> 비밀번호를 DB에 평문으로 저장하면 보안 취약점이 생기므로 반드시 해싱(단방향 암호화)해야한다.
from django.contrib.auth.hashers import make_password, check_password

# # Django REST Framework(DRF)에서 제공하는 serializers 모듈을 불러옴
from rest_framework import serializers

# 특정 필드 값이 데이터베이스에서 유일해야 함을 자동 검증 (예: 회원가입 시 이메일/아이디 중복 여부 검사)
from rest_framework.validators import UniqueValidator

# models.py 파일에서 UserLevel, User 두 개의 모델 클래스를 불러옴
from .models import UserLevel, User


# ─────────────────────────────────────────────────────────────────────────────
# 1. 아이디 체크 요청용 시리얼라이저
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
    # 하지만 이 프로젝트에선 요청용 시리얼라이저만 정의했기 때문에 request body의 key값만 필드로 사용할 예정이다.
    
    # 사용자가 직접 정의한 필드
    # 그런데 user_id는 User 모델에 이미 존재하는 필드인데도 ModelSerializer로 갖다쓰지않고 직접 정의했는데,
    # 아이디 체크/이메일 체크 시리얼라이저에서는 입력 값 검증(형식체크+중복검사)만 수행하고, DB에 저장하는것 같은 행위를 하지 않기때문에 
    # 굳이 무겁고 불필요하게 많은 기능을 가진 ModelSerializer 대신 가벼운 Serializer를 사용함
    # 형식: 영문 소문자 + 숫자, 5~20자, 특수문자 불가
    user_id = serializers.RegexField(
        regex=r'^[a-z0-9]{5,20}$',
        trim_whitespace=True,
        error_messages={
            "invalid": "아이디는 영문 소문자와 숫자만 사용 가능하며 5~20자여야 합니다.",
            "blank": "아이디를 입력해주세요.",
        }
    )

    # 중복 검사
    def validate_user_id(self, value):
        if User.objects.filter(user_id=value).exists():
            raise serializers.ValidationError("이미 사용 중인 아이디입니다.")
        return value

