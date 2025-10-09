# AxelinkApps

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**AxelinkApps ISP Management System** with Admin Portal, Customer Portal, GenieACS Integration, Mikrotik Management, and WhatsApp Gateway.

<p align="center">
  <img src="https://github.com/dixzzzzz/axelinkapps/blob/main/frontend/public/images/pic6.png?raw=true" alt="Screen 1" width="200"/>
  <img src="https://github.com/dixzzzzz/axelinkapps/blob/main/frontend/public/images/pic7.png?raw=true" alt="Screen 2" width="200"/>
  <img src="https://github.com/dixzzzzz/axelinkapps/blob/main/frontend/public/images/pic8.png?raw=true" alt="Screen 3" width="200"/>
  <img src="https://github.com/dixzzzzz/axelinkapps/blob/main/frontend/public/images/pic9.png?raw=true" alt="Screen 4" width="200"/>
  <img src="https://github.com/dixzzzzz/axelinkapps/blob/main/frontend/public/images/pic10.png?raw=true" alt="Screen 5" width="200"/>
  <img src="https://github.com/dixzzzzz/axelinkapps/blob/main/frontend/public/images/pic11.png?raw=true" alt="Screen 6" width="200"/>
</p>

---

**☕ Buy me a coffee**

If you’d like to support the development of this project, you can do:

BCA `4461269774` | Dikri Nurpadli

❤️ Thank You

Every bit of support helps me continue improving this project

If you find this useful, please consider ⭐ starring the repo or buy me a coffee

and you can text me to ask for more information https://wa.me/6281911290961 Dikri

---

## 🛠️ Prerequisites

**System Requirements**
- **Node.js** ≥ 18.0.0  
- **pnpm** ≥ 8.0.0 (recommended) or **npm** ≥ 9.0.0  
- **Redis Server** (optional, fallback to memory session)  
- **GenieACS** server (for device management)  
- **Mikrotik Router** (with API access)

---

## 📁 Project Structure
```text
axelinkapps/
├── backend/         # Node.js/Express API server (Port 3003)
├── frontend/        # React/Vite client application
│ ├── dist           # Both portal build output
│ ├── dist-admin/    # Admin portal build output
│ └── dist-customer/ # Customer portal build output
│
├── package.json     # Root workspace commands
└── README.md        # This file
```

---

## 🧩 Redis Installation & Configuration

**Install Redis Server**
```bash
sudo apt update
sudo apt install redis-server -y
sudo systemctl status redis
```

**Basic Configuration**

**1. Locate Configuration File**

Find the redis.conf file in the Redis installation directory.

**EXample:**
```bash
sudo nano /etc/redis/redis.conf
```

**2. Bind Address (Security)**

For security purposes, restrict Redis to listen only on specific IP addresses.

**Look for the line:**
```text
bind 127.0.0.1 ::1
```
If Redis should be accessed remotely, replace `127.0.0.1` with your server IP (⚠️ not recommended without firewall).

**3. Set a Password (Optional)**

Uncomment the line by removing `#` and set a secure password
```text
requirepass YourStrongPasswordHere
```

**4. Restart Redis**
```bash
sudo systemctl restart redis
```

---

## 📦 Installation

**Clone Project**
```bash
cd /opt
sudo git clone https://github.com/dixzzzzz/axelinkapps.git axeapps
```

**Configure Environment Files**
```bash
sudo cp /opt/axeapps/backend/.env.example /opt/axeapps/backend/.env
sudo cp /opt/axeapps/frontend/.env.example /opt/axeapps/frontend/.env
```

**Set your admin credentials:**
```bash
ADMIN_USERNAME=your_admin_username_here
ADMIN_PASSWORD=your_admin_password_here
```

**Create Dedicated User (optional)**
```bash
sudo adduser --system --group --home /opt/axeapps axeapps
sudo chown -R axeapps:axeapps /opt/axeapps
```

