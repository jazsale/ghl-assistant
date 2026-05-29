export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, system, claudeKey, ghlKey, locationId, ghlAction, ghlParams } = req.body;

  if (ghlAction) {
    try {
      let ghlUrl = '';
      let ghlMethod = 'GET';
      let ghlBody = null;

      switch(ghlAction) {
        // READ actions
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
        case 'getForms':
          ghlUrl = `https://services.leadconnectorhq.com/forms/?locationId=${locationId}`;
          break;
        case 'getTags':
          ghlUrl = `https://services.leadconnectorhq.com/locations/${locationId}/tags`;
          break;
        case 'getOpportunities':
          ghlUrl = `https://services.leadconnectorhq.com/opportunities/search?location_id=${locationId}&limit=20`;
          break;

        // WRITE actions  
        case 'createContact':
          ghlUrl = `https://services.leadconnectorhq.com/contacts/`;
          ghlMethod = 'POST';
          ghlBody = JSON.stringify({ ...ghlParams, locationId });
          break;
        case 'updateContact':
          ghlUrl = `https://services.leadconnectorhq.com/contacts/${ghlParams.contactId}`;
          ghlMethod = 'PUT';
          ghlBody = JSON.stringify(ghlParams.data);
          break;
        case 'addTagToContact':
          ghlUrl = `https://services.leadconnectorhq.com/contacts/${ghlParams.contactId}/tags`;
          ghlMethod = 'POST';
          ghlBody = JSON.stringify({ tags: ghlParams.tags });
          break;
        case 'createOpportunity':
          ghlUrl = `https://services.leadconnectorhq.com/opportunities/`;
          ghlMethod = 'POST';
          ghlBody = JSON.stringify({ ...ghlParams, locationId });
          break;
        case 'updateOpportunity':
          ghlUrl = `https://services.leadconnectorhq.com/opportunities/${ghlParams.opportunityId}`;
          ghlMethod = 'PUT';
          ghlBody = JSON.stringify(ghlParams.data);
          break;
        case 'sendSMS':
          ghlUrl = `https://services.leadconnectorhq.com/conversations/messages`;
          ghlMethod = 'POST';
          ghlBody = JSON.stringify({
            type: 'SMS',
            contactId: ghlParams.contactId,
            message: ghlParams.message,
            locationId
          });
          break;
        case 'sendEmail':
          ghlUrl = `https://services.leadconnectorhq.com/conversations/messages`;
          ghlMethod = 'POST';
          ghlBody = JSON.stringify({
            type: 'Email',
            contactId: ghlParams.contactId,
            subject: ghlParams.subject,
            html: ghlParams.body,
            locationId
          });
          break;
        case 'createTask':
          ghlUrl = `https://services.leadconnectorhq.com/contacts/${ghlParams.contactId}/tasks`;
          ghlMethod = 'POST';
          ghlBody = JSON.stringify({
            title: ghlParams.title,
            dueDate: ghlParams.dueDate,
            completed: false,
            assignedTo: ghlParams.assignedTo
          });
          break;
        case 'addContactToWorkflow':
          ghlUrl = `https://services.leadconnectorhq.com/contacts/${ghlParams.contactId}/workflow/${ghlParams.workflowId}`;
          ghlMethod = 'POST';
          ghlBody = JSON.stringify({});
          break;
        case 'updateFunnelPage':
          ghlUrl = `https://services.leadconnectorhq.com/funnels/page/${ghlParams.pageId}`;
          ghlMethod = 'PUT';
          ghlBody = JSON.stringify(ghlParams.data);
          break;

        default:
          return res.status(400).json({ error: 'Unknown GHL action: ' + ghlAction });
      }

      const ghlResponse = await fetch(ghlUrl, {
        method: ghlMethod,
        headers: {
          'Authorization': `Bearer ${ghlKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
          'Accept': 'application/json'
        },
        ...(ghlBody && { body: ghlBody })
      });

      const responseText = await ghlResponse.text();
      let ghlData;
      try {
        ghlData = JSON.parse(responseText);
      } catch(e) {
        ghlData = { raw: responseText, status: ghlResponse.status };
      }

      return res.status(200).json({ ghlData, status: ghlResponse.status });

    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Claude AI call
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
