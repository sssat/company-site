from django.conf import settings
from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed

from .models import User
        
# AccountsJWTAuthentication: 커스텀 JWT 인증 클래스를 정의한 것
# SimpleJWT의 기본 인증 클래스인 JWTAuthentication을 확장(상속)하여, JWT 인증 절차는 기본 로직을 그대로 사용하고
# get_user()만 오버라이드해서 내 프로젝트의 유저 식별 방식(user_seq)에 맞게 토큰을 처리하도록 만듦
class AccountsJWTAuthentication(JWTAuthentication):
    """
    - SimpleJWT 기본 인증을 따르되, get_user만 커스터마이징
    - USER_ID_CLAIM(기본: user_seq)로 유저 식별
    - 비밀번호 변경 시각(password_changed_at) 이후 발급된 토큰만 유효하도록 차단
    """

    def get_user(self, validated_token):
        # 1) 사용자 식별 클레임 이름 결정 (기본: "user_seq")
        simple_jwt_cfg = getattr(settings, "SIMPLE_JWT", {}) or {}
        user_id_claim = simple_jwt_cfg.get("USER_ID_CLAIM", "user_seq")

        # 2) 토큰에서 식별자 추출
        try:
            user_seq = validated_token[user_id_claim]
        except KeyError:
            raise InvalidToken("Token missing user identification claim.")

        # 3) 유저 조회
        try:
            user = User.objects.get(user_seq=user_seq)
        except User.DoesNotExist:
            raise AuthenticationFailed("User not found.", code="user_not_found")

        # (선택) 비활성 계정 차단
        if hasattr(user, "is_active") and not bool(user.is_active):
            raise AuthenticationFailed("User inactive or deleted.", code="user_inactive")

        # 4) 비밀번호 변경 이후 토큰 무효화 로직
        #    - 토큰의 iat(issued-at, epoch seconds) < user.password_changed_at 이면 거부
        pwd_changed_at = getattr(user, "password_changed_at", None)
        if pwd_changed_at:
            iat = validated_token.get("iat")
            if iat is None:
                # iat가 없는 토큰은 정책상 거부 (보수적으로 처리)
                raise InvalidToken("Token is missing 'iat' claim.")
            try:
                iat_sec = int(iat)
            except (TypeError, ValueError):
                raise InvalidToken("Token 'iat' claim is invalid.")

            # password_changed_at을 epoch seconds로 변환하여 비교
            changed_sec = int(pwd_changed_at.timestamp())
            if iat_sec < changed_sec:
                # 비밀번호 변경 이후 발급된 토큰만 허용
                raise AuthenticationFailed(
                    "Token invalidated by password change.",
                    code="token_invalidated",
                )

        return user
