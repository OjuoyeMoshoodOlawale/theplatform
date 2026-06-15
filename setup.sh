#!/bin/bash
# =============================================================
# MYS Platform — Quick Setup Script
# Run from the project root: bash setup.sh
# =============================================================
set -e

GREEN='\033[0;32m'
GOLD='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${GREEN}🕌  Muslim Youth Summit Platform — Setup${NC}"
echo "============================================"
echo ""

# ── 1. Backend deps ────────────────────────────────────────────
echo -e "${GOLD}[1/5] Installing backend dependencies...${NC}"
cd backend
npm install
cd ..

# ── 2. Frontend deps ───────────────────────────────────────────
echo -e "${GOLD}[2/5] Installing frontend dependencies...${NC}"
cd frontend
npm install
cd ..

# ── 3. Environment file ────────────────────────────────────────
if [ ! -f backend/.env ]; then
  echo -e "${GOLD}[3/5] Creating backend/.env from example...${NC}"
  cp backend/.env.example backend/.env
  echo -e "${RED}  ⚠️  backend/.env created. Edit it with your credentials before starting!${NC}"
else
  echo -e "${GREEN}[3/5] backend/.env already exists — skipping.${NC}"
fi

# ── 4. Database ────────────────────────────────────────────────
echo ""
echo -e "${GOLD}[4/5] Database setup${NC}"
echo "  Run these SQL commands in your MySQL client:"
echo ""
echo "    mysql -u root -p"
echo "    SOURCE backend/src/database/schema.sql;"
echo ""
echo "  Then seed the super admin:"
echo "    cd backend && node src/database/seed.js"
echo ""

# ── 5. Start ────────────────────────────────────────────────────
echo -e "${GOLD}[5/5] Ready to start!${NC}"
echo ""
echo "  Terminal 1 (backend):   cd backend && npm run dev"
echo "  Terminal 2 (frontend):  cd frontend && npm run dev"
echo ""
echo "  Frontend: http://localhost:5173"
echo "  Admin:    http://localhost:5173/admin/login"
echo "  API:      http://localhost:5000/api/health"
echo ""
echo -e "${GREEN}  Default login: admin@muslimyouthsummit.com / MYS@Admin2024!${NC}"
echo -e "${RED}  ⚠️  Change the default password after first login!${NC}"
echo ""
echo "  GitHub push:"
echo "  git remote set-url origin https://TOKEN@github.com/OjuoyeMoshoodOlawale/MuslimYouthSummit.git"
echo "  git push origin master"
echo ""
