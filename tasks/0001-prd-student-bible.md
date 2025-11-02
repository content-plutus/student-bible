# Product Requirements Document: Student Bible - Centralized Data Management System

## 1. Introduction/Overview

The Student Bible is a centralized data management system designed to consolidate all student information from multiple touchpoints across the educational journey into a single source of truth. This system addresses the critical need for unified visibility into student profiles, certification progress, exam performance, and journey tracking for an EdTech organization specializing in international financial certifications (ACCA, US CMA, CFA, US CPA).

**Problem Statement:** Currently, student data is fragmented across Google Forms, internal CRM, and various databases, making it difficult to get a comprehensive view of any student's complete journey and status.

**Goal:** Create a searchable, centralized system where internal teams can access complete student information, from enrollment through certification completion, enabling better student support and data-driven decision making.

## 2. Goals

1. **Consolidate Data:** Unify student information from all touchpoints (enrollment, pre-exam, post-exam, results) into a single accessible system
2. **Enable Quick Search:** Allow instant retrieval of any student's complete profile and journey status via phone number search
3. **Automate Data Collection:** Automatically sync data from existing Google Forms to eliminate manual data entry
4. **Track Student Journey:** Visualize student progress through their certification path (e.g., 2 of 13 papers completed)
5. **Import Historical Data:** Migrate all existing student data from current systems for complete historical records
6. **Support Multiple Certifications:** Handle varying data requirements for different certification types (ACCA, US CMA, CFA, US CPA)
7. **Enable Data Export:** Maintain capability to export data to Google Sheets for teams requiring spreadsheet access

## 3. User Stories

1. **As an internal team member**, I want to search for any student by phone number so that I can quickly access their complete profile and history.

2. **As a student mentor**, I want to view all assigned students' progress and exam performance so that I can provide targeted support.

3. **As a faculty member**, I want to see attendance records and test scores for students so that I can identify those needing additional help.

4. **As an operations manager**, I want to track how many students are planning to take exams in the upcoming quarter so that I can plan resources accordingly.

5. **As a quality analyst**, I want to compare student expectations (post-exam feedback) with actual results so that I can identify gaps in preparation.

6. **As an administrator**, I want to export student data to Google Sheets so that I can create custom reports for management.

7. **As a data entry operator**, I want form submissions to automatically sync to the database so that I don't need to manually transfer data.

## 4. Functional Requirements

### Core System Requirements

1. **The system must** provide a centralized database storing all student information with a unified structure and optional certification-specific fields

2. **The system must** integrate with existing APIs to fetch:
   - Student enrollment and course details
   - Payment transaction history
   - Test scores and weighted averages
   - Class attendance records
   - All pre-enrollment data
   - All LMS (Learning Management System) tracked data

3. **The system must** accept CSV format data from existing APIs

4. **The system must** provide search functionality by phone number to retrieve complete student profiles

5. **The system must** display data initially in table format with ability to add visualizations later

### Data Collection & Integration

6. **The system must** maintain integration with existing Google Forms for data collection

7. **The system must** automatically sync data from Google Forms to the database, prioritizing:
   - ACCA Registration Documents
   - Address Collection Forms (all certifications)
   - MSU Forms

8. **The system must** handle bulk import of all historical data from existing systems (one-time migration)

### User Access & Permissions

9. **The system must** initially provide uniform read-only access to all users (mentors, faculty, internal teams)

10. **The system must** allow for future implementation of role-based access control

### Student Profile & Journey Tracking

11. **The system must** display for each student:
    - Complete profile and background information
    - Enrollment history (which certifications)
    - Preparation tracking (attendance and test scores)
    - Exam attempt history (taken vs. passed)
    - Current progress (e.g., "2 of 13 papers completed")
    - Current journey stage

12. **The system must** track data from multiple touchpoints:
    - Initial Enrollment/Onboarding (credit risk assessment, user personas)
    - Pre-Exam Registration (intent data, mock test performance)
    - Post-Exam Feedback (self-assessment, confidence levels)
    - Post-Results (actual outcomes, gap analysis)

### Reporting & Export

13. **The system must** provide data export functionality to Google Sheets format

14. **The system must** maintain data integrity during export operations

### Performance & Scalability

15. **The system must** handle approximately 500 new user enrollments per month

16. **The system must** avoid dependency on Google Scripts for large-scale operations due to rate limiting issues

17. **The system must** sync API data on a daily basis (data current up to previous day, not real-time)

### Data Management

18. **The system must** retain all historical data indefinitely (no data deletion)

19. **The system must** support local backup exports every 3-6 months

### Schema Flexibility & Extensibility

20. **The system must** support dynamic addition of new form fields without breaking existing functionality

