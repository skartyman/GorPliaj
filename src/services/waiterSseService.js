const guestConnections = new Map();
const waiterConnections = new Map();

function addGuestConnection(orderId, res) {
  if (!guestConnections.has(orderId)) guestConnections.set(orderId, new Set());
  guestConnections.get(orderId).add(res);

  res.on('close', () => {
    const set = guestConnections.get(orderId);
    if (set) {
      set.delete(res);
      if (set.size === 0) guestConnections.delete(orderId);
    }
  });
}

function addWaiterConnection(waiterId, res) {
  if (!waiterConnections.has(waiterId)) waiterConnections.set(waiterId, new Set());
  waiterConnections.get(waiterId).add(res);

  res.on('close', () => {
    const set = waiterConnections.get(waiterId);
    if (set) {
      set.delete(res);
      if (set.size === 0) waiterConnections.delete(waiterId);
    }
  });
}

function broadcastToGuest(orderId, data) {
  const set = guestConnections.get(orderId);
  if (!set) return;
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try { res.write(msg); } catch {}
  }
}

function broadcastToWaiter(waiterId, data) {
  const set = waiterConnections.get(waiterId);
  if (!set) return;
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try { res.write(msg); } catch {}
  }
}

function broadcastToAllWaiters(data) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  for (const [, set] of waiterConnections) {
    for (const res of set) {
      try { res.write(msg); } catch {}
    }
  }
}

module.exports = {
  addGuestConnection,
  addWaiterConnection,
  broadcastToGuest,
  broadcastToWaiter,
  broadcastToAllWaiters
};
