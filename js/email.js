/* ============================================================
   Email Service — EmailJS + Gmail Integration
   ============================================================
   Sends beautiful Arabic HTML emails to ALL players when a 
   booking is created. No links shown on screen — all via email.
   ============================================================ */

const EmailService = {
  // ── EmailJS Config ──
  SERVICE_ID: 'service_9ulubti',
  TEMPLATE_ID: 'template_rbv20qh',
  PUBLIC_KEY: 'P3__PNuZoOOGG4A1L',

  _initialized: false,
  _sdkLoaded: false,

  // ── Load EmailJS SDK dynamically ──
  async loadSDK() {
    if (this._sdkLoaded) return true;
    
    return new Promise((resolve) => {
      if (typeof emailjs !== 'undefined') {
        this._sdkLoaded = true;
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      script.onload = () => { this._sdkLoaded = true; resolve(true); };
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  },

  // ── Initialize EmailJS ──
  async init() {
    if (this._initialized) return true;
    const loaded = await this.loadSDK();
    if (loaded && this.PUBLIC_KEY && typeof emailjs !== 'undefined') {
      emailjs.init(this.PUBLIC_KEY);
      this._initialized = true;
      console.log('✅ EmailJS initialized');
      return true;
    }
    return false;
  },

  isConfigured() {
    return this.SERVICE_ID && this.SERVICE_ID !== '' && this.PUBLIC_KEY && this.PUBLIC_KEY !== '';
  },

  // ── Build base URL for links ──
  getBaseUrl() {
    // Always use Firebase Hosting URL for email links
    return 'https://new-booking-web.web.app/';
  },

  // ── Build player confirm link ──
  getPlayerConfirmLink(booking, playerId) {
    return `${this.getBaseUrl()}player-confirm.html?booking=${booking.bookingId}&player=${playerId}&token=${encodeURIComponent(booking.token)}`;
  },

  // ── Build verify link (for QR / coach) ──
  getVerifyLink(booking) {
    return `${this.getBaseUrl()}verify.html?token=${encodeURIComponent(booking.token)}`;
  },

  // ── Build the HTML email body ──
  buildEmailHTML(playerName, booking, confirmLink) {
    return `
<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 0;">
  <div style="background: #ffffff; border-radius: 12px; border: 1px solid #e0e0e0; overflow: hidden;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #2e7d32, #388e3c); padding: 24px; text-align: center;">
      <h2 style="color: white; margin: 0; font-size: 18px;">🏟️ نظام حجز ملاعب جامعة الإسراء</h2>
    </div>
    
    <!-- Body -->
    <div style="padding: 28px 24px;">
      <p style="font-size: 22px; margin: 0 0 8px 0;">👋 مرحبًا</p>
      <p style="font-size: 15px; color: #333; margin: 0 0 20px 0; line-height: 1.6;">
        :لقد تمت دعوتك لحجز ملعب، فيما يلي تفاصيل الحجز
      </p>
      
      <!-- Booking Details Card -->
      <div style="background: #f8f9fa; border-radius: 10px; padding: 16px; margin-bottom: 20px; border-right: 4px solid #2e7d32;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #666; width: 100px;">الملعب:</td>
            <td style="padding: 6px 0; font-weight: 600;">${booking.fieldName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666;">اللعبة:</td>
            <td style="padding: 6px 0; font-weight: 600;">${booking.sportName || ''}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666;">التاريخ:</td>
            <td style="padding: 6px 0; font-weight: 600;">${Utils.formatDate(booking.date)} (${Utils.getDayName(booking.date)})</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666;">الوقت:</td>
            <td style="padding: 6px 0; font-weight: 600;">${Utils.formatTime(booking.startTime)} - ${Utils.formatTime(booking.endTime)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666;">اللاعبون:</td>
            <td style="padding: 6px 0; font-weight: 600;">${booking.players.map(p => p.name).join('، ')}</td>
          </tr>
        </table>
      </div>
      
      <!-- Confirm Button -->
      <div style="text-align: center; margin: 24px 0;">
        <a href="${confirmLink}" style="display: inline-block; background: #2e7d32; color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; letter-spacing: 0.5px;">
          ✅ تأكيد الحجز
        </a>
      </div>
      
      <p style="font-size: 13px; color: #999; text-align: center; margin: 16px 0 0 0;">
        .إذا لم تقم بطلب هذا الحجز، يمكنك تجاهل هذا الإيميل
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background: #f5f5f5; padding: 16px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="margin: 0; font-size: 12px; color: #999;">
        مركز الحاسوب - التطبيقات الالكترونية | جامعة الإسراء
      </p>
    </div>
  </div>
</div>`;
  },

  // ── Send Booking Emails to ALL Players ──
  async sendBookingEmails(booking) {
    if (!this.isConfigured()) {
      console.log('📧 EmailJS not configured — skipping email send');
      return { sent: 0, failed: 0, total: booking.players.length };
    }

    await this.init();
    
    let sent = 0;
    let failed = 0;

    for (const player of booking.players) {
      const confirmLink = this.getPlayerConfirmLink(booking, player.id);
      
      // Look up the REAL email from Firebase users collection
      let playerEmail = null;
      try {
        const userDoc = await db.collection(Collections.USERS).doc(player.id).get();
        if (userDoc.exists) {
          playerEmail = userDoc.data().email;
        }
      } catch(e) {
        console.warn('Could not fetch user email for', player.id);
      }
      
      // Skip if no real email found
      if (!playerEmail) {
        console.warn(`📧 ⏭️ No email found for ${player.id}, skipping`);
        failed++;
        continue;
      }

      try {
        await emailjs.send(this.SERVICE_ID, this.TEMPLATE_ID, {
          to_name: player.name,
          to_email: playerEmail,
          from_name: 'مركز الحاسوب - التطبيقات الالكترونية',
          field_name: booking.fieldName,
          booking_date: `${Utils.formatDate(booking.date)} (${Utils.getDayName(booking.date)})`,
          booking_time: `${Utils.formatTime(booking.startTime)} - ${Utils.formatTime(booking.endTime)}`,
          players_list: booking.players.map(p => p.name).join('، '),
          confirm_link: confirmLink,
          booking_id: booking.bookingId
        });
        
        console.log(`📧 ✅ Email sent to ${player.id} → ${playerEmail}`);
        sent++;
        await this.logEmail(booking.bookingId, player.id, playerEmail, 'booking', 'sent');
      } catch (err) {
        console.warn(`📧 ❌ Failed: ${player.id} →`, err);
        failed++;
        await this.logEmail(booking.bookingId, player.id, playerEmail, 'booking', 'failed');
      }
    }

    console.log(`📧 Results: ${sent} sent, ${failed} failed out of ${booking.players.length}`);
    return { sent, failed, total: booking.players.length };
  },

  // ── Send Cancellation Email (to booker only) ──
  async sendCancellationEmail(booking) {
    if (!this.isConfigured()) {
      console.log('📧 EmailJS not configured — skipping cancel email');
      return false;
    }

    await this.init();
    
    const cancelLink = `${this.getBaseUrl()}cancel.html?booking=${booking.bookingId}&token=${encodeURIComponent(booking.token)}`;
    const bookerPlayer = booking.players.find(p => p.id === booking.bookedBy);
    const bookerEmail = bookerPlayer?.email || `${booking.bookedBy}@iu.edu.jo`;

    const cancelHTML = `
<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 500px; margin: 0 auto;">
  <div style="background: #ffffff; border-radius: 12px; border: 1px solid #e0e0e0; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #c62828, #d32f2f); padding: 24px; text-align: center;">
      <h2 style="color: white; margin: 0; font-size: 18px;">⚠️ طلب إلغاء حجز</h2>
    </div>
    <div style="padding: 28px 24px;">
      <p style="font-size: 15px; color: #333; line-height: 1.6;">
        مرحبًا ${bookerPlayer?.name || ''}،<br>
        لقد طلبت إلغاء الحجز التالي:
      </p>
      <div style="background: #fff3f3; border-radius: 10px; padding: 16px; margin: 16px 0; border-right: 4px solid #c62828;">
        <p style="margin: 4px 0;"><strong>الملعب:</strong> ${booking.fieldName}</p>
        <p style="margin: 4px 0;"><strong>التاريخ:</strong> ${Utils.formatDate(booking.date)}</p>
        <p style="margin: 4px 0;"><strong>الوقت:</strong> ${Utils.formatTime(booking.startTime)} - ${Utils.formatTime(booking.endTime)}</p>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${cancelLink}" style="display: inline-block; background: #c62828; color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">
          ❌ تأكيد الإلغاء
        </a>
      </div>
      <p style="font-size: 13px; color: #999; text-align: center;">إذا لم تطلب الإلغاء، تجاهل هذا البريد.</p>
    </div>
    <div style="background: #f5f5f5; padding: 16px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="margin: 0; font-size: 12px; color: #999;">مركز الحاسوب - التطبيقات الالكترونية | جامعة الإسراء</p>
    </div>
  </div>
</div>`;

    try {
      await emailjs.send(this.SERVICE_ID, this.TEMPLATE_ID, {
        to_name: bookerPlayer?.name || booking.bookedBy,
        to_email: bookerEmail,
        from_name: 'مركز الحاسوب - التطبيقات الالكترونية',
        subject: 'طلب إلغاء حجز ملعب',
        message_html: cancelHTML,
        confirm_link: cancelLink
      });
      console.log('📧 ✅ Cancellation email sent');
      return true;
    } catch (err) {
      console.warn('📧 ❌ Cancel email failed:', err);
      return false;
    }
  },

  // ── Log email to Firebase ──
  async logEmail(bookingId, recipientId, recipientEmail, type, status) {
    const log = {
      logId: Utils.generateId(),
      bookingId,
      recipientId,
      recipientEmail,
      type,
      status,
      sentAt: new Date().toISOString()
    };

    try {
      if (typeof isFirebaseConfigured === 'function' && isFirebaseConfigured()) {
        await db.collection(Collections.EMAIL_LOGS).doc(log.logId).set(log);
      }
    } catch (e) {
      // Silent fail for logging
    }
  },

  // ── Configure credentials ──
  configure(serviceId, templateId, publicKey) {
    this.SERVICE_ID = serviceId;
    this.TEMPLATE_ID = templateId;
    this.PUBLIC_KEY = publicKey;
    this._initialized = false;
    console.log('✅ EmailJS configured:', serviceId);
  }
};

window.EmailService = EmailService;
