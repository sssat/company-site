from django.core.management.base import BaseCommand
from accounts.models import UserLevel

class Command(BaseCommand):
    help = "기본 회원 등급(UserLevel) 시드 데이터 삽입"

    def handle(self, *args, **options):
        seed_data = [
            {"grade_code": 0, "grade_name": "USER"},
            {"grade_code": 1, "grade_name": "ADMIN"},
            {"grade_code": 2, "grade_name": "SUPER_ADMIN"},
        ]

        created_count = 0

        for data in seed_data:
            obj, created = UserLevel.objects.get_or_create(
                grade_code=data["grade_code"],
                defaults={"grade_name": data["grade_name"]},
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"생성됨: {obj.grade_code} - {obj.grade_name}"))
            else:
                self.stdout.write(self.style.WARNING(f"이미 존재함: {obj.grade_code} - {obj.grade_name}"))

        self.stdout.write(self.style.SUCCESS(f"완료! 새로 생성된 레코드 수: {created_count}"))
