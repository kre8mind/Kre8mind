import nodemailer from 'nodemailer';

export const sendInquiryConfirmation = async (inquiry) => {
  const { name, email, company, serviceTier, addons, budget, timeline, details, id } = inquiry;
  
  // HTML template styled with Kre8mind's signature dark/light luxury Swiss typography
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f8; color: #111111; margin: 0; padding: 40px 20px; }
        .card { max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e5ea; padding: 40px; box-sizing: border-box; }
        .header { border-bottom: 2px solid #111111; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: baseline; }
        .logo { font-size: 20px; font-weight: 800; letter-spacing: -0.04em; text-transform: uppercase; color: #111111; }
        .ref { font-family: monospace; font-size: 12px; color: #737380; }
        .title { font-size: 24px; font-weight: 700; letter-spacing: -0.03em; margin: 0 0 12px 0; color: #111111; }
        .subtitle { font-size: 15px; color: #55555c; line-height: 1.6; margin-bottom: 28px; }
        .spec-box { background-color: #fafafb; border: 1px solid #eaeaea; padding: 20px; margin-bottom: 28px; }
        .spec-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f2; font-size: 14px; }
        .spec-row:last-child { border-bottom: none; }
        .spec-label { color: #737380; text-transform: uppercase; font-size: 11.5px; font-family: monospace; }
        .spec-value { font-weight: 600; color: #111111; text-align: right; }
        .badge { display: inline-block; background-color: #5b21b6; color: #ffffff; font-size: 11px; padding: 3px 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .details-box { background-color: #ffffff; border-left: 3px solid #5b21b6; padding: 12px 16px; margin-bottom: 30px; font-size: 14px; color: #333333; line-height: 1.6; }
        .footer { font-size: 12px; color: #8e8e93; border-top: 1px solid #e5e5ea; padding-top: 20px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo">KRE8MIND STUDIO</div>
          <div class="ref">REF: ${id}</div>
        </div>
        
        <h1 class="title">Project Inquiry Received</h1>
        <p class="subtitle">
          Hello ${name}, thank you for reaching out to Kre8mind. We have received your project specifications and are reviewing the scope.
        </p>

        <div class="spec-box">
          <div class="spec-row">
            <span class="spec-label">Service Tier</span>
            <span class="spec-value"><span class="badge">${serviceTier || 'Custom Engagement'}</span></span>
          </div>
          ${company ? `
          <div class="spec-row">
            <span class="spec-label">Company / Team</span>
            <span class="spec-value">${company}</span>
          </div>` : ''}
          ${addons && addons.length ? `
          <div class="spec-row">
            <span class="spec-label">Add-ons Selected</span>
            <span class="spec-value">${addons.join(', ')}</span>
          </div>` : ''}
          ${budget ? `
          <div class="spec-row">
            <span class="spec-label">Target Budget</span>
            <span class="spec-value">${budget}</span>
          </div>` : ''}
          ${timeline ? `
          <div class="spec-row">
            <span class="spec-label">Estimated Timeline</span>
            <span class="spec-value">${timeline}</span>
          </div>` : ''}
        </div>

        ${details ? `
        <div class="spec-label" style="margin-bottom: 8px;">Project Scope Details</div>
        <div class="details-box">${details}</div>
        ` : ''}

        <p class="subtitle" style="margin-bottom: 32px;">
          Our principal design lead will get back to you within 24 hours with an audit summary and next steps.
        </p>

        <div class="footer">
          Kre8mind Studio — Clarity By Design.<br>
          Direct Inquiries: <a href="mailto:hello@kre8mind.com" style="color: #5b21b6; text-decoration: none;">hello@kre8mind.com</a>
        </div>
      </div>
    </body>
    </html>
  `;

  // If SMTP environment variables exist, attempt actual delivery
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: `"Kre8mind Studio" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        bcc: process.env.ADMIN_NOTIFY_EMAIL || undefined,
        subject: `Kre8mind Project Inquiry Confirmation [${id}]`,
        html: htmlContent
      });

      return { success: true, delivered: true };
    } catch (error) {
      console.error('SMTP Delivery error:', error);
      return { success: true, delivered: false, error: error.message };
    }
  } else {
    // Development mode fallback
    console.log(`\n[EMAIL DISPATCH SIMULATION] Branded receipt card generated for ${email} (Inquiry ID: ${id})`);
    return { success: true, delivered: false, simulated: true };
  }
};
