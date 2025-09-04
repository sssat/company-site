# admin.py: Django의 관리자(admin) 페이지에서 accounts 앱의 모델들을 관리할 수 있도록 등록
# 나중에 커스터마이징 하여 기능을 추가할 수 있다.

# Django가 기본으로 제공하는 관리자 사이트 기능 임포트
from django.contrib import admin

# 같은 앱(accounts)의 models.py에 정의된 모델 3개(UserLevel, User, LoginLog)를 불러옴
from .models import UserLevel, User, LoginLog

# Django 관리자 페이지에 해당 모델들을 등록
admin.site.register(UserLevel)
admin.site.register(User)
admin.site.register(LoginLog)