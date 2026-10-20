import importlib.util
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'check-environment.py'
spec = importlib.util.spec_from_file_location('environment_check', SCRIPT)
checks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checks)

class EnvironmentTests(unittest.TestCase):
    def production(self):
        return {'APP_ENV':'production','POSTGRES_PASSWORD':'p'*32,'JWT_SECRET':'j'*48,
                'COOKIE_SECURE':'true','SEED_CATALOGUE':'false',
                'POSTGRES_DB':'vistrah_production','COMPOSE_PROJECT_NAME':'vistrah-production',
                'PUBLIC_APP_URL':'https://live.company.com','PUBLIC_API_URL':'https://api.live.company.com',
                'ALLOWED_ORIGINS':'https://live.company.com','ADMIN_ALLOWED_ORIGINS':'https://admin.live.company.com',
                'PRODUCTION_DB_VOLUME':'vistrah-production-db','PRODUCTION_API_VOLUME':'vistrah-production-api',
                'V_ADS_PRIVATE_VOLUME':'vistrah-production-media',
                **{key:'registry/image@sha256:'+'a'*64 for key in ('PRODUCTION_API_IMAGE','PRODUCTION_WORKER_IMAGE','PRODUCTION_WEB_IMAGE','PRODUCTION_ADMIN_IMAGE')}}

    def test_production_rejects_test_origins_and_shared_state(self):
        for key,value in [('PUBLIC_API_URL','https://api.vistrah.in'),('PUBLIC_APP_URL','https://vistrah.in'),
                          ('V_ADS_PRIVATE_VOLUME','vistrah-test-media'),('POSTGRES_DB','vistrah'),
                          ('COMPOSE_PROJECT_NAME','vistrah-cloud'),('PRODUCTION_API_IMAGE','api:latest'),
                          ('PUBLIC_API_URL','https://192.168.1.10'),('PUBLIC_API_URL','https://[bad')]:
            with self.subTest(key=key,value=value):
                env=self.production();env[key]=value
                self.assertTrue(checks.validate(env,'production'))

    def test_aws_test_requires_test_media_and_sandbox_mode(self):
        env=self.production()
        env.update(APP_ENV='development', COMPOSE_PROJECT_NAME='vistrah-cloud',
                   PUBLIC_APP_URL='https://vistrah.in', PUBLIC_API_URL='https://api.vistrah.in',
                   ALLOWED_ORIGINS='https://vistrah.in', ADMIN_ALLOWED_ORIGINS='https://admin.vistrah.in',
                   V_ADS_PRIVATE_VOLUME='vistrah-test-media')
        self.assertEqual(checks.validate(env,'aws-test'),[])
        env['V_ADS_PRIVATE_VOLUME']='vistrah-production-media'
        self.assertTrue(checks.validate(env,'aws-test'))

    def test_development_defaults(self):
        self.assertEqual(checks.validate({}, 'development'), [])

    def test_production_rejects_development_defaults(self):
        self.assertGreaterEqual(len(checks.validate({}, 'production')), 7)

    def test_production_accepts_explicit_values(self):
        self.assertEqual(checks.validate(self.production(), 'production'), [])

    def test_invalid_origins_and_credentials(self):
        for value in ['http://vistrah.in','https://*.vistrah.in','https://user:secret@vistrah.in','https://vistrah.in/path','https://localhost']:
            with self.subTest(value=value):
                env = self.production();env['ALLOWED_ORIGINS']=value
                self.assertTrue(checks.validate(env,'production'))

    def test_duplicate_ports_and_invalid_range(self):
        self.assertTrue(checks.validate({'API_PORT':'3000'},'development'))
        self.assertTrue(checks.validate({'API_PORT':'65536'},'development'))

    def test_test_mode_requires_separate_project_database_and_ports(self):
        self.assertTrue(checks.validate({},'test','vistrah20'))
        env={'POSTGRES_DB':'vistrah_test','WEB_PORT':'3111','API_PORT':'8111','ADMIN_PORT':'3211'}
        self.assertEqual(checks.validate(env,'test','vistrah-test'),[])
        env['API_PORT']='8100';self.assertTrue(checks.validate(env,'test','vistrah-test'))

    def test_quoted_parser_and_comment(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'values.env';path.write_text('export JWT_SECRET="keep#inside" # note\nWEB_PORT=3100 # local\n')
            self.assertEqual(checks.read_env(path),{'JWT_SECRET':'keep#inside','WEB_PORT':'3100'})

    def test_invalid_syntax_is_sanitized(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'values.env';path.write_text('private-value-without-equals\n')
            result=subprocess.run([sys.executable,str(SCRIPT),'--env-file',str(path),'--mode','production'],capture_output=True,text=True)
            self.assertEqual(result.returncode,1)
            self.assertNotIn('private-value-without-equals',result.stdout+result.stderr)

    def test_errors_do_not_echo_secrets(self):
        env=self.production();env['JWT_SECRET']='private-short';env['POSTGRES_PASSWORD']='private-short'
        errors=' '.join(checks.validate(env,'production'))
        self.assertNotIn('private-short',errors)

if __name__ == '__main__':
    unittest.main()
