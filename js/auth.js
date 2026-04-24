/* ============================================================
   Authentication & Role Management
   ============================================================ */

const AuthManager = {
  // ── Demo users database (used when Firebase is not configured) ──
  _demoUsers: {
    'ah2041': {
      uid: 'ah2041',
      name: 'أحمد حسين',
      email: 'ah2041@iu.edu.jo',
      password: 'VERTEBRA@80',
      role: 'vip',
      isActive: true
    },
    'admin01': {
      uid: 'admin01',
      name: 'مدير النظام',
      email: 'admin@iu.edu.jo',
      password: 'Admin@2025',
      role: 'admin',
      isActive: true
    },
    'coach01': {
      uid: 'coach01',
      name: 'المدرب أحمد',
      email: 'coach01@iu.edu.jo',
      password: 'Coach@2025',
      role: 'coach',
      isActive: true
    },
    'tp1001': {
      uid: 'tp1001',
      name: 'خالد المعاني',
      email: 'tp1001@iu.edu.jo',
      password: 'Player@2025',
      role: 'tournament',
      isActive: true
    },
    'st2001': {
      uid: 'st2001',
      name: 'سامي العبادي',
      email: 'st2001@iu.edu.jo',
      password: 'Student@2025',
      role: 'student',
      isActive: true
    },
    'st2002': {
      uid: 'st2002',
      name: 'يوسف الحمد',
      email: 'st2002@iu.edu.jo',
      password: 'Student@2025',
      role: 'student',
      isActive: true
    },
    'st2003': {
      uid: 'st2003',
      name: 'محمد الراشد',
      email: 'st2003@iu.edu.jo',
      password: 'Student@2025',
      role: 'student',
      isActive: true
    },
    'st2004': {
      uid: 'st2004',
      name: 'عمر خليل',
      email: 'st2004@iu.edu.jo',
      password: 'Student@2025',
      role: 'student',
      isActive: true
    },
    'st2005': {
      uid: 'st2005',
      name: 'فارس النابلسي',
      email: 'st2005@iu.edu.jo',
      password: 'Student@2025',
      role: 'student',
      isActive: true
    },
    'st2006': {
      uid: 'st2006',
      name: 'كريم الزعبي',
      email: 'st2006@iu.edu.jo',
      password: 'Student@2025',
      role: 'student',
      isActive: true
    },
    'st2007': {
      uid: 'st2007',
      name: 'ناصر العجلوني',
      email: 'st2007@iu.edu.jo',
      password: 'Student@2025',
      role: 'student',
      isActive: true
    },
    'st2008': {
      uid: 'st2008',
      name: 'بلال محمود',
      email: 'st2008@iu.edu.jo',
      password: 'Student@2025',
      role: 'student',
      isActive: true
    },
    'st2009': {
      uid: 'st2009',
      name: 'رامي حسن',
      email: 'st2009@iu.edu.jo',
      password: 'Student@2025',
      role: 'student',
      isActive: true
    },
    'st2010': {
      uid: 'st2010',
      name: 'طارق سعيد',
      email: 'st2010@iu.edu.jo',
      password: 'Student@2025',
      role: 'student',
      isActive: true
    }
  },

  // ── Login ──
  async login(studentId, password) {
    const id = studentId.toLowerCase().trim();
    
    if (isFirebaseConfigured()) {
      try {
        // Firebase auth
        const userDoc = await db.collection(Collections.USERS).doc(id).get();
        if (!userDoc.exists) {
          return { success: false, message: 'رقم الطالب غير مسجل في النظام' };
        }
        
        const userData = userDoc.data();
        
        // Verify password (plain text comparison)
        if (userData.password !== password) {
          return { success: false, message: 'كلمة المرور غير صحيحة' };
        }
        
        if (!userData.isActive) {
          return { success: false, message: 'الحساب معطل. تواصل مع إدارة النظام' };
        }
        
        const token = Utils.generateToken();
        return {
          success: true,
          user: {
            uid: id,
            name: userData.name,
            email: userData.email,
            role: userData.role
          },
          token
        };
      } catch (error) {
        console.error('Firebase login error:', error);
        return { success: false, message: 'خطأ في الاتصال بقاعدة البيانات' };
      }
    } else {
      // Demo mode
      const user = this._demoUsers[id];
      if (!user) {
        return { success: false, message: 'رقم الطالب غير مسجل في النظام' };
      }
      if (user.password !== password) {
        return { success: false, message: 'كلمة المرور غير صحيحة' };
      }
      if (!user.isActive) {
        return { success: false, message: 'الحساب معطل. تواصل مع إدارة النظام' };
      }
      
      const token = Utils.generateToken();
      return {
        success: true,
        user: {
          uid: user.uid,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token
      };
    }
  },

  // ── Get Current User ──
  getCurrentUser() {
    const stored = sessionStorage.getItem('iu_user');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch { return null; }
  },

  // ── Logout ──
  logout() {
    sessionStorage.removeItem('iu_user');
    sessionStorage.removeItem('iu_token');
    if (isFirebaseConfigured()) {
      auth.signOut().catch(() => {});
    }
  },

  // ── Check if user has required role ──
  hasRole(requiredRoles) {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (typeof requiredRoles === 'string') requiredRoles = [requiredRoles];
    return requiredRoles.includes(user.role);
  },

  // ── Require auth (redirect if not logged in) ──
  requireAuth(allowedRoles = null) {
    const user = this.getCurrentUser();
    if (!user) {
      window.location.href = 'index.html';
      return null;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      window.location.href = 'dashboard.html';
      return null;
    }
    return user;
  },

  // ── Get user info by ID ──
  async getUserById(userId) {
    const id = userId.toLowerCase().trim();
    
    if (isFirebaseConfigured()) {
      try {
        const doc = await db.collection(Collections.USERS).doc(id).get();
        if (doc.exists) {
          const data = doc.data();
          return { uid: id, name: data.name, email: data.email, role: data.role };
        }
        return null;
      } catch { return null; }
    } else {
      const user = this._demoUsers[id];
      if (user) {
        return { uid: user.uid, name: user.name, email: user.email, role: user.role };
      }
      return null;
    }
  },

  // ── Get all users (admin) ──
  async getAllUsers() {
    if (isFirebaseConfigured()) {
      try {
        const snapshot = await db.collection(Collections.USERS).get();
        return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      } catch { return []; }
    } else {
      return Object.values(this._demoUsers).map(u => ({
        uid: u.uid, name: u.name, email: u.email, role: u.role, isActive: u.isActive
      }));
    }
  },

  // ── Update user role (admin) ──
  async updateUserRole(userId, newRole) {
    if (isFirebaseConfigured()) {
      try {
        await db.collection(Collections.USERS).doc(userId).update({ role: newRole });
        return true;
      } catch { return false; }
    } else {
      if (this._demoUsers[userId]) {
        this._demoUsers[userId].role = newRole;
        return true;
      }
      return false;
    }
  },

  // ── Role display names ──
  getRoleName(role) {
    const names = {
      admin: 'مدير النظام',
      vip: 'VIP',
      tournament: 'لاعب بطولات',
      student: 'طالب',
      coach: 'مدرب'
    };
    return names[role] || role;
  },

  // ── Role badge class ──
  getRoleBadge(role) {
    const badges = {
      admin: 'badge-danger',
      vip: 'badge-brand',
      tournament: 'badge-warning',
      student: 'badge-info',
      coach: 'badge-success'
    };
    return badges[role] || 'badge-info';
  },

  // ── Get daily hour limit ──
  getDailyLimit(role) {
    switch (role) {
      case 'vip': 
      case 'admin': 
        return Infinity;
      case 'tournament': 
        return 3;
      case 'student': 
      default: 
        return 1;
    }
  }
};

window.AuthManager = AuthManager;
