import {
  buildAdminOverview,
  buildAiObservability,
  buildImportObservability,
  buildSecurityVisibility,
  inspectAdminRoom,
  inspectAdminUser,
} from '../services/adminOperationsService.js';

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
