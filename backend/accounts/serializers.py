# 시리얼라이저(Serializer): Django REST Framework(DRF)에서 데이터(모델 객체 = 클래스의 인스턴스)를 JSON 형식으로 변환하거나, 반대로 JSON -> 모델 객체로 변환하는 도구
# 쉽게말해, 백엔드와 프론트엔드가 서로 통신할 때 데이터 형식을 맞춰주는 통역사 같은 역할
# 시리얼라이저는 [models.py, api 명세서]를 토대로 작성한다.
# 시리얼라이저는 기능별로 따로 만든다. 예를들어 회원가입 시리얼라이저, 로그인 시리얼라이저, 회원정보 조회 시리얼라이저, .... 등등
# API 엔드포인트(URL)를 하나 만든다면, 그 엔드포인트와 연결된 기능에 대한 시리얼라이저는 거의 항상 필요하다.

# 예를들어 <User: id=1, username='testuser', email='test@example.com'> <- 이 모델 객체(클래스 인스턴스)를 
# { "id": 1, "username": "testuser", "email": "test@example.com" } <- 이러한 JSON으로 바꿔준다.

# 시리얼라이저는 두 가지 방향으로 작동한다.
# (1) Serialization(직렬화): Python 객체(모델 객체) → JSON, (2) Deserialization(역직렬화): JSON → Python 객체(모델 객체)

# CRUD 에서의 동작 과정
# 1. GET(조회): DB -> 모델(models.py 안의 클래스) -> JSON -> 프론트엔드
# (1) DB에서 데이터를 가져오면 Django는 모델로 불러온다.
# (2) 이 모델은 데이터를 그대로 쓸 수 없기 때문에 -> 시리얼라이저를 통해 데이터를 JSON으로 변환한다.
# (3) 그리고 JSON을 프론트엔드로 전달한다.

# 2. POST/PUT (등록/수정): 프론트엔드 → JSON → 모델 → DB
# (1) 프론트엔드가 JSON을 백엔드에 보낸다.
# (2) 시리얼라이저가 JSON을 받아 역직렬화를 통해 모델 객체로 변환
# (3) 그리고 이 모델 객체가 DB에 저장됨

# Django에서 날짜와 시간을 다룰 때 사용하는 유틸리티 모듈
from django.utils import timezone

# Django가 제공하는 비밀번호 해싱 유틸리티 함수 -> 비밀번호를 DB에 평문으로 저장하면 보안 취약점이 생기므로 반드시 해싱(단방향 암호화)해야한다.
from django.contrib.auth.hashers import make_password, check_password

# # DRF에서 제공하는 serializers 모듈을 불러옴
from rest_framework import serializers

# 특정 필드 값이 데이터베이스에서 유일해야 함을 자동 검증 (예: 회원가입 시 이메일/아이디 중복 여부 검사)
from rest_framework.validators import UniqueValidator

# models.py 파일에서 UserLevel, User, LoginLog 세 개의 모델 클래스를 불러옴
from .models import UserLevel, User, LoginLog


# ─────────────────────────────────────────────────────────────────────────────
# 공통/기초: 공통으로 사용되는 기본 시리얼라이저
# ─────────────────────────────────────────────────────────────────────────────

# 1. UserLevel 시리얼라이저: UserLevel 모델의 데이터(객체) <-> JSON으로 변환(직렬화/역직렬화)시키는 역할을 수행
class UserLevelSerializer(serializers.ModelSerializer):   # serializers.ModelSerializer: ModelSerializer는 지정한 모델(UserLevel)을 자동으로 읽어서 시리얼라이저 필드 생성, 필드 타입, 길이 제한, 필수 여부 등을 자동으로 검증해준다.
    """회원 등급 표기용 (단순 조회)"""
    class Meta:
        model = UserLevel  # 이 시리얼라이저가 어떤 모델을 기준으로 동작할지 지정 -> 여기서는 UserLevel 모델을 직렬화/역직렬화 대상으로 함

        # 시리얼라이저 필드란? 
        # API에서 주고받을 데이터의 “한 조각”을 정의한 것 => JSON request body/response body의 key-value 쌍 하나를 표현하는 데이터 단위
        # 예를들어 request body의 JSON 형식이 {"email": "test@test.com", "user_id": "asdf123"}이고,
        # response body의 JSON 형식이 {"user_seq": 1, "email": "test@test.com", "user_name": "홍길동" } 라면
        # 시리얼라이저 필드는 email, user_id, user_seq, user_name이다.
        # 따라서 시리얼라이저 필드를 정할 때는 api 명세서의 request body, response body의 key값을 필드로 집어넣으면된다.

        # 자동 생성된 시리얼라이저 필드 => 자동 생성이 가능한 필드는 models.py에 정의된 모델 필드만 가능하다.
        fields = ["grade_code", "grade_name"]   # API request/response에서 어떤 필드를 주고받을지 명시 -> 모델에 다른 필드가 있어도, 여기 적힌 것만 JSON으로 변환된다.