const adminMenuService = require('../services/adminMenuService');

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getMenuCategories(req, res) {
  try {
    const categories = await adminMenuService.listCategories();
    return res.json(categories);
  } catch (error) {
    console.error('[adminMenuController.getMenuCategories] Failed to load menu categories.', error);
    return res.status(500).json({ message: 'Unable to load menu categories.' });
  }
}

async function createMenuCategory(req, res) {
  try {
    const result = await adminMenuService.createCategory(req.body || {});

    if (result.type === 'INVALID') {
      return res.status(400).json({ message: result.message });
    }

    return res.status(201).json({ success: true, category: result.category });
  } catch (error) {
    console.error('[adminMenuController.createMenuCategory] Failed to create menu category.', error);
    return res.status(500).json({ message: 'Unable to create menu category.' });
  }
}

async function updateMenuCategory(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'Category id is invalid.' });
    }

    const result = await adminMenuService.updateCategory(id, req.body || {});
    if (result.type === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Category not found.' });
    }

    if (result.type === 'INVALID') {
      return res.status(400).json({ message: result.message });
    }

    return res.json({ success: true, category: result.category });
  } catch (error) {
    console.error('[adminMenuController.updateMenuCategory] Failed to update menu category.', error);
    return res.status(500).json({ message: 'Unable to update menu category.' });
  }
}

async function deleteMenuCategory(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'Category id is invalid.' });
    }

    const result = await adminMenuService.deleteCategory(id);
    if (result.type === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Category not found.' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('[adminMenuController.deleteMenuCategory] Failed to delete menu category.', error);
    return res.status(500).json({ message: 'Unable to delete menu category.' });
  }
}

async function getMenuItems(req, res) {
  try {
    const items = await adminMenuService.listItems();
    return res.json(items);
  } catch (error) {
    console.error('[adminMenuController.getMenuItems] Failed to load menu items.', error);
    return res.status(500).json({ message: 'Unable to load menu items.' });
  }
}

async function getMenuInsights(req, res) {
  try {
    const insights = await adminMenuService.getInsights();
    return res.json(insights);
  } catch (error) {
    console.error('[adminMenuController.getMenuInsights] Failed to load menu insights.', error);
    return res.status(500).json({ message: 'Unable to load menu insights.' });
  }
}

async function createMenuItem(req, res) {
  try {
    const result = await adminMenuService.createItem(req.body || {});

    if (result.type === 'INVALID') {
      return res.status(400).json({ message: result.message });
    }

    return res.status(201).json({ success: true, item: result.item });
  } catch (error) {
    console.error('[adminMenuController.createMenuItem] Failed to create menu item.', error);
    return res.status(500).json({ message: 'Unable to create menu item.' });
  }
}

async function updateMenuItem(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'Item id is invalid.' });
    }

    const result = await adminMenuService.updateItem(id, req.body || {});
    if (result.type === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Menu item not found.' });
    }

    if (result.type === 'INVALID') {
      return res.status(400).json({ message: result.message });
    }

    return res.json({ success: true, item: result.item });
  } catch (error) {
    console.error('[adminMenuController.updateMenuItem] Failed to update menu item.', error);
    return res.status(500).json({ message: 'Unable to update menu item.' });
  }
}

async function deleteMenuItem(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'Item id is invalid.' });
    }

    const result = await adminMenuService.deleteItem(id);
    if (result.type === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Menu item not found.' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('[adminMenuController.deleteMenuItem] Failed to delete menu item.', error);
    return res.status(500).json({ message: 'Unable to delete menu item.' });
  }
}

module.exports = {
  getMenuCategories,
  createMenuCategory,
  updateMenuCategory,
  deleteMenuCategory,
  getMenuItems,
  getMenuInsights,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
};
