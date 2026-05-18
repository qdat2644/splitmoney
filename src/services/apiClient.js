const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = async (endpoint, { body, ...customConfig } = {}) => {
  const token = localStorage.getItem('spliteasy_token');
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    method: body ? 'POST' : 'GET',
    ...customConfig,
    headers: {
      ...headers,
      ...customConfig.headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);
  
  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error(`Lỗi kết nối tới máy chủ (${response.status})`);
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Yêu cầu không thành công.');
  }

  return data;
};

// API Services
export const authApi = {
  login: (data) => apiClient('/auth/login', { body: data }),
  register: (data) => apiClient('/auth/register', { body: data }),
  getMe: () => apiClient('/auth/me'),
  forgotPassword: (data) => apiClient('/auth/forgot-password', { body: data }),
  resetPassword: (data) => apiClient('/auth/reset-password', { body: data }),
  changePassword: (data) => apiClient('/auth/change-password', { method: 'POST', body: data }),
};

export const roomApi = {
  getRooms: () => apiClient('/rooms'),
  createRoom: (data) => apiClient('/rooms', { body: data }),
  joinRoom: (data) => apiClient('/rooms/join', { body: data }),
  getRoomGuestsByCode: (code) => apiClient(`/rooms/code/${code}/guests`),
  getRoom: (roomId) => apiClient(`/rooms/${roomId}`),
  getMembers: (roomId) => apiClient(`/rooms/${roomId}/members`),
  approveMember: (roomId, userId) => apiClient(`/rooms/${roomId}/approve`, { body: { userId } }),
  rejectMember: (roomId, userId) => apiClient(`/rooms/${roomId}/reject`, { body: { userId } }),
  removeMember: (roomId, userId) => apiClient(`/rooms/${roomId}/members/${userId}`, { method: 'DELETE' }),
};

export const expenseApi = {
  getExpenses: (roomId) => apiClient(`/rooms/${roomId}/expenses`),
  addExpense: (roomId, data) => apiClient(`/rooms/${roomId}/expenses`, { body: data }),
  updateExpense: (roomId, expenseId, data) => apiClient(`/rooms/${roomId}/expenses/${expenseId}`, { method: 'PUT', body: data }),
  deleteExpense: (roomId, expenseId) => apiClient(`/rooms/${roomId}/expenses/${expenseId}`, { method: 'DELETE' }),
};

export const guestApi = {
  getGuests: (roomId) => apiClient(`/rooms/${roomId}/guests`),
  createGuest: (roomId, data) => apiClient(`/rooms/${roomId}/guests`, { body: data }),
  updateGuest: (roomId, guestId, data) => apiClient(`/rooms/${roomId}/guests/${guestId}`, { method: 'PUT', body: data }),
  deleteGuest: (roomId, guestId) => apiClient(`/rooms/${roomId}/guests/${guestId}`, { method: 'DELETE' }),
};

export const aiParseApi = {
  parseExpense: (roomId, data) => apiClient(`/rooms/${roomId}/ai/parse-expense`, { body: data }),
};

export const userApi = {
  getPersonalSummary: () => apiClient('/users/me/summary'),
  getInsights: () => apiClient('/users/me/insights'),
  getAnalytics: () => apiClient('/users/me/analytics'),
  getCopilot: () => apiClient('/users/me/copilot'),
};

export const paymentApi = {
  getPayments:  (roomId)            => apiClient(`/rooms/${roomId}/payments`),
  addPayment:   (roomId, data)      => apiClient(`/rooms/${roomId}/payments`, { body: data }),
  deletePayment:(roomId, paymentId) => apiClient(`/rooms/${roomId}/payments/${paymentId}`, { method: 'DELETE' }),
};

export const budgetApi = {
  getBudgets:   ()          => apiClient('/budgets'),
  setBudget:    (data)      => apiClient('/budgets', { body: data }),
  deleteBudget: (id)        => apiClient(`/budgets/${id}`, { method: 'DELETE' }),
  getStatus:    (month, year) => apiClient(`/budgets/status?month=${month}&year=${year}`),
};

export const planApi = {
  getPlans:      ()                      => apiClient('/plans'),
  createPlan:    (data)                  => apiClient('/plans', { body: data }),
  updatePlan:    (planId, data)          => apiClient(`/plans/${planId}`, { method: 'PATCH', body: data }),
  updatePlanParticipants: (planId, data) => apiClient(`/plans/${planId}/participants`, { method: 'PATCH', body: data }),
  deletePlan:    (planId)               => apiClient(`/plans/${planId}`, { method: 'DELETE' }),
  addPlanExpense:(planId, data)          => apiClient(`/plans/${planId}/expenses`, { body: data }),
  updatePlanExpense: (planExpenseId, data) => apiClient(`/plans/expenses/${planExpenseId}`, { method: 'PATCH', body: data }),
  deletePlanExpense: (planExpenseId)    => apiClient(`/plans/expenses/${planExpenseId}`, { method: 'DELETE' }),
  convertExpense:(planExpenseId, data)  => apiClient(`/plans/expenses/${planExpenseId}/convert`, { body: data }),
  generateAIPlan: (data)                 => apiClient('/plans/ai/generate', { body: data }),
};

export const exportApi = {
  exportRoom: (roomId, format = 'json') => apiClient(`/export/rooms/${roomId}?format=${format}`),
  exportMe:   (format = 'json')         => apiClient(`/export/me?format=${format}`),
};
