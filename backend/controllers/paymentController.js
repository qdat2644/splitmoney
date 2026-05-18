// paymentController.js — HTTP handlers for payment ledger
import prisma from '../utils/db.js';
import { listPayments, createPayment, deletePayment } from '../services/paymentService.js';
import { invalidateProfileCache } from '../services/intelligence/personalFinanceProfileService.js';

export const getPayments = async (req, res) => {
  try {
    const { roomId } = req.params;
    const payments = await listPayments(roomId);
    res.json({ payments });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const addPayment = async (req, res) => {
  try {
    const { roomId } = req.params;
    const createdByUserId = req.user.userId;
    const payment = await createPayment(roomId, req.body, createdByUserId);
    if (payment.fromUserId) invalidateProfileCache(payment.fromUserId).catch(() => {});
    if (payment.toUserId) invalidateProfileCache(payment.toUserId).catch(() => {});
    res.status(201).json({ payment });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const removePayment = async (req, res) => {
  try {
    const { roomId, paymentId } = req.params;
    const requesterId   = req.user.userId;

    // Look up requester's role in this room
    const membership = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: requesterId } }
    });
    const requesterRole = membership?.role ?? 'member';

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    const result = await deletePayment(paymentId, roomId, requesterId, requesterRole);
    if (payment) {
      if (payment.fromUserId) invalidateProfileCache(payment.fromUserId).catch(() => {});
      if (payment.toUserId) invalidateProfileCache(payment.toUserId).catch(() => {});
    }
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};
