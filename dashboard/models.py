from datetime import timedelta
import humanize
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

class UserManager(BaseUserManager):
    def create_user(self, email, password, **extra_fields):

        if not email:
            raise ValueError(_('The Email must be set'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, email, password, **extra_fields):

        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))
        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    username = None
    email = models.EmailField(_('email address'), unique=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return f'<User {self.email}>'

class FileAnalysisJob(models.Model):

    completed_at_default = timezone.make_aware(timezone.datetime.min, timezone.get_default_timezone())

    created_at = models.DateTimeField(auto_now_add=True)
    display_name = models.CharField(max_length=255)
    file_name = models.CharField(max_length=255)

    file_size_bytes = models.PositiveBigIntegerField(editable=False, default=0)
    unique_lines = models.PositiveBigIntegerField(editable=False, default=0)
    total_lines = models.PositiveBigIntegerField(editable=False, default=0)
    redis_key = models.TextField(editable=False, default="")
    elapsed_time_ns = models.PositiveBigIntegerField(editable=False, default=0)

    owner = models.ForeignKey(User, on_delete=models.CASCADE)

    def __str__(self):
        return f"File({self.id}, {self.display_name})"
    
    @classmethod
    def create(cls, **kwargs):
        f = cls(**kwargs)

        if not f.display_name:
            f.display_name = f.file_name

        return f
    
    @classmethod
    def complete_jobs(cls):
        return cls.objects.filter(elapsed_time_ns__gt=0)

    def json_dict(self) -> dict:
        # not dry but better explicit than implicit for security etc
        return {
            "id": self.id,
            "createdAt": self.created_at,
            "displayName": self.display_name,
            "fileName": self.file_name,
            "fileSizeBytes": self.file_size_bytes,
            "fileSizeDisplay": humanize.naturalsize(self.file_size_bytes, binary=True),
            "uniqueLines": self.unique_lines,
            "totalLines": self.total_lines,
            "elapsedTimeNs": self.elapsed_time_ns,
            "elapsedTimeDisplay": humanize.precisedelta(
                timedelta(microseconds=round(self.elapsed_time_ns/1000)),
                minimum_unit='milliseconds'
            )
        }
