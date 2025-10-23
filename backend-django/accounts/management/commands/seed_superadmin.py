# 맨 처음 슈퍼어드민 계정을 생성하기 위한 시드 데이터 코드

from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from datetime import date
from accounts.models import User, UserLevel

class Command(BaseCommand):
    help = "슈퍼관리자 계정 생성 (이미 있으면 건너뜀)"

    def add_arguments(self, parser):
        parser.add_argument("--user_id", default="superadmin")
        parser.add_argument("--password", default="Admin1234!")
        parser.add_argument("--email", default="super@company.com")
        parser.add_argument("--name", default="Super Admin")
        parser.add_argument("--birth", default="1990-01-01", help="YYYY-MM-DD")
        parser.add_argument("--gender", default="M", choices=["M", "F"])

    def handle(self, *args, **opts):
        sa_level, _ = UserLevel.objects.get_or_create(
            grade_code=2, defaults={"grade_name": "SUPER_ADMIN"}
        )
        uid = opts["user_id"]
        if User.objects.filter(user_id=uid).exists():
            self.stdout.write(self.style.WARNING(f"이미 존재: {uid}"))
            return

        # 날짜 파싱
        try:
            birth_date = date.fromisoformat(opts["birth"])  # 'YYYY-MM-DD'
        except ValueError:
            self.stderr.write("birth 형식이 올바르지 않습니다. 예: 1990-01-01")
            return

        u = User.objects.create(
            user_id=uid,
            user_name=opts["name"],
            email=opts["email"],
            password_hash=make_password(opts["password"]),
            grade_code=sa_level,      # FK
            birth_date=birth_date,    # NOT NULL 필드 채우기
            gender=opts["gender"],    # 'M' / 'F'
            # joined_at 은 보통 auto_now_add라면 생략 OK
        )
        self.stdout.write(self.style.SUCCESS(f"생성됨: {u.user_id} (SUPER_ADMIN)"))
