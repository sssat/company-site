from django.contrib import admin
from .models import NewsPost, NewsPostHistory

admin.site.register(NewsPost)
admin.site.register(NewsPostHistory)