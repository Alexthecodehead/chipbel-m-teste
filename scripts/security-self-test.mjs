process.env.SESSION_SECRET = 'test-only-secret-with-more-than-32-characters';

const auth = await import('../server/auth.js');
const password = 'SenhaForte!2026';
const passwordHash = await auth.hashPassword(password);

if (!(await auth.verifyPassword(password, passwordHash))) {
  throw new Error('Uma senha valida nao passou na verificacao.');
}
if (await auth.verifyPassword('senha-incorreta', passwordHash)) {
  throw new Error('Uma senha incorreta passou na verificacao.');
}

const session = auth.createSessionToken({ id: 1, role: 'admin' });
const request = { headers: { cookie: `chipbelem_session=${encodeURIComponent(session)}` } };
if (!auth.readSessionToken(request)) {
  throw new Error('Uma sessao valida nao passou na verificacao.');
}

request.headers.cookie += 'x';
if (auth.readSessionToken(request)) {
  throw new Error('Uma sessao adulterada passou na verificacao.');
}

console.log('Security self-test passed.');
process.exit(0);
