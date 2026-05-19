import prisma from '../utils/db.js';
import { listOperationalEvents } from './operationalEventService.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function buildAdminOverview(db = prisma) {
  const now = new Date();
  const today = startOfDay(now);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
  const { month, year } = monthYear(now);

  const [
    totalUsers,
    activeRooms,
    expensesCreatedToday,
    settlementActivityToday,
    activeBudgets,
    pendingMemberships,
    unresolvedGuests,
    profiles,
    todayEvents,
    recentAnomalies,
  ] = await Promise.all([
    safeCount(() => db.user.count()),
    safeCount(() => db.room.count({
      where: {
        OR: [
          { expenses: { some: { createdAt: { gte: thirtyDaysAgo } } } },
          { payments: { some: { createdAt: { gte: thirtyDaysAgo } } } },
        ],
      },
    })),
    safeCount(() => db.expense.count({ where: { createdAt: { gte: today } } })),
    safeCount(() => db.payment.count({ where: { createdAt: { gte: today } } })),
    safeCount(() => db.budget.count({ where: { month, year } })),
    safeCount(() => db.roomMember.count({ where: { status: 'pending' } })),
    safeCount(() => db.guestMember.count({ where: { status: 'active', claimedByUserId: null } })),
    safeFindMany(() => db.financialProfile.findMany({ select: { profileData: true } })),
    listOperationalEvents({ where: { createdAt: { gte: today } }, take: 300 }, db),
    listOperationalEvents({
      where: { severity: { in: ['warning', 'error'] }, createdAt: { gte: thirtyDaysAgo } },
      take: 8,
    }, db),
  ]);

  const importEvents = todayEvents.filter((event) => event.source === 'import');
  const parserEvents = todayEvents.filter((event) => event.type === 'ai.parser');
  const failedAuthAttempts = todayEvents.filter((event) => event.type === 'security.auth_failed').length;
  const rateLimitHits = todayEvents.filter((event) => event.type === 'security.rate_limit_hit').length;
  const parserSuccessRate = successRate(parserEvents);
  const importWarningRate = warningRate(importEvents);
  const temporalProfiles = summarizeTemporalProfiles(profiles);

  return {
    generatedAt: now.toISOString(),
    narrative: buildNarrative({
      importWarningRate,
      parserSuccessRate,
      failedAuthAttempts,
      rateLimitHits,
      recentAnomalies,
      temporalProfiles,
    }),
    metrics: {
      totalUsers,
      activeRooms,
      expensesCreatedToday,
      importsToday: importEvents.length,
      aiParsesToday: parserEvents.length,
      parserSuccessRate,
      importWarningRate,
      settlementActivityToday,
      activeBudgets,
      failedAuthAttempts,
      rateLimitHits,
      pendingMemberships,
      unresolvedGuests,
      temporalProfilesAvailable: temporalProfiles.available,
      lowConfidenceTemporalProfiles: temporalProfiles.lowConfidence,
    },
    sections: {
      systemHealth: [
        metric('Người dùng', totalUsers, 'Tổng tài khoản đang có trong hệ thống.'),
        metric('Phòng hoạt động', activeRooms, 'Có chi phí hoặc thanh toán trong 30 ngày gần đây.'),
        metric('Ngân sách đang theo dõi', activeBudgets, 'Ngân sách của tháng hiện tại.'),
      ],
      aiActivity: [
        metric('Lượt phân tích AI hôm nay', parserEvents.length, 'Số lần dùng parser chi phí.'),
        metric('Tỷ lệ parser thành công', formatPercent(parserSuccessRate), 'Tính từ sự kiện parser đã ghi nhận.'),
        metric('Hồ sơ thời gian sẵn sàng', temporalProfiles.available, 'Hồ sơ AI có temporal memory.'),
      ],
      importActivity: [
        metric('Lượt nhập hôm nay', importEvents.length, 'Preview và commit import đã ghi nhận.'),
        metric('Tỷ lệ cảnh báo import', formatPercent(importWarningRate), 'Dựa trên số dòng cảnh báo trong preview.'),
        metric('Khách chưa gắn người dùng', unresolvedGuests, 'Guest active chưa được claim.'),
      ],
      roomActivity: [
        metric('Chi phí tạo hôm nay', expensesCreatedToday, 'Dựa trên thời điểm tạo bản ghi.'),
        metric('Thanh toán hôm nay', settlementActivityToday, 'Dựa trên bản ghi payment đã tạo.'),
        metric('Yêu cầu chờ duyệt', pendingMemberships, 'Room membership đang pending.'),
      ],
      securitySignals: [
        metric('Đăng nhập lỗi hôm nay', failedAuthAttempts, 'Từ event xác thực thất bại.'),
        metric('Rate-limit hôm nay', rateLimitHits, 'Từ middleware giới hạn tần suất.'),
        metric('Bất thường gần đây', recentAnomalies.length, 'Warning/error trong 30 ngày gần đây.'),
      ],
    },
    recentAnomalies: recentAnomalies.map(formatEventForAdmin),
  };
}

