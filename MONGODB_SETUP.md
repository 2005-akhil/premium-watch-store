# 🍃 Connecting Your Titan Watch Store to MongoDB Atlas

Your website is equipped with a complete Authentication & User Management system ready to store user data directly in **MongoDB Atlas** (cloud database).

---

## 🚀 Quick Setup (3 Easy Steps)

### Step 1: Get your free MongoDB Atlas Connection String
1. Log in or create a free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free **M0 Sandbox Cluster** (select AWS / Mumbai `ap-south-1` or your nearest region).
3. Under **Security → Database Access**:
   - Click **Add New Database User**.
   - Create a username (e.g., `titan_admin`) and a secure password.
4. Under **Security → Network Access**:
   - Click **Add IP Address**.
   - Select **Allow Access from Anywhere** (`0.0.0.0/0`) and click **Confirm**.
5. Go to **Database → Clusters**, click **Connect** → choose **Drivers** (Node.js).
6. Copy your connection string. It will look like this:
   ```text
   mongodb+srv://titan_admin:<password>@cluster0.abcde.mongodb.net/titan_watches?retryWrites=true&w=majority
   ```

---

### Step 2: Add your Connection String to `.env`
Open the `.env` file in the project folder and paste your connection string:

```env
PORT=5000
MONGODB_URI=mongodb+srv://titan_admin:YOUR_ACTUAL_PASSWORD@cluster0.abcde.mongodb.net/titan_watches?retryWrites=true&w=majority
```
*(Remember to replace `YOUR_ACTUAL_PASSWORD` with the database password you created in Step 1)*

---

### Step 3: Run the Server
In your terminal, navigate to the project directory and run:

```bash
node server.js
```

You will see:
```text
======================================================
  🌟 TITAN WATCH STORE & MONGODB ATLAS AUTH SERVER 🌟
======================================================
  🏠 Website URL:  http://localhost:5000
  🔐 Login Page:   http://localhost:5000/login.html
  🛍️ Collections:  http://localhost:5000/collections.html
  📡 API Health:   http://localhost:5000/api/auth/status
======================================================
✅ Connected successfully to MongoDB Atlas database!
```

---

## 📋 What Gets Stored in MongoDB Atlas

Each registered user is saved under the `users` collection:

```json
{
  "_id": "674a9b5f123456789abcdef0",
  "name": "Priya Sharma",
  "email": "priya.sharma@example.com",
  "password": "hashed_pbkdf2_secure_string",
  "salt": "3f98a72b0c1e...",
  "phone": "+91 98765 43210",
  "createdAt": "2026-09-30T10:15:00.000Z",
  "updatedAt": "2026-09-30T10:15:00.000Z"
}
```

- **Passwords are securely hashed** with PBKDF2/SHA-512 and cryptographic salt before storage (never stored in plain text).
- **Emails are unique** — duplicate accounts are automatically rejected with friendly notifications.
- **Local Fallback:** If `MONGODB_URI` is not yet configured, accounts are saved in `data/users.json` so you can test the UI right away. Once you add your MongoDB Atlas URI, new accounts are saved directly to the cloud!
