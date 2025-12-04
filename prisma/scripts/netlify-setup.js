const fs = require('fs');
const path = require('path');

// Copy Prisma files to netlify functions
const prismaClientPath = path.join(__dirname, '../../node_modules/@prisma/client');
const prismaEnginesPath = path.join(__dirname, '../../node_modules/@prisma/engines');
const dotPrismaPath = path.join(__dirname, '../../node_modules/.prisma');

const netlifyFunctionsPath = path.join(__dirname, '../../netlify/functions');

// Create directories if they don't exist
if (!fs.existsSync(path.join(netlifyFunctionsPath, 'node_modules/@prisma'))) {
  fs.mkdirSync(path.join(netlifyFunctionsPath, 'node_modules/@prisma'), { recursive: true });
}

// Copy files
function copyDir(src, dest) {
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`Copied ${src} to ${dest}`);
  }
}

copyDir(dotPrismaPath, path.join(netlifyFunctionsPath, '.prisma'));
copyDir(prismaClientPath, path.join(netlifyFunctionsPath, 'node_modules/@prisma/client'));