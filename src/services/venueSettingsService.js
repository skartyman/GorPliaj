const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_SETTINGS = {
  // General info
  'venue.name': 'ГорПляж',
  'venue.tagline': 'Beach · Restaurant · Events',
  'venue.description': 'Пляжний комплекс в Одесі, пляж Отрада',
  
  // Contact info
  'venue.address': 'Одеса, пляж Отрада',
  'venue.phone': '+380 99 000 00 00',
  'venue.email': 'hello@gorpliaj.ua',
  
  // Working hours
  'venue.workingHours.monday': '10:00 - 22:00',
  'venue.workingHours.tuesday': '10:00 - 22:00',
  'venue.workingHours.wednesday': '10:00 - 22:00',
  'venue.workingHours.thursday': '10:00 - 22:00',
  'venue.workingHours.friday': '10:00 - 00:00',
  'venue.workingHours.saturday': '09:00 - 00:00',
  'venue.workingHours.sunday': '09:00 - 22:00',
  
  // Hero section
  'hero.eyebrow': 'Пляжний комплекс в Одесі',
  'hero.title': 'ГорПляж в Одесі',
  'hero.subtitle': 'Пляж Отрада, море та відпочинок зі смаком — усе в одному місці.',
  'hero.description': 'Меню, онлайн-бронювання, карта столів та анонси подій зібрані в одному сучасному інтерфейсі для гостей.',
  
  // Social media (JSON array)
  'social.media': JSON.stringify([
    { platform: 'instagram', url: 'https://instagram.com/gorpliaj', icon: 'instagram' },
    { platform: 'facebook', url: 'https://facebook.com/gorpliaj', icon: 'facebook' },
    { platform: 'tiktok', url: 'https://tiktok.com/@gorpliaj', icon: 'tiktok' }
  ])
};

async function getAllSettings() {
  try {
    const settings = await prisma.venueSettings.findMany({
      where: { isActive: true },
      orderBy: { key: 'asc' }
    });
    
    const result = {};
    settings.forEach(setting => {
      result[setting.key] = setting.value;
    });
    
    // Merge with defaults for missing keys
    return { ...DEFAULT_SETTINGS, ...result };
  } catch (error) {
    console.error('[venueSettingsService.getAllSettings] Error:', error);
    throw error;
  }
}

async function getSettingByKey(key) {
  try {
    const setting = await prisma.venueSettings.findUnique({
      where: { key }
    });
    
    if (!setting) {
      return { key, value: DEFAULT_SETTINGS[key] || '', isDefault: true };
    }
    
    return { ...setting, isDefault: false };
  } catch (error) {
    console.error('[venueSettingsService.getSettingByKey] Error:', error);
    throw error;
  }
}

async function updateSetting(key, value, description = null) {
  try {
    const setting = await prisma.venueSettings.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description }
    });
    
    return setting;
  } catch (error) {
    console.error('[venueSettingsService.updateSetting] Error:', error);
    throw error;
  }
}

async function updateMultipleSettings(settingsMap) {
  try {
    const results = [];
    
    for (const [key, value] of Object.entries(settingsMap)) {
      const setting = await prisma.venueSettings.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });
      results.push(setting);
    }
    
    return results;
  } catch (error) {
    console.error('[venueSettingsService.updateMultipleSettings] Error:', error);
    throw error;
  }
}

async function initializeDefaults() {
  try {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await prisma.venueSettings.upsert({
        where: { key },
        update: { value },
        create: { key, value, description: 'Default venue setting' }
      });
    }
    console.log('[venueSettingsService] Default settings initialized');
  } catch (error) {
    console.error('[venueSettingsService.initializeDefaults] Error:', error);
    throw error;
  }
}

module.exports = {
  getAllSettings,
  getSettingByKey,
  updateSetting,
  updateMultipleSettings,
  initializeDefaults,
  DEFAULT_SETTINGS
};
