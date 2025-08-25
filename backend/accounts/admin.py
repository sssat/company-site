from django.contrib import admin
from .models import User, Admin, LoginLog, Inquiry, NewsPost, PartnerClient

# 모델들을 관리자에 한 번에 등록
admin.site.register(User)
admin.site.register(Admin)
admin.site.register(LoginLog)
admin.site.register(Inquiry)
admin.site.register(NewsPost)
admin.site.register(PartnerClient)