**Install Dependencies**
```bash
cd /opt/axeapps
```
- All
```bash
pnpm run install:all
```
- Backend Only
```bash
pnpm run install:backend
```
- Frontend Only
```bash
pnpm run install:frontend
```

---

## ⚙️ Running with Systemd

**1. Backend Service**

`sudo nano /etc/systemd/system/axelink-backend.service`
```bash
[Unit]
Description=AxeLink Backend API
After=network.target

[Service]
Type=simple
User=axeapps
WorkingDirectory=/opt/axeapps/backend
Environment=/opt/axeapps/backend/.env
ExecStart=/usr/bin/pnpm run production
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**2. Admin Service**

`sudo nano /etc/systemd/system/axelink-admin.service`
```bash
[Unit]
Description=AxeLink Admin
After=network.target

[Service]
Type=simple
User=axeapps
WorkingDirectory=/opt/axeapps/frontend
Environment=/opt/axeapps/frontend/.env
ExecStart=/usr/bin/pnpm run preview:admin
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**3. Customer Service**

`sudo nano /etc/systemd/system/axelink-customer.service`
```bash
[Unit]
Description=AxeLink Customer
After=network.target

[Service]
Type=simple
User=axeapps
WorkingDirectory=/opt/axeapps/frontend
Environment=/opt/axeapps/frontend/.env
ExecStart=/usr/bin/pnpm run preview:customer
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**4. Enable & Start Services**

```bash
sudo systemctl daemon-reload
sudo systemctl enable axelink-{backend,admin,customer}
sudo systemctl start axelink-{backend,admin,customer}
sudo systemctl status axelink-backend
```

---

## 🚀 Quick Start

**Development Mode**

- **Backend**
```bash
cd backend && npm run dev
```

- **Customer Portal (Port 2345)**
```bash
pnpm run dev:customer
```

- **Admin Portal (Port 5432)**
```bash
pnpm run dev:admin
```

- **Combined Development (Port 5173)**
```bash
pnpm run dev
```

**Production Build**
```bash
pnpm run build:customer
```
`→ frontend/dist-customer/`
```bash
pnpm run build:admin
```
`→ frontend/dist-admin/`
```bash
pnpm run build
```
`→ frontend/dist/`

---

## 🔐 Security Model

**Admin Portal**
- Dev Mode: `0.0.0.0:5432/u/`
- Prod Mode: `0.0.0.0:4173/u/`
- Features: User management, monitoring, configuration

**Customer Portal**
- Dev Mode: `0.0.0.0:2345/x/`
- Prod Mode: `0.0.0.0:4174/x/`
- Features: Account management, WiFi settings, support tickets

---

## 🧠 Development Workflow

- **Start Backend** → `cd backend && node app.js`
- **Start Frontend** → Customer: `pnpm run dev:customer` and Admin: `pnpm run dev:admin`

**Access:**

- **Customer** → `http://localhost:2345/x/`
- **Admin** → `http://localhost:5432/u/`

---

## 🏭 Production Workflow

- **Start Backend** → `cd backend && pnpm run production`
- **Start Frontend** → Customer: `pnpm run preview:customer` and Admin: `pnpm run preview:admin`

**Access:**

- **Customer** → `http://localhost:4174/x/`
- **Admin** → `http://localhost:4173/u/`

---

## 🧩 Troubleshooting

**Port Already in Use**
```bash
netstat -ano | findstr :2345
netstat -ano | findstr :5432
netstat -ano | findstr :4173
netstat -ano | findstr :4174
netstat -ano | findstr :3003
```

**Access Issues**

- Admin portal external access blocked
- Customer portal inaccessible → Check firewall
- API errors → Ensure backend is running on port `3003`

---

📌 **Note:** This project is a derivative work of [Gembok](https://github.com/alijayanet/gembok), originally developed by [alijayanet](https://github.com/alijayanet).  
This version reuses only the backend from the Gembok project, with additional features and a more mobile-friendly UI for an improved user experience.

All open-source contributors who built the Node.js, React, GenieACS, and Mikrotik API ecosystems that make this project possible

---
