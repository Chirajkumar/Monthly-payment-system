# Kenjila Membership Payment System

A full-stack membership payment management system built with React, Vite, Node.js, Express, and MongoDB.

## Features

- Member login and authentication
- Member registration with full name and date of birth
- Admin login and dashboard
- Monthly membership payment tracking
- Cash and online payment options
- UPI QR code payment support
- Google Pay app launch on Android
- Payment proof upload
- Payment verification by admin
- Payment history and summary
- Cloudinary image storage

## Technologies

### Frontend
- React
- Vite
- React Router
- Axios
- React Icons

### Backend
- Node.js
- Express
- MongoDB
- Mongoose
- JWT authentication
- Cloudinary
- Multer

## Project Structure

```text
Backend/
Frontend/vite-project/
```

## Local setup

1. Install Node.js and MongoDB. Configure Cloudinary credentials if you want to use hosted payment-proof uploads.
2. Copy `Backend/.env.example` to `Backend/.env` and set your database URI, a strong JWT secret, and admin credentials. Cloudinary settings are optional when using local payment-proof storage.
3. Copy `Frontend/vite-project/.env.example` to `Frontend/vite-project/.env`. The default `/api` URL uses the Vite development proxy.
4. Install and start the backend:

   ```sh
   cd Backend
   npm install
   npm run dev
   ```

5. In another terminal, install and start the frontend:

   ```sh
   cd Frontend/vite-project
   npm install
   npm run dev
   ```

## Backend deployment on Render

The root `package.json` delegates Render's root-level install and start commands to `Backend`. Use `npm install` (or `yarn install`) as the build command and `npm start` (or `yarn start`) as the start command. The backend listens on Render's `PORT`.

Configure these environment variables in Render:

- `MONGODB_URI`: MongoDB Atlas connection string
- `JWT_SECRET`: a long, random signing secret
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: initial admin credentials
- `NODE_ENV`: `production`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` if payment-proof uploads are enabled

Never commit production credentials. After updating the Render service, trigger a new deploy and check its logs for a successful MongoDB connection and server startup.

For the Vercel frontend, set `VITE_API_URL` to `https://<your-render-service>.onrender.com/api` in the Vercel project's environment variables, then redeploy the frontend. The default `/api` value is intended for the local Vite development proxy.