export async function buildImportObservability(db = prisma) {
  const today = startOfDay(new Date());
  const events = await listOperationalEvents({ where: { source: 'import' }, take: 80 }, db);
  const todayEvents = events.filter((event) => new Date(event.createdAt) >= today);
  const previewEvents = events.filter((event) => event.type === 'import.preview');
  const failed = events.filter((event) => event.severity === 'error');
  const warningHeavy = previewEvents.filter((event) => Number(event.metadata.warningRows || 0) >= 3);
  const unresolvedMappings = previewEvents.reduce((sum, event) => sum + Number(event.metadata.unresolvedMappings || 0), 0);
  const totalRows = previewEvents.reduce((sum, event) => sum + Number(event.metadata.totalRows || 0), 0);
  const warningRows = previewEvents.reduce((sum, event) => sum + Number(event.metadata.warningRows || 0), 0);

  return {
    metrics: {
      importsToday: todayEvents.length,
      failedImports: failed.length,
      warningHeavyImports: warningHeavy.length,
      unresolvedMappings,
      totalRows,
      warningRate: totalRows ? Number((warningRows / totalRows).toFixed(3)) : 0,
      averageConfidence: average(previewEvents.map((event) => event.metadata.averageConfidence).filter(isFiniteNumber)),
    },
    recentImports: events.slice(0, 20).map(formatEventForAdmin),
    warningHeavyImports: warningHeavy.slice(0, 10).map(formatEventForAdmin),
    failedImports: failed.slice(0, 10).map(formatEventForAdmin),
  };
}

export async function buildAiObservability(db = prisma) {
  const events = await listOperationalEvents({ where: { source: 'ai' }, take: 120 }, db);
  const parserEvents = events.filter((event) => event.type === 'ai.parser');
  const recommendationEvents = events.filter((event) => ['ai.insights', 'ai.copilot', 'ai.plan_generation'].includes(event.type));
  const fallbackEvents = events.filter((event) => event.metadata.isFallback === true || event.metadata.fallback === true);
  const profiles = await safeFindMany(() => db.financialProfile.findMany({
    select: { userId: true, lastComputedAt: true, profileData: true },
  }));
  const temporalProfiles = summarizeTemporalProfiles(profiles);

  return {
    metrics: {
      parserUsage: parserEvents.length,
      parserFailureRate: failureRate(parserEvents),
      fallbackUsage: fallbackEvents.length,
      recommendationGenerationVolume: recommendationEvents.length,
      aiFeatureAdoption: uniqueCount(events.map((event) => event.userId).filter(Boolean)),
      temporalProfilesAvailable: temporalProfiles.available,
      lowConfidenceTemporalProfiles: temporalProfiles.lowConfidence,
    },
    recentActivity: events.slice(0, 25).map(formatEventForAdmin),
    profileHealth: temporalProfiles,
  };
}

