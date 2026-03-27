<div align="center">
  <br />
    <a href="https://github.com/Start-Impact/court-connect-backend" target="_blank">
      <img align="center"  style="object-fit: cover;" src="./Cover.png" alt="Project Banner">
    </a>
  <br />
  <br>
  <br>
  <div>
    <img src="https://img.shields.io/badge/-Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/-Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js" />
    <img src="https://img.shields.io/badge/-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/-Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
    <img src="https://img.shields.io/badge/-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/-Better%20Auth-CA8A04?style=for-the-badge&logo=shield&logoColor=white" alt="Better Auth" />
    <img src="https://img.shields.io/badge/-Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white" alt="Cloudinary" />

  </div>
<br/>
   <div style="font-size: 20px; color: #fff;"  align="center">
    Find and Book the Perfect Court for Your Next Game.
    </div>
</div>

## 📋 <a name="table">Table of Contents</a>

1. [Overview](#overview)
2. [Key Features](#features)
3. [Tech Stack](#tech-stack)
4. [Database Architecture](#database-architecture)
5. [Project Structure](#project-structure)
6. [API Documentation](#api-documentation)
7. [Quick Start](#quick-start)

## <a name="overview">Overview</a>

**Court Connect** is a robust backend system built to power a sports facility booking and management platform. It allows users to discover local courts, make bookings, and leave reviews. Facility organizers can manage their court listings, maintain scheduling, publish announcements, and track their revenue. Under the hood, it utilizes a powerful relational schema backed by PostgreSQL and Prisma to handle complex relationships between users, bookings, dynamic slots, and payments.

## <a name="features">Key Features</a>

- **🔐 Multi-Role Authentication**: Built with **Better Auth**, featuring User, Organizer, and Admin personas with approval gates.
- **🏢 Comprehensive Court Management**: Organizers can list venues, detailing amenities, pricing, geo-coordinates, and high-quality media.
- **📅 Dynamic Slot-Based Booking**: Book individual slots out of dynamically managed weekly templates, averting double-bookings.
- **🎟️ Flexible Coupon System**: Supports percentage and fixed promotions, complete with usage limits and expiry dates.
- **📢 Real-Time Announcements**: Organizers and admins can broadcast INFO, MAINTENANCE, or PROMOTION events to global or venue-specific audiences.
- **⭐ Interactive Reviews**: A nested review and reply system evaluating courts and their managing organizers.
- **☁️ Asset Management**: Full Cloudinary pipeline for avatars and court galleries.

## <a name="tech-stack">The Tech Stack</a>

| Component     | Technology                                                                                                                                                                                   | Description                                                 |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------- |
| **Runtime**   | ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)                                                                                     | JavaScript runtime built on Chrome's V8 engine.             |
| **Framework** | ![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)                                                                                       | Fast, unopinionated, minimalist web framework for Node.js.  |
| **Language**  | ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)                                                                              | Typed superset of JavaScript for better tooling and safety. |
| **Database**  | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)                                                                              | Powerful, open source object-relational database system.    |
| **ORM**       | ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)                                                                                          | Next-generation ORM for Node.js and TypeScript.             |
| **Auth**      | <div style="display: flex; align-items: center; gap: 8px;"><img src="https://github.com/better-auth.png" width="20" height="20" alt="Better Auth Logo" /> <strong>Better Auth</strong></div> | Comprehensive authentication solution.                      |
| **Storage**   | ![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=flat-square&logo=cloudinary&logoColor=white)                                                                              | Cloud-based image and video management.                     |

## <a name="database-architecture">Database Architecture</a>

The database architecture is designed specifically for slot-based reservations and venue management.

```mermaid
erDiagram
    User ||--o| Organizer : "can become"
    User ||--o{ Booking : "makes"
    User ||--o{ Review : "writes"
    User ||--o{ Session : "has"

    Organizer ||--o{ Court : "manages"
    Organizer ||--o{ Announcement : "publishes"

    Court ||--o{ CourtMedia : "has photos"
    Court ||--o{ CourtSlotTemplate : "has schedules"
    Court ||--o{ Booking : "receives"
    Court ||--o{ Announcement : "has"
    Court ||--o{ Review : "receives"
    Court }|--o{ Amenity : "features"

    Booking ||--|{ BookingSlot : "reserves"

    Coupon ||--o{ Booking : "applied to"

    User {
        String id PK
        String email
        Enum role
        Boolean isApproved
    }

    Organizer {
        String id PK
        String userId FK
        String businessName
        Boolean isVerified
    }

    Court {
        String id PK
        String organizerId FK
        String name
        Decimal basePrice
        Enum status
    }

    CourtSlotTemplate {
        String id PK
        String courtId FK
        Int dayOfWeek
        Int startMinute
        Int endMinute
    }

    Booking {
        String id PK
        String userId FK
        String courtId FK
        String couponId FK
        Enum status
        Decimal totalAmount
    }

    Coupon {
        String id PK
        String code
        Enum discountType
        Decimal discountValue
    }
```

## <a name="project-structure">Project Structure</a>

The project follows a modular and domain-driven design structure.

```bash
court-connect-backend/
├── prisma/                 # Database schema and migrations
│   ├── schema/             # Sub-schemas for better organization
│   └── migrations/         # History of database changes
├── src/
│   ├── modules/            # Domain-centric logic (court, booking, etc.)
│   ├── routes/             # App routers and definitions
│   ├── middlewares/        # Global and specific route processors
│   ├── lib/                # Reusable backend functionality
│   ├── scripts/            # Setup and migration scripts
│   └── server.ts           # Primary app entry
├── .env.example            # Environment skeleton
├── package.json            # Tooling and scripts
└── tsconfig.json           # TS execution configurations
```

## <a name="api-documentation">API Documentation</a>

Explore the documented routes and requests to utilize the endpoints effectively.

👉 **[Explore Postman API / Docs](docs/API.md)**

## <a name="backend-architecture">Backend Architecture</a>

The following delineates the lifecycle of a typical inbound request:

```mermaid
graph TD
    Client["Client App"]

    subgraph Server [Express Application]
        Middleware["Auth / Validation Middleware"]
        Router["Domain Router"]
        Controller["Handlers"]
        Service["Services (Business Rules)"]
    end

    Database[("PostgreSQL via Prisma")]
    Cloudinary[("Cloudinary Asset API")]

    Client -->|REST API Request| Middleware
    Middleware -->|Valid Identity / Payload| Router
    Router -->|If Multipart Form| Cloudinary
    Cloudinary -->|Secure URL| Router
    Router -->|Dispatch| Controller
    Controller -->|Invoke| Service
    Service -->|Entities| Database
    Database -->|Persisted Entities| Service
    Service -->|Domain Objects| Controller
    Controller -->|JSON Response| Client

    style Client fill:#f9f,stroke:#333,stroke-width:2px,color:#000
    style Database fill:#bbf,stroke:#333,stroke-width:2px,color:#000
    style Middleware fill:#bfb,stroke:#333,stroke-width:1px,color:#000
    style Cloudinary fill:#ff9,stroke:#333,stroke-width:2px,color:#000
```

## <a name="quick-start">Quick Start</a>

Follow these instructions to quickly instantiate a dev environment.

### Prerequisites

- **Node.js** (v18+)
- **pnpm** (recommended)
- **PostgreSQL** instance

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/court-connect-backend.git
   cd court-connect-backend
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up Environment Variables**

   ```bash
   cp .env.example .env
   # Add your PostgreSQL connection URI, Cloudinary secrets, Better Auth configs
   ```

4. **Database Initialization**

   ```bash
   # Generate Prisma client for modular schemas
   npx prisma generate

   # Push changes mapped by Prisma directly to PostgreSQL
   npx prisma db push
   ```

5. **Start Servers**

   ```bash
   pnpm dev
   ```

   The application typically rests at `http://localhost:5000`.

---

<div align="center">
  <br />
  <strong>Build by SAJID with ❤️</strong>
</div>
