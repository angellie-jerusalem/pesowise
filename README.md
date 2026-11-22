# PesoWise – Student Budget Tracker

React (front end) + PHP (back end) + MySQL (database)

## Folders
- frontend/  React app (Vite)
- backend/   api.php
- database/  schema.sql

## Run on your PC
1. Install XAMPP and Node.js. Start Apache and MySQL in XAMPP.
2. Open http://localhost/phpmyadmin, click Import, choose database/schema.sql, click Go.
3. Copy backend/api.php to C:\xampp\htdocs\pesowise\api.php
4. In the frontend folder, run:
     npm install
     npm run dev
5. Open the link it shows (http://localhost:5173).

## Publish (InfinityFree or any PHP host)
1. Create a MySQL database on the host. In database/schema.sql, delete the first two lines
   (CREATE DATABASE and USE), then import it with phpMyAdmin.
2. Edit the 4 database settings at the top of backend/api.php.
3. In the frontend folder, run: npm run build
4. Upload everything inside frontend/dist AND backend/api.php to the htdocs folder.
