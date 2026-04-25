/* ============================================================
   Booking Engine — Core booking logic
   ============================================================ */

const BookingEngine = {
  // ── Local booking storage (demo mode) ──
  _demoBookings: [],

  // ── Fields data ──
  FIELDS: {
    padel_a: { name: 'ملعب البادل A', sport: 'padel', players: 4, open: '08:00', close: '16:00' },
    padel_b: { name: 'ملعب البادل B', sport: 'padel', players: 4, open: '08:00', close: '16:00' },
    padel_c: { name: 'ملعب البادل C', sport: 'padel', players: 4, open: '08:00', close: '16:00' },
    padel_d: { name: 'ملعب البادل D', sport: 'padel', players: 4, open: '08:00', close: '16:00' },
    football_5v5: { name: 'ملعب كرة القدم الخماسي', sport: 'football', players: 10, open: '08:00', close: '16:00' },
    football_6v6: { name: 'ملعب كرة القدم السداسي', sport: 'football', players: 12, open: '08:00', close: '16:00' },
    squash_a: { name: 'ملعب سكواتش A', sport: 'squash', players: 2, open: '08:00', close: '16:00' },
    squash_b: { name: 'ملعب سكواتش B', sport: 'squash', players: 2, open: '08:00', close: '16:00' },
    multipurpose: { name: 'ملعب متعدد الاستخدام', sport: 'multi', players: 10, open: '08:00', close: '16:00' },
    beach: { name: 'ملعب شاطئي', sport: 'beach', players: 8, open: '08:00', close: '16:00' }
  },

  // ── Sport display names ──
  getSportName(sport) {
    const names = {
      padel: 'البادل',
      football: 'كرة القدم',
      squash: 'السكواش',
      multi: 'متعدد الاستخدام',
      beach: 'رياضة شاطئية'
    };
    return names[sport] || sport;
  },

  // ── Get field info ──
  getField(fieldId) {
    return this.FIELDS[fieldId] || null;
  },

  // ── Create Booking ──
  async createBooking(bookingData) {
    const {
      fieldId,
      date,
      startTime,
      endTime,
      duration,
      bookedBy,
      players
    } = bookingData;

    const field = this.FIELDS[fieldId];
    if (!field) throw new Error('الملعب غير موجود');

    const isPublic = !!bookingData.isPublic;

    // Validate player count
    if (!isPublic && players.length !== field.players) {
      throw new Error(`يجب إدخال ${field.players} لاعبين لهذا الملعب (أو اجعله حجز عام)`);
    }
    if (players.length < 1) {
      throw new Error('يجب إدخال لاعب واحد على الأقل');
    }

    // Check for duplicate player IDs in form
    const playerIds = players.map(p => p.id.toLowerCase());
    const uniqueIds = new Set(playerIds);
    if (uniqueIds.size !== playerIds.length) {
      throw new Error('لا يمكن إدخال نفس رقم الطالب مرتين');
    }

    // Check daily limit for booker
    const user = AuthManager.getCurrentUser();
    const dailyLimit = AuthManager.getDailyLimit(user.role);
    const usedHours = await this.getUsedHoursOnDate(user.uid, date);
    
    if (usedHours + duration > dailyLimit && dailyLimit !== Infinity) {
      throw new Error(`لقد تجاوزت الحد اليومي. المتبقي: ${dailyLimit - usedHours} ساعة`);
    }

    // Check all players are not already booked at this time
    for (const player of players) {
      const conflict = await this.checkPlayerConflict(player.id, date, startTime, endTime);
      if (conflict) {
        if (conflict.fieldName === 'الحد اليومي المسموح به') {
          throw new Error(`اللاعب ${player.id} تجاوز الحد اليومي المسموح به للساعات`);
        }
        throw new Error(`اللاعب ${player.id} لديه حجز في نفس الوقت في ${conflict.fieldName}`);
      }
    }

    // Calculate extra hours cost
    const standardSlot = 1; // 1 hour standard
    const extraHours = Math.max(0, duration - standardSlot);
    const extraCost = extraHours * 2; // 2 JOD per extra hour

    // Generate unique token
    const token = Utils.generateToken();
    const signature = Utils.signToken(token);
    // Generate custom combo booking ID (New Format: 2041-PAD-B-12-DD-MM-YY)
    const studentDigits = bookedBy.replace(/\D/g, '');
    const fieldCode = {
      padel_a: 'PAD-A', padel_b: 'PAD-B', padel_c: 'PAD-C', padel_d: 'PAD-D',
      football_5v5: 'FB-5', football_6v6: 'FB-6',
      squash_a: 'SQ-A', squash_b: 'SQ-B',
      multipurpose: 'MLT', beach: 'BCH'
    }[fieldId] || fieldId.substring(0, 4).toUpperCase();
    
    const startHour = startTime.split(':')[0];
    const dateParts = date.split('-'); // [YYYY, MM, DD]
    const dateCode = `${dateParts[2]}${dateParts[1]}${dateParts[0].substring(2)}`; // DDMMYY
    
    // Format: 2041PADB-1200-DDMMYY
    const bookingId = `${studentDigits}${fieldCode}-${startHour}00-${dateCode}`;

    const booking = {
      bookingId,
      token: `${token}.${signature}`,
      fieldId,
      fieldName: field.name,
      sportType: field.sport,
      sportName: this.getSportName(field.sport),
      date,
      startTime,
      endTime,
      duration,
      bookedBy,
      players: players.map(p => ({
        id: p.id.toLowerCase(),
        name: p.name,
        confirmed: p.id.toLowerCase() === user.uid.toLowerCase()
      })),
      status: 'pending',
      isPublic,
      maxPlayers: field.players,
      extraHours,
      extraCost,
      emailsSent: false,
      createdAt: new Date().toISOString(),
      cancelledAt: null
    };

    if (isFirebaseConfigured()) {
      try {
        await db.collection(Collections.BOOKINGS).doc(bookingId).set(booking);
      } catch (error) {
        throw new Error('فشل في حفظ الحجز. يرجى المحاولة مرة أخرى');
      }
    } else {
      // Demo mode — save locally
      this._demoBookings.push(booking);
      Utils.saveLocal('bookings', this._demoBookings);
    }

    return booking;
  },

  // ── Check if player has conflict ──
  async checkPlayerConflict(playerId, date, startTime, endTime) {
    const pid = playerId.toLowerCase();
    
    // 1. Fetch player's role to determine their limit
    let role = 'student';
    if (typeof db !== 'undefined' && isFirebaseConfigured()) {
      try {
        const userDoc = await db.collection(Collections.USERS).doc(pid).get();
        if (userDoc.exists) role = userDoc.data().role;
      } catch(e) {
        console.warn('Could not fetch player role from Firebase, defaulting to student');
      }
    }
    
    const dailyLimit = AuthManager.getDailyLimit(role);
    const usedToday = await this.getUsedHoursOnDate(pid, date);
    
    const bookings = await this.getBookingsForDate(date);
    
    for (const b of bookings) {
      if (b.status === 'cancelled') continue;
      
      const playerEntry = b.players.find(p => p.id.toLowerCase() === pid);
      if (!playerEntry && b.bookedBy.toLowerCase() !== pid) continue;
      
      // A. Check for EXACT TIME OVERLAP (Always block regardless of role)
      const overlap = this._timesOverlap(startTime, endTime, b.startTime, b.endTime);
      if (overlap && (playerEntry?.confirmed || b.bookedBy.toLowerCase() === pid)) {
        return b;
      }
    }
    
    // B. Check DAILY LIMIT
    // If they are about to exceed their daily limit, block new invitations/bookings
    if (usedToday + 1 > dailyLimit && dailyLimit !== Infinity) {
      return { fieldName: 'الحد اليومي المسموح به' }; // Custom error indicator
    }
    
    return null;
  },

  // ── Time overlap check ──
  _timesOverlap(start1, end1, start2, end2) {
    const toMinutes = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const s1 = toMinutes(start1), e1 = toMinutes(end1);
    const s2 = toMinutes(start2), e2 = toMinutes(end2);
    return s1 < e2 && s2 < e1;
  },

  // ── Get bookings for a specific date ──
  async getBookingsForDate(date) {
    if (isFirebaseConfigured()) {
      try {
        const snapshot = await db.collection(Collections.BOOKINGS)
          .where('date', '==', date)
          .get();
        return snapshot.docs.map(doc => doc.data());
      } catch { return []; }
    } else {
      this._loadLocalBookings();
      return this._demoBookings.filter(b => b.date === date);
    }
  },

  // ── Get bookings for field on a date ──
  async getFieldBookings(fieldId, date) {
    if (isFirebaseConfigured()) {
      try {
        const snapshot = await db.collection(Collections.BOOKINGS)
          .where('fieldId', '==', fieldId)
          .where('date', '==', date)
          .where('status', '==', 'active')
          .get();
        return snapshot.docs.map(doc => doc.data());
      } catch { return []; }
    } else {
      this._loadLocalBookings();
      return this._demoBookings.filter(b => 
        b.fieldId === fieldId && b.date === date && b.status === 'active'
      );
    }
  },

  // ── Get all future bookings for a user ──
  async getUserBookings(userId) {
    const uid = userId.toLowerCase();
    const today = Utils.today();
    
    if (isFirebaseConfigured()) {
      try {
        // Fetch all bookings from today onwards
        const snapshot = await db.collection(Collections.BOOKINGS)
          .where('date', '>=', today)
          .get();
        
        return snapshot.docs
          .map(doc => doc.data())
          .filter(b => b.status !== 'cancelled' && (
            b.bookedBy.toLowerCase() === uid || 
            b.players.some(p => p.id.toLowerCase() === uid)
          ))
          .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
      } catch { return []; }
    } else {
      this._loadLocalBookings();
      return this._demoBookings
        .filter(b => b.date >= today && b.status !== 'cancelled' && (
          b.bookedBy.toLowerCase() === uid || 
          b.players.some(p => p.id.toLowerCase() === uid)
        ))
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    }
  },

  // ── Get user's used hours on a specific date ──
  async getUsedHoursOnDate(userId, date) {
    const targetDate = date || Utils.today();
    const bookings = await this.getBookingsForDate(targetDate);
    const uid = userId.toLowerCase();
    
    let total = 0;
    for (const b of bookings) {
      if (b.status === 'cancelled') continue;
      
      // Booker always counts
      if (b.bookedBy.toLowerCase() === uid) {
        total += b.duration;
        continue;
      }
      
      // Invited player only counts if they confirmed
      const playerEntry = b.players.find(p => p.id.toLowerCase() === uid);
      if (playerEntry && playerEntry.confirmed) {
        total += b.duration;
      }
    }
    return total;
  },

  // ── Get booking by token ──
  async getBookingByToken(token) {
    if (isFirebaseConfigured()) {
      try {
        const snapshot = await db.collection(Collections.BOOKINGS)
          .where('token', '==', token)
          .limit(1)
          .get();
        if (snapshot.empty) return null;
        return snapshot.docs[0].data();
      } catch { return null; }
    } else {
      this._loadLocalBookings();
      return this._demoBookings.find(b => b.token === token) || null;
    }
  },

  // ── Get booking by ID ──
  async getBookingById(bookingId) {
    if (isFirebaseConfigured()) {
      try {
        const doc = await db.collection(Collections.BOOKINGS).doc(bookingId).get();
        return doc.exists ? doc.data() : null;
      } catch { return null; }
    } else {
      this._loadLocalBookings();
      return this._demoBookings.find(b => b.bookingId === bookingId) || null;
    }
  },

  // ── Confirm player attendance ──
  async confirmPlayer(bookingId, playerId) {
    if (isFirebaseConfigured()) {
      try {
        const doc = await db.collection(Collections.BOOKINGS).doc(bookingId).get();
        if (!doc.exists) return false;
        
        const booking = doc.data();
        
        // CHECK QUOTA before confirming
        const user = AuthManager.getCurrentUser();
        const dailyLimit = AuthManager.getDailyLimit(user.role);
        const used = await this.getUsedHoursOnDate(playerId, booking.date);
        if (used + booking.duration > dailyLimit && dailyLimit !== Infinity) {
          throw new Error('لقد تجاوزت الحد اليومي. لا يمكنك تأكيد حضورك لهذا الحجز.');
        }
        
        const playerIdx = booking.players.findIndex(p => p.id.toLowerCase() === playerId.toLowerCase());
        if (playerIdx === -1) return false;
        
        booking.players[playerIdx].confirmed = true;
        
        // Check if all players are now confirmed
        const allConfirmed = booking.players.every(p => p.confirmed);
        const updates = { players: booking.players };
        
        if (allConfirmed) {
          // FINAL CHECK: Did someone else take this slot while we were confirming?
          const existing = await this.getFieldBookings(booking.fieldId, booking.date);
          const overlap = existing.some(ext => 
            ext.bookingId !== bookingId && 
            this._timesOverlap(booking.startTime, booking.endTime, ext.startTime, ext.endTime)
          );
          
          if (overlap) {
            throw new Error('عذراً، هذا الوقت تم حجزه وتأكيده من قبل مجموعة أخرى');
          }
          
          updates.status = 'active';
        }
        
        await db.collection(Collections.BOOKINGS).doc(bookingId).update(updates);
        return true;
      } catch { return false; }
    } else {
      this._loadLocalBookings();
      const booking = this._demoBookings.find(b => b.bookingId === bookingId);
      if (!booking) return false;
      
      const player = booking.players.find(p => p.id.toLowerCase() === playerId.toLowerCase());
      if (!player) return false;
      
      // CHECK QUOTA before confirming
      const dailyLimit = AuthManager.getDailyLimit('student'); // Default for demo
      const used = await this.getUsedHoursOnDate(playerId, booking.date);
      if (used + booking.duration > dailyLimit && dailyLimit !== Infinity) {
        throw new Error('لقد تجاوزت الحد اليومي. لا يمكنك تأكيد حضورك لهذا الحجز.');
      }
      
      player.confirmed = true;
      
      // Check if all players are now confirmed
      const allConfirmed = booking.players.every(p => p.confirmed);
      if (allConfirmed) {
        // FINAL CHECK: Overlap check for demo
        const existing = await this.getFieldBookings(booking.fieldId, booking.date);
        const overlap = existing.some(ext => 
          ext.bookingId !== bookingId && 
          this._timesOverlap(booking.startTime, booking.endTime, ext.startTime, ext.endTime)
        );
        
        if (overlap) {
          throw new Error('عذراً، هذا الوقت تم حجزه وتأكيده من قبل مجموعة أخرى');
        }
        
        booking.status = 'active';
      }
      
      Utils.saveLocal('bookings', this._demoBookings);
      return true;
    }
  },

  // ── Cancel Booking ──
  async cancelBooking(bookingId) {
    return { success: false, message: 'خاصية إلغاء الحجز غير متاحة حالياً' };
  },

  // ── Get all bookings (admin) ──
  async getAllBookings() {
    if (isFirebaseConfigured()) {
      try {
        const snapshot = await db.collection(Collections.BOOKINGS)
          .orderBy('createdAt', 'desc')
          .get();
        return snapshot.docs.map(doc => doc.data());
      } catch { return []; }
    } else {
      this._loadLocalBookings();
      return [...this._demoBookings].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
    }
  },

  // ── Get all public bookings with empty slots ──
  async getPublicBookings() {
    const today = Utils.today();
    if (isFirebaseConfigured()) {
      try {
        const snapshot = await db.collection(Collections.BOOKINGS)
          .where('date', '>=', today)
          .where('isPublic', '==', true)
          .get();
        
        return snapshot.docs
          .map(doc => doc.data())
          .filter(b => b.status !== 'cancelled' && b.players.length < b.maxPlayers);
      } catch(e) { return []; }
    } else {
      this._loadLocalBookings();
      return this._demoBookings.filter(b => 
        b.date >= today && b.isPublic && b.players.length < b.maxPlayers && b.status !== 'cancelled'
      );
    }
  },

  // ── Join a public booking ──
  async joinPublicBooking(bookingId, userId, userName) {
    const uid = userId.toLowerCase();
    
    if (isFirebaseConfigured()) {
      try {
        const docRef = db.collection(Collections.BOOKINGS).doc(bookingId);
        const doc = await docRef.get();
        if (!doc.exists) throw new Error('الحجز غير موجود');
        
        const b = doc.data();
        if (b.players.length >= b.maxPlayers) throw new Error('الحجز اكتمل بالفعل');
        if (b.players.some(p => p.id.toLowerCase() === uid)) throw new Error('أنت مشارك بالفعل في هذا الحجز');

        // Check Quota
        const role = await AuthManager.getUserRole(uid);
        const limit = AuthManager.getDailyLimit(role);
        const used = await this.getUsedHoursOnDate(uid, b.date);
        if (used + b.duration > limit && limit !== Infinity) {
          throw new Error('لا يمكنك الانضمام: لقد تجاوزت حدك اليومي لهذا التاريخ');
        }

        // Add player
        const newPlayers = [...b.players, { id: uid, name: userName, confirmed: true }];
        
        const updates = { players: newPlayers };
        // If now full, check if all confirmed (joining always confirms)
        if (newPlayers.length === b.maxPlayers && newPlayers.every(p => p.confirmed)) {
          // Final overlap check
          const existing = await this.getFieldBookings(b.fieldId, b.date);
          const overlap = existing.some(ext => ext.bookingId !== b.bookingId && this._timesOverlap(b.startTime, b.endTime, ext.startTime, ext.endTime));
          if (overlap) throw new Error('عذراً، هذا الموعد تم حجزه وتأكيده للتو من قبل فريق آخر');
          
          updates.status = 'active';
        }

        await docRef.update(updates);
        return true;
      } catch(e) { throw e; }
    } else {
      // Demo mode
      this._loadLocalBookings();
      const b = this._demoBookings.find(x => x.bookingId === bookingId);
      if (!b) throw new Error('الحجز غير موجود');
      b.players.push({ id: uid, name: userName, confirmed: true });
      if (b.players.length === b.maxPlayers) b.status = 'active';
      Utils.saveLocal('bookings', this._demoBookings);
      return true;
    }
  },

  // ── Load local bookings from localStorage ──
  _loadLocalBookings() {
    if (this._demoBookings.length === 0) {
      const saved = Utils.getLocal('bookings');
      if (saved) this._demoBookings = saved;
    }
  }
};

window.BookingEngine = BookingEngine;
