from django.db.models.signals import post_delete
from django.dispatch import receiver
from redis import Redis
from .models import FileAnalysisJob
from django_redis import get_redis_connection


# Strictly speaking, this should prolly be an async garbage collection job.
# I don't like that mass deleting models will mass query redis as a side-effect.
# If you did a garbage collection pass you could send delete requests in chunks.
@receiver(post_delete, sender=FileAnalysisJob)
def my_handler(sender: FileAnalysisJob, **kwargs):
    redis: Redis = get_redis_connection("default")
    redis.delete(sender.redis_key)
