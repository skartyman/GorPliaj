function getAdminStatus(req, res) {
  res.json({
    message: 'Admin API placeholder',
    ready: false
  });
}

module.exports = { getAdminStatus };
