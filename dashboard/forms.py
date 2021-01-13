from django import forms
from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError
from django.forms import ModelForm
from django.utils.translation import gettext_lazy as _
from django.utils.safestring import mark_safe

from .models import User

_password_validation_html = password_validation.password_validators_help_text_html()


class UserCreationForm(ModelForm):

    error_messages = {
        'password_mismatch': _('The two password fields didn’t match.'),
    }
    password = forms.CharField(
        label=_("Password"),
        strip=False,
        widget=forms.PasswordInput(
            attrs={'autocomplete': 'new-password', 'placeholder': 'Create a password'}),
        help_text=mark_safe(
            f'<div class="fieldHelp">{_password_validation_html}</div>'),
    )

    class Meta:
        model = User
        fields = ("email",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self._meta.model.USERNAME_FIELD in self.fields:
            attrs = self.fields[self._meta.model.USERNAME_FIELD].widget.attrs
            attrs['autofocus'] = True
            attrs['placeholder'] = 'Enter your email address'
            attrs['autocomplete'] = 'email'

    def _post_clean(self):
        super()._post_clean()
        # Validate the password after self.instance is updated with form data
        # by super().
        password = self.cleaned_data.get('password')
        if password:
            try:
                password_validation.validate_password(password, self.instance)
            except ValidationError as error:
                self.add_error('password', error)

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password"])
        if commit:
            user.save()
        return user
