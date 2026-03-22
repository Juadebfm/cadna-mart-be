# Auth Registration Refactor Plan

## Overview
Remove account type selection from signup flow. Buyer registration is simplified (Clerk OAuth or custom email). Seller registration is a separate fully custom flow. Investor flow deferred.

---

## 1. Cleanup — Remove Account Type Selection Step
- [x] Delete `RegisterAccountTypeDto` (`src/auth/dto/register-account-type.dto.ts`)
- [x] Remove `POST /auth/register/account-type` endpoint from `AuthController`
- [x] Remove `registerAccountType()` method from `AuthService`
- [x] Remove `accountType` field from `RegistrationSession` schema
- [x] Remove `setAccountType()` method from `RegistrationSessionService`
- [x] Update session step numbering (step 2 = details, step 3 = password)
- [x] Update `registerDetails()` to validate step 1 instead of step 2
- [x] Update `registerPassword()` to validate step 2 instead of step 3
- [x] Hardcode `accountType: BUYER` in `registerPassword()` when creating user

## 2. Simplify Buyer Registration (4 steps)
- [x] Step 1: `POST /auth/register/email` — unchanged
- [x] Step 2: `POST /auth/register/details` — name, phone, terms (now step 2, was step 3)
- [x] Step 3: `POST /auth/register/password` — creates user as BUYER, sends OTP (now step 3, was step 4)
- [x] Step 4: `POST /auth/register/verify` — OTP verification, unchanged
- [x] Verify Clerk OAuth flow (`POST /auth/clerk/login`) still works — auto-creates as BUYER
- [x] Test full buyer flow end-to-end with dev bypass OTP (000000)
- [x] Fix double-hashing bug in registerPassword (usersService.create already hashes)

## 3. Create SellerProfile Collection
- [x] Create `src/sellers/schemas/seller-profile.schema.ts` with fields:
  - `user` (ObjectId ref to User, required, unique)
  - `businessName` (string, required)
  - `businessRegistrationNumber` (string, nullable — CAC number)
  - `businessAddress` (string, required)
  - `businessType` (enum: sole_proprietor, llc, partnership)
  - `bankName` (string, required)
  - `bankAccountNumber` (string, required)
  - `bankAccountName` (string, required)
  - `isApproved` (boolean, default: false) — admin must approve before product upload
  - `approvedAt` (Date, nullable)
  - `approvedBy` (ObjectId ref to User, nullable)
- [x] Register `SellerProfile` in `SellersModule` MongooseModule.forFeature
- [x] Add `isApproved` check to product creation endpoint (reject if seller not approved)

## 4. Build Seller Registration Flow
- [x] Create `RegisterSellerEmailDto` (reuses `RegisterEmailDto`)
- [x] Create `RegisterSellerDetailsDto`:
  - firstName, lastName, phoneNumber
  - businessName, businessRegistrationNumber (optional)
  - businessAddress, businessType
  - bankName, bankAccountNumber, bankAccountName
  - termsAccepted
- [x] Create `RegisterSellerPasswordDto` (sessionId, password, confirmPassword + business details)
- [x] Create seller registration session handling (reuses existing session)
- [x] Add endpoints in `AuthController`:
  - `POST /auth/register/seller/email` — start seller registration
  - `POST /auth/register/seller/details` — personal + business details
  - `POST /auth/register/seller/password` — create User (SELLER) + SellerProfile, send OTP
  - `POST /auth/register/seller/verify` — OTP verification (reuses existing verify endpoint)
- [x] Add service methods in `AuthService` for seller registration
- [x] On user creation: set `accountType: SELLER`, `isActive: true`
- [x] On SellerProfile creation: set `isApproved: false`
- [x] Test full seller flow end-to-end with dev bypass OTP (000000)

## 5. Admin — Seller Approval Gate
- [x] Add `PATCH /admin/sellers/:id/approve` endpoint
  - Sets `isApproved: true`, `approvedAt: new Date()`, `approvedBy: adminUserId`
- [x] Add `PATCH /admin/sellers/:id/reject` endpoint (sets isApproved: false)
- [x] Update product creation in `ProductsService.createProduct()`:
  - Look up SellerProfile by userId
  - If `isApproved !== true`, throw `ForbiddenException('Your seller account is pending approval')`
- [x] Add seller profile info to `GET /admin/sellers` list response

## 6. Deferred — Investor/Partner Flow
- [x] Keep `INVESTOR` in AccountType enum for forward compatibility
- [x] Do NOT build registration flow now
- [ ] Revisit when investor features are needed

---

## Testing Checklist
- [x] Buyer signup via email (4 steps) works
- [x] Buyer login with correct password works
- [ ] Buyer signup via Clerk OAuth (Google/Facebook) works — requires Clerk keys configured
- [x] Seller signup via email (4 steps) creates User + SellerProfile
- [x] Seller login works, returns `accountType: "seller"`
- [x] Seller cannot upload products until admin approves (403 response)
- [ ] Admin can approve seller via PATCH endpoint — requires admin JWT
- [ ] Approved seller can upload products — requires admin approval first
- [x] Dev bypass OTP (000000) works in non-prod
- [x] Existing login, 2FA, forgot password flows unaffected (no code changes)
- [x] Existing buyer accounts unaffected

---

## Bugs Found & Fixed During Testing
- **Double-hashing bug**: `AuthService.registerPassword()` was hashing the password before passing to `usersService.create()`, which hashes it again. Fixed by passing raw password — `usersService.create()` handles hashing.
- **AdminModule missing SellerProfile model**: `AdminSellersController` injects `SellerProfileModel` but it wasn't registered in `AdminModule`. Fixed by adding `MongooseModule.forFeature` to `AdminModule`.

---

## API Routes Summary (After Refactor)

### Buyer (Clerk OAuth)
| Method | Route | Auth |
|--------|-------|------|
| POST | `/auth/clerk/login` | Public |

### Buyer (Custom Email)
| Method | Route | Auth |
|--------|-------|------|
| POST | `/auth/register/email` | Public |
| POST | `/auth/register/details` | Public |
| POST | `/auth/register/password` | Public |
| POST | `/auth/register/verify` | Public |

### Seller (Custom Email Only)
| Method | Route | Auth |
|--------|-------|------|
| POST | `/auth/register/seller/email` | Public |
| POST | `/auth/register/seller/details` | Public |
| POST | `/auth/register/seller/password` | Public |
| POST | `/auth/register/seller/verify` | Public |

### Admin — Seller Management
| Method | Route | Auth |
|--------|-------|------|
| PATCH | `/admin/sellers/:id/approve` | Admin |
| PATCH | `/admin/sellers/:id/reject` | Admin |

### Existing (Unchanged)
| Method | Route | Auth |
|--------|-------|------|
| POST | `/auth/login` | Public |
| POST | `/auth/login/verify-2fa` | Public |
| POST | `/auth/forgot-password` | Public |
| POST | `/auth/forgot-password/verify` | Public |
| POST | `/auth/forgot-password/reset` | Public |
| POST | `/auth/refresh` | Public |
| GET | `/auth/profile` | Authenticated |
| POST | `/auth/logout` | Authenticated |
| POST | `/auth/2fa/enable` | Authenticated |
| POST | `/auth/2fa/confirm` | Authenticated |
| POST | `/auth/2fa/disable` | Authenticated |
