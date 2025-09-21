from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from django.conf import settings
from .models import User

# AccountsJWTAuthentication: 커스텀 JWT 인증 클래스를 정의한 것
# SimpleJWT의 기본 인증 클래스인 JWTAuthentication을 확장(상속)하여, JWT 인증 절차는 기본 로직을 그대로 사용하고
# get_user()만 오버라이드해서 내 프로젝트의 유저 식별 방식(user_seq)에 맞게 토큰을 처리하도록 만듦
class AccountsJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):

        # settings.py의 SIMPLE_JWT 설정에서 USER_ID_CLAIM 값을 가져옴 -> 없으면 기본값 "user_seq"를 사용
        claim = settings.SIMPLE_JWT.get("USER_ID_CLAIM", "user_seq")

        # 토큰의 Payload에서 user_seq 값 꺼내기
        # validated_token: 이미 서명 검증과 만료 체크가 끝난 JWT Payload -> 파이썬 딕셔너리처럼 동작
        # print(validated_token) = 
        # {
        #     "token_type": "access",
        #     "exp": 1726804800,
        #     "iat": 1726801200,
        #     "jti": "3d87bb21-7c90-4d91-9ef0-02eaa682111c",
        #     "user_seq": 15,
        #     "user_id": "hong123" -> 이건 로그인 뷰에서 RefreshToken 생성 후 추가 클레임을 수동으로 넣어서 들어가있음
        # }
        # 여기에서 "user_seq" 키를 꺼냄 -> 만약 "user_seq"가 없으면 KeyError가 발생하고 InvalidToken 예외를 던짐
        try:
            user_seq = validated_token[claim]
        except KeyError:
            raise InvalidToken("Token missing user identification claim.")

        # DB에서 해당 유저 찾기
        # 추출한 user_seq로 DB에서 User 모델을 조회 -> 없으면 AuthenticationFailed 예외를 발생시켜 401 응답을 반환
        try:
            return User.objects.get(user_seq=user_seq)
        except User.DoesNotExist:
            raise AuthenticationFailed("User not found.", code="user_not_found")
