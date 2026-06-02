const prisma = require('../lib/prisma');
const bcrypt = require('bcrypt');
const adminAuthService = require('../services/adminAuthService');

const VALID_ROLES = ['seo_smm', 'hostess', 'admin', 'manager', 'owner'];

async function listUsers(req, res) {
  try {
    const users = await prisma.adminUser.findMany({
      select: { id: true, email: true, role: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'asc' }
    });
    return res.json({ users });
  } catch (error) {
    console.error('[adminUserController.listUsers] Failed to list users.', error);
    return res.status(500).json({ message: 'Unable to load users.' });
  }
}

async function createUser(req, res) {
  try {
    const { email, password, role } = req.body || {};
    if (!email || !password || !role) {
      return res.status(400).json({ message: 'email, password, and role are required.' });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
    }

    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.adminUser.create({
      data: { email, password: hashed, role },
      select: { id: true, email: true, role: true, createdAt: true }
    });

    return res.status(201).json({ user });
  } catch (error) {
    console.error('[adminUserController.createUser] Failed to create user.', error);
    return res.status(500).json({ message: 'Unable to create user.' });
  }
}

async function updateUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }

    const existing = await prisma.adminUser.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const { email, password, role } = req.body || {};
    const updateData = {};
    if (email !== undefined) updateData.email = email;
    if (password !== undefined) updateData.password = await bcrypt.hash(password, 10);
    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
      }
      updateData.role = role;
    }

    const user = await prisma.adminUser.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, role: true, updatedAt: true }
    });

    return res.json({ user });
  } catch (error) {
    console.error('[adminUserController.updateUser] Failed to update user.', error);
    return res.status(500).json({ message: 'Unable to update user.' });
  }
}

async function deleteUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }

    if (id === Number(req.adminAuth.sub)) {
      return res.status(400).json({ message: 'Cannot delete your own account.' });
    }

    await prisma.adminUser.delete({ where: { id } });
    return res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found.' });
    }
    console.error('[adminUserController.deleteUser] Failed to delete user.', error);
    return res.status(500).json({ message: 'Unable to delete user.' });
  }
}

module.exports = { listUsers, createUser, updateUser, deleteUser };
