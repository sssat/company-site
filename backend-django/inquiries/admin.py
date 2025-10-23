from django.contrib import admin
from .models import Inquiry

# Inquiry 편집 화면에서 PK 필드가 보이도록 최소 커스터마이징
@admin.register(Inquiry)
class InquiryrAdmin(admin.ModelAdmin):
    readonly_fields = ("inquiry_seq",)  