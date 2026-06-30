const waiterService = require('../services/waiterService');

async function login(req, res) {
  try {
    const { pinCode } = req.body;
    if (!pinCode) return res.status(400).json({ message: 'PIN code is required.' });

    const result = await waiterService.loginByPin(pinCode);
    if (!result) return res.status(401).json({ message: 'Invalid PIN code.' });

    res.cookie('waiter_auth_token', result.token, {
      httpOnly: true,
      secure: true,
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

async function scanTable(req, res) {
  try {
    const { tableId } = req.body;
    if (!tableId) return res.status(400).json({ message: 'tableId is required.' });

    const shift = await waiterService.getActiveShift(req.waiterAuth.sub);
    if (!shift) return res.status(400).json({ message: 'Start a shift first.' });

    const assigned = await waiterService.assignTableToShift(shift.id, parseInt(tableId, 10));
    res.json(assigned);
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
    res.json(shift?.tables || []);
  } catch (err) {
    console.error('Get tables error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

module.exports = {
  login, me, logout,
  startShift, endShift, getShift,
  scanTable, removeTable, getTables
};
