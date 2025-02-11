# Appointment Booking System

A full-stack application for managing appointments with user authentication, booking, and cancellation features.

## Features

- User authentication (signup/login)
- View available appointment slots
- Book appointments with notes
- View booked appointments
- Cancel appointments
- Responsive design
- Admin panel for slot management

## Tech Stack

### Frontend
- React.js
- Tailwind CSS
- React Router for navigation
- Lucide React for icons


### Backend
- Node.js
- Express.js
- MySQL database
- JWT for authentication
- bcrypt for password hashing

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8 or higher)
- npm or yarn

### Database Setup
1. Create a new MySQL database:
```sql
CREATE DATABASE appointment_system;
```

2. Import the schema from `database-schema.sql`

### Backend Setup
1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following variables:
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=appointment_db
JWT_SECRET=
```

4. Start the server:
```bash
npm start
```

### Frontend Setup
1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```
REACT_APP_API_URL=http://localhost:3000
```

4. Start the development server:
```bash
npm start
```

## Usage

1. Register a new account or login with existing credentials
2. View available appointment slots on the dashboard
3. Click "Book Slot" to make an appointment
4. Add optional notes for the appointment
5. View your booked appointments
6. Cancel appointments if needed



