const fs = require('fs');
const path = require('path');

console.log('Setting up Prisma for Netlify...');

// Ensure the functions directory has proper structure
const functionsDir = path.join(__dirname, '../netlify/functions');
const nodeModulesDir = path.join(functionsDir, 'node_modules');
const prismaClientDir = path.join(nodeModulesDir, '@prisma', 'client');

// Create directories if they don't exist
[functionsDir, nodeModulesDir, path.join(nodeModulesDir, '@prisma')].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Copy .prisma directory from root node_modules
const dotPrismaSrc = path.join(__dirname, '../node_modules/.prisma');
const dotPrismaDest = path.join(functionsDir, '.prisma');

if (fs.existsSync(dotPrismaSrc)) {
  // Remove existing .prisma directory
  if (fs.existsSync(dotPrismaDest)) {
    fs.rmSync(dotPrismaDest, { recursive: true });
  }
  
  // Copy all files
  fs.cpSync(dotPrismaSrc, dotPrismaDest, { recursive: true });
  console.log(`Copied .prisma directory to ${dotPrismaDest}`);
}

// Copy @prisma/client
const prismaClientSrc = path.join(__dirname, '../node_modules/@prisma/client');
const prismaClientDest = path.join(nodeModulesDir, '@prisma', 'client');

if (fs.existsSync(prismaClientSrc)) {
  if (fs.existsSync(prismaClientDest)) {
    fs.rmSync(prismaClientDest, { recursive: true });
  }
  
  fs.cpSync(prismaClientSrc, prismaClientDest, { recursive: true });
  console.log(`Copied @prisma/client to ${prismaClientDest}`);
}

// Create a package.json for the functions directory
const packageJson = {
  name: "netlify-functions",
  version: "1.0.0",
  dependencies: {
    "@prisma/client": "^6.19.0"
  }
};

fs.writeFileSync(
  path.join(functionsDir, 'package.json'),
  JSON.stringify(packageJson, null, 2)
);

console.log('Prisma setup completed successfully!');