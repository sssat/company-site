from django.contrib import admin
from .models import NewsPost, NewsPostHistory

# NewsPost, NewsPostHistory 편집 화면에서 PK 필드가 보이도록 최소 커스터마이징
@admin.register(NewsPost)
class NewsPostrAdmin(admin.ModelAdmin):
    readonly_fields = ("news_seq",)  

@admin.register(NewsPostHistory)
class NewsPostHistoryrAdmin(admin.ModelAdmin):
    readonly_fields = ("history_seq",)  