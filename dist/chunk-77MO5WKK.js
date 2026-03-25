var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/app.ts
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";

// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

// src/lib/prisma.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

// src/generated/prisma/client.ts
import * as path from "path";
import { fileURLToPath } from "url";

// src/generated/prisma/internal/class.ts
import * as runtime from "@prisma/client/runtime/client";
var config = {
  "previewFeatures": [],
  "clientVersion": "7.5.0",
  "engineVersion": "280c870be64f457428992c43c1f6d557fab6e29e",
  "activeProvider": "postgresql",
  "inlineSchema": 'model User {\n  id               String     @id @default(uuid())\n  email            String     @unique\n  emailVerified    Boolean    @default(false)\n  name             String\n  role             UserRole   @default(USER)\n  phone            String?\n  avatarUrl        String?\n  isApproved       Boolean    @default(false) // Admin approval gate for ORGANIZERs\n  stripeCustomerId String?    @unique\n  organizerProfile Organizer?\n  createdAt        DateTime   @default(now())\n  updatedAt        DateTime   @updatedAt\n  deletedAt        DateTime?\n\n  // Essential Relations\n  accounts Account[]\n  sessions Session[]\n\n  // Business Relations\n  bookings Booking[] @relation("BookingUser")\n\n  @@map("users")\n}\n\nmodel Account {\n  id                    String    @id @default(uuid())\n  userId                String\n  accountId             String\n  providerId            String\n  accessToken           String?\n  refreshToken          String?\n  accessTokenExpiresAt  DateTime?\n  refreshTokenExpiresAt DateTime?\n  scope                 String?\n  idToken               String?\n  password              String?\n  createdAt             DateTime  @default(now())\n  updatedAt             DateTime  @updatedAt\n\n  user User @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@unique([providerId, accountId])\n  @@index([userId])\n  @@map("accounts")\n}\n\nmodel Session {\n  id        String   @id @default(uuid())\n  userId    String\n  token     String   @unique\n  expiresAt DateTime\n  ipAddress String?\n  userAgent String?\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  user User @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@index([userId])\n  @@map("sessions")\n}\n\nmodel Verification {\n  id         String   @id @default(uuid())\n  identifier String\n  value      String\n  expiresAt  DateTime\n  createdAt  DateTime @default(now())\n  updatedAt  DateTime @updatedAt\n\n  @@unique([identifier, value])\n  @@map("verifications")\n}\n\nmodel Booking {\n  id          String        @id @default(uuid()) @db.Uuid\n  bookingCode String        @unique\n  userId      String\n  courtId     String        @db.Uuid\n  couponId    String?       @db.Uuid\n  bookingDate DateTime      @db.Date\n  status      BookingStatus @default(PENDING)\n  totalAmount Decimal       @db.Decimal(12, 2)\n\n  paymentId String? // Reference to Stripe/PayPal transaction\n  paidAt    DateTime?\n  expiresAt DateTime? // 24-hour hold expiry for PENDING bookings\n  createdAt DateTime  @default(now())\n  updatedAt DateTime  @updatedAt\n\n  user   User          @relation("BookingUser", fields: [userId], references: [id])\n  court  Court         @relation(fields: [courtId], references: [id])\n  coupon Coupon?       @relation(fields: [couponId], references: [id])\n  slots  BookingSlot[]\n\n  @@map("bookings")\n}\n\nmodel BookingSlot {\n  id          String   @id @default(uuid()) @db.Uuid\n  bookingId   String   @db.Uuid\n  courtId     String   @db.Uuid\n  bookingDate DateTime @db.Date\n  startMinute Int\n  endMinute   Int\n\n  booking Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)\n\n  @@unique([courtId, bookingDate, startMinute])\n  @@map("booking_slots")\n}\n\nmodel Court {\n  id            String      @id @default(uuid()) @db.Uuid\n  organizerId   String      @db.Uuid\n  name          String\n  slug          String      @unique\n  type          String // e.g., "Tennis", "Football"\n  locationLabel String\n  description   String?\n  basePrice     Decimal     @db.Decimal(12, 2)\n  latitude      Float? // For "Courts Near Me" geo-search\n  longitude     Float? // For "Courts Near Me" geo-search\n  status        CourtStatus @default(PENDING_APPROVAL)\n  createdAt     DateTime    @default(now())\n  updatedAt     DateTime    @updatedAt\n\n  organizer     Organizer           @relation(fields: [organizerId], references: [id], onDelete: Cascade)\n  media         CourtMedia[]\n  amenities     Amenity[]\n  slotTemplates CourtSlotTemplate[]\n  bookings      Booking[]\n  announcements Announcement[]\n\n  @@map("courts")\n}\n\nmodel CourtMedia {\n  id        String  @id @default(uuid()) @db.Uuid\n  courtId   String  @db.Uuid\n  url       String\n  publicId  String\n  isPrimary Boolean @default(false)\n  court     Court   @relation(fields: [courtId], references: [id], onDelete: Cascade)\n\n  @@map("court_media")\n}\n\nmodel Amenity {\n  id     String  @id @default(uuid()) @db.Uuid\n  name   String  @unique\n  icon   String?\n  courts Court[]\n\n  @@map("amenities")\n}\n\nmodel CourtSlotTemplate {\n  id            String   @id @default(uuid()) @db.Uuid\n  courtId       String   @db.Uuid\n  dayOfWeek     Int // 0-6\n  startMinute   Int\n  endMinute     Int\n  priceOverride Decimal? @db.Decimal(12, 2)\n  isActive      Boolean  @default(true) // Toggle without deleting\n  court         Court    @relation(fields: [courtId], references: [id], onDelete: Cascade)\n\n  @@map("court_slot_templates")\n}\n\nmodel Organizer {\n  id     String @id @default(uuid()) @db.Uuid\n  userId String @unique // 1-to-1 relationship\n\n  // Business Specific Fields\n  businessName String\n  bio          String?\n  website      String?\n  phoneNumber  String? // Business contact\n  address      String?\n\n  // Verification & Payments (Stripe Connect)\n  isVerified      Boolean @default(false)\n  stripeAccountId String? @unique // Used for sending them money (payouts)\n\n  // Relations\n  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)\n  courts        Court[] // Now courts belong to the Organizer profile\n  announcements Announcement[]\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  @@map("organizers")\n}\n\ngenerator client {\n  provider = "prisma-client"\n  output   = "../../src/generated/prisma"\n}\n\ndatasource db {\n  provider = "postgresql"\n}\n\n// --- ENUMS ---\nenum UserRole {\n  USER\n  ORGANIZER\n  ADMIN\n}\n\nenum CourtStatus {\n  PENDING_APPROVAL\n  ACTIVE\n  MAINTENANCE\n  HIDDEN\n}\n\nenum BookingStatus {\n  PENDING\n  PAID\n  CANCELLED\n  COMPLETED\n}\n\nenum DiscountType {\n  PERCENTAGE\n  FIXED\n}\n\nenum AnnouncementType {\n  INFO\n  MAINTENANCE\n  PROMOTION\n}\n\nenum AnnouncementAudience {\n  HOME\n  VENUE\n}\n\n// --- BUSINESS LOGIC MODELS ---\n\nmodel Coupon {\n  id            String       @id @default(uuid()) @db.Uuid\n  code          String       @unique // e.g., "WELCOME10"\n  discountType  DiscountType\n  discountValue Decimal      @db.Decimal(12, 2)\n\n  // Constraints\n  minBookingAmount  Decimal? @db.Decimal(12, 2) // "Only for bookings over $50"\n  maxDiscountAmount Decimal? @db.Decimal(12, 2) // "Max discount $20" (for percentage)\n  usageLimit        Int? // Total number of times this coupon can be used\n  usedCount         Int      @default(0)\n\n  expiresAt DateTime?\n  isActive  Boolean   @default(true)\n  createdAt DateTime  @default(now())\n\n  // Relations\n  bookings Booking[] // Track which bookings used this coupon\n\n  @@map("coupons")\n}\n\nmodel Announcement {\n  id            String               @id @default(uuid()) @db.Uuid\n  title         String\n  content       String               @db.Text\n  type          AnnouncementType     @default(INFO)\n  audience      AnnouncementAudience @default(HOME)\n  createdByRole UserRole\n  organizerId   String?              @db.Uuid\n  courtId       String?              @db.Uuid\n  imageUrl      String?\n  isPublished   Boolean              @default(false)\n  publishedAt   DateTime?\n  createdAt     DateTime             @default(now())\n  updatedAt     DateTime             @updatedAt\n\n  organizer Organizer? @relation(fields: [organizerId], references: [id], onDelete: SetNull)\n  court     Court?     @relation(fields: [courtId], references: [id], onDelete: SetNull)\n\n  @@index([audience, isPublished])\n  @@index([courtId, isPublished])\n  @@index([organizerId, isPublished])\n  @@map("announcements")\n}\n',
  "runtimeDataModel": {
    "models": {},
    "enums": {},
    "types": {}
  },
  "parameterizationSchema": {
    "strings": [],
    "graph": ""
  }
};
config.runtimeDataModel = JSON.parse('{"models":{"User":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"email","kind":"scalar","type":"String"},{"name":"emailVerified","kind":"scalar","type":"Boolean"},{"name":"name","kind":"scalar","type":"String"},{"name":"role","kind":"enum","type":"UserRole"},{"name":"phone","kind":"scalar","type":"String"},{"name":"avatarUrl","kind":"scalar","type":"String"},{"name":"isApproved","kind":"scalar","type":"Boolean"},{"name":"stripeCustomerId","kind":"scalar","type":"String"},{"name":"organizerProfile","kind":"object","type":"Organizer","relationName":"OrganizerToUser"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"deletedAt","kind":"scalar","type":"DateTime"},{"name":"accounts","kind":"object","type":"Account","relationName":"AccountToUser"},{"name":"sessions","kind":"object","type":"Session","relationName":"SessionToUser"},{"name":"bookings","kind":"object","type":"Booking","relationName":"BookingUser"}],"dbName":"users"},"Account":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"accountId","kind":"scalar","type":"String"},{"name":"providerId","kind":"scalar","type":"String"},{"name":"accessToken","kind":"scalar","type":"String"},{"name":"refreshToken","kind":"scalar","type":"String"},{"name":"accessTokenExpiresAt","kind":"scalar","type":"DateTime"},{"name":"refreshTokenExpiresAt","kind":"scalar","type":"DateTime"},{"name":"scope","kind":"scalar","type":"String"},{"name":"idToken","kind":"scalar","type":"String"},{"name":"password","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"user","kind":"object","type":"User","relationName":"AccountToUser"}],"dbName":"accounts"},"Session":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"token","kind":"scalar","type":"String"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"ipAddress","kind":"scalar","type":"String"},{"name":"userAgent","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"user","kind":"object","type":"User","relationName":"SessionToUser"}],"dbName":"sessions"},"Verification":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"identifier","kind":"scalar","type":"String"},{"name":"value","kind":"scalar","type":"String"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":"verifications"},"Booking":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"bookingCode","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"courtId","kind":"scalar","type":"String"},{"name":"couponId","kind":"scalar","type":"String"},{"name":"bookingDate","kind":"scalar","type":"DateTime"},{"name":"status","kind":"enum","type":"BookingStatus"},{"name":"totalAmount","kind":"scalar","type":"Decimal"},{"name":"paymentId","kind":"scalar","type":"String"},{"name":"paidAt","kind":"scalar","type":"DateTime"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"user","kind":"object","type":"User","relationName":"BookingUser"},{"name":"court","kind":"object","type":"Court","relationName":"BookingToCourt"},{"name":"coupon","kind":"object","type":"Coupon","relationName":"BookingToCoupon"},{"name":"slots","kind":"object","type":"BookingSlot","relationName":"BookingToBookingSlot"}],"dbName":"bookings"},"BookingSlot":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"bookingId","kind":"scalar","type":"String"},{"name":"courtId","kind":"scalar","type":"String"},{"name":"bookingDate","kind":"scalar","type":"DateTime"},{"name":"startMinute","kind":"scalar","type":"Int"},{"name":"endMinute","kind":"scalar","type":"Int"},{"name":"booking","kind":"object","type":"Booking","relationName":"BookingToBookingSlot"}],"dbName":"booking_slots"},"Court":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"organizerId","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"slug","kind":"scalar","type":"String"},{"name":"type","kind":"scalar","type":"String"},{"name":"locationLabel","kind":"scalar","type":"String"},{"name":"description","kind":"scalar","type":"String"},{"name":"basePrice","kind":"scalar","type":"Decimal"},{"name":"latitude","kind":"scalar","type":"Float"},{"name":"longitude","kind":"scalar","type":"Float"},{"name":"status","kind":"enum","type":"CourtStatus"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"organizer","kind":"object","type":"Organizer","relationName":"CourtToOrganizer"},{"name":"media","kind":"object","type":"CourtMedia","relationName":"CourtToCourtMedia"},{"name":"amenities","kind":"object","type":"Amenity","relationName":"AmenityToCourt"},{"name":"slotTemplates","kind":"object","type":"CourtSlotTemplate","relationName":"CourtToCourtSlotTemplate"},{"name":"bookings","kind":"object","type":"Booking","relationName":"BookingToCourt"},{"name":"announcements","kind":"object","type":"Announcement","relationName":"AnnouncementToCourt"}],"dbName":"courts"},"CourtMedia":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"courtId","kind":"scalar","type":"String"},{"name":"url","kind":"scalar","type":"String"},{"name":"publicId","kind":"scalar","type":"String"},{"name":"isPrimary","kind":"scalar","type":"Boolean"},{"name":"court","kind":"object","type":"Court","relationName":"CourtToCourtMedia"}],"dbName":"court_media"},"Amenity":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"icon","kind":"scalar","type":"String"},{"name":"courts","kind":"object","type":"Court","relationName":"AmenityToCourt"}],"dbName":"amenities"},"CourtSlotTemplate":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"courtId","kind":"scalar","type":"String"},{"name":"dayOfWeek","kind":"scalar","type":"Int"},{"name":"startMinute","kind":"scalar","type":"Int"},{"name":"endMinute","kind":"scalar","type":"Int"},{"name":"priceOverride","kind":"scalar","type":"Decimal"},{"name":"isActive","kind":"scalar","type":"Boolean"},{"name":"court","kind":"object","type":"Court","relationName":"CourtToCourtSlotTemplate"}],"dbName":"court_slot_templates"},"Organizer":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"businessName","kind":"scalar","type":"String"},{"name":"bio","kind":"scalar","type":"String"},{"name":"website","kind":"scalar","type":"String"},{"name":"phoneNumber","kind":"scalar","type":"String"},{"name":"address","kind":"scalar","type":"String"},{"name":"isVerified","kind":"scalar","type":"Boolean"},{"name":"stripeAccountId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"OrganizerToUser"},{"name":"courts","kind":"object","type":"Court","relationName":"CourtToOrganizer"},{"name":"announcements","kind":"object","type":"Announcement","relationName":"AnnouncementToOrganizer"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":"organizers"},"Coupon":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"code","kind":"scalar","type":"String"},{"name":"discountType","kind":"enum","type":"DiscountType"},{"name":"discountValue","kind":"scalar","type":"Decimal"},{"name":"minBookingAmount","kind":"scalar","type":"Decimal"},{"name":"maxDiscountAmount","kind":"scalar","type":"Decimal"},{"name":"usageLimit","kind":"scalar","type":"Int"},{"name":"usedCount","kind":"scalar","type":"Int"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"isActive","kind":"scalar","type":"Boolean"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"bookings","kind":"object","type":"Booking","relationName":"BookingToCoupon"}],"dbName":"coupons"},"Announcement":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"title","kind":"scalar","type":"String"},{"name":"content","kind":"scalar","type":"String"},{"name":"type","kind":"enum","type":"AnnouncementType"},{"name":"audience","kind":"enum","type":"AnnouncementAudience"},{"name":"createdByRole","kind":"enum","type":"UserRole"},{"name":"organizerId","kind":"scalar","type":"String"},{"name":"courtId","kind":"scalar","type":"String"},{"name":"imageUrl","kind":"scalar","type":"String"},{"name":"isPublished","kind":"scalar","type":"Boolean"},{"name":"publishedAt","kind":"scalar","type":"DateTime"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"organizer","kind":"object","type":"Organizer","relationName":"AnnouncementToOrganizer"},{"name":"court","kind":"object","type":"Court","relationName":"AnnouncementToCourt"}],"dbName":"announcements"}},"enums":{},"types":{}}');
config.parameterizationSchema = {
  strings: JSON.parse('["where","user","orderBy","cursor","organizer","court","media","courts","_count","amenities","slotTemplates","bookings","coupon","booking","slots","announcements","organizerProfile","accounts","sessions","User.findUnique","User.findUniqueOrThrow","User.findFirst","User.findFirstOrThrow","User.findMany","data","User.createOne","User.createMany","User.createManyAndReturn","User.updateOne","User.updateMany","User.updateManyAndReturn","create","update","User.upsertOne","User.deleteOne","User.deleteMany","having","_min","_max","User.groupBy","User.aggregate","Account.findUnique","Account.findUniqueOrThrow","Account.findFirst","Account.findFirstOrThrow","Account.findMany","Account.createOne","Account.createMany","Account.createManyAndReturn","Account.updateOne","Account.updateMany","Account.updateManyAndReturn","Account.upsertOne","Account.deleteOne","Account.deleteMany","Account.groupBy","Account.aggregate","Session.findUnique","Session.findUniqueOrThrow","Session.findFirst","Session.findFirstOrThrow","Session.findMany","Session.createOne","Session.createMany","Session.createManyAndReturn","Session.updateOne","Session.updateMany","Session.updateManyAndReturn","Session.upsertOne","Session.deleteOne","Session.deleteMany","Session.groupBy","Session.aggregate","Verification.findUnique","Verification.findUniqueOrThrow","Verification.findFirst","Verification.findFirstOrThrow","Verification.findMany","Verification.createOne","Verification.createMany","Verification.createManyAndReturn","Verification.updateOne","Verification.updateMany","Verification.updateManyAndReturn","Verification.upsertOne","Verification.deleteOne","Verification.deleteMany","Verification.groupBy","Verification.aggregate","Booking.findUnique","Booking.findUniqueOrThrow","Booking.findFirst","Booking.findFirstOrThrow","Booking.findMany","Booking.createOne","Booking.createMany","Booking.createManyAndReturn","Booking.updateOne","Booking.updateMany","Booking.updateManyAndReturn","Booking.upsertOne","Booking.deleteOne","Booking.deleteMany","_avg","_sum","Booking.groupBy","Booking.aggregate","BookingSlot.findUnique","BookingSlot.findUniqueOrThrow","BookingSlot.findFirst","BookingSlot.findFirstOrThrow","BookingSlot.findMany","BookingSlot.createOne","BookingSlot.createMany","BookingSlot.createManyAndReturn","BookingSlot.updateOne","BookingSlot.updateMany","BookingSlot.updateManyAndReturn","BookingSlot.upsertOne","BookingSlot.deleteOne","BookingSlot.deleteMany","BookingSlot.groupBy","BookingSlot.aggregate","Court.findUnique","Court.findUniqueOrThrow","Court.findFirst","Court.findFirstOrThrow","Court.findMany","Court.createOne","Court.createMany","Court.createManyAndReturn","Court.updateOne","Court.updateMany","Court.updateManyAndReturn","Court.upsertOne","Court.deleteOne","Court.deleteMany","Court.groupBy","Court.aggregate","CourtMedia.findUnique","CourtMedia.findUniqueOrThrow","CourtMedia.findFirst","CourtMedia.findFirstOrThrow","CourtMedia.findMany","CourtMedia.createOne","CourtMedia.createMany","CourtMedia.createManyAndReturn","CourtMedia.updateOne","CourtMedia.updateMany","CourtMedia.updateManyAndReturn","CourtMedia.upsertOne","CourtMedia.deleteOne","CourtMedia.deleteMany","CourtMedia.groupBy","CourtMedia.aggregate","Amenity.findUnique","Amenity.findUniqueOrThrow","Amenity.findFirst","Amenity.findFirstOrThrow","Amenity.findMany","Amenity.createOne","Amenity.createMany","Amenity.createManyAndReturn","Amenity.updateOne","Amenity.updateMany","Amenity.updateManyAndReturn","Amenity.upsertOne","Amenity.deleteOne","Amenity.deleteMany","Amenity.groupBy","Amenity.aggregate","CourtSlotTemplate.findUnique","CourtSlotTemplate.findUniqueOrThrow","CourtSlotTemplate.findFirst","CourtSlotTemplate.findFirstOrThrow","CourtSlotTemplate.findMany","CourtSlotTemplate.createOne","CourtSlotTemplate.createMany","CourtSlotTemplate.createManyAndReturn","CourtSlotTemplate.updateOne","CourtSlotTemplate.updateMany","CourtSlotTemplate.updateManyAndReturn","CourtSlotTemplate.upsertOne","CourtSlotTemplate.deleteOne","CourtSlotTemplate.deleteMany","CourtSlotTemplate.groupBy","CourtSlotTemplate.aggregate","Organizer.findUnique","Organizer.findUniqueOrThrow","Organizer.findFirst","Organizer.findFirstOrThrow","Organizer.findMany","Organizer.createOne","Organizer.createMany","Organizer.createManyAndReturn","Organizer.updateOne","Organizer.updateMany","Organizer.updateManyAndReturn","Organizer.upsertOne","Organizer.deleteOne","Organizer.deleteMany","Organizer.groupBy","Organizer.aggregate","Coupon.findUnique","Coupon.findUniqueOrThrow","Coupon.findFirst","Coupon.findFirstOrThrow","Coupon.findMany","Coupon.createOne","Coupon.createMany","Coupon.createManyAndReturn","Coupon.updateOne","Coupon.updateMany","Coupon.updateManyAndReturn","Coupon.upsertOne","Coupon.deleteOne","Coupon.deleteMany","Coupon.groupBy","Coupon.aggregate","Announcement.findUnique","Announcement.findUniqueOrThrow","Announcement.findFirst","Announcement.findFirstOrThrow","Announcement.findMany","Announcement.createOne","Announcement.createMany","Announcement.createManyAndReturn","Announcement.updateOne","Announcement.updateMany","Announcement.updateManyAndReturn","Announcement.upsertOne","Announcement.deleteOne","Announcement.deleteMany","Announcement.groupBy","Announcement.aggregate","AND","OR","NOT","id","title","content","AnnouncementType","type","AnnouncementAudience","audience","UserRole","createdByRole","organizerId","courtId","imageUrl","isPublished","publishedAt","createdAt","updatedAt","equals","in","notIn","lt","lte","gt","gte","not","contains","startsWith","endsWith","code","DiscountType","discountType","discountValue","minBookingAmount","maxDiscountAmount","usageLimit","usedCount","expiresAt","isActive","every","some","none","userId","businessName","bio","website","phoneNumber","address","isVerified","stripeAccountId","dayOfWeek","startMinute","endMinute","priceOverride","name","icon","url","publicId","isPrimary","slug","locationLabel","description","basePrice","latitude","longitude","CourtStatus","status","bookingId","bookingDate","bookingCode","couponId","BookingStatus","totalAmount","paymentId","paidAt","identifier","value","identifier_value","token","ipAddress","userAgent","accountId","providerId","accessToken","refreshToken","accessTokenExpiresAt","refreshTokenExpiresAt","scope","idToken","password","email","emailVerified","role","phone","avatarUrl","isApproved","stripeCustomerId","deletedAt","providerId_accountId","courtId_bookingDate_startMinute","is","isNot","connectOrCreate","upsert","createMany","set","disconnect","delete","connect","updateMany","deleteMany","increment","decrement","multiply","divide"]'),
  graph: "vQZ50AETCwAAogMAIBAAAMADACARAADBAwAgEgAAwgMAIOsBAAC-AwAw7AEAAD8AEO0BAAC-AwAw7gEBAAAAAfwBQAChAwAh_QFAAKEDACGiAgEApQMAIcYCAQAAAAHHAiAAoAMAIcgCAAC_A_YBIskCAQCmAwAhygIBAKYDACHLAiAAoAMAIcwCAQAAAAHNAkAAnwMAIQEAAAABACARAQAApwMAIAcAAKgDACAPAACpAwAg6wEAAKQDADDsAQAAAwAQ7QEAAKQDADDuAQEAzAMAIfwBQAChAwAh_QFAAKEDACGWAgEApQMAIZcCAQClAwAhmAIBAKYDACGZAgEApgMAIZoCAQCmAwAhmwIBAKYDACGcAiAAoAMAIZ0CAQCmAwAhAQAAAAMAIBYEAADcAwAgBgAA3QMAIAkAAN4DACAKAADfAwAgCwAAogMAIA8AAKkDACDrAQAA2QMAMOwBAAAFABDtAQAA2QMAMO4BAQDMAwAh8gEBAKUDACH3AQEAzAMAIfwBQAChAwAh_QFAAKEDACGiAgEApQMAIacCAQClAwAhqAIBAKUDACGpAgEApgMAIaoCEACbAwAhqwIIANoDACGsAggA2gMAIa4CAADbA64CIgkEAADtBQAgBgAA9AUAIAkAAPUFACAKAAD2BQAgCwAAmwQAIA8AAIIFACCpAgAA4AMAIKsCAADgAwAgrAIAAOADACAWBAAA3AMAIAYAAN0DACAJAADeAwAgCgAA3wMAIAsAAKIDACAPAACpAwAg6wEAANkDADDsAQAABQAQ7QEAANkDADDuAQEAAAAB8gEBAKUDACH3AQEAzAMAIfwBQAChAwAh_QFAAKEDACGiAgEApQMAIacCAQAAAAGoAgEApQMAIakCAQCmAwAhqgIQAJsDACGrAggA2gMAIawCCADaAwAhrgIAANsDrgIiAwAAAAUAIAIAAAYAMAMAAAcAIAkFAADTAwAg6wEAANgDADDsAQAACQAQ7QEAANgDADDuAQEAzAMAIfgBAQDMAwAhpAIBAKUDACGlAgEApQMAIaYCIACgAwAhAQUAAPAFACAJBQAA0wMAIOsBAADYAwAw7AEAAAkAEO0BAADYAwAw7gEBAAAAAfgBAQDMAwAhpAIBAKUDACGlAgEApQMAIaYCIACgAwAhAwAAAAkAIAIAAAoAMAMAAAsAIAcHAACoAwAg6wEAANcDADDsAQAADQAQ7QEAANcDADDuAQEAzAMAIaICAQClAwAhowIBAKYDACECBwAAgQUAIKMCAADgAwAgBwcAAKgDACDrAQAA1wMAMOwBAAANABDtAQAA1wMAMO4BAQAAAAGiAgEAAAABowIBAKYDACEDAAAADQAgAgAADgAwAwAADwAgAwAAAAUAIAIAAAYAMAMAAAcAIAEAAAAFACALBQAA0wMAIOsBAADWAwAw7AEAABMAEO0BAADWAwAw7gEBAMwDACH4AQEAzAMAIZICIACgAwAhngICAJ4DACGfAgIAngMAIaACAgCeAwAhoQIQAJwDACECBQAA8AUAIKECAADgAwAgCwUAANMDACDrAQAA1gMAMOwBAAATABDtAQAA1gMAMO4BAQAAAAH4AQEAzAMAIZICIACgAwAhngICAJ4DACGfAgIAngMAIaACAgCeAwAhoQIQAJwDACEDAAAAEwAgAgAAFAAwAwAAFQAgFAEAAKcDACAFAADTAwAgDAAA1AMAIA4AANUDACDrAQAA0QMAMOwBAAAXABDtAQAA0QMAMO4BAQDMAwAh-AEBAMwDACH8AUAAoQMAIf0BQAChAwAhkQJAAJ8DACGWAgEApQMAIa4CAADSA7QCIrACQAChAwAhsQIBAKUDACGyAgEAyQMAIbQCEACbAwAhtQIBAKYDACG2AkAAnwMAIQgBAACABQAgBQAA8AUAIAwAAPIFACAOAADzBQAgkQIAAOADACCyAgAA4AMAILUCAADgAwAgtgIAAOADACAUAQAApwMAIAUAANMDACAMAADUAwAgDgAA1QMAIOsBAADRAwAw7AEAABcAEO0BAADRAwAw7gEBAAAAAfgBAQDMAwAh_AFAAKEDACH9AUAAoQMAIZECQACfAwAhlgIBAKUDACGuAgAA0gO0AiKwAkAAoQMAIbECAQAAAAGyAgEAyQMAIbQCEACbAwAhtQIBAKYDACG2AkAAnwMAIQMAAAAXACACAAAYADADAAAZACAPCwAAogMAIOsBAACZAwAw7AEAABsAEO0BAACZAwAw7gEBAMwDACH8AUAAoQMAIYkCAQClAwAhiwIAAJoDiwIijAIQAJsDACGNAhAAnAMAIY4CEACcAwAhjwICAJ0DACGQAgIAngMAIZECQACfAwAhkgIgAKADACEBAAAAGwAgAwAAABcAIAIAABgAMAMAABkAIAEAAAAXACAKDQAA0AMAIOsBAADPAwAw7AEAAB8AEO0BAADPAwAw7gEBAMwDACH4AQEAzAMAIZ8CAgCeAwAhoAICAJ4DACGvAgEAzAMAIbACQAChAwAhAQ0AAPEFACALDQAA0AMAIOsBAADPAwAw7AEAAB8AEO0BAADPAwAw7gEBAAAAAfgBAQDMAwAhnwICAJ4DACGgAgIAngMAIa8CAQDMAwAhsAJAAKEDACHPAgAAzgMAIAMAAAAfACACAAAgADADAAAhACABAAAAHwAgEgQAAMADACAFAADKAwAg6wEAAMYDADDsAQAAJAAQ7QEAAMYDADDuAQEAzAMAIe8BAQClAwAh8AEBAKUDACHyAQAAxwPyASL0AQAAyAP0ASL2AQAAvwP2ASL3AQEAyQMAIfgBAQDJAwAh-QEBAKYDACH6ASAAoAMAIfsBQACfAwAh_AFAAKEDACH9AUAAoQMAIQYEAADtBQAgBQAA8AUAIPcBAADgAwAg-AEAAOADACD5AQAA4AMAIPsBAADgAwAgEgQAAMADACAFAADKAwAg6wEAAMYDADDsAQAAJAAQ7QEAAMYDADDuAQEAAAAB7wEBAKUDACHwAQEApQMAIfIBAADHA_IBIvQBAADIA_QBIvYBAAC_A_YBIvcBAQDJAwAh-AEBAMkDACH5AQEApgMAIfoBIACgAwAh-wFAAJ8DACH8AUAAoQMAIf0BQAChAwAhAwAAACQAIAIAACUAMAMAACYAIAEAAAADACABAAAABQAgAQAAAAkAIAEAAAANACABAAAAEwAgAQAAABcAIAEAAAAkACADAAAAJAAgAgAAJQAwAwAAJgAgAQAAAAUAIAEAAAAkACARAQAApwMAIOsBAADFAwAw7AEAADIAEO0BAADFAwAw7gEBAKUDACH8AUAAoQMAIf0BQAChAwAhlgIBAKUDACG9AgEApQMAIb4CAQClAwAhvwIBAKYDACHAAgEApgMAIcECQACfAwAhwgJAAJ8DACHDAgEApgMAIcQCAQCmAwAhxQIBAKYDACEIAQAAgAUAIL8CAADgAwAgwAIAAOADACDBAgAA4AMAIMICAADgAwAgwwIAAOADACDEAgAA4AMAIMUCAADgAwAgEgEAAKcDACDrAQAAxQMAMOwBAAAyABDtAQAAxQMAMO4BAQAAAAH8AUAAoQMAIf0BQAChAwAhlgIBAKUDACG9AgEApQMAIb4CAQClAwAhvwIBAKYDACHAAgEApgMAIcECQACfAwAhwgJAAJ8DACHDAgEApgMAIcQCAQCmAwAhxQIBAKYDACHOAgAAxAMAIAMAAAAyACACAAAzADADAAA0ACAMAQAApwMAIOsBAADDAwAw7AEAADYAEO0BAADDAwAw7gEBAKUDACH8AUAAoQMAIf0BQAChAwAhkQJAAKEDACGWAgEApQMAIboCAQClAwAhuwIBAKYDACG8AgEApgMAIQMBAACABQAguwIAAOADACC8AgAA4AMAIAwBAACnAwAg6wEAAMMDADDsAQAANgAQ7QEAAMMDADDuAQEAAAAB_AFAAKEDACH9AUAAoQMAIZECQAChAwAhlgIBAKUDACG6AgEAAAABuwIBAKYDACG8AgEApgMAIQMAAAA2ACACAAA3ADADAAA4ACADAAAAFwAgAgAAGAAwAwAAGQAgAQAAADIAIAEAAAA2ACABAAAAFwAgAQAAAAEAIBMLAACiAwAgEAAAwAMAIBEAAMEDACASAADCAwAg6wEAAL4DADDsAQAAPwAQ7QEAAL4DADDuAQEApQMAIfwBQAChAwAh_QFAAKEDACGiAgEApQMAIcYCAQClAwAhxwIgAKADACHIAgAAvwP2ASLJAgEApgMAIcoCAQCmAwAhywIgAKADACHMAgEApgMAIc0CQACfAwAhCAsAAJsEACAQAADtBQAgEQAA7gUAIBIAAO8FACDJAgAA4AMAIMoCAADgAwAgzAIAAOADACDNAgAA4AMAIAMAAAA_ACACAABAADADAAABACADAAAAPwAgAgAAQAAwAwAAAQAgAwAAAD8AIAIAAEAAMAMAAAEAIBALAADsBQAgEAAA6QUAIBEAAOoFACASAADrBQAg7gEBAAAAAfwBQAAAAAH9AUAAAAABogIBAAAAAcYCAQAAAAHHAiAAAAAByAIAAAD2AQLJAgEAAAABygIBAAAAAcsCIAAAAAHMAgEAAAABzQJAAAAAAQEYAABEACAM7gEBAAAAAfwBQAAAAAH9AUAAAAABogIBAAAAAcYCAQAAAAHHAiAAAAAByAIAAAD2AQLJAgEAAAABygIBAAAAAcsCIAAAAAHMAgEAAAABzQJAAAAAAQEYAABGADABGAAARgAwEAsAAMIFACAQAAC_BQAgEQAAwAUAIBIAAMEFACDuAQEA5AMAIfwBQADrAwAh_QFAAOsDACGiAgEA5AMAIcYCAQDkAwAhxwIgAOkDACHIAgAA5wP2ASLJAgEA6AMAIcoCAQDoAwAhywIgAOkDACHMAgEA6AMAIc0CQADqAwAhAgAAAAEAIBgAAEkAIAzuAQEA5AMAIfwBQADrAwAh_QFAAOsDACGiAgEA5AMAIcYCAQDkAwAhxwIgAOkDACHIAgAA5wP2ASLJAgEA6AMAIcoCAQDoAwAhywIgAOkDACHMAgEA6AMAIc0CQADqAwAhAgAAAD8AIBgAAEsAIAIAAAA_ACAYAABLACADAAAAAQAgHwAARAAgIAAASQAgAQAAAAEAIAEAAAA_ACAHCAAAvAUAICUAAL4FACAmAAC9BQAgyQIAAOADACDKAgAA4AMAIMwCAADgAwAgzQIAAOADACAP6wEAAL0DADDsAQAAUgAQ7QEAAL0DADDuAQEA7AIAIfwBQAD0AgAh_QFAAPQCACGiAgEA7AIAIcYCAQDsAgAhxwIgAPICACHIAgAA7wL2ASLJAgEA8QIAIcoCAQDxAgAhywIgAPICACHMAgEA8QIAIc0CQADzAgAhAwAAAD8AIAIAAFEAMCQAAFIAIAMAAAA_ACACAABAADADAAABACABAAAANAAgAQAAADQAIAMAAAAyACACAAAzADADAAA0ACADAAAAMgAgAgAAMwAwAwAANAAgAwAAADIAIAIAADMAMAMAADQAIA4BAAC7BQAg7gEBAAAAAfwBQAAAAAH9AUAAAAABlgIBAAAAAb0CAQAAAAG-AgEAAAABvwIBAAAAAcACAQAAAAHBAkAAAAABwgJAAAAAAcMCAQAAAAHEAgEAAAABxQIBAAAAAQEYAABaACAN7gEBAAAAAfwBQAAAAAH9AUAAAAABlgIBAAAAAb0CAQAAAAG-AgEAAAABvwIBAAAAAcACAQAAAAHBAkAAAAABwgJAAAAAAcMCAQAAAAHEAgEAAAABxQIBAAAAAQEYAABcADABGAAAXAAwDgEAALoFACDuAQEA5AMAIfwBQADrAwAh_QFAAOsDACGWAgEA5AMAIb0CAQDkAwAhvgIBAOQDACG_AgEA6AMAIcACAQDoAwAhwQJAAOoDACHCAkAA6gMAIcMCAQDoAwAhxAIBAOgDACHFAgEA6AMAIQIAAAA0ACAYAABfACAN7gEBAOQDACH8AUAA6wMAIf0BQADrAwAhlgIBAOQDACG9AgEA5AMAIb4CAQDkAwAhvwIBAOgDACHAAgEA6AMAIcECQADqAwAhwgJAAOoDACHDAgEA6AMAIcQCAQDoAwAhxQIBAOgDACECAAAAMgAgGAAAYQAgAgAAADIAIBgAAGEAIAMAAAA0ACAfAABaACAgAABfACABAAAANAAgAQAAADIAIAoIAAC3BQAgJQAAuQUAICYAALgFACC_AgAA4AMAIMACAADgAwAgwQIAAOADACDCAgAA4AMAIMMCAADgAwAgxAIAAOADACDFAgAA4AMAIBDrAQAAvAMAMOwBAABoABDtAQAAvAMAMO4BAQDsAgAh_AFAAPQCACH9AUAA9AIAIZYCAQDsAgAhvQIBAOwCACG-AgEA7AIAIb8CAQDxAgAhwAIBAPECACHBAkAA8wIAIcICQADzAgAhwwIBAPECACHEAgEA8QIAIcUCAQDxAgAhAwAAADIAIAIAAGcAMCQAAGgAIAMAAAAyACACAAAzADADAAA0ACABAAAAOAAgAQAAADgAIAMAAAA2ACACAAA3ADADAAA4ACADAAAANgAgAgAANwAwAwAAOAAgAwAAADYAIAIAADcAMAMAADgAIAkBAAC2BQAg7gEBAAAAAfwBQAAAAAH9AUAAAAABkQJAAAAAAZYCAQAAAAG6AgEAAAABuwIBAAAAAbwCAQAAAAEBGAAAcAAgCO4BAQAAAAH8AUAAAAAB_QFAAAAAAZECQAAAAAGWAgEAAAABugIBAAAAAbsCAQAAAAG8AgEAAAABARgAAHIAMAEYAAByADAJAQAAtQUAIO4BAQDkAwAh_AFAAOsDACH9AUAA6wMAIZECQADrAwAhlgIBAOQDACG6AgEA5AMAIbsCAQDoAwAhvAIBAOgDACECAAAAOAAgGAAAdQAgCO4BAQDkAwAh_AFAAOsDACH9AUAA6wMAIZECQADrAwAhlgIBAOQDACG6AgEA5AMAIbsCAQDoAwAhvAIBAOgDACECAAAANgAgGAAAdwAgAgAAADYAIBgAAHcAIAMAAAA4ACAfAABwACAgAAB1ACABAAAAOAAgAQAAADYAIAUIAACyBQAgJQAAtAUAICYAALMFACC7AgAA4AMAILwCAADgAwAgC-sBAAC7AwAw7AEAAH4AEO0BAAC7AwAw7gEBAOwCACH8AUAA9AIAIf0BQAD0AgAhkQJAAPQCACGWAgEA7AIAIboCAQDsAgAhuwIBAPECACG8AgEA8QIAIQMAAAA2ACACAAB9ADAkAAB-ACADAAAANgAgAgAANwAwAwAAOAAgCusBAAC5AwAw7AEAAIQBABDtAQAAuQMAMO4BAQAAAAH8AUAAoQMAIf0BQAChAwAhkQJAAKEDACG3AgEApQMAIbgCAQClAwAhuQIAALoDACABAAAAgQEAIAEAAACBAQAgCesBAAC5AwAw7AEAAIQBABDtAQAAuQMAMO4BAQClAwAh_AFAAKEDACH9AUAAoQMAIZECQAChAwAhtwIBAKUDACG4AgEApQMAIQADAAAAhAEAIAIAAIUBADADAACBAQAgAwAAAIQBACACAACFAQAwAwAAgQEAIAMAAACEAQAgAgAAhQEAMAMAAIEBACAG7gEBAAAAAfwBQAAAAAH9AUAAAAABkQJAAAAAAbcCAQAAAAG4AgEAAAABARgAAIkBACAG7gEBAAAAAfwBQAAAAAH9AUAAAAABkQJAAAAAAbcCAQAAAAG4AgEAAAABARgAAIsBADABGAAAiwEAMAbuAQEA5AMAIfwBQADrAwAh_QFAAOsDACGRAkAA6wMAIbcCAQDkAwAhuAIBAOQDACECAAAAgQEAIBgAAI4BACAG7gEBAOQDACH8AUAA6wMAIf0BQADrAwAhkQJAAOsDACG3AgEA5AMAIbgCAQDkAwAhAgAAAIQBACAYAACQAQAgAgAAAIQBACAYAACQAQAgAwAAAIEBACAfAACJAQAgIAAAjgEAIAEAAACBAQAgAQAAAIQBACADCAAArwUAICUAALEFACAmAACwBQAgCesBAAC4AwAw7AEAAJcBABDtAQAAuAMAMO4BAQDsAgAh_AFAAPQCACH9AUAA9AIAIZECQAD0AgAhtwIBAOwCACG4AgEA7AIAIQMAAACEAQAgAgAAlgEAMCQAAJcBACADAAAAhAEAIAIAAIUBADADAACBAQAgAQAAABkAIAEAAAAZACADAAAAFwAgAgAAGAAwAwAAGQAgAwAAABcAIAIAABgAMAMAABkAIAMAAAAXACACAAAYADADAAAZACARAQAAlwQAIAUAAJgEACAMAADTBAAgDgAAmQQAIO4BAQAAAAH4AQEAAAAB_AFAAAAAAf0BQAAAAAGRAkAAAAABlgIBAAAAAa4CAAAAtAICsAJAAAAAAbECAQAAAAGyAgEAAAABtAIQAAAAAbUCAQAAAAG2AkAAAAABARgAAJ8BACAN7gEBAAAAAfgBAQAAAAH8AUAAAAAB_QFAAAAAAZECQAAAAAGWAgEAAAABrgIAAAC0AgKwAkAAAAABsQIBAAAAAbICAQAAAAG0AhAAAAABtQIBAAAAAbYCQAAAAAEBGAAAoQEAMAEYAAChAQAwAQAAABsAIBEBAACHBAAgBQAAiAQAIAwAANEEACAOAACJBAAg7gEBAOQDACH4AQEA5AMAIfwBQADrAwAh_QFAAOsDACGRAkAA6gMAIZYCAQDkAwAhrgIAAIUEtAIisAJAAOsDACGxAgEA5AMAIbICAQDoAwAhtAIQAPYDACG1AgEA6AMAIbYCQADqAwAhAgAAABkAIBgAAKUBACAN7gEBAOQDACH4AQEA5AMAIfwBQADrAwAh_QFAAOsDACGRAkAA6gMAIZYCAQDkAwAhrgIAAIUEtAIisAJAAOsDACGxAgEA5AMAIbICAQDoAwAhtAIQAPYDACG1AgEA6AMAIbYCQADqAwAhAgAAABcAIBgAAKcBACACAAAAFwAgGAAApwEAIAEAAAAbACADAAAAGQAgHwAAnwEAICAAAKUBACABAAAAGQAgAQAAABcAIAkIAACqBQAgJQAArQUAICYAAKwFACBnAACrBQAgaAAArgUAIJECAADgAwAgsgIAAOADACC1AgAA4AMAILYCAADgAwAgEOsBAAC0AwAw7AEAAK8BABDtAQAAtAMAMO4BAQDrAgAh-AEBAOsCACH8AUAA9AIAIf0BQAD0AgAhkQJAAPMCACGWAgEA7AIAIa4CAAC1A7QCIrACQAD0AgAhsQIBAOwCACGyAgEA8AIAIbQCEACLAwAhtQIBAPECACG2AkAA8wIAIQMAAAAXACACAACuAQAwJAAArwEAIAMAAAAXACACAAAYADADAAAZACABAAAAIQAgAQAAACEAIAMAAAAfACACAAAgADADAAAhACADAAAAHwAgAgAAIAAwAwAAIQAgAwAAAB8AIAIAACAAMAMAACEAIAcNAACpBQAg7gEBAAAAAfgBAQAAAAGfAgIAAAABoAICAAAAAa8CAQAAAAGwAkAAAAABARgAALcBACAG7gEBAAAAAfgBAQAAAAGfAgIAAAABoAICAAAAAa8CAQAAAAGwAkAAAAABARgAALkBADABGAAAuQEAMAcNAACoBQAg7gEBAOQDACH4AQEA5AMAIZ8CAgD5AwAhoAICAPkDACGvAgEA5AMAIbACQADrAwAhAgAAACEAIBgAALwBACAG7gEBAOQDACH4AQEA5AMAIZ8CAgD5AwAhoAICAPkDACGvAgEA5AMAIbACQADrAwAhAgAAAB8AIBgAAL4BACACAAAAHwAgGAAAvgEAIAMAAAAhACAfAAC3AQAgIAAAvAEAIAEAAAAhACABAAAAHwAgBQgAAKMFACAlAACmBQAgJgAApQUAIGcAAKQFACBoAACnBQAgCesBAACzAwAw7AEAAMUBABDtAQAAswMAMO4BAQDrAgAh-AEBAOsCACGfAgIAjgMAIaACAgCOAwAhrwIBAOsCACGwAkAA9AIAIQMAAAAfACACAADEAQAwJAAAxQEAIAMAAAAfACACAAAgADADAAAhACABAAAABwAgAQAAAAcAIAMAAAAFACACAAAGADADAAAHACADAAAABQAgAgAABgAwAwAABwAgAwAAAAUAIAIAAAYAMAMAAAcAIBMEAACXBQAgBgAA-AQAIAkAAPkEACAKAAD6BAAgCwAA-wQAIA8AAPwEACDuAQEAAAAB8gEBAAAAAfcBAQAAAAH8AUAAAAAB_QFAAAAAAaICAQAAAAGnAgEAAAABqAIBAAAAAakCAQAAAAGqAhAAAAABqwIIAAAAAawCCAAAAAGuAgAAAK4CAgEYAADNAQAgDe4BAQAAAAHyAQEAAAAB9wEBAAAAAfwBQAAAAAH9AUAAAAABogIBAAAAAacCAQAAAAGoAgEAAAABqQIBAAAAAaoCEAAAAAGrAggAAAABrAIIAAAAAa4CAAAArgICARgAAM8BADABGAAAzwEAMBMEAACVBQAgBgAAuwQAIAkAALwEACAKAAC9BAAgCwAAvgQAIA8AAL8EACDuAQEA5AMAIfIBAQDkAwAh9wEBAOQDACH8AUAA6wMAIf0BQADrAwAhogIBAOQDACGnAgEA5AMAIagCAQDkAwAhqQIBAOgDACGqAhAA9gMAIasCCAC4BAAhrAIIALgEACGuAgAAuQSuAiICAAAABwAgGAAA0gEAIA3uAQEA5AMAIfIBAQDkAwAh9wEBAOQDACH8AUAA6wMAIf0BQADrAwAhogIBAOQDACGnAgEA5AMAIagCAQDkAwAhqQIBAOgDACGqAhAA9gMAIasCCAC4BAAhrAIIALgEACGuAgAAuQSuAiICAAAABQAgGAAA1AEAIAIAAAAFACAYAADUAQAgAwAAAAcAIB8AAM0BACAgAADSAQAgAQAAAAcAIAEAAAAFACAICAAAngUAICUAAKEFACAmAACgBQAgZwAAnwUAIGgAAKIFACCpAgAA4AMAIKsCAADgAwAgrAIAAOADACAQ6wEAAK0DADDsAQAA2wEAEO0BAACtAwAw7gEBAOsCACHyAQEA7AIAIfcBAQDrAgAh_AFAAPQCACH9AUAA9AIAIaICAQDsAgAhpwIBAOwCACGoAgEA7AIAIakCAQDxAgAhqgIQAIsDACGrAggArgMAIawCCACuAwAhrgIAAK8DrgIiAwAAAAUAIAIAANoBADAkAADbAQAgAwAAAAUAIAIAAAYAMAMAAAcAIAEAAAALACABAAAACwAgAwAAAAkAIAIAAAoAMAMAAAsAIAMAAAAJACACAAAKADADAAALACADAAAACQAgAgAACgAwAwAACwAgBgUAAJ0FACDuAQEAAAAB-AEBAAAAAaQCAQAAAAGlAgEAAAABpgIgAAAAAQEYAADjAQAgBe4BAQAAAAH4AQEAAAABpAIBAAAAAaUCAQAAAAGmAiAAAAABARgAAOUBADABGAAA5QEAMAYFAACcBQAg7gEBAOQDACH4AQEA5AMAIaQCAQDkAwAhpQIBAOQDACGmAiAA6QMAIQIAAAALACAYAADoAQAgBe4BAQDkAwAh-AEBAOQDACGkAgEA5AMAIaUCAQDkAwAhpgIgAOkDACECAAAACQAgGAAA6gEAIAIAAAAJACAYAADqAQAgAwAAAAsAIB8AAOMBACAgAADoAQAgAQAAAAsAIAEAAAAJACADCAAAmQUAICUAAJsFACAmAACaBQAgCOsBAACsAwAw7AEAAPEBABDtAQAArAMAMO4BAQDrAgAh-AEBAOsCACGkAgEA7AIAIaUCAQDsAgAhpgIgAPICACEDAAAACQAgAgAA8AEAMCQAAPEBACADAAAACQAgAgAACgAwAwAACwAgAQAAAA8AIAEAAAAPACADAAAADQAgAgAADgAwAwAADwAgAwAAAA0AIAIAAA4AMAMAAA8AIAMAAAANACACAAAOADADAAAPACAEBwAAmAUAIO4BAQAAAAGiAgEAAAABowIBAAAAAQEYAAD5AQAgA-4BAQAAAAGiAgEAAAABowIBAAAAAQEYAAD7AQAwARgAAPsBADAEBwAAjQUAIO4BAQDkAwAhogIBAOQDACGjAgEA6AMAIQIAAAAPACAYAAD-AQAgA-4BAQDkAwAhogIBAOQDACGjAgEA6AMAIQIAAAANACAYAACAAgAgAgAAAA0AIBgAAIACACADAAAADwAgHwAA-QEAICAAAP4BACABAAAADwAgAQAAAA0AIAQIAACKBQAgJQAAjAUAICYAAIsFACCjAgAA4AMAIAbrAQAAqwMAMOwBAACHAgAQ7QEAAKsDADDuAQEA6wIAIaICAQDsAgAhowIBAPECACEDAAAADQAgAgAAhgIAMCQAAIcCACADAAAADQAgAgAADgAwAwAADwAgAQAAABUAIAEAAAAVACADAAAAEwAgAgAAFAAwAwAAFQAgAwAAABMAIAIAABQAMAMAABUAIAMAAAATACACAAAUADADAAAVACAIBQAAiQUAIO4BAQAAAAH4AQEAAAABkgIgAAAAAZ4CAgAAAAGfAgIAAAABoAICAAAAAaECEAAAAAEBGAAAjwIAIAfuAQEAAAAB-AEBAAAAAZICIAAAAAGeAgIAAAABnwICAAAAAaACAgAAAAGhAhAAAAABARgAAJECADABGAAAkQIAMAgFAACIBQAg7gEBAOQDACH4AQEA5AMAIZICIADpAwAhngICAPkDACGfAgIA-QMAIaACAgD5AwAhoQIQAPcDACECAAAAFQAgGAAAlAIAIAfuAQEA5AMAIfgBAQDkAwAhkgIgAOkDACGeAgIA-QMAIZ8CAgD5AwAhoAICAPkDACGhAhAA9wMAIQIAAAATACAYAACWAgAgAgAAABMAIBgAAJYCACADAAAAFQAgHwAAjwIAICAAAJQCACABAAAAFQAgAQAAABMAIAYIAACDBQAgJQAAhgUAICYAAIUFACBnAACEBQAgaAAAhwUAIKECAADgAwAgCusBAACqAwAw7AEAAJ0CABDtAQAAqgMAMO4BAQDrAgAh-AEBAOsCACGSAiAA8gIAIZ4CAgCOAwAhnwICAI4DACGgAgIAjgMAIaECEACMAwAhAwAAABMAIAIAAJwCADAkAACdAgAgAwAAABMAIAIAABQAMAMAABUAIBEBAACnAwAgBwAAqAMAIA8AAKkDACDrAQAApAMAMOwBAAADABDtAQAApAMAMO4BAQAAAAH8AUAAoQMAIf0BQAChAwAhlgIBAAAAAZcCAQClAwAhmAIBAKYDACGZAgEApgMAIZoCAQCmAwAhmwIBAKYDACGcAiAAoAMAIZ0CAQAAAAEBAAAAoAIAIAEAAACgAgAgCAEAAIAFACAHAACBBQAgDwAAggUAIJgCAADgAwAgmQIAAOADACCaAgAA4AMAIJsCAADgAwAgnQIAAOADACADAAAAAwAgAgAAowIAMAMAAKACACADAAAAAwAgAgAAowIAMAMAAKACACADAAAAAwAgAgAAowIAMAMAAKACACAOAQAA_QQAIAcAAP4EACAPAAD_BAAg7gEBAAAAAfwBQAAAAAH9AUAAAAABlgIBAAAAAZcCAQAAAAGYAgEAAAABmQIBAAAAAZoCAQAAAAGbAgEAAAABnAIgAAAAAZ0CAQAAAAEBGAAApwIAIAvuAQEAAAAB_AFAAAAAAf0BQAAAAAGWAgEAAAABlwIBAAAAAZgCAQAAAAGZAgEAAAABmgIBAAAAAZsCAQAAAAGcAiAAAAABnQIBAAAAAQEYAACpAgAwARgAAKkCADAOAQAAnwQAIAcAAKAEACAPAAChBAAg7gEBAOQDACH8AUAA6wMAIf0BQADrAwAhlgIBAOQDACGXAgEA5AMAIZgCAQDoAwAhmQIBAOgDACGaAgEA6AMAIZsCAQDoAwAhnAIgAOkDACGdAgEA6AMAIQIAAACgAgAgGAAArAIAIAvuAQEA5AMAIfwBQADrAwAh_QFAAOsDACGWAgEA5AMAIZcCAQDkAwAhmAIBAOgDACGZAgEA6AMAIZoCAQDoAwAhmwIBAOgDACGcAiAA6QMAIZ0CAQDoAwAhAgAAAAMAIBgAAK4CACACAAAAAwAgGAAArgIAIAMAAACgAgAgHwAApwIAICAAAKwCACABAAAAoAIAIAEAAAADACAICAAAnAQAICUAAJ4EACAmAACdBAAgmAIAAOADACCZAgAA4AMAIJoCAADgAwAgmwIAAOADACCdAgAA4AMAIA7rAQAAowMAMOwBAAC1AgAQ7QEAAKMDADDuAQEA6wIAIfwBQAD0AgAh_QFAAPQCACGWAgEA7AIAIZcCAQDsAgAhmAIBAPECACGZAgEA8QIAIZoCAQDxAgAhmwIBAPECACGcAiAA8gIAIZ0CAQDxAgAhAwAAAAMAIAIAALQCADAkAAC1AgAgAwAAAAMAIAIAAKMCADADAACgAgAgDwsAAKIDACDrAQAAmQMAMOwBAAAbABDtAQAAmQMAMO4BAQAAAAH8AUAAoQMAIYkCAQAAAAGLAgAAmgOLAiKMAhAAmwMAIY0CEACcAwAhjgIQAJwDACGPAgIAnQMAIZACAgCeAwAhkQJAAJ8DACGSAiAAoAMAIQEAAAC4AgAgAQAAALgCACAFCwAAmwQAII0CAADgAwAgjgIAAOADACCPAgAA4AMAIJECAADgAwAgAwAAABsAIAIAALsCADADAAC4AgAgAwAAABsAIAIAALsCADADAAC4AgAgAwAAABsAIAIAALsCADADAAC4AgAgDAsAAJoEACDuAQEAAAAB_AFAAAAAAYkCAQAAAAGLAgAAAIsCAowCEAAAAAGNAhAAAAABjgIQAAAAAY8CAgAAAAGQAgIAAAABkQJAAAAAAZICIAAAAAEBGAAAvwIAIAvuAQEAAAAB_AFAAAAAAYkCAQAAAAGLAgAAAIsCAowCEAAAAAGNAhAAAAABjgIQAAAAAY8CAgAAAAGQAgIAAAABkQJAAAAAAZICIAAAAAEBGAAAwQIAMAEYAADBAgAwDAsAAPoDACDuAQEA5AMAIfwBQADrAwAhiQIBAOQDACGLAgAA9QOLAiKMAhAA9gMAIY0CEAD3AwAhjgIQAPcDACGPAgIA-AMAIZACAgD5AwAhkQJAAOoDACGSAiAA6QMAIQIAAAC4AgAgGAAAxAIAIAvuAQEA5AMAIfwBQADrAwAhiQIBAOQDACGLAgAA9QOLAiKMAhAA9gMAIY0CEAD3AwAhjgIQAPcDACGPAgIA-AMAIZACAgD5AwAhkQJAAOoDACGSAiAA6QMAIQIAAAAbACAYAADGAgAgAgAAABsAIBgAAMYCACADAAAAuAIAIB8AAL8CACAgAADEAgAgAQAAALgCACABAAAAGwAgCQgAAPADACAlAADzAwAgJgAA8gMAIGcAAPEDACBoAAD0AwAgjQIAAOADACCOAgAA4AMAII8CAADgAwAgkQIAAOADACAO6wEAAIkDADDsAQAAzQIAEO0BAACJAwAw7gEBAOsCACH8AUAA9AIAIYkCAQDsAgAhiwIAAIoDiwIijAIQAIsDACGNAhAAjAMAIY4CEACMAwAhjwICAI0DACGQAgIAjgMAIZECQADzAgAhkgIgAPICACEDAAAAGwAgAgAAzAIAMCQAAM0CACADAAAAGwAgAgAAuwIAMAMAALgCACABAAAAJgAgAQAAACYAIAMAAAAkACACAAAlADADAAAmACADAAAAJAAgAgAAJQAwAwAAJgAgAwAAACQAIAIAACUAMAMAACYAIA8EAADuAwAgBQAA7wMAIO4BAQAAAAHvAQEAAAAB8AEBAAAAAfIBAAAA8gEC9AEAAAD0AQL2AQAAAPYBAvcBAQAAAAH4AQEAAAAB-QEBAAAAAfoBIAAAAAH7AUAAAAAB_AFAAAAAAf0BQAAAAAEBGAAA1QIAIA3uAQEAAAAB7wEBAAAAAfABAQAAAAHyAQAAAPIBAvQBAAAA9AEC9gEAAAD2AQL3AQEAAAAB-AEBAAAAAfkBAQAAAAH6ASAAAAAB-wFAAAAAAfwBQAAAAAH9AUAAAAABARgAANcCADABGAAA1wIAMAEAAAADACABAAAABQAgDwQAAOwDACAFAADtAwAg7gEBAOQDACHvAQEA5AMAIfABAQDkAwAh8gEAAOUD8gEi9AEAAOYD9AEi9gEAAOcD9gEi9wEBAOgDACH4AQEA6AMAIfkBAQDoAwAh-gEgAOkDACH7AUAA6gMAIfwBQADrAwAh_QFAAOsDACECAAAAJgAgGAAA3AIAIA3uAQEA5AMAIe8BAQDkAwAh8AEBAOQDACHyAQAA5QPyASL0AQAA5gP0ASL2AQAA5wP2ASL3AQEA6AMAIfgBAQDoAwAh-QEBAOgDACH6ASAA6QMAIfsBQADqAwAh_AFAAOsDACH9AUAA6wMAIQIAAAAkACAYAADeAgAgAgAAACQAIBgAAN4CACABAAAAAwAgAQAAAAUAIAMAAAAmACAfAADVAgAgIAAA3AIAIAEAAAAmACABAAAAJAAgBwgAAOEDACAlAADjAwAgJgAA4gMAIPcBAADgAwAg-AEAAOADACD5AQAA4AMAIPsBAADgAwAgEOsBAADqAgAw7AEAAOcCABDtAQAA6gIAMO4BAQDrAgAh7wEBAOwCACHwAQEA7AIAIfIBAADtAvIBIvQBAADuAvQBIvYBAADvAvYBIvcBAQDwAgAh-AEBAPACACH5AQEA8QIAIfoBIADyAgAh-wFAAPMCACH8AUAA9AIAIf0BQAD0AgAhAwAAACQAIAIAAOYCADAkAADnAgAgAwAAACQAIAIAACUAMAMAACYAIBDrAQAA6gIAMOwBAADnAgAQ7QEAAOoCADDuAQEA6wIAIe8BAQDsAgAh8AEBAOwCACHyAQAA7QLyASL0AQAA7gL0ASL2AQAA7wL2ASL3AQEA8AIAIfgBAQDwAgAh-QEBAPECACH6ASAA8gIAIfsBQADzAgAh_AFAAPQCACH9AUAA9AIAIQsIAAD2AgAgJQAAhwMAICYAAIcDACD-AQEAAAAB_wEBAAAABIACAQAAAASBAgEAAAABggIBAAAAAYMCAQAAAAGEAgEAAAABhQIBAIgDACEOCAAA9gIAICUAAIcDACAmAACHAwAg_gEBAAAAAf8BAQAAAASAAgEAAAAEgQIBAAAAAYICAQAAAAGDAgEAAAABhAIBAAAAAYUCAQCGAwAhhgIBAAAAAYcCAQAAAAGIAgEAAAABBwgAAPYCACAlAACFAwAgJgAAhQMAIP4BAAAA8gEC_wEAAADyAQiAAgAAAPIBCIUCAACEA_IBIgcIAAD2AgAgJQAAgwMAICYAAIMDACD-AQAAAPQBAv8BAAAA9AEIgAIAAAD0AQiFAgAAggP0ASIHCAAA9gIAICUAAIEDACAmAACBAwAg_gEAAAD2AQL_AQAAAPYBCIACAAAA9gEIhQIAAIAD9gEiCwgAAPkCACAlAAD-AgAgJgAA_gIAIP4BAQAAAAH_AQEAAAAFgAIBAAAABYECAQAAAAGCAgEAAAABgwIBAAAAAYQCAQAAAAGFAgEA_wIAIQ4IAAD5AgAgJQAA_gIAICYAAP4CACD-AQEAAAAB_wEBAAAABYACAQAAAAWBAgEAAAABggIBAAAAAYMCAQAAAAGEAgEAAAABhQIBAP0CACGGAgEAAAABhwIBAAAAAYgCAQAAAAEFCAAA9gIAICUAAPwCACAmAAD8AgAg_gEgAAAAAYUCIAD7AgAhCwgAAPkCACAlAAD6AgAgJgAA-gIAIP4BQAAAAAH_AUAAAAAFgAJAAAAABYECQAAAAAGCAkAAAAABgwJAAAAAAYQCQAAAAAGFAkAA-AIAIQsIAAD2AgAgJQAA9wIAICYAAPcCACD-AUAAAAAB_wFAAAAABIACQAAAAASBAkAAAAABggJAAAAAAYMCQAAAAAGEAkAAAAABhQJAAPUCACELCAAA9gIAICUAAPcCACAmAAD3AgAg_gFAAAAAAf8BQAAAAASAAkAAAAAEgQJAAAAAAYICQAAAAAGDAkAAAAABhAJAAAAAAYUCQAD1AgAhCP4BAgAAAAH_AQIAAAAEgAICAAAABIECAgAAAAGCAgIAAAABgwICAAAAAYQCAgAAAAGFAgIA9gIAIQj-AUAAAAAB_wFAAAAABIACQAAAAASBAkAAAAABggJAAAAAAYMCQAAAAAGEAkAAAAABhQJAAPcCACELCAAA-QIAICUAAPoCACAmAAD6AgAg_gFAAAAAAf8BQAAAAAWAAkAAAAAFgQJAAAAAAYICQAAAAAGDAkAAAAABhAJAAAAAAYUCQAD4AgAhCP4BAgAAAAH_AQIAAAAFgAICAAAABYECAgAAAAGCAgIAAAABgwICAAAAAYQCAgAAAAGFAgIA-QIAIQj-AUAAAAAB_wFAAAAABYACQAAAAAWBAkAAAAABggJAAAAAAYMCQAAAAAGEAkAAAAABhQJAAPoCACEFCAAA9gIAICUAAPwCACAmAAD8AgAg_gEgAAAAAYUCIAD7AgAhAv4BIAAAAAGFAiAA_AIAIQ4IAAD5AgAgJQAA_gIAICYAAP4CACD-AQEAAAAB_wEBAAAABYACAQAAAAWBAgEAAAABggIBAAAAAYMCAQAAAAGEAgEAAAABhQIBAP0CACGGAgEAAAABhwIBAAAAAYgCAQAAAAEL_gEBAAAAAf8BAQAAAAWAAgEAAAAFgQIBAAAAAYICAQAAAAGDAgEAAAABhAIBAAAAAYUCAQD-AgAhhgIBAAAAAYcCAQAAAAGIAgEAAAABCwgAAPkCACAlAAD-AgAgJgAA_gIAIP4BAQAAAAH_AQEAAAAFgAIBAAAABYECAQAAAAGCAgEAAAABgwIBAAAAAYQCAQAAAAGFAgEA_wIAIQcIAAD2AgAgJQAAgQMAICYAAIEDACD-AQAAAPYBAv8BAAAA9gEIgAIAAAD2AQiFAgAAgAP2ASIE_gEAAAD2AQL_AQAAAPYBCIACAAAA9gEIhQIAAIED9gEiBwgAAPYCACAlAACDAwAgJgAAgwMAIP4BAAAA9AEC_wEAAAD0AQiAAgAAAPQBCIUCAACCA_QBIgT-AQAAAPQBAv8BAAAA9AEIgAIAAAD0AQiFAgAAgwP0ASIHCAAA9gIAICUAAIUDACAmAACFAwAg_gEAAADyAQL_AQAAAPIBCIACAAAA8gEIhQIAAIQD8gEiBP4BAAAA8gEC_wEAAADyAQiAAgAAAPIBCIUCAACFA_IBIg4IAAD2AgAgJQAAhwMAICYAAIcDACD-AQEAAAAB_wEBAAAABIACAQAAAASBAgEAAAABggIBAAAAAYMCAQAAAAGEAgEAAAABhQIBAIYDACGGAgEAAAABhwIBAAAAAYgCAQAAAAEL_gEBAAAAAf8BAQAAAASAAgEAAAAEgQIBAAAAAYICAQAAAAGDAgEAAAABhAIBAAAAAYUCAQCHAwAhhgIBAAAAAYcCAQAAAAGIAgEAAAABCwgAAPYCACAlAACHAwAgJgAAhwMAIP4BAQAAAAH_AQEAAAAEgAIBAAAABIECAQAAAAGCAgEAAAABgwIBAAAAAYQCAQAAAAGFAgEAiAMAIQ7rAQAAiQMAMOwBAADNAgAQ7QEAAIkDADDuAQEA6wIAIfwBQAD0AgAhiQIBAOwCACGLAgAAigOLAiKMAhAAiwMAIY0CEACMAwAhjgIQAIwDACGPAgIAjQMAIZACAgCOAwAhkQJAAPMCACGSAiAA8gIAIQcIAAD2AgAgJQAAmAMAICYAAJgDACD-AQAAAIsCAv8BAAAAiwIIgAIAAACLAgiFAgAAlwOLAiINCAAA9gIAICUAAJYDACAmAACWAwAgZwAAlgMAIGgAAJYDACD-ARAAAAAB_wEQAAAABIACEAAAAASBAhAAAAABggIQAAAAAYMCEAAAAAGEAhAAAAABhQIQAJUDACENCAAA-QIAICUAAJQDACAmAACUAwAgZwAAlAMAIGgAAJQDACD-ARAAAAAB_wEQAAAABYACEAAAAAWBAhAAAAABggIQAAAAAYMCEAAAAAGEAhAAAAABhQIQAJMDACENCAAA-QIAICUAAPkCACAmAAD5AgAgZwAAkgMAIGgAAPkCACD-AQIAAAAB_wECAAAABYACAgAAAAWBAgIAAAABggICAAAAAYMCAgAAAAGEAgIAAAABhQICAJEDACENCAAA9gIAICUAAPYCACAmAAD2AgAgZwAAkAMAIGgAAPYCACD-AQIAAAAB_wECAAAABIACAgAAAASBAgIAAAABggICAAAAAYMCAgAAAAGEAgIAAAABhQICAI8DACENCAAA9gIAICUAAPYCACAmAAD2AgAgZwAAkAMAIGgAAPYCACD-AQIAAAAB_wECAAAABIACAgAAAASBAgIAAAABggICAAAAAYMCAgAAAAGEAgIAAAABhQICAI8DACEI_gEIAAAAAf8BCAAAAASAAggAAAAEgQIIAAAAAYICCAAAAAGDAggAAAABhAIIAAAAAYUCCACQAwAhDQgAAPkCACAlAAD5AgAgJgAA-QIAIGcAAJIDACBoAAD5AgAg_gECAAAAAf8BAgAAAAWAAgIAAAAFgQICAAAAAYICAgAAAAGDAgIAAAABhAICAAAAAYUCAgCRAwAhCP4BCAAAAAH_AQgAAAAFgAIIAAAABYECCAAAAAGCAggAAAABgwIIAAAAAYQCCAAAAAGFAggAkgMAIQ0IAAD5AgAgJQAAlAMAICYAAJQDACBnAACUAwAgaAAAlAMAIP4BEAAAAAH_ARAAAAAFgAIQAAAABYECEAAAAAGCAhAAAAABgwIQAAAAAYQCEAAAAAGFAhAAkwMAIQj-ARAAAAAB_wEQAAAABYACEAAAAAWBAhAAAAABggIQAAAAAYMCEAAAAAGEAhAAAAABhQIQAJQDACENCAAA9gIAICUAAJYDACAmAACWAwAgZwAAlgMAIGgAAJYDACD-ARAAAAAB_wEQAAAABIACEAAAAASBAhAAAAABggIQAAAAAYMCEAAAAAGEAhAAAAABhQIQAJUDACEI_gEQAAAAAf8BEAAAAASAAhAAAAAEgQIQAAAAAYICEAAAAAGDAhAAAAABhAIQAAAAAYUCEACWAwAhBwgAAPYCACAlAACYAwAgJgAAmAMAIP4BAAAAiwIC_wEAAACLAgiAAgAAAIsCCIUCAACXA4sCIgT-AQAAAIsCAv8BAAAAiwIIgAIAAACLAgiFAgAAmAOLAiIPCwAAogMAIOsBAACZAwAw7AEAABsAEO0BAACZAwAw7gEBAMwDACH8AUAAoQMAIYkCAQClAwAhiwIAAJoDiwIijAIQAJsDACGNAhAAnAMAIY4CEACcAwAhjwICAJ0DACGQAgIAngMAIZECQACfAwAhkgIgAKADACEE_gEAAACLAgL_AQAAAIsCCIACAAAAiwIIhQIAAJgDiwIiCP4BEAAAAAH_ARAAAAAEgAIQAAAABIECEAAAAAGCAhAAAAABgwIQAAAAAYQCEAAAAAGFAhAAlgMAIQj-ARAAAAAB_wEQAAAABYACEAAAAAWBAhAAAAABggIQAAAAAYMCEAAAAAGEAhAAAAABhQIQAJQDACEI_gECAAAAAf8BAgAAAAWAAgIAAAAFgQICAAAAAYICAgAAAAGDAgIAAAABhAICAAAAAYUCAgD5AgAhCP4BAgAAAAH_AQIAAAAEgAICAAAABIECAgAAAAGCAgIAAAABgwICAAAAAYQCAgAAAAGFAgIA9gIAIQj-AUAAAAAB_wFAAAAABYACQAAAAAWBAkAAAAABggJAAAAAAYMCQAAAAAGEAkAAAAABhQJAAPoCACEC_gEgAAAAAYUCIAD8AgAhCP4BQAAAAAH_AUAAAAAEgAJAAAAABIECQAAAAAGCAkAAAAABgwJAAAAAAYQCQAAAAAGFAkAA9wIAIQOTAgAAFwAglAIAABcAIJUCAAAXACAO6wEAAKMDADDsAQAAtQIAEO0BAACjAwAw7gEBAOsCACH8AUAA9AIAIf0BQAD0AgAhlgIBAOwCACGXAgEA7AIAIZgCAQDxAgAhmQIBAPECACGaAgEA8QIAIZsCAQDxAgAhnAIgAPICACGdAgEA8QIAIREBAACnAwAgBwAAqAMAIA8AAKkDACDrAQAApAMAMOwBAAADABDtAQAApAMAMO4BAQDMAwAh_AFAAKEDACH9AUAAoQMAIZYCAQClAwAhlwIBAKUDACGYAgEApgMAIZkCAQCmAwAhmgIBAKYDACGbAgEApgMAIZwCIACgAwAhnQIBAKYDACEL_gEBAAAAAf8BAQAAAASAAgEAAAAEgQIBAAAAAYICAQAAAAGDAgEAAAABhAIBAAAAAYUCAQCHAwAhhgIBAAAAAYcCAQAAAAGIAgEAAAABC_4BAQAAAAH_AQEAAAAFgAIBAAAABYECAQAAAAGCAgEAAAABgwIBAAAAAYQCAQAAAAGFAgEA_gIAIYYCAQAAAAGHAgEAAAABiAIBAAAAARULAACiAwAgEAAAwAMAIBEAAMEDACASAADCAwAg6wEAAL4DADDsAQAAPwAQ7QEAAL4DADDuAQEApQMAIfwBQAChAwAh_QFAAKEDACGiAgEApQMAIcYCAQClAwAhxwIgAKADACHIAgAAvwP2ASLJAgEApgMAIcoCAQCmAwAhywIgAKADACHMAgEApgMAIc0CQACfAwAh0AIAAD8AINECAAA_ACADkwIAAAUAIJQCAAAFACCVAgAABQAgA5MCAAAkACCUAgAAJAAglQIAACQAIArrAQAAqgMAMOwBAACdAgAQ7QEAAKoDADDuAQEA6wIAIfgBAQDrAgAhkgIgAPICACGeAgIAjgMAIZ8CAgCOAwAhoAICAI4DACGhAhAAjAMAIQbrAQAAqwMAMOwBAACHAgAQ7QEAAKsDADDuAQEA6wIAIaICAQDsAgAhowIBAPECACEI6wEAAKwDADDsAQAA8QEAEO0BAACsAwAw7gEBAOsCACH4AQEA6wIAIaQCAQDsAgAhpQIBAOwCACGmAiAA8gIAIRDrAQAArQMAMOwBAADbAQAQ7QEAAK0DADDuAQEA6wIAIfIBAQDsAgAh9wEBAOsCACH8AUAA9AIAIf0BQAD0AgAhogIBAOwCACGnAgEA7AIAIagCAQDsAgAhqQIBAPECACGqAhAAiwMAIasCCACuAwAhrAIIAK4DACGuAgAArwOuAiINCAAA-QIAICUAAJIDACAmAACSAwAgZwAAkgMAIGgAAJIDACD-AQgAAAAB_wEIAAAABYACCAAAAAWBAggAAAABggIIAAAAAYMCCAAAAAGEAggAAAABhQIIALIDACEHCAAA9gIAICUAALEDACAmAACxAwAg_gEAAACuAgL_AQAAAK4CCIACAAAArgIIhQIAALADrgIiBwgAAPYCACAlAACxAwAgJgAAsQMAIP4BAAAArgIC_wEAAACuAgiAAgAAAK4CCIUCAACwA64CIgT-AQAAAK4CAv8BAAAArgIIgAIAAACuAgiFAgAAsQOuAiINCAAA-QIAICUAAJIDACAmAACSAwAgZwAAkgMAIGgAAJIDACD-AQgAAAAB_wEIAAAABYACCAAAAAWBAggAAAABggIIAAAAAYMCCAAAAAGEAggAAAABhQIIALIDACEJ6wEAALMDADDsAQAAxQEAEO0BAACzAwAw7gEBAOsCACH4AQEA6wIAIZ8CAgCOAwAhoAICAI4DACGvAgEA6wIAIbACQAD0AgAhEOsBAAC0AwAw7AEAAK8BABDtAQAAtAMAMO4BAQDrAgAh-AEBAOsCACH8AUAA9AIAIf0BQAD0AgAhkQJAAPMCACGWAgEA7AIAIa4CAAC1A7QCIrACQAD0AgAhsQIBAOwCACGyAgEA8AIAIbQCEACLAwAhtQIBAPECACG2AkAA8wIAIQcIAAD2AgAgJQAAtwMAICYAALcDACD-AQAAALQCAv8BAAAAtAIIgAIAAAC0AgiFAgAAtgO0AiIHCAAA9gIAICUAALcDACAmAAC3AwAg_gEAAAC0AgL_AQAAALQCCIACAAAAtAIIhQIAALYDtAIiBP4BAAAAtAIC_wEAAAC0AgiAAgAAALQCCIUCAAC3A7QCIgnrAQAAuAMAMOwBAACXAQAQ7QEAALgDADDuAQEA7AIAIfwBQAD0AgAh_QFAAPQCACGRAkAA9AIAIbcCAQDsAgAhuAIBAOwCACEJ6wEAALkDADDsAQAAhAEAEO0BAAC5AwAw7gEBAKUDACH8AUAAoQMAIf0BQAChAwAhkQJAAKEDACG3AgEApQMAIbgCAQClAwAhArcCAQAAAAG4AgEAAAABC-sBAAC7AwAw7AEAAH4AEO0BAAC7AwAw7gEBAOwCACH8AUAA9AIAIf0BQAD0AgAhkQJAAPQCACGWAgEA7AIAIboCAQDsAgAhuwIBAPECACG8AgEA8QIAIRDrAQAAvAMAMOwBAABoABDtAQAAvAMAMO4BAQDsAgAh_AFAAPQCACH9AUAA9AIAIZYCAQDsAgAhvQIBAOwCACG-AgEA7AIAIb8CAQDxAgAhwAIBAPECACHBAkAA8wIAIcICQADzAgAhwwIBAPECACHEAgEA8QIAIcUCAQDxAgAhD-sBAAC9AwAw7AEAAFIAEO0BAAC9AwAw7gEBAOwCACH8AUAA9AIAIf0BQAD0AgAhogIBAOwCACHGAgEA7AIAIccCIADyAgAhyAIAAO8C9gEiyQIBAPECACHKAgEA8QIAIcsCIADyAgAhzAIBAPECACHNAkAA8wIAIRMLAACiAwAgEAAAwAMAIBEAAMEDACASAADCAwAg6wEAAL4DADDsAQAAPwAQ7QEAAL4DADDuAQEApQMAIfwBQAChAwAh_QFAAKEDACGiAgEApQMAIcYCAQClAwAhxwIgAKADACHIAgAAvwP2ASLJAgEApgMAIcoCAQCmAwAhywIgAKADACHMAgEApgMAIc0CQACfAwAhBP4BAAAA9gEC_wEAAAD2AQiAAgAAAPYBCIUCAACBA_YBIhMBAACnAwAgBwAAqAMAIA8AAKkDACDrAQAApAMAMOwBAAADABDtAQAApAMAMO4BAQDMAwAh_AFAAKEDACH9AUAAoQMAIZYCAQClAwAhlwIBAKUDACGYAgEApgMAIZkCAQCmAwAhmgIBAKYDACGbAgEApgMAIZwCIACgAwAhnQIBAKYDACHQAgAAAwAg0QIAAAMAIAOTAgAAMgAglAIAADIAIJUCAAAyACADkwIAADYAIJQCAAA2ACCVAgAANgAgDAEAAKcDACDrAQAAwwMAMOwBAAA2ABDtAQAAwwMAMO4BAQClAwAh_AFAAKEDACH9AUAAoQMAIZECQAChAwAhlgIBAKUDACG6AgEApQMAIbsCAQCmAwAhvAIBAKYDACECvQIBAAAAAb4CAQAAAAERAQAApwMAIOsBAADFAwAw7AEAADIAEO0BAADFAwAw7gEBAKUDACH8AUAAoQMAIf0BQAChAwAhlgIBAKUDACG9AgEApQMAIb4CAQClAwAhvwIBAKYDACHAAgEApgMAIcECQACfAwAhwgJAAJ8DACHDAgEApgMAIcQCAQCmAwAhxQIBAKYDACESBAAAwAMAIAUAAMoDACDrAQAAxgMAMOwBAAAkABDtAQAAxgMAMO4BAQDMAwAh7wEBAKUDACHwAQEApQMAIfIBAADHA_IBIvQBAADIA_QBIvYBAAC_A_YBIvcBAQDJAwAh-AEBAMkDACH5AQEApgMAIfoBIACgAwAh-wFAAJ8DACH8AUAAoQMAIf0BQAChAwAhBP4BAAAA8gEC_wEAAADyAQiAAgAAAPIBCIUCAACFA_IBIgT-AQAAAPQBAv8BAAAA9AEIgAIAAAD0AQiFAgAAgwP0ASII_gEBAAAAAf8BAQAAAAWAAgEAAAAFgQIBAAAAAYICAQAAAAGDAgEAAAABhAIBAAAAAYUCAQDLAwAhGAQAANwDACAGAADdAwAgCQAA3gMAIAoAAN8DACALAACiAwAgDwAAqQMAIOsBAADZAwAw7AEAAAUAEO0BAADZAwAw7gEBAMwDACHyAQEApQMAIfcBAQDMAwAh_AFAAKEDACH9AUAAoQMAIaICAQClAwAhpwIBAKUDACGoAgEApQMAIakCAQCmAwAhqgIQAJsDACGrAggA2gMAIawCCADaAwAhrgIAANsDrgIi0AIAAAUAINECAAAFACAI_gEBAAAAAf8BAQAAAAWAAgEAAAAFgQIBAAAAAYICAQAAAAGDAgEAAAABhAIBAAAAAYUCAQDLAwAhCP4BAQAAAAH_AQEAAAAEgAIBAAAABIECAQAAAAGCAgEAAAABgwIBAAAAAYQCAQAAAAGFAgEAzQMAIQj-AQEAAAAB_wEBAAAABIACAQAAAASBAgEAAAABggIBAAAAAYMCAQAAAAGEAgEAAAABhQIBAM0DACED-AEBAAAAAZ8CAgAAAAGwAkAAAAABCg0AANADACDrAQAAzwMAMOwBAAAfABDtAQAAzwMAMO4BAQDMAwAh-AEBAMwDACGfAgIAngMAIaACAgCeAwAhrwIBAMwDACGwAkAAoQMAIRYBAACnAwAgBQAA0wMAIAwAANQDACAOAADVAwAg6wEAANEDADDsAQAAFwAQ7QEAANEDADDuAQEAzAMAIfgBAQDMAwAh_AFAAKEDACH9AUAAoQMAIZECQACfAwAhlgIBAKUDACGuAgAA0gO0AiKwAkAAoQMAIbECAQClAwAhsgIBAMkDACG0AhAAmwMAIbUCAQCmAwAhtgJAAJ8DACHQAgAAFwAg0QIAABcAIBQBAACnAwAgBQAA0wMAIAwAANQDACAOAADVAwAg6wEAANEDADDsAQAAFwAQ7QEAANEDADDuAQEAzAMAIfgBAQDMAwAh_AFAAKEDACH9AUAAoQMAIZECQACfAwAhlgIBAKUDACGuAgAA0gO0AiKwAkAAoQMAIbECAQClAwAhsgIBAMkDACG0AhAAmwMAIbUCAQCmAwAhtgJAAJ8DACEE_gEAAAC0AgL_AQAAALQCCIACAAAAtAIIhQIAALcDtAIiGAQAANwDACAGAADdAwAgCQAA3gMAIAoAAN8DACALAACiAwAgDwAAqQMAIOsBAADZAwAw7AEAAAUAEO0BAADZAwAw7gEBAMwDACHyAQEApQMAIfcBAQDMAwAh_AFAAKEDACH9AUAAoQMAIaICAQClAwAhpwIBAKUDACGoAgEApQMAIakCAQCmAwAhqgIQAJsDACGrAggA2gMAIawCCADaAwAhrgIAANsDrgIi0AIAAAUAINECAAAFACARCwAAogMAIOsBAACZAwAw7AEAABsAEO0BAACZAwAw7gEBAMwDACH8AUAAoQMAIYkCAQClAwAhiwIAAJoDiwIijAIQAJsDACGNAhAAnAMAIY4CEACcAwAhjwICAJ0DACGQAgIAngMAIZECQACfAwAhkgIgAKADACHQAgAAGwAg0QIAABsAIAOTAgAAHwAglAIAAB8AIJUCAAAfACALBQAA0wMAIOsBAADWAwAw7AEAABMAEO0BAADWAwAw7gEBAMwDACH4AQEAzAMAIZICIACgAwAhngICAJ4DACGfAgIAngMAIaACAgCeAwAhoQIQAJwDACEHBwAAqAMAIOsBAADXAwAw7AEAAA0AEO0BAADXAwAw7gEBAMwDACGiAgEApQMAIaMCAQCmAwAhCQUAANMDACDrAQAA2AMAMOwBAAAJABDtAQAA2AMAMO4BAQDMAwAh-AEBAMwDACGkAgEApQMAIaUCAQClAwAhpgIgAKADACEWBAAA3AMAIAYAAN0DACAJAADeAwAgCgAA3wMAIAsAAKIDACAPAACpAwAg6wEAANkDADDsAQAABQAQ7QEAANkDADDuAQEAzAMAIfIBAQClAwAh9wEBAMwDACH8AUAAoQMAIf0BQAChAwAhogIBAKUDACGnAgEApQMAIagCAQClAwAhqQIBAKYDACGqAhAAmwMAIasCCADaAwAhrAIIANoDACGuAgAA2wOuAiII_gEIAAAAAf8BCAAAAAWAAggAAAAFgQIIAAAAAYICCAAAAAGDAggAAAABhAIIAAAAAYUCCACSAwAhBP4BAAAArgIC_wEAAACuAgiAAgAAAK4CCIUCAACxA64CIhMBAACnAwAgBwAAqAMAIA8AAKkDACDrAQAApAMAMOwBAAADABDtAQAApAMAMO4BAQDMAwAh_AFAAKEDACH9AUAAoQMAIZYCAQClAwAhlwIBAKUDACGYAgEApgMAIZkCAQCmAwAhmgIBAKYDACGbAgEApgMAIZwCIACgAwAhnQIBAKYDACHQAgAAAwAg0QIAAAMAIAOTAgAACQAglAIAAAkAIJUCAAAJACADkwIAAA0AIJQCAAANACCVAgAADQAgA5MCAAATACCUAgAAEwAglQIAABMAIAAAAAAB1QIBAAAAAQHVAgAAAPIBAgHVAgAAAPQBAgHVAgAAAPYBAgHVAgEAAAABAdUCIAAAAAEB1QJAAAAAAQHVAkAAAAABBx8AALYGACAgAAC8BgAg0gIAALcGACDTAgAAuwYAINYCAAADACDXAgAAAwAg2AIAAKACACAHHwAAtAYAICAAALkGACDSAgAAtQYAINMCAAC4BgAg1gIAAAUAINcCAAAFACDYAgAABwAgAx8AALYGACDSAgAAtwYAINgCAACgAgAgAx8AALQGACDSAgAAtQYAINgCAAAHACAAAAAAAAHVAgAAAIsCAgXVAhAAAAAB2wIQAAAAAdwCEAAAAAHdAhAAAAAB3gIQAAAAAQXVAhAAAAAB2wIQAAAAAdwCEAAAAAHdAhAAAAAB3gIQAAAAAQXVAgIAAAAB2wICAAAAAdwCAgAAAAHdAgIAAAAB3gICAAAAAQXVAgIAAAAB2wICAAAAAdwCAgAAAAHdAgIAAAAB3gICAAAAAQsfAAD7AwAwIAAAgAQAMNICAAD8AwAw0wIAAP0DADDUAgAA_gMAINUCAAD_AwAw1gIAAP8DADDXAgAA_wMAMNgCAAD_AwAw2QIAAIEEADDaAgAAggQAMA8BAACXBAAgBQAAmAQAIA4AAJkEACDuAQEAAAAB-AEBAAAAAfwBQAAAAAH9AUAAAAABkQJAAAAAAZYCAQAAAAGuAgAAALQCArACQAAAAAGxAgEAAAABtAIQAAAAAbUCAQAAAAG2AkAAAAABAgAAABkAIB8AAJYEACADAAAAGQAgHwAAlgQAICAAAIYEACABGAAAswYAMBQBAACnAwAgBQAA0wMAIAwAANQDACAOAADVAwAg6wEAANEDADDsAQAAFwAQ7QEAANEDADDuAQEAAAAB-AEBAMwDACH8AUAAoQMAIf0BQAChAwAhkQJAAJ8DACGWAgEApQMAIa4CAADSA7QCIrACQAChAwAhsQIBAAAAAbICAQDJAwAhtAIQAJsDACG1AgEApgMAIbYCQACfAwAhAgAAABkAIBgAAIYEACACAAAAgwQAIBgAAIQEACAQ6wEAAIIEADDsAQAAgwQAEO0BAACCBAAw7gEBAMwDACH4AQEAzAMAIfwBQAChAwAh_QFAAKEDACGRAkAAnwMAIZYCAQClAwAhrgIAANIDtAIisAJAAKEDACGxAgEApQMAIbICAQDJAwAhtAIQAJsDACG1AgEApgMAIbYCQACfAwAhEOsBAACCBAAw7AEAAIMEABDtAQAAggQAMO4BAQDMAwAh-AEBAMwDACH8AUAAoQMAIf0BQAChAwAhkQJAAJ8DACGWAgEApQMAIa4CAADSA7QCIrACQAChAwAhsQIBAKUDACGyAgEAyQMAIbQCEACbAwAhtQIBAKYDACG2AkAAnwMAIQzuAQEA5AMAIfgBAQDkAwAh_AFAAOsDACH9AUAA6wMAIZECQADqAwAhlgIBAOQDACGuAgAAhQS0AiKwAkAA6wMAIbECAQDkAwAhtAIQAPYDACG1AgEA6AMAIbYCQADqAwAhAdUCAAAAtAICDwEAAIcEACAFAACIBAAgDgAAiQQAIO4BAQDkAwAh-AEBAOQDACH8AUAA6wMAIf0BQADrAwAhkQJAAOoDACGWAgEA5AMAIa4CAACFBLQCIrACQADrAwAhsQIBAOQDACG0AhAA9gMAIbUCAQDoAwAhtgJAAOoDACEFHwAAqgYAICAAALEGACDSAgAAqwYAINMCAACwBgAg2AIAAAEAIAUfAACoBgAgIAAArgYAINICAACpBgAg0wIAAK0GACDYAgAABwAgCx8AAIoEADAgAACPBAAw0gIAAIsEADDTAgAAjAQAMNQCAACNBAAg1QIAAI4EADDWAgAAjgQAMNcCAACOBAAw2AIAAI4EADDZAgAAkAQAMNoCAACRBAAwBe4BAQAAAAH4AQEAAAABnwICAAAAAaACAgAAAAGwAkAAAAABAgAAACEAIB8AAJUEACADAAAAIQAgHwAAlQQAICAAAJQEACABGAAArAYAMAsNAADQAwAg6wEAAM8DADDsAQAAHwAQ7QEAAM8DADDuAQEAAAAB-AEBAMwDACGfAgIAngMAIaACAgCeAwAhrwIBAMwDACGwAkAAoQMAIc8CAADOAwAgAgAAACEAIBgAAJQEACACAAAAkgQAIBgAAJMEACAJ6wEAAJEEADDsAQAAkgQAEO0BAACRBAAw7gEBAMwDACH4AQEAzAMAIZ8CAgCeAwAhoAICAJ4DACGvAgEAzAMAIbACQAChAwAhCesBAACRBAAw7AEAAJIEABDtAQAAkQQAMO4BAQDMAwAh-AEBAMwDACGfAgIAngMAIaACAgCeAwAhrwIBAMwDACGwAkAAoQMAIQXuAQEA5AMAIfgBAQDkAwAhnwICAPkDACGgAgIA-QMAIbACQADrAwAhBe4BAQDkAwAh-AEBAOQDACGfAgIA-QMAIaACAgD5AwAhsAJAAOsDACEF7gEBAAAAAfgBAQAAAAGfAgIAAAABoAICAAAAAbACQAAAAAEPAQAAlwQAIAUAAJgEACAOAACZBAAg7gEBAAAAAfgBAQAAAAH8AUAAAAAB_QFAAAAAAZECQAAAAAGWAgEAAAABrgIAAAC0AgKwAkAAAAABsQIBAAAAAbQCEAAAAAG1AgEAAAABtgJAAAAAAQMfAACqBgAg0gIAAKsGACDYAgAAAQAgAx8AAKgGACDSAgAAqQYAINgCAAAHACAEHwAAigQAMNICAACLBAAw1AIAAI0EACDYAgAAjgQAMAQfAAD7AwAw0gIAAPwDADDUAgAA_gMAINgCAAD_AwAwAAAAAAUfAACYBgAgIAAApgYAINICAACZBgAg0wIAAKUGACDYAgAAAQAgCx8AAK4EADAgAACzBAAw0gIAAK8EADDTAgAAsAQAMNQCAACxBAAg1QIAALIEADDWAgAAsgQAMNcCAACyBAAw2AIAALIEADDZAgAAtAQAMNoCAAC1BAAwCx8AAKIEADAgAACnBAAw0gIAAKMEADDTAgAApAQAMNQCAAClBAAg1QIAAKYEADDWAgAApgQAMNcCAACmBAAw2AIAAKYEADDZAgAAqAQAMNoCAACpBAAwDQUAAO8DACDuAQEAAAAB7wEBAAAAAfABAQAAAAHyAQAAAPIBAvQBAAAA9AEC9gEAAAD2AQL4AQEAAAAB-QEBAAAAAfoBIAAAAAH7AUAAAAAB_AFAAAAAAf0BQAAAAAECAAAAJgAgHwAArQQAIAMAAAAmACAfAACtBAAgIAAArAQAIAEYAACkBgAwEgQAAMADACAFAADKAwAg6wEAAMYDADDsAQAAJAAQ7QEAAMYDADDuAQEAAAAB7wEBAKUDACHwAQEApQMAIfIBAADHA_IBIvQBAADIA_QBIvYBAAC_A_YBIvcBAQDJAwAh-AEBAMkDACH5AQEApgMAIfoBIACgAwAh-wFAAJ8DACH8AUAAoQMAIf0BQAChAwAhAgAAACYAIBgAAKwEACACAAAAqgQAIBgAAKsEACAQ6wEAAKkEADDsAQAAqgQAEO0BAACpBAAw7gEBAMwDACHvAQEApQMAIfABAQClAwAh8gEAAMcD8gEi9AEAAMgD9AEi9gEAAL8D9gEi9wEBAMkDACH4AQEAyQMAIfkBAQCmAwAh-gEgAKADACH7AUAAnwMAIfwBQAChAwAh_QFAAKEDACEQ6wEAAKkEADDsAQAAqgQAEO0BAACpBAAw7gEBAMwDACHvAQEApQMAIfABAQClAwAh8gEAAMcD8gEi9AEAAMgD9AEi9gEAAL8D9gEi9wEBAMkDACH4AQEAyQMAIfkBAQCmAwAh-gEgAKADACH7AUAAnwMAIfwBQAChAwAh_QFAAKEDACEM7gEBAOQDACHvAQEA5AMAIfABAQDkAwAh8gEAAOUD8gEi9AEAAOYD9AEi9gEAAOcD9gEi-AEBAOgDACH5AQEA6AMAIfoBIADpAwAh-wFAAOoDACH8AUAA6wMAIf0BQADrAwAhDQUAAO0DACDuAQEA5AMAIe8BAQDkAwAh8AEBAOQDACHyAQAA5QPyASL0AQAA5gP0ASL2AQAA5wP2ASL4AQEA6AMAIfkBAQDoAwAh-gEgAOkDACH7AUAA6gMAIfwBQADrAwAh_QFAAOsDACENBQAA7wMAIO4BAQAAAAHvAQEAAAAB8AEBAAAAAfIBAAAA8gEC9AEAAAD0AQL2AQAAAPYBAvgBAQAAAAH5AQEAAAAB-gEgAAAAAfsBQAAAAAH8AUAAAAAB_QFAAAAAAREGAAD4BAAgCQAA-QQAIAoAAPoEACALAAD7BAAgDwAA_AQAIO4BAQAAAAHyAQEAAAAB_AFAAAAAAf0BQAAAAAGiAgEAAAABpwIBAAAAAagCAQAAAAGpAgEAAAABqgIQAAAAAasCCAAAAAGsAggAAAABrgIAAACuAgICAAAABwAgHwAA9wQAIAMAAAAHACAfAAD3BAAgIAAAugQAIAEYAACjBgAwFgQAANwDACAGAADdAwAgCQAA3gMAIAoAAN8DACALAACiAwAgDwAAqQMAIOsBAADZAwAw7AEAAAUAEO0BAADZAwAw7gEBAAAAAfIBAQClAwAh9wEBAMwDACH8AUAAoQMAIf0BQAChAwAhogIBAKUDACGnAgEAAAABqAIBAKUDACGpAgEApgMAIaoCEACbAwAhqwIIANoDACGsAggA2gMAIa4CAADbA64CIgIAAAAHACAYAAC6BAAgAgAAALYEACAYAAC3BAAgEOsBAAC1BAAw7AEAALYEABDtAQAAtQQAMO4BAQDMAwAh8gEBAKUDACH3AQEAzAMAIfwBQAChAwAh_QFAAKEDACGiAgEApQMAIacCAQClAwAhqAIBAKUDACGpAgEApgMAIaoCEACbAwAhqwIIANoDACGsAggA2gMAIa4CAADbA64CIhDrAQAAtQQAMOwBAAC2BAAQ7QEAALUEADDuAQEAzAMAIfIBAQClAwAh9wEBAMwDACH8AUAAoQMAIf0BQAChAwAhogIBAKUDACGnAgEApQMAIagCAQClAwAhqQIBAKYDACGqAhAAmwMAIasCCADaAwAhrAIIANoDACGuAgAA2wOuAiIM7gEBAOQDACHyAQEA5AMAIfwBQADrAwAh_QFAAOsDACGiAgEA5AMAIacCAQDkAwAhqAIBAOQDACGpAgEA6AMAIaoCEAD2AwAhqwIIALgEACGsAggAuAQAIa4CAAC5BK4CIgXVAggAAAAB2wIIAAAAAdwCCAAAAAHdAggAAAAB3gIIAAAAAQHVAgAAAK4CAhEGAAC7BAAgCQAAvAQAIAoAAL0EACALAAC-BAAgDwAAvwQAIO4BAQDkAwAh8gEBAOQDACH8AUAA6wMAIf0BQADrAwAhogIBAOQDACGnAgEA5AMAIagCAQDkAwAhqQIBAOgDACGqAhAA9gMAIasCCAC4BAAhrAIIALgEACGuAgAAuQSuAiILHwAA6wQAMCAAAPAEADDSAgAA7AQAMNMCAADtBAAw1AIAAO4EACDVAgAA7wQAMNYCAADvBAAw1wIAAO8EADDYAgAA7wQAMNkCAADxBAAw2gIAAPIEADAKHwAA4AQAMCAAAOQEADDSAgAA4QQAMNMCAADiBAAw1QIAAOMEADDWAgAA4wQAMNcCAADjBAAw2AIAAOMEADDZAgAA5QQAMNoCAADmBAAwCx8AANQEADAgAADZBAAw0gIAANUEADDTAgAA1gQAMNQCAADXBAAg1QIAANgEADDWAgAA2AQAMNcCAADYBAAw2AIAANgEADDZAgAA2gQAMNoCAADbBAAwCx8AAMkEADAgAADNBAAw0gIAAMoEADDTAgAAywQAMNQCAADMBAAg1QIAAP8DADDWAgAA_wMAMNcCAAD_AwAw2AIAAP8DADDZAgAAzgQAMNoCAACCBAAwCx8AAMAEADAgAADEBAAw0gIAAMEEADDTAgAAwgQAMNQCAADDBAAg1QIAAKYEADDWAgAApgQAMNcCAACmBAAw2AIAAKYEADDZAgAAxQQAMNoCAACpBAAwDQQAAO4DACDuAQEAAAAB7wEBAAAAAfABAQAAAAHyAQAAAPIBAvQBAAAA9AEC9gEAAAD2AQL3AQEAAAAB-QEBAAAAAfoBIAAAAAH7AUAAAAAB_AFAAAAAAf0BQAAAAAECAAAAJgAgHwAAyAQAIAMAAAAmACAfAADIBAAgIAAAxwQAIAEYAACiBgAwAgAAACYAIBgAAMcEACACAAAAqgQAIBgAAMYEACAM7gEBAOQDACHvAQEA5AMAIfABAQDkAwAh8gEAAOUD8gEi9AEAAOYD9AEi9gEAAOcD9gEi9wEBAOgDACH5AQEA6AMAIfoBIADpAwAh-wFAAOoDACH8AUAA6wMAIf0BQADrAwAhDQQAAOwDACDuAQEA5AMAIe8BAQDkAwAh8AEBAOQDACHyAQAA5QPyASL0AQAA5gP0ASL2AQAA5wP2ASL3AQEA6AMAIfkBAQDoAwAh-gEgAOkDACH7AUAA6gMAIfwBQADrAwAh_QFAAOsDACENBAAA7gMAIO4BAQAAAAHvAQEAAAAB8AEBAAAAAfIBAAAA8gEC9AEAAAD0AQL2AQAAAPYBAvcBAQAAAAH5AQEAAAAB-gEgAAAAAfsBQAAAAAH8AUAAAAAB_QFAAAAAAQ8BAACXBAAgDAAA0wQAIA4AAJkEACDuAQEAAAAB_AFAAAAAAf0BQAAAAAGRAkAAAAABlgIBAAAAAa4CAAAAtAICsAJAAAAAAbECAQAAAAGyAgEAAAABtAIQAAAAAbUCAQAAAAG2AkAAAAABAgAAABkAIB8AANIEACADAAAAGQAgHwAA0gQAICAAANAEACABGAAAoQYAMAIAAAAZACAYAADQBAAgAgAAAIMEACAYAADPBAAgDO4BAQDkAwAh_AFAAOsDACH9AUAA6wMAIZECQADqAwAhlgIBAOQDACGuAgAAhQS0AiKwAkAA6wMAIbECAQDkAwAhsgIBAOgDACG0AhAA9gMAIbUCAQDoAwAhtgJAAOoDACEPAQAAhwQAIAwAANEEACAOAACJBAAg7gEBAOQDACH8AUAA6wMAIf0BQADrAwAhkQJAAOoDACGWAgEA5AMAIa4CAACFBLQCIrACQADrAwAhsQIBAOQDACGyAgEA6AMAIbQCEAD2AwAhtQIBAOgDACG2AkAA6gMAIQcfAACcBgAgIAAAnwYAINICAACdBgAg0wIAAJ4GACDWAgAAGwAg1wIAABsAINgCAAC4AgAgDwEAAJcEACAMAADTBAAgDgAAmQQAIO4BAQAAAAH8AUAAAAAB_QFAAAAAAZECQAAAAAGWAgEAAAABrgIAAAC0AgKwAkAAAAABsQIBAAAAAbICAQAAAAG0AhAAAAABtQIBAAAAAbYCQAAAAAEDHwAAnAYAINICAACdBgAg2AIAALgCACAG7gEBAAAAAZICIAAAAAGeAgIAAAABnwICAAAAAaACAgAAAAGhAhAAAAABAgAAABUAIB8AAN8EACADAAAAFQAgHwAA3wQAICAAAN4EACABGAAAmwYAMAsFAADTAwAg6wEAANYDADDsAQAAEwAQ7QEAANYDADDuAQEAAAAB-AEBAMwDACGSAiAAoAMAIZ4CAgCeAwAhnwICAJ4DACGgAgIAngMAIaECEACcAwAhAgAAABUAIBgAAN4EACACAAAA3AQAIBgAAN0EACAK6wEAANsEADDsAQAA3AQAEO0BAADbBAAw7gEBAMwDACH4AQEAzAMAIZICIACgAwAhngICAJ4DACGfAgIAngMAIaACAgCeAwAhoQIQAJwDACEK6wEAANsEADDsAQAA3AQAEO0BAADbBAAw7gEBAMwDACH4AQEAzAMAIZICIACgAwAhngICAJ4DACGfAgIAngMAIaACAgCeAwAhoQIQAJwDACEG7gEBAOQDACGSAiAA6QMAIZ4CAgD5AwAhnwICAPkDACGgAgIA-QMAIaECEAD3AwAhBu4BAQDkAwAhkgIgAOkDACGeAgIA-QMAIZ8CAgD5AwAhoAICAPkDACGhAhAA9wMAIQbuAQEAAAABkgIgAAAAAZ4CAgAAAAGfAgIAAAABoAICAAAAAaECEAAAAAED7gEBAAAAAaICAQAAAAGjAgEAAAABAgAAAA8AIB8AAOoEACADAAAADwAgHwAA6gQAICAAAOkEACAHBwAAqAMAIOsBAADXAwAw7AEAAA0AEO0BAADXAwAw7gEBAAAAAaICAQAAAAGjAgEApgMAIQIAAAAPACAYAADpBAAgAgAAAOcEACAYAADoBAAgBusBAADmBAAw7AEAAOcEABDtAQAA5gQAMO4BAQDMAwAhogIBAKUDACGjAgEApgMAIQbrAQAA5gQAMOwBAADnBAAQ7QEAAOYEADDuAQEAzAMAIaICAQClAwAhowIBAKYDACED7gEBAOQDACGiAgEA5AMAIaMCAQDoAwAhA-4BAQDkAwAhogIBAOQDACGjAgEA6AMAIQPuAQEAAAABogIBAAAAAaMCAQAAAAEE7gEBAAAAAaQCAQAAAAGlAgEAAAABpgIgAAAAAQIAAAALACAfAAD2BAAgAwAAAAsAIB8AAPYEACAgAAD1BAAgARgAAJoGADAJBQAA0wMAIOsBAADYAwAw7AEAAAkAEO0BAADYAwAw7gEBAAAAAfgBAQDMAwAhpAIBAKUDACGlAgEApQMAIaYCIACgAwAhAgAAAAsAIBgAAPUEACACAAAA8wQAIBgAAPQEACAI6wEAAPIEADDsAQAA8wQAEO0BAADyBAAw7gEBAMwDACH4AQEAzAMAIaQCAQClAwAhpQIBAKUDACGmAiAAoAMAIQjrAQAA8gQAMOwBAADzBAAQ7QEAAPIEADDuAQEAzAMAIfgBAQDMAwAhpAIBAKUDACGlAgEApQMAIaYCIACgAwAhBO4BAQDkAwAhpAIBAOQDACGlAgEA5AMAIaYCIADpAwAhBO4BAQDkAwAhpAIBAOQDACGlAgEA5AMAIaYCIADpAwAhBO4BAQAAAAGkAgEAAAABpQIBAAAAAaYCIAAAAAERBgAA-AQAIAkAAPkEACAKAAD6BAAgCwAA-wQAIA8AAPwEACDuAQEAAAAB8gEBAAAAAfwBQAAAAAH9AUAAAAABogIBAAAAAacCAQAAAAGoAgEAAAABqQIBAAAAAaoCEAAAAAGrAggAAAABrAIIAAAAAa4CAAAArgICBB8AAOsEADDSAgAA7AQAMNQCAADuBAAg2AIAAO8EADADHwAA4AQAMNICAADhBAAw2AIAAOMEADAEHwAA1AQAMNICAADVBAAw1AIAANcEACDYAgAA2AQAMAQfAADJBAAw0gIAAMoEADDUAgAAzAQAINgCAAD_AwAwBB8AAMAEADDSAgAAwQQAMNQCAADDBAAg2AIAAKYEADADHwAAmAYAINICAACZBgAg2AIAAAEAIAQfAACuBAAw0gIAAK8EADDUAgAAsQQAINgCAACyBAAwBB8AAKIEADDSAgAAowQAMNQCAAClBAAg2AIAAKYEADAICwAAmwQAIBAAAO0FACARAADuBQAgEgAA7wUAIMkCAADgAwAgygIAAOADACDMAgAA4AMAIM0CAADgAwAgAAAAAAAAAAUfAACTBgAgIAAAlgYAINICAACUBgAg0wIAAJUGACDYAgAABwAgAx8AAJMGACDSAgAAlAYAINgCAAAHACAAAAAKHwAAjgUAMCAAAJEFADDSAgAAjwUAMNMCAACQBQAw1QIAALIEADDWAgAAsgQAMNcCAACyBAAw2AIAALIEADDZAgAAkgUAMNoCAAC1BAAwEgQAAJcFACAGAAD4BAAgCgAA-gQAIAsAAPsEACAPAAD8BAAg7gEBAAAAAfIBAQAAAAH3AQEAAAAB_AFAAAAAAf0BQAAAAAGiAgEAAAABpwIBAAAAAagCAQAAAAGpAgEAAAABqgIQAAAAAasCCAAAAAGsAggAAAABrgIAAACuAgICAAAABwAgHwAAlgUAIAMAAAAHACAfAACWBQAgIAAAlAUAIAIAAAAHACAYAACUBQAgAgAAALYEACAYAACTBQAgDe4BAQDkAwAh8gEBAOQDACH3AQEA5AMAIfwBQADrAwAh_QFAAOsDACGiAgEA5AMAIacCAQDkAwAhqAIBAOQDACGpAgEA6AMAIaoCEAD2AwAhqwIIALgEACGsAggAuAQAIa4CAAC5BK4CIhIEAACVBQAgBgAAuwQAIAoAAL0EACALAAC-BAAgDwAAvwQAIO4BAQDkAwAh8gEBAOQDACH3AQEA5AMAIfwBQADrAwAh_QFAAOsDACGiAgEA5AMAIacCAQDkAwAhqAIBAOQDACGpAgEA6AMAIaoCEAD2AwAhqwIIALgEACGsAggAuAQAIa4CAAC5BK4CIgUfAACOBgAgIAAAkQYAINICAACPBgAg0wIAAJAGACDYAgAAoAIAIBIEAACXBQAgBgAA-AQAIAoAAPoEACALAAD7BAAgDwAA_AQAIO4BAQAAAAHyAQEAAAAB9wEBAAAAAfwBQAAAAAH9AUAAAAABogIBAAAAAacCAQAAAAGoAgEAAAABqQIBAAAAAaoCEAAAAAGrAggAAAABrAIIAAAAAa4CAAAArgICAx8AAI4GACDSAgAAjwYAINgCAACgAgAgAx8AAI4FADDSAgAAjwUAMNgCAACyBAAwAAAABR8AAIkGACAgAACMBgAg0gIAAIoGACDTAgAAiwYAINgCAAAHACADHwAAiQYAINICAACKBgAg2AIAAAcAIAAAAAAAAAAAAAAFHwAAhAYAICAAAIcGACDSAgAAhQYAINMCAACGBgAg2AIAABkAIAMfAACEBgAg0gIAAIUGACDYAgAAGQAgAAAAAAAAAAAAAAAFHwAA_wUAICAAAIIGACDSAgAAgAYAINMCAACBBgAg2AIAAAEAIAMfAAD_BQAg0gIAAIAGACDYAgAAAQAgAAAABR8AAPoFACAgAAD9BQAg0gIAAPsFACDTAgAA_AUAINgCAAABACADHwAA-gUAINICAAD7BQAg2AIAAAEAIAAAAAcfAADkBQAgIAAA5wUAINICAADlBQAg0wIAAOYFACDWAgAAAwAg1wIAAAMAINgCAACgAgAgCx8AANgFADAgAADdBQAw0gIAANkFADDTAgAA2gUAMNQCAADbBQAg1QIAANwFADDWAgAA3AUAMNcCAADcBQAw2AIAANwFADDZAgAA3gUAMNoCAADfBQAwCx8AAMwFADAgAADRBQAw0gIAAM0FADDTAgAAzgUAMNQCAADPBQAg1QIAANAFADDWAgAA0AUAMNcCAADQBQAw2AIAANAFADDZAgAA0gUAMNoCAADTBQAwCx8AAMMFADAgAADHBQAw0gIAAMQFADDTAgAAxQUAMNQCAADGBQAg1QIAAP8DADDWAgAA_wMAMNcCAAD_AwAw2AIAAP8DADDZAgAAyAUAMNoCAACCBAAwDwUAAJgEACAMAADTBAAgDgAAmQQAIO4BAQAAAAH4AQEAAAAB_AFAAAAAAf0BQAAAAAGRAkAAAAABrgIAAAC0AgKwAkAAAAABsQIBAAAAAbICAQAAAAG0AhAAAAABtQIBAAAAAbYCQAAAAAECAAAAGQAgHwAAywUAIAMAAAAZACAfAADLBQAgIAAAygUAIAEYAAD5BQAwAgAAABkAIBgAAMoFACACAAAAgwQAIBgAAMkFACAM7gEBAOQDACH4AQEA5AMAIfwBQADrAwAh_QFAAOsDACGRAkAA6gMAIa4CAACFBLQCIrACQADrAwAhsQIBAOQDACGyAgEA6AMAIbQCEAD2AwAhtQIBAOgDACG2AkAA6gMAIQ8FAACIBAAgDAAA0QQAIA4AAIkEACDuAQEA5AMAIfgBAQDkAwAh_AFAAOsDACH9AUAA6wMAIZECQADqAwAhrgIAAIUEtAIisAJAAOsDACGxAgEA5AMAIbICAQDoAwAhtAIQAPYDACG1AgEA6AMAIbYCQADqAwAhDwUAAJgEACAMAADTBAAgDgAAmQQAIO4BAQAAAAH4AQEAAAAB_AFAAAAAAf0BQAAAAAGRAkAAAAABrgIAAAC0AgKwAkAAAAABsQIBAAAAAbICAQAAAAG0AhAAAAABtQIBAAAAAbYCQAAAAAEH7gEBAAAAAfwBQAAAAAH9AUAAAAABkQJAAAAAAboCAQAAAAG7AgEAAAABvAIBAAAAAQIAAAA4ACAfAADXBQAgAwAAADgAIB8AANcFACAgAADWBQAgARgAAPgFADAMAQAApwMAIOsBAADDAwAw7AEAADYAEO0BAADDAwAw7gEBAAAAAfwBQAChAwAh_QFAAKEDACGRAkAAoQMAIZYCAQClAwAhugIBAAAAAbsCAQCmAwAhvAIBAKYDACECAAAAOAAgGAAA1gUAIAIAAADUBQAgGAAA1QUAIAvrAQAA0wUAMOwBAADUBQAQ7QEAANMFADDuAQEApQMAIfwBQAChAwAh_QFAAKEDACGRAkAAoQMAIZYCAQClAwAhugIBAKUDACG7AgEApgMAIbwCAQCmAwAhC-sBAADTBQAw7AEAANQFABDtAQAA0wUAMO4BAQClAwAh_AFAAKEDACH9AUAAoQMAIZECQAChAwAhlgIBAKUDACG6AgEApQMAIbsCAQCmAwAhvAIBAKYDACEH7gEBAOQDACH8AUAA6wMAIf0BQADrAwAhkQJAAOsDACG6AgEA5AMAIbsCAQDoAwAhvAIBAOgDACEH7gEBAOQDACH8AUAA6wMAIf0BQADrAwAhkQJAAOsDACG6AgEA5AMAIbsCAQDoAwAhvAIBAOgDACEH7gEBAAAAAfwBQAAAAAH9AUAAAAABkQJAAAAAAboCAQAAAAG7AgEAAAABvAIBAAAAAQzuAQEAAAAB_AFAAAAAAf0BQAAAAAG9AgEAAAABvgIBAAAAAb8CAQAAAAHAAgEAAAABwQJAAAAAAcICQAAAAAHDAgEAAAABxAIBAAAAAcUCAQAAAAECAAAANAAgHwAA4wUAIAMAAAA0ACAfAADjBQAgIAAA4gUAIAEYAAD3BQAwEgEAAKcDACDrAQAAxQMAMOwBAAAyABDtAQAAxQMAMO4BAQAAAAH8AUAAoQMAIf0BQAChAwAhlgIBAKUDACG9AgEApQMAIb4CAQClAwAhvwIBAKYDACHAAgEApgMAIcECQACfAwAhwgJAAJ8DACHDAgEApgMAIcQCAQCmAwAhxQIBAKYDACHOAgAAxAMAIAIAAAA0ACAYAADiBQAgAgAAAOAFACAYAADhBQAgEOsBAADfBQAw7AEAAOAFABDtAQAA3wUAMO4BAQClAwAh_AFAAKEDACH9AUAAoQMAIZYCAQClAwAhvQIBAKUDACG-AgEApQMAIb8CAQCmAwAhwAIBAKYDACHBAkAAnwMAIcICQACfAwAhwwIBAKYDACHEAgEApgMAIcUCAQCmAwAhEOsBAADfBQAw7AEAAOAFABDtAQAA3wUAMO4BAQClAwAh_AFAAKEDACH9AUAAoQMAIZYCAQClAwAhvQIBAKUDACG-AgEApQMAIb8CAQCmAwAhwAIBAKYDACHBAkAAnwMAIcICQACfAwAhwwIBAKYDACHEAgEApgMAIcUCAQCmAwAhDO4BAQDkAwAh_AFAAOsDACH9AUAA6wMAIb0CAQDkAwAhvgIBAOQDACG_AgEA6AMAIcACAQDoAwAhwQJAAOoDACHCAkAA6gMAIcMCAQDoAwAhxAIBAOgDACHFAgEA6AMAIQzuAQEA5AMAIfwBQADrAwAh_QFAAOsDACG9AgEA5AMAIb4CAQDkAwAhvwIBAOgDACHAAgEA6AMAIcECQADqAwAhwgJAAOoDACHDAgEA6AMAIcQCAQDoAwAhxQIBAOgDACEM7gEBAAAAAfwBQAAAAAH9AUAAAAABvQIBAAAAAb4CAQAAAAG_AgEAAAABwAIBAAAAAcECQAAAAAHCAkAAAAABwwIBAAAAAcQCAQAAAAHFAgEAAAABDAcAAP4EACAPAAD_BAAg7gEBAAAAAfwBQAAAAAH9AUAAAAABlwIBAAAAAZgCAQAAAAGZAgEAAAABmgIBAAAAAZsCAQAAAAGcAiAAAAABnQIBAAAAAQIAAACgAgAgHwAA5AUAIAMAAAADACAfAADkBQAgIAAA6AUAIA4AAAADACAHAACgBAAgDwAAoQQAIBgAAOgFACDuAQEA5AMAIfwBQADrAwAh_QFAAOsDACGXAgEA5AMAIZgCAQDoAwAhmQIBAOgDACGaAgEA6AMAIZsCAQDoAwAhnAIgAOkDACGdAgEA6AMAIQwHAACgBAAgDwAAoQQAIO4BAQDkAwAh_AFAAOsDACH9AUAA6wMAIZcCAQDkAwAhmAIBAOgDACGZAgEA6AMAIZoCAQDoAwAhmwIBAOgDACGcAiAA6QMAIZ0CAQDoAwAhAx8AAOQFACDSAgAA5QUAINgCAACgAgAgBB8AANgFADDSAgAA2QUAMNQCAADbBQAg2AIAANwFADAEHwAAzAUAMNICAADNBQAw1AIAAM8FACDYAgAA0AUAMAQfAADDBQAw0gIAAMQFADDUAgAAxgUAINgCAAD_AwAwCAEAAIAFACAHAACBBQAgDwAAggUAIJgCAADgAwAgmQIAAOADACCaAgAA4AMAIJsCAADgAwAgnQIAAOADACAAAAkEAADtBQAgBgAA9AUAIAkAAPUFACAKAAD2BQAgCwAAmwQAIA8AAIIFACCpAgAA4AMAIKsCAADgAwAgrAIAAOADACAIAQAAgAUAIAUAAPAFACAMAADyBQAgDgAA8wUAIJECAADgAwAgsgIAAOADACC1AgAA4AMAILYCAADgAwAgBQsAAJsEACCNAgAA4AMAII4CAADgAwAgjwIAAOADACCRAgAA4AMAIAAAAAAM7gEBAAAAAfwBQAAAAAH9AUAAAAABvQIBAAAAAb4CAQAAAAG_AgEAAAABwAIBAAAAAcECQAAAAAHCAkAAAAABwwIBAAAAAcQCAQAAAAHFAgEAAAABB-4BAQAAAAH8AUAAAAAB_QFAAAAAAZECQAAAAAG6AgEAAAABuwIBAAAAAbwCAQAAAAEM7gEBAAAAAfgBAQAAAAH8AUAAAAAB_QFAAAAAAZECQAAAAAGuAgAAALQCArACQAAAAAGxAgEAAAABsgIBAAAAAbQCEAAAAAG1AgEAAAABtgJAAAAAAQ8LAADsBQAgEAAA6QUAIBIAAOsFACDuAQEAAAAB_AFAAAAAAf0BQAAAAAGiAgEAAAABxgIBAAAAAccCIAAAAAHIAgAAAPYBAskCAQAAAAHKAgEAAAABywIgAAAAAcwCAQAAAAHNAkAAAAABAgAAAAEAIB8AAPoFACADAAAAPwAgHwAA-gUAICAAAP4FACARAAAAPwAgCwAAwgUAIBAAAL8FACASAADBBQAgGAAA_gUAIO4BAQDkAwAh_AFAAOsDACH9AUAA6wMAIaICAQDkAwAhxgIBAOQDACHHAiAA6QMAIcgCAADnA_YBIskCAQDoAwAhygIBAOgDACHLAiAA6QMAIcwCAQDoAwAhzQJAAOoDACEPCwAAwgUAIBAAAL8FACASAADBBQAg7gEBAOQDACH8AUAA6wMAIf0BQADrAwAhogIBAOQDACHGAgEA5AMAIccCIADpAwAhyAIAAOcD9gEiyQIBAOgDACHKAgEA6AMAIcsCIADpAwAhzAIBAOgDACHNAkAA6gMAIQ8LAADsBQAgEAAA6QUAIBEAAOoFACDuAQEAAAAB_AFAAAAAAf0BQAAAAAGiAgEAAAABxgIBAAAAAccCIAAAAAHIAgAAAPYBAskCAQAAAAHKAgEAAAABywIgAAAAAcwCAQAAAAHNAkAAAAABAgAAAAEAIB8AAP8FACADAAAAPwAgHwAA_wUAICAAAIMGACARAAAAPwAgCwAAwgUAIBAAAL8FACARAADABQAgGAAAgwYAIO4BAQDkAwAh_AFAAOsDACH9AUAA6wMAIaICAQDkAwAhxgIBAOQDACHHAiAA6QMAIcgCAADnA_YBIskCAQDoAwAhygIBAOgDACHLAiAA6QMAIcwCAQDoAwAhzQJAAOoDACEPCwAAwgUAIBAAAL8FACARAADABQAg7gEBAOQDACH8AUAA6wMAIf0BQADrAwAhogIBAOQDACHGAgEA5AMAIccCIADpAwAhyAIAAOcD9gEiyQIBAOgDACHKAgEA6AMAIcsCIADpAwAhzAIBAOgDACHNAkAA6gMAIRABAACXBAAgBQAAmAQAIAwAANMEACDuAQEAAAAB-AEBAAAAAfwBQAAAAAH9AUAAAAABkQJAAAAAAZYCAQAAAAGuAgAAALQCArACQAAAAAGxAgEAAAABsgIBAAAAAbQCEAAAAAG1AgEAAAABtgJAAAAAAQIAAAAZACAfAACEBgAgAwAAABcAIB8AAIQGACAgAACIBgAgEgAAABcAIAEAAIcEACAFAACIBAAgDAAA0QQAIBgAAIgGACDuAQEA5AMAIfgBAQDkAwAh_AFAAOsDACH9AUAA6wMAIZECQADqAwAhlgIBAOQDACGuAgAAhQS0AiKwAkAA6wMAIbECAQDkAwAhsgIBAOgDACG0AhAA9gMAIbUCAQDoAwAhtgJAAOoDACEQAQAAhwQAIAUAAIgEACAMAADRBAAg7gEBAOQDACH4AQEA5AMAIfwBQADrAwAh_QFAAOsDACGRAkAA6gMAIZYCAQDkAwAhrgIAAIUEtAIisAJAAOsDACGxAgEA5AMAIbICAQDoAwAhtAIQAPYDACG1AgEA6AMAIbYCQADqAwAhEgQAAJcFACAJAAD5BAAgCgAA-gQAIAsAAPsEACAPAAD8BAAg7gEBAAAAAfIBAQAAAAH3AQEAAAAB_AFAAAAAAf0BQAAAAAGiAgEAAAABpwIBAAAAAagCAQAAAAGpAgEAAAABqgIQAAAAAasCCAAAAAGsAggAAAABrgIAAACuAgICAAAABwAgHwAAiQYAIAMAAAAFACAfAACJBgAgIAAAjQYAIBQAAAAFACAEAACVBQAgCQAAvAQAIAoAAL0EACALAAC-BAAgDwAAvwQAIBgAAI0GACDuAQEA5AMAIfIBAQDkAwAh9wEBAOQDACH8AUAA6wMAIf0BQADrAwAhogIBAOQDACGnAgEA5AMAIagCAQDkAwAhqQIBAOgDACGqAhAA9gMAIasCCAC4BAAhrAIIALgEACGuAgAAuQSuAiISBAAAlQUAIAkAALwEACAKAAC9BAAgCwAAvgQAIA8AAL8EACDuAQEA5AMAIfIBAQDkAwAh9wEBAOQDACH8AUAA6wMAIf0BQADrAwAhogIBAOQDACGnAgEA5AMAIagCAQDkAwAhqQIBAOgDACGqAhAA9gMAIasCCAC4BAAhrAIIALgEACGuAgAAuQSuAiINAQAA_QQAIA8AAP8EACDuAQEAAAAB_AFAAAAAAf0BQAAAAAGWAgEAAAABlwIBAAAAAZgCAQAAAAGZAgEAAAABmgIBAAAAAZsCAQAAAAGcAiAAAAABnQIBAAAAAQIAAACgAgAgHwAAjgYAIAMAAAADACAfAACOBgAgIAAAkgYAIA8AAAADACABAACfBAAgDwAAoQQAIBgAAJIGACDuAQEA5AMAIfwBQADrAwAh_QFAAOsDACGWAgEA5AMAIZcCAQDkAwAhmAIBAOgDACGZAgEA6AMAIZoCAQDoAwAhmwIBAOgDACGcAiAA6QMAIZ0CAQDoAwAhDQEAAJ8EACAPAAChBAAg7gEBAOQDACH8AUAA6wMAIf0BQADrAwAhlgIBAOQDACGXAgEA5AMAIZgCAQDoAwAhmQIBAOgDACGaAgEA6AMAIZsCAQDoAwAhnAIgAOkDACGdAgEA6AMAIRIEAACXBQAgBgAA-AQAIAkAAPkEACALAAD7BAAgDwAA_AQAIO4BAQAAAAHyAQEAAAAB9wEBAAAAAfwBQAAAAAH9AUAAAAABogIBAAAAAacCAQAAAAGoAgEAAAABqQIBAAAAAaoCEAAAAAGrAggAAAABrAIIAAAAAa4CAAAArgICAgAAAAcAIB8AAJMGACADAAAABQAgHwAAkwYAICAAAJcGACAUAAAABQAgBAAAlQUAIAYAALsEACAJAAC8BAAgCwAAvgQAIA8AAL8EACAYAACXBgAg7gEBAOQDACHyAQEA5AMAIfcBAQDkAwAh_AFAAOsDACH9AUAA6wMAIaICAQDkAwAhpwIBAOQDACGoAgEA5AMAIakCAQDoAwAhqgIQAPYDACGrAggAuAQAIawCCAC4BAAhrgIAALkErgIiEgQAAJUFACAGAAC7BAAgCQAAvAQAIAsAAL4EACAPAAC_BAAg7gEBAOQDACHyAQEA5AMAIfcBAQDkAwAh_AFAAOsDACH9AUAA6wMAIaICAQDkAwAhpwIBAOQDACGoAgEA5AMAIakCAQDoAwAhqgIQAPYDACGrAggAuAQAIawCCAC4BAAhrgIAALkErgIiDwsAAOwFACARAADqBQAgEgAA6wUAIO4BAQAAAAH8AUAAAAAB_QFAAAAAAaICAQAAAAHGAgEAAAABxwIgAAAAAcgCAAAA9gECyQIBAAAAAcoCAQAAAAHLAiAAAAABzAIBAAAAAc0CQAAAAAECAAAAAQAgHwAAmAYAIATuAQEAAAABpAIBAAAAAaUCAQAAAAGmAiAAAAABBu4BAQAAAAGSAiAAAAABngICAAAAAZ8CAgAAAAGgAgIAAAABoQIQAAAAAQvuAQEAAAAB_AFAAAAAAYkCAQAAAAGLAgAAAIsCAowCEAAAAAGNAhAAAAABjgIQAAAAAY8CAgAAAAGQAgIAAAABkQJAAAAAAZICIAAAAAECAAAAuAIAIB8AAJwGACADAAAAGwAgHwAAnAYAICAAAKAGACANAAAAGwAgGAAAoAYAIO4BAQDkAwAh_AFAAOsDACGJAgEA5AMAIYsCAAD1A4sCIowCEAD2AwAhjQIQAPcDACGOAhAA9wMAIY8CAgD4AwAhkAICAPkDACGRAkAA6gMAIZICIADpAwAhC-4BAQDkAwAh_AFAAOsDACGJAgEA5AMAIYsCAAD1A4sCIowCEAD2AwAhjQIQAPcDACGOAhAA9wMAIY8CAgD4AwAhkAICAPkDACGRAkAA6gMAIZICIADpAwAhDO4BAQAAAAH8AUAAAAAB_QFAAAAAAZECQAAAAAGWAgEAAAABrgIAAAC0AgKwAkAAAAABsQIBAAAAAbICAQAAAAG0AhAAAAABtQIBAAAAAbYCQAAAAAEM7gEBAAAAAe8BAQAAAAHwAQEAAAAB8gEAAADyAQL0AQAAAPQBAvYBAAAA9gEC9wEBAAAAAfkBAQAAAAH6ASAAAAAB-wFAAAAAAfwBQAAAAAH9AUAAAAABDO4BAQAAAAHyAQEAAAAB_AFAAAAAAf0BQAAAAAGiAgEAAAABpwIBAAAAAagCAQAAAAGpAgEAAAABqgIQAAAAAasCCAAAAAGsAggAAAABrgIAAACuAgIM7gEBAAAAAe8BAQAAAAHwAQEAAAAB8gEAAADyAQL0AQAAAPQBAvYBAAAA9gEC-AEBAAAAAfkBAQAAAAH6ASAAAAAB-wFAAAAAAfwBQAAAAAH9AUAAAAABAwAAAD8AIB8AAJgGACAgAACnBgAgEQAAAD8AIAsAAMIFACARAADABQAgEgAAwQUAIBgAAKcGACDuAQEA5AMAIfwBQADrAwAh_QFAAOsDACGiAgEA5AMAIcYCAQDkAwAhxwIgAOkDACHIAgAA5wP2ASLJAgEA6AMAIcoCAQDoAwAhywIgAOkDACHMAgEA6AMAIc0CQADqAwAhDwsAAMIFACARAADABQAgEgAAwQUAIO4BAQDkAwAh_AFAAOsDACH9AUAA6wMAIaICAQDkAwAhxgIBAOQDACHHAiAA6QMAIcgCAADnA_YBIskCAQDoAwAhygIBAOgDACHLAiAA6QMAIcwCAQDoAwAhzQJAAOoDACESBAAAlwUAIAYAAPgEACAJAAD5BAAgCgAA-gQAIA8AAPwEACDuAQEAAAAB8gEBAAAAAfcBAQAAAAH8AUAAAAAB_QFAAAAAAaICAQAAAAGnAgEAAAABqAIBAAAAAakCAQAAAAGqAhAAAAABqwIIAAAAAawCCAAAAAGuAgAAAK4CAgIAAAAHACAfAACoBgAgDxAAAOkFACARAADqBQAgEgAA6wUAIO4BAQAAAAH8AUAAAAAB_QFAAAAAAaICAQAAAAHGAgEAAAABxwIgAAAAAcgCAAAA9gECyQIBAAAAAcoCAQAAAAHLAiAAAAABzAIBAAAAAc0CQAAAAAECAAAAAQAgHwAAqgYAIAXuAQEAAAAB-AEBAAAAAZ8CAgAAAAGgAgIAAAABsAJAAAAAAQMAAAAFACAfAACoBgAgIAAArwYAIBQAAAAFACAEAACVBQAgBgAAuwQAIAkAALwEACAKAAC9BAAgDwAAvwQAIBgAAK8GACDuAQEA5AMAIfIBAQDkAwAh9wEBAOQDACH8AUAA6wMAIf0BQADrAwAhogIBAOQDACGnAgEA5AMAIagCAQDkAwAhqQIBAOgDACGqAhAA9gMAIasCCAC4BAAhrAIIALgEACGuAgAAuQSuAiISBAAAlQUAIAYAALsEACAJAAC8BAAgCgAAvQQAIA8AAL8EACDuAQEA5AMAIfIBAQDkAwAh9wEBAOQDACH8AUAA6wMAIf0BQADrAwAhogIBAOQDACGnAgEA5AMAIagCAQDkAwAhqQIBAOgDACGqAhAA9gMAIasCCAC4BAAhrAIIALgEACGuAgAAuQSuAiIDAAAAPwAgHwAAqgYAICAAALIGACARAAAAPwAgEAAAvwUAIBEAAMAFACASAADBBQAgGAAAsgYAIO4BAQDkAwAh_AFAAOsDACH9AUAA6wMAIaICAQDkAwAhxgIBAOQDACHHAiAA6QMAIcgCAADnA_YBIskCAQDoAwAhygIBAOgDACHLAiAA6QMAIcwCAQDoAwAhzQJAAOoDACEPEAAAvwUAIBEAAMAFACASAADBBQAg7gEBAOQDACH8AUAA6wMAIf0BQADrAwAhogIBAOQDACHGAgEA5AMAIccCIADpAwAhyAIAAOcD9gEiyQIBAOgDACHKAgEA6AMAIcsCIADpAwAhzAIBAOgDACHNAkAA6gMAIQzuAQEAAAAB-AEBAAAAAfwBQAAAAAH9AUAAAAABkQJAAAAAAZYCAQAAAAGuAgAAALQCArACQAAAAAGxAgEAAAABtAIQAAAAAbUCAQAAAAG2AkAAAAABEgQAAJcFACAGAAD4BAAgCQAA-QQAIAoAAPoEACALAAD7BAAg7gEBAAAAAfIBAQAAAAH3AQEAAAAB_AFAAAAAAf0BQAAAAAGiAgEAAAABpwIBAAAAAagCAQAAAAGpAgEAAAABqgIQAAAAAasCCAAAAAGsAggAAAABrgIAAACuAgICAAAABwAgHwAAtAYAIA0BAAD9BAAgBwAA_gQAIO4BAQAAAAH8AUAAAAAB_QFAAAAAAZYCAQAAAAGXAgEAAAABmAIBAAAAAZkCAQAAAAGaAgEAAAABmwIBAAAAAZwCIAAAAAGdAgEAAAABAgAAAKACACAfAAC2BgAgAwAAAAUAIB8AALQGACAgAAC6BgAgFAAAAAUAIAQAAJUFACAGAAC7BAAgCQAAvAQAIAoAAL0EACALAAC-BAAgGAAAugYAIO4BAQDkAwAh8gEBAOQDACH3AQEA5AMAIfwBQADrAwAh_QFAAOsDACGiAgEA5AMAIacCAQDkAwAhqAIBAOQDACGpAgEA6AMAIaoCEAD2AwAhqwIIALgEACGsAggAuAQAIa4CAAC5BK4CIhIEAACVBQAgBgAAuwQAIAkAALwEACAKAAC9BAAgCwAAvgQAIO4BAQDkAwAh8gEBAOQDACH3AQEA5AMAIfwBQADrAwAh_QFAAOsDACGiAgEA5AMAIacCAQDkAwAhqAIBAOQDACGpAgEA6AMAIaoCEAD2AwAhqwIIALgEACGsAggAuAQAIa4CAAC5BK4CIgMAAAADACAfAAC2BgAgIAAAvQYAIA8AAAADACABAACfBAAgBwAAoAQAIBgAAL0GACDuAQEA5AMAIfwBQADrAwAh_QFAAOsDACGWAgEA5AMAIZcCAQDkAwAhmAIBAOgDACGZAgEA6AMAIZoCAQDoAwAhmwIBAOgDACGcAiAA6QMAIZ0CAQDoAwAhDQEAAJ8EACAHAACgBAAg7gEBAOQDACH8AUAA6wMAIf0BQADrAwAhlgIBAOQDACGXAgEA5AMAIZgCAQDoAwAhmQIBAOgDACGaAgEA6AMAIZsCAQDoAwAhnAIgAOkDACGdAgEA6AMAIQUIABILOggQBAIRNRASOREEAQABBwgDCAAPDy8NBwQAAgYMBAgADgkQBQoWBwsaCA8nDQEFAAMCBxEDCAAGAQcSAAEFAAMFAQABBQADCAAMDBwJDiILAggACgsdCAELHgABDQAIAQ4jAAIEKAIFKQMFBioACSsACiwACy0ADy4AAgcwAA8xAAEBAAEBAQABAws9ABE7ABI8AAAAAAMIABclABgmABkAAAADCAAXJQAYJgAZAQEAAQEBAAEDCAAeJQAfJgAgAAAAAwgAHiUAHyYAIAEBAAEBAQABAwgAJSUAJiYAJwAAAAMIACUlACYmACcAAAADCAAtJQAuJgAvAAAAAwgALSUALiYALwMBAAEFAAMMpAEJAwEAAQUAAwyqAQkFCAA0JQA3JgA4ZwA1aAA2AAAAAAAFCAA0JQA3JgA4ZwA1aAA2AQ0ACAENAAgFCAA9JQBAJgBBZwA-aAA_AAAAAAAFCAA9JQBAJgBBZwA-aAA_AQQAAgEEAAIFCABGJQBJJgBKZwBHaABIAAAAAAAFCABGJQBJJgBKZwBHaABIAQUAAwEFAAMDCABPJQBQJgBRAAAAAwgATyUAUCYAUQAAAwgAViUAVyYAWAAAAAMIAFYlAFcmAFgBBQADAQUAAwUIAF0lAGAmAGFnAF5oAF8AAAAAAAUIAF0lAGAmAGFnAF5oAF8BAQABAQEAAQMIAGYlAGcmAGgAAAADCABmJQBnJgBoAAAFCABtJQBwJgBxZwBuaABvAAAAAAAFCABtJQBwJgBxZwBuaABvAgTaAgIF2wIDAgThAgIF4gIDAwgAdiUAdyYAeAAAAAMIAHYlAHcmAHgTAgEUPgEVQQEWQgEXQwEZRQEaRxMbSBQcSgEdTBMeTRUhTgEiTwEjUBMnUxYoVBopVRAqVhArVxAsWBAtWRAuWxAvXRMwXhsxYBAyYhMzYxw0ZBA1ZRA2ZhM3aR04aiE5axE6bBE7bRE8bhE9bxE-cRE_cxNAdCJBdhFCeBNDeSNEehFFexFGfBNHfyRIgAEoSYIBKUqDASlLhgEpTIcBKU2IASlOigEpT4wBE1CNASpRjwEpUpEBE1OSAStUkwEpVZQBKVaVARNXmAEsWJkBMFmaAQhamwEIW5wBCFydAQhdngEIXqABCF-iARNgowExYaYBCGKoARNjqQEyZKsBCGWsAQhmrQETabABM2qxATlrsgELbLMBC220AQtutQELb7YBC3C4AQtxugETcrsBOnO9AQt0vwETdcABO3bBAQt3wgELeMMBE3nGATx6xwFCe8gBA3zJAQN9ygEDfssBA3_MAQOAAc4BA4EB0AETggHRAUODAdMBA4QB1QEThQHWAUSGAdcBA4cB2AEDiAHZAROJAdwBRYoB3QFLiwHeAQSMAd8BBI0B4AEEjgHhAQSPAeIBBJAB5AEEkQHmAROSAecBTJMB6QEElAHrAROVAewBTZYB7QEElwHuAQSYAe8BE5kB8gFOmgHzAVKbAfQBBZwB9QEFnQH2AQWeAfcBBZ8B-AEFoAH6AQWhAfwBE6IB_QFTowH_AQWkAYECE6UBggJUpgGDAgWnAYQCBagBhQITqQGIAlWqAYkCWasBigIHrAGLAgetAYwCB64BjQIHrwGOAgewAZACB7EBkgITsgGTAlqzAZUCB7QBlwITtQGYAlu2AZkCB7cBmgIHuAGbAhO5AZ4CXLoBnwJiuwGhAgK8AaICAr0BpAICvgGlAgK_AaYCAsABqAICwQGqAhPCAasCY8MBrQICxAGvAhPFAbACZMYBsQICxwGyAgLIAbMCE8kBtgJlygG3AmnLAbkCCcwBugIJzQG8AgnOAb0CCc8BvgIJ0AHAAgnRAcICE9IBwwJq0wHFAgnUAccCE9UByAJr1gHJAgnXAcoCCdgBywIT2QHOAmzaAc8CctsB0AIN3AHRAg3dAdICDd4B0wIN3wHUAg3gAdYCDeEB2AIT4gHZAnPjAd0CDeQB3wIT5QHgAnTmAeMCDecB5AIN6AHlAhPpAegCdeoB6QJ5"
};
async function decodeBase64AsWasm(wasmBase64) {
  const { Buffer: Buffer2 } = await import("buffer");
  const wasmArray = Buffer2.from(wasmBase64, "base64");
  return new WebAssembly.Module(wasmArray);
}
config.compilerWasm = {
  getRuntime: async () => await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.mjs"),
  getQueryCompilerWasmModule: async () => {
    const { wasm } = await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.mjs");
    return await decodeBase64AsWasm(wasm);
  },
  importName: "./query_compiler_fast_bg.js"
};
function getPrismaClientClass() {
  return runtime.getPrismaClient(config);
}

