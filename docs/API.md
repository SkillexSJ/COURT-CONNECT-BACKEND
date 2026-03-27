# Court Connect API Documentation

Welcome to the comprehensive API documentation for the **Court Connect** backend. This API powers the sports facility booking platform, enabling users to find courts, book slots, and organizers to manage their venues.

**Base URL**: `http://localhost:5000/api`

---

## ⚡ Quick API Reference

| Method   | Endpoint             | Description                                    | Access / Role |
| :------- | :------------------- | :--------------------------------------------- | :------------ |
| **AUTH** | `/api/auth/*`        | Better Auth endpoints (sign-in, sign-up, etc.) | Public        |
| **GET**  | `/api/courts`        | Browse all active courts                       | Public        |
| **POST** | `/api/bookings`      | Book slots at a court                          | User          |
| **GET**  | `/api/users/profile` | Get current user's profile                     | Authenticated |
| **GET**  | `/api/admin/stats`   | Get platform statistics                        | Admin         |

---

## 🔐 Auth API (Better Auth)

Authentication is handled securely via **Better Auth**.

| Method | Endpoint                  | Description                             |
| :----- | :------------------------ | :-------------------------------------- |
| `POST` | `/api/auth/sign-up/email` | Register a new user with email/password |
| `POST` | `/api/auth/sign-in/email` | Login with email/password               |
| `POST` | `/api/auth/sign-out`      | Logout the current session              |
| `GET`  | `/api/auth/session`       | Get the current session data            |

### Example: Sign Up

**Request:** `POST /api/auth/sign-up/email`

```json
{
  "email": "player@example.com",
  "password": "securepassword123",
  "name": "Alex Futsal",
  "role": "USER"
}
```

**Response:**

```json
{
  "user": {
    "id": "user-uuid",
    "email": "player@example.com",
    "emailVerified": false,
    "name": "Alex Futsal",
    "role": "USER",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

---

## 🏢 Court Management

Manage the venues, sports courts, and facilities.

| Method   | Endpoint              | Description                        | Role      |
| :------- | :-------------------- | :--------------------------------- | :-------- |
| `POST`   | `/api/courts`         | Create a new court listing         | **Organizer** |
| `PATCH`  | `/api/courts/:id`     | Update court details               | **Organizer** |
| `GET`    | `/api/courts`         | Get all active courts              | Public    |
| `GET`    | `/api/courts/:slug`   | Get details of a specific court    | Public    |

### Example: Create Court

**Request:** `POST /api/courts`

```json
{
  "name": "Central Park Tennis Court",
  "type": "Tennis",
  "locationLabel": "Central Park, NY",
  "basePrice": 30.00,
  "description": "Well-lit outdoor tennis court."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Court created successfully",
  "data": {
    "id": "court-uuid",
    "slug": "central-park-tennis-court",
    "name": "Central Park Tennis Court",
    "status": "PENDING_APPROVAL",
    "createdAt": "2024-08-25T14:30:00Z"
  }
}
```

---

## 📅 Booking System

Manage reservation of court slots.

| Method  | Endpoint            | Description                                            | Role           |
| :------ | :------------------ | :----------------------------------------------------- | :------------- |
| `POST`  | `/api/bookings`     | Create a new slot booking                              | User           |
| `GET`   | `/api/bookings`     | Get list of my bookings                                | User, Organizer|
| `GET`   | `/api/bookings/:id` | Get specific booking details                           | User, Organizer|
| `PATCH` | `/api/bookings/:id/status` | Update booking status (e.g., `PAID`)         | Organizer, Admin |

### Example: Create Booking

**Request:** `POST /api/bookings`

```json
{
  "courtId": "court-uuid",
  "bookingDate": "2024-09-01T00:00:00.000Z",
  "slots": [
    {
      "startMinute": 540,
      "endMinute": 600
    }
  ],
  "couponId": "nullable-coupon-uuid"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "id": "booking-uuid",
    "bookingCode": "B-X7Z8K",
    "status": "PENDING",
    "totalAmount": "30.00"
  }
}
```

---

## 👨‍💼 Organizer API

Endpoints for facility owners to manage their business profiles.

| Method  | Endpoint                 | Description                                | Role      |
| :------ | :----------------------- | :----------------------------------------- | :-------- |
| `POST`  | `/api/organizers/profile`| Register as an Organizer                   | **User**  |
| `GET`   | `/api/organizers/me`     | Get my own Organizer profile               | **Organizer**|
| `PATCH` | `/api/organizers/me`     | Update business details (name, bio)        | **Organizer**|
| `POST`  | `/api/courts/:id/slots`  | Set weekly availability templates for court| **Organizer**|

### Example: Set Availability Slots (Templates)

**Request:** `POST /api/courts/court-uuid/slots`

```json
{
  "templates": [
    {
      "dayOfWeek": 1,
      "startMinute": 540,
      "endMinute": 600,
      "priceOverride": null
    }
  ]
}
```

---

## 🎟️ Coupons & Promotions

Endpoints for handling discount systems.

| Method  | Endpoint                 | Description                                | Role         |
| :------ | :----------------------- | :----------------------------------------- | :----------- |
| `POST`  | `/api/coupons`           | Create a new discount code                 | **Admin** / **Organizer**|
| `GET`   | `/api/coupons/validate`  | Validate a coupon code before booking      | User         |

---

## 📢 Announcements

Broadcast information to players.

| Method  | Endpoint                 | Description                                | Role         |
| :------ | :----------------------- | :----------------------------------------- | :----------- |
| `POST`  | `/api/announcements`     | Blast a new info or promo event            | **Admin** / **Organizer**|
| `GET`   | `/api/announcements`     | Get active general or venue announcements  | Public       |

---

## 🛡️ Administrative (Admin Only)

Platform-wide management and oversight.

| Method  | Endpoint                        | Description                    | Role      |
| :------ | :------------------------------ | :----------------------------- | :-------- |
| `GET`   | `/api/admin/stats`              | View global platform analytics | **Admin** |
| `PATCH` | `/api/admin/organizers/:id`     | Approve an organizer account   | **Admin** |
| `PATCH` | `/api/admin/courts/:id/approve` | Approve a pending court listing| **Admin** |

---

## 🧪 Testing Flow

Follow this sequence to manually test the core user journey:

1.  **Preparation**:
    - Ensure server is running (`pnpm dev`).
    - Seed the database with an admin (`pnpm seed:admin`).

2.  **Organizer Setup**:
    - Register a new user (`POST /api/auth/sign-up/email`).
    - Create an Organizer profile (`POST /api/organizers/profile`).
    - Admin approves the Organizer (`PATCH /api/admin/organizers/:id`).
    - Organizer creates a Court (`POST /api/courts`) and configures Slot Templates (`POST /api/courts/:id/slots`).
    - Admin approves the Court (`PATCH /api/admin/courts/:id/approve`).

3.  **Player Journey**:
    - Register a new user (Role: USER).
    - Browse active courts (`GET /api/courts`).
    - Book available slots (`POST /api/bookings`).

4.  **Booking Lifecycle**:
    - Organizer sees pending booking -> User completes payment -> Status shifts to `PAID`.
    - (Optional) Player leaves a review (`POST /api/reviews`).

5.  **Admin Check**:
    - Login as Admin.
    - View stats (`GET /api/admin/stats`) to see new revenue and booking metrics.
