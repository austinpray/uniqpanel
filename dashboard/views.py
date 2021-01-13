import time

import humanize
from dashboard.models import FileAnalysisJob
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.core.files.uploadedfile import UploadedFile
from django.core.cache import cache
from django_redis import get_redis_connection
from redis import Redis
from django.utils import timezone
from .forms import UserCreationForm
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login
from django.contrib import messages
from django.utils.safestring import mark_safe

from datetime import timedelta


def register(req):
    form = UserCreationForm()
    if req.method == 'POST':
        form = UserCreationForm(req.POST)
        if form.is_valid():
            form.save()
            new_user = authenticate(
                username=form.cleaned_data['email'],
                password=form.cleaned_data['password'],
            )
            login(req, new_user)
            messages.info(req, mark_safe(
                "<strong>Thank you for signing up!</strong> You should start by <a href='/app/new'>adding a file</a>."))
            return redirect('/app')

    return render(req, 'registration/register.html', {'form': form})


@login_required
def index(req):
    return render(req, 'dashboard_index.html')


@login_required
def new(req):
    return render(req, 'file_upload.html')


@login_required
def analyze(req):
    return render(
        req,
        template_name='dashboard_analyze.html',
        context={
            **_merge_files(req),
            "back_url": f"/app?{req.GET.urlencode()}"
        }
    )


def _merge_files(req):
    requested_job_ids = set(int(i) for i in req.GET.getlist('id'))
    start = time.perf_counter_ns()

    def get_elapsed_time(start):
        elapsed_ns = time.perf_counter_ns() - start
        return {
            "elapsed_time_ns": elapsed_ns,
            "elapsed_time_display": humanize.precisedelta(
                timedelta(microseconds=round(elapsed_ns/1000)),
                minimum_unit='microseconds'
            )
        }
    jobs = FileAnalysisJob\
        .complete_jobs()\
        .filter(owner_id=req.user.id)\
        .filter(id__in=requested_job_ids)
    job_ids = set(f.id for f in jobs)
    if job_ids != requested_job_ids:
        missing = 'unknown, wut?'
        for id in requested_job_ids:
            if id not in job_ids:
                missing = id
                break
        raise FileAnalysisJob.DoesNotExist(f'Cannot find file ID {missing}')

    hll_keys = [f.redis_key for f in jobs]
    merge_key = "merge-" + "-".join(str(i) for i in sorted(job_ids))

    bytes = sum(j.file_size_bytes for j in jobs)

    base_response = {
        "files": [f.json_dict() for f in jobs],
        "total_lines": sum(j.total_lines for j in jobs),
        "total_search_size": bytes,
        "total_search_size_display": humanize.naturalsize(bytes, binary=True),
    }

    with get_redis_connection("default") as redis:
        with cache.lock(merge_key):
            redis: Redis

            if redis.exists(merge_key) == 0:
                if not redis.pfmerge(merge_key, *hll_keys):
                    return _api_error("could not merge hll keys", status=500)

                redis.expire(merge_key, timedelta(days=1))

            return {
                **base_response,
                **get_elapsed_time(start),
                "unique_lines": redis.pfcount(merge_key),
            }

# half-assed rest API follows


def _require_auth(func):
    """
    Prolly better way of doing this, too bad!
    """
    def wrapper(req):
        if not req.user.is_authenticated:
            return JsonResponse({'error': 'Need to be authenticated'}, status=400)
        return func(req)

    return wrapper


def _api_error(msg: str, **kwargs):
    return JsonResponse({'error': msg}, **kwargs)


@_require_auth
def list_files(req):
    # debugging, prolly turn this on only if DEBUG=true
    if req.GET.get('pls_fail'):
        raise RuntimeError("Uhoh failed!!")
    if req.GET.get('pls_500'):
        return _api_error("Uhoh 500", status=500)

    jobs = FileAnalysisJob\
        .complete_jobs()\
        .filter(owner_id=req.user.id)\
        .order_by("-id")
    return JsonResponse({
        "files": [f.json_dict() for f in jobs]
    })


@_require_auth
def api_merge_files(req):
    try:
        return JsonResponse(_merge_files(req))
    except FileAnalysisJob.DoesNotExist as e:
        return _api_error(str(e), status=404)


@_require_auth
def upload(req):
    """
    If this was for real prolly:
    - Stream the file to an object store instead of writing to disk
    - Process file in an async worker

    This whole assumes the file we are reading is too big to fit in memory.
    """

    uploaded_file: UploadedFile = req.FILES.get('file')
    uploaded_file_display_name = req.POST.get('fileName')

    if not uploaded_file:
        return _api_error('No file uploaded', status=400)

    # debugging, prolly turn this on only if DEBUG=true
    if uploaded_file_display_name == "__fail_horribly_pls":
        raise RuntimeError("Uhoh!!")
    elif uploaded_file_display_name == "__500_pls":
        return _api_error("500 error!", status=500)
    elif uploaded_file_display_name == "__400_pls":
        return _api_error("400 error!", status=400)

    f = FileAnalysisJob.create(
        file_name=uploaded_file.name,
        owner_id=req.user.id,
        file_size_bytes=uploaded_file.size,
    )
    if uploaded_file_display_name:
        f.display_name = uploaded_file_display_name

    f.save()

    f.redis_key = f'uniqpanel/hll/file-{f.id}'

    with get_redis_connection("default") as redis:

        redis: Redis

        redis.delete(f.redis_key)

        line_count = 0

        # batch max_buffer_size lines to send to redis
        max_buffer_size = 1000
        line_buf = []
        t_start = time.perf_counter_ns()
        for line in uploaded_file:
            if len(line) > 255:
                return _api_error('maximum line length is 255 chars', status=400)

            # try:
            #    line = str(line, 'utf-8')
            # except UnicodeError:
            #    return _api_error('file is not unicode', status=400)

            line_buf.append(line)
            line_count += 1

            if len(line_buf) >= max_buffer_size:
                redis.pfadd(f.redis_key, *line_buf)
                line_buf.clear()

        # flush last lines
        if len(line_buf) > 0:
            redis.pfadd(f.redis_key, *line_buf)

        f.unique_lines = redis.pfcount(f.redis_key)

    t_end = time.perf_counter_ns()
    f.total_lines = line_count
    f.completed_at = timezone.now()
    f.elapsed_time_ns = t_end - t_start

    f.save()

    return JsonResponse({
        "file": f.json_dict()
    })
