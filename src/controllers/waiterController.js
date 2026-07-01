const waiterService = require('../services/waiterService');
const prisma = require('../lib/prisma');

async function login(req, res) {
  try {
    const { pinCode } = req.body;
    if (!pinCode) return res.status(400).json({ message: 'PIN code is required.' });

    const result = await waiterService.loginByPin(pinCode);
    if (!result) return res.status(401).json({ message: 'Invalid PIN code.' });

    const isSecureRequest = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('waiter_auth_token', result.token, {
      httpOnly: true,
      secure: isSecureRequest,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 12
    });
    res.json(result);
  } catch (err) {
    console.error('Waiter login error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

async function me(req, res) {
  try {
    const waiter = await waiterService.getWaiterById(req.waiterAuth.sub);
    if (!waiter) return res.status(404).json({ message: 'Waiter not found.' });
    res.json(waiter);
  } catch (err) {
    console.error('Waiter me error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

async function logout(req, res) {
  res.clearCookie('waiter_auth_token');
  res.json({ ok: true });
}

async function startShift(req, res) {
  try {
    const shift = await waiterService.startShift(req.waiterAuth.sub);
    res.json(shift);
  } catch (err) {
    console.error('Start shift error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

async function endShift(req, res) {
  try {
    const activeShift = await waiterService.getActiveShift(req.waiterAuth.sub);
    if (!activeShift) return res.status(404).json({ message: 'No active shift.' });

    const shift = await waiterService.endShift(activeShift.id);
    res.json(shift);
  } catch (err) {
    console.error('End shift error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

async function getShift(req, res) {
  try {
    const shift = await waiterService.getActiveShift(req.waiterAuth.sub);
    res.json(shift || null);
  } catch (err) {
    console.error('Get shift error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

async function getTelegramLink(req, res) {
  try {
    const { createTelegramLinkToken } = waiterService;
    const { getWaiterBotLink } = require('../services/waiterTelegramService');
    const token = createTelegramLinkToken(req.waiterAuth.sub);
    const url = await getWaiterBotLink(token);
    if (!url) return res.status(503).json({ message: 'Waiter Telegram bot is not configured.' });
    res.json({ url, expiresInSeconds: 600 });
  } catch (err) {
    console.error('Get waiter Telegram link error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

async function scanTable(req, res) {
  try {
    const { tableId } = req.body;
    if (!tableId) return res.status(400).json({ message: 'tableId is required.' });

    const shift = await waiterService.getActiveShift(req.waiterAuth.sub);
    if (!shift) return res.status(400).json({ message: 'Start a shift first.' });

    const result = await waiterService.assignTableToShift(shift.id, parseInt(tableId, 10));
    if (result.type === 'ALREADY_ASSIGNED') return res.json({ assignment: result.assignment, already: true });
    if (result.type === 'TAKEN') {
      return res.status(409).json({
        message: result.waiter?.name ? `Table is already assigned to ${result.waiter.name}.` : 'Table is already assigned to another waiter.',
        waiter: result.waiter || null
      });
    }
    res.status(201).json(result.assignment);
  } catch (err) {
    console.error('Scan table error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

async function removeTable(req, res) {
  try {
    const shift = await waiterService.getActiveShift(req.waiterAuth.sub);
    if (!shift) return res.status(400).json({ message: 'No active shift.' });

    await waiterService.removeTableFromShift(shift.id, parseInt(req.params.tableId, 10));
    res.json({ ok: true });
  } catch (err) {
    console.error('Remove table error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

async function getTables(req, res) {
  try {
    const shift = await waiterService.getActiveShift(req.waiterAuth.sub);
    const assignedTables = shift?.tables || [];
    if (!assignedTables.length) return res.json([]);

    const tableIds = assignedTables.map((t) => t.tableId);
    const venueTables = await prisma.venueTable.findMany({
      where: { id: { in: tableIds } },
      select: { id: true, code: true, name: true }
    });
    const tableById = new Map(venueTables.map((table) => [table.id, table]));

    res.json(assignedTables.map((assigned) => {
      const table = tableById.get(assigned.tableId);
      return {
        ...assigned,
        code: table?.code || null,
        table: table ? { id: table.id, code: table.code, name: table.name } : null
      };
    }));
  } catch (err) {
    console.error('Get tables error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

async function scanTableByCode(req, res) {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') return res.status(400).json({ message: 'code is required.' });

    const shift = await waiterService.getActiveShift(req.waiterAuth.sub);
    if (!shift) return res.status(400).json({ message: 'Start a shift first.' });

    const result = await waiterService.assignTableByCode(shift.id, code.trim().toUpperCase());
    if (result.type === 'NOT_FOUND') return res.status(404).json({ message: `Table "${code}" not found.` });
    if (result.type === 'ALREADY_ASSIGNED') return res.json({ table: result.table, assignment: result.assignment, already: true });
    if (result.type === 'TAKEN') {
      return res.status(409).json({
        message: result.waiter?.name ? `Table "${result.table.code || code}" is already assigned to ${result.waiter.name}.` : `Table "${result.table.code || code}" is already assigned to another waiter.`,
        table: result.table,
        waiter: result.waiter || null
      });
    }

    res.status(201).json({ table: result.table, assignment: result.assignment });
  } catch (err) {
    console.error('Scan table by code error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

module.exports = {
  login, me, logout,
  startShift, endShift, getShift, getTelegramLink,
  scanTable, scanTableByCode, removeTable, getTables
};
