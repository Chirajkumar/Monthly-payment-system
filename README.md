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
