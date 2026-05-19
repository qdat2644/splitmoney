import {
  buildAdminOverview,
  buildAiObservability,
  buildImportObservability,
  buildSecurityVisibility,
  inspectAdminRoom,
  inspectAdminUser,
} from '../services/adminOperationsService.js';
import {
  suspendUser,
  reactivateUser,
  assignUserRole,
  archiveRoom,
  reopenRoom,
  recomputeAiProfile,
  listUsers,
  listRooms,
  buildTrendData,
} from '../services/adminMutationsService.js';
import { listAuditEntries } from '../services/auditTrailService.js';

// ── Read-Only Endpoints ──────────────────────────────────────────────────────

export const getAdminOverview = async (req, res) => {
  try {
    res.json(await buildAdminOverview());
  } catch (error) {
    res.status(500).json({ error: 'Không thể tải tổng quan vận hành.' });
  }
};

export const getAdminImports = async (req, res) => {
  try {
    res.json(await buildImportObservability());
  } catch (error) {
    res.status(500).json({ error: 'Không thể tải quan sát nhập dữ liệu.' });
  }
};

export const getAdminAi = async (req, res) => {
  try {
    res.json(await buildAiObservability());
  } catch (error) {
    res.status(500).json({ error: 'Không thể tải quan sát AI.' });
  }
};

export const getAdminSecurity = async (req, res) => {
  try {
    res.json(await buildSecurityVisibility());
  } catch (error) {
    res.status(500).json({ error: 'Không thể tải tín hiệu bảo mật.' });
  }
};

export const getAdminRoom = async (req, res) => {
  try {
    const room = await inspectAdminRoom(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Không tìm thấy phòng.' });
    res.json({ room });
  } catch (error) {
    res.status(500).json({ error: 'Không thể tải hồ sơ hỗ trợ phòng.' });
  }
};

export const getAdminUser = async (req, res) => {
  try {
    const user = await inspectAdminUser(req.params.userId);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Không thể tải hồ sơ hỗ trợ người dùng.' });
  }
};

// ── Listings ─────────────────────────────────────────────────────────────────

export const getAdminUsers = async (req, res) => {
  try {
    const { search, role, status, page } = req.query;
    res.json(await listUsers({ search, role, status, page: Number(page) || 1 }));
  } catch (error) {
    res.status(500).json({ error: 'Không thể tải danh sách người dùng.' });
  }
};

export const getAdminRooms = async (req, res) => {
  try {
    const { search, status, page } = req.query;
    res.json(await listRooms({ search, status, page: Number(page) || 1 }));
  } catch (error) {
    res.status(500).json({ error: 'Không thể tải danh sách phòng.' });
  }
};

export const getAdminTrends = async (req, res) => {
  try {
    res.json(await buildTrendData());
  } catch (error) {
    res.status(500).json({ error: 'Không thể tải dữ liệu xu hướng.' });
  }
};

export const getAdminAuditLog = async (req, res) => {
  try {
    const { actionType, targetType, limit } = req.query;
    res.json(await listAuditEntries({ actionType, targetType, limit: Number(limit) || 50 }));
  } catch (error) {
    res.status(500).json({ error: 'Không thể tải nhật ký kiểm toán.' });
  }
};

// ── Controlled Mutations ─────────────────────────────────────────────────────

export const postSuspendUser = async (req, res) => {
  try {
    const { userId, reason } = req.body;
    if (!userId) return res.status(400).json({ error: 'Thiếu userId.' });
    res.json(await suspendUser(req.admin.userId, userId, reason));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Thao tác thất bại.' });
  }
};

export const postReactivateUser = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Thiếu userId.' });
    res.json(await reactivateUser(req.admin.userId, userId));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Thao tác thất bại.' });
  }
};

export const postAssignRole = async (req, res) => {
  try {
    const { userId, role } = req.body;
    if (!userId || !role) return res.status(400).json({ error: 'Thiếu userId hoặc role.' });
    res.json(await assignUserRole(req.admin.userId, userId, role));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Thao tác thất bại.' });
  }
};

export const postArchiveRoom = async (req, res) => {
  try {
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: 'Thiếu roomId.' });
    res.json(await archiveRoom(req.admin.userId, roomId));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Thao tác thất bại.' });
  }
};

export const postReopenRoom = async (req, res) => {
  try {
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: 'Thiếu roomId.' });
    res.json(await reopenRoom(req.admin.userId, roomId));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Thao tác thất bại.' });
  }
};

export const postRecomputeAiProfile = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Thiếu userId.' });
    res.json(await recomputeAiProfile(req.admin.userId, userId));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Thao tác thất bại.' });
  }
};
