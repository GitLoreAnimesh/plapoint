import api from './axiosInstance';
export const IMAGE_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');

export const authAPI = {
  register:      (d) => api.post('/auth/register', d),
  login:         (d) => api.post('/auth/login', d),
  logout:        ()  => api.post('/auth/logout'),
  refresh:       ()  => api.post('/auth/refresh'),
  me:            ()  => api.get('/auth/me'),
  updateProfile: (d) => api.put('/auth/profile', d),
};

export const groundAPI = {
  getAll:          (p)         => api.get('/grounds', { params: p }),
  getOne:          (id)        => api.get(`/grounds/${id}`),
  getAvailability: (id, date)  => api.get(`/grounds/${id}/availability`, { params: { date } }),
  create:          (d)         => api.post('/grounds', d, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update:          (id, d)     => api.put(`/grounds/${id}`, d, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateSlots:     (id, slots) => api.post(`/grounds/${id}/slots`, { slots }),
  removeImage:     (id, imageUrl) => api.delete(`/grounds/${id}/images`, { data: { imageUrl } }),
  delete:          (id)        => api.delete(`/grounds/${id}`),
};

export const bookingAPI = {
  create:  (d)          => api.post('/bookings', d),
  my:      (p)          => api.get('/bookings/my', { params: p }),
  getOne:  (id)         => api.get(`/bookings/${id}`),
  cancel:  (id, reason) => api.put(`/bookings/${id}/cancel`, { reason }),
  review:  (id, d)      => api.post(`/bookings/${id}/review`, d),
};

export const ownerAPI = {
  getDashboard:      ()        => api.get('/owner/dashboard'),
  getBookings:       (p)       => api.get('/owner/bookings', { params: p }),
  updateBooking:     (id, d)   => api.put(`/owner/bookings/${id}`, d),
  getGrounds:        ()        => api.get('/owner/grounds'),
  deleteGround:      (id)      => api.delete(`/owner/grounds/${id}`),
  setAdvancePayment: (gid, d)  => api.put(`/owner/grounds/${gid}/advance-payment`, d),
  getAnalytics:      ()        => api.get('/owner/analytics'),
};

export const adminAPI = {
  getStats:      ()       => api.get('/admin/stats'),
  getUsers:      (p)      => api.get('/admin/users', { params: p }),
  banUser:       (id, d)  => api.put(`/admin/users/${id}/ban`, d),
  getOwners:     (p)      => api.get('/admin/owners', { params: p }),
  approveOwner:  (id, d)  => api.put(`/admin/owners/${id}/approve`, d),
  getGrounds:    (p)      => api.get('/admin/grounds', { params: p }),
  approveGround: (id, d)  => api.put(`/admin/grounds/${id}/approve`, d),
  deleteGround:  (id)     => api.delete(`/admin/grounds/${id}`),
  getBookings:   (p)      => api.get('/admin/bookings', { params: p }),
  cancelBooking: (id, d)  => api.put(`/admin/bookings/${id}/cancel`, d),
};

export const notifAPI = {
  get:     () => api.get('/notifications'),
  readAll: () => api.put('/notifications/read-all'),
};

export const paymentAPI = {
  initiate:        (bookingId) => api.post('/payment/initiate', { bookingId }),
  initiateAdvance: (bookingId) => api.post('/payment/initiate-advance', { bookingId }),
  getStatus:       (bookingId) => api.get(`/payment/status/${bookingId}`),
};
