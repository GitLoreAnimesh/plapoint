import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { io } from 'socket.io-client';
import { setAccessToken, clearAccessToken } from '../services/axiosInstance';
import { authAPI } from '../services/api';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
let socketInstance = null;

const connectSocket = (userId, onNotification, onBookingUpdated) => {
  if (socketInstance?.connected) return;
  socketInstance = io(SOCKET_URL, { withCredentials: true, transports: ['websocket', 'polling'] });
  socketInstance.on('connect', () => { socketInstance.emit('join', userId); });
  socketInstance.on('notification',   (notif)   => { if (onNotification)    onNotification(notif); });
  socketInstance.on('bookingUpdated', (payload) => { if (onBookingUpdated)  onBookingUpdated(payload); });
};

const disconnectSocket = () => {
  if (socketInstance) { socketInstance.disconnect(); socketInstance = null; }
};

// Allow components to subscribe/unsubscribe to socket events directly.
// This is safer than re-initialising the socket per component mount.
export const subscribeToBookingUpdates = (handler) => {
  if (!socketInstance) return () => {};
  socketInstance.on('bookingUpdated', handler);
  return () => socketInstance.off('bookingUpdated', handler);
};

const useAuth = create(
  persist(
    (set, get) => ({
      user:          null,
      initialised:   false,
      notifications: [],
      unreadCount:   0,

      setSession: (user, accessToken) => {
        setAccessToken(accessToken);
        set({ user, initialised: true });
        connectSocket(
          user._id,
          (notif) => {
            set(state => ({
              notifications: [notif, ...state.notifications].slice(0, 30),
              unreadCount:   state.unreadCount + 1,
            }));
          },
          // bookingUpdated global handler — components subscribe directly via subscribeToBookingUpdates
          null
        );
      },

      clearSession: async () => {
        try { await authAPI.logout(); } catch {}
        clearAccessToken();
        disconnectSocket();
        set({ user: null, initialised: true, notifications: [], unreadCount: 0 });
      },

      bootstrap: async () => {
        if (get().initialised) return;
        try {
          const { data } = await authAPI.refresh();
          setAccessToken(data.accessToken);
          const me = await authAPI.me();
          const user = me.data.user;
          set({ user, initialised: true });
          connectSocket(
            user._id,
            (notif) => {
              set(state => ({
                notifications: [notif, ...state.notifications].slice(0, 30),
                unreadCount:   state.unreadCount + 1,
              }));
            },
            null
          );
        } catch {
          clearAccessToken();
          set({ user: null, initialised: true });
        }
      },

      markNotificationsRead: () => set({ unreadCount: 0 }),
      setNotifications: (notifications) => set({ notifications }),
    }),
    {
      name:       'pp-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

window.addEventListener('auth:logout', () => {
  useAuth.getState().clearSession();
});

export default useAuth;
