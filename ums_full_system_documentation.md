# **SGT UNIVERSITY — UMS (UNIVERSITY MANAGEMENT SYSTEM)**
# **FULL ENTERPRISE SYSTEM DOCUMENTATION**
### **Version 1.0**
### **Prepared For: SGT University**
### **Prepared By: [Your Name / Your Startup]**

---

# **TABLE OF CONTENTS**

## **1. System Overview**
1.1 Introduction  
1.2 Purpose of the UMS  
1.3 Scope of Version 1.0  
1.4 Target Users  
1.5 Technology Stack Overview  

## **2. Functional Requirements Overview**
2.1 Modules Included in Phase 1  
2.2 High-Level Functional Blocks  
2.3 Non-Functional Requirements (NFR)  

## **3. Architecture Overview**
3.1 System Architecture Diagram  
3.2 Backend Architecture (Express.js)  
3.3 Frontend Architecture (Next.js)  
3.4 Database Architecture (PostgreSQL)  
3.5 Caching Layer (Redis)  
3.6 File Storage Architecture (Amazon S3)  
3.7 Deployment Overview (Docker + EC2)  

## **4. Master Module Documentation**
4.1 Schools Management  
4.2 Departments Management  
4.3 Central Departments  
4.4 User Creation Workflow  
4.5 Role & Permission Management  
4.6 Scope-Based Access Control  

## **5. IPR Module Documentation**
5.1 Patent Idea Request Flow  
5.2 Copyright Filing Flow  
5.3 Trademark Filing Flow  
5.4 DRD Review Process  
5.5 Dean Approval Process  
5.6 Finance Incentive Process  
5.7 Applicant Dashboard View  

## **6. Patent Filing (Frontend Field Specification)**
6.1 Form Sections  
6.2 Field-Level Documentation from Screenshots  
6.3 Validation Rules  
6.4 Database Mapping  

## **7. Research Paper Submission Module**
7.1 Submission Flow  
7.2 Reviewer Assignment  
7.3 Decision Workflow  
7.4 Published Paper Handling  

## **8. Database Documentation (Normalized 3NF)**
8.1 ERD (Entity–Relationship Diagram)  
8.2 Master Tables (Referenced)  
8.3 IPR Tables  
8.4 Research Tables  
8.5 Role & Permission Tables  
8.6 Incentive Tables  

## **9. API Documentation (Express.js)**
9.1 Auth  
9.2 Master Module APIs  
9.3 IPR Filing APIs  
9.4 DRD Review APIs  
9.5 Research Paper APIs  
9.6 File Upload APIs (S3 Presigned URL)  

## **10. User Interface Flow (Next.js)**
10.1 Navigation Map  
10.2 Screen-by-Screen Flow  
10.3 State Management  
10.4 Form Submissions  
10.5 Error Handling & Alerts  

## **11. Security Architecture**
11.1 Authentication  
11.2 Authorization Middleware  
11.3 JWT / Session  
11.4 File Upload Security  
11.5 Input Sanitization  

## **12. Deployment & DevOps Documentation**
12.1 Dockerization  
12.2 Docker-Compose File Layout  
12.3 EC2 Deployment Steps  
12.4 Nginx Reverse Proxy  
12.5 SSL Setup (Let’s Encrypt / AWS ACM)  

## **13. Testing Documentation**
13.1 Unit Tests  
13.2 API Tests  
13.3 Integration Tests  
13.4 UAT Scripts  

## **14. Future Scope & Enhancements**
14.1 Phase 2 & Phase 3 Modules  
14.2 AI-Based Insights  
14.3 Analytics Dashboard  

---
# **1. SYSTEM OVERVIEW**

## **1.1 Introduction**
SGT University's **University Management System (UMS)** is a large-scale enterprise platform intended to unify academic, administrative, research, and innovation workflows under one modern, scalable, cloud-ready system.

Version 1.0 focuses on:
- IPR (Patent, Copyright, Trademark) Filing & Review
- Research Paper Submission
- Master Module (Schools, Depts, Central Depts)
- User & Role Assignment with Permission Scopes
- DRD + Dean + Finance Approval Chain
- Incentive & Credit Workflow

---

# **2. FUNCTIONAL REQUIREMENTS OVERVIEW**

## **2.1 Modules Included in Phase 1**
- Master Setup Module
- IPR Management Module
- Research Paper Module
- Role & Permission Engine
- DRD Workflow Module
- Finance Incentive Module
- Applicant (Faculty/Student/External) Portal

## **2.3 Non-Functional Requirements (NFR)**
- High Performance (Redis caching, optimized SQL queries)
- High Scalability (Docker containers horizontally scalable)
- Secure (RBAC, S3 signed URLs, encrypted data)
- Reliable (PostgreSQL + daily backups)
- Cloud Hosted (EC2 + S3 + optional RDS)
- Versioned & Audited (history tables)

---
# **3. ARCHITECTURE OVERVIEW**

## **3.1 System Architecture Diagram**
```
Next.js (Frontend)
      |
      v
Express.js API → PostgreSQL
      |                |
      |→ Redis Cache   |
      |→ S3 File Store |

Deployed via Docker on AWS EC2
```

