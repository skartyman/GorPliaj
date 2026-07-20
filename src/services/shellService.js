const prisma = require('../lib/prisma');

const BONUS_AMOUNTS = {
  REGISTRATION: 50,
  TICKET_PURCHASE: 10,
  MENU_ORDER: 15
};

async function getBalance(guestId) {
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    select: { shellBalance: true }
  });
  return guest ? Number(guest.shellBalance) : 0;
}

async function getHistory(guestId, { page = 1, limit = 20 } = {}) {
  const skip = (Math.max(1, page) - 1) * limit;
  const [transactions, total] = await Promise.all([
    prisma.shellTransaction.findMany({
      where: { guestId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.shellTransaction.count({ where: { guestId } })
  ]);

  return {
    transactions: transactions.map(t => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      balanceAfter: Number(t.balanceAfter),
      source: t.source,
      description: t.description,
      referenceId: t.referenceId,
      createdAt: t.createdAt.toISOString()
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}

async function createTransaction(guestId, { type, amount, source, description, referenceId, idempotencyKey }) {
  if (idempotencyKey) {
    const existing = await prisma.shellTransaction.findUnique({ where: { idempotencyKey } });
    if (existing) return { balance: Number(existing.balanceAfter), transaction: existing, duplicate: true };
  }
  try {
    return await prisma.$transaction(async (tx) => {
      const guest = await tx.guest.findUnique({
        where: { id: guestId },
        select: { shellBalance: true }
      });
      if (!guest) throw new Error('GUEST_NOT_FOUND');

      const currentBalance = Number(guest.shellBalance);
      const newBalance = type === 'SPEND' ? currentBalance - amount : currentBalance + amount;
      if (newBalance < 0) throw new Error('INSUFFICIENT_BALANCE');

      const transaction = await tx.shellTransaction.create({
        data: {
          guestId,
          type,
          amount,
          balanceAfter: newBalance,
          source,
          description: description || null,
          referenceId: referenceId || null,
          idempotencyKey: idempotencyKey || null
        }
      });
      await tx.guest.update({ where: { id: guestId }, data: { shellBalance: newBalance } });
      return { balance: newBalance, transaction };
    }, { isolationLevel: 'Serializable' });
  } catch (error) {
    if (idempotencyKey && error?.code === 'P2002') {
      const existing = await prisma.shellTransaction.findUnique({ where: { idempotencyKey } });
      if (existing) return { balance: Number(existing.balanceAfter), transaction: existing, duplicate: true };
    }
    throw error;
  }
}

async function earnShells(guestId, source, { description, referenceId } = {}) {
  const amount = BONUS_AMOUNTS[source];
  if (!amount) throw new Error(`Unknown earn source: ${source}`);
  return createTransaction(guestId, { type: 'EARN', amount, source, description, referenceId });
}

async function spendShells(guestId, amount, source, { description, referenceId } = {}) {
  return createTransaction(guestId, { type: 'SPEND', amount, source, description, referenceId });
}

async function creditTopup(guestId, amount, paymentId) {
  const existing = await prisma.shellTransaction.findFirst({
    where: { guestId, source: 'TOPUP', referenceId: paymentId }
  });
  if (existing) return existing;
  return createTransaction(guestId, {
    type: 'TOPUP',
    amount,
    source: 'TOPUP',
    description: `Поповнення: ${amount} ₴`,
    referenceId: paymentId,
    idempotencyKey: `TOPUP:${guestId}:${paymentId}`
  });
}

async function grantRegistrationBonus(guestId) {
  const existing = await prisma.shellTransaction.findFirst({
    where: { guestId, source: 'REGISTRATION' }
  });
  if (existing) return null;
  return createTransaction(guestId, {
    type: 'EARN',
    amount: BONUS_AMOUNTS.REGISTRATION,
    source: 'REGISTRATION',
    description: 'Бонус за реєстрацію',
    idempotencyKey: `REGISTRATION:${guestId}`
  });
}

async function grantTicketBonus(guestId, ticketOrderId) {
  const existing = await prisma.shellTransaction.findFirst({
    where: { guestId, source: 'TICKET_PURCHASE', referenceId: ticketOrderId }
  });
  if (existing) return null;
  return createTransaction(guestId, { type: 'EARN', amount: BONUS_AMOUNTS.TICKET_PURCHASE, source: 'TICKET_PURCHASE', description: 'Бонус за купівлю квитка', referenceId: ticketOrderId, idempotencyKey: `TICKET_PURCHASE:${guestId}:${ticketOrderId}` });
}

async function grantMenuOrderBonus(guestId, tableOrderId) {
  const existing = await prisma.shellTransaction.findFirst({
    where: { guestId, source: 'MENU_ORDER', referenceId: tableOrderId }
  });
  if (existing) return null;
  return createTransaction(guestId, { type: 'EARN', amount: BONUS_AMOUNTS.MENU_ORDER, source: 'MENU_ORDER', description: 'Бонус за замовлення з меню', referenceId: tableOrderId, idempotencyKey: `MENU_ORDER:${guestId}:${tableOrderId}` });
}

module.exports = {
  BONUS_AMOUNTS,
  getBalance,
  getHistory,
  createTransaction,
  earnShells,
  spendShells,
  creditTopup,
  grantRegistrationBonus,
  grantTicketBonus,
  grantMenuOrderBonus
};
