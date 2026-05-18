// exportController.js
import { exportRoomData, exportPersonalData } from '../services/exportService.js';

export const exportRoom = async (req, res) => {
  try {
    const { roomId }  = req.params;
    const { format }  = req.query; // 'json' | 'csv'
    const userId      = req.user.userId;
    const data        = await exportRoomData(roomId, userId, format || 'json');

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="room_${roomId}_expenses.csv"`);
      res.send(data.expenses + '\n\n--- PAYMENTS ---\n\n' + data.payments);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="room_${roomId}.json"`);
      res.json(data);
    }
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

export const exportMe = async (req, res) => {
  try {
    const { format } = req.query;
    const data       = await exportPersonalData(req.user.userId, format || 'json');

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename="my_expenses.csv"');
      res.send(data.expenses);
    } else {
      res.setHeader('Content-Disposition', 'attachment; filename="my_data.json"');
      res.json(data);
    }
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};
