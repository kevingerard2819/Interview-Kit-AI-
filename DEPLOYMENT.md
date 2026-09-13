# Deployment Guide - The AI Interview Prep Kit

This full-stack application consists of:
1. **Frontend**: Next.js 14 (`client/`)
2. **Backend**: Express + MongoDB (`server/`)

---

## Architecture Recommendation

| Layer | Recommended Host | Reason |
| :--- | :--- | :--- |
| **Frontend** | **Vercel** | Native Next.js 14 support, global edge CDN, instant deployments. |
| **Backend** | **Render** or **Railway** | Runs persistent Node.js processes. **Crucial:** Vercel free tier has a 10s-15s serverless function timeout; the AI generation pipeline takes 35-45s, so the backend must run on a persistent container service. |
| **Database** | **MongoDB Atlas** | Free tier (M0) forever, 512MB storage. |

---

## Step 1: Database Setup (MongoDB Atlas) - 2 Minutes

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and create a free account.
2. Create a free **M0 Cluster**.
3. Under **Database Access**, create a user (e.g. `admin` with a password).
4. Under **Network Access**, click **Add IP Address** and choose **Allow Access From Anywhere** (`0.0.0.0/0`).
5. Click **Connect** ➔ **Drivers** ➔ Copy the connection string:
   ```
   mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/interview_prep_kit?retryWrites=true&w=majority
   ```

---

## Step 2: Deploy Backend to Render (or Railway) - 3 Minutes

### Option A: Render (Free)
1. Push your repository to GitHub.
2. Log in to [Render.com](https://render.com) and click **New +** ➔ **Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Root Directory**: `.` (leave blank)
   - **Build Command**: `npm install && npm run build:server`
   - **Start Command**: `node dist/server/src/index.js`
5. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `MONGODB_URI`: `<Your MongoDB Atlas connection string from Step 1>`
   - `GEMINI_API_KEY`: `<Your Gemini API key>`
   - `JWT_SECRET`: `<Any random string for authentication tokens>`
   - `CLIENT_URL`: `*`
6. Click **Create Web Service**.
7. Copy your backend URL once deployed (e.g., `https://trao-prep-kit-api.onrender.com`).

---

## Step 3: Deploy Frontend to Vercel - 2 Minutes

1. Log in to [Vercel.com](https://vercel.com) with GitHub.
2. Click **Add New...** ➔ **Project** and import your repository.
3. In the project setup screen:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: Click **Edit** and select **`client`**
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL`: `https://trao-prep-kit-api.onrender.com/api` *(your Render backend URL from Step 2 with `/api`)*
5. Click **Deploy**!

Within 60 seconds, Vercel will give you a permanent `https://your-project.vercel.app` URL that never drops or disconnects.
