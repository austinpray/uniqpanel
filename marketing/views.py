from django.shortcuts import render

# Create your views here.

def index(request):
    return render(request, 'homepage.html', {})

def pricing(request):
    return render(request, 'pricing.html', {})