21. **The system must** store unmapped/unknown fields in a flexible JSON column for future use

22. **The system must** support calculated/derived fields based on existing data

23. **The system must** allow schema evolution without requiring system rebuild

24. **The system must** handle partial data gracefully (new fields can be null initially)

## 5. Non-Goals (Out of Scope)

1. **Will NOT** connect to external exam scheduling systems
2. **Will NOT** integrate with payment processing systems (only fetch transaction history)
3. **Will NOT** provide student-facing interfaces (internal use only)
4. **Will NOT** include complex visualizations in the initial version
5. **Will NOT** implement granular user permissions in the MVP
6. **Will NOT** modify or update data in source systems (read-only from APIs)
7. **Will NOT** handle real-time payment transactions

## 6. Design Considerations

### User Interface
- Clean, tabular data presentation as primary view
- Simple search bar prominently placed for phone number search
- Expandable rows to show detailed student information
- Export button for Google Sheets download
- Mobile-responsive design for access on various devices

### Data Structure
- Unified core schema with shared fields across all certifications
- Flexible additional fields for certification-specific requirements
- Proper indexing on phone numbers for fast search
- Relational structure to link multiple forms/touchpoints to single student record

## 7. Data Validation Requirements

Based on analysis of the Google Forms structure, the following validation rules must be implemented:

### Core Student Fields
- **Phone Number:** Required, 10 digits, Indian mobile format (starts with 6-9)
- **Email:** Required, valid email format (xxx@xxx.xxx)
- **First Name:** Required, text only, min 2 characters
- **Last Name:** Required, text only, min 1 character
- **Date of Birth:** Required, date format (DD/MM/YYYY), must be between 1950-2010
- **Gender:** Required, enum values: Male/Female/Others
- **Guardian Phone Number:** Required, 10 digits

### Identification & Demographics
- **AADHAR Number:** Required for Indian students, 12 digits
- **Father's Name:** Required, text only
- **Mother's Name:** Required, text only
- **Salutation:** Required, enum values: Mr/Ms/Mrs
- **Disability Status:** Required, boolean (Yes/No)
- **Education Level:** Required, enum values: 10th/12th/Graduate/Master/Other

### Address Fields (for book delivery)
- **Residential Address:** Required, min 20 characters, must include landmark
- **Town/City:** Required, text only
- **State:** Required, text from predefined list of Indian states
- **Pin Code:** Required, 6 digits

### Academic Information
- **Registration Number:** Optional (can be "NA" if pending), alphanumeric
- **Batch Code:** Required, specific format (e.g., CMA_P1_SecA_Batch_7_W_E)
- **College Name:** Required, text
- **University Name:** Required, text
- **Major Subject:** Required, text
- **Passing Year:** Required, 4 digits, between current year and +5 years
- **Stream in 12th:** Required, enum values: Commerce/Arts/Science/Other

### Engagement Metrics
- **Class Engagement:** Required, integer 1-10
- **Concept Clarity:** Required, integer 1-10
- **Suggestions/Feedback:** Optional, text, max 500 characters

### Certification-Specific Fields
- **Certification Type:** Required, enum values: ACCA/US CMA/CFA/US CPA
- **Subject Studying:** Optional, certification-specific codes (e.g., BT/MA/FA for ACCA)
- **Exams Given:** Optional, text (can be "NA")
- **Future Exam Bookings:** Optional, text with date format validation if provided

### Data Integrity Rules
- **Duplicate Prevention:** No duplicate entries for same phone number + certification combination
- **Cross-field Validation:** 
  - Guardian phone cannot be same as student phone
  - Email must be unique per student
  - Date of birth must make student at least 16 years old
- **Format Standardization:**
  - Phone numbers stored without country code or special characters
  - Names trimmed and title-cased
  - Addresses trimmed of extra spaces

## 8. Technical Considerations

### Tech Stack Options & Effort Analysis

#### Option 1: **Supabase + Next.js** (Recommended)
- **Stack:** Supabase (PostgreSQL + Auth + Realtime), Next.js, Vercel hosting
- **Effort:** Low-Medium (2-3 weeks for MVP)
- **Pros:** 
  - Free tier covers your needs (500MB database, 2GB bandwidth)
  - Built-in auth and API generation
  - Real-time sync capabilities
  - Excellent documentation
  - Auto-generated APIs from database schema
- **Cons:** Vendor lock-in, limited customization on free tier
- **Maintenance:** Very Low - mostly configuration-based

#### Option 2: **Google Sheets + AppSheet**
- **Stack:** Google Sheets as database, AppSheet for interface
- **Effort:** Very Low (1 week for MVP)
- **Pros:**
  - Familiar Google ecosystem
  - No coding required
  - Free for up to 10 users
  - Native Google Forms integration
