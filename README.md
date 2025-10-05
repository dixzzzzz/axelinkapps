[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Axelinkapps Mini ISP Management System** with Admin Portal, Customer Portal, GenieACS Integration, Mikrotik Management, and WhatsApp Gateway.

📌 **Note:** This project is a derivative work of [Gembok](https://github.com/alijayanet/gembok), originally developed by [alijayanet](https://github.com/alijayanet).
This version reuses only the backend from the Gembok project, with additional features and a more mobile-friendly UI for an improved user experience.

---

<p align="center">
  <img src="https://github.com/dixzzzzz/axelinkapps/blob/main/frontend/public/images/pic6.png?raw=true" alt="Screen 1" width="200"/>
  <img src="https://github.com/dixzzzzz/axelinkapps/blob/main/frontend/public/images/pic7.png?raw=true" alt="Screen 2" width="200"/>
  <img src="https://github.com/dixzzzzz/axelinkapps/blob/main/frontend/public/images/pic8.png?raw=true" alt="Screen 3" width="200"/>
  <img src="https://github.com/dixzzzzz/axelinkapps/blob/main/frontend/public/images/pic9.png?raw=true" alt="Screen 3" width="200"/>
  <img src="https://github.com/dixzzzzz/axelinkapps/blob/main/frontend/public/images/pic10.png?raw=true" alt="Screen 3" width="200"/>
  <img src="https://github.com/dixzzzzz/axelinkapps/blob/main/frontend/public/images/pic11.png?raw=true" alt="Screen 3" width="200"/>
</p>

---

## 🛠️ Prerequisites

### System Requirements

* **Node.js** >= 18.0.0
* **pnpm** >= 8.0.0 (recommended) or **npm** >= 9.0.0
* **Redis Server** (optional, fallback ke memory session)
* **GenieACS** server (untuk device management)
* **Mikrotik Router** (dengan API access)

---

## 📖 Acknowledgements

* [Gembok Project](https://github.com/alijayanet/gembok) by [alijayanet](https://github.com/alijayanet) as the original backend foundation.
* All open-source contributors who built the Node.js, React, GenieACS, and Mikrotik API ecosystems that make this project possible.

---

### Redis Server Installation

```bash
sudo apt update
sudo apt install redis-server -y
sudo systemctl status redis
```

### Basic Configuration Steps

**1. Locate Configuration File**
Find the redis.conf file in the Redis installation directory.

**• Example:**
```bash
sudo nano /etc/redis/redis.conf
```
**2. Bind Address (Security)**
For security purposes, restrict Redis to listen only on specific IP addresses.

**• Look for the line**:

    bind 127.0.0.1 ::1

**• If Redis runs on the same server, keep**:

    bind 127.0.0.1 ::1

• If Redis should be accessed from another server, replace 127.0.0.1 with the server's IP, or use 0.0.0.0 to allow all interfaces (not recommended for production without firewall).

**3. Set a Password (Optional)**
Protect your Redis server with a strong password.

• Find the SECURITY section and locate requirepass.

• Uncomment the line by removing # and set a secure password:

    requirepass YourStrongPasswordHere

**4. Save and Exit**
Save the changes and exit the editor.

**5. Restart Redis Service**
Apply the new configuration by restarting Redis:
```bash
sudo systemctl restart redis
```
---

## Quick Start (From Root Directory)

### Development Commands

#### Backend
```bash
pnpm run start:backend
```

#### Customer Portal (Port 2345)
```bash
pmpm run dev:customer
```
#### Admin Portal (Port 5432)
```bash
pnpm run dev:admin
```

#### Combined Development (Legacy)
```bash
# Start combined portal (both admin & customer)
pnpm run dev

# Access: http://localhost:5173
# Routes: /admin/* and /customer/*
```

### Production Build

```bash
# Build customer portal only
pnpm run build:customer
# Output: frontend/dist-customer/

# Build admin portal only  
pnpm run build:admin
# Output: frontend/dist-admin/

# Build both
pnpm build
```
---

## Project Structure

```
/axelinkapps/
├── backend/            # Node.js/Express API server (Port 3003)
├── frontend/           # React/Vite client application
│   ├── dist            # Both portal build output
│   ├── dist-admin/     # Admin portal build output
│   └── dist-customer/  # Customer portal build output
│
├── package.json        # Root workspace commands
└── README.md           # This file
```
---

## Security Model

### Admin Portal Security
- **Access Development Mode**: `0.0.0.0:5432`
- **Access Production Mode**: `0.0.0.0:4173/u/`
- **Use Case**: Internal admin management
- **Features**: User management, system monitoring, configuration

### Customer Portal Security  
- **Access Development Mode**: `0.0.0.0:2345`
- **Access Production Mode**: `0.0.0.0:4174/x/`
- **Use Case**: Customer self-service
- **Features**: Account management, WiFi settings, support tickets
---

## Installation

**Install all dependencies**
```bash
pnpm run install:all
```
**Install frontend dependencies**
```bash
pnpm run install:frontend
```
**Install backend dependencies**
```bash
pnpm run install:backend
```
---

## Run Apps on Development Mode

**• Change .env.axample to .env**

    NODE_ENV=development
    FORCE_HTTPS=false
    
**• Run Command** 
```bash
pnpm run dev:admin
```
```bash
pnpm run dev:customer
```
---

## Run Apps on Production Mode

**• Change .env.axample to .env**

    NODE_ENV=production
    FORCE_HTTPS=true
    
**• Run Command** 
```bash
pnpm run preview:admin
```
```bash
pnpm run preview:customer
```
---

## Run Backend
```bash
pnpm run start:backend
```
---

## Troubleshooting

### Port Already in Use
```bash
netstat -ano | findstr :2345
netstat -ano | findstr :5432
netstat -ano | findstr :4173
netstat -ano | findstr :4174
netstat -ano | findstr :3003
```

### Access Issues
• Admin portal external access blocked: ✅ **This is by design for security**
• Customer portal not accessible: Check firewall settings
• API errors: Ensure backend is running on port 3003
---

## Documentation

• **Backend API**: `backend/README.md`

• **Frontend**: `frontend/README.md`

---

## Development Workflow

1. **Start Backend**: `cd backend && node app.js` (Port 3003)
2. **Start Frontend**: 
   **• Customer**: `pnpm run dev:customer` (Port 2345)
   **• Admin**: `pnpm run dev:admin` (Port 5432)
4. **Access Portals**:
   **• Customer**: `http://localhost:2345/x/`
   **• Admin**: `http://localhost:5432/u/`
---

## Producion Workflow

1. **Start Backend**: `cd backend && node app.js` (Port 3003)
2. **Start Frontend**: 
   **• Customer**: `pnpm run preview:customer` (Port 4174)
   **• Admin**: `pnpm run preview:admin` (Port 4173)
4. **Access Portals**:
   **• Customer**: `http://localhost:4174/x/`
   **• Admin**: `http://localhost:4173/u/`
---

## Runing Apps With Systemd

**• Create the unit file**

**1. sudo nano /etc/systemd/system/your_project_name-backend.service**
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
📌 **Note: change ExecStart=/usr/bin/node app.js if you run the backend on development mode**

**2. sudo nano /etc/systemd/system/your_project_name-admin.service**
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
📌 Note: change ExecStart=/usr/bin/pnpm run dev:admin if you run the admin on development mode

**3. sudo nano /etc/systemd/system/your_project_name-customer.service**
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
📌 Note: change ExecStart=/usr/bin/pnpm run dev:customer if you run the customer on development mode

**• Instructs the systemd manager to re-read its configuration files**
```bash
sudo systemctl daemon-reload
```

**• Command for enabled, starting and see status for the configuration files**
```bash
sudo systemctl enable your_project_name-{backend,admin,customer}
sudo systemctl start your_project_name-{backend,admin,customer}
sudo systemctl status your_project_name-backend
```
📌 **Note: you can use "journalctl -u your_project_name-backend" command to see status backend**
