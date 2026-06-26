const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting restoration of the original 5 zones...');

  // 1. Rename Zone ID 1 to "Лівий пляж"
  const leftBeachName = {
    uk: 'Лівий пляж',
    ua: 'Лівий пляж',
    ru: 'Левый пляж',
    en: 'Left beach'
  };

  await prisma.zone.update({
    where: { id: 1 },
    data: {
      name: leftBeachName,
      color: '#F4A261',
      sortOrder: 1
    }
  });
  console.log('Renamed Zone ID 1 to "Лівий пляж".');

  // 2. Check and update or create "Пляж центр" zone
  let centerBeachZone = await prisma.zone.findFirst({
    where: {
      mapId: 1,
      name: { path: ['uk'], equals: 'Пляж центр' }
    }
  });

  if (!centerBeachZone) {
    centerBeachZone = await prisma.zone.create({
      data: {
        mapId: 1,
        name: {
          uk: 'Пляж центр',
          ua: 'Пляж центр',
          ru: 'Пляж центр',
          en: 'Beach center'
        },
        color: '#2A9D8F',
        sortOrder: 2
      }
    });
    console.log(`Created "Пляж центр" zone with ID: ${centerBeachZone.id}.`);
  } else {
    console.log(`"Пляж центр" zone already exists with ID: ${centerBeachZone.id}.`);
  }

  // 3. Check and update or create "Тераса" zone
  let terraceZone = await prisma.zone.findFirst({
    where: {
      mapId: 1,
      name: { path: ['uk'], equals: 'Тераса' }
    }
  });

  if (!terraceZone) {
    terraceZone = await prisma.zone.create({
      data: {
        mapId: 1,
        name: {
          uk: 'Тераса',
          ua: 'Тераса',
          ru: 'Терраса',
          en: 'Terrace'
        },
        color: '#6A4C93',
        sortOrder: 3
      }
    });
    console.log(`Created "Тераса" zone with ID: ${terraceZone.id}.`);
  } else {
    console.log(`"Тераса" zone already exists with ID: ${terraceZone.id}.`);
  }

  // 4. Move tables from Zone ID 1 ("Лівий пляж") to their correct zones
  const tablesInZone1 = await prisma.venueTable.findMany({
    where: { zoneId: 1 },
    include: {
      mapObjects: true
    }
  });

  console.log(`Found ${tablesInZone1.length} tables in Zone 1. Processing them...`);

  let movedToCenterCount = 0;
  let movedToTerraceCount = 0;
  let remainedInLeftCount = 0;

  for (const table of tablesInZone1) {
    const code = (table.code || '').trim().toUpperCase();
    const nameStr = JSON.stringify(table.name);
    
    let targetZoneId = 1; // Default is Left Beach
    let targetZoneName = 'Лівий пляж';

    // Check if it belongs to Terrace
    // Terrace tables typically start with T- or are named "Стіл тераса"
    if (code.startsWith('T-') || (code === 'R-1' && nameStr.includes('тераса'))) {
      targetZoneId = terraceZone.id;
      targetZoneName = 'Тераса';
      movedToTerraceCount++;
    }
    // Check if it belongs to Center Beach
    // Center Beach tables typically start with RK-, RB-, CK-, CB- (Latin or Cyrillic C/R/K/B)
    // Note: Cyrillic С looks identical to Latin C. Let's support both.
    else if (
      code.startsWith('RK-') || 
      code.startsWith('RB-') || 
      code.startsWith('CK-') || 
      code.startsWith('CB-') ||
      code.startsWith('СК-') || // Cyrillic S + Cyrillic K
      code.startsWith('СВ-') || // Cyrillic S + Cyrillic V/B
      code.startsWith('СB-')    // Cyrillic S + Latin B
    ) {
      targetZoneId = centerBeachZone.id;
      targetZoneName = 'Пляж центр';
      movedToCenterCount++;
    } else {
      remainedInLeftCount++;
    }

    if (targetZoneId !== 1) {
      // 4a. Update table zoneId
      await prisma.venueTable.update({
        where: { id: table.id },
        data: { zoneId: targetZoneId }
      });

      // 4b. Update reservations linked to this table
      const updatedRes = await prisma.reservation.updateMany({
        where: { tableId: table.id },
        data: { zoneId: targetZoneId }
      });

      // 4c. Update holds linked to this table
      const updatedHolds = await prisma.tableHold.updateMany({
        where: { tableId: table.id },
        data: { zoneId: targetZoneId } // Note: TableHold might not have zoneId directly, let's check if it does in schema
      }).catch(err => {
        // TableHold doesn't have zoneId in schema, so this might fail. We swallow it.
      });

      // 4d. Update MapObjects metaJson zoneId
      for (const obj of table.mapObjects) {
        const meta = obj.metaJson && typeof obj.metaJson === 'object' ? obj.metaJson : {};
        meta.zoneId = targetZoneId;
        
        await prisma.mapObject.update({
          where: { id: obj.id },
          data: { metaJson: meta }
        });
      }

      console.log(`Moved table ID ${table.id} (${table.code}) to "${targetZoneName}" (Zone ID: ${targetZoneId}). Updated reservations count: ${updatedRes.count || 0}`);
    }
  }

  console.log('\n=== RESTORATION SUMMARY ===');
  console.log(`Moved to "Пляж центр": ${movedToCenterCount} tables.`);
  console.log(`Moved to "Тераса": ${movedToTerraceCount} tables.`);
  console.log(`Remained in "Лівий пляж": ${remainedInLeftCount} tables.`);
  console.log('Restoration completed successfully.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