- **Cons:** Performance issues with large datasets, limited customization
- **Maintenance:** Very Low - no code to maintain

#### Option 3: **Retool + PostgreSQL**
- **Stack:** Retool (low-code platform), PostgreSQL on Supabase/Neon
- **Effort:** Low (1-2 weeks for MVP)
- **Pros:**
  - Drag-and-drop interface building
  - Built-in database connectors
  - Good for internal tools
  - Free tier available (5 users)
- **Cons:** User limit on free tier, less flexible for custom features
- **Maintenance:** Low - visual configuration

#### Option 4: **Node.js + PostgreSQL + React**
- **Stack:** Express.js API, PostgreSQL, React frontend, Railway/Render hosting
- **Effort:** Medium-High (3-4 weeks for MVP)
- **Pros:**
  - Full control and customization
  - No vendor lock-in
  - Scalable architecture
- **Cons:** Requires more technical knowledge, longer development time
- **Maintenance:** Medium - requires code updates and monitoring

### Data Migration Strategy
- Use CSV import tools for one-time historical data migration
- Implement polling mechanism for Google Forms (check every 2-4 hours for new submissions)
- Use Google Sheets API to read form responses programmatically
- Implement incremental sync to avoid rate limiting issues

### API Integration
- Create API wrapper service to standardize CSV data from different sources
- Implement daily batch sync (run once per day, typically at night) to fetch data up to previous day
- Use batch processing for large data operations
- No real-time requirements simplifies architecture and avoids rate limiting

### Backup Strategy
- Implement export functionality for complete database backup
- Schedule local backups every 3-6 months
- Export in CSV or SQL format for portability

## 9. Success Metrics

1. **Data Completeness:** 100% of historical student data successfully migrated
2. **Search Performance:** Student profile retrieval in under 2 seconds
3. **Data Freshness:** All data synchronized daily with information current up to previous day
4. **System Availability:** 99% uptime during business hours
5. **User Adoption:** 80% of internal team actively using the system within first month
6. **Data Accuracy:** Zero data discrepancies between source systems and Student Bible
7. **Process Efficiency:** 50% reduction in time spent searching for student information
8. **Backup Reliability:** Successful local backups completed every 3-6 months

## 10. Open Questions

### Answered Questions
1. ~~**Data Privacy:**~~ No specific data privacy requirements ✓
2. ~~**Backup Strategy:**~~ Local backups every 3-6 months ✓
4. ~~**API Rate Limits:**~~ Daily batch sync (not real-time) avoids rate limit issues ✓
5. ~~**Data Retention:**~~ All data retained indefinitely ✓
6. ~~**Mobile Access:**~~ Not required ✓

### Answered Questions (Continued)
3. ~~**Form Webhooks:**~~ No webhooks configured - will implement polling approach ✓

### Answered Questions (Continued)
8. ~~**Data Validation:**~~ Validation rules derived from Google Forms analysis ✓

### Optional Questions (Can be decided during implementation)
7. **Notification System:** Should the system send alerts for specific events (e.g., exam registration, results)?
9. **Support Process:** Who will provide technical support once the system is live?
10. **Growth Projections:** What's the expected growth rate beyond 500 enrollments/month?

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- Set up chosen tech stack
- Design and implement database schema
- Create basic CRUD operations
- Implement phone number search

### Phase 2: Data Migration (Week 2-3)
- Bulk import historical data
- Set up API integrations for LMS/CRM data
- Validate data integrity

### Phase 3: Forms Integration (Week 3-4)
- Connect priority Google Forms
- Implement auto-sync mechanism
- Test data flow

### Phase 4: User Interface (Week 4-5)
- Build search and display interface
- Implement data export functionality
- Add basic authentication

### Phase 5: Testing & Deployment (Week 5-6)
- User acceptance testing
- Performance optimization
- Production deployment
- Documentation and training

## Recommended Next Steps

1. **Choose Tech Stack:** Based on the analysis, Supabase + Next.js offers the best balance of ease, features, and maintenance
2. **Set Up Development Environment:** Create free accounts on chosen platforms
3. **Design Database Schema:** Map out tables and relationships based on the unified structure
4. **Create Proof of Concept:** Build a simple version with just search and display
5. **Test API Integration:** Verify you can successfully fetch data from existing systems
6. **Plan Migration:** Prepare CSV files from existing data sources for import
7. **Implement Polling:** Set up Google Forms polling mechanism (2-4 hour intervals)

This PRD provides a comprehensive blueprint for building your Student Bible system while maintaining flexibility for future enhancements.
