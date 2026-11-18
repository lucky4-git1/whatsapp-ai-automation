async function send() {
  const token = 'EAAVHl0Frt0IBTMdoLRV7tzL5eYB8kZBJNfaAApa9gZArznhQ9gQxEVUMZCQvKTo3RhvVX7hAOZB58HthSvZB6pXGOGkS2cUQOAoFcp95krpcHZB4SaQVPAZCqxAt0PDZBMPGfZBwfI0WIrBhiNoS0UkNhbsD5cVZB5N2FpdzrN7rpyKOm7v3D0CIWA9My5WikpbC7OHxmGfEMD1ZCTcbtMXMJRVzACK2VLc6KVRIpIekMIc6jtUPiSUjgZDZD';
  const phoneId = '1456649197533399';
  const recipient = '916305153225';

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'template',
      template: {
        name: 'hello_world',
        language: { code: 'en_US' }
      }
    })
  });
  const data = await res.json();
  console.log('Template send response:', JSON.stringify(data, null, 2));
}

send().catch(console.error);
