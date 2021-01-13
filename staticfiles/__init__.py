from django.contrib.staticfiles.storage import ManifestStaticFilesStorage


class ES6ManifestStaticFilesStorage(ManifestStaticFilesStorage):
    pass

# TODO: lol this doesn't work


class ExpES6ManifestStaticFilesStorage(ManifestStaticFilesStorage):
    patterns = (
        *ManifestStaticFilesStorage.patterns,
        ("*.js", (
            r"""(import\s+.+from\s+['"](\S+)['"])""",
        ))
    )
