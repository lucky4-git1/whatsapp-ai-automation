async function connectAccount() {
  const token = 'EAAVHl0Frt0IBTMdoLRV7tzL5eYB8kZBJNfaAApa9gZArznhQ9gQxEVUMZCQvKTo3RhvVX7hAOZB58HthSvZB6pXGOGkS2cUQOAoFcp95krpcHZB4SaQVPAZCqxAt0PDZBMPGfZBwfI0WIrBhiNoS0UkNhbsD5cVZB5N2FpdzrN7rpyKOm7v3D0CIWA9My5WikpbC7OHxmGfEMD1ZCTcbtMXMJRVzACK2VLc6KVRIpIekMIc6jtUPiSUjgZDZD';
  const phoneNumberId = '1456649197533399';
  const businessAccountId = '1104267415989269';
  const phoneNumber = '+15551734973';

  // 1. Login to get JWT
  const loginRes = await fetch('http://localhost:4002/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'alex@enterprise-demo.io',
      password: 'DemoPassword2026!',
    }),
  });

  const loginData = await loginRes.json();
  if (!loginData.success) {
    console.error('Login failed:', loginData);
    return;
  }

  const jwt = loginData.data.token;
  const workspaceId = loginData.data.user.memberships[0]?.workspaceId;
  console.log('Logged in. Workspace:', workspaceId);

  // 2. Connect WhatsApp line
  const connectRes = await fetch('http://localhost:4002/api/v1/whatsapp/accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
      'x-workspace-id': workspaceId,
    },
    body: JSON.stringify({
      name: 'Meta Official Cloud Line',
      businessAccountId,
      phoneNumberId,
      phoneNumber,
      accessToken: token,
      webhookSecret: 'demo_secret_2026',
    }),
  });

  const connectData = await connectRes.json();
  console.log('Connect response:', JSON.stringify(connectData, null, 2));
}

connectAccount().catch(console.error);
