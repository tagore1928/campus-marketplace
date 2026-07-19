import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import axios from 'axios';

// API root endpoint configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
axios.defaults.baseURL = API_BASE_URL;
const API_URL = '/api';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  college: string;
  isCustomCollege: boolean;
  role: string;
  thumbsUp: number;
  thumbsDown: number;
  anonymousMode: boolean;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, college: string, isCustomCollege: boolean) => Promise<void>;
  loginWithGoogle: (college?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateAnonymousMode: (enabled: boolean) => Promise<void>;
  updateProfileDetails: (name: string, college: string, isCustomCollege: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync token header for Axios
  const syncAxiosToken = (authToken: string | null) => {
    if (authToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  // Sync profile details from Express Backend
  const syncProfileData = async (firebaseUser: FirebaseUser, authToken: string, collegeDetail?: { college: string, isCustomCollege: boolean }) => {
    try {
      syncAxiosToken(authToken);

      // Attempt to load profile
      try {
        const response = await axios.get(`${API_URL}/auth/profile`);
        setProfile(response.data);
      } catch (err: any) {
        if (err.response && err.response.status === 404) {
          // If profile doesn't exist, create it (onboard user)
          const name = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
          const defaultCollege = collegeDetail?.college || 'IIT Bombay';
          const isCustom = collegeDetail?.isCustomCollege || false;

          const registerResponse = await axios.post(`${API_URL}/auth/profile`, {
            college: defaultCollege,
            isCustomCollege: isCustom
          });
          setProfile(registerResponse.data);
        } else {
          throw err;
        }
      }
    } catch (error) {
      console.error('Failed to sync user profile with backend:', error);
    }
  };

  // Monitor Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        // Enforce email verification (except for admin account)
        if (!currentUser.emailVerified && currentUser.email !== 'campusmarketadmin@gmail.com') {
          setUser(null);
          setProfile(null);
          setToken(null);
          syncAxiosToken(null);
          setLoading(false);
          return;
        }
        try {
          setUser(currentUser);
          const currentToken = await currentUser.getIdToken();
          setToken(currentToken);
          await syncProfileData(currentUser, currentToken);
        } catch (err) {
          console.error('Error fetching token on auth state change:', err);
        }
      } else {
        setUser(null);
        setProfile(null);
        setToken(null);
        syncAxiosToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Email / Password Login
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Enforce email verification check
      if (!userCredential.user.emailVerified && userCredential.user.email !== 'campusmarketadmin@gmail.com') {
        await signOut(auth);
        throw new Error('Your email address is not verified yet. Please check your inbox and verify your email before logging in.');
      }

      const currentToken = await userCredential.user.getIdToken();
      setToken(currentToken);
      await syncProfileData(userCredential.user, currentToken);
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Email / Password Registration (checks domain before firing Firebase Auth)
  const register = async (email: string, password: string, name: string, college: string, isCustomCollege: boolean) => {
    setLoading(true);
    
    // Explicit domain checks
    if (!email.toLowerCase().endsWith('.edu.in') && email.toLowerCase() !== 'campusmarketadmin@gmail.com') {
      setLoading(false);
      throw new Error('Registration is restricted. You must register with an email address ending in .edu.in.');
    }

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update displayName
      await updateProfile(userCredential.user, { displayName: name });
      
      // Send verification email
      await sendEmailVerification(userCredential.user);
      
      const currentToken = await userCredential.user.getIdToken();
      
      // Send onboarding details to Express database
      await syncProfileData(userCredential.user, currentToken, { college, isCustomCollege });
      
      // Sign out immediately so that the user is not automatically logged in
      await signOut(auth);
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Failed to complete registration.');
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Onboarding
  const loginWithGoogle = async (college?: string) => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const currentToken = await result.user.getIdToken();
      setToken(currentToken);
      
      // Onboard via google credentials
      await syncProfileData(result.user, currentToken, college ? { college, isCustomCollege: false } : undefined);
    } catch (error: any) {
      console.error('Google Auth Error:', error);
      throw new Error(error.message || 'Failed to authenticate via Google.');
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
      setToken(null);
      syncAxiosToken(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle privacy mode
  const updateAnonymousMode = async (enabled: boolean) => {
    if (!token) return;
    try {
      const response = await axios.patch(`${API_URL}/auth/profile/anonymous`, {
        anonymousMode: enabled
      });
      if (response.data.success && profile) {
        setProfile({ ...profile, anonymousMode: enabled });
      }
    } catch (error) {
      console.error('Error changing anonymous mode settings:', error);
    }
  };

  // Update profile details (Name, College, etc.)
  const updateProfileDetails = async (name: string, college: string, isCustomCollege: boolean) => {
    if (!token) return;
    try {
      const response = await axios.post(`${API_URL}/auth/profile`, {
        name,
        college,
        isCustomCollege
      });
      setProfile(response.data);
    } catch (error) {
      console.error('Error updating profile details:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, token, loading, login, register, loginWithGoogle, logout, updateAnonymousMode, updateProfileDetails }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
