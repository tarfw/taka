import dotenv from 'dotenv';
dotenv.config();

export interface SendEmailAttachment {
  name: string;
  mime_type: string;
  content: string; // Base64 encoded
}

export interface SendEmailPayload {
  to: { address: string; name?: string }[];
  subject: string;
  htmlbody: string;
  attachments?: SendEmailAttachment[];
  from?: { address: string; name?: string };
}

export async function sendTransactionalEmail(payload: SendEmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiUrl = process.env.ZEPTOMAIL_API_URL || 'https://api.zeptomail.com/v1.1/email';
  const sendToken = process.env.ZEPTOMAIL_SEND_MAIL_TOKEN;
  const fromAddress = payload.from?.address || process.env.ZEPTOMAIL_FROM_ADDRESS || 'quotes@taka.ae';
  const fromName = payload.from?.name || process.env.ZEPTOMAIL_FROM_NAME || 'TAKA Scientific Equipments';

  // If token is missing, log simulation mode
  if (!sendToken) {
    console.log(`[ZeptoMail: Simulation] Token not configured. Email to ${payload.to.map(t => t.address).join(', ')}: "${payload.subject}" [Simulated Sent]`);
    return { success: true, messageId: `mock_zepto_${Date.now()}` };
  }

  const body: any = {
    from: {
      address: fromAddress,
      name: fromName
    },
    to: payload.to.map(t => ({
      email_address: {
        address: t.address,
        name: t.name || t.address
      }
    })),
    subject: payload.subject,
    htmlbody: payload.htmlbody,
    attachments: payload.attachments || []
  };

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': sendToken.startsWith('Zoho-enczapikey') ? sendToken : `Zoho-enczapikey ${sendToken}`
      },
      body: JSON.stringify(body)
    });

    const data: any = await res.json();
    if (!res.ok) {
      console.error('[ZeptoMail Error]:', JSON.stringify(data, null, 2));
      return { success: false, error: data.error?.message || data.message || res.statusText };
    }

    console.log(`[ZeptoMail] Successfully dispatched email: ${payload.subject} to ${payload.to.map(t => t.address).join(', ')}`);
    return { success: true, messageId: data.data?.[0]?.message_id || 'sent' };
  } catch (err: any) {
    console.error('[ZeptoMail Network Error]:', err);
    return { success: false, error: err.message };
  }
}