export async function buildSecurityVisibility(db = prisma) {
  const events = await listOperationalEvents({
    where: { source: { in: ['security', 'auth'] } },
    take: 120,
  }, db);
  const failedAuth = events.filter((event) => event.type === 'security.auth_failed');
  const deniedRoomMutations = events.filter((event) => event.type === 'security.room_access_denied');
  const rateLimitHits = events.filter((event) => event.type === 'security.rate_limit_hit');
  const suspiciousImportFailures = events.filter((event) => event.type === 'security.suspicious_import_failure');
  const guestClaimConflicts = events.filter((event) => event.type === 'security.guest_claim_conflict');

  return {
    metrics: {
      failedAuthAttempts: failedAuth.length,
      deniedCrossRoomMutations: deniedRoomMutations.length,
      rateLimitHits: rateLimitHits.length,
      suspiciousImportFailures: suspiciousImportFailures.length,
      guestClaimConflicts: guestClaimConflicts.length,
    },
    signals: events.slice(0, 40).map(formatEventForAdmin),
  };
}

export async function inspectAdminRoom(roomId, db = prisma) {
  const room = await db.room.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      name: true,
      code: true,
      createdAt: true,
      updatedAt: true,
      members: {
        select: {
          userId: true,
          role: true,
          status: true,
          createdAt: true,
          user: { select: { id: true, name: true } },
        },
      },
      guestMembers: {
        where: { status: { not: 'removed' } },
        select: { id: true, displayName: true, status: true, claimedByUserId: true, createdAt: true },
      },
      _count: { select: { expenses: true, payments: true, budgets: true, plans: true } },
    },
  });

  if (!room) return null;

  const userIds = room.members.map((member) => member.userId);
  const [events, profiles] = await Promise.all([
    listOperationalEvents({ where: { roomId }, take: 30 }, db),
    safeFindMany(() => db.financialProfile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, profileData: true, lastComputedAt: true },
    })),
  ]);

  return {
    id: room.id,
    name: room.name,
    code: maskRoomCode(room.code),
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    counts: {
      members: room.members.length,
      guests: room.guestMembers.length,
      unresolvedGuests: room.guestMembers.filter((guest) => guest.status === 'active' && !guest.claimedByUserId).length,
      expenses: room._count.expenses,
      payments: room._count.payments,
      budgets: room._count.budgets,
      plans: room._count.plans,
    },
    members: room.members.map((member) => ({
      userId: member.userId,
      name: member.user?.name,
      role: member.role,
      status: member.status,
      createdAt: member.createdAt,
    })),
    guests: room.guestMembers.map((guest) => ({
      id: guest.id,
      displayName: guest.displayName,
      status: guest.status,
      claimed: Boolean(guest.claimedByUserId),
      createdAt: guest.createdAt,
    })),
    importHistory: events.filter((event) => event.source === 'import').map(formatEventForAdmin),
    aiProfileStatus: summarizeTemporalProfiles(profiles),
    temporalMemoryAvailable: profiles.some((profile) => Boolean(parseProfile(profile.profileData)?.temporalMemory)),
    recentSignals: events.map(formatEventForAdmin),
  };
}

export async function inspectAdminUser(userId, db = prisma) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      financialProfile: { select: { profileData: true, lastComputedAt: true } },
      roomMemberships: {
        select: {
          roomId: true,
          role: true,
          status: true,
          room: { select: { id: true, name: true } },
        },
      },
      _count: { select: { expensesCreated: true, paymentsCreated: true, budgets: true, plansCreated: true } },
    },
  });

  if (!user) return null;

  const events = await listOperationalEvents({ where: { userId }, take: 30 }, db);
  const profile = parseProfile(user.financialProfile?.profileData);

  return {
    id: user.id,
    name: user.name,
    email: maskEmail(user.email),
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    counts: {
      rooms: user.roomMemberships.length,
      expensesCreated: user._count.expensesCreated,
      paymentsCreated: user._count.paymentsCreated,
      budgets: user._count.budgets,
      plansCreated: user._count.plansCreated,
    },
    rooms: user.roomMemberships.map((membership) => ({
      roomId: membership.roomId,
      roomName: membership.room?.name,
      role: membership.role,
      status: membership.status,
    })),
    aiProfileStatus: {
      hasProfile: Boolean(user.financialProfile),
      lastComputedAt: user.financialProfile?.lastComputedAt || null,
      temporalMemoryAvailable: Boolean(profile?.temporalMemory),
      temporalConfidence: profile?.temporalMemory?.recentTrendSummary?.confidence ?? null,
    },
    recentSignals: events.map(formatEventForAdmin),
  };
}

