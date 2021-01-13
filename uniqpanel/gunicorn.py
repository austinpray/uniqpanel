from os import environ


bind = '0.0.0.0:' + environ.get('PORT', '8001')
timeout = 60 * 5
