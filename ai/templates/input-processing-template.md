# Input Processing Template

A structured format for turning user stories, API specifications, and feature requirements into
actionable development tasks that follow this project's architecture.

> Uses the finalized conventions: `_modules/` structure, `Col`/`Row`/`TextPrimary`, domain-implicit API
> clients. See [`../shared/07-ai-workflow-integration.md`](../shared/07-ai-workflow-integration.md).

## User Story Processing Template

### Story Information
| Field | Value | Notes |
|-------|-------|-------|
| **Story Title** | [Title] | Brief descriptive title |
| **Story Type** | Feature/Bug/Enhancement/Technical | Classification |
| **Priority** | High/Medium/Low | Business priority |
| **Complexity** | Simple/Medium/Complex | Development effort estimate |
| **Domain** | [Domain Name] | Business domain (Book, Product, User, Order) |

### User Story Details
| Field | Value | Notes |
|-------|-------|-------|
| **As a** | [User Type] | Guest, Member, Corporate, Admin, etc. |
| **I want to** | [Action/Goal] | What they want to accomplish |
| **So that** | [Benefit/Reason] | Why they need it |
| **Acceptance Criteria** | [List] | Specific, testable requirements |

### Technical Breakdown
| Component | Details | Implementation Notes |
|-----------|---------|---------------------|
| **Screen Components** | [List screens] | e.g., `BookListScreen`, `BookDetailScreen` |
| **UI Components** | [List components] | e.g., `Card`, `Form`, `ModalContent` (abstract naming within domain) |
| **API Endpoints** | [List endpoints] | e.g., GET /books, POST /books, PUT /books/:id |
| **Data Models** | [List models] | e.g., `ModelBook`, `ModelBookFilter` |
| **Routes** | [List routes] | e.g., /books, /books/:id |

### Implementation Checklist
- [ ] Define data models and types
- [ ] Create API client functions (`apiClient[Domain].ts`)
- [ ] Build base components (if needed)
- [ ] Create domain-specific components
- [ ] Implement screen components
- [ ] Add routing configuration (`routeLinks`)
- [ ] Add translations (i18next)
- [ ] Test functionality
- [ ] Update documentation

## API Specification Processing Template

### API Endpoint Information
| Field | Value | Notes |
|-------|-------|-------|
| **Endpoint** | [HTTP Method] [URL Path] | e.g., GET /api/books |
| **Description** | [Brief description] | What this endpoint does |
| **Domain** | [Domain Name] | Business domain |
| **Authentication** | Required/Optional/Public | Auth requirements |
| **Rate Limiting** | [Limits if any] | API rate limits |

### Request Specification
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| **Path Parameters** | | | | |
| `id` | string | Yes | Book identifier | UUID format |
| **Query Parameters** | | | | |
| `page` | number | No | Page number (default: 1) | Min: 1 |
| `limit` | number | No | Items per page (default: 20) | Min: 1, Max: 100 |
| `search` | string | No | Search term | Max: 255 chars |
| **Body Parameters** | | | | |
| `title` | string | Yes | Book title | Max: 255 chars |
| `author` | string | Yes | Book author | Max: 255 chars |
| `isbn` | string | No | ISBN number | Valid ISBN format |

### Response Specification
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| **Success (200)** | | | |
| `succeeded` | boolean | Operation success status | `true` |
| `data` | ModelBook[] \| ModelBook | Response data | See `ModelBook` |
| `totalRecordCount` | number | Total records (for lists) | `150` |
| `message` | string | Success message | "Books retrieved successfully" |
| **Error (400/500)** | | | |
| `succeeded` | boolean | Always false for errors | `false` |
| `message` | string | Error description | "Invalid request parameters" |
| `errors` | object | Field-specific errors | `{"title": ["Required field"]}` |

### Implementation Tasks
| Task | Component | Priority | Notes |
|------|-----------|----------|-------|
| **Type Definitions** | `apiType.ts` / `apiClient[Domain].ts` | High | Define interfaces |
| **URL Configuration** | `apiUrl.ts` | High | Add endpoint constants |
| **API Client** | `apiClient[Domain].ts` | High | Create query/mutation hooks |
| **Error Handling** | API Client | High | Handle error responses (`BaseToast.show({ title, color })` + throw) |
| **Cache Management** | API Client | Medium | Query invalidation |
| **Loading States** | Components | Medium | UI feedback |
| **Optimistic Updates** | API Client | Low | Enhanced UX |

## Feature Requirements Processing Template

### Feature Overview
| Aspect | Details | Implementation Approach |
|--------|---------|------------------------|
| **Feature Name** | [Name] | Clear, descriptive name |
| **Business Value** | [Value] | Why it matters |
| **User Impact** | [Impact] | How users benefit |
| **Technical Scope** | [Scope] | What needs building |

### Component Architecture Planning
| Layer | Components Needed | Location | Dependencies |
|-------|------------------|----------|--------------|
| **Screen Components** | [List] | `/_modules/pages/[Domain]/` | API clients, base components |
| **Domain Components** | [List] | `/_modules/pages/[Domain]/components/` | Base components, utilities |
| **Common Components** | [List if any] | `/_modules/common/components/` | Only if cross-domain (3+) |
| **Base Components** | [List primitives] | `/_modules/common/components/` | In-house primitives (Tailwind for web, StyleSheet for RN) |

### Data Flow Planning
| Flow | Source | Destination | Method |
|------|--------|-------------|--------|
| **API Data** | External API | Screen Components | TanStack Query |
| **Form Data** | User Input | API | React Hook Form |
| **URL State** | Browser URL | Components | nuqs hooks |
| **Global State** | Context | Components | React Context |

### Development Phases
| Phase | Tasks | Deliverables | Dependencies |
|-------|-------|--------------|--------------|
| **1: Foundation** | Data models, API setup | Types, API clients | API documentation |
| **2: Core UI** | Base components, forms | Reusable components | Design system |
| **3: Screens** | Screen components, routing | User interfaces | API clients, UI components |
| **4: Integration** | Testing, polish | Complete feature | All previous phases |

## Processing Workflow

### 1. Input Analysis
1. Read and categorize the input (user story, API spec, or feature requirement)
2. Identify the domain and scope
3. List dependencies and prerequisites
4. Estimate complexity and effort

### 2. Technical Planning
1. Map to architecture — which `_modules/` layers are affected
2. Plan component structure following domain-separation rules
3. Design data flow using established patterns
4. Identify reusable vs new components

### 3. Implementation Breakdown
1. Create a task list with priorities and dependencies
2. Define interfaces and types first
3. Plan API integration using established patterns
4. Design the component hierarchy following conventions

### 4. Quality Checklist
- [ ] Follows naming conventions
- [ ] Uses function minimalism
- [ ] Proper error handling
- [ ] Maintains domain separation
- [ ] Uses established UI patterns (`Col`/`Row`/`TextPrimary`)
- [ ] Proper TypeScript types
- [ ] Responsive design
- [ ] Accessibility
- [ ] Loading states
- [ ] Internationalization (i18next)

This template ensures consistent processing of requirements into actionable tasks while maintaining
architectural integrity.