function buildNarrative({ importWarningRate, parserSuccessRate, failedAuthAttempts, rateLimitHits, recentAnomalies, temporalProfiles }) {
  const importMessage = importWarningRate <= 0.2
    ? 'Tỷ lệ nhập dữ liệu đang ổn định.'
    : 'Một số phiên nhập dữ liệu cần được rà soát thêm.';
  const aiMessage = temporalProfiles.available >= temporalProfiles.lowConfidence
    ? 'Phần lớn hồ sơ AI đã có đủ dữ liệu vận hành.'
    : 'Một phần hồ sơ AI còn thiếu dữ liệu theo thời gian.';
  const securityMessage = failedAuthAttempts === 0 && rateLimitHits === 0 && recentAnomalies.length === 0
    ? 'Không phát hiện bất thường lớn gần đây.'
    : 'Có tín hiệu vận hành cần theo dõi trong nhật ký gần đây.';
  const parserMessage = parserSuccessRate >= 0.8
    ? 'Parser AI đang xử lý ổn định.'
    : 'Parser AI có dấu hiệu cần theo dõi thêm.';

  return [importMessage, aiMessage, parserMessage, securityMessage];
}

function summarizeTemporalProfiles(profiles) {
  let available = 0;
  let lowConfidence = 0;

  profiles.forEach((record) => {
    const profile = parseProfile(record.profileData);
    const temporal = profile?.temporalMemory;
    if (temporal) available += 1;
    const confidence = temporal?.recentTrendSummary?.confidence ?? 0;
    if (!temporal || confidence < 0.45) lowConfidence += 1;
  });

  return {
    total: profiles.length,
    available,
    lowConfidence,
  };
}

function formatEventForAdmin(event) {
  return {
    id: event.id,
    type: event.type,
    source: event.source,
    severity: event.severity,
    roomId: event.roomId,
    userId: event.userId,
    createdAt: event.createdAt,
    metadata: event.metadata,
  };
}

function parseProfile(profileData) {
  if (!profileData) return null;
  try {
    return JSON.parse(profileData);
  } catch {
    return null;
  }
}

function metric(label, value, help) {
  return { label, value, help };
}

function successRate(events) {
  if (!events.length) return 0;
  const successes = events.filter((event) => event.severity !== 'error' && event.metadata.valid !== false).length;
  return Number((successes / events.length).toFixed(3));
}

function failureRate(events) {
  if (!events.length) return 0;
  const failures = events.filter((event) => event.severity === 'error' || event.metadata.valid === false).length;
  return Number((failures / events.length).toFixed(3));
}

function warningRate(events) {
  const previewEvents = events.filter((event) => event.type === 'import.preview');
  const totals = previewEvents.reduce((acc, event) => ({
    rows: acc.rows + Number(event.metadata.totalRows || 0),
    warnings: acc.warnings + Number(event.metadata.warningRows || 0),
  }), { rows: 0, warnings: 0 });

  if (!totals.rows) return 0;
  return Number((totals.warnings / totals.rows).toFixed(3));
}

function average(values) {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3));
}

function isFiniteNumber(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

function uniqueCount(values) {
  return new Set(values).size;
}

async function safeCount(factory) {
  try {
    return await factory();
  } catch {
    return 0;
  }
}

async function safeFindMany(factory) {
  try {
    return await factory();
  } catch {
    return [];
  }
}

function startOfDay(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function monthYear(date) {
  return { month: date.getMonth() + 1, year: date.getFullYear() };
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return null;
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
}

function maskRoomCode(code) {
  if (!code) return null;
  return `${code.slice(0, 2)}***`;
}
