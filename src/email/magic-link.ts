/**
 * Magic link email sending
 */

import type { Env } from '../types.js';

export async function sendMagicLinkEmail(
  env: Env,
  toEmail: string,
  merchantName: string,
  magicToken: string
): Promise<void> {
  const magicLink = `${env.PUBLIC_URL}/v1/authorize/confirm?token=${magicToken}`;

  console.log('[EMAIL] Sending magic link to:', toEmail);
  console.log('[EMAIL] Magic link URL:', magicLink);

  // If RESEND_API_KEY is not set, just log the link (for local dev)
  if (!env.RESEND_API_KEY) {
    console.log('[EMAIL] RESEND_API_KEY not set - Magic link (click to authorize):');
    console.log('[EMAIL] ' + magicLink);
    return;
  }

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">Shopper Context Authorization</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="font-size: 16px; margin-top: 0;">A request has been made to access your ${merchantName} shopper data.</p>

    <p style="font-size: 14px; color: #666;">Click the button below to authorize this request:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${magicLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Authorize Access
      </a>
    </div>

    <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
    <p style="background: white; padding: 12px; border-radius: 4px; border: 1px solid #e5e7eb; word-break: break-all; font-family: monospace; font-size: 12px; color: #667eea;">
      ${magicLink}
    </p>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #9ca3af; margin: 5px 0;">This link will expire in 10 minutes.</p>
      <p style="font-size: 12px; color: #9ca3af; margin: 5px 0;">If you didn't request this authorization, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const emailText = `
Shopper Context Authorization

A request has been made to access your ${merchantName} shopper data.

Click this link to authorize: ${magicLink}

This link will expire in 10 minutes.

If you didn't request this authorization, you can safely ignore this email.
  `.trim();

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM || 'SCP Authorization <noreply@scp.example.com>',
        to: toEmail,
        subject: `Authorize ${merchantName} Access`,
        html: emailHtml,
        text: emailText
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[EMAIL] Failed to send email:', {
        status: response.status,
        error
      });
      throw new Error(`Failed to send email: ${response.status} ${error}`);
    }

    const result = await response.json();
    console.log('[EMAIL] Email sent successfully:', result);
  } catch (error: any) {
    console.error('[EMAIL] Error sending email:', error.message);
    // Still log the magic link so it can be used
    console.log('[EMAIL] Fallback - Magic link (click to authorize):');
    console.log('[EMAIL] ' + magicLink);
    throw error;
  }
}