## **3.4 Database Architecture (PostgreSQL)**
- Fully normalized (3NF)
- Strong FK enforcement
- Composite indexes for search & workflow speed

---
# **4. MASTER MODULE DOCUMENTATION**

## **4.1 Schools Management**
Super Admin can:
- Create School (Faculty of Engineering, Medical Sciences, etc.)
- Edit, Enable/Disable
- Map users under schools

## **4.4 User Creation Workflow**
User creation is done by super admin:
- Insert into `employee_details` (master DB)
- Insert record in `ums_user`
- Assign role via `user_role`
- Assign scope via `role_scope`

---
# **5. IPR MODULE DOCUMENTATION**

## **5.1 Patent Idea Request Workflow**
### **Actors**
- Applicant (internal/external)
- DRD Team Member
- DRD Dean
- Finance Reviewer
- Super Admin

### **Workflow**
1. Applicant submits Patent Idea Request.
2. DRD Team Member reviews.
3. If errors → DRD edits → applicant accepts/resubmits.
4. Loop continues until correct.
5. DRD Member approves.
6. DRD Dean approves.
7. Finance processes incentives.
8. Applicant dashboard updates.

---
# **6. PATENT FILING FIELD DOCUMENTATION (FROM SCREENSHOTS)**

## **6.1 SECTION A — Idea Details**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Idea For | Dropdown | Yes | Patent / Copyright / Trademark |
| Type | Dropdown | Yes | PhD / PG Project / UG Project / Any Other |
| Type of Filing | Dropdown | Yes | Provisional / Complete |
| SDG | Multi-select | Yes | SDG1–SDG17 |
| Title | Text | Yes | Name of invention |
| Description | Long text | Yes | Abstract / idea description |
| Remarks | Text | Optional | Additional comments |
| Annexure 1 Upload | File (.docx) | Yes | Mandatory upload |

## **6.2 SECTION B — Applicant Details (Internal Users)**
| Field | Type | Required |
|-------|------|----------|
| Employee Category | Dropdown | Yes |
| Employee Type | Dropdown | Yes (Staff/Student) |
| UID/VID | Text | Yes |
| Email | Text | Yes |
| Phone | Text | Yes |
| University/Dept Name | Text | Yes |

## **6.3 SECTION C — Applicant Details (External Users)**
| Field | Type | Required |
|-------|------|----------|
| Name | Text | Yes |
| Option | Dropdown | Yes (National / International / Industry) |
| Institute Type | Dropdown | Yes (Academic / Industry) |
| Company/University Name | Text | Yes |

---
# **7. IPR WORKFLOW ENGINE — STATE MACHINE**
```
Draft → Submitted → Under DRD Review → Changes Required → Resubmitted → DRD Approved → Dean Approved → Finance Approved → Completed
                ↘ Rejected (DRD/Dean/Finance)
```
Each transition is stored in `ipr_status_history`.

---
# **8. DATABASE DOCUMENTATION (SUMMARIZED)**
(Full table definitions already included in previous document.)

Additional tables for SDG & applicant types:

### **8.1 ipr_sdg**
Maps many SDGs to a single IPR filing.
```
ipr_sdg(
  id SERIAL PK,
  ipr_id FK,
  sdg_code VARCHAR
)
```

### **8.2 ipr_applicant_details**
Holds internal/external applicant metadata.
```
category, type, uid, email, phone, institute_type, company_name
```

---
# **9. API DOCUMENTATION (Express.js)**
## **9.1 IPR Filing APIs**
### **POST /api/ipr/create**
Creates IPR entry.

### **POST /api/ipr/upload-annexure**
Generates pre-signed S3 URL.

### **POST /api/ipr/review/drd**
DRD member reviews.

### **POST /api/ipr/approve/dean**
Dean approval.

### **POST /api/ipr/finance/approve**
Finance approval.

---
# **10. FRONTEND FLOW (Next.js)**

## **10.1 Pages**
- `/ipr/patent/new`
- `/ipr/my-requests`
- `/drd/review`
- `/dean/review`
- `/finance/requests`

## **10.2 State Management**
- Zustand / Redux
- Axios for API calls

---
# **11. SECURITY ARCHITECTURE**
- JWT auth
- Role + scope-based permission middleware
- Input sanitization
- File validation
- S3 signed URLs

---
# **12. DEPLOYMENT DOCUMENTATION**

## **12.1 Docker**
- Backend Dockerfile
- Frontend Dockerfile
- docker-compose for local

## **12.4 AWS Deployment**
- EC2 Ubuntu 22.04
- Install Docker
- Pull images
- Configure Nginx reverse proxy
- Point domain + enable SSL

---
# **13. TEST CASES OVERVIEW**
- Patent filing test suite
- DRD workflow test suite
- Finance incentive test suite
- API validation tests

---
# **14. FUTURE SCOPE**
- AI-based plagiarism + novelty check
- Integrated Research Analytics Dashboard
- Full Academic UMS (Attendance, LMS, Exams)
- Multilevel reporting engine

---
# **END OF DOCUMENT**

