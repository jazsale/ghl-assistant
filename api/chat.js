export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, system, claudeKey, ghlKey, locationId, ghlAction, ghlParams } = req.body;

  // Handle direct GHL API calls
  if (ghlAction) {
    try {
      let ghlUrl = '';
      let ghlMethod = 'GET';
      let ghlBody = null;

      switch(ghlAction) {
        case 'getWorkflows':
          ghlUrl = `https://services.leadconnectorhq.com/workflows/?locationId=${locationId}`;
          break;
        case 'getContacts':
          ghlUrl = `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=20`;
          break;
        case 'getFunnels':
          ghlUrl = `https://services.leadconnectorhq.com/funnels/?locationId=${locationId}`;
          break;
        case 'getPipelines':
          ghlUrl = `https://services.leadconnectorhq.com/opportunities/pipelines/?locationId=${locationId}`;
          break;
        case 'getCalendars':
          ghlUrl = `https://services.leadconnectorhq.com/calendars/?locationId=${locationId}`;
          break;
        case 'createContact':
          ghlUrl = `https://services.leadconnectorhq.com/contacts/`;
          ghlMethod = 'POST';
          ghlBody = JSON.stringify({ ...ghlParams, locationId });
          break;
        case 'createWorkflow':
          ghlUrl = `https://services.leadconnectorhq.com/workflows/`;
          ghlMethod = 'POST';
          ghlBody = JSON.stringify({ ...ghlParams, locationId });
          break;
        default:
          return res.status(400).json({ error: 'Unknown GHL action' });
      }

      const ghlResponse = await fetch(ghlUrl, {
        method: ghlMethod,
        headers: {
          'Authorization': `Bearer ${ghlKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        },
        ...(ghlBody && { body: ghlBody })
      });

      const ghlData = await ghlResponse.json();
      return res.status(200).json({ ghlData });

    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Handle Claude AI calls
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        system,
        messages
      })
    });

    const data = await response.json();
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