// src/generated/prisma/internal/prismaNamespace.ts
var prismaNamespace_exports = {};
__export(prismaNamespace_exports, {
  AccountScalarFieldEnum: () => AccountScalarFieldEnum,
  AmenityScalarFieldEnum: () => AmenityScalarFieldEnum,
  AnnouncementScalarFieldEnum: () => AnnouncementScalarFieldEnum,
  AnyNull: () => AnyNull2,
  BookingScalarFieldEnum: () => BookingScalarFieldEnum,
  BookingSlotScalarFieldEnum: () => BookingSlotScalarFieldEnum,
  CouponScalarFieldEnum: () => CouponScalarFieldEnum,
  CourtMediaScalarFieldEnum: () => CourtMediaScalarFieldEnum,
  CourtScalarFieldEnum: () => CourtScalarFieldEnum,
  CourtSlotTemplateScalarFieldEnum: () => CourtSlotTemplateScalarFieldEnum,
  DbNull: () => DbNull2,
  Decimal: () => Decimal2,
  JsonNull: () => JsonNull2,
  ModelName: () => ModelName,
  NullTypes: () => NullTypes2,
  NullsOrder: () => NullsOrder,
  OrganizerScalarFieldEnum: () => OrganizerScalarFieldEnum,
  PrismaClientInitializationError: () => PrismaClientInitializationError2,
  PrismaClientKnownRequestError: () => PrismaClientKnownRequestError2,
  PrismaClientRustPanicError: () => PrismaClientRustPanicError2,
  PrismaClientUnknownRequestError: () => PrismaClientUnknownRequestError2,
  PrismaClientValidationError: () => PrismaClientValidationError2,
  QueryMode: () => QueryMode,
  SessionScalarFieldEnum: () => SessionScalarFieldEnum,
  SortOrder: () => SortOrder,
  Sql: () => Sql2,
  TransactionIsolationLevel: () => TransactionIsolationLevel,
  UserScalarFieldEnum: () => UserScalarFieldEnum,
  VerificationScalarFieldEnum: () => VerificationScalarFieldEnum,
  defineExtension: () => defineExtension,
  empty: () => empty2,
  getExtensionContext: () => getExtensionContext,
  join: () => join2,
  prismaVersion: () => prismaVersion,
  raw: () => raw2,
  sql: () => sql
});
import * as runtime2 from "@prisma/client/runtime/client";
var PrismaClientKnownRequestError2 = runtime2.PrismaClientKnownRequestError;
var PrismaClientUnknownRequestError2 = runtime2.PrismaClientUnknownRequestError;
var PrismaClientRustPanicError2 = runtime2.PrismaClientRustPanicError;
var PrismaClientInitializationError2 = runtime2.PrismaClientInitializationError;
var PrismaClientValidationError2 = runtime2.PrismaClientValidationError;
var sql = runtime2.sqltag;
var empty2 = runtime2.empty;
var join2 = runtime2.join;
var raw2 = runtime2.raw;
var Sql2 = runtime2.Sql;
var Decimal2 = runtime2.Decimal;
var getExtensionContext = runtime2.Extensions.getExtensionContext;
var prismaVersion = {
  client: "7.5.0",
  engine: "280c870be64f457428992c43c1f6d557fab6e29e"
};
var NullTypes2 = {
  DbNull: runtime2.NullTypes.DbNull,
  JsonNull: runtime2.NullTypes.JsonNull,
  AnyNull: runtime2.NullTypes.AnyNull
};
var DbNull2 = runtime2.DbNull;
var JsonNull2 = runtime2.JsonNull;
var AnyNull2 = runtime2.AnyNull;
var ModelName = {
  User: "User",
  Account: "Account",
  Session: "Session",
  Verification: "Verification",
  Booking: "Booking",
  BookingSlot: "BookingSlot",
  Court: "Court",
  CourtMedia: "CourtMedia",
  Amenity: "Amenity",
  CourtSlotTemplate: "CourtSlotTemplate",
  Organizer: "Organizer",
  Coupon: "Coupon",
  Announcement: "Announcement"
};
var TransactionIsolationLevel = runtime2.makeStrictEnum({
  ReadUncommitted: "ReadUncommitted",
  ReadCommitted: "ReadCommitted",
  RepeatableRead: "RepeatableRead",
  Serializable: "Serializable"
});
var UserScalarFieldEnum = {
  id: "id",
  email: "email",
  emailVerified: "emailVerified",
  name: "name",
  role: "role",
  phone: "phone",
  avatarUrl: "avatarUrl",
  isApproved: "isApproved",
  stripeCustomerId: "stripeCustomerId",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  deletedAt: "deletedAt"
};
var AccountScalarFieldEnum = {
  id: "id",
  userId: "userId",
  accountId: "accountId",
  providerId: "providerId",
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  accessTokenExpiresAt: "accessTokenExpiresAt",
  refreshTokenExpiresAt: "refreshTokenExpiresAt",
  scope: "scope",
  idToken: "idToken",
  password: "password",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var SessionScalarFieldEnum = {
  id: "id",
  userId: "userId",
  token: "token",
  expiresAt: "expiresAt",
  ipAddress: "ipAddress",
  userAgent: "userAgent",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var VerificationScalarFieldEnum = {
  id: "id",
  identifier: "identifier",
  value: "value",
  expiresAt: "expiresAt",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var BookingScalarFieldEnum = {
  id: "id",
  bookingCode: "bookingCode",
  userId: "userId",
  courtId: "courtId",
  couponId: "couponId",
  bookingDate: "bookingDate",
  status: "status",
  totalAmount: "totalAmount",
  paymentId: "paymentId",
  paidAt: "paidAt",
  expiresAt: "expiresAt",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var BookingSlotScalarFieldEnum = {
  id: "id",
  bookingId: "bookingId",
  courtId: "courtId",
  bookingDate: "bookingDate",
  startMinute: "startMinute",
  endMinute: "endMinute"
};
var CourtScalarFieldEnum = {
  id: "id",
  organizerId: "organizerId",
  name: "name",
  slug: "slug",
  type: "type",
  locationLabel: "locationLabel",
  description: "description",
  basePrice: "basePrice",
  latitude: "latitude",
  longitude: "longitude",
  status: "status",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var CourtMediaScalarFieldEnum = {
  id: "id",
  courtId: "courtId",
  url: "url",
  publicId: "publicId",
  isPrimary: "isPrimary"
};
var AmenityScalarFieldEnum = {
  id: "id",
  name: "name",
  icon: "icon"
};
var CourtSlotTemplateScalarFieldEnum = {
  id: "id",
  courtId: "courtId",
  dayOfWeek: "dayOfWeek",
  startMinute: "startMinute",
  endMinute: "endMinute",
  priceOverride: "priceOverride",
  isActive: "isActive"
};
var OrganizerScalarFieldEnum = {
  id: "id",
  userId: "userId",
  businessName: "businessName",
  bio: "bio",
  website: "website",
  phoneNumber: "phoneNumber",
  address: "address",
  isVerified: "isVerified",
  stripeAccountId: "stripeAccountId",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var CouponScalarFieldEnum = {
  id: "id",
  code: "code",
  discountType: "discountType",
  discountValue: "discountValue",
  minBookingAmount: "minBookingAmount",
  maxDiscountAmount: "maxDiscountAmount",
  usageLimit: "usageLimit",
  usedCount: "usedCount",
  expiresAt: "expiresAt",
  isActive: "isActive",
  createdAt: "createdAt"
};
var AnnouncementScalarFieldEnum = {
  id: "id",
  title: "title",
  content: "content",
  type: "type",
  audience: "audience",
  createdByRole: "createdByRole",
  organizerId: "organizerId",
  courtId: "courtId",
  imageUrl: "imageUrl",
  isPublished: "isPublished",
  publishedAt: "publishedAt",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var SortOrder = {
  asc: "asc",
  desc: "desc"
};
var QueryMode = {
  default: "default",
  insensitive: "insensitive"
};
var NullsOrder = {
  first: "first",
  last: "last"
};
var defineExtension = runtime2.Extensions.defineExtension;

// src/generated/prisma/client.ts
globalThis["__dirname"] = path.dirname(fileURLToPath(import.meta.url));
var PrismaClient = getPrismaClientClass();

// src/lib/prisma.ts
var connectionString = `${process.env.DATABASE_URL}`;
var adapter = new PrismaPg({ connectionString });
var prisma = new PrismaClient({ adapter });

// src/config/env.ts
import dotenv from "dotenv";

// src/helpers/AppError.ts
var AppError = class extends Error {
  statusCode;
  isOperational;
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
};
var AppError_default = AppError;

// src/config/env.ts
dotenv.config();
var loadEnvVariables = () => {
  const requireEnvVariable = [
    "NODE_ENV",
    "CLIENT_URL",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD",
    "DATABASE_URL",
    "STRIPE_SECRET_KEY",
    "STRIPE_PUBLISHABLE_KEY",
    "STRIPE_WEBHOOK_SECRET"
  ];
  requireEnvVariable.forEach((variable) => {
    if (!process.env[variable]) {
      throw new AppError_default(
        500,
        `Environment variable ${variable} is required but not set in .env file.`
      );
    }
  });
  return {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT ? parseInt(process.env.PORT) : 5e3,
    CLIENT_URL: process.env.CLIENT_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: parseInt(process.env.SMTP_PORT),
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM || "no-reply@courtconnect.com",
    SMTP_SECURE: process.env.SMTP_SECURE === "true",
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_CURRENCY: process.env.STRIPE_CURRENCY || "usd"
  };
};
var envVars = loadEnvVariables();

// src/lib/auth.ts
var auth = betterAuth({
  baseURL: envVars.BETTER_AUTH_URL,
  secret: envVars.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:5000",
    "http://192.168.9.142:3000",
    envVars.CLIENT_URL || "http://localhost:3000"
  ],
  emailAndPassword: {
    enabled: true
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "USER",
        input: false
      },
      phone: {
        type: "string",
        required: false
      },
      avatarUrl: {
        type: "string",
        required: false
      },
      isApproved: {
        type: "boolean",
        required: false,
        defaultValue: false
      },
      stripeCustomerId: {
        type: "string",
        required: false
      }
    }
  }
});

// src/modules/user/user.route.ts
import { Router } from "express";

// src/config/cloudinary.ts
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
var DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024;
var DEFAULT_MAX_FILES = 10;
var DEFAULT_FOLDER = "court-connect";
var ALLOWED_MIME_TYPES = /* @__PURE__ */ new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
]);
cloudinary.config({
  cloud_name: envVars.CLOUDINARY_CLOUD_NAME,
  api_key: envVars.CLOUDINARY_API_KEY,
  api_secret: envVars.CLOUDINARY_API_SECRET
});
var imageFileFilter = (_req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new Error("Only JPG, PNG, and WEBP images are allowed"));
    return;
  }
  cb(null, true);
};
var buildStorage = (folder) => new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => ({
    folder,
    resource_type: "image",
    format: "webp",
    public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "")}`,
    transformation: [{ quality: "auto", fetch_format: "auto" }]
  })
});
var createUploader = (folder, maxFileSize = DEFAULT_MAX_FILE_SIZE) => multer({
  storage: buildStorage(folder),
  limits: { fileSize: maxFileSize },
  fileFilter: imageFileFilter
});
var upload = createUploader(`${DEFAULT_FOLDER}/general`);
var singleImageUpload = (fieldName, folder = `${DEFAULT_FOLDER}/single`, maxFileSize = DEFAULT_MAX_FILE_SIZE) => createUploader(folder, maxFileSize).single(fieldName);
var multipleImageUpload = (fieldName, maxCount = DEFAULT_MAX_FILES, folder = `${DEFAULT_FOLDER}/multiple`, maxFileSize = DEFAULT_MAX_FILE_SIZE) => createUploader(folder, maxFileSize).array(fieldName, maxCount);
var cloudinary_default = cloudinary;

// src/middlewares/auth.ts
import { fromNodeHeaders } from "better-auth/node";

// src/helpers/sendResponse.ts
var sendCreated = (res, data, message = "Resource created successfully", statusCode = 201) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};
var sendSuccess = (res, result, message = "Success", statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data: result.data,
    meta: result.meta
  });
};
var sendError = (res, message, statusCode = 500, error) => {
  const response = {
    success: false,
    message
  };
  if (error) {
    response.error = error;
  }
  res.status(statusCode).json(response);
};
var sendUnauthorized = (res, message = "Unauthorized") => {
  sendError(res, message, 401);
};
var sendForbidden = (res, message = "Forbidden") => {
  sendError(res, message, 403);
};

// src/middlewares/auth.ts
var authMiddleware = (...roles) => {
  return async (req, res, next) => {
    try {
      const session = await auth.api.getSession({
        headers: req.headers
      });
      if (!session || !session.user) {
        return sendUnauthorized(res, "Unauthorized");
      }
      const user = session.user;
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified
      };
      if (roles.length && !roles.includes(req.user.role)) {
        return sendForbidden(res, "Forbidden");
      }
      next();
    } catch (error) {
      return sendError(
        res,
        "Authentication failed",
        500,
        error.message
      );
    }
  };
};
var auth_default = authMiddleware;
var optionalAuth = async (req, _res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers)
    });
    if (session) {
      const user = session.user;
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified
      };
      req.session = session.session;
    }
    next();
  } catch {
    next();
  }
};

// src/middlewares/validateRequest.ts
var validateRequest = (zodSchema) => {
  return (req, res, next) => {
    if (req.body.data) {
      req.body = JSON.parse(req.body.data);
    }
    const parsedResult = zodSchema.safeParse(req.body);
    if (!parsedResult.success) {
      return next(parsedResult.error);
    }
    req.body = parsedResult.data;
    next();
  };
};

// src/helpers/catchAsync.ts
var catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
var catchAsync_default = catchAsync;

// src/modules/user/user.service.ts
var UserService = {
  /**
   * Get user profile with booking history.
   */
  async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        name: true,
        role: true,
        phone: true,
        avatarUrl: true,
        isApproved: true,
        createdAt: true,
        _count: {
          select: { bookings: true }
        }
      }
    });
    if (!user) {
      throw new AppError_default(404, "User not found");
    }
    return user;
  },
  /**
   * Update user profile
   */
  async updateProfile(userId, data) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatarUrl: true,
        updatedAt: true
      }
    });
    return user;
  },
  async uploadAvatar(userId, file) {
    if (!file) {
      throw new AppError_default(400, "Profile image file is required");
    }
    const uploadedUrl = file.path ?? file.secure_url;
    if (!uploadedUrl) {
      throw new AppError_default(500, "Failed to upload profile image");
    }
    return prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: uploadedUrl },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        updatedAt: true
      }
    });
  }
};
var user_service_default = UserService;

// src/modules/user/user.controller.ts
var UserController = {
  getProfile: catchAsync_default(async (req, res) => {
    const result = await user_service_default.getProfile(req.user.id);
    sendSuccess(res, { data: result }, "Profile retrieved successfully");
  }),
  updateProfile: catchAsync_default(async (req, res) => {
    const result = await user_service_default.updateProfile(req.user.id, req.body);
    sendSuccess(res, { data: result }, "Profile updated successfully");
  }),
  uploadAvatar: catchAsync_default(async (req, res) => {
    const result = await user_service_default.uploadAvatar(req.user.id, req.file);
    sendSuccess(res, { data: result }, "Profile image uploaded successfully");
  })
};
var user_controller_default = UserController;

// src/modules/user/user.validation.ts
import { z } from "zod";
var updateUserProfileSchema = z.object({
  name: z.string({ error: "Name must be a string" }).min(2, "Name must be at least 2 characters").max(100, "Name must not exceed 100 characters").optional(),
  phone: z.string({ error: "Phone must be a string" }).min(7, "Phone must be at least 7 characters").max(20, "Phone must not exceed 20 characters").nullable().optional(),
  avatarUrl: z.url({ error: "Avatar URL must be a valid URL" }).nullable().optional()
});

// src/modules/user/user.route.ts
var router = Router();
router.get("/me", auth_default(), user_controller_default.getProfile);
router.patch(
  "/me",
  auth_default(),
  validateRequest(updateUserProfileSchema),
  user_controller_default.updateProfile
);
router.patch(
  "/me/avatar",
  auth_default(),
  singleImageUpload("avatar", "users"),
  user_controller_default.uploadAvatar
);
var UserRoutes = router;

// src/modules/court/court.route.ts
import { Router as Router2 } from "express";

// src/middlewares/authorize.ts
var authorize = (...allowedRoles) => {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      sendUnauthorized(res, "Authentication required");
      return;
    }
    if (!allowedRoles.includes(user.role)) {
      sendForbidden(
        res,
        `Access denied. Required role(s): ${allowedRoles.join(", ")}`
      );
      return;
    }
    next();
  };
};
var authorize_default = authorize;

// src/modules/court/court.validation.ts
import { z as z2 } from "zod";
var createCourtSchema = z2.object({
  name: z2.string("Court name must be a string").min(3, "Name must be at least 3 characters").max(100, "Name must not exceed 100 characters"),
  type: z2.string("Court type must be a string").min(2, "Type must be at least 2 characters"),
  locationLabel: z2.string("Location must be a string").min(3, "Location must be at least 3 characters"),
  description: z2.string("Description must be a string").max(1e3, "Description must not exceed 1000 characters").optional(),
  basePrice: z2.number("Base price must be a number").positive("Price must be a positive number"),
  latitude: z2.number("Latitude must be a number").min(-90).max(90).optional(),
  longitude: z2.number("Longitude must be a number").min(-180).max(180).optional(),
  amenityIds: z2.array(z2.uuid()).optional()
});
var updateCourtSchema = z2.object({
  name: z2.string("Name must be a string").min(3, "Name must be at least 3 characters").max(100, "Name must not exceed 100 characters").optional(),
  type: z2.string("Type must be a string").min(2).optional(),
  locationLabel: z2.string("Location must be a string").min(3).optional(),
  description: z2.string("Description must be a string").max(1e3).optional(),
  basePrice: z2.number("Price must be a number").positive("Price must be positive").optional(),
  latitude: z2.number("Latitude must be a number").min(-90).max(90).optional(),
  longitude: z2.number("Longitude must be a number").min(-180).max(180).optional(),
  amenityIds: z2.array(z2.uuid()).optional(),
  status: z2.enum(["PENDING_APPROVAL", "ACTIVE", "MAINTENANCE", "HIDDEN"]).optional()
});

// src/helpers/QueryBuilder.ts
var RESERVED_KEYS = /* @__PURE__ */ new Set([
  "searchTerm",
  "page",
  "limit",
  "sortBy",
  "fields",
  "includeDeleted"
]);
var OPERATOR_MAP = {
  _gte: "gte",
  _gt: "gt",
  _lte: "lte",
  _lt: "lt",
  _not: "not",
  _contains: "contains",
  _startsWith: "startsWith",
  _endsWith: "endsWith",
  _in: "in",
  _notIn: "notIn"
};
var QueryBuilder = class {
  constructor(params, defaults) {
    this.params = params;
    this.defaults = defaults;
    this.takeValue = this.defaults?.limit ?? 10;
  }
  whereConditions = [];
  orderByClause = [];
  skipValue = 0;
  takeValue = 10;
  selectClause;
  pageValue = 1;
  /* ---- Search ---- */
  /**
   * Text search across multiple fields using OR.
   *
   * ```ts
   * new QueryBuilder(query)
   *   .search(["name", "email", "locationLabel"])
   *   .build();
   * ```
   *
   * Searching nested fields:
   * ```ts
   * .search(["name", "court.name"])
   * ```
   */
  search(searchableFields) {
    const term = this.params.searchTerm;
    if (!term || searchableFields.length === 0) return this;
    const orConditions = searchableFields.map((field) => {
      if (field.includes(".")) {
        const parts = field.split(".");
        let condition = {
          contains: term,
          mode: "insensitive"
        };
        for (let i = parts.length - 1; i >= 0; i--) {
          condition = {
            [parts[i]]: i === parts.length - 1 ? condition : condition
          };
        }
        return condition;
      }
      return {
        [field]: { contains: term, mode: "insensitive" }
      };
    });
    this.whereConditions.push({ OR: orConditions });
    return this;
  }
  /* ---- Filter ---- */
  /**
   * Auto-parses query params into Prisma where clauses.
   *
   * Supports:
   *   - exact match:     `?status=ACTIVE`
   *   - range:           `?basePrice_gte=100&basePrice_lte=500`
   *   - boolean:         `?isIndoor=true`
   *   - in / notIn:      `?type_in=TENNIS,BADMINTON`
   *   - string ops:      `?name_contains=royal`
   *   - enum arrays:     `?status=ACTIVE,MAINTENANCE`
   *
   * Extra allowed fields can be whitelisted:
   * ```ts
   * .filter(["status", "type", "isIndoor", "basePrice"])
   * ```
   * Pass an empty array to allow ALL non-reserved keys.
   */
  filter(allowedFields) {
    const entries = Object.entries(this.params);
    for (const [rawKey, rawValue] of entries) {
      if (RESERVED_KEYS.has(rawKey) || rawValue === void 0 || rawValue === "")
        continue;
      let fieldName = rawKey;
      let operator = null;
      for (const [suffix, op] of Object.entries(OPERATOR_MAP)) {
        if (rawKey.endsWith(suffix)) {
          fieldName = rawKey.slice(0, -suffix.length);
          operator = op;
          break;
        }
      }
      if (allowedFields && allowedFields.length > 0 && !allowedFields.includes(fieldName)) {
        continue;
      }
      const value = this.parseValue(rawValue, operator);
      if (operator) {
        this.whereConditions.push({
          [fieldName]: { [operator]: value }
        });
      } else {
        this.whereConditions.push({ [fieldName]: value });
      }
    }
    return this;
  }
  /* ---- Soft delete ---- */
  /**
   * Automatically adds `deletedAt: null` unless `?includeDeleted=true`
   * is in the query. Call this for models that use soft delete.
   */
  softDelete() {
    if (this.params.includeDeleted !== "true") {
      this.whereConditions.push({ deletedAt: null });
    }
    return this;
  }
  /* ---- Custom where ---- */
  /**
   * Add an arbitrary where condition.
   * ```ts
   * .addCondition({ organizerId: userId })
   * ```
   */
  addCondition(condition) {
    this.whereConditions.push(condition);
    return this;
  }
  /* ---- Sort ---- */
  /**
   * Parses `?sortBy=name,-createdAt` into Prisma orderBy.
   *
   * Prefix with `-` for descending. Multiple fields separated by commas.
   * Falls back to `defaults.defaultSort` or `-createdAt`.
   */
  sort() {
    const raw3 = this.params.sortBy || this.defaults?.defaultSort || "-createdAt";
    const fields = raw3.split(",").map((f) => f.trim()).filter(Boolean);
    this.orderByClause = fields.map((field) => {
      if (field.startsWith("-")) {
        return { [field.slice(1)]: "desc" };
      }
      return { [field]: "asc" };
    });
    return this;
  }
  /* ---- Paginate ---- */
  /**
   * Parses `?page=1&limit=10` into Prisma skip/take.
   */
  paginate() {
    const maxLimit = this.defaults?.maxLimit ?? 100;
    this.pageValue = Math.max(1, Number(this.params.page) || 1);
    this.takeValue = Math.min(
      maxLimit,
      Math.max(1, Number(this.params.limit) || this.defaults?.limit || 10)
    );
    this.skipValue = (this.pageValue - 1) * this.takeValue;
    return this;
  }
  /* ---- Select ---- */
  /**
   * Parses `?fields=name,email,role` into Prisma select.
   */
  selectFields() {
    if (!this.params.fields) return this;
    const fields = this.params.fields.split(",").map((f) => f.trim()).filter(Boolean);
    if (fields.length > 0) {
      this.selectClause = {};
      for (const field of fields) {
        this.selectClause[field] = true;
      }
    }
    return this;
  }
  /* ---- Build ---- */
  /**
   * Returns the Prisma-compatible query args.
   */
  build() {
    const where = this.whereConditions.length > 0 ? { AND: this.whereConditions } : {};
    return {
      where,
      orderBy: this.orderByClause.length > 0 ? this.orderByClause : [{ createdAt: "desc" }],
      skip: this.skipValue,
      take: this.takeValue,
      select: this.selectClause
    };
  }
  /**
   * Convenience: builds and returns a meta calculator.
   *
   * Usage:
   * ```ts
   * const qb = new QueryBuilder(req.query).search(["name"]).filter().sort().paginate();
   * const { where, orderBy, skip, take } = qb.build();
   * const [data, total] = await prisma.$transaction([
   *   prisma.court.findMany({ where, orderBy, skip, take }),
   *   prisma.court.count({ where }),
   * ]);
   * const meta = qb.countMeta(total);
   * ```
   */
  countMeta(total) {
    const totalPages = Math.ceil(total / this.takeValue);
    return {
      totalItems: total,
      totalPages,
      currentPage: this.pageValue,
      itemsPerPage: this.takeValue,
      hasNextPage: this.pageValue < totalPages,
      hasPrevPage: this.pageValue > 1,
      // aliases
      page: this.pageValue,
      limit: this.takeValue,
      total
    };
  }
  /* ---- Internals ---- */
  parseValue(raw3, operator) {
    const str = String(raw3);
    if (operator === "in" || operator === "notIn") {
      return str.split(",").map((v) => this.coerce(v.trim()));
    }
    if (!operator && str.includes(",")) {
      return { in: str.split(",").map((v) => this.coerce(v.trim())) };
    }
    return this.coerce(str);
  }
  coerce(value) {
    if (value === "true") return true;
    if (value === "false") return false;
    if (value === "null") return null;
    const num = Number(value);
    if (!Number.isNaN(num) && value !== "") return num;
    return value;
  }
};

// src/shared/constants.ts
var COURT_STATUS = {
  PENDING_APPROVAL: "PENDING_APPROVAL",
  ACTIVE: "ACTIVE",
  MAINTENANCE: "MAINTENANCE",
  HIDDEN: "HIDDEN"
};
var BOOKING_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED"
};
var DISCOUNT_TYPE = {
  PERCENTAGE: "PERCENTAGE",
  FIXED: "FIXED"
};
var ACTIVE_BOOKING_STATUSES = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.PAID
];
function generateBookingCode() {
  const date = /* @__PURE__ */ new Date();
  const ymd = String(date.getFullYear()) + String(date.getMonth() + 1).padStart(2, "0") + String(date.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `CC-${ymd}-${rand}`;
}
function slugify(text) {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
}

// src/helpers/getOrganizer.ts
async function getOrganizerByUserId(userId) {
  const organizer = await prisma.organizer.findUnique({
    where: { userId }
  });
  if (!organizer) {
    throw new AppError_default(403, "You must create an organizer profile first");
  }
  return organizer;
}

// src/modules/court/court.service.ts
var CourtService = {
  /**
   * Create a new court
   */
  async createCourt(userId, data) {
    const organizer = await getOrganizerByUserId(userId);
    if (!organizer.isVerified) {
      throw new AppError_default(
        403,
        "Your organizer profile is not verified yet. Please contact admin."
      );
    }
    const baseSlug = slugify(data.name);
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.court.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    let amenityConnections;
    if (data.amenityIds && data.amenityIds.length > 0) {
      const foundAmenities = await prisma.amenity.findMany({
        where: { id: { in: data.amenityIds } },
        select: { id: true }
      });
      if (foundAmenities.length !== data.amenityIds.length) {
        throw new AppError_default(400, "One or more selected amenities are invalid");
      }
      amenityConnections = foundAmenities.map((item) => ({ id: item.id }));
    }
    const court = await prisma.court.create({
      data: {
        organizerId: organizer.id,
        slug,
        name: data.name,
        type: data.type,
        locationLabel: data.locationLabel,
        description: data.description ?? null,
        basePrice: data.basePrice,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        status: COURT_STATUS.PENDING_APPROVAL,
        ...amenityConnections ? { amenities: { connect: amenityConnections } } : {}
      }
    });
    return court;
  },
  /**
   * Upload court media (primary + gallery)
   */
  async uploadCourtMedia(courtId, userId, userRole, files, primaryIndex) {
    if (!files || files.length === 0) {
      throw new AppError_default(400, "At least one image is required");
    }
    const court = await prisma.court.findUnique({ where: { id: courtId } });
    if (!court) throw new AppError_default(404, "Court not found");
    if (userRole !== "ADMIN") {
      const organizer = await getOrganizerByUserId(userId);
      if (court.organizerId !== organizer.id) {
        throw new AppError_default(403, "You can only upload media to your own courts");
      }
    }
    const uploadedPublicIds = files.map((file) => file.filename).filter((id) => Boolean(id));
    try {
      const existingPrimary = await prisma.courtMedia.findFirst({
        where: { courtId, isPrimary: true },
        select: { id: true }
      });
      const validPrimaryIndex = primaryIndex !== void 0 && Number.isInteger(primaryIndex) && primaryIndex >= 0 && primaryIndex < files.length ? primaryIndex : void 0;
      const mediaRows = files.map((file, index) => {
        const cloudinaryPath = file.path;
        const cloudinaryPublicId = file.filename;
        if (!cloudinaryPath || !cloudinaryPublicId) {
          throw new AppError_default(500, "Cloudinary upload metadata is missing");
        }
        const isPrimary = validPrimaryIndex !== void 0 ? index === validPrimaryIndex : !existingPrimary && index === 0;
        return {
          courtId,
          url: cloudinaryPath,
          publicId: cloudinaryPublicId,
          isPrimary
        };
      });
      return await prisma.$transaction(async (tx) => {
        if (validPrimaryIndex !== void 0) {
          await tx.courtMedia.updateMany({
            where: { courtId, isPrimary: true },
            data: { isPrimary: false }
          });
        }
        await tx.courtMedia.createMany({ data: mediaRows });
        return tx.courtMedia.findMany({
          where: { courtId },
          orderBy: [{ isPrimary: "desc" }, { id: "desc" }]
        });
      });
    } catch (error) {
      if (uploadedPublicIds.length > 0) {
        await Promise.allSettled(
          uploadedPublicIds.map(
            (publicId) => cloudinary_default.uploader.destroy(publicId, {
              resource_type: "image",
              invalidate: true
            })
          )
        );
      }
      throw error;
    }
  },
  /**
   * Get all courts
   */
  async getAllCourts(query) {
    const qb = new QueryBuilder(query, {
      defaultSort: "-createdAt",
      maxLimit: 50
    }).search(["name", "locationLabel", "type"]).filter(["status", "type", "basePrice"]).sort().paginate();
    if (!query.status) {
      qb.addCondition({ status: COURT_STATUS.ACTIVE });
    }
    const rawAmenityIds = query.amenityIds;
    const amenityIds = (Array.isArray(rawAmenityIds) ? rawAmenityIds.join(",") : typeof rawAmenityIds === "string" ? rawAmenityIds : "").split(",").map((id) => id.trim()).filter(Boolean);
    if (amenityIds.length > 0) {
      qb.addCondition({
        amenities: {
          some: {
            id: { in: amenityIds }
          }
        }
      });
    }
    if (typeof query.organizerId === "string" && query.organizerId.trim()) {
      qb.addCondition({ organizerId: query.organizerId.trim() });
    }
    const { where, orderBy, skip, take } = qb.build();
    const [courts, total] = await prisma.$transaction([
      prisma.court.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          slug: true,
          name: true,
          type: true,
          locationLabel: true,
          basePrice: true,
          latitude: true,
          longitude: true,
          status: true,
          createdAt: true,
          organizer: {
            select: {
              id: true,
              businessName: true,
              user: { select: { id: true, name: true, avatarUrl: true } }
            }
          },
          media: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true }
          },
          _count: {
            select: {
              bookings: true
            }
          }
        }
      }),
      prisma.court.count({ where })
    ]);
    return { courts, meta: qb.countMeta(total) };
  },
  /**
   * Get a single court by slug (public)
   */
  async getCourtBySlug(slug) {
    const court = await prisma.court.findUnique({
      where: { slug },
      include: {
        organizer: {
          select: {
            id: true,
            businessName: true,
            bio: true,
            user: { select: { id: true, name: true, avatarUrl: true } }
          }
        },
        media: true,
        amenities: {
          select: { id: true, name: true, icon: true }
        },
        slotTemplates: {
          where: { isActive: true },
          orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }]
        },
        _count: {
          select: { bookings: true }
        }
      }
    });
    if (!court) {
      throw new AppError_default(404, "Court not found");
    }
    return court;
  },
  /**
   * Get courts owned by an organizer.
   */
  async getOrganizerCourts(userId, query) {
    const organizer = await getOrganizerByUserId(userId);
    const qb = new QueryBuilder(query, { defaultSort: "-createdAt" }).search(["name", "locationLabel"]).addCondition({ organizerId: organizer.id }).sort().paginate();
    const { where, orderBy, skip, take } = qb.build();
    const [courts, total] = await prisma.$transaction([
      prisma.court.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          _count: {
            select: { bookings: true }
          },
          media: { where: { isPrimary: true }, take: 1, select: { url: true } }
        }
      }),
      prisma.court.count({ where })
    ]);
    return { courts, meta: qb.countMeta(total) };
  },
  /**
   * Update a court organizer must own it
   */
  async updateCourt(courtId, userId, data) {
    const organizer = await getOrganizerByUserId(userId);
    const court = await prisma.court.findUnique({ where: { id: courtId } });
    if (!court) throw new AppError_default(404, "Court not found");
    if (court.organizerId !== organizer.id) {
      throw new AppError_default(403, "You can only update your own courts");
    }
    let slug;
    if (data.name && data.name !== court.name) {
      const baseSlug = slugify(data.name);
      slug = baseSlug;
      let counter = 1;
      while (await prisma.court.findFirst({ where: { slug, id: { not: courtId } } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }
    const { amenityIds, ...restData } = data;
    let amenitySetPayload;
    if (amenityIds !== void 0) {
      if (amenityIds.length > 0) {
        const foundAmenities = await prisma.amenity.findMany({
          where: { id: { in: amenityIds } },
          select: { id: true }
        });
        if (foundAmenities.length !== amenityIds.length) {
          throw new AppError_default(400, "One or more selected amenities are invalid");
        }
        amenitySetPayload = {
          set: foundAmenities.map((item) => ({ id: item.id }))
        };
      } else {
        amenitySetPayload = { set: [] };
      }
    }
    const updated = await prisma.court.update({
      where: { id: courtId },
      data: {
        ...restData,
        ...slug ? { slug } : {},
        ...amenitySetPayload ? { amenities: amenitySetPayload } : {}
      }
    });
    return updated;
  },
  /**
   * Soft-delete a court
   */
  async softDeleteCourt(courtId, userId, userRole) {
    const court = await prisma.court.findUnique({ where: { id: courtId } });
    if (!court) throw new AppError_default(404, "Court not found");
    if (userRole !== "ADMIN") {
      const organizer = await getOrganizerByUserId(userId);
      if (court.organizerId !== organizer.id) {
        throw new AppError_default(403, "You can only delete your own courts");
      }
    }
    const deleted = await prisma.court.update({
      where: { id: courtId },
      data: { status: "HIDDEN" }
    });
    return deleted;
  },
  /**
   * Get amenities list for organizer.
   */
  async getAmenities() {
    return prisma.amenity.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        icon: true
      }
    });
  },
  /**
   * Get members users who have booked of a court.
   */
  async getCourtMembers(courtId, query) {
    const qb = new QueryBuilder(query).addCondition({ courtId }).sort().paginate();
    const { where, orderBy, skip, take } = qb.build();
    const [bookings, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          bookingCode: true,
          bookingDate: true,
          status: true,
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true }
          }
        }
      }),
      prisma.booking.count({ where })
    ]);
    return {
      members: bookings,
      meta: qb.countMeta(total)
    };
  }
};
var court_service_default = CourtService;

// src/modules/court/court.controller.ts
var CourtController = {
  createCourt: catchAsync_default(async (req, res) => {
    const result = await court_service_default.createCourt(req.user.id, req.body);
    sendCreated(res, result, "Court created successfully");
  }),
  uploadCourtMedia: catchAsync_default(async (req, res) => {
    const files = req.files ?? [];
    const primaryIndex = req.body?.primaryIndex !== void 0 ? Number(req.body.primaryIndex) : void 0;
    const result = await court_service_default.uploadCourtMedia(
      req.params.courtId,
      req.user.id,
      req.user.role,
      files,
      Number.isFinite(primaryIndex) ? primaryIndex : void 0
    );
    sendCreated(res, result, "Court media uploaded successfully");
  }),
  getAllCourts: catchAsync_default(async (req, res) => {
    const { courts, meta } = await court_service_default.getAllCourts(
      req.query
    );
    sendSuccess(res, { data: courts, meta }, "Courts retrieved successfully");
  }),
  getAmenities: catchAsync_default(async (_req, res) => {
    const result = await court_service_default.getAmenities();
    sendSuccess(res, { data: result }, "Amenities retrieved successfully");
  }),
  getCourtBySlug: catchAsync_default(async (req, res) => {
    const result = await court_service_default.getCourtBySlug(req.params.slug);
    sendSuccess(res, { data: result }, "Court retrieved successfully");
  }),
  getOrganizerCourts: catchAsync_default(async (req, res) => {
    const { courts, meta } = await court_service_default.getOrganizerCourts(
      req.user.id,
      req.query
    );
    sendSuccess(
      res,
      { data: courts, meta },
      "Organizer courts retrieved successfully"
    );
  }),
  getCourtMembers: catchAsync_default(async (req, res) => {
    const { members, meta } = await court_service_default.getCourtMembers(
      req.params.courtId,
      req.query
    );
    sendSuccess(
      res,
      { data: members, meta },
      "Court members retrieved successfully"
    );
  }),
  updateCourt: catchAsync_default(async (req, res) => {
    const result = await court_service_default.updateCourt(
      req.params.courtId,
      req.user.id,
      req.body
    );
    sendSuccess(res, { data: result }, "Court updated successfully");
  }),
  deleteCourt: catchAsync_default(async (req, res) => {
    const result = await court_service_default.softDeleteCourt(
      req.params.courtId,
      req.user.id,
      req.user.role
    );
    sendSuccess(res, { data: result }, "Court deleted successfully");
  })
};
var court_controller_default = CourtController;

// src/modules/court/court.route.ts
var router2 = Router2();
router2.get("/", optionalAuth, court_controller_default.getAllCourts);
router2.get("/amenities", optionalAuth, court_controller_default.getAmenities);
router2.get("/:slug", optionalAuth, court_controller_default.getCourtBySlug);
router2.get(
  "/organizer/my-courts",
  auth_default(),
  authorize_default("ORGANIZER", "ADMIN"),
  court_controller_default.getOrganizerCourts
);
router2.post(
  "/",
  auth_default(),
  authorize_default("ORGANIZER", "ADMIN"),
  validateRequest(createCourtSchema),
  court_controller_default.createCourt
);
router2.patch(
  "/:courtId",
  auth_default(),
  authorize_default("ORGANIZER", "ADMIN"),
  validateRequest(updateCourtSchema),
  court_controller_default.updateCourt
);
router2.post(
  "/:courtId/media",
  auth_default(),
  authorize_default("ORGANIZER", "ADMIN"),
  multipleImageUpload("images", 7, "court-connect/courts"),
  court_controller_default.uploadCourtMedia
);
router2.delete(
  "/:courtId",
  auth_default(),
  authorize_default("ORGANIZER", "ADMIN"),
  court_controller_default.deleteCourt
);
router2.get(
  "/:courtId/members",
  auth_default(),
  authorize_default("ORGANIZER", "ADMIN"),
  court_controller_default.getCourtMembers
);
var CourtRoutes = router2;

// src/modules/schedule/schedule.route.ts
import { Router as Router3 } from "express";

// src/modules/schedule/schedule.validation.ts
import { z as z3 } from "zod";
var createSlotTemplateSchema = z3.object({
  dayOfWeek: z3.number("Day of week must be a number").int().min(0, "Day must be 0 (Sunday) to 6 (Saturday)").max(6, "Day must be 0 (Sunday) to 6 (Saturday)"),
  startMinute: z3.number("Start time must be a number").int().min(0, "Start time must be >= 0").max(1439, "Start time must be < 1440"),
  endMinute: z3.number("End time must be a number").int().min(1, "End time must be > 0").max(1440, "End time must be <= 1440"),
  priceOverride: z3.number("Price override must be a number").positive("Price override must be positive").optional()
});
var updateSlotTemplateSchema = z3.object({
  startMinute: z3.number("Start minute must be a number").int().min(0).max(1439).optional(),
  endMinute: z3.number("End minute must be a number").int().min(1).max(1440).optional(),
  priceOverride: z3.number("Price override must be a number").positive().nullable().optional(),
  isActive: z3.boolean().optional()
});

// src/modules/schedule/schedule.service.ts
var ScheduleService = {
  /**
   * Create a slot template for a court.
   */
  async createSlotTemplate(courtId, userId, data) {
    const organizer = await getOrganizerByUserId(userId);
    const court = await prisma.court.findUnique({ where: { id: courtId } });
    if (!court) throw new AppError_default(404, "Court not found");
    if (court.organizerId !== organizer.id) {
      throw new AppError_default(403, "You can only manage schedules for your own courts");
    }
    if (data.startMinute >= data.endMinute) {
      throw new AppError_default(400, "Start time must be before end time");
    }
    const overlap = await prisma.courtSlotTemplate.findFirst({
      where: {
        courtId,
        dayOfWeek: data.dayOfWeek,
        isActive: true,
        startMinute: { lt: data.endMinute },
        endMinute: { gt: data.startMinute }
      }
    });
    if (overlap) {
      throw new AppError_default(409, "This time slot overlaps with an existing slot template");
    }
    return prisma.courtSlotTemplate.create({
      data: {
        courtId,
        dayOfWeek: data.dayOfWeek,
        startMinute: data.startMinute,
        endMinute: data.endMinute,
        priceOverride: data.priceOverride ?? null
      }
    });
  },
  /**
   * Get all slot templates for a court, grouped by day.
   */
  async getSlotTemplates(courtId) {
    const templates = await prisma.courtSlotTemplate.findMany({
      where: { courtId, isActive: true },
      orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }]
    });
    const grouped = {};
    for (const t of templates) {
      if (!grouped[t.dayOfWeek]) grouped[t.dayOfWeek] = [];
      grouped[t.dayOfWeek].push(t);
    }
    return grouped;
  },
  /**
   * Update a slot template.
   */
  async updateSlotTemplate(templateId, userId, data) {
    const organizer = await getOrganizerByUserId(userId);
    const template = await prisma.courtSlotTemplate.findUnique({
      where: { id: templateId },
      include: { court: { select: { organizerId: true } } }
    });
    if (!template) throw new AppError_default(404, "Slot template not found");
    if (template.court.organizerId !== organizer.id) {
      throw new AppError_default(403, "You can only manage your own court schedules");
    }
    return prisma.courtSlotTemplate.update({
      where: { id: templateId },
      data
    });
  },
  /**
   * Delete a slot template (soft-deactivate).
   */
  async deleteSlotTemplate(templateId, userId) {
    const organizer = await getOrganizerByUserId(userId);
    const template = await prisma.courtSlotTemplate.findUnique({
      where: { id: templateId },
      include: { court: { select: { organizerId: true } } }
    });
    if (!template) throw new AppError_default(404, "Slot template not found");
    if (template.court.organizerId !== organizer.id) {
      throw new AppError_default(403, "You can only manage your own court schedules");
    }
    return prisma.courtSlotTemplate.update({
      where: { id: templateId },
      data: { isActive: false }
    });
  },
  /**
   * Get available slots for a court on a specific date.
   */
  async getAvailableSlots(courtId, date) {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    const templates = await prisma.courtSlotTemplate.findMany({
      where: { courtId, dayOfWeek, isActive: true },
      orderBy: { startMinute: "asc" }
    });
    if (templates.length === 0) return [];
    const bookedSlots = await prisma.bookingSlot.findMany({
      where: {
        courtId,
        bookingDate: targetDate,
        booking: {
          status: { in: ["PENDING", "PAID"] }
        }
      }
    });
    const available = templates.filter((t) => {
      const isBooked = bookedSlots.some(
        (b) => b.startMinute < t.endMinute && b.endMinute > t.startMinute
      );
      return !isBooked;
    });
    return available.map((t) => ({
      slotTemplateId: t.id,
      dayOfWeek: t.dayOfWeek,
      startMinute: t.startMinute,
      endMinute: t.endMinute,
      price: t.priceOverride
      // null means use court.basePrice
    }));
  }
};
var schedule_service_default = ScheduleService;

// src/modules/schedule/schedule.controller.ts
var ScheduleController = {
  createSlotTemplate: catchAsync_default(async (req, res) => {
    const result = await schedule_service_default.createSlotTemplate(
      req.params.courtId,
      req.user.id,
      req.body
    );
    sendCreated(res, result, "Slot template created successfully");
  }),
  getSlotTemplates: catchAsync_default(async (req, res) => {
    const result = await schedule_service_default.getSlotTemplates(req.params.courtId);
    sendSuccess(res, { data: result }, "Slot templates retrieved successfully");
  }),
  getAvailableSlots: catchAsync_default(async (req, res) => {
    const date = req.query.date;
    if (!date) {
      return sendError(res, "Query parameter 'date' is required (YYYY-MM-DD)", 400);
    }
    const result = await schedule_service_default.getAvailableSlots(req.params.courtId, date);
    sendSuccess(res, { data: result }, "Available slots retrieved successfully");
  }),
  updateSlotTemplate: catchAsync_default(async (req, res) => {
    const result = await schedule_service_default.updateSlotTemplate(
      req.params.templateId,
      req.user.id,
      req.body
    );
    sendSuccess(res, { data: result }, "Slot template updated successfully");
  }),
  deleteSlotTemplate: catchAsync_default(async (req, res) => {
    const result = await schedule_service_default.deleteSlotTemplate(
      req.params.templateId,
      req.user.id
    );
    sendSuccess(res, { data: result }, "Slot template deactivated successfully");
  })
};
var schedule_controller_default = ScheduleController;

// src/modules/schedule/schedule.route.ts
var router3 = Router3();
router3.get("/courts/:courtId/schedules", schedule_controller_default.getSlotTemplates);
router3.get(
  "/courts/:courtId/availability",
  schedule_controller_default.getAvailableSlots
);
router3.post(
  "/courts/:courtId/schedules",
  auth_default(),
  authorize_default("ORGANIZER", "ADMIN"),
  validateRequest(createSlotTemplateSchema),
  schedule_controller_default.createSlotTemplate
);
router3.patch(
  "/schedules/:templateId",
  auth_default(),
  authorize_default("ORGANIZER", "ADMIN"),
  validateRequest(updateSlotTemplateSchema),
  schedule_controller_default.updateSlotTemplate
);
router3.delete(
  "/schedules/:templateId",
  auth_default(),
  authorize_default("ORGANIZER", "ADMIN"),
  schedule_controller_default.deleteSlotTemplate
);
var ScheduleRoutes = router3;

// src/modules/booking/booking.route.ts
import { Router as Router4 } from "express";

// src/modules/booking/booking.validation.ts
import { z as z4 } from "zod";
var createBookingSchema = z4.object({
  courtId: z4.uuid("Court ID must be a valid UUID format"),
  bookingDate: z4.string("Booking date must be a string").regex(/^\d{4}-\d{2}-\d{2}$/, "Booking date must be in YYYY-MM-DD format"),
  slotTemplateIds: z4.array(z4.uuid("Invalid slot template ID")).min(1, "At least one slot must be selected"),
  couponCode: z4.string("Coupon code must be a string").min(1, "Coupon code cannot be empty").transform((value) => value.trim().toUpperCase()).optional()
});

// src/helpers/utils.ts
var roundMoney = (value) => {
  const numeric = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(numeric)) return 0;
  return Number(numeric.toFixed(2));
};
var asNumber = (value, defaultValue = 0) => {
  const numeric = Number(value ?? defaultValue);
  return Number.isFinite(numeric) ? numeric : defaultValue;
};
var clampDays = (days, defaultDays = 90) => {
  const parsed = Number.parseInt(String(days ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultDays;
  return Math.min(365, parsed);
};

// src/modules/coupon/coupon.helper.ts
var normalizeCouponCode = (code) => code.trim().toUpperCase();
var assertCouponRules = (coupon, bookingAmount, now = /* @__PURE__ */ new Date()) => {
  if (!coupon.isActive) {
    throw new AppError_default(400, "Coupon is inactive");
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    throw new AppError_default(400, "Coupon has expired");
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError_default(400, "Coupon usage limit reached");
  }
  const minAmount = asNumber(coupon.minBookingAmount);
  if (coupon.minBookingAmount !== null && bookingAmount < minAmount) {
    throw new AppError_default(
      400,
      `Minimum booking amount for this coupon is ${minAmount.toFixed(2)}`
    );
  }
};
var calculateDiscount = (coupon, bookingAmount) => {
  const subtotal = roundMoney(bookingAmount);
  const discountValue = asNumber(coupon.discountValue);
  let discountAmount = 0;
  if (coupon.discountType === DISCOUNT_TYPE.PERCENTAGE) {
    discountAmount = subtotal * discountValue / 100;
    if (coupon.maxDiscountAmount !== null) {
      discountAmount = Math.min(
        discountAmount,
        asNumber(coupon.maxDiscountAmount)
      );
    }
  } else {
    discountAmount = discountValue;
  }
  const normalizedDiscount = Math.min(subtotal, roundMoney(discountAmount));
  const finalAmount = roundMoney(subtotal - normalizedDiscount);
  return {
    discountAmount: normalizedDiscount,
    finalAmount
  };
};
var validateDiscountConfig = (input) => {
  if (input.discountType === DISCOUNT_TYPE.PERCENTAGE && input.discountValue > 100) {
    throw new AppError_default(400, "Percentage discount cannot be greater than 100");
  }
  if (input.discountType === DISCOUNT_TYPE.FIXED && input.maxDiscountAmount !== void 0 && input.maxDiscountAmount !== null) {
    throw new AppError_default(
      400,
      "maxDiscountAmount is only supported for PERCENTAGE coupons"
    );
  }
};

// src/modules/coupon/coupon.service.ts
var CouponService = {
  /**
   * Create a new coupon (Admin only).
   */
  async createCoupon(data) {
    const code = normalizeCouponCode(data.code);
    validateDiscountConfig({
      discountType: data.discountType,
      discountValue: data.discountValue,
      maxDiscountAmount: data.maxDiscountAmount ?? null
    });
    const existing = await prisma.coupon.findFirst({
      where: {
        code: {
          equals: code,
          mode: "insensitive"
        }
      },
      select: { id: true }
    });
    if (existing) {
      throw new AppError_default(409, "Coupon code already exists");
    }
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new AppError_default(400, "Invalid expiry date");
    }
    return prisma.coupon.create({
      data: {
        code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minBookingAmount: data.minBookingAmount ?? null,
        maxDiscountAmount: data.maxDiscountAmount ?? null,
        usageLimit: data.usageLimit ?? null,
        expiresAt,
        isActive: data.isActive ?? true
      }
    });
  },
  /**
   * List all coupons.
   */
  async getAllCoupons(query) {
    const qb = new QueryBuilder(query, { defaultSort: "-createdAt" }).search(["code"]).filter(["discountType", "isActive"]).sort().paginate();
    const { where, orderBy, skip, take } = qb.build();
    const [coupons, total] = await prisma.$transaction([
      prisma.coupon.findMany({
        where,
        orderBy,
        skip,
        take
      }),
      prisma.coupon.count({ where })
    ]);
    return { coupons, meta: qb.countMeta(total) };
  },
  /**
   * Get coupon details by ID.
   */
  async getCouponById(couponId) {
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId }
    });
    if (!coupon) {
      throw new AppError_default(404, "Coupon not found");
    }
    return coupon;
  },
  /**
   * Update coupon configuration.
   */
  async updateCoupon(couponId, data) {
    const existing = await prisma.coupon.findUnique({
      where: { id: couponId }
    });
    if (!existing) {
      throw new AppError_default(404, "Coupon not found");
    }
    const nextType = data.discountType ?? existing.discountType;
    const nextValue = data.discountValue ?? asNumber(existing.discountValue);
    const nextMaxDiscount = data.maxDiscountAmount !== void 0 ? data.maxDiscountAmount : existing.maxDiscountAmount === null ? null : asNumber(existing.maxDiscountAmount);
    validateDiscountConfig({
      discountType: nextType,
      discountValue: nextValue,
      maxDiscountAmount: nextMaxDiscount
    });
    if (data.code) {
      const normalizedCode = normalizeCouponCode(data.code);
      const duplicate = await prisma.coupon.findFirst({
        where: {
          id: { not: couponId },
          code: {
            equals: normalizedCode,
            mode: "insensitive"
          }
        },
        select: { id: true }
      });
      if (duplicate) {
        throw new AppError_default(409, "Coupon code already exists");
      }
      data.code = normalizedCode;
    }
    if (data.usageLimit !== void 0 && data.usageLimit !== null && data.usageLimit < existing.usedCount) {
      throw new AppError_default(
        400,
        "Usage limit cannot be less than current used count"
      );
    }
    const updateData = {
      ...data
    };
    if (data.expiresAt !== void 0) {
      if (data.expiresAt === null) {
        updateData.expiresAt = null;
      } else {
        const parsed = new Date(data.expiresAt);
        if (Number.isNaN(parsed.getTime())) {
          throw new AppError_default(400, "Invalid expiry date");
        }
        updateData.expiresAt = parsed;
      }
    }
    return prisma.coupon.update({
      where: { id: couponId },
      data: updateData
    });
  },
  /**
   * Delete coupon (only if never used).
   */
  async deleteCoupon(couponId) {
    const existing = await prisma.coupon.findUnique({
      where: { id: couponId },
      select: {
        id: true,
        _count: {
          select: { bookings: true }
        }
      }
    });
    if (!existing) {
      throw new AppError_default(404, "Coupon not found");
    }
    if (existing._count.bookings > 0) {
      throw new AppError_default(
        400,
        "Coupon cannot be deleted because it is already used in bookings"
      );
    }
    return prisma.coupon.delete({ where: { id: couponId } });
  },
  /**
   * Validate a coupon code for a specific booking amount.
   */
  async validateCouponForBooking(code, bookingAmount) {
    const normalizedCode = normalizeCouponCode(code);
    const coupon = await prisma.coupon.findUnique({
      where: { code: normalizedCode }
    });
    if (!coupon) {
      throw new AppError_default(404, "Coupon not found");
    }
    const numericBookingAmount = roundMoney(bookingAmount);
    if (!Number.isFinite(numericBookingAmount) || numericBookingAmount <= 0) {
      throw new AppError_default(400, "Booking amount must be greater than 0");
    }
    assertCouponRules(coupon, numericBookingAmount);
    const pricing = calculateDiscount(
      coupon,
      numericBookingAmount
    );
    if (pricing.discountAmount <= 0) {
      throw new AppError_default(400, "Coupon does not provide any discount");
    }
    return {
      coupon,
      bookingAmount: numericBookingAmount,
      discountAmount: pricing.discountAmount,
      finalAmount: pricing.finalAmount
    };
  }
};
var coupon_service_default = CouponService;

// src/modules/booking/booking.helper.ts
var calculateBookingSubtotal = (templates, basePrice) => {
  return templates.reduce((sum, t) => {
    const price = t.priceOverride ?? basePrice;
    return sum + Number(price);
  }, 0);
};
var getBookingExpiryDate = (hours = 24) => {
  return new Date(Date.now() + hours * 60 * 60 * 1e3);
};
var hasBookingAccess = (booking, userId, userRole) => {
  const isOwner = booking.userId === userId;
  const isOrganizerOwner = booking.court?.organizer?.userId === userId;
  const isAdmin = userRole === "ADMIN";
  return isOwner || isOrganizerOwner || isAdmin;
};
var restoreCouponUsage = async (tx, couponId) => {
  return tx.coupon.updateMany({
    where: {
      id: couponId,
      usedCount: { gt: 0 }
    },
    data: {
      usedCount: {
        decrement: 1
      }
    }
  });
};

// src/modules/booking/booking.service.ts
var BookingService = {
  /**
   * Create a booking with selected slot templates.
   */
  async createBooking(userId, data) {
    const { courtId, bookingDate, slotTemplateIds } = data;
    if (!slotTemplateIds || slotTemplateIds.length === 0) {
      throw new AppError_default(400, "At least one slot must be selected");
    }
    const court = await prisma.court.findUnique({ where: { id: courtId } });
    if (!court) throw new AppError_default(404, "Court not found");
    if (court.status !== "ACTIVE")
      throw new AppError_default(400, "Court is not available for booking");
    const targetDate = new Date(bookingDate);
    const templates = await prisma.courtSlotTemplate.findMany({
      where: {
        id: { in: slotTemplateIds },
        courtId,
        isActive: true
      }
    });
    if (templates.length !== slotTemplateIds.length) {
      throw new AppError_default(
        400,
        "One or more selected slots are invalid or inactive"
      );
    }
    for (const t of templates) {
      const existing = await prisma.bookingSlot.findFirst({
        where: {
          courtId,
          bookingDate: targetDate,
          startMinute: t.startMinute,
          booking: {
            status: { in: ["PENDING", "PAID"] }
          }
        }
      });
      if (existing) {
        throw new AppError_default(
          409,
          `Slot ${t.startMinute}-${t.endMinute} is already booked for this date`
        );
      }
    }
    const subtotalAmount = calculateBookingSubtotal(templates, court.basePrice);
    let couponId = null;
    let totalAmount = subtotalAmount;
    if (data.couponCode) {
      const couponResult = await coupon_service_default.validateCouponForBooking(
        data.couponCode,
        subtotalAmount
      );
      couponId = couponResult.coupon.id;
      totalAmount = couponResult.finalAmount;
    }
    const bookingCode = generateBookingCode();
    const expiresAt = getBookingExpiryDate();
    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          bookingCode,
          userId,
          courtId,
          couponId,
          bookingDate: targetDate,
          totalAmount,
          expiresAt
        }
      });
      await tx.bookingSlot.createMany({
        data: templates.map((t) => ({
          bookingId: newBooking.id,
          courtId,
          bookingDate: targetDate,
          startMinute: t.startMinute,
          endMinute: t.endMinute
        }))
      });
      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } }
        });
      }
      return newBooking;
    });
    return await prisma.booking.findUnique({
      where: { id: booking.id },
      include: {
        slots: true,
        court: { select: { id: true, name: true, slug: true } },
        coupon: {
          select: {
            id: true,
            code: true,
            discountType: true,
            discountValue: true
          }
        }
      }
    });
  },
  /**
   * Get bookings for the logged-in user.
   */
  async getUserBookings(userId, query) {
    const qb = new QueryBuilder(query, { defaultSort: "-createdAt" }).addCondition({ userId }).filter(["status"]).sort().paginate();
    const { where, orderBy, skip, take } = qb.build();
    const [bookings, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true
            }
          },
          court: {
            select: {
              id: true,
              name: true,
              slug: true,
              type: true,
              media: {
                select: {
                  url: true,
                  isPrimary: true
                },
                orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
                take: 1
              }
            }
          },
          slots: { orderBy: { startMinute: "asc" } }
        }
      }),
      prisma.booking.count({ where })
    ]);
    return {
      bookings,
      meta: qb.countMeta(total)
    };
  },
  /**
   * Get a single booking by ID.
   */
  async getBookingById(bookingId, userId, userRole) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        court: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            organizerId: true,
            organizer: { select: { userId: true } }
          }
        },
        slots: { orderBy: { startMinute: "asc" } },
        user: { select: { id: true, name: true, email: true } },
        coupon: {
          select: { code: true, discountType: true, discountValue: true }
        }
      }
    });
    if (!booking) throw new AppError_default(404, "Booking not found");
    if (!hasBookingAccess(booking, userId, userRole)) {
      throw new AppError_default(403, "Access denied");
    }
    return booking;
  },
  /**
   * Approve a booking
   */
  async approveBooking(bookingId, userId) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        court: { select: { organizer: { select: { userId: true } } } }
      }
    });
    if (!booking) throw new AppError_default(404, "Booking not found");
    if (booking.status !== "PENDING") {
      throw new AppError_default(
        400,
        `Cannot approve a booking with status: ${booking.status}`
      );
    }
    return await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "PAID",
        paidAt: /* @__PURE__ */ new Date()
      }
    });
  },
  /**
   * Reject a booking
   */
  async rejectBooking(bookingId, userId, reason) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });
    if (!booking) throw new AppError_default(404, "Booking not found");
    if (booking.status !== "PENDING") {
      throw new AppError_default(
        400,
        `Cannot reject a booking with status: ${booking.status}`
      );
    }
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED" }
      });
      await tx.bookingSlot.deleteMany({ where: { bookingId } });
      if (booking.couponId) {
        await restoreCouponUsage(tx, booking.couponId);
      }
      return updated;
    });
  },
  /**
   * Cancel a booking (User owner or Admin)
   */
  async cancelBooking(bookingId, userId, userRole) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });
    if (!booking) throw new AppError_default(404, "Booking not found");
    const canCancel = booking.userId === userId || userRole === "ADMIN";
    if (!canCancel)
      throw new AppError_default(403, "You can only cancel your own bookings");
    if (!["PENDING", "PAID"].includes(booking.status)) {
      throw new AppError_default(
        400,
        `Cannot cancel a booking with status: ${booking.status}`
      );
    }
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED" }
      });
      await tx.bookingSlot.deleteMany({ where: { bookingId } });
      if (booking.status === "PENDING" && booking.couponId) {
        await restoreCouponUsage(tx, booking.couponId);
      }
      return updated;
    });
  },
  /**
   * Get bookings for a specific court (for Organizer dashboard).
   */
  async getCourtBookings(courtId, userId, userRole, query) {
    if (userRole !== "ADMIN") {
      const organizer = await getOrganizerByUserId(userId);
      const court = await prisma.court.findUnique({ where: { id: courtId } });
      if (!court) throw new AppError_default(404, "Court not found");
      if (court.organizerId !== organizer.id) {
        throw new AppError_default(403, "Access denied");
      }
    }
    const qb = new QueryBuilder(query, { defaultSort: "-createdAt" }).addCondition({ courtId }).filter(["status", "bookingDate"]).search(["bookingCode"]).sort().paginate();
    const { where, orderBy, skip, take } = qb.build();
    const [bookings, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true }
          },
          court: {
            select: {
              id: true,
              name: true,
              slug: true,
              type: true,
              media: {
                select: {
                  url: true,
                  isPrimary: true
                },
                orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
                take: 1
              }
            }
          },
          slots: { orderBy: { startMinute: "asc" } }
        }
      }),
      prisma.booking.count({ where })
    ]);
    return {
      bookings,
      meta: qb.countMeta(total)
    };
  }
};
var booking_service_default = BookingService;

// src/modules/booking/booking.controller.ts
var BookingController = {
  createBooking: catchAsync_default(async (req, res) => {
    const result = await booking_service_default.createBooking(req.user.id, req.body);
    sendCreated(res, result, "Booking created successfully");
  }),
  getUserBookings: catchAsync_default(async (req, res) => {
    const { bookings, meta } = await booking_service_default.getUserBookings(
      req.user.id,
      req.query
    );
    sendSuccess(
      res,
      { data: bookings, meta },
      "Bookings retrieved successfully"
    );
  }),
  getBookingById: catchAsync_default(async (req, res) => {
    const result = await booking_service_default.getBookingById(
      req.params.bookingId,
      req.user.id,
      req.user.role
    );
    sendSuccess(res, { data: result }, "Booking retrieved successfully");
  }),
  approveBooking: catchAsync_default(async (req, res) => {
    const result = await booking_service_default.approveBooking(
      req.params.bookingId,
      req.user.id
    );
    sendSuccess(res, { data: result }, "Booking approved successfully");
  }),
  rejectBooking: catchAsync_default(async (req, res) => {
    const result = await booking_service_default.rejectBooking(
      req.params.bookingId,
      req.user.id,
      req.body.reason
    );
    sendSuccess(res, { data: result }, "Booking rejected");
  }),
  cancelBooking: catchAsync_default(async (req, res) => {
    const result = await booking_service_default.cancelBooking(
      req.params.bookingId,
      req.user.id,
      req.user.role
    );
    sendSuccess(res, { data: result }, "Booking cancelled");
  }),
  getCourtBookings: catchAsync_default(async (req, res) => {
    const { bookings, meta } = await booking_service_default.getCourtBookings(
      req.params.courtId,
      req.user.id,
      req.user.role,
      req.query
    );
    sendSuccess(
      res,
      { data: bookings, meta },
      "Court bookings retrieved successfully"
    );
  })
};
var booking_controller_default = BookingController;

// src/modules/booking/booking.route.ts
var router4 = Router4();
router4.post(
  "/",
  auth_default(),
  validateRequest(createBookingSchema),
  booking_controller_default.createBooking
);
router4.get("/my", auth_default(), booking_controller_default.getUserBookings);
router4.get("/:bookingId", auth_default(), booking_controller_default.getBookingById);
router4.patch(
  "/:bookingId/cancel",
  auth_default(),
  booking_controller_default.cancelBooking
);
router4.patch(
  "/:bookingId/approve",
  auth_default(),
  authorize_default("ORGANIZER", "ADMIN"),
  booking_controller_default.approveBooking
);
router4.patch(
  "/:bookingId/reject",
  auth_default(),
  authorize_default("ORGANIZER", "ADMIN"),
  booking_controller_default.rejectBooking
);
router4.get(
  "/court/:courtId",
  auth_default(),
  authorize_default("ORGANIZER", "ADMIN"),
  booking_controller_default.getCourtBookings
);
var BookingRoutes = router4;

// src/modules/coupon/coupon.route.ts
import { Router as Router5 } from "express";

// src/modules/coupon/coupon.controller.ts
var CouponController = {
  createCoupon: catchAsync_default(async (req, res) => {
    const result = await coupon_service_default.createCoupon(req.body);
    sendCreated(res, result, "Coupon created successfully");
  }),
  getAllCoupons: catchAsync_default(async (req, res) => {
    const { coupons, meta } = await coupon_service_default.getAllCoupons(
      req.query
    );
    sendSuccess(res, { data: coupons, meta }, "Coupons retrieved successfully");
  }),
  getCouponById: catchAsync_default(async (req, res) => {
    const result = await coupon_service_default.getCouponById(
      req.params.couponId
    );
    sendSuccess(res, { data: result }, "Coupon retrieved successfully");
  }),
  updateCoupon: catchAsync_default(async (req, res) => {
    const result = await coupon_service_default.updateCoupon(
      req.params.couponId,
      req.body
    );
    sendSuccess(res, { data: result }, "Coupon updated successfully");
  }),
  deleteCoupon: catchAsync_default(async (req, res) => {
    const result = await coupon_service_default.deleteCoupon(
      req.params.couponId
    );
    sendSuccess(res, { data: result }, "Coupon deleted successfully");
  }),
  validateCoupon: catchAsync_default(async (req, res) => {
    const result = await coupon_service_default.validateCouponForBooking(
      req.body.code,
      req.body.bookingAmount
    );
    sendSuccess(
      res,
      {
        data: {
          coupon: {
            id: result.coupon.id,
            code: result.coupon.code,
            discountType: result.coupon.discountType,
            discountValue: result.coupon.discountValue
          },
          bookingAmount: result.bookingAmount,
          discountAmount: result.discountAmount,
          finalAmount: result.finalAmount
        }
      },
      "Coupon validated successfully"
    );
  })
};
var coupon_controller_default = CouponController;

// src/modules/coupon/coupon.validation.ts
import { z as z5 } from "zod";
var createCouponSchema = z5.object({
  code: z5.string("Coupon code must be a string").min(3, "Coupon code must be at least 3 characters").max(40, "Coupon code must not exceed 40 characters").regex(
    /^[A-Za-z0-9_-]+$/,
    "Coupon code can only contain letters, numbers, hyphen, and underscore"
  ),
  discountType: z5.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z5.coerce.number("Discount value must be a number").positive("Discount value must be greater than 0"),
  minBookingAmount: z5.coerce.number("Minimum booking amount must be a number").nonnegative("Minimum booking amount cannot be negative").optional(),
  maxDiscountAmount: z5.coerce.number("Maximum discount amount must be a number").positive("Maximum discount amount must be greater than 0").optional(),
  usageLimit: z5.coerce.number("Usage limit must be a number").int("Usage limit must be an integer").positive("Usage limit must be greater than 0").optional(),
  expiresAt: z5.iso.datetime("Expiry date must be a valid ISO datetime").optional(),
  isActive: z5.boolean().optional()
});
var updateCouponSchema = z5.object({
  code: z5.string("Coupon code must be a string").min(3, "Coupon code must be at least 3 characters").max(40, "Coupon code must not exceed 40 characters").regex(
    /^[A-Za-z0-9_-]+$/,
    "Coupon code can only contain letters, numbers, hyphen, and underscore"
  ).optional(),
  discountType: z5.enum(["PERCENTAGE", "FIXED"]).optional(),
  discountValue: z5.coerce.number("Discount value must be a number").positive("Discount value must be greater than 0").optional(),
  minBookingAmount: z5.coerce.number("Minimum booking amount must be a number").nonnegative("Minimum booking amount cannot be negative").nullable().optional(),
  maxDiscountAmount: z5.coerce.number("Maximum discount amount must be a number").positive("Maximum discount amount must be greater than 0").nullable().optional(),
  usageLimit: z5.coerce.number("Usage limit must be a number").int("Usage limit must be an integer").positive("Usage limit must be greater than 0").nullable().optional(),
  expiresAt: z5.iso.datetime("Expiry date must be a valid ISO datetime").nullable().optional(),
  isActive: z5.boolean().optional()
});
var validateCouponSchema = z5.object({
  code: z5.string("Coupon code must be a string").min(1, "Coupon code cannot be empty"),
  bookingAmount: z5.coerce.number("Booking amount must be a number").positive("Booking amount must be greater than 0")
});

// src/modules/coupon/coupon.route.ts
var router5 = Router5();
router5.post(
  "/validate",
  auth_default(),
  validateRequest(validateCouponSchema),
  coupon_controller_default.validateCoupon
);
router5.get(
  "/",
  auth_default(),
  authorize_default("ADMIN"),
  coupon_controller_default.getAllCoupons
);
router5.post(
  "/",
  auth_default(),
  authorize_default("ADMIN"),
  validateRequest(createCouponSchema),
  coupon_controller_default.createCoupon
);
router5.get(
  "/:couponId",
  auth_default(),
  authorize_default("ADMIN"),
  coupon_controller_default.getCouponById
);
router5.patch(
  "/:couponId",
  auth_default(),
  authorize_default("ADMIN"),
  validateRequest(updateCouponSchema),
  coupon_controller_default.updateCoupon
);
router5.delete(
  "/:couponId",
  auth_default(),
  authorize_default("ADMIN"),
  coupon_controller_default.deleteCoupon
);
var CouponRoutes = router5;

// src/modules/announcement/announcement.route.ts
import { Router as Router6 } from "express";

// src/modules/announcement/announcement.validation.ts
import { z as z6 } from "zod";
var createAnnouncementSchema = z6.object({
  title: z6.string("Title must be a string").min(3, "Title must be at least 3 characters").max(200, "Title must not exceed 200 characters"),
  content: z6.string("Content must be a string").min(10, "Content must be at least 10 characters"),
  type: z6.enum(["INFO", "MAINTENANCE", "PROMOTION"]).optional(),
  audience: z6.enum(["HOME", "VENUE"]).optional(),
  courtId: z6.uuid("court ID must be a valid UUID").optional(),
  imageUrl: z6.string("ImageUrl must be a string").url("Must be a valid URL").optional(),
  isPublished: z6.boolean().optional()
});
var updateAnnouncementSchema = z6.object({
  title: z6.string("Title must be a string").min(3).max(200).optional(),
  content: z6.string("Content must be a string").min(10).optional(),
  type: z6.enum(["INFO", "MAINTENANCE", "PROMOTION"]).optional(),
  imageUrl: z6.url("Must be a valid URL").nullable().optional(),
  isPublished: z6.boolean().optional()
});

// src/modules/announcement/announcement.service.ts
var AnnouncementService = {
  /**
   * Create announcement.
   * - ADMIN can create HOME announcements.
   * - ORGANIZER can create VENUE announcements for own courts.
   */
  async createAnnouncement(userId, userRole, data) {
    if (userRole === "ADMIN") {
      const audience = data.audience ?? "HOME";
      if (audience !== "HOME") {
        throw new AppError_default(400, "Admin announcements must target HOME");
      }
      return prisma.announcement.create({
        data: {
          title: data.title,
          content: data.content,
          type: data.type ?? "INFO",
          audience: "HOME",
          createdByRole: "ADMIN",
          organizerId: null,
          courtId: null,
          imageUrl: data.imageUrl ?? null,
          isPublished: data.isPublished ?? false,
          publishedAt: data.isPublished ? /* @__PURE__ */ new Date() : null
        }
      });
    }
    if (!data.courtId) {
      throw new AppError_default(
        400,
        "courtId is required for organizer announcements"
      );
    }
    const organizer = await getOrganizerByUserId(userId);
    const court = await prisma.court.findUnique({
      where: { id: data.courtId },
      select: { id: true, organizerId: true }
    });
    if (!court) {
      throw new AppError_default(404, "Court not found");
    }
    if (court.organizerId !== organizer.id) {
      throw new AppError_default(
        403,
        "You can only create announcements for your own venues"
      );
    }
    return prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        type: data.type ?? "INFO",
        audience: "VENUE",
        createdByRole: "ORGANIZER",
        organizerId: organizer.id,
        courtId: court.id,
        imageUrl: data.imageUrl ?? null,
        isPublished: data.isPublished ?? false,
        publishedAt: data.isPublished ? /* @__PURE__ */ new Date() : null
      }
    });
  },
  /**
   * Get all announcements.
   * - Public/USER: published only.
   * - ORGANIZER: published + own announcements.
   * - ADMIN: all.
   */
  async getAllAnnouncements(query, userRole, userId) {
    const qb = new QueryBuilder(query, { defaultSort: "-createdAt" }).search(["title", "content"]).filter([
      "type",
      "isPublished",
      "audience",
      "courtId",
      "createdByRole",
      "organizerId"
    ]).sort().paginate();
    if (userRole === "ADMIN") {
    } else if (userRole === "ORGANIZER" && userId) {
      const organizer = await getOrganizerByUserId(userId);
      qb.addCondition({
        OR: [{ isPublished: true }, { organizerId: organizer.id }]
      });
    } else {
      qb.addCondition({ isPublished: true });
    }
    const { where, orderBy, skip, take } = qb.build();
    const [announcements, total] = await prisma.$transaction([
      prisma.announcement.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          title: true,
          content: true,
          type: true,
          audience: true,
          createdByRole: true,
          organizerId: true,
          courtId: true,
          imageUrl: true,
          isPublished: true,
          publishedAt: true,
          createdAt: true
        }
      }),
      prisma.announcement.count({ where })
    ]);
    return { announcements, meta: qb.countMeta(total) };
  },
  /**
   * Public home announcements.
   */
  async getHomeAnnouncements(query) {
    const qb = new QueryBuilder(query, { defaultSort: "-publishedAt" }).search(["title", "content"]).filter(["type"]).sort().paginate().addCondition({
      isPublished: true,
      audience: "HOME"
    });
    const { where, orderBy, skip, take } = qb.build();
    const [announcements, total] = await prisma.$transaction([
      prisma.announcement.findMany({
        where,
        orderBy,
        skip,
        take
      }),
      prisma.announcement.count({ where })
    ]);
    return { announcements, meta: qb.countMeta(total) };
  },
  /**
   * Public venue announcements by court.
   */
  async getVenueAnnouncements(courtId, query) {
    const court = await prisma.court.findUnique({
      where: { id: courtId },
      select: { id: true }
    });
    if (!court) {
      throw new AppError_default(404, "Court not found");
    }
    const qb = new QueryBuilder(query, { defaultSort: "-publishedAt" }).search(["title", "content"]).filter(["type"]).sort().paginate().addCondition({
      isPublished: true,
      audience: "VENUE",
      courtId
    });
    const { where, orderBy, skip, take } = qb.build();
    const [announcements, total] = await prisma.$transaction([
      prisma.announcement.findMany({
        where,
        orderBy,
        skip,
        take
      }),
      prisma.announcement.count({ where })
    ]);
    return { announcements, meta: qb.countMeta(total) };
  },
  /**
   * Get  announcement by ID.
   */
  async getAnnouncementBySlug(announcementId, userRole) {
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId }
    });
    if (!announcement) throw new AppError_default(404, "Announcement not found");
    if (!announcement.isPublished && userRole !== "ADMIN") {
      throw new AppError_default(404, "Announcement not found");
    }
    return announcement;
  },
  /**
   * Update announcement.
   * - ADMIN can update any.
   * - ORGANIZER can update own VENUE announcements.
   */
  async updateAnnouncement(userId, userRole, announcementId, data) {
    const existing = await prisma.announcement.findUnique({
      where: { id: announcementId }
    });
    if (!existing) throw new AppError_default(404, "Announcement not found");
    if (userRole === "ORGANIZER") {
      const organizer = await getOrganizerByUserId(userId);
      if (existing.organizerId !== organizer.id) {
        throw new AppError_default(403, "You can only update your own announcements");
      }
    }
    const updateData = { ...data };
    if (data.isPublished && !existing.isPublished) {
      updateData.publishedAt = /* @__PURE__ */ new Date();
    }
    if (data.isPublished === false) {
      updateData.publishedAt = null;
    }
    return prisma.announcement.update({
      where: { id: announcementId },
      data: updateData
    });
  },
  /**
   * Delete announcement.
   * - ADMIN can delete any.
   * - ORGANIZER can delete own announcements.
   */
  async deleteAnnouncement(userId, userRole, announcementId) {
    const existing = await prisma.announcement.findUnique({
      where: { id: announcementId }
    });
    if (!existing) throw new AppError_default(404, "Announcement not found");
    if (userRole === "ORGANIZER") {
      const organizer = await getOrganizerByUserId(userId);
      if (existing.organizerId !== organizer.id) {
        throw new AppError_default(403, "You can only delete your own announcements");
      }
    }
    return prisma.announcement.delete({ where: { id: announcementId } });
  }
};
var announcement_service_default = AnnouncementService;

// src/modules/announcement/announcement.controller.ts
var AnnouncementController = {
  createAnnouncement: catchAsync_default(async (req, res) => {
    const result = await announcement_service_default.createAnnouncement(
      req.user.id,
      req.user.role,
      req.body
    );
    sendCreated(res, result, "Announcement created successfully");
  }),
  getAllAnnouncements: catchAsync_default(async (req, res) => {
    const { announcements, meta } = await announcement_service_default.getAllAnnouncements(
      req.query,
      req.user?.role,
      req.user?.id
    );
    sendSuccess(
      res,
      { data: announcements, meta },
      "Announcements retrieved successfully"
    );
  }),
  getHomeAnnouncements: catchAsync_default(async (req, res) => {
    const { announcements, meta } = await announcement_service_default.getHomeAnnouncements(
      req.query
    );
    sendSuccess(
      res,
      { data: announcements, meta },
      "Home announcements retrieved successfully"
    );
  }),
  getVenueAnnouncements: catchAsync_default(async (req, res) => {
    const { announcements, meta } = await announcement_service_default.getVenueAnnouncements(
      req.params.courtId,
      req.query
    );
    sendSuccess(
      res,
      { data: announcements, meta },
      "Venue announcements retrieved successfully"
    );
  }),
  getAnnouncementBySlug: catchAsync_default(async (req, res) => {
    const result = await announcement_service_default.getAnnouncementBySlug(
      req.params.slug,
      req.user?.role
    );
    sendSuccess(res, { data: result }, "Announcement retrieved successfully");
  }),
  updateAnnouncement: catchAsync_default(async (req, res) => {
    const result = await announcement_service_default.updateAnnouncement(
      req.user.id,
      req.user.role,
      req.params.announcementId,
      req.body
    );
    sendSuccess(res, { data: result }, "Announcement updated successfully");
  }),
  deleteAnnouncement: catchAsync_default(async (req, res) => {
    await announcement_service_default.deleteAnnouncement(
      req.user.id,
      req.user.role,
      req.params.announcementId
    );
    sendSuccess(res, { data: null }, "Announcement deleted successfully");
  })
};
var announcement_controller_default = AnnouncementController;

// src/modules/announcement/announcement.route.ts
var router6 = Router6();
router6.get("/", optionalAuth, announcement_controller_default.getAllAnnouncements);
router6.get("/home", announcement_controller_default.getHomeAnnouncements);
router6.get("/venue/:courtId", announcement_controller_default.getVenueAnnouncements);
router6.get("/:slug", announcement_controller_default.getAnnouncementBySlug);
router6.post(
  "/",
  auth_default(),
  authorize_default("ADMIN", "ORGANIZER"),
  validateRequest(createAnnouncementSchema),
  announcement_controller_default.createAnnouncement
);
router6.patch(
  "/:announcementId",
  auth_default(),
  authorize_default("ADMIN", "ORGANIZER"),
  validateRequest(updateAnnouncementSchema),
  announcement_controller_default.updateAnnouncement
);
router6.delete(
  "/:announcementId",
  auth_default(),
  authorize_default("ADMIN", "ORGANIZER"),
  announcement_controller_default.deleteAnnouncement
);
var AnnouncementRoutes = router6;

// src/modules/admin/admin.route.ts
import { Router as Router7 } from "express";

// src/modules/admin/admin.validation.ts
import { z as z7 } from "zod";
var changeUserRoleSchema = z7.object({
  role: z7.enum(["USER", "ORGANIZER", "ADMIN"])
});
var createAmenitySchema = z7.object({
  name: z7.string({ error: "Amenity name must be a string" }).min(2, "Amenity name must be at least 2 characters").max(80, "Amenity name must not exceed 80 characters"),
  icon: z7.string({ error: "Icon must be a string" }).max(120, "Icon must not exceed 120 characters").nullable().optional()
});
var updateAmenitySchema = z7.object({
  name: z7.string({ error: "Amenity name must be a string" }).min(2, "Amenity name must be at least 2 characters").max(80, "Amenity name must not exceed 80 characters").optional(),
  icon: z7.string({ error: "Icon must be a string" }).max(120, "Icon must not exceed 120 characters").nullable().optional()
});

// src/modules/admin/admin.helpers.ts
var DAY_IN_MS = 24 * 60 * 60 * 1e3;
var parseDays = (value) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 180;
  return Math.min(365, parsed);
};
var asAmount = (value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value);
  if (value && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};
var formatMonthKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};
var formatMonthLabel = (monthKey) => {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number.parseInt(yearStr ?? "0", 10);
  const month = Number.parseInt(monthStr ?? "1", 10) - 1;
  const date = new Date(year, month, 1);
  return date.toLocaleString("en-US", {
    month: "short",
    year: "2-digit"
  });
};

// src/modules/admin/admin.service.ts
var AdminService = {
  /**
   * Get all users (paginated, searchable).
   */
  async getAllUsers(query) {
    const qb = new QueryBuilder(query, { defaultSort: "-createdAt" }).search(["name", "email", "phone"]).filter(["role", "emailVerified"]).sort().paginate();
    const { where, orderBy, skip, take } = qb.build();
    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          email: true,
          emailVerified: true,
          name: true,
          role: true,
          phone: true,
          avatarUrl: true,
          isApproved: true,
          createdAt: true,
          organizerProfile: {
            select: {
              isVerified: true
            }
          },
          _count: {
            select: {
              bookings: true
            }
          },
          bookings: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              bookingDate: true,
              status: true,
              court: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);
    return { users, meta: qb.countMeta(total) };
  },
  /**
   * Change a user's role.
   */
  async changeUserRole(userId, role) {
    const validRoles = ["USER", "ORGANIZER", "ADMIN"];
    if (!validRoles.includes(role)) {
      throw new AppError_default(
        400,
        `Invalid role. Must be one of: ${validRoles.join(", ")}`
      );
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError_default(404, "User not found");
    return prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          role,
          isApproved: role === "ORGANIZER" ? true : user.isApproved
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          updatedAt: true
        }
      });
      if (role === "ORGANIZER") {
        await tx.organizer.updateMany({
          where: { userId },
          data: { isVerified: true }
        });
      }
      if (role === "USER") {
        await tx.organizer.updateMany({
          where: { userId },
          data: { isVerified: false }
        });
      }
      return updatedUser;
    });
  },
  /**
   * Get dashboard statistics.
   */
  async getDashboardStats() {
    const [
      totalUsers,
      totalOrganizers,
      totalCourts,
      activeCourts,
      totalBookings,
      pendingBookings,
      paidBookings,
      totalAnnouncements
    ] = await prisma.$transaction([
      prisma.user.count(),
      prisma.user.count({ where: { role: "ORGANIZER" } }),
      prisma.court.count(),
      prisma.court.count({ where: { status: "ACTIVE" } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: "PENDING" } }),
      prisma.booking.count({ where: { status: "PAID" } }),
      prisma.announcement.count({ where: { isPublished: true } })
    ]);
    return {
      users: { total: totalUsers, organizers: totalOrganizers },
      courts: { total: totalCourts, active: activeCourts },
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        paid: paidBookings
      },
      announcements: { published: totalAnnouncements }
    };
  },
  /**
   * Get advanced reports for admin analytics page.
   */
  async getReports(query) {
    const rangeDays = parseDays(query.days);
    const now = /* @__PURE__ */ new Date();
    const rangeStart = new Date(now.getTime() - (rangeDays - 1) * DAY_IN_MS);
    const [rawStats, recentRevenueBookings] = await prisma.$transaction(
      async (tx) => {
        const rawStats2 = await this._getRawReportStats(now, rangeStart);
        const recentRevenueBookings2 = await tx.booking.findMany({
          where: {
            status: { in: ["PAID", "COMPLETED"] },
            bookingDate: { gte: rangeStart }
          },
          select: {
            id: true,
            bookingDate: true,
            totalAmount: true,
            court: {
              select: {
                type: true,
                organizer: {
                  select: {
                    id: true,
                    businessName: true,
                    user: { select: { name: true } },
                    courts: { select: { id: true } }
                  }
                }
              }
            }
          }
        });
        return [rawStats2, recentRevenueBookings2];
      }
    );
    const {
      monthlyRevenue,
      topOrganizers,
      courtTypePerformance,
      organizerCount
    } = this._processRevenueData(recentRevenueBookings);
    return {
      rangeDays,
      generatedAt: now.toISOString(),
      summary: {
        lifetimeRevenue: Number(
          asAmount(rawStats.lifetimeRevenue._sum.totalAmount).toFixed(2)
        ),
        totalBookings: rawStats.totalBookings,
        completedTransactions: rawStats.paidBookings + rawStats.completedBookings,
        activeOrganizersInRange: organizerCount,
        totalOrganizers: rawStats.totalOrganizers,
        activeCoupons: rawStats.activeCoupons,
        expiringCouponsSoon: rawStats.expiringCouponsSoon
      },
      statusBreakdown: [
        { status: "PENDING", count: rawStats.pendingBookings },
        { status: "PAID", count: rawStats.paidBookings },
        { status: "COMPLETED", count: rawStats.completedBookings },
        { status: "CANCELLED", count: rawStats.cancelledBookings }
      ],
      monthlyRevenue,
      topOrganizers,
      courtTypePerformance,
      alerts: this._generateAlerts(rawStats)
    };
  },
  /* ---- Internal Report Helpers ---- */
  async _getRawReportStats(now, rangeStart) {
    const [
      lifetimeRevenue,
      totalBookings,
      pendingBookings,
      paidBookings,
      completedBookings,
      cancelledBookings,
      pendingCourts,
      activeCoupons,
      expiringCouponsSoon,
      totalOrganizers
    ] = await prisma.$transaction([
      prisma.booking.aggregate({
        where: { status: { in: ["PAID", "COMPLETED"] } },
        _sum: { totalAmount: true }
      }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: "PENDING" } }),
      prisma.booking.count({ where: { status: "PAID" } }),
      prisma.booking.count({ where: { status: "COMPLETED" } }),
      prisma.booking.count({ where: { status: "CANCELLED" } }),
      prisma.court.count({ where: { status: COURT_STATUS.PENDING_APPROVAL } }),
      prisma.coupon.count({ where: { isActive: true } }),
      prisma.coupon.count({
        where: {
          isActive: true,
          expiresAt: {
            gte: now,
            lte: new Date(now.getTime() + 30 * DAY_IN_MS)
          }
        }
      }),
      prisma.user.count({ where: { role: "ORGANIZER" } })
    ]);
    return {
      lifetimeRevenue,
      totalBookings,
      pendingBookings,
      paidBookings,
      completedBookings,
      cancelledBookings,
      pendingCourts,
      activeCoupons,
      expiringCouponsSoon,
      totalOrganizers
    };
  },
  _processRevenueData(bookings) {
    const monthMap = /* @__PURE__ */ new Map();
    const organizerMap = /* @__PURE__ */ new Map();
    const courtTypeMap = /* @__PURE__ */ new Map();
    for (const booking of bookings) {
      const amount = asAmount(booking.totalAmount);
      const monthKey = formatMonthKey(booking.bookingDate);
      const m = monthMap.get(monthKey) ?? { revenue: 0, bookings: 0 };
      m.revenue += amount;
      m.bookings += 1;
      monthMap.set(monthKey, m);
      const orgId = booking.court.organizer.id;
      const o = organizerMap.get(orgId) ?? {
        organizerId: orgId,
        businessName: booking.court.organizer.businessName,
        ownerName: booking.court.organizer.user.name,
        revenue: 0,
        paidBookings: 0,
        courtCount: booking.court.organizer.courts.length
      };
      o.revenue += amount;
      o.paidBookings += 1;
      organizerMap.set(orgId, o);
      const typeKey = booking.court.type || "Unknown";
      const t = courtTypeMap.get(typeKey) ?? {
        courtType: typeKey,
        revenue: 0,
        paidBookings: 0
      };
      t.revenue += amount;
      t.paidBookings += 1;
      courtTypeMap.set(typeKey, t);
    }
    const monthlyRevenue = Array.from(monthMap.entries()).map(([monthKey, value]) => ({
      monthKey,
      monthLabel: formatMonthLabel(monthKey),
      revenue: Number(value.revenue.toFixed(2)),
      bookings: value.bookings
    })).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    const topOrganizers = Array.from(organizerMap.values()).map((org) => ({ ...org, revenue: Number(org.revenue.toFixed(2)) })).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
    const courtTypePerformance = Array.from(courtTypeMap.values()).map((row) => ({ ...row, revenue: Number(row.revenue.toFixed(2)) })).sort((a, b) => b.revenue - a.revenue);
    return {
      monthlyRevenue,
      topOrganizers,
      courtTypePerformance,
      organizerCount: organizerMap.size
    };
  },
  _generateAlerts(stats) {
    return [
      {
        key: "pending-court-approvals",
        label: "Pending court approvals",
        value: stats.pendingCourts,
        severity: stats.pendingCourts > 10 ? "HIGH" : stats.pendingCourts > 0 ? "MEDIUM" : "LOW"
      },
      {
        key: "pending-bookings",
        label: "Pending booking confirmations",
        value: stats.pendingBookings,
        severity: stats.pendingBookings > 25 ? "HIGH" : stats.pendingBookings > 0 ? "MEDIUM" : "LOW"
      },
      {
        key: "coupons-expiring-30d",
        label: "Coupons expiring in 30 days",
        value: stats.expiringCouponsSoon,
        severity: stats.expiringCouponsSoon > 10 ? "HIGH" : stats.expiringCouponsSoon > 0 ? "MEDIUM" : "LOW"
      }
    ];
  },
  /**
   * Get all courts waiting for admin approval.
   */
  async getPendingCourts(query) {
    const qb = new QueryBuilder(query, { defaultSort: "-createdAt" }).search(["name", "locationLabel", "type", "organizer.businessName"]).addCondition({ status: COURT_STATUS.PENDING_APPROVAL }).sort().paginate();
    const { where, orderBy, skip, take } = qb.build();
    const [courts, total] = await prisma.$transaction([
      prisma.court.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          organizer: {
            select: {
              id: true,
              businessName: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          media: { where: { isPrimary: true }, take: 1, select: { url: true } }
        }
      }),
      prisma.court.count({ where })
    ]);
    return { courts, meta: qb.countMeta(total) };
  },
  /**
   * Approve a pending court
   */
  async approveCourt(courtId) {
    const court = await prisma.court.findUnique({ where: { id: courtId } });
    if (!court) throw new AppError_default(404, "Court not found");
    if (court.status !== COURT_STATUS.PENDING_APPROVAL) {
      throw new AppError_default(400, "Only pending courts can be approved");
    }
    return prisma.court.update({
      where: { id: courtId },
      data: { status: COURT_STATUS.ACTIVE }
    });
  },
  /**
   * Get all amenities
   */
  async getAmenities() {
    return prisma.amenity.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        icon: true,
        _count: {
          select: { courts: true }
        }
      }
    });
  },
  /**
   * Create a new amenity (admin only).
   */
  async createAmenity(data) {
    const name = data.name.trim();
    const exists = await prisma.amenity.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive"
        }
      }
    });
    if (exists) {
      throw new AppError_default(409, "Amenity with this name already exists");
    }
    return prisma.amenity.create({
      data: {
        name,
        icon: data.icon ?? null
      }
    });
  },
  /**
   * Update an amenity (admin only).
   */
  async updateAmenity(amenityId, data) {
    const amenity = await prisma.amenity.findUnique({
      where: { id: amenityId }
    });
    if (!amenity) throw new AppError_default(404, "Amenity not found");
    if (data.name) {
      const name = data.name.trim();
      const duplicate = await prisma.amenity.findFirst({
        where: {
          id: { not: amenityId },
          name: {
            equals: name,
            mode: "insensitive"
          }
        }
      });
      if (duplicate) {
        throw new AppError_default(409, "Amenity with this name already exists");
      }
      data.name = name;
    }
    return prisma.amenity.update({
      where: { id: amenityId },
      data: {
        ...data
      }
    });
  },
  /**
   * Delete an amenity (admin only).
   */
  async deleteAmenity(amenityId) {
    const amenity = await prisma.amenity.findUnique({
      where: { id: amenityId },
      select: { id: true }
    });
    if (!amenity) throw new AppError_default(404, "Amenity not found");
    return prisma.amenity.delete({
      where: { id: amenityId }
    });
  }
};
var admin_service_default = AdminService;

// src/modules/admin/admin.controller.ts
var AdminController = {
  getAllUsers: catchAsync_default(async (req, res) => {
    const { users, meta } = await admin_service_default.getAllUsers(
      req.query
    );
    sendSuccess(res, { data: users, meta }, "Users retrieved successfully");
  }),
  changeUserRole: catchAsync_default(async (req, res) => {
    const result = await admin_service_default.changeUserRole(
      req.params.userId,
      req.body.role
    );
    sendSuccess(res, { data: result }, "User role updated successfully");
  }),
  getDashboardStats: catchAsync_default(async (_req, res) => {
    const result = await admin_service_default.getDashboardStats();
    sendSuccess(
      res,
      { data: result },
      "Dashboard stats retrieved successfully"
    );
  }),
  getReports: catchAsync_default(async (req, res) => {
    const result = await admin_service_default.getReports(
      req.query
    );
    sendSuccess(res, { data: result }, "Reports retrieved successfully");
  }),
  getPendingCourts: catchAsync_default(async (req, res) => {
    const { courts, meta } = await admin_service_default.getPendingCourts(
      req.query
    );
    sendSuccess(
      res,
      { data: courts, meta },
      "Pending courts retrieved successfully"
    );
  }),
  approveCourt: catchAsync_default(async (req, res) => {
    const result = await admin_service_default.approveCourt(
      req.params.courtId
    );
    sendSuccess(res, { data: result }, "Court approved successfully");
  }),
  getAmenities: catchAsync_default(async (_req, res) => {
    const result = await admin_service_default.getAmenities();
    sendSuccess(res, { data: result }, "Amenities retrieved successfully");
  }),
  createAmenity: catchAsync_default(async (req, res) => {
    const result = await admin_service_default.createAmenity(req.body);
    sendSuccess(res, { data: result }, "Amenity created successfully", 201);
  }),
  updateAmenity: catchAsync_default(async (req, res) => {
    const result = await admin_service_default.updateAmenity(
      req.params.amenityId,
      req.body
    );
    sendSuccess(res, { data: result }, "Amenity updated successfully");
  }),
  deleteAmenity: catchAsync_default(async (req, res) => {
    const result = await admin_service_default.deleteAmenity(
      req.params.amenityId
    );
    sendSuccess(res, { data: result }, "Amenity deleted successfully");
  })
};
var admin_controller_default = AdminController;

// src/modules/admin/admin.route.ts
var router7 = Router7();
router7.use(auth_default(), authorize_default("ADMIN"));
router7.get("/users", admin_controller_default.getAllUsers);
router7.patch(
  "/users/:userId/role",
  validateRequest(changeUserRoleSchema),
  admin_controller_default.changeUserRole
);
router7.get("/dashboard", admin_controller_default.getDashboardStats);
router7.get("/reports", admin_controller_default.getReports);
router7.get("/courts/pending", admin_controller_default.getPendingCourts);
router7.patch("/courts/:courtId/approve", admin_controller_default.approveCourt);
router7.get("/amenities", admin_controller_default.getAmenities);
router7.post(
  "/amenities",
  validateRequest(createAmenitySchema),
  admin_controller_default.createAmenity
);
router7.patch(
  "/amenities/:amenityId",
  validateRequest(updateAmenitySchema),
  admin_controller_default.updateAmenity
);
router7.delete("/amenities/:amenityId", admin_controller_default.deleteAmenity);
var AdminRoutes = router7;

// src/modules/organizer/organizer.route.ts
import { Router as Router8 } from "express";

// src/modules/organizer/organizer.validation.ts
import { z as z8 } from "zod";
var createOrganizerProfileSchema = z8.object({
  businessName: z8.string("Business name must be a string").min(2, "Business name must be at least 2 characters").max(150, "Business name must not exceed 150 characters"),
  bio: z8.string("Bio must be a string").max(500, "Bio must not exceed 500 characters").optional(),
  website: z8.url("Must be a valid URL").optional(),
  phoneNumber: z8.string("Phone number must be a string").min(7, "Phone number must be at least 7 characters").max(20, "Phone number must not exceed 20 characters").optional(),
  address: z8.string("Address must be a string").max(300, "Address must not exceed 300 characters").optional()
});
var updateOrganizerProfileSchema = z8.object({
  businessName: z8.string("Business name must be a string").min(2).max(150).optional(),
  bio: z8.string("Bio must be a string").max(500).nullable().optional(),
  website: z8.url("Must be a valid URL").nullable().optional(),
  phoneNumber: z8.string("Phone number must be a string").min(7).max(20).nullable().optional(),
  address: z8.string("Address must be a string").max(300).nullable().optional()
});

// src/modules/organizer/organizer.constants.ts
var SLOT_WINDOWS = [
  { key: "LATE_NIGHT", label: "00:00 - 06:00", startMinute: 0, endMinute: 360 },
  {
    key: "EARLY_MORNING",
    label: "06:00 - 09:00",
    startMinute: 360,
    endMinute: 540
  },
  { key: "MORNING", label: "09:00 - 12:00", startMinute: 540, endMinute: 720 },
  {
    key: "AFTERNOON",
    label: "12:00 - 16:00",
    startMinute: 720,
    endMinute: 960
  },
  { key: "EVENING", label: "16:00 - 24:00", startMinute: 960, endMinute: 1440 }
];
var DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

// src/modules/organizer/ogranizer.helper.ts
var getSlotWindow = (startMinute) => {
  const found = SLOT_WINDOWS.find(
    (window) => startMinute >= window.startMinute && startMinute < window.endMinute
  );
  return found || SLOT_WINDOWS[SLOT_WINDOWS.length - 1];
};

// src/modules/organizer/organizer.service.ts
var OrganizerService = {
  /**
   * Public organizers directory.
   */
  async getPublicDirectory(query) {
    const qb = new QueryBuilder(query, {
      defaultSort: "-createdAt",
      limit: 24,
      maxLimit: 100
    }).search([
      "name",
      "email",
      "organizerProfile.businessName",
      "organizerProfile.address"
    ]).sort().paginate();
    const { where, orderBy, skip, take } = qb.build();
    const [organizerUsers, total] = await prisma.$transaction([
      prisma.user.findMany({
        where: {
          ...where,
          role: "ORGANIZER",
          organizerProfile: {
            isNot: null
          }
        },
        orderBy,
        skip,
        take,
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          createdAt: true,
          organizerProfile: {
            select: {
              id: true,
              businessName: true,
              bio: true,
              website: true,
              address: true,
              isVerified: true,
              createdAt: true,
              courts: {
                where: { status: COURT_STATUS.ACTIVE },
                orderBy: { createdAt: "desc" },
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  type: true,
                  locationLabel: true,
                  basePrice: true,
                  latitude: true,
                  longitude: true,
                  status: true,
                  createdAt: true,
                  media: {
                    where: { isPrimary: true },
                    take: 1,
                    select: { url: true }
                  },
                  _count: {
                    select: {
                      bookings: true
                    }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.user.count({
        where: {
          ...where,
          role: "ORGANIZER",
          organizerProfile: {
            isNot: null
          }
        }
      })
    ]);
    const data = organizerUsers.map((user) => {
      const venues = user.organizerProfile?.courts ?? [];
      const totalBookings = venues.reduce(
        (sum, venue) => sum + (venue._count?.bookings ?? 0),
        0
      );
      return {
        id: user.organizerProfile?.id ?? user.id,
        businessName: user.organizerProfile?.businessName ?? user.name,
        bio: user.organizerProfile?.bio ?? null,
        website: user.organizerProfile?.website ?? null,
        address: user.organizerProfile?.address ?? null,
        isVerified: user.organizerProfile?.isVerified ?? false,
        createdAt: user.organizerProfile?.createdAt ?? user.createdAt,
        user: {
          id: user.id,
          name: user.name,
          avatarUrl: user.avatarUrl
        },
        totalVenues: venues.length,
        totalBookings,
        venues
      };
    });
    return { organizers: data, meta: qb.countMeta(total) };
  },
  /**
   * Public single organizer profile.
   */
  async getPublicProfile(organizerId) {
    const organizer = await prisma.organizer.findUnique({
      where: { id: organizerId },
      select: {
        id: true,
        businessName: true,
        bio: true,
        website: true,
        address: true,
        isVerified: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        },
        courts: {
          where: { status: COURT_STATUS.ACTIVE },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            slug: true,
            name: true,
            type: true,
            locationLabel: true,
            basePrice: true,
            latitude: true,
            longitude: true,
            status: true,
            createdAt: true,
            media: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true }
            },
            _count: {
              select: {
                bookings: true
              }
            }
          }
        }
      }
    });
    if (!organizer) {
      throw new AppError_default(404, "Organizer profile not found");
    }
    const totalBookings = organizer.courts.reduce(
      (sum, venue) => sum + (venue._count?.bookings ?? 0),
      0
    );
    return {
      id: organizer.id,
      businessName: organizer.businessName,
      bio: organizer.bio,
      website: organizer.website,
      address: organizer.address,
      isVerified: organizer.isVerified,
      createdAt: organizer.createdAt,
      user: organizer.user,
      totalVenues: organizer.courts.length,
      totalBookings,
      venues: organizer.courts
    };
  },
  /**
   * Create an organizer profile for a user.
   */
  async createProfile(userId, data) {
    const existing = await prisma.organizer.findUnique({ where: { userId } });
    if (existing) {
      throw new AppError_default(409, "You already have an organizer profile");
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError_default(404, "User not found");
    if (!["USER", "ORGANIZER", "ADMIN"].includes(user.role)) {
      throw new AppError_default(
        403,
        "Only users with USER, ORGANIZER, or ADMIN role can create an organizer profile"
      );
    }
    return prisma.$transaction(async (tx) => {
      if (user.role === "USER") {
        await tx.user.update({
          where: { id: userId },
          data: { role: "ORGANIZER" }
        });
      }
      return tx.organizer.create({
        data: {
          userId,
          businessName: data.businessName,
          bio: data.bio ?? null,
          website: data.website ?? null,
          phoneNumber: data.phoneNumber ?? null,
          address: data.address ?? null
        }
      });
    });
  },
  /**
   * Get organizer profile by user ID.
   */
  async getProfile(userId) {
    const organizer = await prisma.organizer.findUnique({
      where: { userId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true }
        },
        _count: {
          select: { courts: true }
        }
      }
    });
    if (!organizer) {
      throw new AppError_default(404, "Organizer profile not found");
    }
    return organizer;
  },
  /**
   * Update organizer profile.
   */
  async updateProfile(userId, data) {
    const organizer = await prisma.organizer.findUnique({ where: { userId } });
    if (!organizer) {
      throw new AppError_default(404, "Organizer profile not found. Create one first.");
    }
    return prisma.organizer.update({
      where: { userId },
      data
    });
  },
  /**
   * Organizer revenue breakdown by venue, day-of-week, and slot window.
   */
  async getRevenueBreakdown(userId, days = 90) {
    const organizer = await getOrganizerByUserId(userId);
    const safeDays = clampDays(days);
    const fromDate = /* @__PURE__ */ new Date();
    fromDate.setDate(fromDate.getDate() - safeDays);
    fromDate.setHours(0, 0, 0, 0);
    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ["PAID", "COMPLETED"] },
        bookingDate: { gte: fromDate },
        court: { organizerId: organizer.id }
      },
      select: {
        id: true,
        courtId: true,
        totalAmount: true,
        bookingDate: true,
        court: { select: { name: true } },
        slots: { select: { startMinute: true } }
      }
    });
    const { venueMap, dayMap, windowMap, heatmapMap } = this._initializeBreakdownMaps();
    let totalRevenue = 0;
    for (const booking of bookings) {
      const bookingRevenue = Number(booking.totalAmount);
      const dayOfWeek = new Date(booking.bookingDate).getDay();
      const slotCount = Math.max(booking.slots.length, 1);
      const revenuePerSlot = bookingRevenue / slotCount;
      totalRevenue += bookingRevenue;
      const v = venueMap.get(booking.courtId) ?? {
        courtId: booking.courtId,
        courtName: booking.court.name,
        revenue: 0,
        bookings: 0,
        slotCount: 0
      };
      v.revenue += bookingRevenue;
      v.bookings += 1;
      v.slotCount += slotCount;
      venueMap.set(booking.courtId, v);
      const d = dayMap.get(dayOfWeek);
      if (d) {
        d.revenue += bookingRevenue;
        d.bookings += 1;
      }
      for (const slot of booking.slots) {
        const slotWindow = getSlotWindow(slot.startMinute);
        const w = windowMap.get(slotWindow.key);
        if (w) {
          w.revenue += revenuePerSlot;
          w.bookings += 1;
          w.slotCount += 1;
        }
        const heatKey = `${dayOfWeek}:${slotWindow.key}`;
        const h = heatmapMap.get(heatKey);
        if (h) {
          h.revenue += revenuePerSlot;
          h.bookings += 1;
          h.slotCount += 1;
        }
      }
    }
    return {
      rangeDays: safeDays,
      summary: {
        totalRevenue: roundMoney(totalRevenue),
        paidBookings: bookings.length,
        avgBookingValue: bookings.length > 0 ? roundMoney(totalRevenue / bookings.length) : 0
      },
      venueBreakdown: Array.from(venueMap.values()).map((v) => ({
        ...v,
        revenue: roundMoney(v.revenue),
        avgBookingValue: v.bookings > 0 ? roundMoney(v.revenue / v.bookings) : 0,
        sharePercent: totalRevenue > 0 ? roundMoney(v.revenue / totalRevenue * 100) : 0
      })).sort((a, b) => b.revenue - a.revenue),
      dayOfWeekBreakdown: Array.from(dayMap.values()).map((d) => ({
        ...d,
        revenue: roundMoney(d.revenue),
        avgBookingValue: d.bookings > 0 ? roundMoney(d.revenue / d.bookings) : 0
      })),
      slotWindowBreakdown: Array.from(windowMap.values()).map((w) => ({
        ...w,
        revenue: roundMoney(w.revenue),
        avgSlotValue: w.slotCount > 0 ? roundMoney(w.revenue / w.slotCount) : 0
      })),
      heatmap: Array.from(heatmapMap.values()).map((cell) => ({
        ...cell,
        revenue: roundMoney(cell.revenue)
      }))
    };
  },
  _initializeBreakdownMaps() {
    const venueMap = /* @__PURE__ */ new Map();
    const dayMap = /* @__PURE__ */ new Map();
    const windowMap = /* @__PURE__ */ new Map();
    const heatmapMap = /* @__PURE__ */ new Map();
    for (let i = 0; i < 7; i++) {
      dayMap.set(i, {
        dayOfWeek: i,
        label: DAY_LABELS[i],
        revenue: 0,
        bookings: 0
      });
      for (const sw of SLOT_WINDOWS) {
        heatmapMap.set(`${i}:${sw.key}`, {
          dayOfWeek: i,
          dayLabel: DAY_LABELS[i],
          windowKey: sw.key,
          windowLabel: sw.label,
          revenue: 0,
          bookings: 0,
          slotCount: 0
        });
      }
    }
    for (const sw of SLOT_WINDOWS) {
      windowMap.set(sw.key, {
        windowKey: sw.key,
        label: sw.label,
        revenue: 0,
        bookings: 0,
        slotCount: 0
      });
    }
    return { venueMap, dayMap, windowMap, heatmapMap };
  }
};
var organizer_service_default = OrganizerService;

// src/modules/organizer/organizer.controller.ts
var OrganizerController = {
  getPublicDirectory: catchAsync_default(async (req, res) => {
    const { organizers, meta } = await organizer_service_default.getPublicDirectory(
      req.query
    );
    sendSuccess(
      res,
      { data: organizers, meta },
      "Organizers retrieved successfully"
    );
  }),
  getPublicProfile: catchAsync_default(async (req, res) => {
    const organizerId = String(req.params.organizerId || "");
    const result = await organizer_service_default.getPublicProfile(organizerId);
    sendSuccess(
      res,
      { data: result },
      "Organizer profile retrieved successfully"
    );
  }),
  createProfile: catchAsync_default(async (req, res) => {
    const result = await organizer_service_default.createProfile(req.user.id, req.body);
    sendCreated(res, result, "Organizer profile created successfully");
  }),
  getProfile: catchAsync_default(async (req, res) => {
    const result = await organizer_service_default.getProfile(req.user.id);
    sendSuccess(
      res,
      { data: result },
      "Organizer profile retrieved successfully"
    );
  }),
  updateProfile: catchAsync_default(async (req, res) => {
    const result = await organizer_service_default.updateProfile(req.user.id, req.body);
    sendSuccess(
      res,
      { data: result },
      "Organizer profile updated successfully"
    );
  }),
  getRevenueBreakdown: catchAsync_default(async (req, res) => {
    const days = Number(req.query.days ?? 90);
    const result = await organizer_service_default.getRevenueBreakdown(
      req.user.id,
      Number.isFinite(days) ? days : 90
    );
    sendSuccess(
      res,
      { data: result },
      "Revenue breakdown retrieved successfully"
    );
  })
};
var organizer_controller_default = OrganizerController;

// src/modules/organizer/organizer.route.ts
var router8 = Router8();
router8.get("/public", organizer_controller_default.getPublicDirectory);
router8.get("/public/:organizerId", organizer_controller_default.getPublicProfile);
router8.post(
  "/profile",
  auth_default(),
  authorize_default("USER", "ORGANIZER", "ADMIN"),
  validateRequest(createOrganizerProfileSchema),
  organizer_controller_default.createProfile
);
router8.get(
  "/profile",
  auth_default(),
  authorize_default("ORGANIZER", "ADMIN"),
  organizer_controller_default.getProfile
);
router8.get(
  "/analytics/revenue-breakdown",
  auth_default(),
  authorize_default("ORGANIZER"),
  organizer_controller_default.getRevenueBreakdown
);
router8.patch(
  "/profile",
  auth_default(),
  authorize_default("ORGANIZER", "ADMIN"),
  validateRequest(updateOrganizerProfileSchema),
  organizer_controller_default.updateProfile
);
var OrganizerRoutes = router8;

// src/middlewares/errorHandler.ts
import { ZodError } from "zod";
import multer2 from "multer";
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal Server Error";
  let details = null;
  if (statusCode === 500) {
    console.error("\u{1F6D1} SERVER ERROR:", err);
  }
  if (err instanceof ZodError) {
    statusCode = 400;
    message = "Validation failed";
    const zodErr = err;
    const errorsList = zodErr.errors || zodErr.issues || [];
    details = errorsList.map((e) => ({
      field: e.path ? e.path.join(".") : "unknown",
      message: e.message
    }));
  } else if (err instanceof prismaNamespace_exports.PrismaClientValidationError) {
    statusCode = 400;
    message = "Invalid request data";
    details = process.env.NODE_ENV === "development" ? err.message : "Validation failed";
  } else if (err instanceof prismaNamespace_exports.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        statusCode = 409;
        message = "Duplicate value violates unique constraint";
        details = err.meta?.target ? `Field: ${err.meta.target}` : null;
        break;
      case "P2025":
        statusCode = 404;
        message = "Requested record not found";
        break;
      case "P2003":
        statusCode = 400;
        message = "Invalid reference (Foreign Key Constraint)";
        details = err.meta?.field_name ? `Invalid ID in: ${err.meta.field_name}` : null;
        break;
      default:
        statusCode = 400;
        message = "Database request error";
        details = process.env.NODE_ENV === "development" ? err.meta : null;
    }
  } else if (err instanceof prismaNamespace_exports.PrismaClientUnknownRequestError || err instanceof prismaNamespace_exports.PrismaClientRustPanicError || err instanceof prismaNamespace_exports.PrismaClientInitializationError) {
    statusCode = 500;
    message = "Database connection or internal error";
    details = null;
    console.error("\u{1F525} CRITICAL DB ERROR:", err);
  } else if (err instanceof multer2.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      statusCode = 400;
      message = "File is too large. Maximum limit is 5MB.";
    }
  }
  res.status(statusCode).json({
    success: false,
    message,
    ...details && { details },
    ...process.env.NODE_ENV === "development" && { stack: err.stack }
  });
}

// src/modules/payment/payment.route.ts
import { Router as Router9 } from "express";

// src/lib/stripe.ts
import Stripe from "stripe";
var stripe = new Stripe(envVars.STRIPE_SECRET_KEY, {
  apiVersion: "2026-02-25.clover"
});

// src/modules/payment/payment.service.ts
var PaymentService = {
  async initiatePayment(bookingId, userId) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });
    if (!booking) {
      throw new AppError_default(404, "Booking not found");
    }
    if (booking.userId !== userId) {
      throw new AppError_default(403, "You can only pay for your own booking");
    }
    if (booking.status !== "PENDING") {
      throw new AppError_default(
        400,
        `Cannot initiate payment for a booking with status: ${booking.status}`
      );
    }
    if (booking.expiresAt && /* @__PURE__ */ new Date() > booking.expiresAt) {
      throw new AppError_default(
        410,
        "This booking has expired. Please create a new booking."
      );
    }
    const amount = Math.round(Number(booking.totalAmount) * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError_default(400, "Invalid booking amount");
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: envVars.STRIPE_CURRENCY,
      automatic_payment_methods: {
        enabled: true
      },
      receipt_email: booking.user.email,
      metadata: {
        bookingId: booking.id,
        userId: booking.userId
      }
    });
    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentId: paymentIntent.id }
    });
    return {
      bookingId: booking.id,
      amount,
      currency: envVars.STRIPE_CURRENCY,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      publishableKey: envVars.STRIPE_PUBLISHABLE_KEY
    };
  },
  async handleWebhook(signature, payload) {
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        envVars.STRIPE_WEBHOOK_SECRET
      );
    } catch {
      throw new AppError_default(400, "Invalid Stripe webhook signature");
    }
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const bookingId = paymentIntent.metadata?.bookingId;
      if (bookingId) {
        await prisma.booking.updateMany({
          where: {
            id: bookingId,
            status: "PENDING"
          },
          data: {
            status: "PAID",
            paidAt: /* @__PURE__ */ new Date(),
            paymentId: paymentIntent.id
          }
        });
      }
    }
    return {
      received: true,
      eventType: event.type
    };
  }
};
var payment_service_default = PaymentService;

// src/modules/payment/payment.controller.ts
var PaymentController = {
  initiatePayment: catchAsync_default(async (req, res) => {
    const result = await payment_service_default.initiatePayment(
      req.body.bookingId,
      req.user.id
    );
    sendSuccess(res, { data: result }, "Payment intent created successfully");
  }),
  handleWebhook: catchAsync_default(async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (typeof signature !== "string") {
      return res.status(400).json({ success: false, message: "Missing Stripe signature" });
    }
    const payload = req.body;
    const result = await payment_service_default.handleWebhook(signature, payload);
    res.status(200).json(result);
  })
};
var payment_controller_default = PaymentController;

// src/modules/payment/payment.validation.ts
import { z as z9 } from "zod";
var initiatePaymentSchema = z9.object({
  bookingId: z9.uuid("Booking ID must be a valid UUID format")
});

// src/modules/payment/payment.route.ts
var router9 = Router9();
router9.post(
  "/initiate",
  auth_default(),
  validateRequest(initiatePaymentSchema),
  payment_controller_default.initiatePayment
);
router9.post("/webhook", payment_controller_default.handleWebhook);
var PaymentRoutes = router9;

// src/app.ts
var app = express();
app.set("trust proxy", true);
app.use(
  cors({
    origin: [envVars.CLIENT_URL, "http://192.168.9.142:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
  })
);
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.all("/api/auth/{*any}", toNodeHandler(auth));
app.use("/api/users", UserRoutes);
app.use("/api/courts", CourtRoutes);
app.use("/api", ScheduleRoutes);
app.use("/api/bookings", BookingRoutes);
app.use("/api/coupons", CouponRoutes);
app.use("/api/payments", PaymentRoutes);
app.use("/api/announcements", AnnouncementRoutes);
app.use("/api/admin", AdminRoutes);
app.use("/api/organizer", OrganizerRoutes);
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});
app.get("/", (_req, res) => {
  res.send("CourtConnect API is running");
});
app.use(errorHandler);
var app_default = app;

export {
  prisma,
  envVars,
  app_default
};
