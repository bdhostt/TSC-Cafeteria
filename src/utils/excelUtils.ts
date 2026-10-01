import * as XLSX from 'xlsx';
import { MenuItem, RawMasterItem, CommissionAgent, MenuItemVariation, MenuItemAddon, MenuItemPromo } from '../types';

/**
 * Clean string helper
 */
const cleanStr = (val: any): string => {
  if (val === undefined || val === null) return '';
  return String(val).trim();
};

/**
 * Clean number helper
 */
const cleanNum = (val: any, fallback = 0): number => {
  if (val === undefined || val === null || val === '') return fallback;
  const num = Number(String(val).replace(/[^0-9.-]+/g, ''));
  return isNaN(num) ? fallback : num;
};

// ==========================================
// 1. RAW MATERIALS MASTER (PAGE 2) UTILITIES
// ==========================================

export interface RawItemExportRow {
  'Item ID': number;
  'Item Name': string;
  'Category': string;
  'Default Vendor': string;
  'Unit of Measure (UOM)': string;
  'Standard Rate (BDT)': number;
}

export const exportMasterItemsToExcel = (
  items: RawMasterItem[],
  fileName = `Raw_Materials_Master_${new Date().toISOString().split('T')[0]}.xlsx`
) => {
  const data: RawItemExportRow[] = items.map(item => ({
    'Item ID': item.id,
    'Item Name': item.name,
    'Category': item.category || 'Grocery',
    'Default Vendor': item.vendor || 'N/A',
    'Unit of Measure (UOM)': item.uom || 'Kg',
    'Standard Rate (BDT)': item.defaultRate || 0
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 16 }, // Item ID
    { wch: 30 }, // Item Name
    { wch: 20 }, // Category
    { wch: 25 }, // Default Vendor
    { wch: 24 }, // Unit of Measure (UOM)
    { wch: 20 }  // Standard Rate (BDT)
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Raw_Materials');
  XLSX.writeFile(workbook, fileName);
};

export const generateMasterItemTemplateExcel = () => {
  const templateData: RawItemExportRow[] = [
    {
      'Item ID': 1001,
      'Item Name': 'Chicken Boneless - মুরগির মাংস',
      'Category': 'Meat',
      'Default Vendor': 'Kader Meat Supply',
      'Unit of Measure (UOM)': 'Kg',
      'Standard Rate (BDT)': 320
    },
    {
      'Item ID': 1002,
      'Item Name': 'Basmati Rice - বাসমতী চাল',
      'Category': 'Grocery',
      'Default Vendor': 'City Food Traders',
      'Unit of Measure (UOM)': 'Kg',
      'Standard Rate (BDT)': 140
    },
    {
      'Item ID': 1003,
      'Item Name': 'Cooking Soybean Oil - সয়াবিন তেল',
      'Category': 'Grocery',
      'Default Vendor': 'City Food Traders',
      'Unit of Measure (UOM)': 'Ltr',
      'Standard Rate (BDT)': 185
    },
    {
      'Item ID': 1004,
      'Item Name': 'Mozzarella Cheese - পনির',
      'Category': 'Dairy',
      'Default Vendor': 'Dhaka Dairy Supply',
      'Unit of Measure (UOM)': 'Kg',
      'Standard Rate (BDT)': 850
    },
    {
      'Item ID': 1005,
      'Item Name': 'Takeaway Paper Box - পার্সেল বক্স',
      'Category': 'Packaging',
      'Default Vendor': 'Modern Packaging Hub',
      'Unit of Measure (UOM)': 'Pcs',
      'Standard Rate (BDT)': 12
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  worksheet['!cols'] = [
    { wch: 16 },
    { wch: 35 },
    { wch: 20 },
    { wch: 25 },
    { wch: 24 },
    { wch: 20 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample_Template');
  XLSX.writeFile(workbook, 'Raw_Materials_Template_Sample.xlsx');
};

export const parseMasterItemsFromRows = (
  rawRows: any[],
  existingItems: RawMasterItem[] = []
): { items: RawMasterItem[]; errors: string[]; newCategories: string[]; newVendors: string[] } => {
  const items: RawMasterItem[] = [];
  const errors: string[] = [];
  const newCategories = new Set<string>();
  const newVendors = new Set<string>();

  const existingMapById = new Map<number, RawMasterItem>();
  const existingMapByName = new Map<string, RawMasterItem>();
  existingItems.forEach(i => {
    existingMapById.set(i.id, i);
    existingMapByName.set(i.name.toLowerCase().trim(), i);
  });

  rawRows.forEach((row, index) => {
    const rowNum = index + 2; // header is row 1

    // Flexible column resolution
    const idVal = row['Item ID'] ?? row['ID'] ?? row['id'] ?? row['Item Code'] ?? row['Code'] ?? row['আইডি'];
    const nameVal = row['Item Name'] ?? row['Name'] ?? row['Raw Material Name'] ?? row['Item'] ?? row['কাঁচামালের নাম'] ?? row['নাম'];
    const catVal = row['Category'] ?? row['category'] ?? row['Item Category'] ?? row['ক্যাটাগরি'];
    const vendorVal = row['Default Vendor'] ?? row['Vendor'] ?? row['Supplier'] ?? row['vendor'] ?? row['ভেন্ডর'] ?? row['সরবরাহকারী'];
    const uomVal = row['Unit of Measure (UOM)'] ?? row['Unit of Measure'] ?? row['UOM'] ?? row['uom'] ?? row['Unit'] ?? row['একক'];
    const rateVal = row['Standard Rate (BDT)'] ?? row['Standard Rate (৳)'] ?? row['Standard Rate'] ?? row['Rate'] ?? row['rate'] ?? row['Default Rate'] ?? row['দর'] ?? row['মূল্য'];

    const name = cleanStr(nameVal);
    if (!name) {
      // Empty row or missing name, skip or log
      if (Object.values(row).some(v => v !== undefined && v !== null && v !== '')) {
        errors.push(`Row ${rowNum}: Item Name is missing.`);
      }
      return;
    }

    const category = cleanStr(catVal) || 'Grocery';
    const vendor = cleanStr(vendorVal) || 'General Supplier';
    const uom = cleanStr(uomVal) || 'Kg';
    const defaultRate = cleanNum(rateVal, 0);

    if (category) newCategories.add(category);
    if (vendor) newVendors.add(vendor);

    // Determine ID
    let finalId: number;
    const parsedId = cleanNum(idVal, 0);
    if (parsedId > 0) {
      finalId = parsedId;
    } else {
      const matchByName = existingMapByName.get(name.toLowerCase());
      if (matchByName) {
        finalId = matchByName.id;
      } else {
        finalId = Date.now() + index;
      }
    }

    items.push({
      id: finalId,
      name,
      category,
      vendor,
      uom,
      defaultRate
    });
  });

  return {
    items,
    errors,
    newCategories: Array.from(newCategories),
    newVendors: Array.from(newVendors)
  };
};

// ==========================================
// 2. MENU ITEMS & RECIPES (PAGE 1) UTILITIES
// ==========================================

export interface MenuItemExportRow {
  'Item ID': number;
  'Dish Name': string;
  'Kitchen Department': string;
  'Category': string;
  'Base Dine-in Price (BDT)': number;
  'Cost / BOM (BDT)': number;
  'Foodpanda Price (BDT)': number;
  'Pathao Price (BDT)': number;
  'Foodi Price (BDT)': number;
  'Variations': string;
  'Addons': string;
  'Promo Code': string;
  'Promo Discount': string;
}

export const exportMenuItemsToExcel = (
  items: MenuItem[],
  fileName = `Menu_Items_Catalog_${new Date().toISOString().split('T')[0]}.xlsx`
) => {
  const data: MenuItemExportRow[] = items.map(item => {
    // Format channel prices
    const fpPrice = item.channelPrices?.['foodpanda'] || 0;
    const pathaoPrice = item.channelPrices?.['pathao'] || 0;
    const foodiPrice = item.channelPrices?.['foodi'] || 0;

    // Format variations e.g. "Small (1:1)=120; Medium (1:2)=200; Large=300"
    const variationsStr = (item.variations || [])
      .map(v => `${v.name}=${v.price}${v.cost ? ` (Cost:${v.cost})` : ''}`)
      .join('; ');

    // Format addons e.g. "Extra Cheese=50; Mayo=20"
    const addonsStr = (item.addons || [])
      .map(a => `${a.name}=${a.price}`)
      .join('; ');

    // Promo
    const promoCode = item.promo?.isActive && item.promo?.code ? item.promo.code : '';
    const promoDisc = item.promo?.isActive 
      ? `${item.promo.discountVal}${item.promo.discountType === 'percent' ? '%' : ' BDT'}`
      : '';

    return {
      'Item ID': item.id,
      'Dish Name': item.name,
      'Kitchen Department': item.department || 'Main Kitchen',
      'Category': item.category || 'General',
      'Base Dine-in Price (BDT)': item.price || 0,
      'Cost / BOM (BDT)': item.cost || 0,
      'Foodpanda Price (BDT)': fpPrice,
      'Pathao Price (BDT)': pathaoPrice,
      'Foodi Price (BDT)': foodiPrice,
      'Variations': variationsStr,
      'Addons': addonsStr,
      'Promo Code': promoCode,
      'Promo Discount': promoDisc
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 14 }, // ID
    { wch: 32 }, // Name
    { wch: 22 }, // Department
    { wch: 20 }, // Category
    { wch: 24 }, // Base Price
    { wch: 18 }, // Cost
    { wch: 22 }, // Foodpanda
    { wch: 20 }, // Pathao
    { wch: 18 }, // Foodi
    { wch: 36 }, // Variations
    { wch: 28 }, // Addons
    { wch: 16 }, // Promo Code
    { wch: 18 }  // Promo Disc
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Menu_Dishes');
  XLSX.writeFile(workbook, fileName);
};

export const generateMenuItemTemplateExcel = () => {
  const templateData: MenuItemExportRow[] = [
    {
      'Item ID': 2001,
      'Dish Name': 'Special Beef Kacchi Biryani',
      'Kitchen Department': 'Bangla Kitchen',
      'Category': 'Biryani & Rice',
      'Base Dine-in Price (BDT)': 260,
      'Cost / BOM (BDT)': 145,
      'Foodpanda Price (BDT)': 290,
      'Pathao Price (BDT)': 285,
      'Foodi Price (BDT)': 280,
      'Variations': 'Half (1:1)=260; Full (1:2)=480; Jumbo Family=920',
      'Addons': 'Extra Borhani=50; Extra Salad=20; Shami Kabab=60',
      'Promo Code': 'BIRYANILOVE',
      'Promo Discount': '10%'
    },
    {
      'Item ID': 2002,
      'Dish Name': 'Grilled Chicken BBQ Burger',
      'Kitchen Department': 'Fast Food & Grill',
      'Category': 'Burgers & Sandwiches',
      'Base Dine-in Price (BDT)': 220,
      'Cost / BOM (BDT)': 95,
      'Foodpanda Price (BDT)': 250,
      'Pathao Price (BDT)': 245,
      'Foodi Price (BDT)': 240,
      'Variations': 'Single Patty=220; Double Cheese Patty=320',
      'Addons': 'Extra Cheese Slice=40; French Fries Side=70',
      'Promo Code': '',
      'Promo Discount': ''
    },
    {
      'Item ID': 2003,
      'Dish Name': 'Iced Caramel Latte',
      'Kitchen Department': 'Beverage & Cafe Counter',
      'Category': 'Coffee & Cold Drinks',
      'Base Dine-in Price (BDT)': 180,
      'Cost / BOM (BDT)': 60,
      'Foodpanda Price (BDT)': 200,
      'Pathao Price (BDT)': 195,
      'Foodi Price (BDT)': 190,
      'Variations': 'Regular (250ml)=180; Large (400ml)=240',
      'Addons': 'Vanilla Shot=30; Whipped Cream=40',
      'Promo Code': 'COOLOFF',
      'Promo Discount': '20 BDT'
    },
    {
      'Item ID': 2004,
      'Dish Name': 'Alo Bharta - আলু ভর্তা',
      'Kitchen Department': 'Bangla Kitchen',
      'Category': 'Bangla Items',
      'Base Dine-in Price (BDT)': 15,
      'Cost / BOM (BDT)': 5,
      'Foodpanda Price (BDT)': 17,
      'Pathao Price (BDT)': 17,
      'Foodi Price (BDT)': 17,
      'Variations': 'Standard=15',
      'Addons': '',
      'Promo Code': '',
      'Promo Discount': ''
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  worksheet['!cols'] = [
    { wch: 14 },
    { wch: 32 },
    { wch: 22 },
    { wch: 20 },
    { wch: 24 },
    { wch: 18 },
    { wch: 22 },
    { wch: 20 },
    { wch: 18 },
    { wch: 38 },
    { wch: 30 },
    { wch: 16 },
    { wch: 18 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample_Template');
  XLSX.writeFile(workbook, 'Menu_Items_Template_Sample.xlsx');
};

/**
 * Parse string variation helper: "Small=120; Medium=200" or "Small:120, Medium:200"
 */
const parseVariationsString = (str: string, basePrice: number): MenuItemVariation[] => {
  if (!str || !str.trim()) return [];
  const parts = str.split(/[;,|]/).map(s => s.trim()).filter(Boolean);
  const result: MenuItemVariation[] = [];

  parts.forEach((p, idx) => {
    // E.g. "Small (1:1)=150 (Cost:70)" or "Large:250"
    const costMatch = p.match(/cost:\s*([\d.]+)/i);
    const costVal = costMatch ? Number(costMatch[1]) : undefined;
    const cleanP = p.replace(/\(cost:[^)]+\)/i, '').trim();

    const separator = cleanP.includes('=') ? '=' : cleanP.includes(':') ? ':' : '-';
    let name = cleanP;
    let price = basePrice;

    if (cleanP.includes(separator)) {
      const tokens = cleanP.split(separator);
      name = tokens[0].trim();
      price = cleanNum(tokens[1], basePrice);
    }

    if (name) {
      result.push({
        id: `var_${Date.now().toString().slice(-4)}_${idx}`,
        name,
        criteria: 'Size',
        price,
        cost: costVal
      });
    }
  });

  return result;
};

/**
 * Parse addons string: "Extra Cheese=40; Fries=70"
 */
const parseAddonsString = (str: string): MenuItemAddon[] => {
  if (!str || !str.trim()) return [];
  const parts = str.split(/[;,|]/).map(s => s.trim()).filter(Boolean);
  const result: MenuItemAddon[] = [];

  parts.forEach((p, idx) => {
    const separator = p.includes('=') ? '=' : p.includes(':') ? ':' : '-';
    let name = p;
    let price = 0;

    if (p.includes(separator)) {
      const tokens = p.split(separator);
      name = tokens[0].trim();
      price = cleanNum(tokens[1], 0);
    }

    if (name) {
      result.push({
        id: `add_${Date.now().toString().slice(-4)}_${idx}`,
        name,
        price
      });
    }
  });

  return result;
};

export const parseMenuItemsFromRows = (
  rawRows: any[],
  existingItems: MenuItem[] = []
): { items: MenuItem[]; errors: string[]; newDepartments: string[]; newCategories: string[] } => {
  const items: MenuItem[] = [];
  const errors: string[] = [];
  const newDepartments = new Set<string>();
  const newCategories = new Set<string>();

  const existingMapById = new Map<number, MenuItem>();
  const existingMapByName = new Map<string, MenuItem>();
  existingItems.forEach(i => {
    existingMapById.set(i.id, i);
    existingMapByName.set(i.name.toLowerCase().trim(), i);
  });

  rawRows.forEach((row, index) => {
    const rowNum = index + 2;

    const idVal = row['Item ID'] ?? row['ID'] ?? row['id'] ?? row['Dish ID'] ?? row['আইডি'];
    const nameVal = row['Dish Name'] ?? row['Name'] ?? row['Dish'] ?? row['Item Name'] ?? row['ডিশের নাম'] ?? row['নাম'];
    const deptVal = row['Kitchen Department'] ?? row['Department'] ?? row['Dept'] ?? row['department'] ?? row['ডিপার্টমেন্ট'];
    const catVal = row['Category'] ?? row['Menu Category'] ?? row['category'] ?? row['ক্যাটাগরি'];
    const priceVal = row['Base Dine-in Price (BDT)'] ?? row['Base Dine-in Price'] ?? row['Price'] ?? row['Base Price'] ?? row['Dine-in Price (৳)'] ?? row['মূল্য'] ?? row['বিক্রয় মূল্য'];
    const costVal = row['Cost / BOM (BDT)'] ?? row['Cost (BOM)'] ?? row['Cost'] ?? row['BOM'] ?? row['খরচ'];

    // Delivery channels
    const fpVal = row['Foodpanda Price (BDT)'] ?? row['Foodpanda Price'] ?? row['Foodpanda'] ?? row['foodpanda'];
    const pathaoVal = row['Pathao Price (BDT)'] ?? row['Pathao Price'] ?? row['Pathao'] ?? row['pathao'];
    const foodiVal = row['Foodi Price (BDT)'] ?? row['Foodi Price'] ?? row['Foodi'] ?? row['foodi'];

    // Variations & Addons
    const varVal = row['Variations'] ?? row['variations'] ?? row['Variation'] ?? row['ভেরিয়েশন'];
    const addVal = row['Addons'] ?? row['addons'] ?? row['Add-ons'] ?? row['এড-অন'];

    // Promo
    const promoCodeVal = row['Promo Code'] ?? row['Promo'] ?? row['Coupon'] ?? row['প্রোমো কোড'];
    const promoDiscVal = row['Promo Discount'] ?? row['Discount'] ?? row['ডিসকাউন্ট'];

    const name = cleanStr(nameVal);
    if (!name) {
      if (Object.values(row).some(v => v !== undefined && v !== null && v !== '')) {
        errors.push(`Row ${rowNum}: Dish Name is missing.`);
      }
      return;
    }

    const department = cleanStr(deptVal) || 'Main Kitchen';
    const category = cleanStr(catVal) || 'General Items';
    const price = cleanNum(priceVal, 0);
    const cost = cleanNum(costVal, 0);

    if (department) newDepartments.add(department);
    if (category) newCategories.add(category);

    // Channel prices
    const channelPrices: Record<string, number> = {};
    if (fpVal !== undefined && fpVal !== null && fpVal !== '') channelPrices['foodpanda'] = cleanNum(fpVal, price);
    if (pathaoVal !== undefined && pathaoVal !== null && pathaoVal !== '') channelPrices['pathao'] = cleanNum(pathaoVal, price);
    if (foodiVal !== undefined && foodiVal !== null && foodiVal !== '') channelPrices['foodi'] = cleanNum(foodiVal, price);

    // Variations & Addons
    const parsedVariations = typeof varVal === 'string' ? parseVariationsString(varVal, price) : [];
    const parsedAddons = typeof addVal === 'string' ? parseAddonsString(addVal) : [];

    // Promo
    let promo: MenuItemPromo | undefined = undefined;
    const promoCode = cleanStr(promoCodeVal);
    if (promoCode) {
      const discStr = cleanStr(promoDiscVal);
      const isPercent = discStr.includes('%');
      const discVal = cleanNum(discStr, 10);
      promo = {
        isActive: true,
        code: promoCode,
        title: `${promoCode} Special Promo`,
        discountType: isPercent ? 'percent' : 'taka',
        discountVal: discVal,
        startDate: new Date().toISOString().split('T')[0],
        timerDurationHours: 24
      };
    }

    // Determine ID and existing recipe
    let finalId: number;
    let existingRecipe = [];
    const parsedId = cleanNum(idVal, 0);
    if (parsedId > 0) {
      finalId = parsedId;
      const matched = existingMapById.get(finalId);
      if (matched?.recipe) existingRecipe = matched.recipe;
    } else {
      const matchByName = existingMapByName.get(name.toLowerCase());
      if (matchByName) {
        finalId = matchByName.id;
        if (matchByName.recipe) existingRecipe = matchByName.recipe;
      } else {
        finalId = Date.now() + index;
      }
    }

    items.push({
      id: finalId,
      name,
      department,
      category,
      price,
      cost,
      recipe: existingRecipe,
      channelPrices: Object.keys(channelPrices).length > 0 ? channelPrices : undefined,
      variations: parsedVariations.length > 0 ? parsedVariations : undefined,
      addons: parsedAddons.length > 0 ? parsedAddons : undefined,
      promo
    });
  });

  return {
    items,
    errors,
    newDepartments: Array.from(newDepartments),
    newCategories: Array.from(newCategories)
  };
};

/**
 * Universal File Reader for XLSX / XLS / CSV
 */
export const readSpreadsheetFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          resolve([]);
          return;
        }
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
